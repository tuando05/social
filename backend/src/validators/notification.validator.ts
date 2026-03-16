import { z } from "zod";

export const notificationIdParamSchema = z.object({
  params: z.object({
    notificationId: z.string().min(1),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});
