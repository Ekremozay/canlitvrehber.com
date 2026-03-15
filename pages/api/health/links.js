import {
  checkSingleChannelHealth,
  getLinkHealthSnapshot,
} from "../../../lib/linkHealth";

function asSingle(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const channelId = String(asSingle(req.query.channel) || "").trim();
  const force = String(asSingle(req.query.force) || "").toLowerCase() === "1";
  const maxChannels = parsePositiveInt(asSingle(req.query.max));
  const includeChannels = String(asSingle(req.query.details) || "1") !== "0";

  try {
    if (channelId) {
      const channelResult = await checkSingleChannelHealth(channelId);
      if (!channelResult) {
        res.status(404).json({ error: "Channel not found", channel: channelId });
        return;
      }

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({
        mode: "single",
        channel: channelResult,
      });
      return;
    }

    const snapshot = await getLinkHealthSnapshot({
      force,
      maxChannels,
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      mode: "bulk",
      startedAt: snapshot.startedAt,
      completedAt: snapshot.completedAt,
      durationMs: snapshot.durationMs,
      checkedCount: snapshot.checkedCount,
      okCount: snapshot.okCount,
      failCount: snapshot.failCount,
      successRate: snapshot.successRate,
      channels: includeChannels ? snapshot.channels : undefined,
    });
  } catch (error) {
    console.error("[health/links] failed", error);
    res.status(500).json({
      error: "Failed to run link health check",
      detail: error?.message || "unknown_error",
    });
  }
}
