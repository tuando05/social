import type { ReactNode } from "react"
import { useState } from "react"
import { usePusherEvent } from "@/hooks/usePusher"
import { useUser } from "@clerk/clerk-react"
import { useI18n } from "@/contexts/I18nContext"
import { motion, AnimatePresence } from "framer-motion"
import { Bell } from "lucide-react"
import type { Notification } from "@/types/api"

interface AppLayoutProps {
  children: ReactNode
  sidebar: ReactNode
  isSingleColumnMode?: boolean
}

export function AppLayout({ children, sidebar, isSingleColumnMode = false }: AppLayoutProps) {
  const { user } = useUser()
  const { t } = useI18n()
  const [toast, setToast] = useState<Notification | null>(null)

  usePusherEvent<Notification>(`private-user-${user?.id}`, "notification:new", (data) => {
    setToast(data)
    setTimeout(() => setToast(null), 5000)
  })

  return (
    <div className="h-screen w-full grid grid-cols-[80px_1fr] bg-background text-foreground overflow-hidden">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[320px] bg-card border-2 border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => {
              setToast(null)
              window.dispatchEvent(new CustomEvent("app:open-post", { detail: { postId: toast.postId } }))
            }}
          >
            <div className="bg-blue-500 p-2 rounded-full">
              <Bell size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">
                {toast.actor?.displayName || toast.actor?.username || t("common.anonymous")}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {toast.type === "LIKE_POST" && t("notifications.likePost")}
                {toast.type === "COMMENT" && t("notifications.comment")}
                {toast.type === "FOLLOW" && t("notifications.follow")}
                {toast.type === "REPOST" && t("notifications.repost")}
                {/* Fallback if type not matched */}
                {!["LIKE_POST", "COMMENT", "FOLLOW", "REPOST"].includes(toast.type) && t("notifications.interacted")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar cố định bên trái */}
      <aside className="h-full">
        {sidebar}
      </aside>

      {/* Vùng nội dung - conditional scroll behavior */}
      {isSingleColumnMode ? (
        // Trang đơn: scroll dọc toàn màn hình, container căn giữa
        <main className="h-full w-full overflow-y-auto overflow-x-hidden">
          <div className="flex justify-center pt-4 pb-4">
            {children}
          </div>
        </main>
      ) : (
        // Đa cột: scroll ngang, mỗi container có scroll riêng
        <main className="h-full w-full overflow-x-auto overflow-y-hidden scrollbar-hide">
          <div className="flex h-full gap-5 pt-4 px-4 pb-4 mx-auto w-fit min-w-full justify-center">
            {children}
          </div>
        </main>
      )}
    </div>
  )
}
