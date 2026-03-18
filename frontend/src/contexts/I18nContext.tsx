import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type Language = "vi" | "en"

type TranslationParams = Record<string, string | number>

type I18nContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: TranslationParams) => string
}

const DEFAULT_LANGUAGE: Language = "vi"

const STORAGE_KEY = "language"

const messages: Record<Language, Record<string, string>> = {
  vi: {
    "common.cancel": "Huy",
    "common.close": "Dong",
    "common.save": "Luu",
    "common.edit": "Chinh sua",
    "common.search": "Tim kiem",
    "common.post": "Dang bai",
    "common.loading": "Dang tai...",

    "auth.signInPrompt": "Please sign in to access your account",
    "auth.logIn": "Log in",
    "auth.signUp": "Sign up",

    "sidebar.home": "Trang chu",
    "sidebar.search": "Tim kiem",
    "sidebar.notifications": "Thong bao",
    "sidebar.profile": "Trang ca nhan",
    "sidebar.compose": "Dang bai",

    "app.filter.forYou": "Danh cho ban",
    "app.filter.following": "Dang theo doi",
    "app.filter.suggested": "Goi y",
    "app.filter.all": "Tat ca",
    "app.filter.replies": "Phan hoi",
    "app.filter.mentions": "Luot nhac",
    "app.filter.follows": "Theo doi",
    "app.filter.requests": "Yeu cau",
    "app.addPage": "Them trang",
    "app.deleteColumn": "Xoa cot nay",

    "feed.startThread": "Bat dau mot chu de...",
    "feed.post": "Dang",
    "feed.loadPostsError": "Loi khi tai bai viet",
    "feed.noPosts": "Chua co bai viet nao",
    "feed.comments.loading": "Dang tai binh luan...",
    "feed.comments.empty": "Chua co binh luan nao.",
    "feed.comments.placeholder": "Viet binh luan...",
    "feed.comments.send": "Gui",
    "feed.comments.sending": "Dang gui",
    "feed.comments.viewAll": "Xem toan bo binh luan",
    "feed.comments.dialogTitle": "Binh luan",
    "feed.comments.dialogSubtitle": "{{count}} binh luan",
    "feed.comments.loadMore": "Tai them",

    "post.actions.like": "Thich",
    "post.actions.unlike": "Bo thich",
    "post.actions.openComments": "Xem binh luan",
    "post.actions.closeComments": "An binh luan",
    "post.actions.repost": "Dang lai",
    "post.actions.undoRepost": "Bo dang lai",

    "composer.title": "Tao chu de moi",
    "composer.drafts": "Ban nhap",
    "composer.back": "Quay lai",
    "composer.draftRestored": "Da khoi phuc ban nhap",
    "composer.placeholder": "Bat dau mot chu de...",
    "composer.reply.everyone": "Moi nguoi",
    "composer.reply.followers": "Nguoi theo doi",
    "composer.replyWho": "Ai co the tra loi?",
    "composer.replyCan": "{{label}} co the tra loi",
    "composer.addImage": "Them anh",
    "composer.post": "Dang",
    "composer.postError": "Da xay ra loi khi dang bai. Vui long thu lai!",
    "composer.imageUploadError": "Loi khi tai anh len. Vui long thu lai.",
    "composer.unsupportedImages": "Dang bai kem anh chua duoc ho tro o backend. Hay dang bai van ban hoac xoa anh de tiep tuc.",
    "composer.emptyDrafts": "Chua co ban nhap",
    "composer.emptyDraftsDesc": "Cac bai viet ban luu nhap se xuat hien o day",
    "composer.savePostTitle": "Luu bai dang?",
    "composer.savePostDesc": "Ban co the luu noi dung nay vao nhap de dang sau.",
    "composer.saveDraft": "Luu nhap",
    "composer.discard": "Bo",
    "composer.continueEdit": "Tiep tuc chinh sua",

    "settings.title": "Cai dat",
    "settings.theme": "Giao dien",
    "settings.theme.light": "Sang",
    "settings.theme.dark": "Toi",
    "settings.language": "Ngon ngu",
    "settings.language.vi": "Tieng Viet",
    "settings.language.en": "English",
    "settings.notifications": "Thong bao",
    "settings.privacy": "Quyen rieng tu",
    "settings.logout": "Dang xuat",

    "search.placeholder": "Tim kiem nguoi dung, hashtag...",
    "search.tab.suggested": "Goi y",
    "search.tab.trending": "Xu huong",
    "search.tab.people": "Tai khoan",
    "search.follow": "Theo doi",
    "search.following": "Dang theo doi",
    "search.noUsers": "Khong tim thay nguoi dung nao",
    "search.inProgress": "Tinh nang dang duoc phat trien",
    "search.followers": "{{count}} nguoi theo doi",

    "notifications.empty": "Ban chua co thong bao nao.",
    "notifications.followBack": "Theo doi lai",
    "notifications.accept": "Chap nhan",
    "notifications.reject": "Tu choi",
    "notifications.likePost": "da thich bai viet cua ban.",
    "notifications.likeComment": "da thich binh luan cua ban.",
    "notifications.comment": "da binh luan bai viet cua ban.",
    "notifications.follow": "bat dau theo doi ban.",
    "notifications.mention": "da nhac den ban.",
    "notifications.interacted": "da tuong tac voi ban.",

    "profile.title": "Trang ca nhan",
    "profile.followers": "nguoi theo doi",
    "profile.following": "dang theo doi",
    "profile.hover.noBio": "Chua co gioi thieu",

    "time.justNow": "Vua xong",
    "time.minutesAgo": "{{count}} phut truoc",
    "time.hoursAgo": "{{count}} gio truoc",
    "time.daysAgo": "{{count}} ngay truoc",
  },
  en: {
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.save": "Save",
    "common.edit": "Edit",
    "common.search": "Search",
    "common.post": "Post",
    "common.loading": "Loading...",

    "auth.signInPrompt": "Please sign in to access your account",
    "auth.logIn": "Log in",
    "auth.signUp": "Sign up",

    "sidebar.home": "Home",
    "sidebar.search": "Search",
    "sidebar.notifications": "Notifications",
    "sidebar.profile": "Profile",
    "sidebar.compose": "Post",

    "app.filter.forYou": "For you",
    "app.filter.following": "Following",
    "app.filter.suggested": "Suggested",
    "app.filter.all": "All",
    "app.filter.replies": "Replies",
    "app.filter.mentions": "Mentions",
    "app.filter.follows": "Follows",
    "app.filter.requests": "Requests",
    "app.addPage": "Add page",
    "app.deleteColumn": "Remove this column",

    "feed.startThread": "Start a thread...",
    "feed.post": "Post",
    "feed.loadPostsError": "Failed to load posts",
    "feed.noPosts": "No posts yet",
    "feed.comments.loading": "Loading comments...",
    "feed.comments.empty": "No comments yet.",
    "feed.comments.placeholder": "Write a comment...",
    "feed.comments.send": "Send",
    "feed.comments.sending": "Sending",
    "feed.comments.viewAll": "View all comments",
    "feed.comments.dialogTitle": "Comments",
    "feed.comments.dialogSubtitle": "{{count}} comments",
    "feed.comments.loadMore": "Load more",

    "post.actions.like": "Like",
    "post.actions.unlike": "Unlike",
    "post.actions.openComments": "Open comments",
    "post.actions.closeComments": "Hide comments",
    "post.actions.repost": "Repost",
    "post.actions.undoRepost": "Undo repost",

    "composer.title": "Create a new thread",
    "composer.drafts": "Drafts",
    "composer.back": "Back",
    "composer.draftRestored": "Draft restored",
    "composer.placeholder": "Start a thread...",
    "composer.reply.everyone": "Everyone",
    "composer.reply.followers": "Followers",
    "composer.replyWho": "Who can reply?",
    "composer.replyCan": "{{label}} can reply",
    "composer.addImage": "Add images",
    "composer.post": "Post",
    "composer.postError": "Something went wrong while posting. Please try again.",
    "composer.imageUploadError": "Failed to upload images. Please try again.",
    "composer.unsupportedImages": "Posting with images is not supported by the backend yet. Post text only or remove images to continue.",
    "composer.emptyDrafts": "No drafts yet",
    "composer.emptyDraftsDesc": "Saved drafts will appear here",
    "composer.savePostTitle": "Save this post?",
    "composer.savePostDesc": "You can save this content as a draft and post later.",
    "composer.saveDraft": "Save draft",
    "composer.discard": "Discard",
    "composer.continueEdit": "Continue editing",

    "settings.title": "Settings",
    "settings.theme": "Theme",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.language": "Language",
    "settings.language.vi": "Vietnamese",
    "settings.language.en": "English",
    "settings.notifications": "Notifications",
    "settings.privacy": "Privacy",
    "settings.logout": "Log out",

    "search.placeholder": "Search users, hashtags...",
    "search.tab.suggested": "Suggested",
    "search.tab.trending": "Trending",
    "search.tab.people": "People",
    "search.follow": "Follow",
    "search.following": "Following",
    "search.noUsers": "No users found",
    "search.inProgress": "Feature in progress",
    "search.followers": "{{count}} followers",

    "notifications.empty": "You have no notifications yet.",
    "notifications.followBack": "Follow back",
    "notifications.accept": "Accept",
    "notifications.reject": "Decline",
    "notifications.likePost": "liked your post.",
    "notifications.likeComment": "liked your comment.",
    "notifications.comment": "commented on your post.",
    "notifications.follow": "started following you.",
    "notifications.mention": "mentioned you.",
    "notifications.interacted": "interacted with you.",

    "profile.title": "Profile",
    "profile.followers": "followers",
    "profile.following": "following",
    "profile.hover.noBio": "No bio yet",

    "time.justNow": "Just now",
    "time.minutesAgo": "{{count}}m ago",
    "time.hoursAgo": "{{count}}h ago",
    "time.daysAgo": "{{count}}d ago",
  },
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const interpolate = (message: string, params?: TranslationParams) => {
  if (!params) {
    return message
  }

  return message.replace(/\{\{(.*?)\}\}/g, (_full, key: string) => {
    const trimmedKey = key.trim()
    return String(params[trimmedKey] ?? "")
  })
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "en" || stored === "vi" ? stored : DEFAULT_LANGUAGE
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language === "vi" ? "vi" : "en"
  }, [language])

  const setLanguage = useCallback((value: Language) => {
    setLanguageState(value)
  }, [])

  const t = useCallback((key: string, params?: TranslationParams) => {
    const message = messages[language][key] ?? messages.vi[key] ?? key
    return interpolate(message, params)
  }, [language])

  const contextValue = useMemo<I18nContextType>(() => ({
    language,
    setLanguage,
    t,
  }), [language, setLanguage, t])

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider")
  }

  return context
}
