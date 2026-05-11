import "dotenv/config";
import express from "express";
import cors from "cors";
import { Request, Response } from "express";
const swaggerUi = require("swagger-ui-express");
import webhookRoutes from "./routes/webhook.route";
import uploadRoutes from "./routes/upload.route";
import userRoutes from "./routes/user.route";
import postRoutes from "./routes/post.route";
import commentRoutes from "./routes/comment.route";
import searchRoutes from "./routes/search.route";
import notificationRoutes from "./routes/notification.route";
import pusherRoutes from "./routes/pusher.route";
import swaggerOutput from "./docs/swagger-output.json";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export const app = express();

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true,
    credentials: true,
  })
);

// Webhooks should receive raw body, so we put it before express.json()
app.use("/api/webhooks", webhookRoutes);

// General middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/uploadthing", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/pusher", pusherRoutes);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/docs/json", (_req: Request, res: Response) => {
  res.json(swaggerOutput);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerOutput));

app.use(notFoundHandler);
app.use(errorHandler);
