import { prisma } from "../lib/prisma";
import { pusherServer } from "../lib/pusher";
import { ApiError } from "../middleware/error.middleware";
import { isPrismaUniqueError } from "../utils/prisma-error";

export type FeedFilter = "foryou" | "following";

export const createPost = async (
  authorId: string,
  payload: { content: string; imageUrls?: string[] }
) => {
  const post = await prisma.post.create({
    data: {
      authorId,
      content: payload.content,
      imageUrls: payload.imageUrls ?? [],
    },
    include: {
      author: true,
    },
  });

  await pusherServer.trigger("public-feed", "post:new", {
    postId: post.id,
    authorId,
  });

  return post;
};

export const getFeed = async (
  userId: string,
  cursor: string | undefined,
  limit: number,
  filter: FeedFilter = "foryou"
) => {
  const following =
    filter === "following"
      ? await prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        })
      : [];

  const authorIds =
    filter === "following"
      ? following.map((row: { followingId: string }) => row.followingId)
      : undefined;

  const posts = await prisma.post.findMany({
    where: authorIds
      ? {
          authorId: {
            in: authorIds,
          },
        }
      : {}, // No filter = all posts
    include: {
      author: true,
      likes: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
      reposts: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = posts.length > limit;
  const pagedPosts = hasMore ? posts.slice(0, limit) : posts;
  const data = pagedPosts.map((post) => {
    const { likes, reposts, ...rest } = post;

    return {
      ...rest,
      isLikedByMe: likes.length > 0,
      isRepostedByMe: reposts.length > 0,
    };
  });

  return {
    data,
    nextCursor: hasMore ? pagedPosts[pagedPosts.length - 1].id : null,
  };
};

export const getPostsByUser = async (
  targetUserId: string,
  viewerUserId: string,
  cursor: string | undefined,
  limit: number
) => {
  const posts = await prisma.post.findMany({
    where: { authorId: targetUserId },
    include: {
      author: true,
      likes: {
        where: {
          userId: viewerUserId,
        },
        select: {
          id: true,
        },
      },
      reposts: {
        where: {
          userId: viewerUserId,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = posts.length > limit;
  const pagedPosts = hasMore ? posts.slice(0, limit) : posts;
  const data = pagedPosts.map((post) => {
    const { likes, reposts, ...rest } = post;

    return {
      ...rest,
      isLikedByMe: likes.length > 0,
      isRepostedByMe: reposts.length > 0,
    };
  });

  return {
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
  };
};

export const getRepostsByUser = async (
  targetUserId: string,
  viewerUserId: string,
  cursor: string | undefined,
  limit: number
) => {
  const reposts = await prisma.repost.findMany({
    where: {
      userId: targetUserId,
    },
    include: {
      post: {
        include: {
          author: true,
          likes: {
            where: {
              userId: viewerUserId,
            },
            select: {
              id: true,
            },
          },
          reposts: {
            where: {
              userId: viewerUserId,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = reposts.length > limit;
  const sliced = hasMore ? reposts.slice(0, limit) : reposts;
  const data = sliced.map((entry) => {
    const { likes, reposts: postReposts, ...rest } = entry.post;

    return {
      ...rest,
      isLikedByMe: likes.length > 0,
      isRepostedByMe: postReposts.length > 0,
      repostedAt: entry.createdAt,
      repostId: entry.id,
    };
  });

  return {
    data,
    nextCursor: hasMore ? sliced[sliced.length - 1].id : null,
  };
};

export const repostPost = async (userId: string, postId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  try {
    const repost = await prisma.repost.create({
      data: {
        userId,
        postId,
      },
    });

    return {
      success: true,
      repost,
    };
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return {
        success: true,
        alreadyReposted: true,
      };
    }

    throw error;
  }
};

export const unrepostPost = async (userId: string, postId: string) => {
  await prisma.repost.deleteMany({
    where: {
      userId,
      postId,
    },
  });

  return { success: true };
};

export const updatePost = async (
  userId: string,
  postId: string,
  payload: { content?: string; imageUrls?: string[] }
) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (post.authorId !== userId) {
    throw new ApiError(403, "Forbidden");
  }

  return prisma.post.update({
    where: { id: postId },
    data: payload,
  });
};

export const deletePost = async (userId: string, postId: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (post.authorId !== userId) {
    throw new ApiError(403, "Forbidden");
  }

  await prisma.post.delete({ where: { id: postId } });

  return { success: true };
};

export const likePost = async (userId: string, postId: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  let createdLike = false;

  await prisma.$transaction(async (tx: any) => {
    try {
      await tx.like.create({
        data: {
          userId,
          postId,
        },
      });
      createdLike = true;
    } catch (error) {
      if (!isPrismaUniqueError(error)) {
        throw error;
      }
    }

    if (!createdLike) {
      return;
    }

    await tx.post.update({
      where: { id: postId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    if (post.authorId !== userId) {
      await tx.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: "LIKE_POST",
          postId,
        },
      });
    }
  });

  if (createdLike) {
    await pusherServer.trigger(`private-user-${post.authorId}`, "post:liked", {
      postId,
      userId,
    });
  }

  return { success: true };
};

export const unlikePost = async (userId: string, postId: string) => {
  await prisma.$transaction(async (tx: any) => {
    const deleted = await tx.like.deleteMany({
      where: {
        userId,
        postId,
      },
    });

    if (deleted.count === 0) {
      return;
    }

    await tx.post.update({
      where: { id: postId },
      data: {
        likeCount: { decrement: 1 },
      },
    });
  });

  return { success: true };
};
