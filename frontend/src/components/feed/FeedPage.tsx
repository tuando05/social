import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostCard } from "./PostCard"
import { CreatePostModal } from "../post/CreatePostModal"

export function FeedPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const MOCK_POSTS = [
    {
      id: "1",
      author: {
        name: "dev.ly",
        username: "dev.ly",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
        isVerified: true
      },
      content: "Hello Threads! This is my first post on this beautiful platform. Testing the layout flexibility.",
      timestamp: "2h",
      likes: 42,
      comments: 5,
      hasReply: true
    },
    {
      id: "2",
      author: {
        name: "Zuck",
        username: "zuck",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
        isVerified: true
      },
      content: "Just another great day to connect people.\n\nHere is a multiline post to test how the thread line scales with the content length. Since hasReply is false, you won't see a line below.",
      timestamp: "5h",
      likes: 10423,
      comments: 942,
      hasReply: false
    },
    {
      id: "3",
      author: {
        name: "anonymous",
        username: "anon",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026702d",
        isVerified: false
      },
      content: "Can't wait to see how this UI scales with more content! 🚀\nScrolling should be buttery smooth.",
      timestamp: "12h",
      likes: 12,
      comments: 1,
      hasReply: false
    }
  ]

  return (
    <>
      <div className="flex flex-col h-full w-full">
        {/* Inline Create Post Trigger */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-4 px-6 py-4 border-b-2 border-border cursor-pointer hover:bg-muted/10 transition-colors"
        >
          <Avatar className="w-10 h-10 border-2 border-border">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-muted-foreground text-[15px]">
            Start a thread...
          </div>
          <button className="px-4 py-1.5 bg-foreground text-background font-semibold rounded-full text-sm transition-transform active:scale-95">
            Post
          </button>
        </div>

        {/* Main Feed */}
        <div className="flex flex-col">
          {MOCK_POSTS.map(post => (
            <PostCard key={post.id} {...post} />
          ))}
          {/* Spacer for bottom scrolling padding */}
          <div className="h-20" />
        </div>
      </div>

      <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
