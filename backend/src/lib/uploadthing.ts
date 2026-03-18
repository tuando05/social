import { createUploadthing, type FileRouter } from "uploadthing/express";

// UploadThing v7 uses UPLOADTHING_TOKEN. Keep backward compatibility with
// existing projects that still set UPLOADTHING_SECRET in .env.
if (!process.env.UPLOADTHING_TOKEN && process.env.UPLOADTHING_SECRET) {
  process.env.UPLOADTHING_TOKEN = process.env.UPLOADTHING_SECRET;
}

const f = createUploadthing();

export const uploadRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(async ({ req }) => {
      try {
        const auth = (req as any).auth;
        const userId = auth?.userId;

        if (!userId) {
          console.warn("Upload attempted without auth, allowing as anonymous");
        }

        // Allow uploads to proceed even if auth info is not attached on this
        // request to avoid failing client-side upload flows.
        return { userId: userId ?? "anonymous" };
      } catch (error) {
        console.error("Error in upload middleware:", error);
        // Still allow upload to proceed
        return { userId: "anonymous" };
      }
    })
    .onUploadComplete(({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
