import { useMemo, useState, type CSSProperties } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Heart, Loader2, MessageSquareMore, Reply, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useApi } from "@/hooks/useApi"
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile"
import { useI18n, type Language } from "@/contexts/I18nContext"
import { formatRelativeTime } from "@/lib/time"
import type { Comment as FeedComment, Post } from "@/types/api"

const COMMENT_LIMIT_MIN = 1
const COMMENT_LIMIT_MAX = 50
const COMMENT_LIMIT_STEP = 10

// Keep comment modal sizing aligned with compose modal sizing behavior.
const COMMENT_DIALOG_LAYOUT = {
  widthVw: 90,
  maxWidthPx: 600,
  maxHeightDvh: 88,
  bodyMaxHeightDvh: 52,
} as const

const APP_SIDEBAR_WIDTH_PX = 80
const COMMENT_VIEWPORT_GUTTER_PX = 24
const COMMENT_CENTER_OFFSET_PX = APP_SIDEBAR_WIDTH_PX / 2

const COMMENT_DIALOG_STYLE: CSSProperties = {
  width: `min(${COMMENT_DIALOG_LAYOUT.widthVw}vw, calc(100vw - ${APP_SIDEBAR_WIDTH_PX + COMMENT_VIEWPORT_GUTTER_PX * 2}px))`,
  maxWidth: `${COMMENT_DIALOG_LAYOUT.maxWidthPx}px`,
  maxHeight: `${COMMENT_DIALOG_LAYOUT.maxHeightDvh}dvh`,
  left: `calc(50% + ${COMMENT_CENTER_OFFSET_PX}px)`,
}

const COMMENT_BODY_STYLE: CSSProperties = {
  maxHeight: `${COMMENT_DIALOG_LAYOUT.bodyMaxHeightDvh}dvh`,
}

type CommentThreadDialogProps = {
  isOpen: boolean
  post: Post | null
  draft: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (value: string) => void
  onSubmit?: () => void
}

