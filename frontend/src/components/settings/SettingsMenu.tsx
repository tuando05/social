import { Moon, Sun, Globe, Bell, Lock, LogOut, ChevronRight, Check } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import { useI18n, type Language } from "@/contexts/I18nContext"
import { useClerk } from "@clerk/clerk-react"
import { useState } from "react"

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useI18n()
  const { signOut } = useClerk()
  const [submenu, setSubmenu] = useState<"main" | "theme" | "language">("main")

  if (!isOpen) return null

  const handleLogout = async () => {
    try {
      onClose()
      await signOut({ redirectUrl: '/' })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme)
    setSubmenu("main")
  }

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage)
    setSubmenu("main")
  }

  return (
    <>
      {/* Main Menu */}
      {submenu === "main" && (
        <div className="absolute left-0 bottom-[60px] z-50 w-[190px] bg-popover border border-border rounded-2xl shadow-xl py-2 overflow-hidden">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-1.5">
            {t("settings.title")}
          </p>

          {/* Theme */}
          <button
            onClick={() => setSubmenu("theme")}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon size={16} className="text-muted-foreground shrink-0" />
              ) : (
                <Sun size={16} className="text-muted-foreground shrink-0" />
              )}
              {t("settings.theme")}
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>

          {/* Language */}
          <button
            onClick={() => setSubmenu("language")}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-muted-foreground shrink-0" />
              {t("settings.language")}
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>

          {/* Notifications */}
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
          >
            <Bell size={16} className="text-muted-foreground shrink-0" />
            {t("settings.notifications")}
          </button>

          {/* Privacy */}
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
          >
            <Lock size={16} className="text-muted-foreground shrink-0" />
            {t("settings.privacy")}
          </button>

          {/* Divider */}
          <div className="my-1 h-px bg-border mx-2" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left text-red-600"
          >
            <LogOut size={16} className="shrink-0" />
            {t("settings.logout")}
          </button>
        </div>
      )}

      {/* Theme Submenu */}
      {submenu === "theme" && (
        <div className="absolute left-0 bottom-[60px] z-50 w-[190px] bg-popover border border-border rounded-2xl shadow-xl py-2 overflow-hidden">
          <button
            onClick={() => setSubmenu("main")}
            className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/40"
          >
            <ChevronRight size={12} className="rotate-180" />
            {t("settings.theme")}
          </button>

          <button
            onClick={() => handleThemeChange("light")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left ${
              theme === "light" ? "bg-muted/40" : ""
            }`}
          >
            <Sun size={16} className="text-muted-foreground shrink-0" />
            {t("settings.theme.light")}
          </button>

          <button
            onClick={() => handleThemeChange("dark")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left ${
              theme === "dark" ? "bg-muted/40" : ""
            }`}
          >
            <Moon size={16} className="text-muted-foreground shrink-0" />
            {t("settings.theme.dark")}
          </button>
        </div>
      )}

      {/* Language Submenu */}
      {submenu === "language" && (
        <div className="absolute left-0 bottom-[60px] z-50 w-[190px] bg-popover border border-border rounded-2xl shadow-xl py-2 overflow-hidden">
          <button
            onClick={() => setSubmenu("main")}
            className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/40"
          >
            <ChevronRight size={12} className="rotate-180" />
            {t("settings.language")}
          </button>

          <button
            onClick={() => handleLanguageChange("vi")}
            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left ${
              language === "vi" ? "bg-muted/40" : ""
            }`}
          >
            <span>{t("settings.language.vi")}</span>
            {language === "vi" ? <Check size={14} className="text-muted-foreground" /> : null}
          </button>

          <button
            onClick={() => handleLanguageChange("en")}
            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left ${
              language === "en" ? "bg-muted/40" : ""
            }`}
          >
            <span>{t("settings.language.en")}</span>
            {language === "en" ? <Check size={14} className="text-muted-foreground" /> : null}
          </button>
        </div>
      )}
    </>
  )
}
