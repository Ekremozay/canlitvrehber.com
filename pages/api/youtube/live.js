import { getYoutubeLiveStatus } from "../../../lib/youtube";

function asSingle(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawUrl = String(asSingle(req.query.url) || "").trim();
  const force = String(asSingle(req.query.force) || "").trim() === "1";

  if (!rawUrl) {
    res.status(400).json({ error: "Missing url query parameter" });
    return;
  }

  try {
    const status = await getYoutubeLiveStatus(rawUrl, { force });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(status);
  } catch (error) {
    console.error("[youtube/live] failed", error);
    res.status(500).json({
      available: false,
      error: "Failed to resolve YouTube live status",
    });
  }
}
