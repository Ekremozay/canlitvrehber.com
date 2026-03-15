const LEMONFOX_BASE_URL = "https://api.lemonfox.ai/v1";
const DEFAULT_MODEL = "llama-8b-chat";
const LEMONFOX_TIMEOUT_MS = 20000;

function getApiKey() {
  return String(process.env.LEMONFOX_API_KEY || "").trim();
}

export function isLemonfoxConfigured() {
  return Boolean(getApiKey());
}

function stripCodeFence(value) {
  const text = String(value || "").trim();
  if (!text.startsWith("```")) return text;
  return text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

export function parseJsonContent(content) {
  const cleaned = stripCodeFence(content);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("invalid_json_content");
  }
}

export async function createLemonfoxChatCompletion(payload) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("lemonfox_not_configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LEMONFOX_TIMEOUT_MS);

  try {
    const response = await fetch(`${LEMONFOX_BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LEMONFOX_MODEL || DEFAULT_MODEL,
        temperature: 0.6,
        max_tokens: 450,
        ...payload,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error?.message || data?.message || `upstream_${response.status}`;
      throw new Error(detail);
    }

    const content = data?.choices?.[0]?.message?.content || "";
    if (!content) {
      throw new Error("empty_completion");
    }

    return {
      id: data?.id || "",
      model: data?.model || "",
      content,
      raw: data,
    };
  } finally {
    clearTimeout(timer);
  }
}
