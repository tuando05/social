import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import Pusher from "pusher-js";
import { createPusherClient } from "../lib/pusher";

interface PusherContextType {
  pusher: Pusher | null;
}

const PusherContext = createContext<PusherContextType>({ pusher: null });

export const usePusherContext = () => useContext(PusherContext);

export const PusherProvider = ({ children }: { children: ReactNode }) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [pusher, setPusher] = useState<Pusher | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      if (pusher) {
        console.log("🔌 Disconnecting Pusher (User logged out)");
        pusher.disconnect();
        setPusher(null);
      }
      return;
    }

    // Only create one instance
    if (!pusher) {
      console.log("🌐 Initializing single Pusher connection...");
      const client = createPusherClient(getToken);
      if (client) {
        client.connection.bind('state_change', (states: any) => {
          console.log(`📡 [Pusher] Connection state: ${states.current}`);
        });

        client.connection.bind('error', (err: any) => {
          console.error('❌ [Pusher] Connection error:', err);
          if (err.data) {
            console.error('❌ [Pusher] Error details:', err.data);
          }
        });

        setPusher(client);
      }
    }

    // No cleanup here to keep the connection alive across the app
    // We only disconnect when the user logs out (handled by the if above)
  }, [isLoaded, isSignedIn, user?.id, getToken]);

  return (
    <PusherContext.Provider value={{ pusher }}>
      {children}
    </PusherContext.Provider>
  );
};
