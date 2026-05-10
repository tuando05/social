import express from "express";
import { asyncHandler } from "../middleware/async-handler";
import { getAuthUserId, requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { getPagination } from "../utils/pagination";
import { notificationIdParamSchema } from "../validators/notification.validator";
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notification.service";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Notifications']
    // #swagger.summary = 'List notifications'
    const userId = getAuthUserId(req);
    const { cursor, limit } = getPagination({
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    const data = await listNotifications(userId, cursor, limit);
    res.json(data);
  })
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Notifications']
    // #swagger.summary = 'Mark all notifications as read'
    const userId = getAuthUserId(req);
    const data = await markAllNotificationsAsRead(userId);
    res.json(data);
  })
);

router.patch(
  "/:notificationId/read",
  validate(notificationIdParamSchema),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Notifications']
    // #swagger.summary = 'Mark one notification as read'
    const userId = getAuthUserId(req);
    const notificationId = String(req.params.notificationId);
    const data = await markNotificationAsRead(userId, notificationId);
    res.json(data);
  })
);

export default router;
