import express from "express";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { searchPosts, searchUsers } from "../services/search.service";
import { searchQuerySchema } from "../validators/search.validator";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  validate(searchQuerySchema),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all");
    const limit = Number(req.query.limit || 10);

    if (type === "users") {
      return res.json({ users: await searchUsers(q, limit) });
    }

    if (type === "posts") {
      return res.json({ posts: await searchPosts(q, limit) });
    }

    const [users, posts] = await Promise.all([searchUsers(q, limit), searchPosts(q, limit)]);

    return res.json({ users, posts });
  })
);

export default router;
