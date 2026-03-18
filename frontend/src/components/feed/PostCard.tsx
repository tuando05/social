import { Heart, MessageCircle, Repeat2, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserHoverPreview } from "@/components/profile/UserHoverPreview"
import { useI18n } from "@/contexts/I18nContext"
import { memo } from "react"

interface PostCardProps {
  id: string
  author: {
    name: string
    username: string
    avatar: string
    isVerified?: boolean
  }
  content: string
  imageUrls?: string[]
  timestamp: string
  likes: number
  comments: number
  hasReply?: boolean
  isLiked?: boolean
  onToggleLike?: () => void
  likeDisabled?: boolean
  commentsOpen?: boolean
  onToggleComments?: () => void
  isReposted?: boolean
  onToggleRepost?: () => void
  repostDisabled?: boolean
  showActions?: boolean
}

export const PostCard = memo(function PostCard({
  author,
  content,
  imageUrls = [],
  timestamp,
  likes,
  comments,
  hasReply,
  isLiked = false,
  onToggleLike,
  likeDisabled = false,
  commentsOpen = false,
  onToggleComments,
  isReposted = false,
  onToggleRepost,
  repostDisabled = false,
  showActions = true,
}: PostCardProps) {
  const { t } = useI18n()

  return (
    <div className="flex gap-3 px-6 py-4 border-b-2 border-border hover:bg-muted/10 transition-colors will-change-transform">
      {/* Cột trái: Avatar và ThreadLine */}
      <div className="flex flex-col items-center">
        <Avatar className="w-10 h-10 border-2 border-border">
          <AvatarImage src={author.avatar} alt={author.name} />
          <AvatarFallback>{author.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        {hasReply && (
          <div className="w-[2px] bg-border grow mt-2 mb-1 rounded-full relative overflow-hidden"></div>
        )}
      </div>

      {/* Cột phải: Nội dung bài viết */}
      <div className="flex-1 flex flex-col pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <UserHoverPreview
              username={author.username}
              fallbackName={author.name}
              className="font-semibold text-[clamp(13px,3.2cqw,15px)] hover:underline cursor-pointer"
            />
            <span className="text-[clamp(11px,2.6cqw,12px)] text-muted-foreground truncate">@{author.username}</span>
            {author.isVerified && (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary fill-current">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.1 13.9l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z" />
              </svg>
            )}
          </div>
          <span className="text-muted-foreground text-[clamp(11px,2.6cqw,14px)]">{timestamp}</span>
        </div>

        <p className="mt-1 text-[clamp(13px,3.2cqw,15px)] leading-snug whitespace-pre-wrap">{content}</p>

        {/* Image Grid */}
        {imageUrls && imageUrls.length > 0 && (
          <div className={`mt-3 grid gap-2 ${
            imageUrls.length === 1 ? 'grid-cols-1' :
            imageUrls.length === 2 ? 'grid-cols-2' :
            imageUrls.length === 3 ? 'grid-cols-2' :
            'grid-cols-2'
          }`}>
            {imageUrls.map((url, index) => (
              <div
                key={index}
                className={`relative rounded-xl overflow-hidden border border-border ${
                  imageUrls.length === 3 && index === 0 ? 'col-span-2' : ''
                }`}
              >
                <img
                  src={url}
                  alt={`Image ${index + 1}`}
                  className={`w-full ${
                    imageUrls.length === 1 ? 'max-h-[500px]' : 'max-h-[300px]'
                  } object-contain bg-muted`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-6 mt-3">
            <button
              onClick={onToggleLike}
              disabled={likeDisabled}
              className={`flex items-center gap-1.5 transition-colors group disabled:opacity-50 ${
                isLiked ? "text-rose-600" : "text-muted-foreground hover:text-foreground"
              }`}
              title={isLiked ? t("post.actions.unlike") : t("post.actions.like")}
            >
              <Heart size={18} className="transition-all group-hover:scale-110 group-active:scale-95" />
              <span className="text-sm font-medium">{likes > 0 ? likes : ""}</span>
            </button>
            
            <button
              onClick={onToggleComments}
              className={`flex items-center gap-1.5 transition-colors group ${
                commentsOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title={commentsOpen ? t("post.actions.closeComments") : t("post.actions.openComments")}
            >
              <MessageCircle size={18} className="transition-all group-hover:scale-110 group-active:scale-95" />
              <span className="text-sm font-medium">{comments > 0 ? comments : ""}</span>
            </button>
            
            <button
              onClick={onToggleRepost}
              disabled={repostDisabled}
              className={`flex items-center gap-1.5 transition-colors group disabled:opacity-50 ${
                isReposted ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"
              }`}
              title={isReposted ? t("post.actions.undoRepost") : t("post.actions.repost")}
            >
              <Repeat2 size={18} className="transition-all group-hover:scale-110 group-active:scale-95" />
            </button>
            
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group">
              <Send size={18} className="transition-all group-hover:scale-110 group-active:scale-95" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

PostCard.displayName = "PostCard"
