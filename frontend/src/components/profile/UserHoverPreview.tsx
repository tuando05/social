import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@clerk/clerk-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/useApi"
import { useI18n } from "@/contexts/I18nContext"
import type { User } from "@/types/api"

type ProfilePreviewResponse = User & {
  isFollowing?: boolean
}

type UserHoverPreviewProps = {
  username: string
  fallbackName: string
  className?: string
  children?: ReactNode
}

type CardPosition = {
  top: number
  left: number
}

const CARD_WIDTH = 280
const CARD_OFFSET = 10
const VIEWPORT_PADDING = 10
const CLOSE_DELAY_MS = 120

export function UserHoverPreview({
  username,
  fallbackName,
  className,
  children,
}: UserHoverPreviewProps) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const closeTimeoutRef = useRef<number | null>(null)

  const { apiFetch } = useApi()
  const { t } = useI18n()
  const { user: viewer } = useUser()
  const queryClient = useQueryClient()

  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<CardPosition>({ top: 0, left: 0 })
  const [optimisticFollow, setOptimisticFollow] = useState<boolean | null>(null)

  const canLoadProfile = Boolean(username && username !== "unknown")

  const { data, isLoading } = useQuery<ProfilePreviewResponse>({
    queryKey: ["users", "preview", username],
    queryFn: () => apiFetch(`/api/users/u/${encodeURIComponent(username)}`),
    enabled: isOpen && canLoadProfile,
    staleTime: 60_000,
  })

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const computePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()

    if (!rect) {
      return
    }

    let left = rect.left
    if (left + CARD_WIDTH + VIEWPORT_PADDING > window.innerWidth) {
      left = window.innerWidth - CARD_WIDTH - VIEWPORT_PADDING
    }
    left = Math.max(VIEWPORT_PADDING, left)

    const top = rect.bottom + CARD_OFFSET
    setPosition({ top, left })
  }, [])

  const openCard = useCallback(() => {
    clearCloseTimeout()
    computePosition()
    setIsOpen(true)
  }, [clearCloseTimeout, computePosition])

  const closeCardSoon = useCallback(() => {
    clearCloseTimeout()
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
    }, CLOSE_DELAY_MS)
  }, [clearCloseTimeout])

  useEffect(() => {
    return () => {
      clearCloseTimeout()
    }
  }, [clearCloseTimeout])

  const baseFollowing = Boolean(data?.isFollowing)
  const isFollowing = optimisticFollow ?? baseFollowing
  const isOwnProfile = Boolean(data?.id && viewer?.id === data.id)

  const followMutation = useMutation({
    mutationFn: async (nextFollowState: boolean) => {
      if (!data?.id) {
        throw new Error("Missing profile id")
      }

      return apiFetch(`/api/users/${data.id}/follow`, {
        method: nextFollowState ? "POST" : "DELETE",
      })
    },
    onMutate: (nextFollowState) => {
      setOptimisticFollow(nextFollowState)
    },
    onError: () => {
      setOptimisticFollow(null)
    },
    onSuccess: (_response, nextFollowState) => {
      queryClient.setQueryData<ProfilePreviewResponse | undefined>(
        ["users", "preview", username],
        (previous) => {
          if (!previous) {
            return previous
          }

          return {
            ...previous,
            isFollowing: nextFollowState,
          }
        }
      )
    },
    onSettled: () => {
      setOptimisticFollow(null)
    },
  })

  const handleToggleFollow = () => {
    if (!data?.id || isOwnProfile || followMutation.isPending) {
      return
    }

    followMutation.mutate(!isFollowing)
  }

  const displayName = data?.displayName || fallbackName
  const baseFollowerCount = data?._count?.followers ?? data?.followerCount ?? 0
  const followerCountDelta =
    optimisticFollow === null || optimisticFollow === baseFollowing
      ? 0
      : optimisticFollow
        ? 1
        : -1
  const followerCount = Math.max(0, baseFollowerCount + followerCountDelta)

  const card = isOpen ? (
    <div
      className="fixed z-[2147483647] w-[280px] rounded-2xl border border-border bg-card p-4 shadow-2xl"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={openCard}
      onMouseLeave={closeCardSoon}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="h-11 w-11 border border-border">
            <AvatarImage src={data?.avatar || data?.imageUrl || undefined} alt={displayName} />
            <AvatarFallback>{displayName[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">@{username}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {followerCount.toLocaleString()} {t("profile.followers")}
            </p>
          </div>
        </div>

        {!isOwnProfile && canLoadProfile && (
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            onClick={handleToggleFollow}
            disabled={followMutation.isPending || !data?.id}
            className="h-8 rounded-full px-3 text-xs font-semibold"
          >
            {isFollowing ? t("search.following") : t("search.follow")}
          </Button>
        )}
      </div>

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-foreground/90">
        {isLoading ? t("common.loading") : data?.bio || t("profile.hover.noBio")}
      </p>
    </div>
  ) : null

  return (
    <span
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={openCard}
      onMouseLeave={closeCardSoon}
      tabIndex={0}
    >
      <span className={className}>{children || fallbackName}</span>

      {card && typeof document !== "undefined" ? createPortal(card, document.body) : null}
    </span>
  )
}
