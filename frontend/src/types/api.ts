export interface User {
  id: string
  username: string
  displayName: string
  imageUrl: string | null
  bio: string | null
  followerCount: number
  followingCount: number
  isVerified: boolean
  createdAt: string
}

export interface Post {
  id: string
  content: string
  imageUrls: string[]
  authorId: string
  author: User
  createdAt: string
  updatedAt: string
  likeCount: number
  commentCount: number
}

export interface Comment {
  id: string
  content: string
  authorId: string
  author: User
  postId: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  likeCount: number
}

export interface Notification {
  id: string
  recipientId: string
  actorId: string
  type: string
  postId: string | null
  commentId: string | null
  isRead: boolean
  createdAt: string
  actor: User
  post?: Post
  comment?: Comment
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
}
