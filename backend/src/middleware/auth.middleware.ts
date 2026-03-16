import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error.middleware";

const clerkRequireAuth = ClerkExpressRequireAuth() as any;

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === "test") {
    const testUserId = req.headers["x-test-user-id"];

    if (typeof testUserId === "string" && testUserId.trim().length > 0) {
      (req as any).auth = { userId: testUserId };
      return next();
    }

    return res.status(401).json({ message: "Unauthorized" });
  }

  return clerkRequireAuth(req as any, res as any, next as any);
};

export const getAuthUserId = (req: Request): string => {
  const authReq = req as any;
  const userId = authReq.auth?.userId as string | undefined;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  return userId;
};
