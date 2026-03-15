const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function asSingle(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isPrivateHostname(hostname) {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;

  const ipv4 = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!ipv4) return false;

  const [a, b] = hostname.split(".").map((part) => Number(part));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function buildProxyUrl(url, ref, ua) {
  const params = new URLSearchParams({ url });
  if (ref) params.set("ref", ref);
  if (ua) params.set("ua", ua);
  return `/api/proxy?${params.toString()}`;
}

function rewriteM3U8(content, sourceUrl, ref, ua) {
  const base = new URL(sourceUrl);
  const lines = content.split("\n");

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_, uri) => {
          try {
            const absolute = new URL(uri, base).toString();
            return `URI="${buildProxyUrl(absolute, ref, ua)}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
      }

      try {
        const absolute = new URL(trimmed, base).toString();
        return buildProxyUrl(absolute, ref, ua);
      } catch {
        return line;
      }
    })
    .join("\n");
}

async function forwardRequest(targetUrl, ref, ua, requestHeaders) {
  const headers = new Headers();
  headers.set(
    "user-agent",
    ua || requestHeaders["user-agent"] || "Mozilla/5.0 (StreamTV Proxy)"
  );
  if (ref) headers.set("referer", ref);

  const accept = requestHeaders.accept;
  headers.set("accept", accept || "*/*");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    return await fetch(targetUrl, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawUrl = asSingle(req.query.url);
  const ref = asSingle(req.query.ref);
  const ua = asSingle(req.query.ua);

  if (!rawUrl) {
    res.status(400).json({ error: "Missing url query parameter" });
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: "Invalid target URL" });
    return;
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    res.status(400).json({ error: "Only http(s) protocols are allowed" });
    return;
  }

  if (isPrivateHostname(targetUrl.hostname)) {
    res.status(400).json({ error: "Target host is not allowed" });
    return;
  }

  try {
    const upstream = await forwardRequest(targetUrl.toString(), ref, ua, req.headers);

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: "Upstream request failed",
        status: upstream.status,
      });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");

    const contentType = upstream.headers.get("content-type") || "";
    const isPlaylist =
      contentType.includes("mpegurl") ||
      targetUrl.pathname.toLowerCase().endsWith(".m3u8");

    if (isPlaylist) {
      const sourceText = await upstream.text();
      const rewritten = rewriteM3U8(sourceText, targetUrl.toString(), ref, ua);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
      res.status(200).send(rewritten);
      return;
    }

    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && key !== "content-encoding") {
        res.setHeader(key, value);
      }
    });

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(200).send(buffer);
  } catch (error) {
    console.error("[proxy] request failed", error);
    const isTimeout =
      error?.name === "AbortError" || String(error?.cause?.code || "").includes("TIMEOUT");
    res.status(502).json({
      error: isTimeout
        ? "Proxy timeout while fetching upstream stream"
        : "Proxy failed to fetch upstream stream",
    });
  }
}
