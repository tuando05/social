import express from "express";
import { asyncHandler } from "../middleware/async-handler";
import { getAuthUserId, requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { getPagination } from "../utils/pagination";
import {
  updateProfileSchema,
  userIdParamSchema,
  usernameParamSchema,
} from "../validators/user.validator";
import {
  followUser,
  getFollowers,
  getFollowing,
  getMe,
  getUserProfileByUsername,
  unfollowUser,
  updateMyProfile,
} from "../services/user.service";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const data = await getMe(userId);
    res.json(data);
  })
);

router.patch(
  "/me",
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const data = await updateMyProfile(userId, req.body);
    res.json(data);
  })
);

router.get(
  "/u/:username",
  validate(usernameParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const username = String(req.params.username);
    const data = await getUserProfileByUsername(username, userId);
    res.json(data);
  })
);

router.post(
  "/:userId/follow",
  validate(userIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const targetUserId = String(req.params.userId);
    const data = await followUser(userId, targetUserId);
    res.json(data);
  })
);

router.delete(
  "/:userId/follow",
  validate(userIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const targetUserId = String(req.params.userId);
    const data = await unfollowUser(userId, targetUserId);
    res.json(data);
  })
);

router.get(
  "/:userId/followers",
  validate(userIdParamSchema),
  asyncHandler(async (req, res) => {
    const { limit } = getPagination({ limit: req.query.limit as string | undefined });
    const targetUserId = String(req.params.userId);
    const data = await getFollowers(targetUserId, limit);
    res.json(data);
  })
);

router.get(
  "/:userId/following",
  validate(userIdParamSchema),
  asyncHandler(async (req, res) => {
    const { limit } = getPagination({ limit: req.query.limit as string | undefined });
    const targetUserId = String(req.params.userId);
    const data = await getFollowing(targetUserId, limit);
    res.json(data);
  })
);

export default router;
