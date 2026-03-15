import Link from "next/link";
import { useMemo, useState } from "react";

const QUICK_PROMPTS = [
  "Şu an ne izlesem?",
  "Hızlı bir haber kanalı öner",
  "Spor için açık kanal bul",
  "Çocuklar için uygun kanal öner",
  "Akşam sakin bir şey izlemek istiyorum",
];

function playbackTone(playbackType) {
  if (playbackType === "internal") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (playbackType === "youtube") {
    return "border-sky-400/30 bg-sky-400/10 text-sky-100";
  }

  return "border-white/15 bg-white/5 text-white/70";
}

export default function AiGuidePanel({ playableCount = 0 }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const placeholder = useMemo(() => {
    return "Örnek: Şu an hızlı haber izlemek istiyorum, çocuk için kanal öner, akşam sakin bir yayın aç...";
  }, []);

  async function runGuide(nextQuery) {
    const cleanQuery = String(nextQuery || query).trim();
    if (!cleanQuery) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: cleanQuery }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "ai_guide_failed");
      }

      setResult(payload);
      setQuery(cleanQuery);
    } catch {
      setError("Öneri hazırlanırken bir sorun oluştu. Biraz sonra yeniden deneyebilirsin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-surface/60">
      <div
        className="relative p-5 sm:p-6"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 35%), radial-gradient(circle at top right, rgba(14,165,233,0.18), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[1.6px] text-emerald-100">
              Lemonfox Destekli
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              AI İzleme Rehberi
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
              Ne izlemek istediğini yaz. AI, o anda açılabilen {playableCount} kanal arasından
              sana hızlı ve net bir seçim hazırlar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
            <div className="text-[11px] uppercase tracking-[1.4px] text-white/45">Anlık Kapsam</div>
            <div className="mt-1 text-2xl font-black text-white">{playableCount}</div>
            <div className="text-xs text-white/45">Şu anda önerilebilen kanal</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={3}
              placeholder={placeholder}
              className="min-h-[104px] flex-1 resize-none rounded-2xl border border-white/10 bg-bg/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent"
            />

            <div className="flex w-full flex-col gap-3 lg:w-[220px]">
              <button
                onClick={() => runGuide(query)}
                disabled={loading}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? "Öneri hazırlanıyor..." : "Öneri Al"}
              </button>

              <div className="rounded-2xl border border-white/10 bg-bg/50 px-4 py-3 text-xs text-white/55">
                Öneriler anlık oynatma durumuna göre hazırlanır. Site içinde açılan kanallar ve
                uygun YouTube seçenekleri öne çıkar.
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((item) => (
              <button
                key={item}
                onClick={() => runGuide(item)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[1.4px] text-white/45">
                    AI Önerisi
                  </div>
                  <h3 className="mt-1 text-xl font-black tracking-tight">
                    {result.title || "AI İzleme Rehberi"}
                  </h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/60">
                  {result.source === "lemonfox" ? "Lemonfox" : "Yerel Öneri"}
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {result.summary || "Uygun kanallar analiz edildi ve sana hızlı bir seçim hazırlandı."}
              </p>

              {result.followup && (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {result.followup}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(result.suggestions || []).map((item, index) => (
                <Link
                  key={`${item.id}-${index}`}
                  href={`/watch/${item.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 p-4 no-underline transition hover:border-white/20 hover:bg-black/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-white">{item.name}</div>
                      <p className="mt-1 text-xs leading-relaxed text-white/60">{item.reason}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${playbackTone(
                        item.playbackType
                      )}`}
                    >
                      {item.playbackLabel}
                    </span>
                  </div>

                  {item.currentShow && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/55">
                      Şu anda: {item.currentShow}
                    </div>
                  )}
                </Link>
              ))}

              {(!result.suggestions || result.suggestions.length === 0) && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                  Şu anda uygun bir kanal önerisi bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
