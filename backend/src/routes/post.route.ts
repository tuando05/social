import express from "express";
import { asyncHandler } from "../middleware/async-handler";
import { getAuthUserId, requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { getPagination } from "../utils/pagination";
import {
  createPostSchema,
  postIdParamSchema,
  updatePostSchema,
  userPostParamSchema,
} from "../validators/post.validator";
import {
  createPost,
  deletePost,
  type FeedFilter,
  getFeed,
  getPostsByUser,
  getRepostsByUser,
  likePost,
  repostPost,
  unrepostPost,
  unlikePost,
  updatePost,
} from "../services/post.service";

const router = express.Router();

router.use(requireAuth);

router.post(
  "/",
  validate(createPostSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const data = await createPost(userId, req.body);
    res.status(201).json(data);
  })
);

router.get(
  "/feed",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const feedFilter: FeedFilter =
      typeof req.query.filter === "string" && req.query.filter.toLowerCase() === "following"
        ? "following"
        : "foryou";
    const { cursor, limit } = getPagination({
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit as string | undefined,
    });
    const data = await getFeed(userId, cursor, limit, feedFilter);
    res.json(data);
  })
);

router.get(
  "/user/:userId",
  validate(userPostParamSchema),
  asyncHandler(async (req, res) => {
    const viewerUserId = getAuthUserId(req);
    const { cursor, limit } = getPagination({
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit as string | undefined,
    });
    const targetUserId = String(req.params.userId);
    const data = await getPostsByUser(targetUserId, viewerUserId, cursor, limit);
    res.json(data);
  })
);

router.get(
  "/user/:userId/reposts",
  validate(userPostParamSchema),
  asyncHandler(async (req, res) => {
    const viewerUserId = getAuthUserId(req);
    const { cursor, limit } = getPagination({
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit as string | undefined,
    });
    const targetUserId = String(req.params.userId);
    const data = await getRepostsByUser(targetUserId, viewerUserId, cursor, limit);
    res.json(data);
  })
);

router.patch(
  "/:postId",
  validate(updatePostSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const postId = String(req.params.postId);
    const data = await updatePost(userId, postId, req.body);
    res.json(data);
  })
);

router.delete(
  "/:postId",
  validate(postIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const postId = String(req.params.postId);
    const data = await deletePost(userId, postId);
    res.json(data);
  })
);

router.post(
  "/:postId/like",
  validate(postIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const postId = String(req.params.postId);
    const data = await likePost(userId, postId);
    res.json(data);
  })
);

router.delete(
  "/:postId/like",
  validate(postIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const postId = String(req.params.postId);
    const data = await unlikePost(userId, postId);
    res.json(data);
  })
);

router.post(
  "/:postId/repost",
  validate(postIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const postId = String(req.params.postId);
    const data = await repostPost(userId, postId);
    res.json(data);
  })
);

router.delete(
  "/:postId/repost",
  validate(postIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const postId = String(req.params.postId);
    const data = await unrepostPost(userId, postId);
    res.json(data);
  })
);

export default router;
