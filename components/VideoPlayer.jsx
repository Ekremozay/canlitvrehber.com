import { useEffect, useMemo, useState } from "react";
import { getYoutubeLiveLink } from "../lib/channelPlayback";

const EMPTY_YOUTUBE_STATE = {
  status: "idle",
  available: false,
  embedUrl: "",
  watchUrl: "",
  liveUrl: "",
  title: "",
  reason: "",
  checkedAt: "",
};

function getReasonLabel(reason) {
  const map = {
    live_not_found: "Bu kanal icin su anda aktif resmi YouTube canli yayini bulunamadi.",
    missing_youtube_source: "Bu kanal icin tanimli resmi YouTube kaynagi yok.",
    invalid_youtube_url: "YouTube kaynagi gecersiz gorunuyor.",
    timeout: "YouTube canli kontrolu zaman asimina ugradi.",
    network_error: "YouTube canli kontrolu sirasinda baglanti hatasi olustu.",
  };

  return map[String(reason || "")] || "YouTube canli yayini su an dogrulanamadi.";
}

function buildYoutubeState(channel, playbackStatus, youtubeLiveLink) {
  if (!youtubeLiveLink?.url) {
    return {
      ...EMPTY_YOUTUBE_STATE,
      status: "unavailable",
      reason: "missing_youtube_source",
    };
  }

  if (playbackStatus?.verified) {
    if (playbackStatus.playable && playbackStatus.playbackType === "youtube" && playbackStatus.embedUrl) {
      return {
        ...EMPTY_YOUTUBE_STATE,
        status: "ready",
        available: true,
        embedUrl: playbackStatus.embedUrl,
        watchUrl: playbackStatus.liveUrl || playbackStatus.watchUrl || youtubeLiveLink.url,
        liveUrl: playbackStatus.liveUrl || "",
        title: playbackStatus.youtubeTitle || channel?.name || "YouTube Canli",
        checkedAt: playbackStatus.checkedAt || "",
      };
    }

    return {
      ...EMPTY_YOUTUBE_STATE,
      status: "unavailable",
      watchUrl: playbackStatus.watchUrl || youtubeLiveLink.url,
      liveUrl: playbackStatus.liveUrl || "",
      title: playbackStatus.youtubeTitle || "",
      reason: playbackStatus.youtubeReason || "live_not_found",
      checkedAt: playbackStatus.checkedAt || "",
    };
  }

  return {
    ...EMPTY_YOUTUBE_STATE,
    status: "checking",
    watchUrl: youtubeLiveLink.url,
    liveUrl: youtubeLiveLink.url,
  };
}

function formatCheckedAt(checkedAt) {
  if (!checkedAt) return "";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(checkedAt));
  } catch {
    return "";
  }
}

