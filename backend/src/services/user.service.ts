import { prisma } from "../lib/prisma";
import { pusherServer } from "../lib/pusher";
import { ApiError } from "../middleware/error.middleware";
import { isPrismaUniqueError } from "../utils/prisma-error";

export const getMe = async (userId: string) => {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  });

  if (!me) {
    throw new ApiError(404, "User not found");
  }

  return me;
};

export const getUserProfileByUsername = async (username: string, viewerId: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isFollowing =
    (await prisma.follow.count({
      where: {
        followerId: viewerId,
        followingId: user.id,
      },
    })) > 0;

  return {
    ...user,
    isFollowing,
  };
};

export const updateMyProfile = async (
  userId: string,
  data: {
    username?: string;
    displayName?: string;
    bio?: string;
    imageUrl?: string;
  }
) => {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data,
    });
  } catch (error) {
    throw new ApiError(400, "Unable to update profile", error);
  }
};

export const followUser = async (followerId: string, followingId: string) => {
  if (followerId === followingId) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  try {
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return { success: true, alreadyFollowing: true };
    }

    throw error;
  }

  await prisma.notification.create({
    data: {
      recipientId: followingId,
      actorId: followerId,
      type: "FOLLOW",
    },
  });

  await pusherServer.trigger(`private-user-${followingId}`, "follow:new", {
    followerId,
  });

  return { success: true };
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  });

  return { success: true };
};

export const getFollowers = async (userId: string, limit: number) => {
  return prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

export const getFollowing = async (userId: string, limit: number) => {
  return prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};
