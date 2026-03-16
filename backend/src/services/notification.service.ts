import { prisma } from "../lib/prisma";
import { ApiError } from "../middleware/error.middleware";

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