export default function VideoPlayer({ channel, playbackStatus = null }) {
  const youtubeLiveLink = getYoutubeLiveLink(channel);
  const [youtubeState, setYoutubeState] = useState(() =>
    buildYoutubeState(channel, playbackStatus, youtubeLiveLink)
  );

  useEffect(() => {
    setYoutubeState(buildYoutubeState(channel, playbackStatus, youtubeLiveLink));
  }, [
    channel?.id,
    playbackStatus?.verified,
    playbackStatus?.playable,
    playbackStatus?.playbackType,
    playbackStatus?.embedUrl,
    playbackStatus?.watchUrl,
    playbackStatus?.liveUrl,
    playbackStatus?.youtubeTitle,
    playbackStatus?.youtubeReason,
    playbackStatus?.checkedAt,
    youtubeLiveLink?.url,
  ]);

  useEffect(() => {
    if (!youtubeLiveLink?.url || playbackStatus?.verified) {
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    setYoutubeState((prev) => ({
      ...prev,
      status: "checking",
      watchUrl: prev.watchUrl || youtubeLiveLink.url,
      liveUrl: prev.liveUrl || youtubeLiveLink.url,
      reason: "",
    }));

    fetch(`/api/youtube/live?url=${encodeURIComponent(youtubeLiveLink.url)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "youtube_status_failed");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;

        if (payload.available && payload.embedUrl) {
          setYoutubeState({
            ...EMPTY_YOUTUBE_STATE,
            status: "ready",
            available: true,
            embedUrl: payload.embedUrl,
            watchUrl: payload.liveUrl || payload.watchUrl || youtubeLiveLink.url,
            liveUrl: payload.liveUrl || "",
            title: payload.title || channel?.name || "YouTube Canli",
            checkedAt: payload.checkedAt || "",
          });
          return;
        }

        setYoutubeState({
          ...EMPTY_YOUTUBE_STATE,
          status: "unavailable",
          watchUrl: payload.watchUrl || youtubeLiveLink.url,
          liveUrl: payload.liveUrl || "",
          title: payload.title || "",
          reason: payload.reason || "live_not_found",
          checkedAt: payload.checkedAt || "",
        });
      })
      .catch((error) => {
        if (!active || error?.name === "AbortError") return;

        setYoutubeState({
          ...EMPTY_YOUTUBE_STATE,
          status: "error",
          watchUrl: youtubeLiveLink.url,
          liveUrl: youtubeLiveLink.url,
          reason: error?.message || "youtube_status_failed",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [channel?.id, channel?.name, playbackStatus?.verified, youtubeLiveLink?.url]);

  const openUrl = youtubeState.liveUrl || youtubeState.watchUrl || youtubeLiveLink?.url || "";
  const checkedAtLabel = useMemo(() => formatCheckedAt(youtubeState.checkedAt), [youtubeState.checkedAt]);
  const isReady = youtubeState.status === "ready" && Boolean(youtubeState.embedUrl);
  const isChecking = youtubeState.status === "checking";

  return (
    <div className="relative w-full aspect-video max-h-[72vh] overflow-hidden rounded-2xl border border-white/10 bg-black">
      {isReady ? (
        <iframe
          src={youtubeState.embedUrl}
          title={`${channel.name} YouTube Canli`}
          className="h-full w-full bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-6 text-center">
          {isChecking ? (
            <>
              <div className="h-10 w-10 rounded-full border-[3px] border-white/10 border-t-accent animate-spin" />
              <div className="mt-4 text-base font-bold text-white">
                Resmi YouTube canli yayini kontrol ediliyor
              </div>
              <p className="mt-2 max-w-md text-xs text-white/55">
                Site icinde sadece dogrulanmis YouTube canli yayinlari aciliyor. Sonuc saatlik cache ile yenilenir.
              </p>
            </>
          ) : (
            <>
              <div className="text-base font-bold text-red-400">YouTube canli yayini acilamadi</div>
              <p className="mt-2 max-w-md text-xs text-white/55">{getReasonLabel(youtubeState.reason)}</p>
              {checkedAtLabel && (
                <p className="mt-2 text-[11px] text-white/35">Son kontrol: {checkedAtLabel}</p>
              )}
              {openUrl && (
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-2.5 text-sm font-semibold text-red-100 no-underline transition hover:bg-red-400/20"
                >
                  YouTube'da Kontrol Et
                </a>
              )}
            </>
          )}
        </div>
      )}

      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-5 py-4"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest font-mono ${
              isReady
                ? "border border-danger/30 bg-danger/15 text-danger"
                : "border border-white/15 bg-white/10 text-white/70"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-danger animate-pulse" : "bg-white/45"}`} />
            {isReady ? "CANLI" : "YOUTUBE"}
          </span>
          <span className="truncate text-sm font-bold text-white">{channel.name}</span>
        </div>
        <span className="hidden rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-100 sm:inline-flex">
          Resmi YouTube Player
        </span>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-5 pb-4 pt-10 sm:flex-row sm:items-end sm:justify-between"
        style={{
          background: "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      >
        <div className="max-w-xl text-xs text-white/60">
          <div className="font-semibold text-white/85">Oynatma ve reklam yonetimi YouTube tarafinda kalir.</div>
          <div className="mt-1">
            Site icinde sadece resmi ve dogrulanmis YouTube canli yayinlari gosterilir.
            {checkedAtLabel ? ` Son kontrol: ${checkedAtLabel}.` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2" style={{ pointerEvents: "auto" }}>
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white no-underline transition hover:bg-white/15"
            >
              YouTube'da Ac
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
