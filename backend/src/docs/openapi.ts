export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Paper Backend API",
    version: "1.0.0",
    description: "Express + Prisma + Clerk backend for paper app starter.",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local",
    },
  ],
  tags: [
    { name: "System" },
    { name: "Users" },
    { name: "Posts" },
    { name: "Comments" },
    { name: "Search" },
    { name: "Notifications" },
    { name: "Webhooks" },
    { name: "Upload" },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          details: {},
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        security: [],
        responses: {
          200: {
            description: "Service status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },

    "/api/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current user profile",
        responses: {
          200: { description: "Profile" },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update current user profile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  displayName: { type: "string" },
                  bio: { type: "string" },
                  imageUrl: { type: "string" },
                  avatar: { type: "string" },
                  links: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        url: { type: "string" },
                        sortOrder: { type: "integer" },
                      },
                      required: ["label", "url"],
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/users/u/{username}": {
      get: {
        tags: ["Users"],
        summary: "Get public profile by username",
        parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User profile" }, 404: { description: "Not found" } },
      },
    },
    "/api/users/{userId}/follow": {
      post: {
        tags: ["Users"],
        summary: "Follow user",
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Followed" } },
      },
      delete: {
        tags: ["Users"],
        summary: "Unfollow user",
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Unfollowed" } },
      },
    },
    "/api/users/{userId}/followers": {
      get: {
        tags: ["Users"],
        summary: "Get followers",
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Followers list" } },
      },
    },
    "/api/users/{userId}/following": {
      get: {
        tags: ["Users"],
        summary: "Get following",
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Following list" } },
      },
    },

    "/api/posts": {
      post: {
        tags: ["Posts"],
        summary: "Create post",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string" },
                  imageUrls: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" }, 400: { description: "Validation error" } },
      },
    },
    "/api/posts/feed": {
      get: {
        tags: ["Posts"],
        summary: "Get personalized feed",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Feed page" } },
      },
    },
    "/api/posts/user/{userId}": {
      get: {
        tags: ["Posts"],
        summary: "Get posts by user",
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Posts page" } },
      },
    },
    "/api/posts/user/{userId}/reposts": {
      get: {
        tags: ["Posts"],
        summary: "Get reposts by user",
        description: "Returns posts reposted by the user, newest first.",
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Reposts page" } },
      },
    },
    "/api/posts/{postId}": {
      patch: {
        tags: ["Posts"],
        summary: "Update post",
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  imageUrls: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Updated" }, 403: { description: "Forbidden" }, 404: { description: "Not found" } },
      },
      delete: {
        tags: ["Posts"],
        summary: "Delete post",
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" }, 403: { description: "Forbidden" }, 404: { description: "Not found" } },
      },
    },
    "/api/posts/{postId}/like": {
      post: {
        tags: ["Posts"],
        summary: "Like post",
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Liked" }, 404: { description: "Not found" } },
      },
      delete: {
        tags: ["Posts"],
        summary: "Unlike post",
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Unliked" } },
      },
    },
    "/api/posts/{postId}/repost": {
      post: {
        tags: ["Posts"],
        summary: "Repost post",
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Reposted" }, 404: { description: "Not found" } },
      },
      delete: {
        tags: ["Posts"],
        summary: "Undo repost",
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Repost removed" } },
      },
    },

    "/api/comments/post/{postId}": {
      get: {
        tags: ["Comments"],
        summary: "Get comments of a post",
        parameters: [
          { name: "postId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Comments list" } },
      },
      post: {
        tags: ["Comments"],
        summary: "Create comment",
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string" },
                  parentId: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" }, 404: { description: "Post not found" } },
      },
    },
    "/api/comments/user/{userId}": {
      get: {
        tags: ["Comments"],
        summary: "Get comments by user",
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Comments page" } },
      },
    },
    "/api/comments/{commentId}": {
      delete: {
        tags: ["Comments"],
        summary: "Delete comment",
        parameters: [{ name: "commentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" }, 403: { description: "Forbidden" }, 404: { description: "Not found" } },
      },
    },
    "/api/comments/{commentId}/like": {
      post: {
        tags: ["Comments"],
        summary: "Like comment",
        parameters: [{ name: "commentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Liked" }, 404: { description: "Not found" } },
      },
      delete: {
        tags: ["Comments"],
        summary: "Unlike comment",
        parameters: [{ name: "commentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Unliked" } },
      },
    },

    "/api/search": {
      get: {
        tags: ["Search"],
        summary: "Search users and posts",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["users", "posts", "all"] } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Search results" } },
      },
    },

    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: { description: "Notifications page" } },
      },
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        responses: { 200: { description: "Updated count" } },
      },
    },
    "/api/notifications/{notificationId}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark one notification as read",
        parameters: [{ name: "notificationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Updated" }, 403: { description: "Forbidden" }, 404: { description: "Not found" } },
      },
    },

    "/api/webhooks/clerk": {
      post: {
        tags: ["Webhooks"],
        summary: "Clerk webhook endpoint",
        description: "Consumes Clerk user events with Svix verification headers.",
        security: [],
        responses: {
          200: { description: "Processed" },
          400: { description: "Invalid webhook signature" },
        },
      },
    },

    "/api/uploadthing": {
      post: {
        tags: ["Upload"],
        summary: "Uploadthing route handler",
        description: "Uploadthing internally handles sub-routes under this base path.",
        responses: { 200: { description: "Handled by Uploadthing" } },
      },
    },
  },
} as const;
