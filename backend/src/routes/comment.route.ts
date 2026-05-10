import express from "express";
import { asyncHandler } from "../middleware/async-handler";
import { getAuthUserId, requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { getPagination } from "../utils/pagination";
import {
  commentIdParamSchema,
  createCommentSchema,
  postCommentsParamSchema,
  userCommentsParamSchema,
} from "../validators/comment.validator";
import {
  createComment,
  deleteComment,
  getCommentsByPost,
  getCommentsByUser,
  likeComment,
  unlikeComment,
} from "../services/comment.service";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/post/:postId",
  validate(postCommentsParamSchema),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Comments']
    // #swagger.summary = 'Get comments of a post'
    const userId = getAuthUserId(req);
    const { limit } = getPagination({ limit: req.query.limit as string | undefined });
    const postId = String(req.params.postId);
    const data = await getCommentsByPost(postId, limit, userId);
    res.json(data);
  })
);

router.get(
  "/user/:userId",
  validate(userCommentsParamSchema),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Comments']
    // #swagger.summary = 'Get comments by user'
    const { cursor, limit } = getPagination({
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit as string | undefined,
    });
    const userId = String(req.params.userId);
    const data = await getCommentsByUser(userId, cursor, limit);
    res.json(data);
  })
);

router.post(
  "/post/:postId",
  validate(createCommentSchema),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Comments']
    // #swagger.summary = 'Create comment'
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
    // #swagger.tags = ['Comments']
    // #swagger.summary = 'Delete comment'
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
    // #swagger.tags = ['Comments']
    // #swagger.summary = 'Like comment'
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
    // #swagger.tags = ['Comments']
    // #swagger.summary = 'Unlike comment'
    const userId = getAuthUserId(req);
    const commentId = String(req.params.commentId);
    const data = await unlikeComment(userId, commentId);
    res.json(data);
  })
);

export default router;
