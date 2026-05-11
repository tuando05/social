import Pusher from "pusher-js";

const PUSHER_KEY = import.meta.env.VITE_PUSHER_APP_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;
const API_URL = import.meta.env.VITE_API_URL;

export const createPusherClient = (getToken: () => Promise<string | null>) => {
  if (!PUSHER_KEY || !PUSHER_CLUSTER) {
    console.warn("Pusher keys are missing. Real-time features will not work.");
    return null;
  }

  // Construct the endpoint to match the backend /api/pusher/auth route
  const authEndpoint = API_URL.endsWith("/") 
    ? `${API_URL}api/pusher/auth` 
    : `${API_URL}/api/pusher/auth`;

  return new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    channelAuthorization: {
      customHandler: async ({ socketId, channelName }: any, callback: any) => {
        try {
          const token = await getToken();
          const response = await fetch(authEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channelName,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Pusher auth failed: ${errorText}`);
          }

          const data = await response.json();
          callback(null, data);
        } catch (error) {
          console.error("[PusherCustomAuth] Error:", error);
          callback(error, null);
        }
      },
    } as any,
  });
};
