import { Heart, MessageCircle, Repeat2, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PostCardProps {
  id: string
  author: {
    name: string
    username: string
    avatar: string
    isVerified?: boolean
  }
  content: string
  timestamp: string
  likes: number
  comments: number
  hasReply?: boolean
}

export function PostCard({ author, content, timestamp, likes, comments, hasReply }: PostCardProps) {
  return (
    <div className="flex gap-3 px-6 py-4 border-b-2 border-border hover:bg-muted/10 transition-colors">
      {/* Cột trái: Avatar và ThreadLine */}
      <div className="flex flex-col items-center">
        <Avatar className="w-10 h-10 border-2 border-border">
          <AvatarImage src={author.avatar} alt={author.name} />
          <AvatarFallback>{author.name[0]}</AvatarFallback>
        </Avatar>
        {hasReply && (
          <div className="w-[2px] bg-border grow mt-2 mb-1 rounded-full relative overflow-hidden"></div>
        )}
      </div>

      {/* Cột phải: Nội dung bài viết */}
      <div className="flex-1 flex flex-col pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[15px] hover:underline cursor-pointer">{author.name}</span>
            {author.isVerified && (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary fill-current">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.1 13.9l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z" />
              </svg>
            )}
          </div>
          <span className="text-muted-foreground text-sm">{timestamp}</span>
        </div>

        <p className="mt-1 text-[15px] leading-snug whitespace-pre-wrap">{content}</p>

        {/* Action Buttons */}
        <div className="flex items-center gap-6 mt-3">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group">
            <Heart size={18} className="transition-all group-hover:scale-110 group-active:scale-95" />
            <span className="text-sm font-medium">{likes > 0 ? likes : ""}</span>
          </button>
          
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group">
            <MessageCircle size={18} className="transition-all group-hover:scale-110 group-active:scale-95" />
            <span className="text-sm font-medium">{comments > 0 ? comments : ""}</span>
          </button>
          
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group">
            <Repeat2 size={18} className="transition-all group-hover:scale-110 group-active:scale-95" />
          </button>
          
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group">
            <Send size={18} className="transition-all group-hover:scale-110 group-active:scale-95" />
          </button>
        </div>
      </div>
    </div>
  )
}
