import { useEffect, useState } from "react";
import { getBasePlaybackStatus } from "./playbackStatus";

function buildDefaultStatuses(channels) {
  return Object.fromEntries(
    (channels || [])
      .filter(Boolean)
      .map((channel) => [channel.id, getBasePlaybackStatus(channel)])
  );
}

export function usePlaybackAvailability(channels) {
  const safeChannels = channels || [];
  const channelIds = safeChannels.map((channel) => channel.id);
  const signature = channelIds.join(",");
  const [statusMap, setStatusMap] = useState(() => buildDefaultStatuses(safeChannels));

  useEffect(() => {
    setStatusMap((prev) => ({
      ...buildDefaultStatuses(safeChannels),
      ...prev,
    }));
  }, [signature]);

  useEffect(() => {
    if (channelIds.length === 0) return undefined;

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("channels", channelIds.join(","));

    fetch(`/api/health/playback?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "playback_status_failed");
        }
        return payload;
      })
      .then((payload) => {
        if (!payload?.statuses) return;
        setStatusMap((prev) => ({
          ...prev,
          ...payload.statuses,
        }));
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [signature]);

  return statusMap;
}
