import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useApi } from "@/hooks/useApi"
import { useI18n } from "@/contexts/I18nContext"
import { formatRelativeTime } from "@/lib/time"
import type { PaginatedResponse, Post, User } from "@/types/api"
import { PostCard } from "@/components/feed/PostCard"
import { CommentThreadDialog } from "@/components/feed/CommentThreadDialog"
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile"

type UserProfilePageProps = {
  username: string
  onBack?: () => void
}

type ProfilePreviewResponse = User & {
  isFollowing?: boolean
}

type SearchUsersResponse = {
  users: (User & { isFollowing?: boolean })[]
}

export function UserProfilePage({ username, onBack }: UserProfilePageProps) {
  const { apiFetch } = useApi()
  const { language, t } = useI18n()
  const { data: me } = useCurrentUserProfile()
  const queryClient = useQueryClient()
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  const patchPostAcrossCaches = useCallback(
    (postId: string, updater: (post: Post) => Post) => {
      queryClient.setQueriesData({ queryKey: ["posts"] }, (current) => {
        if (!current || typeof current !== "object") {
          return current
        }

        const patchPage = (page: PaginatedResponse<Post>) => {
          if (!Array.isArray(page.data)) {
            return { page, changed: false }
          }

          let changed = false
          const nextData = page.data.map((post) => {
            if (post.id !== postId) {
              return post
            }

            changed = true
            return updater(post)
          })

          return {
            page: changed
              ? {
                  ...page,
                  data: nextData,
                }
              : page,
            changed,
          }
        }

        const singlePage = current as PaginatedResponse<Post>
        if (Array.isArray(singlePage.data)) {
          const { page, changed } = patchPage(singlePage)
          return changed ? page : current
        }

        const infinitePages = current as {
          pages?: PaginatedResponse<Post>[]
          pageParams?: unknown[]
        }

        if (!Array.isArray(infinitePages.pages)) {
          return current
        }

        let changed = false
        const nextPages = infinitePages.pages.map((page) => {
          const patched = patchPage(page)
          if (patched.changed) {
            changed = true
          }

          return patched.page
        })

        return changed
          ? {
              ...infinitePages,
              pages: nextPages,
            }
          : current
      })
    },
    [queryClient]
  )

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery<ProfilePreviewResponse>({
    queryKey: ["users", "preview", username],
    queryFn: () => apiFetch(`/api/users/u/${encodeURIComponent(username)}`),
    enabled: Boolean(username),
  })

  const {
    data: postsPage,
    isLoading: isPostsLoading,
    error: postsError,
  } = useQuery<PaginatedResponse<Post>>({
    queryKey: ["posts", "user", profile?.id],
    queryFn: () => apiFetch(`/api/posts/user/${profile?.id}?limit=20`),
    enabled: Boolean(profile?.id),
  })

  const followMutation = useMutation({
    mutationFn: async (shouldFollow: boolean) => {
      if (!profile?.id) {
        throw new Error("Missing profile id")
      }

      return apiFetch(`/api/users/${profile.id}/follow`, {
        method: shouldFollow ? "POST" : "DELETE",
      })
    },
    onMutate: async (shouldFollow) => {
      await queryClient.cancelQueries({ queryKey: ["users", "preview", username] })
      await queryClient.cancelQueries({ queryKey: ["search", "users"] })
      await queryClient.cancelQueries({ queryKey: ["users", "me"] })

      const previousProfile = queryClient.getQueryData<ProfilePreviewResponse | undefined>([
        "users",
        "preview",
        username,
      ])
      const previousSearchQueries = queryClient.getQueriesData<SearchUsersResponse>({
        queryKey: ["search", "users"],
      })
      const previousMe = queryClient.getQueryData<User>(["users", "me"])

      queryClient.setQueryData<ProfilePreviewResponse | undefined>(["users", "preview", username], (previous) => {
        if (!previous) {
          return previous
        }

        const previousFollowerCount = previous._count?.followers ?? previous.followerCount ?? 0
        const previousFollowState = Boolean(previous.isFollowing)
        const followerDelta = shouldFollow === previousFollowState ? 0 : shouldFollow ? 1 : -1
        const nextFollowerCount = Math.max(0, previousFollowerCount + followerDelta)

        return {
          ...previous,
          isFollowing: shouldFollow,
          followerCount: nextFollowerCount,
          _count: previous._count
            ? {
                ...previous._count,
                followers: nextFollowerCount,
              }
            : previous._count,
        }
      })

      for (const [cacheKey, data] of previousSearchQueries) {
        if (!data) {
          continue
        }

        queryClient.setQueryData<SearchUsersResponse>(cacheKey, {
          users: data.users.map((user) => {
            if (user.username !== username) {
              return user
            }

            const previousFollowerCount = user._count?.followers ?? user.followerCount ?? 0
            const previousFollowState = Boolean(user.isFollowing)
            const followerDelta = shouldFollow === previousFollowState ? 0 : shouldFollow ? 1 : -1
            const nextFollowerCount = Math.max(0, previousFollowerCount + followerDelta)

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

      if (previousMe) {
        const baseFollowingCount = previousMe._count?.following ?? previousMe.followingCount ?? 0
        const currentlyFollowing = Boolean(previousProfile?.isFollowing)
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

      return {
        previousProfile,
        previousSearchQueries,
        previousMe,
      }
    },
    onError: (_error, _shouldFollow, context) => {
      if (!context) {
        return
      }

      queryClient.setQueryData(["users", "preview", username], context.previousProfile)

      for (const [cacheKey, data] of context.previousSearchQueries ?? []) {
        queryClient.setQueryData(cacheKey, data)
      }

      if (context.previousMe) {
        queryClient.setQueryData(["users", "me"], context.previousMe)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["search", "users"], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["users", "preview", username], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["users", "followers"], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["users", "following"], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["users", "me"], refetchType: "active" })
    },
  })

  const likeMutation = useMutation({
    mutationFn: async (payload: { postId: string; isLiked: boolean }) => {
      const method = payload.isLiked ? "DELETE" : "POST"
      return apiFetch(`/api/posts/${payload.postId}/like`, {
        method,
      })
    },
    onSuccess: (_response, payload) => {
      const likeDelta = payload.isLiked ? -1 : 1

      patchPostAcrossCaches(payload.postId, (post) => ({
        ...post,
        isLikedByMe: !payload.isLiked,
        likeCount: Math.max(0, post.likeCount + likeDelta),
      }))

      queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "inactive" })
    },
  })

  const repostMutation = useMutation({
    mutationFn: async (payload: { postId: string; isReposted: boolean }) => {
      const method = payload.isReposted ? "DELETE" : "POST"
      return apiFetch(`/api/posts/${payload.postId}/repost`, {
        method,
      })
    },
    onSuccess: (_response, payload) => {
      patchPostAcrossCaches(payload.postId, (post) => ({
        ...post,
        isRepostedByMe: !payload.isReposted,
      }))

      queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "inactive" })
      queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "active" })
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: async (payload: { postId: string; content: string }) => {
      return apiFetch(`/api/comments/post/${payload.postId}`, {
        method: "POST",
        body: JSON.stringify({
          content: payload.content,
        }),
      })
    },
    onSuccess: (_response, payload) => {
      setCommentDrafts((prev) => ({
        ...prev,
        [payload.postId]: "",
      }))

      patchPostAcrossCaches(payload.postId, (post) => ({
        ...post,
        commentCount: post.commentCount + 1,
      }))

      queryClient.invalidateQueries({ queryKey: ["comments", "thread", payload.postId], refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: ["comments", "user", me?.id], refetchType: "inactive" })
      queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "active" })
    },
  })

  const posts = useMemo(() => postsPage?.data || [], [postsPage])
  const activeCommentPostId = activeCommentPost?.id || null
  const activeCommentDraft = activeCommentPostId ? (commentDrafts[activeCommentPostId] || "") : ""
  const activeCommentPending = Boolean(
    createCommentMutation.isPending &&
      activeCommentPostId &&
      createCommentMutation.variables?.postId === activeCommentPostId
  )

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="px-6 py-8 text-sm text-red-600">
        {profileError instanceof Error ? profileError.message : t("common.unknownError")}
      </div>
    )
  }

  const displayName = profile.displayName || profile.username || "User"
  const followerCount = profile._count?.followers ?? profile.followerCount ?? 0
  const followingCount = profile._count?.following ?? profile.followingCount ?? 0
  const isFollowing = Boolean(profile.isFollowing)
  const isOwnProfile = Boolean(me?.id && me.id === profile.id)

  return (
    <div className="flex flex-col w-full">
      <div className="px-6 pt-6 pb-5 border-b border-border/50">
        <div className="mb-4">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
            <ArrowLeft size={16} />
            {t("profile.back")}
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold leading-tight">{displayName}</h2>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio ? <p className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap">{profile.bio}</p> : null}
            <p className="mt-3 text-sm text-muted-foreground">
              {followerCount.toLocaleString()} {t("profile.followers")} · {followingCount.toLocaleString()} {t("profile.following")}
            </p>
          </div>
          <Avatar className="w-16 h-16 border-2 border-border shrink-0">
            <AvatarImage src={profile.avatar || profile.imageUrl || undefined} />
            <AvatarFallback>{displayName[0] || "U"}</AvatarFallback>
          </Avatar>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            className="rounded-full px-4"
            onClick={() => followMutation.mutate(!isFollowing)}
            disabled={followMutation.isPending || isOwnProfile}
          >
            {isFollowing ? t("search.following") : t("search.follow")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col">
        {isPostsLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!isPostsLoading && postsError && (
          <div className="px-6 py-8 text-sm text-red-600">
            {postsError instanceof Error ? postsError.message : t("common.unknownError")}
          </div>
        )}

        {!isPostsLoading && !postsError && posts.length === 0 && (
          <div className="px-6 py-8 text-sm text-muted-foreground">{t("profile.posts.empty")}</div>
        )}

        {!isPostsLoading && !postsError && posts.map((post) => (
          <PostCard
            key={post.id}
            id={post.id}
            author={{
              name: post.author.displayName || post.author.username || t("common.anonymous"),
              username: post.author.username || "unknown",
              avatar: post.author.avatar || post.author.imageUrl || `https://ui-avatars.com/api/?name=${post.author.username || "User"}`,
              isVerified: post.author.isVerified,
            }}
            content={post.content}
            imageUrls={post.imageUrls}
            timestamp={formatRelativeTime(post.createdAt, language, t)}
            likes={post.likeCount}
            comments={post.commentCount}
            isLiked={Boolean(post.isLikedByMe)}
            likeDisabled={Boolean(likeMutation.isPending && likeMutation.variables?.postId === post.id)}
            onToggleLike={() =>
              likeMutation.mutate({
                postId: post.id,
                isLiked: Boolean(post.isLikedByMe),
              })
            }
            commentsOpen={activeCommentPostId === post.id}
            onToggleComments={() => setActiveCommentPost((prev) => (prev?.id === post.id ? null : post))}
            isReposted={Boolean(post.isRepostedByMe)}
            repostDisabled={Boolean(repostMutation.isPending && repostMutation.variables?.postId === post.id)}
            onToggleRepost={() =>
              repostMutation.mutate({
                postId: post.id,
                isReposted: Boolean(post.isRepostedByMe),
              })
            }
            canDelete={false}
          />
        ))}

        <div className="h-16" />
      </div>

      <CommentThreadDialog
        isOpen={Boolean(activeCommentPost)}
        post={activeCommentPost}
        draft={activeCommentDraft}
        isSubmitting={activeCommentPending}
        onOpenChange={(open) => {
          if (!open) {
            setActiveCommentPost(null)
          }
        }}
        onDraftChange={(value) => {
          if (!activeCommentPostId) {
            return
          }

          setCommentDrafts((prev) => ({
            ...prev,
            [activeCommentPostId]: value,
          }))
        }}
        onSubmit={() => {
          if (!activeCommentPostId) {
            return
          }

          const content = (commentDrafts[activeCommentPostId] || "").trim()
          if (!content || createCommentMutation.isPending) {
            return
          }

          createCommentMutation.mutate({
            postId: activeCommentPostId,
            content,
          })
        }}
      />
    </div>
  )
}
