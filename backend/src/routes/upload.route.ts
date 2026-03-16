import express from "express";
import { createRouteHandler } from "uploadthing/express";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import { uploadRouter } from "../lib/uploadthing";

const router = express.Router();

router.use(ClerkExpressWithAuth() as any);

router.use(
  "/",
  createRouteHandler({
    router: uploadRouter
  })
);

export default router;
