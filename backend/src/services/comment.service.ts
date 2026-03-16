import { prisma } from "../lib/prisma";
import { pusherServer } from "../lib/pusher";
import { ApiError } from "../middleware/error.middleware";
import { isPrismaUniqueError } from "../utils/prisma-error";

export const getCommentsByPost = async (postId: string, limit: number) => {
  return prisma.comment.findMany({
    where: { postId },
    include: {
      author: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

export const createComment = async (
  userId: string,
  postId: string,
  payload: { content: string; parentId?: string }
) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = await prisma.$transaction(async (tx: any) => {
    const created = await tx.comment.create({
      data: {
        postId,
        authorId: userId,
        content: payload.content,
        parentId: payload.parentId,
      },
      include: {
        author: true,
      },
    });

    await tx.post.update({
      where: { id: postId },
      data: {
        commentCount: { increment: 1 },
      },
    });

    if (post.authorId !== userId) {
      await tx.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: "COMMENT",
          postId,
          commentId: created.id,
        },
      });
    }

    return created;
  });

  await pusherServer.trigger(`private-user-${post.authorId}`, "post:commented", {
    postId,
    commentId: comment.id,
    userId,
  });

  return comment;
};

export const deleteComment = async (userId: string, commentId: string) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.authorId !== userId) {
    throw new ApiError(403, "Forbidden");
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.comment.delete({ where: { id: commentId } });
    await tx.post.update({
      where: { id: comment.postId },
      data: {
        commentCount: { decrement: 1 },
      },
    });
  });

  return { success: true };
};

export const likeComment = async (userId: string, commentId: string) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  let createdLike = false;

  await prisma.$transaction(async (tx: any) => {
    try {
      await tx.like.create({
        data: {
          userId,
          commentId,
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

    await tx.comment.update({
      where: { id: commentId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    if (comment.authorId !== userId) {
      await tx.notification.create({
        data: {
          recipientId: comment.authorId,
          actorId: userId,
          type: "LIKE_COMMENT",
          commentId,
          postId: comment.postId,
        },
      });
    }
  });

  if (createdLike) {
    await pusherServer.trigger(`private-user-${comment.authorId}`, "comment:liked", {
      commentId,
      userId,
    });
  }

  return { success: true };
};

export const unlikeComment = async (userId: string, commentId: string) => {
  await prisma.$transaction(async (tx: any) => {
    const deleted = await tx.like.deleteMany({
      where: {
        userId,
        commentId,
      },
    });

    if (deleted.count === 0) {
      return;
    }

    await tx.comment.update({
      where: { id: commentId },
      data: {
        likeCount: { decrement: 1 },
      },
    });
  });

  return { success: true };
};
