import { useCallback, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useApi } from "@/hooks/useApi"
import { useI18n } from "@/contexts/I18nContext"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Comment, PaginatedResponse, Post, ProfileLink, RepostPost, User } from "@/types/api"
import { formatRelativeTime } from "@/lib/time"
import { useUploadThing } from "@/lib/uploadthing"
import { PostCard } from "@/components/feed/PostCard"
import { CommentThreadDialog } from "@/components/feed/CommentThreadDialog"
import { ImagePlus, Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

type ProfileTab = "posts" | "replies" | "reposts"

type EditableLink = {
  id: string
  label: string
  url: string
}

type UpdateProfilePayload = {
  username: string
  displayName?: string
  bio?: string
  avatar?: string
  links: Array<{
    label: string
    url: string
    sortOrder: number
  }>
}

type FollowListTab = "followers" | "following"

type FollowRelationUser = {
  id: string
  username: string
  displayName: string | null
  imageUrl: string | null
  avatar?: string | null
}

type FollowersRelation = {
  followerId: string
  followingId: string
  createdAt: string
  follower: FollowRelationUser
}

type FollowingRelation = {
  followerId: string
  followingId: string
  createdAt: string
  following: FollowRelationUser
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/

const PROFILE_EDIT_LAYOUT = {
  widthVw: 92,
  maxWidthPx: 620,
  maxHeightDvh: 88,
  bodyMaxHeightDvh: 58,
} as const

const FOLLOW_LIST_LAYOUT = {
  widthVw: 88,
  maxWidthPx: 520,
  maxHeightDvh: 84,
  bodyMaxHeightDvh: 56,
} as const

const APP_SIDEBAR_WIDTH_PX = 80
const PROFILE_EDIT_VIEWPORT_GUTTER_PX = 24
const PROFILE_EDIT_CENTER_OFFSET_PX = APP_SIDEBAR_WIDTH_PX / 2

const PROFILE_EDIT_DIALOG_STYLE: CSSProperties = {
  width: `min(${PROFILE_EDIT_LAYOUT.widthVw}vw, calc(100vw - ${APP_SIDEBAR_WIDTH_PX + PROFILE_EDIT_VIEWPORT_GUTTER_PX * 2}px))`,
  maxWidth: `${PROFILE_EDIT_LAYOUT.maxWidthPx}px`,
  maxHeight: `${PROFILE_EDIT_LAYOUT.maxHeightDvh}dvh`,
  left: `calc(50% + ${PROFILE_EDIT_CENTER_OFFSET_PX}px)`,
}

const FOLLOW_LIST_DIALOG_STYLE: CSSProperties = {
  width: `min(${FOLLOW_LIST_LAYOUT.widthVw}vw, calc(100vw - ${APP_SIDEBAR_WIDTH_PX + PROFILE_EDIT_VIEWPORT_GUTTER_PX * 2}px))`,
  maxWidth: `${FOLLOW_LIST_LAYOUT.maxWidthPx}px`,
  maxHeight: `${FOLLOW_LIST_LAYOUT.maxHeightDvh}dvh`,
  left: `calc(50% + ${PROFILE_EDIT_CENTER_OFFSET_PX}px)`,
}

const PROFILE_EDIT_BODY_STYLE: CSSProperties = {
  maxHeight: `${PROFILE_EDIT_LAYOUT.bodyMaxHeightDvh}dvh`,
}

const FOLLOW_LIST_BODY_STYLE: CSSProperties = {
  maxHeight: `${FOLLOW_LIST_LAYOUT.bodyMaxHeightDvh}dvh`,
}

const getDisplayName = (user: User | undefined) => {
  if (!user) return "User"
  return user.displayName || user.username || "User"
}

const normalizeEditableLinks = (
  links: EditableLink[],
  t: (key: string, params?: Record<string, string | number>) => string
) => {
  const result: Array<{ label: string; url: string; sortOrder: number }> = []

  for (let index = 0; index < links.length; index++) {
    const item = links[index]
    const label = item.label.trim()
    const rawUrl = item.url.trim()

    if (!label && !rawUrl) {
      continue
    }

    if (!label || !rawUrl) {
      return {
        error: t("profile.errors.linkRequireBoth"),
        links: [] as Array<{ label: string; url: string; sortOrder: number }>,
      }
    }

    const finalUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`

    try {
      new URL(finalUrl)
    } catch {
      return {
        error: t("profile.errors.linkInvalidUrl", { url: rawUrl }),
        links: [] as Array<{ label: string; url: string; sortOrder: number }>,
      }
    }

    result.push({
      label,
      url: finalUrl,
      sortOrder: result.length,
    })
  }

  return {
    error: null,
    links: result,
  }
}

export function ProfilePage() {
  const { getToken } = useAuth()
  const { language, t } = useI18n()
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts")
  const [isFollowListOpen, setIsFollowListOpen] = useState(false)
  const [followListTab, setFollowListTab] = useState<FollowListTab>("followers")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatar, setAvatar] = useState("")
  const [links, setLinks] = useState<EditableLink[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const { apiFetch } = useApi()
  const queryClient = useQueryClient()

  const patchPostAcrossCaches = useCallback(
    (postId: string, updater: (post: Post) => Post) => {
      queryClient.setQueriesData<PaginatedResponse<Post>>({ queryKey: ["posts"] }, (current) => {
        if (!current || !Array.isArray(current.data)) {
          return current
        }

        let changed = false
        const nextData = current.data.map((post) => {
          if (post.id !== postId) {
            return post
          }

          changed = true
          return updater(post)
        })

        return changed
          ? {
              ...current,
              data: nextData,
            }
          : current
      })
    },
    [queryClient]
  )

  const { startUpload, isUploading: isAvatarUploading } = useUploadThing("imageUploader", {
    headers: async () => {
      const token = await getToken()
      const headers: Record<string, string> = {}

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      return headers
    },
  })

  const { data: me, isLoading, error } = useQuery<User>({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch("/api/users/me"),
  })

  const {
    data: followersRelations,
    isLoading: isFollowersLoading,
    isFetching: isFollowersFetching,
    error: followersError,
  } = useQuery<FollowersRelation[]>({
    queryKey: ["users", "followers", me?.id],
    queryFn: () => {
      if (!me?.id) {
        throw new Error("Missing user id")
      }

      return apiFetch(`/api/users/${me.id}/followers?limit=50`)
    },
    enabled: Boolean(isFollowListOpen && me?.id),
    staleTime: 0,
    refetchOnMount: "always",
  })

  const {
    data: followingRelations,
    isLoading: isFollowingLoading,
    isFetching: isFollowingFetching,
    error: followingError,
  } = useQuery<FollowingRelation[]>({
    queryKey: ["users", "following", me?.id],
    queryFn: () => {
      if (!me?.id) {
        throw new Error("Missing user id")
      }

      return apiFetch(`/api/users/${me.id}/following?limit=50`)
    },
    enabled: Boolean(isFollowListOpen && me?.id),
    staleTime: 0,
    refetchOnMount: "always",
  })

  const { data: postPage, isLoading: isPostsLoading } = useQuery<PaginatedResponse<Post>>({
    queryKey: ["posts", "user", me?.id],
    queryFn: () => apiFetch(`/api/posts/user/${me?.id}?limit=20`),
    enabled: Boolean(me?.id),
  })

  const { data: repliesPage, isLoading: isRepliesLoading } = useQuery<PaginatedResponse<Comment>>({
    queryKey: ["comments", "user", me?.id],
    queryFn: () => apiFetch(`/api/comments/user/${me?.id}?limit=20`),
    enabled: Boolean(me?.id && activeTab === "replies"),
  })

  const { data: repostPage, isLoading: isRepostsLoading } = useQuery<PaginatedResponse<RepostPost>>({
    queryKey: ["posts", "reposts", me?.id],
    queryFn: () => apiFetch(`/api/posts/user/${me?.id}/reposts?limit=20`),
    enabled: Boolean(me?.id && activeTab === "reposts"),
  })

  const tabs = useMemo<{ key: ProfileTab; label: string }[]>(
    () => [
      { key: "posts", label: t("profile.tab.posts") },
      { key: "replies", label: t("profile.tab.replies") },
      { key: "reposts", label: t("profile.tab.reposts") },
    ],
    [t]
  )

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (updated: User) => {
      queryClient.setQueryData(["users", "me"], updated)
      queryClient.invalidateQueries({ queryKey: ["users", "preview"] })
      queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "inactive" })
      queryClient.invalidateQueries({ queryKey: ["comments"], refetchType: "inactive" })
      queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "inactive" })
      queryClient.invalidateQueries({ queryKey: ["search"], refetchType: "inactive" })
      setIsEditOpen(false)
      setFormError(null)
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : t("profile.errors.updateFailed")
      setFormError(message)
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

      queryClient.invalidateQueries({ queryKey: ["posts", "my-reposts", me?.id], refetchType: "inactive" })
      queryClient.invalidateQueries({ queryKey: ["posts", "reposts", me?.id], refetchType: "inactive" })
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
    onSuccess: (_response, variables) => {
      setCommentDrafts((prev) => ({
        ...prev,
        [variables.postId]: "",
      }))

      patchPostAcrossCaches(variables.postId, (post) => ({
        ...post,
        commentCount: post.commentCount + 1,
      }))

      queryClient.invalidateQueries({ queryKey: ["comments", "thread", variables.postId] })
      queryClient.invalidateQueries({ queryKey: ["comments", "user", me?.id], refetchType: "inactive" })
    },
  })

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiFetch(`/api/posts/${postId}`, {
        method: "DELETE",
      })
    },
    onSuccess: (_response, postId) => {
      queryClient.setQueryData<PaginatedResponse<Post> | undefined>(["posts", "user", me?.id], (current) => {
        if (!current || !Array.isArray(current.data)) {
          return current
        }

        return {
          ...current,
          data: current.data.filter((post) => post.id !== postId),
        }
      })

      queryClient.setQueryData<PaginatedResponse<RepostPost> | undefined>(["posts", "reposts", me?.id], (current) => {
        if (!current || !Array.isArray(current.data)) {
          return current
        }

        return {
          ...current,
          data: current.data.filter((post) => post.id !== postId),
        }
      })

      queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "inactive" })
      queryClient.invalidateQueries({ queryKey: ["comments"], refetchType: "inactive" })
      queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "inactive" })
    },
  })

  const followMutation = useMutation({
    mutationFn: async (payload: { userId: string; shouldFollow: boolean }) => {
      return apiFetch(`/api/users/${payload.userId}/follow`, {
        method: payload.shouldFollow ? "POST" : "DELETE",
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users", "me"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["users", "followers", me?.id], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["users", "following", me?.id], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["users", "preview"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["search", "users"], refetchType: "inactive" }),
      ])
    },
  })

  const profileLinks = useMemo(() => {
    if (!me) return []
    return (me.links || me.profileLinks || []) as ProfileLink[]
  }, [me])

  const posts = postPage?.data || []
  const replies = repliesPage?.data || []
  const reposts = repostPage?.data || []
  const followerUsers = useMemo<FollowRelationUser[]>(() => {
    return (followersRelations || []).map((relation) => relation.follower).filter((user): user is FollowRelationUser => Boolean(user?.id))
  }, [followersRelations])
  const followingUsers = useMemo<FollowRelationUser[]>(() => {
    return (followingRelations || []).map((relation) => relation.following).filter((user): user is FollowRelationUser => Boolean(user?.id))
  }, [followingRelations])
  const followingUserIds = useMemo(() => {
    return new Set(followingUsers.map((user) => user.id))
  }, [followingUsers])
  const activeFollowUsers = followListTab === "followers" ? followerUsers : followingUsers
  const isFollowListLoading = followListTab === "followers" ? isFollowersLoading : isFollowingLoading
  const followListError = followListTab === "followers" ? followersError : followingError
  const isFollowListRefreshing =
    followMutation.isPending ||
    (followListTab === "followers" ? isFollowersFetching : isFollowingFetching)
  const activeCommentPostId = activeCommentPost?.id || null
  const activeCommentDraft = activeCommentPostId ? (commentDrafts[activeCommentPostId] || "") : ""
  const activeCommentPending = Boolean(
    createCommentMutation.isPending &&
      activeCommentPostId &&
      createCommentMutation.variables?.postId === activeCommentPostId
  )

  const followerCount = me?._count?.followers ?? me?.followerCount ?? 0
  const followingCount = me?._count?.following ?? me?.followingCount ?? 0

  const showUsernameHint = Boolean(me?.username && /^(user_|member_)/.test(me.username))

  const openFollowList = (tab: FollowListTab) => {
    setFollowListTab(tab)
    setIsFollowListOpen(true)
  }

  const openEditDialog = () => {
    if (!me) {
      return
    }

    const currentLinks = (me.links || me.profileLinks || []) as ProfileLink[]

    setUsername(me.username || "")
    setDisplayName(me.displayName || "")
    setBio(me.bio || "")
    setAvatar(me.avatar || me.imageUrl || "")
    setLinks(
      currentLinks.map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
      }))
    )

    if (avatarInputRef.current) {
      avatarInputRef.current.value = ""
    }

    setFormError(null)
    setIsEditOpen(true)
  }

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setFormError(t("profile.errors.invalidImageFile"))
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setFormError(t("profile.errors.avatarTooLarge"))
      return
    }

    setFormError(null)

    try {
      const uploadedFiles = await startUpload([file])
      const uploadedFile = uploadedFiles?.[0]
      const uploadedUrl = uploadedFile?.ufsUrl || uploadedFile?.url

      if (!uploadedUrl) {
        setFormError(t("profile.errors.avatarUploadFailed"))
        return
      }

      setAvatar(uploadedUrl)
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : t("profile.errors.avatarUploadFailed"))
    }
  }

  const onAddLink = () => {
    if (links.length >= 10) return
    setLinks((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${prev.length}`,
        label: "",
        url: "",
      },
    ])
  }

  const onRemoveLink = (id: string) => {
    setLinks((prev) => prev.filter((item) => item.id !== id))
  }

  const onChangeLink = (id: string, key: "label" | "url", value: string) => {
    setLinks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [key]: value,
        }
      })
    )
  }

  const handleToggleComments = (post: Post) => {
    setActiveCommentPost((prev) => (prev?.id === post.id ? null : post))
  }

  const handleCommentDraftChange = (postId: string, value: string) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value,
    }))
  }

  const handleCreateComment = (postId: string) => {
    const content = (commentDrafts[postId] || "").trim()

    if (!content || createCommentMutation.isPending) {
      return
    }

    createCommentMutation.mutate({
      postId,
      content,
    })
  }

  const onSubmitProfile = () => {
    if (isAvatarUploading) {
      setFormError(t("profile.errors.avatarUploadingInProgress"))
      return
    }

    const normalizedUsername = username.trim().toLowerCase()

    if (!normalizedUsername) {
      setFormError(t("profile.errors.usernameRequired"))
      return
    }

    if (normalizedUsername.length < 3 || normalizedUsername.length > 32 || !USERNAME_REGEX.test(normalizedUsername)) {
      setFormError(t("profile.errors.usernameInvalid"))
      return
    }

    const normalizedLinks = normalizeEditableLinks(links, t)
    if (normalizedLinks.error) {
      setFormError(normalizedLinks.error)
      return
    }

    if (normalizedLinks.links.length > 10) {
      setFormError(t("profile.errors.tooManyLinks"))
      return
    }

    const trimmedAvatar = avatar.trim()
    if (trimmedAvatar) {
      try {
        new URL(trimmedAvatar)
      } catch {
        setFormError(t("profile.errors.avatarInvalid"))
        return
      }
    }

    setFormError(null)
    updateProfileMutation.mutate({
      username: normalizedUsername,
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      avatar: trimmedAvatar || undefined,
      links: normalizedLinks.links,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col w-full p-8">
        <p className="text-sm text-muted-foreground">{t("profile.loadingPage")}</p>
      </div>
    )
  }

  if (error || !me) {
    return (
      <div className="flex flex-col w-full p-8">
        <p className="text-sm text-red-600 font-semibold">{t("profile.loadError")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : t("profile.loadErrorTryLater")}
        </p>
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col w-full">
      {/* Profile Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/50">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold leading-tight">{getDisplayName(me)}</h2>
            <p className="text-sm text-muted-foreground">@{me.username}</p>
          </div>
          <Avatar className="w-16 h-16 border-2 border-border shadow-sm">
            <AvatarImage src={me.avatar || me.imageUrl || undefined} />
            <AvatarFallback className="text-xl font-bold">{getDisplayName(me)[0]}</AvatarFallback>
          </Avatar>
        </div>

        {showUsernameHint && (
          <div className="text-xs text-amber-700 bg-amber-100 px-3 py-2 rounded-lg mb-3">
            {t("profile.usernameHint")}
          </div>
        )}

        {me.bio && (
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90 mb-3">
            {me.bio}
          </p>
        )}

        {profileLinks.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {profileLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Link2 size={13} />
                {link.label}
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mb-4 text-sm">
          <button
            type="button"
            className="text-left transition-opacity hover:opacity-80"
            onClick={() => openFollowList("followers")}
          >
            <span className="font-bold">{followerCount.toLocaleString()}</span>{" "}
            <span className="text-muted-foreground">{t("profile.followers")}</span>
          </button>
          <span className="text-muted-foreground/30">·</span>
          <button
            type="button"
            className="text-left transition-opacity hover:opacity-80"
            onClick={() => openFollowList("following")}
          >
            <span className="font-bold">{followingCount}</span>{" "}
            <span className="text-muted-foreground">{t("profile.following")}</span>
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-full font-semibold gap-2 h-9"
          onClick={openEditDialog}
        >
          <Pencil size={14} />
          {t("profile.edit")}
        </Button>
      </div>

      {/* Tabs — sticky */}
      <div className="sticky top-0 z-10 flex bg-card/90 backdrop-blur-sm border-b border-border/50">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative
              ${activeTab === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex flex-col">
        {activeTab === "posts" && isPostsLoading && (
          <div className="px-5 py-8 text-sm text-muted-foreground">{t("profile.posts.loading")}</div>
        )}

        {activeTab === "posts" && !isPostsLoading && posts.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">{t("profile.posts.empty")}</div>
        )}

        {activeTab === "posts" && posts.map((post) => {
          const isLiked = Boolean(post.isLikedByMe)
          const isReposted = Boolean(post.isRepostedByMe)
          const likeDisabled = likeMutation.isPending && likeMutation.variables?.postId === post.id
          const repostDisabled = repostMutation.isPending && repostMutation.variables?.postId === post.id

          return (
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
              hasReply={false}
              isLiked={isLiked}
              likeDisabled={Boolean(likeDisabled)}
              onToggleLike={() => likeMutation.mutate({ postId: post.id, isLiked })}
              commentsOpen={activeCommentPost?.id === post.id}
              onToggleComments={() => handleToggleComments(post)}
              isReposted={isReposted}
              repostDisabled={Boolean(repostDisabled)}
              onToggleRepost={() => repostMutation.mutate({ postId: post.id, isReposted })}
              canDelete={Boolean(me?.id && post.authorId === me.id)}
              deleteDisabled={deletePostMutation.isPending && deletePostMutation.variables === post.id}
              onDelete={() => {
                if (deletePostMutation.isPending) {
                  return
                }
                deletePostMutation.mutate(post.id)
              }}
            />
          )
        })}

        {activeTab === "replies" && isRepliesLoading && (
          <div className="px-5 py-8 text-sm text-muted-foreground">{t("profile.replies.loading")}</div>
        )}

        {activeTab === "replies" && !isRepliesLoading && replies.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">{t("profile.replies.empty")}</div>
        )}

        {activeTab === "replies" && replies.map((reply) => (
          <div key={reply.id}>
            <PostCard
              id={reply.id}
              author={{
                name: reply.author.displayName || reply.author.username || t("common.anonymous"),
                username: reply.author.username || "unknown",
                avatar: reply.author.avatar || reply.author.imageUrl || `https://ui-avatars.com/api/?name=${reply.author.username || "User"}`,
                isVerified: reply.author.isVerified,
              }}
              content={reply.content}
              timestamp={formatRelativeTime(reply.createdAt, language, t)}
              likes={reply.likeCount}
              comments={0}
              hasReply={false}
              showActions={false}
            />
            {reply.post?.content && (
              <p className="px-16 pt-1.5 pb-3 text-xs leading-relaxed text-muted-foreground break-words line-clamp-2">
                {t("profile.replies.targetPost", { content: reply.post.content })}
              </p>
            )}
          </div>
        ))}

        {activeTab === "reposts" && isRepostsLoading && (
          <div className="px-5 py-8 text-sm text-muted-foreground">{t("profile.reposts.loading")}</div>
        )}

        {activeTab === "reposts" && !isRepostsLoading && reposts.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">{t("profile.reposts.empty")}</div>
        )}

        {activeTab === "reposts" && reposts.map((repost) => {
          const isLiked = Boolean(repost.isLikedByMe)
          const isReposted = Boolean(repost.isRepostedByMe)
          const likeDisabled = likeMutation.isPending && likeMutation.variables?.postId === repost.id
          const repostDisabled = repostMutation.isPending && repostMutation.variables?.postId === repost.id

          return (
            <div key={repost.repostId}>
              <p className="px-6 pt-3 pb-1 text-xs text-muted-foreground">
                {t("profile.reposts.repostedAt", { time: formatRelativeTime(repost.repostedAt, language, t) })}
              </p>
              <PostCard
                id={repost.id}
                author={{
                  name: repost.author.displayName || repost.author.username || t("common.anonymous"),
                  username: repost.author.username || "unknown",
                  avatar: repost.author.avatar || repost.author.imageUrl || `https://ui-avatars.com/api/?name=${repost.author.username || "User"}`,
                  isVerified: repost.author.isVerified,
                }}
                content={repost.content}
                imageUrls={repost.imageUrls}
                timestamp={formatRelativeTime(repost.createdAt, language, t)}
                likes={repost.likeCount}
                comments={repost.commentCount}
                hasReply={false}
                isLiked={isLiked}
                likeDisabled={Boolean(likeDisabled)}
                onToggleLike={() => likeMutation.mutate({ postId: repost.id, isLiked })}
                commentsOpen={activeCommentPost?.id === repost.id}
                onToggleComments={() => handleToggleComments(repost)}
                isReposted={isReposted}
                repostDisabled={Boolean(repostDisabled)}
                onToggleRepost={() => repostMutation.mutate({ postId: repost.id, isReposted })}
                canDelete={Boolean(me?.id && repost.authorId === me.id)}
                deleteDisabled={deletePostMutation.isPending && deletePostMutation.variables === repost.id}
                onDelete={() => {
                  if (deletePostMutation.isPending) {
                    return
                  }
                  deletePostMutation.mutate(repost.id)
                }}
              />
            </div>
          )
        })}

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
          handleCommentDraftChange(activeCommentPostId, value)
        }}
        onSubmit={() => {
          if (!activeCommentPostId) {
            return
          }
          handleCreateComment(activeCommentPostId)
        }}
      />

      <Dialog open={isFollowListOpen} onOpenChange={setIsFollowListOpen}>
        <DialogContent
          className="overflow-hidden rounded-[28px] border-2 border-border bg-card p-0 shadow-2xl"
          style={FOLLOW_LIST_DIALOG_STYLE}
        >
          <DialogHeader className="border-b border-border/50 px-5 py-4">
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>
                {followListTab === "followers"
                  ? t("profile.followList.tabFollowers")
                  : t("profile.followList.tabFollowing")}
              </span>
              {isFollowListRefreshing ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : null}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("profile.followList.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 border-b border-border/50">
            <button
              type="button"
              onClick={() => setFollowListTab("followers")}
              className={`py-3 text-sm font-semibold transition-colors ${
                followListTab === "followers"
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("profile.followList.tabFollowers")}
            </button>
            <button
              type="button"
              onClick={() => setFollowListTab("following")}
              className={`py-3 text-sm font-semibold transition-colors ${
                followListTab === "following"
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("profile.followList.tabFollowing")}
            </button>
          </div>

          <div className="overflow-y-auto divide-y divide-border/40" style={FOLLOW_LIST_BODY_STYLE}>
            {isFollowListLoading && (
              <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                {t("profile.followList.loading")}
              </div>
            )}

            {!isFollowListLoading && followListError && (
              <div className="px-5 py-8 text-sm text-red-600">
                {followListError instanceof Error ? followListError.message : t("profile.followList.error")}
              </div>
            )}

            {!isFollowListLoading && !followListError && activeFollowUsers.length === 0 && (
              <div className="px-5 py-8 text-sm text-muted-foreground">
                {followListTab === "followers"
                  ? t("profile.followList.emptyFollowers")
                  : t("profile.followList.emptyFollowing")}
              </div>
            )}

            {!isFollowListLoading &&
              !followListError &&
              activeFollowUsers.map((profile) => {
                const isSelf = profile.id === me.id
                const isFollowingUser = followListTab === "following" || followingUserIds.has(profile.id)
                const followPending =
                  followMutation.isPending && followMutation.variables?.userId === profile.id

                return (
                  <div key={`${followListTab}-${profile.id}`} className="flex items-center gap-3 px-5 py-3.5">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={profile.avatar || profile.imageUrl || undefined} />
                      <AvatarFallback>
                        {(profile.displayName || profile.username || "U")[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {profile.displayName || profile.username || t("common.user")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                    </div>

                    {!isSelf && (
                      <Button
                        type="button"
                        size="sm"
                        variant={isFollowingUser ? "outline" : "default"}
                        className="h-8 rounded-full px-4 text-xs"
                        disabled={followPending || isFollowListRefreshing}
                        onClick={() =>
                          followMutation.mutate({
                            userId: profile.id,
                            shouldFollow: !isFollowingUser,
                          })
                        }
                      >
                        {isFollowingUser ? t("search.following") : t("search.follow")}
                      </Button>
                    )}
                  </div>
                )
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DialogContent
        className="overflow-hidden rounded-[28px] border-2 border-border bg-card p-0 shadow-2xl"
        style={PROFILE_EDIT_DIALOG_STYLE}
      >
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <DialogTitle>{t("profile.editDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("profile.editDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-5" style={PROFILE_EDIT_BODY_STYLE}>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("profile.form.usernameLabel")}</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="username"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">{t("profile.form.usernameHint")}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("profile.form.displayNameLabel")}</label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("profile.form.displayNamePlaceholder")}
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("profile.form.bioLabel")}</label>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder={t("profile.form.bioPlaceholder")}
              maxLength={300}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("profile.form.avatarLabel")}</label>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-3">
              <Avatar className="h-14 w-14 border border-border">
                <AvatarImage
                  src={avatar.trim() ? avatar.trim() : (me.avatar || me.imageUrl || undefined)}
                />
                <AvatarFallback>{getDisplayName(me)[0]}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("profile.form.avatarHint")}</p>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isAvatarUploading}
                  >
                    {isAvatarUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    {isAvatarUploading ? t("profile.form.avatarUploading") : t("profile.form.avatarUpload")}
                  </Button>

                  {avatar.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatar("")}
                      disabled={isAvatarUploading}
                    >
                      {t("profile.form.avatarRemove")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t("profile.form.linksLabel")}</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddLink}
                disabled={links.length >= 10}
              >
                <Plus size={14} />
                {t("profile.form.linksAdd")}
              </Button>
            </div>

            {links.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("profile.form.linksEmpty")}</p>
            )}

            <div className="space-y-2">
              {links.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    value={item.label}
                    onChange={(event) => onChangeLink(item.id, "label", event.target.value)}
                    placeholder={t("profile.form.linkLabelPlaceholder")}
                    maxLength={40}
                  />
                  <Input
                    value={item.url}
                    onChange={(event) => onChangeLink(item.id, "url", event.target.value)}
                    placeholder={t("profile.form.linkUrlPlaceholder")}
                    maxLength={2048}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveLink(item.id)}
                    aria-label={t("profile.form.linkRemoveAria")}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {formError}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
            {t("profile.form.cancel")}
          </Button>
          <Button
            type="button"
            onClick={onSubmitProfile}
            disabled={updateProfileMutation.isPending || isAvatarUploading}
          >
            {isAvatarUploading ? t("profile.form.avatarUploading") : updateProfileMutation.isPending ? t("profile.form.saving") : t("profile.form.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
