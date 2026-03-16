import { z } from "zod";

export const searchQuerySchema = z.object({
  query: z.object({
    q: z.string().min(1).max(100),
    type: z.enum(["users", "posts", "all"]).optional().default("all"),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
  body: z.any().optional(),
  params: z.any().optional(),
});