function CommentNode({
  comment,
  repliesMap,
  me,
  language,
  t,
  toggleLikeMutation,
  deleteCommentMutation,
  onReply,
  depth = 0,
}: {
  comment: FeedComment
  repliesMap: Map<string, FeedComment[]>
  me: any
  language: Language
  t: any
  toggleLikeMutation: any
  deleteCommentMutation: any
  onReply: (id: string, username: string) => void
  depth?: number
}) {
  const childComments = repliesMap.get(comment.id) || []
  
  if (!comment || !comment.author || depth > 10) {
    return null
  }

  const authorDisplayName = comment.author.displayName || comment.author.username || "User"
  const authorUsername = comment.author.username || "unknown"
  const authorAvatar = comment.author.avatar || comment.author.imageUrl || undefined

  return (
    <div className={`flex gap-2.5 ${depth > 0 ? "mt-3" : ""}`}>
      <Avatar className="h-8 w-8 border border-border">
        <AvatarImage src={authorAvatar} />
        <AvatarFallback>{authorDisplayName[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl border border-border/70 bg-background px-3 py-2.5">
          <p className="mb-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{authorDisplayName}</span> @
            {authorUsername} · {formatRelativeTime(comment.createdAt, language, t)}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {comment.content}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const isLiked = Boolean(comment.isLikedByMe)
                if (
                  toggleLikeMutation.isPending &&
                  toggleLikeMutation.variables?.commentId === comment.id
                ) {
                  return
                }
                toggleLikeMutation.mutate({ commentId: comment.id, isLiked })
              }}
              className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                comment.isLikedByMe ? "text-rose-600" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart size={14} />
              <span>{comment.likeCount > 0 ? comment.likeCount : t?.("post.actions.like") || "Like"}</span>
            </button>
            {me?.id === comment.authorId && (
              <button
                type="button"
                onClick={() => {
                  if (deleteCommentMutation.isPending && deleteCommentMutation.variables === comment.id) {
                    return
                  }
                  deleteCommentMutation.mutate(comment.id)
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-red-600"
              >
                <Trash2 size={14} />
                <span>Xóa</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onReply(comment.id, authorUsername)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Reply size={14} />
              <span>Reply</span>
            </button>
          </div>
        </div>

        {childComments.length > 0 && (
          <div className="ml-4 mt-1 border-l-2 border-border/50 pl-2">
            {childComments.map((child) => (
              <CommentNode
                key={child.id}
                comment={child}
                repliesMap={repliesMap}
                me={me}
                language={language}
                t={t}
                toggleLikeMutation={toggleLikeMutation}
                deleteCommentMutation={deleteCommentMutation}
                onReply={onReply}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CommentThreadDialog({
  isOpen,
  post,
  draft,
  isSubmitting,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: CommentThreadDialogProps) {
  const { apiFetch } = useApi()
  const { language, t } = useI18n()
  const { data: me } = useCurrentUserProfile()
  const queryClient = useQueryClient()
  const [visibleLimit, setVisibleLimit] = useState(30)
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null)
  const safeLimit = Math.min(COMMENT_LIMIT_MAX, Math.max(COMMENT_LIMIT_MIN, visibleLimit))

  const {
    data: comments,
    isLoading,
    error,
  } = useQuery<FeedComment[]>({
    queryKey: ["comments", "thread", post?.id, safeLimit],
    queryFn: () => apiFetch(`/api/comments/post/${post?.id}?limit=${safeLimit}`),
    enabled: Boolean(isOpen && post?.id),
  })

  const { topLevelComments, repliesMap } = useMemo(() => {
    if (!comments) {
      return { topLevelComments: [], repliesMap: new Map<string, FeedComment[]>() }
    }

    const sorted = [...comments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const topLevel: FeedComment[] = []
    const map = new Map<string, FeedComment[]>()

    sorted.forEach((comment) => {
      if (comment.parentId) {
        const list = map.get(comment.parentId) || []
        list.push(comment)
        map.set(comment.parentId, list)
      } else {
        topLevel.push(comment)
      }
    })

    return { topLevelComments: topLevel, repliesMap: map }
  }, [comments])

  const canLoadMore = Boolean(
    post &&
      safeLimit < COMMENT_LIMIT_MAX &&
      (comments?.length || 0) < post.commentCount
  )

  const toggleCommentLikeMutation = useMutation({
    mutationFn: async (payload: { commentId: string; isLiked: boolean }) => {
      const method = payload.isLiked ? "DELETE" : "POST"
      return apiFetch(`/api/comments/${payload.commentId}/like`, { method })
    },
    onSuccess: (_response, payload) => {
      if (!post?.id) {
        return
      }

      queryClient.setQueryData<FeedComment[]>(["comments", "thread", post.id, safeLimit], (previous) => {
        if (!Array.isArray(previous)) {
          return previous
        }

        return previous.map((comment) => {
          if (comment.id !== payload.commentId) {
            return comment
          }

          const nextLikedState = !payload.isLiked
          const likeDelta = payload.isLiked ? -1 : 1

          return {
            ...comment,
            isLikedByMe: nextLikedState,
            likeCount: Math.max(0, (comment.likeCount || 0) + likeDelta),
          }
        })
      })
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: async (payload: { content: string; parentId?: string }) => {
      const actualPostId = post?.id
      if (!actualPostId) {
        throw new Error("Missing post id")
      }

      return apiFetch(`/api/comments/post/${actualPostId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: async () => {
      if (!post?.id) {
        return
      }

      onDraftChange("")
      setReplyingTo(null)
      await queryClient.invalidateQueries({ queryKey: ["comments", "thread", post.id] })
      await queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "active" })
    },
    onError: (error) => {
      console.error("Comment submission failed:", error)
    }
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiFetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      })
    },
    onSuccess: async (_response, commentId) => {
      if (!post?.id) {
        return
      }

      queryClient.setQueryData<FeedComment[]>(["comments", "thread", post.id, safeLimit], (previous) => {
        if (!Array.isArray(previous)) {
          return previous
        }

        return previous.filter((comment) => comment.id !== commentId)
      })

      await queryClient.invalidateQueries({ queryKey: ["comments", "thread", post.id] })
      await queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "active" })
    },
  })

  const handleReply = (id: string, username: string) => {
    setReplyingTo({ id, username })
  }

  const handleInternalSubmit = () => {
    if (!draft.trim() || createCommentMutation.isPending || isSubmitting) {
      return
    }

    if (onSubmit && !replyingTo) {
      onSubmit()
      return
    }
    
    createCommentMutation.mutate({
      content: draft.trim(),
      parentId: replyingTo?.id
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setReplyingTo(null)
      onOpenChange(open)
    }}>
      <DialogContent
        className="overflow-hidden rounded-[28px] border-2 border-border bg-card p-0 shadow-2xl"
        style={COMMENT_DIALOG_STYLE}
      >
        <DialogHeader className="border-b border-border/50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquareMore size={18} />
            {t("feed.comments.dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("feed.comments.dialogSubtitle", { count: post?.commentCount || 0 })}
          </DialogDescription>
        </DialogHeader>

        {post && (
          <div className="border-b border-border/50 bg-muted/20 px-5 py-3">
            <p className="line-clamp-2 text-sm text-foreground/90">{post.content}</p>
          </div>
        )}

        <div className="overflow-y-auto px-5 py-4" style={COMMENT_BODY_STYLE}>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              {t("feed.comments.loading")}
            </div>
          )}

          {!isLoading && error && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : t("feed.loadPostsError")}
            </p>
          )}

          {!isLoading && !error && topLevelComments.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("feed.comments.empty")}</p>
          )}

          {!isLoading && !error && topLevelComments.length > 0 && (
            <div className="space-y-4">
              {topLevelComments.map((comment) => (
                <CommentNode
                  key={comment.id}
                  comment={comment}
                  repliesMap={repliesMap}
                  me={me}
                  language={language}
                  t={t}
                  toggleLikeMutation={toggleCommentLikeMutation}
                  deleteCommentMutation={deleteCommentMutation}
                  onReply={handleReply}
                />
              ))}
            </div>
          )}

          {canLoadMore && (
            <div className="pt-4">
              <button
                onClick={() =>
                  setVisibleLimit((limit) => Math.min(COMMENT_LIMIT_MAX, limit + COMMENT_LIMIT_STEP))
                }
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/50"
              >
                {t("feed.comments.loadMore")}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 px-5 py-4">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5">
              <p className="text-xs text-muted-foreground">
                Replying to <span className="font-semibold text-foreground">@{replyingTo.username}</span>
              </p>
              <button 
                onClick={() => setReplyingTo(null)}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={me?.avatar || me?.imageUrl || undefined} />
              <AvatarFallback>{(me?.displayName || me?.username || "U")[0]}</AvatarFallback>
            </Avatar>
            <input
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  handleInternalSubmit()
                }
              }}
              placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : t("feed.comments.placeholder")}
              className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleInternalSubmit}
              disabled={isSubmitting || createCommentMutation.isPending || !draft.trim()}
              className="h-10 rounded-full border-2 border-border bg-card px-5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting || createCommentMutation.isPending ? t("feed.comments.sending") : t("feed.comments.send")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
