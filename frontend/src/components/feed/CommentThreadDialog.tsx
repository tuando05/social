import { useMemo, useState, type CSSProperties } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, MessageSquareMore } from "lucide-react"
import { useUser } from "@clerk/clerk-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useApi } from "@/hooks/useApi"
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
  const { user } = useUser()
  const [visibleLimit, setVisibleLimit] = useState(30)
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
                    <AvatarImage src={comment.author.imageUrl || undefined} />
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
        </div>

        <div className="border-t border-border/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={user?.imageUrl || undefined} />
              <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
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
