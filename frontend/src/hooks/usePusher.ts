import { useEffect, useRef } from "react";
import { usePusherContext } from "../contexts/PusherContext";

export function usePusher() {
  const { pusher } = usePusherContext();
  return pusher;
}

/**
 * Hook to subscribe to a specific pusher channel and bind an event
 */
export function usePusherEvent<T>(
  channelName: string | undefined,
  eventName: string,
  callback: (data: T) => void
) {
  const pusher = usePusher();
  const callbackRef = useRef(callback);

  // Update ref when callback changes without re-triggering effect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!pusher || !channelName) return;

    const handler = (data: T) => {
      callbackRef.current(data);
    };

    console.log(`📡 [usePusherEvent] Subscribing: ${channelName} -> ${eventName}`);
    const channel = pusher.subscribe(channelName);
    channel.bind(eventName, handler);

    return () => {
      console.log(`📴 [usePusherEvent] Cleaning up: ${channelName} -> ${eventName}`);
      channel.unbind(eventName, handler);
      // We don't unsubscribe here because other components might be listening to the same channel.
      // Pusher handles its own connection/subscription state effectively.
    };
  }, [pusher, channelName, eventName]);
}


