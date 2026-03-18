import { useMemo, useState } from "react"
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
import { UserHoverPreview } from "@/components/profile/UserHoverPreview"
import { Link2, Pencil, Plus, Trash2 } from "lucide-react"

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
  const { language, t } = useI18n()
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatar, setAvatar] = useState("")
  const [links, setLinks] = useState<EditableLink[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const { apiFetch } = useApi()
  const queryClient = useQueryClient()

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

  const profileLinks = useMemo(() => {
    if (!me) return []
    return (me.links || me.profileLinks || []) as ProfileLink[]
  }, [me])

  const posts = postPage?.data || []
  const replies = repliesPage?.data || []
  const reposts = repostPage?.data || []

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
    setFormError(null)
    setIsEditOpen(true)
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

  const onSubmitProfile = () => {
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
      const finalAvatar = /^https?:\/\//i.test(trimmedAvatar) ? trimmedAvatar : `https://${trimmedAvatar}`
      try {
        new URL(finalAvatar)
      } catch {
        setFormError("Avatar URL không hợp lệ.")
        return
      }
    }

    setFormError(null)
    updateProfileMutation.mutate({
      username: normalizedUsername,
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      avatar: trimmedAvatar ? (/^https?:\/\//i.test(trimmedAvatar) ? trimmedAvatar : `https://${trimmedAvatar}`) : undefined,
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
      <div className="flex flex-col divide-y divide-border/40">
        {activeTab === "posts" && isPostsLoading && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Đang tải bài viết...</div>
        )}

        {activeTab === "posts" && !isPostsLoading && posts.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Bạn chưa có bài viết nào.</div>
        )}

        {activeTab === "posts" && posts.map((post) => (
          <div key={post.id} className="px-5 py-4 hover:bg-muted/15 transition-colors cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={me.avatar || me.imageUrl || undefined} />
                <AvatarFallback>{getDisplayName(me)[0]}</AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm font-semibold">{getDisplayName(me)}</span>
                <span className="text-xs text-muted-foreground ml-2">{formatRelativeTime(post.createdAt, language, t)}</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed pl-11">{post.content}</p>
            <div className="flex items-center gap-4 mt-2 pl-11 text-xs text-muted-foreground">
              <span>{post.likeCount} thích</span>
              <span>{post.commentCount} bình luận</span>
            </div>
          </div>
        ))}

        {activeTab === "replies" && isRepliesLoading && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Đang tải trả lời...</div>
        )}

        {activeTab === "replies" && !isRepliesLoading && replies.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Bạn chưa có trả lời nào.</div>
        )}

        {activeTab === "replies" && replies.map((reply) => (
          <div key={reply.id} className="px-5 py-4 hover:bg-muted/15 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={me.avatar || me.imageUrl || undefined} />
                <AvatarFallback>{getDisplayName(me)[0]}</AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm font-semibold">{getDisplayName(me)}</span>
                <span className="text-xs text-muted-foreground ml-2">{formatRelativeTime(reply.createdAt, language, t)}</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed pl-11">{reply.content}</p>
            {reply.post?.content && (
              <p className="text-xs text-muted-foreground pl-11 mt-1 line-clamp-1">
                Trả lời bài viết: {reply.post.content}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 pl-11 text-xs text-muted-foreground">
              <span>{reply.likeCount} thích</span>
            </div>
          </div>
        ))}

        {activeTab === "reposts" && isRepostsLoading && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Đang tải bài đăng lại...</div>
        )}

        {activeTab === "reposts" && !isRepostsLoading && reposts.length === 0 && (
          <div className="px-5 py-8 text-sm text-muted-foreground">Bạn chưa có bài đăng lại nào.</div>
        )}

        {activeTab === "reposts" && reposts.map((repost) => (
          <div key={repost.repostId} className="px-5 py-4 hover:bg-muted/15 transition-colors">
            <p className="text-xs text-muted-foreground mb-2">
              Đăng lại lúc {formatRelativeTime(repost.repostedAt, language, t)}
            </p>
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={repost.author.imageUrl || undefined} />
                <AvatarFallback>{(repost.author.displayName || repost.author.username || "U")[0]}</AvatarFallback>
              </Avatar>
              <div>
                <UserHoverPreview
                  username={repost.author.username || "unknown"}
                  fallbackName={repost.author.displayName || repost.author.username || "Unknown"}
                  className="text-sm font-semibold hover:underline cursor-pointer"
                />
                <span className="text-xs text-muted-foreground ml-2">@{repost.author.username}</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed pl-11">{repost.content}</p>
            <div className="flex items-center gap-4 mt-2 pl-11 text-xs text-muted-foreground">
              <span>{repost.likeCount} thích</span>
              <span>{repost.commentCount} bình luận</span>
            </div>
          </div>
        ))}

        <div className="h-16" />
      </div>
    </div>

    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl border-2 border-border">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa trang cá nhân</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin hồ sơ công khai của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
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
            <label className="text-sm font-medium">Avatar URL</label>
            <Input
              value={avatar}
              onChange={(event) => setAvatar(event.target.value)}
              placeholder="https://..."
            />
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
            Hủy
          </Button>
          <Button type="button" onClick={onSubmitProfile} disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
