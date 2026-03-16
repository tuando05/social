import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import { useUser } from "@clerk/clerk-react"
import { Loader2 } from "lucide-react"

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [content, setContent] = useState("")
  const { apiFetch } = useApi()
  const queryClient = useQueryClient()
  const { user } = useUser()

  const createPostMutation = useMutation({
    mutationFn: (newContent: string) => {
      return apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({ content: newContent }),
      })
    },
    onSuccess: () => {
      setContent("")
      onClose()
      queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
    onError: (error) => {
      console.error("Failed to post:", error)
      alert("Đã xảy ra lỗi khi đăng bài thử lại sau!")
    }
  })

  // Handle Cmd/Ctrl + Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isOpen) {
        e.preventDefault()
        handlePost()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, content])

  const handlePost = () => {
    if (!content.trim() || createPostMutation.isPending) return
    createPostMutation.mutate(content)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] bg-card p-0 gap-0 overflow-hidden border-2 border-border rounded-2xl shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b-2 border-border">
          <DialogTitle className="text-center font-bold">New Thread</DialogTitle>
          <DialogDescription className="sr-only">Create a new post</DialogDescription>
        </DialogHeader>

        <div className="p-6 flex gap-3">
          <div className="flex flex-col items-center">
             <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="w-[2px] bg-border grow mt-2 mb-1 rounded-full"></div>
          </div>
          
          <div className="flex-1 flex flex-col pt-1">
            <span className="font-semibold text-[15px]">{user?.fullName || user?.username || "You"}</span>
            <textarea 
              className="mt-1 w-full bg-transparent resize-none outline-none text-[15px] placeholder:text-muted-foreground min-h-[120px]"
              placeholder="Start a thread..."
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-4 flex justify-between items-center border-t-2 border-border bg-muted/5">
          <span className="text-sm text-muted-foreground">Bất kỳ ai cũng có thể trả lời</span>
          <Button 
            onClick={handlePost} 
            disabled={!content.trim() || createPostMutation.isPending}
            className="rounded-full px-8 py-5 font-semibold transition-all"
          >
            {createPostMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Đăng"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
