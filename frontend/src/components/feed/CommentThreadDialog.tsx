import { useMemo, useState, type CSSProperties } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Heart, Loader2, MessageSquareMore, Reply, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useApi } from "@/hooks/useApi"
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile"
import { useI18n } from "@/contexts/I18nContext"
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
  onSubmit: () => void
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
  const [replyDraft, setReplyDraft] = useState("")
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

  const orderedComments = useMemo(() => {
    if (!comments) {
      return []
    }

    return [...comments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
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

  const replyMutation = useMutation({
    mutationFn: async (payload: { parentId: string; content: string }) => {
      if (!post?.id) {
        throw new Error("Missing post id")
      }

      return apiFetch(`/api/comments/post/${post.id}`, {
        method: "POST",
        body: JSON.stringify({
          content: payload.content,
          parentId: payload.parentId,
        }),
      })
    },
    onSuccess: async () => {
      if (!post?.id) {
        return
      }

      setReplyDraft("")
      setReplyingTo(null)
      await queryClient.invalidateQueries({ queryKey: ["comments", "thread", post.id] })
    },
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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

          {!isLoading && !error && orderedComments.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("feed.comments.empty")}</p>
          )}

          {!isLoading && !error && orderedComments.length > 0 && (
            <div className="space-y-4">
              {orderedComments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={comment.author.avatar || comment.author.imageUrl || undefined} />
                    <AvatarFallback>
                      {(comment.author.displayName || comment.author.username || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-background px-3 py-2.5">
                    <p className="mb-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {comment.author.displayName || comment.author.username}
                      </span>{" "}
                      @{comment.author.username} · {formatRelativeTime(comment.createdAt, language, t)}
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
                            toggleCommentLikeMutation.isPending &&
                            toggleCommentLikeMutation.variables?.commentId === comment.id
                          ) {
                            return
                          }

                          toggleCommentLikeMutation.mutate({ commentId: comment.id, isLiked })
                        }}
                        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                          comment.isLikedByMe
                            ? "text-rose-600"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Heart size={14} />
                        <span>{comment.likeCount > 0 ? comment.likeCount : t("post.actions.like")}</span>
                      </button>
                      {me?.id === comment.authorId && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              deleteCommentMutation.isPending &&
                              deleteCommentMutation.variables === comment.id
                            ) {
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
                        onClick={() => {
                          setReplyingTo({
                            id: comment.id,
                            username: comment.author.username,
                          })
                          setReplyDraft("")
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Reply size={14} />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                </div>
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

          {replyingTo && (
            <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Replying to @{replyingTo.username}
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      if (!replyDraft.trim() || replyMutation.isPending) {
                        return
                      }
                      replyMutation.mutate({ parentId: replyingTo.id, content: replyDraft.trim() })
                    }
                  }}
                  placeholder={t("feed.comments.placeholder")}
                  className="h-9 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!replyDraft.trim() || replyMutation.isPending) {
                      return
                    }
                    replyMutation.mutate({ parentId: replyingTo.id, content: replyDraft.trim() })
                  }}
                  disabled={!replyDraft.trim() || replyMutation.isPending}
                  className="h-9 rounded-full border-2 border-border bg-card px-4 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {replyMutation.isPending ? t("feed.comments.sending") : t("feed.comments.send")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyDraft("")
                  }}
                  className="h-9 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 px-5 py-4">
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
                  onSubmit()
                }
              }}
              placeholder={t("feed.comments.placeholder")}
              className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !draft.trim()}
              className="h-10 rounded-full border-2 border-border bg-card px-5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t("feed.comments.sending") : t("feed.comments.send")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
