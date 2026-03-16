import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import type { PaginatedResponse, Notification } from "@/types/api"
import { Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type FilterKey = "all" | "replies" | "mentions" | "follows" | "requests"

interface NotificationsPageProps {
  activeFilter?: string
}

export function NotificationsPage({ activeFilter = "all" }: NotificationsPageProps) {
  const { apiFetch } = useApi()

  const { data, isLoading } = useQuery<PaginatedResponse<Notification>>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/api/notifications"),
  })

  const notifications = data?.data || []

  // Map backend notifications to the UI
  const formattedItems = notifications.map(n => {
    let content = "đã tương tác với bạn."
    if (n.type === "LIKE_POST") content = "đã thích bài viết của bạn."
    if (n.type === "LIKE_COMMENT") content = "đã thích bình luận của bạn."
    if (n.type === "COMMENT") content = "đã bình luận bài viết của bạn."
    if (n.type === "FOLLOW") content = "bắt đầu theo dõi bạn."
    if (n.type === "MENTION") content = "đã nhắc đến bạn."

    // Dummy categorization for the UI tabs since backend doesn't have exact categories yet
    let category: FilterKey = "all"
    if (n.type === "COMMENT") category = "replies"
    if (n.type === "MENTION") category = "mentions"
    if (n.type === "FOLLOW") category = "follows"
    
    return {
      id: n.id,
      avatar: n.actor?.imageUrl || "",
      name: n.actor?.displayName || n.actor?.username || "Ẩn danh",
      content,
      time: new Date(n.createdAt).toLocaleDateString(),
      isRead: n.isRead,
      category,
      originalType: n.type
    }
  })

  const items = activeFilter === "all" 
    ? formattedItems 
    : formattedItems.filter(i => i.category === activeFilter || (activeFilter === "requests" && i.originalType === "FOLLOW_REQUEST"))

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col divide-y divide-border/40">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Bạn chưa có thông báo nào.
          </div>
        )}

        {items.map(item => (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/15 transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <Avatar className="w-10 h-10">
                <AvatarImage src={item.avatar} />
                <AvatarFallback>{item.name[0]}</AvatarFallback>
              </Avatar>
              {!item.isRead && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-card" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">
                <span className="font-semibold">{item.name}</span>{" "}
                <span className="text-muted-foreground">{item.content}</span>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{item.time}</p>
            </div>

            {activeFilter === "follows" && (
              <button className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-muted/30 transition-colors">
                Theo dõi lại
              </button>
            )}
            {activeFilter === "requests" && (
              <div className="shrink-0 flex gap-1.5">
                <button className="text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity">
                  Chấp nhận
                </button>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-muted/30 transition-colors">
                  Từ chối
                </button>
              </div>
            )}
          </div>
        ))}
        <div className="h-16" />
      </div>
    </div>
  )
}
