import { getPlaybackSnapshot } from "../../../lib/playbackStatus";

function asSingle(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseChannelIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const force = String(asSingle(req.query.force) || "").trim() === "1";
  const channel = String(asSingle(req.query.channel) || "").trim();
  const channels = parseChannelIds(asSingle(req.query.channels));
  const channelIds = channel ? [channel] : channels;

  try {
    const snapshot = await getPlaybackSnapshot({
      force,
      channelIds: channelIds.length > 0 ? channelIds : null,
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(snapshot);
  } catch (error) {
    console.error("[health/playback] failed", error);
    res.status(500).json({
      error: "Failed to resolve playback status",
      detail: error?.message || "unknown_error",
    });
  }
}
