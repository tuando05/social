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
import { openApiDocument } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export const app = express();

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

// Routes
app.use("/api/uploadthing", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/docs/json", (_req: Request, res: Response) => {
  res.json(openApiDocument);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use(notFoundHandler);
app.use(errorHandler);
