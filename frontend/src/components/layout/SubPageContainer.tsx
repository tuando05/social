import type { ReactNode } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MoreHorizontal, Trash2, ChevronDown, Check } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useI18n } from "@/contexts/I18nContext"

export interface FilterOption {
  key: string
  label: string
}

interface SubPageContainerProps {
  title: string
  children: ReactNode
  columnCount?: number
  isDeletable?: boolean
  onDelete?: () => void
  filterOptions?: FilterOption[]
  activeFilter?: string
  onFilterChange?: (key: string) => void
  disableInternalScroll?: boolean
}

export function SubPageContainer({
  title,
  children,
  columnCount = 1,
  isDeletable = false,
  onDelete,
  filterOptions,
  activeFilter,
  onFilterChange,
  disableInternalScroll = false,
}: SubPageContainerProps) {
  const { t } = useI18n()
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const menuRef   = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  const wClass =
    columnCount <= 1
      ? "w-[min(96vw,650px)]"
      : columnCount === 2
        ? "w-[min(88vw,500px)]"
        : "w-[min(82vw,420px)]"

  const activeLabel = filterOptions?.find(f => f.key === activeFilter)?.label ?? title

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current   && !menuRef.current.contains(e.target as Node))   setMenuOpen(false)
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div className={`${disableInternalScroll ? 'min-h-screen' : 'h-full'} ${wClass} flex flex-col shrink-0 gap-3 [container-type:inline-size]`}>
      {/* Title row — outside the card */}
      <div className="flex items-center justify-center relative px-2 min-h-[28px]">

        {/* Filter dropdown (left-absolute) or plain title (centered) */}
        {filterOptions ? (
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(v => !v)}
              className="flex items-center gap-1 text-[clamp(14px,3.8cqw,17px)] font-bold text-muted-foreground/80 hover:text-foreground/90 transition-colors"
            >
              {activeLabel}
              <ChevronDown
                size={15}
                className={`mt-0.5 transition-transform duration-200 ${filterOpen ? "rotate-180" : ""}`}
              />
            </button>

            {filterOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+6px)] z-50 min-w-[160px] bg-popover border border-border rounded-2xl shadow-xl py-1.5 overflow-hidden">
                {filterOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { onFilterChange?.(opt.key); setFilterOpen(false) }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
                  >
                    <span className={activeFilter === opt.key ? "font-semibold" : ""}>{opt.label}</span>
                    {activeFilter === opt.key && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <h2 className="text-[clamp(14px,3.8cqw,17px)] font-bold text-muted-foreground/80">{title}</h2>
        )}

        {/* Three-dot menu (right-absolute) */}
        {isDeletable && (
          <div className="absolute right-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 min-w-[160px] bg-popover border border-border rounded-2xl shadow-lg py-1 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); onDelete?.() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={15} />
                  {t("app.deleteColumn")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className={`${disableInternalScroll ? 'flex-1 flex flex-col' : 'flex-1 flex flex-col'} border-2 border-border bg-card rounded-[32px] shadow-sm overflow-hidden relative transition-all duration-300`}>
        {disableInternalScroll ? (
          // Trang đơn: không scroll riêng, content tự expand
          <div className="w-full h-full bg-card">
            {children}
          </div>
        ) : (
          // Đa cột: scroll riêng trong container
          <ScrollArea className="flex-1 w-full bg-card">
            {children}
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
