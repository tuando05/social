import { prisma } from "../lib/prisma";
import { pusherServer } from "../lib/pusher";
import { ApiError } from "../middleware/error.middleware";

export const createNotification = async (
  data: {
    recipientId: string;
    actorId: string;
    type: string;
    postId?: string;
    commentId?: string;
  },
  tx?: any
) => {
  const client = tx || prisma;
  const notification = await client.notification.create({
    data: data as any,
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          displayName: true,
          imageUrl: true,
        },
      },
      post: {
        select: { id: true, content: true },
      },
      comment: {
        select: { id: true, content: true, postId: true },
      },
    },
  });

  // Trigger real-time notification event in background (don't await)
  pusherServer.trigger(`private-user-${data.recipientId}`, "notification:new", notification)
    .catch(err => console.error("[Pusher] Trigger error:", err));

  return notification;
};

export const listNotifications = async (
  userId: string,
  cursor: string | undefined,
  limit: number
) => {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          displayName: true,
          imageUrl: true,
        },
      },
      post: {
        select: { id: true, content: true },
      },
      comment: {
        select: { id: true, content: true },
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

  const hasMore = notifications.length > limit;
  const data = hasMore ? notifications.slice(0, limit) : notifications;

  return {
    data,
    nextCursor: hasMore && data.length > 0 ? data[data.length - 1].id : null,
  };
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, recipientId: true },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (notification.recipientId !== userId) {
    throw new ApiError(403, "Forbidden");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      recipientId: userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return {
    success: true,
    updated: result.count,
  };
};
