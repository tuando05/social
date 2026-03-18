import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import { useI18n } from "@/contexts/I18nContext"
import { UserHoverPreview } from "@/components/profile/UserHoverPreview"
import type { User } from "@/types/api"

type SearchTab = "suggested" | "trending" | "people"

// Mock data removed

// Removed ALL_PEOPLE since it's now fetching from API

export function SearchPage() {
  const { t } = useI18n()
  const [query, setQuery]       = useState("")
  const [activeTab, setActiveTab] = useState<SearchTab>("suggested")
  const [followed, setFollowed] = useState<Set<string>>(new Set())

  const SEARCH_TABS: { key: SearchTab; label: string }[] = [
    { key: "suggested", label: t("search.tab.suggested") },
    { key: "trending",  label: t("search.tab.trending") },
    { key: "people",    label: t("search.tab.people") },
  ]

  const { apiFetch } = useApi()
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  const toggleFollow = (id: string) => {
    setFollowed(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500)
    return () => clearTimeout(handler)
  }, [query])

  const { data: searchResults, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["search", debouncedQuery],
    queryFn: () => apiFetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=users`),
    enabled: true,
  })

  // Determine what to show in tabs (suggested/people)
  const usersToDisplay = searchResults?.users || [] 

  return (
    <div className="flex flex-col w-full">
      {/* Search bar + tabs — sticky */}
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border/50">
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="pl-9 rounded-full bg-muted/40 border-transparent focus-visible:border-border/60 focus-visible:ring-0 text-sm h-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex">
          {SEARCH_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors relative
                ${activeTab === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col divide-y divide-border/40">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        )}

        {!isLoading && activeTab !== "trending" && usersToDisplay.map(user => {
          const followerCount = user.followerCount ?? user._count?.followers ?? 0
          return (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/15 transition-colors"
            >
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={user.imageUrl || undefined} />
                <AvatarFallback>{user.displayName?.[0] || user.username[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <UserHoverPreview
                  username={user.username}
                  fallbackName={user.displayName || user.username}
                  className="text-sm font-semibold leading-tight truncate hover:underline cursor-pointer"
                />
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username} {followerCount > 0 ? `· ${t("search.followers", { count: followerCount })}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant={followed.has(user.id) ? "outline" : "default"}
                onClick={() => toggleFollow(user.id)}
                className="rounded-full text-xs h-8 px-4 shrink-0"
              >
                {followed.has(user.id) ? t("search.following") : t("search.follow")}
              </Button>
            </div>
          )
        })}
        
        {!isLoading && activeTab !== "trending" && usersToDisplay.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {t("search.noUsers")}
          </div>
        )}

        {activeTab === "trending" && (
          <div className="text-center py-10 text-muted-foreground text-sm">{t("search.inProgress")}</div>
        )}

        <div className="h-16" />
      </div>
    </div>
  )
}
