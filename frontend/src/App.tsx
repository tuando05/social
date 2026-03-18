import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { AppLayout } from "./components/layout/AppLayout"
import { SubPageContainer, type FilterOption } from "./components/layout/SubPageContainer"
import { FeedPage } from "./components/feed/FeedPage"
import { SearchPage } from "./components/search/SearchPage"
import { NotificationsPage } from "./components/notifications/NotificationsPage"
import { ProfilePage } from "./components/profile/ProfilePage"
import { CreatePostModal } from "./components/post/CreatePostModal"
import { Sidebar, type PageType } from "./components/layout/Sidebar"
import { useState, useRef, useEffect } from "react"
import { Home, Search, Heart, User, PlusCircle, PenSquare } from "lucide-react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { useI18n } from "@/contexts/I18nContext"
import { motion, AnimatePresence } from "framer-motion"

type Column = {
  id: string
  pageType: PageType
  activeFilter?: string
}

type PageMeta = {
  title: string
  icon: typeof Home
  filterOptions?: FilterOption[]
  defaultFilter?: string
}

const buildPageMeta = (t: (key: string) => string): Record<PageType, PageMeta> => {
  const feedFilters: FilterOption[] = [
    { key: "foryou", label: t("app.filter.forYou") },
    { key: "following", label: t("app.filter.following") },
  ]

  const notifFilters: FilterOption[] = [
    { key: "all", label: t("app.filter.all") },
    { key: "replies", label: t("app.filter.replies") },
    { key: "mentions", label: t("app.filter.mentions") },
    { key: "follows", label: t("app.filter.follows") },
    { key: "requests", label: t("app.filter.requests") },
  ]

  return {
    feed: {
      title: t("app.filter.forYou"),
      icon: Home,
      filterOptions: feedFilters,
      defaultFilter: "foryou",
    },
    search: {
      title: t("sidebar.search"),
      icon: Search,
    },
    notifications: {
      title: t("app.filter.all"),
      icon: Heart,
      filterOptions: notifFilters,
      defaultFilter: "all",
    },
    profile: {
      title: t("sidebar.profile"),
      icon: User,
    },
  }
}

const ADD_OPTIONS: PageType[] = ["feed", "search", "notifications", "profile"]

const INITIAL_COLUMNS: Column[] = [{
  id: "main-feed",
  pageType: "feed",
  activeFilter: "foryou",
}]

const resolveColumnTitle = (column: Column, pageMeta: Record<PageType, PageMeta>) => {
  const meta = pageMeta[column.pageType]

  if (!meta.filterOptions || !column.activeFilter) {
    return meta.title
  }

  const activeFilter = meta.filterOptions.find((item) => item.key === column.activeFilter)
  return activeFilter?.label ?? meta.title
}

