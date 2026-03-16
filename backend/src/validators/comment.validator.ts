import { z } from "zod";

export const createCommentSchema = z.object({
  params: z.object({
    postId: z.string().min(1),
  }),
  body: z.object({
    content: z.string().min(1).max(1200),
    parentId: z.string().min(1).optional(),
  }),
  query: z.any().optional(),
});

export const commentIdParamSchema = z.object({
  params: z.object({
    commentId: z.string().min(1),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const postCommentsParamSchema = z.object({
  params: z.object({
    postId: z.string().min(1),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});
