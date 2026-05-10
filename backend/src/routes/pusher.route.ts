import express from "express";
import { requireAuth, getAuthUserId } from "../middleware/auth.middleware";
import { pusherServer } from "../lib/pusher";
import { asyncHandler } from "../middleware/async-handler";

const router = express.Router();

router.use(requireAuth);

router.post(
  "/auth",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['System']
    // #swagger.summary = 'Pusher Authentication Endpoint'
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;
    const userId = getAuthUserId(req);

    console.log(`[PusherAuth] User: ${userId}, Socket: ${socketId}, Channel: ${channel}`);

    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
      console.error("[PusherAuth] Critical: Pusher environment variables are missing!");
      res.status(500).send("Pusher configuration missing");
      return;
    }

    if (!socketId || !channel) {
      res.status(400).send("Missing socket_id or channel_name");
      return;
    }

    // If it's a private user channel, verify the user ID
    if (channel.startsWith("private-user-")) {
      const channelUserId = channel.split("private-user-")[1];
      if (channelUserId !== userId) {
        console.warn(`[PusherAuth] Forbidden: User ${userId} tried to access ${channel}`);
        res.status(403).send("Forbidden");
        return;
      }
    }

    try {
      // Use authorizeChannel - the explicit method for private/presence channels in Pusher Node SDK 5.x
      const authResponse = pusherServer.authorizeChannel(socketId, channel);
      res.json(authResponse);
    } catch (error) {
      console.error("[PusherAuth] Authorization failed:", error);
      res.status(500).send("Internal Server Error");
    }
  })
);

export default router;
