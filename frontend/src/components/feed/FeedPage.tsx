import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostCard } from "./PostCard"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import type { PaginatedResponse, Post } from "@/types/api"
import { Loader2 } from "lucide-react"
import { useUser } from "@clerk/clerk-react"

interface FeedPageProps {
  onOpenPost: () => void
  activeFilter?: string
}

export function FeedPage({ onOpenPost, activeFilter }: FeedPageProps) {
  const { apiFetch } = useApi()
  const { user } = useUser()

  const { data, isLoading } = useQuery<PaginatedResponse<Post>>({
    queryKey: ["posts", "feed", activeFilter],
    queryFn: () => apiFetch("/api/posts/feed"), // we will just use feed endpoint for all filters for now as a demo
  })

  const posts = data?.data || []
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
        <button className="px-4 py-1.5 bg-foreground text-background font-semibold rounded-full text-sm transition-transform active:scale-95">
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
        
        {posts.map(post => {
          // Calculate relative time (dummy logic or simple formatted string)
          const timestamp = new Date(post.createdAt).toLocaleDateString()
          return (
            <PostCard 
              key={post.id} 
              id={post.id}
              author={{
                name: post.author.displayName || post.author.username,
                username: post.author.username,
                avatar: post.author.imageUrl || `https://ui-avatars.com/api/?name=${post.author.username}`,
                isVerified: post.author.isVerified
              }}
              content={post.content}
              timestamp={timestamp}
              likes={post.likeCount}
              comments={post.commentCount} 
              hasReply={false} // to be computed
            />
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
