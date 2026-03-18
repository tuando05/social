import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostCard } from "./PostCard"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import type { PaginatedResponse, Post } from "@/types/api"
import { Loader2 } from "lucide-react"
import { useUser } from "@clerk/clerk-react"
import { useState } from "react"
import { useI18n } from "@/contexts/I18nContext"
import { formatRelativeTime } from "@/lib/time"
import { CommentThreadDialog } from "./CommentThreadDialog"

interface FeedPageProps {
  onOpenPost: () => void
  activeFilter?: string
}

export function FeedPage({ onOpenPost, activeFilter }: FeedPageProps) {
  const { language, t } = useI18n()
  const { apiFetch } = useApi()
  const { user } = useUser()
  const queryClient = useQueryClient()
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const feedFilter = activeFilter === "following" ? "following" : "foryou"

  const { data, isLoading, error } = useQuery<PaginatedResponse<Post>>({
    queryKey: ["posts", "feed", feedFilter],
    queryFn: () => apiFetch(`/api/posts/feed?filter=${feedFilter}`),
    placeholderData: (previousData) => previousData,
  })

  const likeMutation = useMutation({
    mutationFn: async (payload: { postId: string; isLiked: boolean }) => {
      const method = payload.isLiked ? "DELETE" : "POST"
      return apiFetch(`/api/posts/${payload.postId}/like`, {
        method,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
      queryClient.invalidateQueries({ queryKey: ["posts", "user", user?.id] })
    },
  })

  const repostMutation = useMutation({
    mutationFn: async (payload: { postId: string; isReposted: boolean }) => {
      const method = payload.isReposted ? "DELETE" : "POST"
      return apiFetch(`/api/posts/${payload.postId}/repost`, {
        method,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
      queryClient.invalidateQueries({ queryKey: ["posts", "my-reposts", user?.id] })
      queryClient.invalidateQueries({ queryKey: ["posts", "reposts", user?.id] })
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: async (payload: { postId: string; content: string }) => {
      return apiFetch(`/api/comments/post/${payload.postId}`, {
        method: "POST",
        body: JSON.stringify({
          content: payload.content,
        }),
      })
    },
    onSuccess: (_response, variables) => {
      setCommentDrafts((prev) => ({
        ...prev,
        [variables.postId]: "",
      }))

      queryClient.invalidateQueries({ queryKey: ["comments", "thread", variables.postId] })
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
      queryClient.invalidateQueries({ queryKey: ["comments", "user", user?.id] })
    },
  })

  const posts = data?.data || []
  const activeCommentPostId = activeCommentPost?.id || null
  const activeCommentDraft = activeCommentPostId ? (commentDrafts[activeCommentPostId] || "") : ""
  const activeCommentPending = Boolean(
    createCommentMutation.isPending &&
      activeCommentPostId &&
      createCommentMutation.variables?.postId === activeCommentPostId
  )

  const handleToggleComments = (post: Post) => {
    setActiveCommentPost((prev) => (prev?.id === post.id ? null : post))
  }

  const handleCommentDraftChange = (postId: string, value: string) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value,
    }))
  }

  const handleCreateComment = (postId: string) => {
    const content = (commentDrafts[postId] || "").trim()

    if (!content || createCommentMutation.isPending) {
      return
    }

    createCommentMutation.mutate({
      postId,
      content,
    })
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Inline Create Post Trigger */}
      <div
        onClick={onOpenPost}
        className="flex items-center gap-4 border-b border-border/50 bg-gradient-to-r from-muted/35 via-card to-card px-6 py-4 cursor-pointer hover:from-muted/45 transition-colors"
      >
        <Avatar className="w-10 h-10 border-2 border-border">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-muted-foreground text-[15px]">
          {t("feed.startThread")}
        </div>
        <button className="px-4 py-1.5 bg-card text-foreground border-2 border-border font-semibold rounded-full text-sm transition-transform hover:bg-muted active:scale-95">
          {t("feed.post")}
        </button>
      </div>

      {/* Feed — filtered by activeFilter */}
      <div className="flex flex-col">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        )}

        {error && (
          <div className="text-center py-10 px-6">
            <p className="text-red-600 font-semibold mb-2">{t("feed.loadPostsError")}</p>
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        )}

        {!isLoading && !error && posts.map(post => {
          const timestamp = formatRelativeTime(post.createdAt, language, t)
          const isLiked = Boolean(post.isLikedByMe)
          const isReposted = Boolean(post.isRepostedByMe)
          const isCommentsOpen = activeCommentPost?.id === post.id
          const likeDisabled =
            likeMutation.isPending && likeMutation.variables?.postId === post.id
          const repostDisabled =
            repostMutation.isPending && repostMutation.variables?.postId === post.id

          return (
            <div key={post.id}>
              <PostCard
                id={post.id}
                author={{
                  name: post.author.displayName || post.author.username || 'Anonymous',
                  username: post.author.username || 'unknown',
                  avatar: post.author.imageUrl || `https://ui-avatars.com/api/?name=${post.author.username || 'User'}`,
                  isVerified: post.author.isVerified
                }}
                content={post.content}
                imageUrls={post.imageUrls}
                timestamp={timestamp}
                likes={post.likeCount}
                comments={post.commentCount}
                hasReply={false}
                isLiked={isLiked}
                likeDisabled={Boolean(likeDisabled)}
                onToggleLike={() => likeMutation.mutate({ postId: post.id, isLiked })}
                commentsOpen={isCommentsOpen}
                onToggleComments={() => handleToggleComments(post)}
                isReposted={isReposted}
                repostDisabled={Boolean(repostDisabled)}
                onToggleRepost={() => repostMutation.mutate({ postId: post.id, isReposted })}
              />
            </div>
          )
        })}
        
        {!isLoading && posts.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {t("feed.noPosts")}
          </div>
        )}
        <div className="h-20" />
      </div>

      <CommentThreadDialog
        isOpen={Boolean(activeCommentPost)}
        post={activeCommentPost}
        draft={activeCommentDraft}
        isSubmitting={activeCommentPending}
        onOpenChange={(open) => {
          if (!open) {
            setActiveCommentPost(null)
          }
        }}
        onDraftChange={(value) => {
          if (!activeCommentPostId) {
            return
          }
          handleCommentDraftChange(activeCommentPostId, value)
        }}
        onSubmit={() => {
          if (!activeCommentPostId) {
            return
          }
          handleCreateComment(activeCommentPostId)
        }}
      />
    </div>
  )
}
