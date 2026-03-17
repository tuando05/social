import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostCard } from "./PostCard"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import type { Comment as FeedComment, PaginatedResponse, Post } from "@/types/api"
import { Loader2 } from "lucide-react"
import { useUser } from "@clerk/clerk-react"
import { useState } from "react"

interface FeedPageProps {
  onOpenPost: () => void
  activeFilter?: string
}

const formatRelativeTime = (isoDate: string) => {
  const now = Date.now()
  const created = new Date(isoDate).getTime()
  const diff = Math.max(0, now - created)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return "Vừa xong"
  if (diff < hour) return `${Math.floor(diff / minute)} phút trước`
  if (diff < day) return `${Math.floor(diff / hour)} giờ trước`
  if (diff < 7 * day) return `${Math.floor(diff / day)} ngày trước`
  return new Date(isoDate).toLocaleDateString("vi-VN")
}

export function FeedPage({ onOpenPost, activeFilter }: FeedPageProps) {
  const { apiFetch } = useApi()
  const { user } = useUser()
  const queryClient = useQueryClient()
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  const { data, isLoading, error } = useQuery<PaginatedResponse<Post>>({
    queryKey: ["posts", "feed", activeFilter],
    queryFn: () => apiFetch("/api/posts/feed"),
  })

  const {
    data: activeComments,
    isLoading: isCommentsLoading,
    error: commentsError,
  } = useQuery<FeedComment[]>({
    queryKey: ["comments", "post", activeCommentPostId],
    queryFn: () => apiFetch(`/api/comments/post/${activeCommentPostId}?limit=20`),
    enabled: Boolean(activeCommentPostId),
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

      queryClient.invalidateQueries({ queryKey: ["comments", "post", variables.postId] })
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
      queryClient.invalidateQueries({ queryKey: ["comments", "user", user?.id] })
    },
  })

  const posts = data?.data || []

  const handleToggleComments = (postId: string) => {
    setActiveCommentPostId((prev) => (prev === postId ? null : postId))
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
        className="flex items-center gap-4 px-6 py-4 border-b border-border/50 cursor-pointer hover:bg-muted/10 transition-colors"
      >
        <Avatar className="w-10 h-10 border-2 border-border">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-muted-foreground text-[15px]">
          Start a thread...
        </div>
        <button className="px-4 py-1.5 bg-card text-foreground border-2 border-border font-semibold rounded-full text-sm transition-transform hover:bg-muted active:scale-95">
          Post
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
            <p className="text-red-600 font-semibold mb-2">Lỗi khi tải bài viết</p>
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        )}

        {!isLoading && !error && posts.map(post => {
          const timestamp = formatRelativeTime(post.createdAt)
          const isLiked = Boolean(post.isLikedByMe)
          const isReposted = Boolean(post.isRepostedByMe)
          const isCommentsOpen = activeCommentPostId === post.id
          const likeDisabled =
            likeMutation.isPending && likeMutation.variables?.postId === post.id
          const repostDisabled =
            repostMutation.isPending && repostMutation.variables?.postId === post.id
          const commentPending =
            createCommentMutation.isPending &&
            createCommentMutation.variables?.postId === post.id

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
                timestamp={timestamp}
                likes={post.likeCount}
                comments={post.commentCount}
                hasReply={false}
                isLiked={isLiked}
                likeDisabled={Boolean(likeDisabled)}
                onToggleLike={() => likeMutation.mutate({ postId: post.id, isLiked })}
                commentsOpen={isCommentsOpen}
                onToggleComments={() => handleToggleComments(post.id)}
                isReposted={isReposted}
                repostDisabled={Boolean(repostDisabled)}
                onToggleRepost={() => repostMutation.mutate({ postId: post.id, isReposted })}
              />

              {isCommentsOpen && (
                <div className="px-6 pb-4 pt-2 border-b-2 border-border bg-muted/5">
                  <div className="space-y-3 mb-3 max-h-64 overflow-y-auto pr-1">
                    {isCommentsLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="animate-spin" size={16} />
                        Đang tải bình luận...
                      </div>
                    )}

                    {commentsError && (
                      <p className="text-sm text-red-600">
                        {commentsError instanceof Error ? commentsError.message : "Không thể tải bình luận"}
                      </p>
                    )}

                    {!isCommentsLoading && !commentsError && (activeComments?.length || 0) === 0 && (
                      <p className="text-sm text-muted-foreground">Chưa có bình luận nào.</p>
                    )}

                    {!isCommentsLoading && !commentsError && (activeComments || []).map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-7 h-7 border border-border">
                          <AvatarImage src={comment.author.imageUrl || undefined} />
                          <AvatarFallback>
                            {(comment.author.displayName || comment.author.username || "U")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            <span className="font-semibold text-foreground mr-1">
                              {comment.author.displayName || comment.author.username}
                            </span>
                            {formatRelativeTime(comment.createdAt)}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 border border-border">
                      <AvatarImage src={user?.imageUrl || undefined} />
                      <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <input
                      value={commentDrafts[post.id] || ""}
                      onChange={(event) => handleCommentDraftChange(post.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault()
                          handleCreateComment(post.id)
                        }
                      }}
                      placeholder="Viết bình luận..."
                      className="flex-1 h-9 rounded-full border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => handleCreateComment(post.id)}
                      disabled={commentPending || !(commentDrafts[post.id] || "").trim()}
                      className="h-9 px-4 rounded-full bg-card border-2 border-border text-sm font-semibold hover:bg-muted disabled:opacity-50"
                    >
                      {commentPending ? "Đang gửi" : "Gửi"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        
        {!isLoading && posts.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Chưa có bài viết nào
          </div>
        )}
        <div className="h-20" />
      </div>
    </div>
  )
}
