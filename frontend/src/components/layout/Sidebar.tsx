import { Home, Search, PlusSquare, Heart, User, Settings } from "lucide-react"

export function Sidebar() {
  return (
    <div className="h-full w-full flex flex-col justify-between items-center py-4 bg-transparent">
      <div className="flex flex-col items-center gap-6 mt-4">
        {/* Logo / Nút trang bìa */}
        <button className="p-2 text-foreground mb-4 hover:scale-105 transition-transform">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </button>

        <button className="p-3 text-muted-foreground hover:text-foreground transition-all rounded-xl hover:bg-muted">
          <Home size={28} strokeWidth={2.5} />
        </button>
        <button className="p-3 text-muted-foreground hover:text-foreground transition-all rounded-xl hover:bg-muted">
          <Search size={28} strokeWidth={2.5} />
        </button>
        <button className="p-3 text-muted-foreground hover:text-foreground transition-all rounded-xl hover:bg-muted">
          <PlusSquare size={28} strokeWidth={2.5} />
        </button>
        <button className="p-3 text-muted-foreground hover:text-foreground transition-all rounded-xl hover:bg-muted">
          <Heart size={28} strokeWidth={2.5} />
        </button>
        <button className="p-3 text-muted-foreground hover:text-foreground transition-all rounded-xl hover:bg-muted">
          <User size={28} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col items-center mb-4">
        {/* Cài đặt */}
        <button className="p-3 text-muted-foreground hover:text-foreground transition-all rounded-xl hover:bg-muted">
          <Settings size={28} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
