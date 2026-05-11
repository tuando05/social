import { prisma } from "../lib/prisma";
import { pusherServer } from "../lib/pusher";
import { ApiError } from "../middleware/error.middleware";
import { isPrismaUniqueError } from "../utils/prisma-error";
import { createNotification } from "./notification.service";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;

const normalizeUsernameCandidate = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }

  let normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, "_")
    .replace(/[_.]{2,}/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "");

  if (!normalized) {
    return null;
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    normalized = normalized.slice(0, USERNAME_MAX_LENGTH);
  }

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return null;
  }

  return normalized;
};

const withUsernameSuffix = (base: string, suffix: string | number) => {
  const suffixText = `_${suffix}`;

  if (base.length + suffixText.length <= USERNAME_MAX_LENGTH) {
    return `${base}${suffixText}`;
  }

  return `${base.slice(0, USERNAME_MAX_LENGTH - suffixText.length)}${suffixText}`;
};

const buildUsernameCandidates = (
  userId: string,
  usernameHint?: string | null,
  email?: string | null
) => {
  const candidates: string[] = [];

  const addCandidate = (value: string | undefined | null) => {
    const normalized = normalizeUsernameCandidate(value);

    if (!normalized) {
      return;
    }

    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  addCandidate(usernameHint);
  addCandidate(email?.split("@")[0]);

  const compactUserId = userId.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(-10);
  addCandidate(`user_${compactUserId}`);
  addCandidate(`member_${compactUserId}`);

  if (candidates.length === 0) {
    addCandidate(`user_${Date.now().toString().slice(-8)}`);
  }

  return candidates;
};

const isUsernameTaken = async (username: string, ignoreUserId?: string) => {
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  return Boolean(existing && existing.id !== ignoreUserId);
};

export const generateUniqueUsername = async (
  userId: string,
  usernameHint?: string | null,
  email?: string | null,
  ignoreUserId?: string
) => {
  const baseCandidates = buildUsernameCandidates(userId, usernameHint, email);

  for (const base of baseCandidates) {
    if (!(await isUsernameTaken(base, ignoreUserId))) {
      return base;
    }

    for (let suffix = 1; suffix <= 100; suffix++) {
      const candidate = withUsernameSuffix(base, suffix);

      if (!(await isUsernameTaken(candidate, ignoreUserId))) {
        return candidate;
      }
    }
  }

  for (let retry = 0; retry < 100; retry++) {
    const randomCandidate = withUsernameSuffix(
      baseCandidates[0],
      `${Date.now().toString().slice(-4)}${retry}`
    );

    if (!(await isUsernameTaken(randomCandidate, ignoreUserId))) {
      return randomCandidate;
    }
  }

  throw new ApiError(500, "Unable to generate unique username");
};

export const ensureAuthUser = async (
  params: {
    userId: string;
    email?: string | null;
    usernameHint?: string | null;
  }
) => {
  const resolvedEmail = params.email?.trim() || `${params.userId}@clerk.local`;

  const existingUser = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      email: true,
      username: true,
    },
  });

  if (existingUser) {
    const updateData: {
      email?: string;
      username?: string;
    } = {};

    if (existingUser.email !== resolvedEmail) {
      updateData.email = resolvedEmail;
    }

    if (!existingUser.username) {
      updateData.username = await generateUniqueUsername(
        params.userId,
        params.usernameHint,
        resolvedEmail,
        params.userId
      );
    }

    if (Object.keys(updateData).length === 0) {
      return existingUser;
    }

    try {
      return await prisma.user.update({
        where: { id: params.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
        },
      });
    } catch (error) {
      if (isPrismaUniqueError(error) && updateData.username) {
        const fallbackUsername = await generateUniqueUsername(
          params.userId,
          withUsernameSuffix(updateData.username, Date.now().toString().slice(-4)),
          resolvedEmail,
          params.userId
        );

        return prisma.user.update({
          where: { id: params.userId },
          data: {
            ...updateData,
            username: fallbackUsername,
          },
          select: {
            id: true,
            email: true,
            username: true,
          },
        });
      }

      throw error;
    }
  }

  const baseUsername = await generateUniqueUsername(
    params.userId,
    params.usernameHint,
    resolvedEmail
  );

  try {
    return await prisma.user.create({
      data: {
        id: params.userId,
        email: resolvedEmail,
        username: baseUsername,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
  } catch (error) {
    if (!isPrismaUniqueError(error)) {
      throw error;
    }

    const fallbackUsername = await generateUniqueUsername(
      params.userId,
      withUsernameSuffix(baseUsername, Date.now().toString().slice(-4)),
      resolvedEmail
    );

    return prisma.user.create({
      data: {
        id: params.userId,
        email: resolvedEmail,
        username: fallbackUsername,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
  }
};

export const getMe = async (userId: string) => {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profileLinks: {
        orderBy: { sortOrder: "asc" },
      },
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

  return {
    ...me,
    avatar: me.imageUrl,
    links: me.profileLinks,
  };
};

export const getUserProfileByUsername = async (username: string, viewerId: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profileLinks: {
        orderBy: { sortOrder: "asc" },
      },
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
    avatar: user.imageUrl,
    links: user.profileLinks,
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
    avatar?: string;
    links?: Array<{
      label: string;
      url: string;
      sortOrder?: number;
    }>;
  }
) => {
  const { links, avatar, ...profileData } = data;
  const userUpdateData = {
    ...profileData,
    ...(avatar !== undefined ? { imageUrl: avatar } : {}),
  };

  try {
    if (!links) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
        include: {
          profileLinks: {
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
        },
      });

      return {
        ...updated,
        avatar: updated.imageUrl,
        links: updated.profileLinks,
      };
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: userUpdateData,
      });

      await tx.profileLink.deleteMany({
        where: { userId },
      });

      if (links.length > 0) {
        await tx.profileLink.createMany({
          data: links.map((link, index) => ({
            userId,
            label: link.label,
            url: link.url,
            sortOrder: link.sortOrder ?? index,
          })),
        });
      }

      return tx.user.findUnique({
        where: { id: userId },
        include: {
          profileLinks: {
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
        },
      });
    });

    if (!updated) {
      throw new ApiError(404, "User not found");
    }

    return {
      ...updated,
      avatar: updated.imageUrl,
      links: updated.profileLinks,
    };
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      throw new ApiError(409, "Username already exists", error);
    }

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

  await createNotification({
    recipientId: followingId,
    actorId: followerId,
    type: "FOLLOW",
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
