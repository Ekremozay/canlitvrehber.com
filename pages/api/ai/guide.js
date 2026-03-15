import { CHANNELS } from "../../../lib/channels";
import { getPlaybackSnapshot } from "../../../lib/playbackStatus";
import {
  createLemonfoxChatCompletion,
  isLemonfoxConfigured,
  parseJsonContent,
} from "../../../lib/lemonfox";

const MAX_QUERY_LENGTH = 240;
const MAX_CANDIDATES = 36;
const MAX_SUGGESTIONS = 3;

function normalizeQuery(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

function buildCandidateChannels(statuses) {
  return CHANNELS.map((channel) => {
    const status = statuses[channel.id];
    if (!status?.playable) return null;

    return {
      id: channel.id,
      name: channel.name,
      category: channel.category,
      description: channel.description,
      playbackType: status.playbackType,
      playbackLabel: status.playbackType === "internal" ? "Bizim Yayin" : "YouTube",
      country: channel.country || "",
      network: channel.network || "",
      currentShow: channel.epg?.[0]?.show || "",
    };
  })
    .filter(Boolean)
    .slice(0, MAX_CANDIDATES);
}

function pickCategoryFromQuery(query) {
  const text = query.toLowerCase();
  if (/(haber|gundem|son dakika|politika)/.test(text)) return "news";
  if (/(spor|mac|futbol|basketbol|voleybol)/.test(text)) return "sports";
  if (/(cocuk|cizgi|ailece|animasyon)/.test(text)) return "kids";
  if (/(belgesel|tarih|kultur|yasam)/.test(text)) return "documentary";
  if (/(dini|ilahiyat|ramazan|islam)/.test(text)) return "religious";
  return "";
}

function buildRankedSuggestions(query, candidates) {
  const targetCategory = pickCategoryFromQuery(query);
  const sorted = [...candidates].sort((left, right) => {
    const leftScore =
      (left.playbackType === "internal" ? 3 : 1) +
      (targetCategory && left.category === targetCategory ? 2 : 0);
    const rightScore =
      (right.playbackType === "internal" ? 3 : 1) +
      (targetCategory && right.category === targetCategory ? 2 : 0);
    return rightScore - leftScore;
  });

  return sorted.slice(0, MAX_SUGGESTIONS).map((item) => ({
    id: item.id,
    name: item.name,
    playbackType: item.playbackType,
    playbackLabel: item.playbackLabel,
    reason:
      item.category === targetCategory && targetCategory
        ? `Aramana uygun kategori: ${item.category}.`
        : item.playbackType === "internal"
          ? "Site icinde direkt acilabiliyor."
          : "YouTube uzerinden acilabiliyor.",
    currentShow: item.currentShow,
  }));
}

function createFallbackResponse(query, candidates) {
  const suggestions = buildRankedSuggestions(query, candidates);
  return {
    title: "AI Kanal Rehberi",
    summary:
      suggestions.length > 0
        ? "Simdi acilabilen kanallar arasindan hizli bir secim yaptim."
        : "Su an uygun kanal bulunamadi.",
    suggestions,
    followup: "Istersen haber, spor veya cocuk gibi daha net bir niyet yazabilirsin.",
    source: "fallback",
  };
}

function sanitizeAiCopy(payload, suggestions) {
  return {
    title: String(payload?.title || "AI Kanal Rehberi").trim().slice(0, 80),
    summary: String(payload?.summary || "").trim().slice(0, 280),
    suggestions,
    followup: String(payload?.followup || "").trim().slice(0, 160),
    source: "lemonfox",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const query = normalizeQuery(req.body?.query || "Su an bana uygun bir kanal oner.");
  if (!query) {
    res.status(400).json({ error: "Missing query" });
    return;
  }

  try {
    const snapshot = await getPlaybackSnapshot();
    const candidates = buildCandidateChannels(snapshot.statuses || {});
    const suggestions = buildRankedSuggestions(query, candidates);

    if (candidates.length === 0) {
      res.status(200).json({
        title: "AI Kanal Rehberi",
        summary: "Su an acilabilir kanal bulunamadigi icin onerim hazirlanamadi.",
        suggestions: [],
        followup: "Biraz sonra tekrar deneyebilirsin.",
        source: "fallback",
      });
      return;
    }

    if (!isLemonfoxConfigured()) {
      res.status(200).json(createFallbackResponse(query, candidates));
      return;
    }

    const completion = await createLemonfoxChatCompletion({
      messages: [
        {
          role: "system",
          content:
            "Sen Canli TV Rehber icin Turkce calisan bir editor asistanisin. Verilen kanal onerilerine dayanarak sadece gecerli JSON don. JSON formati: {\"title\":\"\",\"summary\":\"\",\"followup\":\"\"}. suggestions alanini ASLA ekleme. Baslik kisa, summary ikna edici, followup ise yonlendirici olsun.",
        },
        {
          role: "user",
          content: JSON.stringify({
            user_request: query,
            selected_suggestions: suggestions,
            notes: [
              "summary en fazla 2 cumle olsun.",
              "followup tek cumle olsun.",
              "Cevabi Turkce ver.",
            ],
          }),
        },
      ],
    });

    const parsed = parseJsonContent(completion.content);
    const payload = sanitizeAiCopy(parsed, suggestions);

    res.status(200).json(payload);
  } catch (error) {
    console.error("[ai/guide] failed", error);

    try {
      const snapshot = await getPlaybackSnapshot();
      const candidates = buildCandidateChannels(snapshot.statuses || {});
      res.status(200).json(createFallbackResponse(query, candidates));
    } catch (fallbackError) {
      res.status(500).json({
        error: "Failed to generate AI guide",
        detail: error?.message || "unknown_error",
      });
    }
  }
}
