import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import * as notificationService from "../services/notification.service";

describe("Notifications routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists notifications", async () => {
    vi.spyOn(notificationService, "listNotifications").mockResolvedValueOnce({
      data: [{ id: "n1", type: "FOLLOW" }],
      nextCursor: null,
    } as any);

    const response = await request(app)
      .get("/api/notifications?limit=10")
      .set("x-test-user-id", "user_1");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
  });

  it("marks all as read", async () => {
    vi.spyOn(notificationService, "markAllNotificationsAsRead").mockResolvedValueOnce({
      success: true,
      updated: 3,
    });

    const response = await request(app)
      .patch("/api/notifications/read-all")
      .set("x-test-user-id", "user_1");

    expect(response.status).toBe(200);
    expect(response.body.updated).toBe(3);
  });
});
