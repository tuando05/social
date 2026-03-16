import express from "express";
import { asyncHandler } from "../middleware/async-handler";
import { getAuthUserId, requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { getPagination } from "../utils/pagination";
import {
  commentIdParamSchema,
  createCommentSchema,
  postCommentsParamSchema,
} from "../validators/comment.validator";
import {
  createComment,
  deleteComment,
  getCommentsByPost,
  likeComment,
  unlikeComment,
} from "../services/comment.service";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/post/:postId",
  validate(postCommentsParamSchema),
  asyncHandler(async (req, res) => {
    const { limit } = getPagination({ limit: req.query.limit as string | undefined });
    const postId = String(req.params.postId);
    const data = await getCommentsByPost(postId, limit);
    res.json(data);
  })
);

router.post(
  "/post/:postId",
  validate(createCommentSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const postId = String(req.params.postId);
    const data = await createComment(userId, postId, req.body);
    res.status(201).json(data);
  })
);

router.delete(
  "/:commentId",
  validate(commentIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const commentId = String(req.params.commentId);
    const data = await deleteComment(userId, commentId);
    res.json(data);
  })
);

router.post(
  "/:commentId/like",
  validate(commentIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const commentId = String(req.params.commentId);
    const data = await likeComment(userId, commentId);
    res.json(data);
  })
);

router.delete(
  "/:commentId/like",
  validate(commentIdParamSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const commentId = String(req.params.commentId);
    const data = await unlikeComment(userId, commentId);
    res.json(data);
  })
);

export default router;
