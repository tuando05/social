import { useState, useEffect, useRef, type CSSProperties } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import { useI18n } from "@/contexts/I18nContext"
import { formatRelativeTime } from "@/lib/time"
import { useUser, useAuth } from "@clerk/clerk-react"
import { Loader2, Image as ImageIcon, X, Globe, Users, ChevronDown, Check, FileText, Trash2, Clock, ArrowLeft } from "lucide-react"
import { useUploadThing } from "@/lib/uploadthing"

type ReplyPermission = 'everyone' | 'followers'

interface Draft {
  id: string
  content: string
  images: string[] // Base64 encoded
  replyPermission: ReplyPermission
  timestamp: number
}

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
}

type ViewMode = 'compose' | 'drafts'

// Resize composer dialog by editing only these numbers.
const COMPOSER_LAYOUT = {
  widthVw: 90,
  maxWidthPx: 600,
  maxHeightDvh: 88,
  bodyMaxHeightDvh: 70,
} as const

// App shell layout: sidebar is fixed 80px wide, so content center is shifted by 40px.
const APP_SIDEBAR_WIDTH_PX = 80
const COMPOSER_VIEWPORT_GUTTER_PX = 24
const COMPOSER_CENTER_OFFSET_PX = APP_SIDEBAR_WIDTH_PX / 2

const COMPOSER_DIALOG_STYLE: CSSProperties = {
  width: `min(${COMPOSER_LAYOUT.widthVw}vw, calc(100vw - ${APP_SIDEBAR_WIDTH_PX + COMPOSER_VIEWPORT_GUTTER_PX * 2}px))`,
  maxWidth: `${COMPOSER_LAYOUT.maxWidthPx}px`,
  maxHeight: `${COMPOSER_LAYOUT.maxHeightDvh}dvh`,
  left: `calc(50% + ${COMPOSER_CENTER_OFFSET_PX}px)`,
}

