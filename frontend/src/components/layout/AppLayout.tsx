import type { ReactNode } from "react"
import { Sidebar } from "./Sidebar"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen w-full grid grid-cols-[80px_1fr] bg-slate-100/50 text-foreground overflow-hidden">
      {/* Sidebar cố định bên trái */}
      <Sidebar />
      
      {/* Vùng nội dung có thể cuộn ngang nếu có nhiều cột */}
      <main className="h-full w-full overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex h-full gap-5 pt-4 px-4 pb-4 mx-auto w-fit min-w-full justify-center">
          {children}
        </div>
      </main>
      
      {/* Nút @ nổi ở góc trên phải */}
      <div className="fixed top-6 right-6 z-50">
        <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-card border shadow-sm hover:bg-accent hover:text-accent-foreground transition-all hover:scale-105">
          <span className="text-2xl font-bold">@</span>
        </button>
      </div>
    </div>
  )
}
