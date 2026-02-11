"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeSubscriptionOptions<T> {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { old: T }) => void;
}

export function useRealtimeSubscription<T>({
  table,
  event = "*",
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSubscriptionOptions<T>) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create unique channel name
    const channelName = `realtime:${table}:${filter || "all"}`;

    // Subscribe to changes
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          filter,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload.new as T);
          }
          if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate(payload.new as T);
          }
          if (payload.eventType === "DELETE" && onDelete) {
            onDelete({ old: payload.old as T });
          }
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    // Cleanup on unmount
    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [table, event, filter, onInsert, onUpdate, onDelete]);

  return channel;
}