const COMPOSER_BODY_STYLE: CSSProperties = {
  maxHeight: `${COMPOSER_LAYOUT.bodyMaxHeightDvh}dvh`,
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { language, t } = useI18n()
  const [viewMode, setViewMode] = useState<ViewMode>('compose')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [content, setContent] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [replyPermission, setReplyPermission] = useState<ReplyPermission>('everyone')
  const [showReplyMenu, setShowReplyMenu] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)

  const replyOptions = {
    everyone: { label: t("composer.reply.everyone"), icon: Globe },
    followers: { label: t("composer.reply.followers"), icon: Users },
  } as const

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const replyMenuRef = useRef<HTMLDivElement>(null)

  const { apiFetch } = useApi()
  const queryClient = useQueryClient()
  const { user } = useUser()
  const { getToken } = useAuth()

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    headers: async () => {
      const token = await getToken()
      const headers: Record<string, string> = {}

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      return headers
    },
  })

  // Load drafts when opening drafts view
  const loadDrafts = () => {
    const savedDrafts = localStorage.getItem('post-drafts')
    if (savedDrafts) {
      try {
        const parsedDrafts: Draft[] = JSON.parse(savedDrafts)
        setDrafts(parsedDrafts.sort((a, b) => b.timestamp - a.timestamp))
      } catch (e) {
        console.error('Failed to load drafts:', e)
        setDrafts([])
      }
    } else {
      setDrafts([])
    }
  }

  const deleteDraft = (id: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== id)
    setDrafts(updatedDrafts)
    localStorage.setItem('post-drafts', JSON.stringify(updatedDrafts))
  }

  const selectDraft = (draft: Draft) => {
    setContent(draft.content)
    setReplyPermission(draft.replyPermission)
    setImages([])
    setCurrentDraftId(draft.id)
    setHasDraft(true)
    setViewMode('compose')
  }

  const formatDate = (timestamp: number) => {
    return formatRelativeTime(new Date(timestamp).toISOString(), language, t)
  }

  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; imageUrls: string[] }) => {
      return apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          content: data.content.trim(),
          imageUrls: data.imageUrls,
        }),
      })
    },
    onSuccess: () => {
      // Delete current draft if exists
      if (currentDraftId) {
        const savedDrafts = localStorage.getItem('post-drafts')
        if (savedDrafts) {
          try {
            const drafts: Draft[] = JSON.parse(savedDrafts)
            const updatedDrafts = drafts.filter(d => d.id !== currentDraftId)
            localStorage.setItem('post-drafts', JSON.stringify(updatedDrafts))
          } catch (e) {
            console.error('Failed to delete draft:', e)
          }
        }
      }

      setContent("")
      setImages([])
      setReplyPermission('everyone')
      setCurrentDraftId(null)
      setHasDraft(false)
      setComposerError(null)
      onClose()
      queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
    onError: (error: unknown) => {
      console.error("Failed to post:", error)
      setComposerError(error instanceof Error ? error.message : t("composer.postError"))
    }
  })

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${Math.min(scrollHeight, 300)}px`
    }
  }, [content])

  // Close reply menu when click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (replyMenuRef.current && !replyMenuRef.current.contains(e.target as Node)) {
        setShowReplyMenu(false)
      }
    }
    if (showReplyMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showReplyMenu])

  const handlePost = async () => {
    if (!content.trim() || createPostMutation.isPending || isUploading) return

    setComposerError(null)

    try {
      let imageUrls: string[] = []

      // Upload images if present
      if (images.length > 0) {
        const uploadedFiles = await startUpload(images)

        if (!uploadedFiles || uploadedFiles.length === 0) {
          setComposerError(t("composer.imageUploadError"))
          return
        }

        imageUrls = uploadedFiles.map(file => file.ufsUrl || file.url).filter(Boolean) as string[]

        if (imageUrls.length !== images.length) {
          setComposerError(t("composer.imageUploadError"))
          return
        }
      }

      createPostMutation.mutate({ content, imageUrls })
    } catch (error) {
      console.error("Upload error:", error)
      setComposerError(error instanceof Error ? error.message : t("composer.imageUploadError"))
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    setImages(prev => [...prev, ...imageFiles].slice(0, 4)) // Max 4 images
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleCloseAttempt = () => {
    if (content.trim() || images.length > 0) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

  // Handle Cmd/Ctrl + Enter to submit
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!isOpen) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()

        if (!content.trim() || createPostMutation.isPending || isUploading) {
          return
        }

        await handlePost()
      }

      if (e.key === "Escape") {
        e.preventDefault()

        if (content.trim() || images.length > 0) {
          setShowDiscardDialog(true)
          return
        }

        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, content, images, createPostMutation, onClose, t, isUploading])

  const handleConfirmDiscard = () => {
    // If editing existing draft, delete it
    if (currentDraftId) {
      const savedDrafts = localStorage.getItem('post-drafts')
      if (savedDrafts) {
        try {
          const drafts: Draft[] = JSON.parse(savedDrafts)
          const updatedDrafts = drafts.filter(d => d.id !== currentDraftId)
          localStorage.setItem('post-drafts', JSON.stringify(updatedDrafts))
        } catch (e) {
          console.error('Failed to delete draft:', e)
        }
      }
    }

    setContent("")
    setImages([])
    setReplyPermission('everyone')
    setCurrentDraftId(null)
    setHasDraft(false)
    setComposerError(null)
    setShowDiscardDialog(false)
    onClose()
  }

  const handleSaveDraft = () => {
    const savedDrafts = localStorage.getItem('post-drafts')
    let drafts: Draft[] = []

    try {
      if (savedDrafts) {
        drafts = JSON.parse(savedDrafts)
      }
    } catch (e) {
      console.error('Failed to parse drafts:', e)
    }

    const draftId = currentDraftId || `draft-${Date.now()}`
    const newDraft: Draft = {
      id: draftId,
      content,
      images: [], // For now, don't save images to localStorage (too large)
      replyPermission,
      timestamp: Date.now(),
    }

    // Update existing draft or add new one
    const existingIndex = drafts.findIndex(d => d.id === draftId)
    if (existingIndex >= 0) {
      drafts[existingIndex] = newDraft
    } else {
      drafts.unshift(newDraft) // Add to beginning
    }

    // Keep only last 20 drafts
    drafts = drafts.slice(0, 20)

    localStorage.setItem('post-drafts', JSON.stringify(drafts))

    setContent("")
    setImages([])
    setReplyPermission('everyone')
    setCurrentDraftId(null)
    setHasDraft(false)
    setComposerError(null)
    setShowDiscardDialog(false)
    onClose()
  }

  const hasContent = Boolean(content.trim() || images.length > 0)

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseAttempt()
          }
        }}
      >
        <DialogContent
          className="bg-card p-0 gap-0 overflow-hidden border-2 border-border rounded-[32px] shadow-2xl"
          style={COMPOSER_DIALOG_STYLE}
        >
          <DialogHeader className="px-6 py-4 border-b border-border/50 relative">
            <DialogTitle className="text-center font-bold text-[17px]">
              {viewMode === 'compose' ? t("composer.title") : `${t("composer.drafts")} (${drafts.length})`}
            </DialogTitle>
            <DialogDescription className="sr-only">Create a new post or view drafts</DialogDescription>

            {/* Drafts button in top-left corner / Back button when in drafts view */}
            {viewMode === 'compose' ? (
              <button
                onClick={() => {
                  loadDrafts()
                  setViewMode('drafts')
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title={t("composer.drafts")}
              >
                <FileText size={20} />
              </button>
            ) : (
              <button
                onClick={() => setViewMode('compose')}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title={t("composer.back")}
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </DialogHeader>

          {viewMode === 'compose' ? (
            // Compose View
            <>
              {hasDraft && content && (
                <div className="mx-6 mt-4 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-600 dark:text-blue-400">
                  {t("composer.draftRestored")}
                </div>
              )}

              {composerError && (
                <div className="mx-6 mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {composerError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto" style={COMPOSER_BODY_STYLE}>
            <div className="p-6 flex gap-3">
              <div className="flex flex-col items-center">
                <Avatar className="w-10 h-10 border-2 border-border">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="w-[2px] bg-border flex-1 mt-2 mb-1 rounded-full min-h-[20px]"></div>
              </div>

              <div className="flex-1 flex flex-col pt-1 gap-3">
                <div>
                  <span className="font-semibold text-[15px]">{user?.fullName || user?.username || "You"}</span>
                  <textarea
                    ref={textareaRef}
                    className="mt-2 w-full bg-transparent resize-none outline-none text-[15px] placeholder:text-muted-foreground max-h-[300px] overflow-y-auto"
                    placeholder={t("composer.placeholder")}
                    autoFocus
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value)
                      if (composerError) {
                        setComposerError(null)
                      }
                    }}
                    rows={1}
                  />
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className={`grid gap-2 ${
                    images.length === 1 ? 'grid-cols-1' :
                    images.length === 2 ? 'grid-cols-2' :
                    'grid-cols-2'
                  }`}>
                    {images.map((image, index) => (
                      <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="flex gap-1">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={images.length >= 4}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t("composer.addImage")}
                  >
                    <ImageIcon size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-between items-center border-t border-border/50 bg-muted/5">
            {/* Reply Permission Dropdown */}
            <div className="relative" ref={replyMenuRef}>
              <button
                onClick={() => setShowReplyMenu(v => !v)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {(() => {
                  const Icon = replyOptions[replyPermission].icon
                  return (
                    <>
                      <Icon size={16} />
                      <span>{t("composer.replyCan", { label: replyOptions[replyPermission].label })}</span>
                      <ChevronDown size={14} className={`transition-transform ${showReplyMenu ? 'rotate-180' : ''}`} />
                    </>
                  )
                })()}
              </button>

              {showReplyMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-[220px] bg-popover border border-border rounded-xl shadow-xl py-1.5 overflow-hidden z-50">
                  <p className="text-xs font-semibold text-muted-foreground px-3 py-2">{t("composer.replyWho")}</p>
                  {Object.entries(replyOptions).map(([key, { label, icon: Icon }]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setReplyPermission(key as ReplyPermission)
                        setShowReplyMenu(false)
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-muted-foreground" />
                        <span>{label}</span>
                      </div>
                      {replyPermission === key && <Check size={16} className="text-foreground" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handlePost}
              disabled={!hasContent || createPostMutation.isPending || isUploading}
              className="rounded-full px-8 py-5 font-semibold transition-all bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              {(createPostMutation.isPending || isUploading) ? <Loader2 className="animate-spin w-4 h-4" /> : t("composer.post")}
            </Button>
          </div>
            </>
          ) : (
            // Drafts View
            <div className="max-h-[60vh] overflow-y-auto">
              {drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Clock size={32} className="text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t("composer.emptyDrafts")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("composer.emptyDraftsDesc")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="p-6 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex gap-4">
                        <button
                          onClick={() => selectDraft(draft)}
                          className="flex-1 text-left"
                        >
                          <p className="text-[15px] line-clamp-3 mb-2">
                            {draft.content || <span className="text-muted-foreground italic">{language === "vi" ? "Ban nhap trong" : "Empty draft"}</span>}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock size={12} />
                            <span>{formatDate(draft.timestamp)}</span>
                          </div>
                        </button>
                        <button
                          onClick={() => deleteDraft(draft.id)}
                          className="p-2 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title={language === "vi" ? "Xoa ban nhap" : "Delete draft"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Discard Confirmation Dialog */}
      {showDiscardDialog && (
        <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
          <DialogContent className="sm:max-w-[400px] bg-card border-2 border-border rounded-[32px] p-6">
            <DialogHeader>
              <DialogTitle className="text-center font-bold text-lg">{t("composer.savePostTitle")}</DialogTitle>
              <DialogDescription className="text-center text-muted-foreground mt-2">
                {t("composer.savePostDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-6">
              <Button
                onClick={handleSaveDraft}
                className="w-full rounded-xl py-6 font-semibold bg-foreground text-background hover:bg-foreground/90"
              >
                {t("composer.saveDraft")}
              </Button>
              <Button
                onClick={handleConfirmDiscard}
                variant="destructive"
                className="w-full rounded-xl py-6 font-semibold"
              >
                {t("composer.discard")}
              </Button>
              <Button
                onClick={() => setShowDiscardDialog(false)}
                variant="outline"
                className="w-full rounded-xl py-6 font-semibold"
              >
                {t("composer.continueEdit")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