// ─── Page content router ──────────────────────────────────────────────────────
function PageContent({ pageType, onOpenPost, activeFilter }: {
  pageType: PageType
  onOpenPost: () => void
  activeFilter?: string
}) {
  switch (pageType) {
    case "search":        return <SearchPage />
    case "notifications": return <NotificationsPage activeFilter={activeFilter} />
    case "profile":       return <ProfilePage />
    default:              return <FeedPage onOpenPost={onOpenPost} activeFilter={activeFilter} />
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const { t } = useI18n()
  const pageMeta = buildPageMeta(t)

  const [activePage, setActivePage] = useState<PageType>("feed")
  const [feedColumns, setFeedColumns] = useLocalStorage<Column[]>("feed-columns", INITIAL_COLUMNS)
  const [singlePageFilters, setSinglePageFilters] = useState<Record<PageType, string | undefined>>({
    feed: "foryou",
    search: undefined,
    notifications: "all",
    profile: undefined,
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [postModalKey, setPostModalKey] = useState(0)
  const pickerRef = useRef<HTMLDivElement>(null)

  const openPostModal = () => {
    setPostModalKey((prev) => prev + 1)
    setIsPostModalOpen(true)
  }

  useEffect(() => {
    if (feedColumns.length === 0) {
      setFeedColumns(INITIAL_COLUMNS)
      return
    }

    const hasLegacyFeedFilter = feedColumns.some(
      (column) =>
        column.pageType === "feed" &&
        column.activeFilter !== undefined &&
        column.activeFilter !== "foryou" &&
        column.activeFilter !== "following"
    )

    if (hasLegacyFeedFilter) {
      setFeedColumns((prev) =>
        prev.map((column) => {
          if (column.pageType !== "feed") {
            return column
          }

          if (column.activeFilter === "foryou" || column.activeFilter === "following") {
            return column
          }

          return {
            ...column,
            activeFilter: "foryou",
          }
        })
      )
      return
    }

    if (feedColumns.length === 1 && feedColumns[0].pageType !== "feed") {
      setFeedColumns(INITIAL_COLUMNS)
    }
  }, [feedColumns, setFeedColumns])

  const handleNavigate = (page: PageType) => {
    setActivePage(page)
  }

  const addColumn = (pageType: PageType) => {
    setFeedColumns((prev) => [
      ...prev,
      {
      id: `col-${Date.now()}`,
      pageType,
      activeFilter: pageMeta[pageType].defaultFilter,
      },
    ])
    setPickerOpen(false)
  }

  const removeColumn = (id: string) => {
    setFeedColumns((prev) => prev.filter((column) => column.id !== id))
  }

  const updateFilter = (colId: string, filterKey: string) => {
    if (activePage !== "feed") {
      setSinglePageFilters((prev) => ({
        ...prev,
        [activePage]: filterKey,
      }))
      return
    }

    setFeedColumns((prev) =>
      prev.map((column) => {
        if (column.id !== colId) {
          return column
        }

        return {
          ...column,
          activeFilter: filterKey,
        }
      })
    )
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    if (pickerOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [pickerOpen])

  const columns = activePage === "feed"
    ? feedColumns
    : [
        {
          id: `single-${activePage}`,
          pageType: activePage,
          activeFilter: singlePageFilters[activePage] ?? pageMeta[activePage].defaultFilter,
        },
      ]

  const isSingleColumnMode = activePage !== "feed" || columns.length === 1

  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-slate-50 text-foreground flex flex-col items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-bold mb-4">Threads Clone</h1>
            <p className="text-muted-foreground mb-4">{t("auth.signInPrompt")}</p>
            <div className="flex gap-4">
              <SignInButton mode="modal">
                <Button variant="default" className="rounded-full px-8 py-6 text-lg font-bold">{t("auth.logIn")}</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" className="rounded-full px-8 py-6 text-lg font-bold">{t("auth.signUp")}</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <AppLayout
          sidebar={
            <Sidebar
              activePage={activePage}
              onNavigate={handleNavigate}
              onOpenPost={openPostModal}
            />
          }
          isSingleColumnMode={isSingleColumnMode}
        >
          <AnimatePresence mode="popLayout">
            {columns.map((col, idx) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <SubPageContainer
                  title={resolveColumnTitle(col, pageMeta)}
                  columnCount={columns.length}
                  isDeletable={activePage === "feed" && idx !== 0}
                  onDelete={() => removeColumn(col.id)}
                  filterOptions={pageMeta[col.pageType].filterOptions}
                  activeFilter={col.activeFilter}
                  onFilterChange={(key) => updateFilter(col.id, key)}
                  disableInternalScroll={isSingleColumnMode}
                >
                  <PageContent
                    pageType={col.pageType}
                    onOpenPost={openPostModal}
                    activeFilter={col.activeFilter}
                  />
                </SubPageContainer>
              </motion.div>
            ))}
          </AnimatePresence>
        </AppLayout>

        {/* Floating Add Page Button - Fixed góc trên phải, chỉ hiện ở trang Feed */}
        {activePage === "feed" && (
          <div className="fixed top-6 right-6 z-50" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen((value) => !value)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-card border-2 border-border text-foreground hover:bg-muted shadow-lg transition-all hover:scale-105"
              title={t("app.addPage")}
            >
              <PlusCircle size={22} />
            </button>

            {pickerOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-[190px] bg-popover border border-border rounded-2xl shadow-xl py-2 overflow-hidden">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-1.5">
                  {t("app.addPage")}
                </p>
                {ADD_OPTIONS.map((page) => {
                  const { title, icon: Icon } = pageMeta[page]
                  return (
                    <button
                      key={page}
                      onClick={() => addColumn(page)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
                    >
                      <Icon size={16} className="text-muted-foreground shrink-0" />
                      {title}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Fixed FAB — bottom right */}
        <button
          onClick={openPostModal}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 h-11 bg-card text-foreground border-2 border-border rounded-2xl font-semibold text-sm shadow-xl hover:bg-muted active:scale-95 transition-all"
        >
          <PenSquare size={16} strokeWidth={2.5} />
          {t("common.post")}
        </button>

        <CreatePostModal
          key={postModalKey}
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
        />
      </SignedIn>
    </>
  )
}

export default App
