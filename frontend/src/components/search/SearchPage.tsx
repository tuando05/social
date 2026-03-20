import { useEffect, useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import { useI18n } from "@/contexts/I18nContext"
import { UserHoverPreview } from "@/components/profile/UserHoverPreview"
import type { User } from "@/types/api"

type SearchUser = User & {
  isFollowing?: boolean
}

type SearchUsersResponse = {
  users: SearchUser[]
}

type ProfilePreviewResponse = User & {
  isFollowing?: boolean
}

export function SearchPage() {
  const { t } = useI18n()
  const { apiFetch } = useApi()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")

  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const normalizedDebouncedQuery = debouncedQuery.trim()

  const usersSearchPath = useMemo(
    () =>
      `/api/search?type=users${
        normalizedDebouncedQuery ? `&q=${encodeURIComponent(normalizedDebouncedQuery)}` : ""
      }`,
    [normalizedDebouncedQuery]
  )

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 250)
    return () => clearTimeout(handler)
  }, [query])

  const usersQuery = useQuery<SearchUsersResponse>({
    queryKey: ["search", "users", normalizedDebouncedQuery],
    queryFn: ({ signal }) => apiFetch(usersSearchPath, { signal }),
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

      const previousQueries = queryClient.getQueriesData<SearchUsersResponse>({
        queryKey: ["search", "users"],
      })
      const previousPreviewQueries = queryClient.getQueriesData<ProfilePreviewResponse>({
        queryKey: ["users", "preview"],
      })
      const previousMe = queryClient.getQueryData<User>(["users", "me"])

      if (previousMe) {
        const baseFollowingCount = previousMe._count?.following ?? previousMe.followingCount ?? 0
        const currentlyFollowing = previousQueries.some(([, data]) =>
          Boolean(data?.users.some((item) => item.id === userId && Boolean(item.isFollowing)))
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
        if (!data) {
          continue
        }

        queryClient.setQueryData<SearchUsersResponse>(cacheKey, {
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

  const usersToDisplay = usersQuery.data?.users || []
  const isLoading = usersQuery.isLoading

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
      </div>

      {/* Content */}
      <div className="flex flex-col divide-y divide-border/40">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        )}

        {!isLoading && usersToDisplay.map((user) => {
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

        {!isLoading && usersToDisplay.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {t("search.noUsers")}
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  )
}
