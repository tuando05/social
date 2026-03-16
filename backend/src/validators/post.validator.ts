import { z } from "zod";

export const createPostSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(2000),
    imageUrls: z.array(z.string().url()).max(6).optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

export const updatePostSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(2000).optional(),
    imageUrls: z.array(z.string().url()).max(6).optional(),
  }),
  params: z.object({
    postId: z.string().min(1),
  }),
  query: z.any().optional(),
});

export const postIdParamSchema = z.object({
  params: z.object({
    postId: z.string().min(1),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const userPostParamSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});
