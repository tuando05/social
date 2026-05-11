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
    /* #swagger.tags = ['Users']
       #swagger.summary = 'Get current user profile'
       #swagger.responses[200] = {
            description: 'User profile retrieved successfully',
            schema: {
                id: "user_123",
                username: "johndoe",
                displayName: "John Doe",
                bio: "Software Engineer",
                avatar: "https://example.com/avatar.png",
                links: [
                    { label: "Twitter", url: "https://twitter.com/johndoe", sortOrder: 0 }
                ],
                _count: { followers: 10, following: 20, posts: 5 }
            }
       }
    */
    const userId = getAuthUserId(req);
    const data = await getMe(userId);
    res.json(data);
  })
);

router.patch(
  "/me",
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    /* #swagger.tags = ['Users']
       #swagger.summary = 'Update current user profile'
       #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            username: { type: "string" },
                            displayName: { type: "string" },
                            bio: { type: "string" },
                            avatar: { type: "string" },
                            links: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        label: { type: "string" },
                                        url: { type: "string" },
                                        sortOrder: { type: "integer" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        #swagger.responses[200] = {
            description: 'Profile updated successfully',
            schema: {
                id: "user_123",
                username: "johndoe",
                displayName: "John Doe",
                bio: "Software Engineer",
                avatar: "https://example.com/avatar.png",
                links: [
                    { label: "Twitter", url: "https://twitter.com/johndoe", sortOrder: 0 }
                ],
                _count: { followers: 10, following: 20, posts: 5 }
            }
        }
    */
    const userId = getAuthUserId(req);
    const data = await updateMyProfile(userId, req.body);
    res.json(data);
  })
);

router.get(
  "/u/:username",
  validate(usernameParamSchema),
  asyncHandler(async (req, res) => {
    /* #swagger.tags = ['Users']
       #swagger.summary = 'Get public profile by username'
       #swagger.responses[200] = {
            description: 'Public profile retrieved successfully',
            schema: {
                id: "user_123",
                username: "johndoe",
                displayName: "John Doe",
                bio: "Software Engineer",
                avatar: "https://example.com/avatar.png",
                links: [
                    { label: "Twitter", url: "https://twitter.com/johndoe", sortOrder: 0 }
                ],
                isFollowing: false,
                _count: { followers: 10, following: 20, posts: 5 }
            }
       }
    */
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
    // #swagger.tags = ['Users']
    // #swagger.summary = 'Follow user'
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
    // #swagger.tags = ['Users']
    // #swagger.summary = 'Unfollow user'
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
    // #swagger.tags = ['Users']
    // #swagger.summary = 'Get followers'
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
    // #swagger.tags = ['Users']
    // #swagger.summary = 'Get following'
    const { limit } = getPagination({ limit: req.query.limit as string | undefined });
    const targetUserId = String(req.params.userId);
    const data = await getFollowing(targetUserId, limit);
    res.json(data);
  })
);

export default router;
