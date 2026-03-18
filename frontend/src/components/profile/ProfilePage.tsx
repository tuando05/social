import { useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react"
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

const TABS: { key: ProfileTab; label: string }[] = [
  { key: "posts",   label: "Bài viết" },
  { key: "replies", label: "Trả lời" },
  { key: "reposts", label: "Bài đăng lại" },
]

const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/

const PROFILE_EDIT_LAYOUT = {
  widthVw: 92,
  maxWidthPx: 620,
  maxHeightDvh: 88,
  bodyMaxHeightDvh: 58,
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

const PROFILE_EDIT_BODY_STYLE: CSSProperties = {
  maxHeight: `${PROFILE_EDIT_LAYOUT.bodyMaxHeightDvh}dvh`,
}

const getDisplayName = (user: User | undefined) => {
  if (!user) return "User"
  return user.displayName || user.username || "User"
}

const normalizeEditableLinks = (links: EditableLink[]) => {
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
        error: "Mỗi link cần đủ nhãn và URL.",
        links: [] as Array<{ label: string; url: string; sortOrder: number }>,
      }
    }

    const finalUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`

    try {
      new URL(finalUrl)
    } catch {
      return {
        error: `URL không hợp lệ: ${rawUrl}`,
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

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (updated: User) => {
      queryClient.setQueryData(["users", "me"], updated)
      queryClient.invalidateQueries({ queryKey: ["users", "me"] })
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
      setIsEditOpen(false)
      setFormError(null)
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Cập nhật thất bại"
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
      queryClient.invalidateQueries({ queryKey: ["posts", "user", me?.id] })
      queryClient.invalidateQueries({ queryKey: ["posts", "reposts", me?.id] })
    },
  })

  const repostMutation = useMutation({
    mutationFn: async (payload: { postId: string; isReposted: boolean }) => {
      const method = payload.isReposted ? "DELETE" : "POST"
      return apiFetch(`/api/posts/${payload.postId}/repost`, {
        method,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
      queryClient.invalidateQueries({ queryKey: ["posts", "user", me?.id] })
      queryClient.invalidateQueries({ queryKey: ["posts", "reposts", me?.id] })
      queryClient.invalidateQueries({ queryKey: ["posts", "my-reposts", me?.id] })
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

      queryClient.invalidateQueries({ queryKey: ["comments", "thread", variables.postId] })
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
      queryClient.invalidateQueries({ queryKey: ["posts", "user", me?.id] })
      queryClient.invalidateQueries({ queryKey: ["posts", "reposts", me?.id] })
      queryClient.invalidateQueries({ queryKey: ["comments", "user", me?.id] })
    },
  })

  const profileLinks = useMemo(() => {
    if (!me) return []
    return (me.links || me.profileLinks || []) as ProfileLink[]
  }, [me])

  const posts = postPage?.data || []
  const replies = repliesPage?.data || []
  const reposts = repostPage?.data || []
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
      setFormError("Vui lòng chọn file ảnh hợp lệ.")
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setFormError("Ảnh đại diện tối đa 4MB.")
      return
    }

    setFormError(null)

    try {
      const uploadedFiles = await startUpload([file])
      const uploadedFile = uploadedFiles?.[0]
      const uploadedUrl = uploadedFile?.ufsUrl || uploadedFile?.url

      if (!uploadedUrl) {
        setFormError("Upload ảnh thất bại. Vui lòng thử lại.")
        return
      }

      setAvatar(uploadedUrl)
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : "Upload ảnh thất bại.")
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
      setFormError("Ảnh đại diện đang tải lên, vui lòng chờ hoàn tất.")
      return
    }

    const normalizedUsername = username.trim().toLowerCase()

    if (!normalizedUsername) {
      setFormError("Username là bắt buộc.")
      return
    }

    if (normalizedUsername.length < 3 || normalizedUsername.length > 32 || !USERNAME_REGEX.test(normalizedUsername)) {
      setFormError("Username cần 3-32 ký tự và chỉ gồm chữ, số, dấu chấm hoặc gạch dưới.")
      return
    }

    const normalizedLinks = normalizeEditableLinks(links)
    if (normalizedLinks.error) {
      setFormError(normalizedLinks.error)
      return
    }

    if (normalizedLinks.links.length > 10) {
      setFormError("Tối đa 10 link kết nối.")
      return
    }

    const trimmedAvatar = avatar.trim()
    if (trimmedAvatar) {
      try {
        new URL(trimmedAvatar)
      } catch {
        setFormError("Ảnh đại diện không hợp lệ. Vui lòng upload lại.")
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
        <p className="text-sm text-muted-foreground">Đang tải trang cá nhân...</p>
      </div>
    )
  }

  if (error || !me) {
    return (
      <div className="flex flex-col w-full p-8">
        <p className="text-sm text-red-600 font-semibold">Không thể tải trang cá nhân.</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "Vui lòng thử lại sau."}
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
            Username này đang ở dạng mặc định. Bạn có thể đổi trong phần Chỉnh sửa trang cá nhân.
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
          <span>
            <span className="font-bold">{followerCount.toLocaleString()}</span>{" "}
            <span className="text-muted-foreground">{t("profile.followers")}</span>
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span>
            <span className="font-bold">{followingCount}</span>{" "}
            <span className="text-muted-foreground">{t("profile.following")}</span>
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-full font-semibold gap-2 h-9"
          onClick={openEditDialog}
        >
          <Pencil size={14} />
          Chỉnh sửa trang cá nhân
        </Button>
      </div>

      {/* Tabs — sticky */}
      <div className="sticky top-0 z-10 flex bg-card/90 backdrop-blur-sm border-b border-border/50">
        {TABS.map(tab => (
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
          <div className="px-5 py-8 text-sm text-muted-foreground">Đang tải bài viết...</div>
        )}

        {activeTab === "posts" && !isPostsLoading && posts.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Bạn chưa có bài viết nào.</div>
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
                name: post.author.displayName || post.author.username || "Anonymous",
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
            />
          )
        })}

        {activeTab === "replies" && isRepliesLoading && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Đang tải trả lời...</div>
        )}

        {activeTab === "replies" && !isRepliesLoading && replies.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Bạn chưa có trả lời nào.</div>
        )}

        {activeTab === "replies" && replies.map((reply) => (
          <div key={reply.id}>
            <PostCard
              id={reply.id}
              author={{
                name: reply.author.displayName || reply.author.username || "Anonymous",
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
              <p className="px-16 pb-3 text-xs text-muted-foreground line-clamp-1">
                Trả lời bài viết: {reply.post.content}
              </p>
            )}
          </div>
        ))}

        {activeTab === "reposts" && isRepostsLoading && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Đang tải bài đăng lại...</div>
        )}

        {activeTab === "reposts" && !isRepostsLoading && reposts.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Bạn chưa có bài đăng lại nào.</div>
        )}

        {activeTab === "reposts" && reposts.map((repost) => {
          const isLiked = Boolean(repost.isLikedByMe)
          const isReposted = Boolean(repost.isRepostedByMe)
          const likeDisabled = likeMutation.isPending && likeMutation.variables?.postId === repost.id
          const repostDisabled = repostMutation.isPending && repostMutation.variables?.postId === repost.id

          return (
            <div key={repost.repostId}>
              <p className="px-6 pt-3 pb-1 text-xs text-muted-foreground">
                Đăng lại lúc {formatRelativeTime(repost.repostedAt, language, t)}
              </p>
              <PostCard
                id={repost.id}
                author={{
                  name: repost.author.displayName || repost.author.username || "Anonymous",
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
    </div>

    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DialogContent
        className="overflow-hidden rounded-[28px] border-2 border-border bg-card p-0 shadow-2xl"
        style={PROFILE_EDIT_DIALOG_STYLE}
      >
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <DialogTitle>Chỉnh sửa trang cá nhân</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin hồ sơ công khai của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-5" style={PROFILE_EDIT_BODY_STYLE}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username *</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="username"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">3-32 ký tự, chỉ chữ, số, dấu chấm, gạch dưới.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Tên hiển thị"
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Giới thiệu ngắn..."
              maxLength={300}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ảnh đại diện</label>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-3">
              <Avatar className="h-14 w-14 border border-border">
                <AvatarImage
                  src={avatar.trim() ? avatar.trim() : (me.avatar || me.imageUrl || undefined)}
                />
                <AvatarFallback>{getDisplayName(me)[0]}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Upload ảnh JPG, PNG, WEBP tối đa 4MB.</p>

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
                    {isAvatarUploading ? "Đang tải ảnh..." : "Tải ảnh đại diện"}
                  </Button>

                  {avatar.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatar("")}
                      disabled={isAvatarUploading}
                    >
                      Gỡ ảnh
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Link kết nối</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddLink}
                disabled={links.length >= 10}
              >
                <Plus size={14} />
                Thêm link
              </Button>
            </div>

            {links.length === 0 && (
              <p className="text-xs text-muted-foreground">Chưa có link nào. Bạn có thể thêm tối đa 10 link.</p>
            )}

            <div className="space-y-2">
              {links.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    value={item.label}
                    onChange={(event) => onChangeLink(item.id, "label", event.target.value)}
                    placeholder="Nhãn (GitHub, LinkedIn...)"
                    maxLength={40}
                  />
                  <Input
                    value={item.url}
                    onChange={(event) => onChangeLink(item.id, "url", event.target.value)}
                    placeholder="URL"
                    maxLength={2048}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveLink(item.id)}
                    aria-label="Xóa link"
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
            Hủy
          </Button>
          <Button
            type="button"
            onClick={onSubmitProfile}
            disabled={updateProfileMutation.isPending || isAvatarUploading}
          >
            {isAvatarUploading ? "Đang tải ảnh..." : updateProfileMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
