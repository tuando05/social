import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_\.]+$/).optional(),
    displayName: z.string().min(1).max(60).optional(),
    bio: z.string().max(300).optional(),
    imageUrl: z.string().url().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const usernameParamSchema = z.object({
  params: z.object({
    username: z.string().min(1),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});
