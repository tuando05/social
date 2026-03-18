import { Home, Search, Heart, User, Settings, PenSquare } from "lucide-react"
import { SettingsMenu } from "@/components/settings/SettingsMenu"
import { useState, useEffect, useRef } from "react"
import { useI18n } from "@/contexts/I18nContext"

export type PageType = "feed" | "search" | "notifications" | "profile"

interface SidebarProps {
  activePage: PageType
  onNavigate: (page: PageType) => void
  onOpenPost: () => void
}

export function Sidebar({ activePage, onNavigate, onOpenPost }: SidebarProps) {
  const { t } = useI18n()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsMenuKey, setSettingsMenuKey] = useState(0)
  const settingsRef = useRef<HTMLDivElement>(null)

  const navTop = [
    { page: "feed" as const, icon: Home, label: t("sidebar.home") },
    { page: "search" as const, icon: Search, label: t("sidebar.search") },
  ]

  const navBottom = [
    { page: "notifications" as const, icon: Heart, label: t("sidebar.notifications") },
    { page: "profile" as const, icon: User, label: t("sidebar.profile") },
  ]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    if (settingsOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [settingsOpen])

  const renderNavItem = ({
    page,
    icon: Icon,
    label,
  }: {
    page: PageType
    icon: typeof Home
    label: string
  }) => {
    const isActive = activePage === page
    return (
      <button
        key={page}
        onClick={() => onNavigate(page)}
        title={label}
        className={`p-3 transition-all rounded-xl
          ${isActive
            ? "text-foreground bg-muted"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
      >
        <Icon
          size={28}
          strokeWidth={isActive ? 3 : 2.5}
          fill={isActive ? "currentColor" : "none"}
        />
      </button>
    )
  }

  const toggleSettingsMenu = () => {
    setSettingsOpen((value) => {
      const next = !value

      if (next) {
        setSettingsMenuKey((prev) => prev + 1)
      }

      return next
    })
  }

  return (
    <div className="h-full w-full flex flex-col items-center py-4 bg-transparent">
      {/* Nav icons centered — split by compose button */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        {navTop.map(renderNavItem)}

        {/* Compose / Post button between nav icons */}
        <button
          onClick={onOpenPost}
          title={t("sidebar.compose")}
          className="my-2 p-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-all rounded-xl"
        >
          <PenSquare size={28} strokeWidth={2.5} />
        </button>

        {navBottom.map(renderNavItem)}
      </div>

      {/* Settings at the bottom */}
      <div className="flex flex-col items-center mb-4 relative" ref={settingsRef}>
        <button
          onClick={toggleSettingsMenu}
          className="p-3 text-muted-foreground hover:text-foreground transition-all rounded-xl hover:bg-muted"
        >
          <Settings size={28} strokeWidth={2.5} />
        </button>

        <SettingsMenu key={settingsMenuKey} isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
  )
}
