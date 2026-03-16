import { prisma } from "../lib/prisma";

export const searchUsers = async (q: string, limit: number) => {
  return prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};

export const searchPosts = async (q: string, limit: number) => {
  return prisma.post.findMany({
    where: {
      content: { contains: q, mode: "insensitive" },
    },
    include: { author: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};
