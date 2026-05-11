import { useEffect, useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import { useI18n } from "@/contexts/I18nContext"
import { UserHoverPreview } from "@/components/profile/UserHoverPreview"
import { PostCard } from "@/components/feed/PostCard"
import type { User, Post } from "@/types/api"
import { formatRelativeTime } from "@/lib/time"

type SearchType = "users" | "posts"

type SearchUser = User & {
  isFollowing?: boolean
}

type SearchResponse = {
  users?: SearchUser[]
  posts?: Post[]
}

type ProfilePreviewResponse = User & {
  isFollowing?: boolean
}

export function SearchPage() {
  const { language, t } = useI18n()
  const { apiFetch } = useApi()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [searchType, setSearchType] = useState<SearchType>("users")

  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const normalizedDebouncedQuery = debouncedQuery.trim()

  const searchPath = useMemo(
    () =>
      `/api/search?type=${searchType}${
        normalizedDebouncedQuery ? `&q=${encodeURIComponent(normalizedDebouncedQuery)}` : ""
      }`,
    [searchType, normalizedDebouncedQuery]
  )

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 250)
    return () => clearTimeout(handler)
  }, [query])

  const searchQuery = useQuery<SearchResponse>({
    queryKey: ["search", searchType, normalizedDebouncedQuery],
    queryFn: ({ signal }) => apiFetch(searchPath, { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  const followMutation = useMutation({
    mutationFn: async (payload: { userId: string; username: string; shouldFollow: boolean }) => {
      return apiFetch(`/api/users/${payload.userId}/follow`, {
        method: payload.shouldFollow ? "POST" : "DELETE",
      })
    },
    onMutate: async ({ userId, username, shouldFollow }) => {
      await queryClient.cancelQueries({ queryKey: ["search", "users"] })
      await queryClient.cancelQueries({ queryKey: ["users", "preview", username] })
      await queryClient.cancelQueries({ queryKey: ["users", "me"] })

      const previousQueries = queryClient.getQueriesData<SearchResponse>({
        queryKey: ["search", "users"],
      })
      const previousPreviewQueries = queryClient.getQueriesData<ProfilePreviewResponse>({
        queryKey: ["users", "preview"],
      })
      const previousMe = queryClient.getQueryData<User>(["users", "me"])

      if (previousMe) {
        const baseFollowingCount = previousMe._count?.following ?? previousMe.followingCount ?? 0
        const currentlyFollowing = previousQueries.some(([, data]) =>
          Boolean(data?.users?.some((item) => item.id === userId && Boolean(item.isFollowing)))
        )
        const followingDelta = shouldFollow === currentlyFollowing ? 0 : shouldFollow ? 1 : -1
        const nextFollowingCount = Math.max(0, baseFollowingCount + followingDelta)

        queryClient.setQueryData<User>(["users", "me"], {
          ...previousMe,
          followingCount: nextFollowingCount,
          _count: previousMe._count
            ? {
                ...previousMe._count,
                following: nextFollowingCount,
              }
            : previousMe._count,
        })
      }

      for (const [cacheKey, data] of previousQueries) {
        if (!data || !data.users) {
          continue
        }

        queryClient.setQueryData<SearchResponse>(cacheKey, {
          ...data,
          users: data.users.map((user) => {
            if (user.id !== userId) {
              return user
            }

            const baseFollowerCount = user.followerCount ?? user._count?.followers ?? 0
            const nextFollowerCount = Math.max(0, baseFollowerCount + (shouldFollow ? 1 : -1))

            return {
              ...user,
              isFollowing: shouldFollow,
              followerCount: nextFollowerCount,
              _count: user._count
                ? {
                    ...user._count,
                    followers: nextFollowerCount,
                  }
                : user._count,
            }
          }),
        })
      }

      for (const [cacheKey, data] of previousPreviewQueries) {
        if (!data || data.id !== userId) {
          continue
        }

        const baseFollowerCount = data.followerCount ?? data._count?.followers ?? 0
        const previousFollowState = Boolean(data.isFollowing)
        const followerDelta = shouldFollow === previousFollowState ? 0 : shouldFollow ? 1 : -1
        const nextFollowerCount = Math.max(0, baseFollowerCount + followerDelta)

        queryClient.setQueryData<ProfilePreviewResponse>(cacheKey, {
          ...data,
          isFollowing: shouldFollow,
          followerCount: nextFollowerCount,
          _count: data._count
            ? {
                ...data._count,
                followers: nextFollowerCount,
              }
            : data._count,
        })
      }

      return { previousQueries, previousPreviewQueries, previousMe }
    },
    onError: (_error, _payload, context) => {
      if (!context) {
        return
      }

      if (context.previousMe) {
        queryClient.setQueryData(["users", "me"], context.previousMe)
      }

      for (const [cacheKey, data] of context.previousQueries) {
        queryClient.setQueryData(cacheKey, data)
      }

      for (const [cacheKey, data] of context.previousPreviewQueries ?? []) {
        queryClient.setQueryData(cacheKey, data)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["search", "users"], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["users", "preview"], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["users", "followers"], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["users", "following"], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["users", "me"], refetchType: "active" })
    },
  })

  const usersToDisplay = searchQuery.data?.users || []
  const postsToDisplay = searchQuery.data?.posts || []
  const isLoading = searchQuery.isLoading

  const toggleFollow = (user: SearchUser) => {
    if (followMutation.isPending && followMutation.variables?.userId === user.id) {
      return
    }

    followMutation.mutate({
      userId: user.id,
      username: user.username,
      shouldFollow: !user.isFollowing,
    })
  }

  return (
    <div className="flex flex-col w-full">
      {/* Search bar — sticky */}
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

        {/* Search Tabs */}
        <div className="flex px-4">
          <button
            onClick={() => setSearchType("users")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              searchType === "users" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("search.tabUsers") || "Users"}
          </button>
          <button
            onClick={() => setSearchType("posts")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              searchType === "posts" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("search.tabPosts") || "Posts"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col divide-y divide-border/40">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        )}

        {!isLoading && searchType === "users" && usersToDisplay.map((user) => {
          const followerCount = user.followerCount ?? user._count?.followers ?? 0
          const isFollowing = Boolean(user.isFollowing)
          const followPending =
            followMutation.isPending && followMutation.variables?.userId === user.id

          return (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/15 transition-colors"
            >
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={user.avatar || user.imageUrl || undefined} />
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
                variant={isFollowing ? "outline" : "default"}
                onClick={() => toggleFollow(user)}
                disabled={followPending}
                className="rounded-full text-xs h-8 px-4 shrink-0"
              >
                {isFollowing ? t("search.following") : t("search.follow")}
              </Button>
            </div>
          )
        })}

        {!isLoading && searchType === "posts" && postsToDisplay.map((post) => (
          <div key={post.id}>
            <PostCard
              id={post.id}
              author={{
                name: post.author.displayName || post.author.username || t("common.anonymous"),
                username: post.author.username || 'unknown',
                avatar: post.author.avatar || post.author.imageUrl || `https://ui-avatars.com/api/?name=${post.author.username || 'User'}`,
                isVerified: post.author.isVerified
              }}
              content={post.content}
              imageUrls={post.imageUrls}
              timestamp={formatRelativeTime(post.createdAt, language, t)}
              likes={post.likeCount}
              comments={post.commentCount}
              hasReply={false}
              showActions={false} // Simplify search results for now
            />
          </div>
        ))}

        {!isLoading && searchType === "users" && usersToDisplay.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {t("search.noUsers")}
          </div>
        )}

        {!isLoading && searchType === "posts" && postsToDisplay.length === 0 && (normalizedDebouncedQuery) && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {t("search.noPosts") || "No posts found"}
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  )
}
