import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import * as postService from "../services/post.service";

describe("Posts routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates post for authenticated user", async () => {
    vi.spyOn(postService, "createPost").mockResolvedValueOnce({
      id: "post_1",
      content: "hello",
      authorId: "user_1",
      imageUrls: [],
    } as any);

    const response = await request(app)
      .post("/api/posts")
      .set("x-test-user-id", "user_1")
      .send({ content: "hello" });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe("post_1");
  });

  it("returns feed page for authenticated user", async () => {
    vi.spyOn(postService, "getFeed").mockResolvedValueOnce({
      data: [{ id: "post_1" }],
      nextCursor: null,
    } as any);

    const response = await request(app)
      .get("/api/posts/feed?limit=10")
      .set("x-test-user-id", "user_1");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
