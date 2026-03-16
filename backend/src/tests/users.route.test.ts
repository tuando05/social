import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import * as userService from "../services/user.service";

describe("Users routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns profile for authenticated user", async () => {
    vi.spyOn(userService, "getMe").mockResolvedValueOnce({
      id: "user_123",
      email: "user@example.com",
      username: "demo",
      _count: { followers: 0, following: 0, posts: 0 },
    } as any);

    const response = await request(app)
      .get("/api/users/me")
      .set("x-test-user-id", "user_123");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe("user_123");
  });

  it("returns 401 without auth", async () => {
    const response = await request(app).get("/api/users/me");

    expect(response.status).toBe(401);
  });
});
