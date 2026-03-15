import { getLinkHealthSnapshot } from "../../../lib/linkHealth";

function asSingle(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function isAuthorized(req) {
  const secret = String(process.env.LINK_CHECK_CRON_SECRET || "").trim();
  if (!secret) return true;

  const headerToken = String(req.headers["x-cron-secret"] || "").trim();
  const queryToken = String(asSingle(req.query.token) || "").trim();
  return headerToken === secret || queryToken === secret;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const maxChannels = parsePositiveInt(asSingle(req.query.max));

  try {
    const snapshot = await getLinkHealthSnapshot({
      force: true,
      maxChannels,
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      checkedAt: snapshot.completedAt,
      checkedCount: snapshot.checkedCount,
      okCount: snapshot.okCount,
      failCount: snapshot.failCount,
      successRate: snapshot.successRate,
    });
  } catch (error) {
    console.error("[health/cron] failed", error);
    res.status(500).json({
      ok: false,
      error: "Cron link health check failed",
      detail: error?.message || "unknown_error",
    });
  }
}
