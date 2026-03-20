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
    "common.cancel": "Hủy",
    "common.close": "Đóng",
    "common.save": "Lưu",
    "common.edit": "Chỉnh sửa",
    "common.search": "Tìm kiếm",
    "common.post": "Đăng bài",
    "common.loading": "Đang tải...",
    "common.anonymous": "Ẩn danh",
    "common.user": "Người dùng",
    "common.unknownError": "Lỗi không xác định",

    "auth.signInPrompt": "Vui lòng đăng nhập để truy cập tài khoản",
    "auth.logIn": "Đăng nhập",
    "auth.signUp": "Đăng ký",

    "sidebar.home": "Trang chủ",
    "sidebar.search": "Tìm kiếm",
    "sidebar.notifications": "Thông báo",
    "sidebar.profile": "Trang cá nhân",
    "sidebar.compose": "Đăng bài",

    "app.filter.forYou": "Dành cho bạn",
    "app.filter.following": "Đang theo dõi",
    "app.filter.suggested": "Gợi ý",
    "app.filter.all": "Tất cả",
    "app.filter.replies": "Phản hồi",
    "app.filter.mentions": "Lượt nhắc",
    "app.filter.follows": "Theo dõi",
    "app.filter.requests": "Yêu cầu",
    "app.addPage": "Thêm trang",
    "app.deleteColumn": "Xóa cột này",

    "feed.startThread": "Bắt đầu một chủ đề...",
    "feed.post": "Đăng",
    "feed.loadPostsError": "Lỗi khi tải bài viết",
    "feed.noPosts": "Chưa có bài viết nào",
    "feed.comments.loading": "Đang tải bình luận...",
    "feed.comments.empty": "Chưa có bình luận nào.",
    "feed.comments.placeholder": "Viết bình luận...",
    "feed.comments.send": "Gửi",
    "feed.comments.sending": "Đang gửi",
    "feed.comments.viewAll": "Xem toàn bộ bình luận",
    "feed.comments.dialogTitle": "Bình luận",
    "feed.comments.dialogSubtitle": "{{count}} bình luận",
    "feed.comments.loadMore": "Tải thêm",

    "post.actions.like": "Thích",
    "post.actions.unlike": "Bỏ thích",
    "post.actions.openComments": "Xem bình luận",
    "post.actions.closeComments": "Ẩn bình luận",
    "post.actions.repost": "Đăng lại",
    "post.actions.undoRepost": "Bỏ đăng lại",
    "post.actions.share": "Chia sẻ",
    "post.actions.copyLinkPrompt": "Sao chép liên kết này",

    "composer.title": "Tạo chủ đề mới",
    "composer.dialogDescription": "Tạo một chủ đề mới hoặc xem bản nháp",
    "composer.drafts": "Bản nháp",
    "composer.back": "Quay lại",
    "composer.draftRestored": "Đã khôi phục bản nháp",
    "composer.you": "Bạn",
    "composer.placeholder": "Bắt đầu một chủ đề...",
    "composer.addImage": "Thêm ảnh",
    "composer.post": "Đăng",
    "composer.postError": "Đã xảy ra lỗi khi đăng bài. Vui lòng thử lại!",
    "composer.imageUploadError": "Lỗi khi tải ảnh lên. Vui lòng thử lại.",
    "composer.unsupportedImages": "Đăng bài kèm ảnh chưa được hỗ trợ ở backend. Hãy đăng văn bản hoặc xóa ảnh để tiếp tục.",
    "composer.emptyDrafts": "Chưa có bản nháp",
    "composer.emptyDraftsDesc": "Các bài viết bạn lưu nháp sẽ xuất hiện ở đây",
    "composer.savePostTitle": "Lưu bài đăng?",
    "composer.savePostDesc": "Bạn có thể lưu nội dung này vào nháp để đăng sau.",
    "composer.saveDraft": "Lưu nháp",
    "composer.discard": "Bỏ",
    "composer.continueEdit": "Tiếp tục chỉnh sửa",
    "composer.emptyDraftContent": "Bản nháp trống",
    "composer.deleteDraft": "Xóa bản nháp",

    "settings.title": "Cài đặt",
    "settings.dialog.description": "Tùy chỉnh giao diện và trải nghiệm của bạn",
    "settings.theme": "Giao diện",
    "settings.theme.description": "Chuyển đổi chế độ sáng/tối",
    "settings.theme.light": "Sáng",
    "settings.theme.dark": "Tối",
    "settings.account": "Tài khoản",
    "settings.account.description": "Quản lý tài khoản của bạn",
    "settings.language": "Ngôn ngữ",
    "settings.language.vi": "Tiếng Việt",
    "settings.language.en": "English",
    "settings.logout": "Đăng xuất",

    "search.placeholder": "Tìm kiếm người dùng, hashtag...",
    "search.tab.suggested": "Gợi ý",
    "search.tab.trending": "Xu hướng",
    "search.tab.people": "Tài khoản",
    "search.follow": "Theo dõi",
    "search.following": "Đang theo dõi",
    "search.noUsers": "Không tìm thấy người dùng nào",
    "search.inProgress": "Tính năng đang được phát triển",
    "search.followers": "{{count}} người theo dõi",

    "notifications.empty": "Bạn chưa có thông báo nào.",
    "notifications.followBack": "Theo dõi lại",
    "notifications.accept": "Chấp nhận",
    "notifications.reject": "Từ chối",
    "notifications.likePost": "đã thích bài viết của bạn.",
    "notifications.likeComment": "đã thích bình luận của bạn.",
    "notifications.comment": "đã bình luận bài viết của bạn.",
    "notifications.follow": "bắt đầu theo dõi bạn.",
    "notifications.repost": "đã đăng lại bài viết của bạn.",
    "notifications.mention": "đã nhắc đến bạn.",
    "notifications.interacted": "đã tương tác với bạn.",

    "profile.title": "Trang cá nhân",
    "profile.followers": "người theo dõi",
    "profile.following": "đang theo dõi",
    "profile.followList.dialogDescription": "Danh sách người theo dõi và đang theo dõi",
    "profile.followList.tabFollowers": "Người theo dõi",
    "profile.followList.tabFollowing": "Đang theo dõi",
    "profile.followList.loading": "Đang tải danh sách...",
    "profile.followList.emptyFollowers": "Chưa có người theo dõi nào.",
    "profile.followList.emptyFollowing": "Bạn chưa theo dõi ai.",
    "profile.followList.error": "Không thể tải danh sách. Vui lòng thử lại.",
    "profile.hover.noBio": "Chưa có giới thiệu",
    "profile.back": "Quay lại",
    "profile.tab.posts": "Bài viết",
    "profile.tab.replies": "Trả lời",
    "profile.tab.reposts": "Bài đăng lại",
    "profile.loadingPage": "Đang tải trang cá nhân...",
    "profile.loadError": "Không thể tải trang cá nhân.",
    "profile.loadErrorTryLater": "Vui lòng thử lại sau.",
    "profile.usernameHint": "Username này đang ở dạng mặc định. Bạn có thể đổi trong phần Chỉnh sửa trang cá nhân.",
    "profile.edit": "Chỉnh sửa trang cá nhân",
    "profile.posts.loading": "Đang tải bài viết...",
    "profile.posts.empty": "Bạn chưa có bài viết nào.",
    "profile.replies.loading": "Đang tải trả lời...",
    "profile.replies.empty": "Bạn chưa có trả lời nào.",
    "profile.replies.targetPost": "Trả lời bài viết: {{content}}",
    "profile.reposts.loading": "Đang tải bài đăng lại...",
    "profile.reposts.empty": "Bạn chưa có bài đăng lại nào.",
    "profile.reposts.repostedAt": "Đăng lại lúc {{time}}",
    "profile.editDialog.title": "Chỉnh sửa trang cá nhân",
    "profile.editDialog.description": "Cập nhật thông tin hồ sơ công khai của bạn.",
    "profile.form.usernameLabel": "Username *",
    "profile.form.usernameHint": "3-32 ký tự, chỉ chữ, số, dấu chấm, gạch dưới.",
    "profile.form.displayNameLabel": "Tên hiển thị",
    "profile.form.displayNamePlaceholder": "Tên hiển thị",
    "profile.form.bioLabel": "Tiểu sử",
    "profile.form.bioPlaceholder": "Giới thiệu ngắn...",
    "profile.form.avatarLabel": "Ảnh đại diện",
    "profile.form.avatarHint": "Upload ảnh JPG, PNG, WEBP tối đa 4MB.",
    "profile.form.avatarUpload": "Tải ảnh đại diện",
    "profile.form.avatarUploading": "Đang tải ảnh...",
    "profile.form.avatarRemove": "Gỡ ảnh",
    "profile.form.linksLabel": "Link kết nối",
    "profile.form.linksAdd": "Thêm link",
    "profile.form.linksEmpty": "Chưa có link nào. Bạn có thể thêm tối đa 10 link.",
    "profile.form.linkLabelPlaceholder": "Nhãn (GitHub, LinkedIn...)",
    "profile.form.linkUrlPlaceholder": "URL",
    "profile.form.linkRemoveAria": "Xóa link",
    "profile.form.cancel": "Hủy",
    "profile.form.save": "Lưu thay đổi",
    "profile.form.saving": "Đang lưu...",
    "profile.errors.updateFailed": "Cập nhật thất bại",
    "profile.errors.invalidImageFile": "Vui lòng chọn file ảnh hợp lệ.",
    "profile.errors.avatarTooLarge": "Ảnh đại diện tối đa 4MB.",
    "profile.errors.avatarUploadFailed": "Upload ảnh thất bại. Vui lòng thử lại.",
    "profile.errors.avatarUploadingInProgress": "Ảnh đại diện đang tải lên, vui lòng chờ hoàn tất.",
    "profile.errors.usernameRequired": "Username là bắt buộc.",
    "profile.errors.usernameInvalid": "Username cần 3-32 ký tự và chỉ gồm chữ, số, dấu chấm hoặc gạch dưới.",
    "profile.errors.tooManyLinks": "Tối đa 10 link kết nối.",
    "profile.errors.avatarInvalid": "Ảnh đại diện không hợp lệ. Vui lòng upload lại.",
    "profile.errors.linkRequireBoth": "Mỗi link cần đủ nhãn và URL.",
    "profile.errors.linkInvalidUrl": "URL không hợp lệ: {{url}}",

    "time.justNow": "Vừa xong",
    "time.minutesAgo": "{{count}} phút trước",
    "time.hoursAgo": "{{count}} giờ trước",
    "time.daysAgo": "{{count}} ngày trước",
  },
  en: {
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.save": "Save",
    "common.edit": "Edit",
    "common.search": "Search",
    "common.post": "Post",
    "common.loading": "Loading...",
    "common.anonymous": "Anonymous",
    "common.user": "User",
    "common.unknownError": "Unknown error",

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
    "post.actions.share": "Share",
    "post.actions.copyLinkPrompt": "Copy this link",

    "composer.title": "Create a new thread",
    "composer.dialogDescription": "Create a new thread or view drafts",
    "composer.drafts": "Drafts",
    "composer.back": "Back",
    "composer.draftRestored": "Draft restored",
    "composer.you": "You",
    "composer.placeholder": "Start a thread...",
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
    "composer.emptyDraftContent": "Empty draft",
    "composer.deleteDraft": "Delete draft",

    "settings.title": "Settings",
    "settings.dialog.description": "Customize your interface and experience",
    "settings.theme": "Theme",
    "settings.theme.description": "Switch between light and dark mode",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.account": "Account",
    "settings.account.description": "Manage your account",
    "settings.language": "Language",
    "settings.language.vi": "Vietnamese",
    "settings.language.en": "English",
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
    "notifications.repost": "reposted your post.",
    "notifications.mention": "mentioned you.",
    "notifications.interacted": "interacted with you.",

    "profile.title": "Profile",
    "profile.followers": "followers",
    "profile.following": "following",
    "profile.followList.dialogDescription": "Followers and following lists",
    "profile.followList.tabFollowers": "Followers",
    "profile.followList.tabFollowing": "Following",
    "profile.followList.loading": "Loading list...",
    "profile.followList.emptyFollowers": "No followers yet.",
    "profile.followList.emptyFollowing": "You are not following anyone yet.",
    "profile.followList.error": "Unable to load list. Please try again.",
    "profile.hover.noBio": "No bio yet",
    "profile.back": "Back",
    "profile.tab.posts": "Posts",
    "profile.tab.replies": "Replies",
    "profile.tab.reposts": "Reposts",
    "profile.loadingPage": "Loading profile...",
    "profile.loadError": "Unable to load profile.",
    "profile.loadErrorTryLater": "Please try again later.",
    "profile.usernameHint": "This username is still in the default format. You can change it in Edit profile.",
    "profile.edit": "Edit profile",
    "profile.posts.loading": "Loading posts...",
    "profile.posts.empty": "You have no posts yet.",
    "profile.replies.loading": "Loading replies...",
    "profile.replies.empty": "You have no replies yet.",
    "profile.replies.targetPost": "Replying to: {{content}}",
    "profile.reposts.loading": "Loading reposts...",
    "profile.reposts.empty": "You have no reposts yet.",
    "profile.reposts.repostedAt": "Reposted {{time}}",
    "profile.editDialog.title": "Edit profile",
    "profile.editDialog.description": "Update your public profile information.",
    "profile.form.usernameLabel": "Username *",
    "profile.form.usernameHint": "3-32 characters, letters, numbers, dots, and underscores only.",
    "profile.form.displayNameLabel": "Display name",
    "profile.form.displayNamePlaceholder": "Display name",
    "profile.form.bioLabel": "Bio",
    "profile.form.bioPlaceholder": "Short introduction...",
    "profile.form.avatarLabel": "Avatar",
    "profile.form.avatarHint": "Upload JPG, PNG, WEBP up to 4MB.",
    "profile.form.avatarUpload": "Upload avatar",
    "profile.form.avatarUploading": "Uploading avatar...",
    "profile.form.avatarRemove": "Remove avatar",
    "profile.form.linksLabel": "Profile links",
    "profile.form.linksAdd": "Add link",
    "profile.form.linksEmpty": "No links yet. You can add up to 10 links.",
    "profile.form.linkLabelPlaceholder": "Label (GitHub, LinkedIn...)",
    "profile.form.linkUrlPlaceholder": "URL",
    "profile.form.linkRemoveAria": "Remove link",
    "profile.form.cancel": "Cancel",
    "profile.form.save": "Save changes",
    "profile.form.saving": "Saving...",
    "profile.errors.updateFailed": "Profile update failed",
    "profile.errors.invalidImageFile": "Please select a valid image file.",
    "profile.errors.avatarTooLarge": "Avatar must be up to 4MB.",
    "profile.errors.avatarUploadFailed": "Avatar upload failed. Please try again.",
    "profile.errors.avatarUploadingInProgress": "Avatar is uploading, please wait until it finishes.",
    "profile.errors.usernameRequired": "Username is required.",
    "profile.errors.usernameInvalid": "Username must be 3-32 chars and only contain letters, numbers, dots, or underscores.",
    "profile.errors.tooManyLinks": "You can add up to 10 links.",
    "profile.errors.avatarInvalid": "Invalid avatar URL. Please upload again.",
    "profile.errors.linkRequireBoth": "Each link must include both a label and URL.",
    "profile.errors.linkInvalidUrl": "Invalid URL: {{url}}",

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
