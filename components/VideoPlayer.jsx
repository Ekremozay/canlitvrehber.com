import { useEffect, useMemo, useRef, useState } from "react";
import { useHlsPlayer } from "../lib/useHlsPlayer";
import {
  SAFE_MODE_ENABLED,
  canUseInternalStream,
  getChannelStreamOptions,
  isBlockedBySafeMode,
} from "../lib/safeMode";
import {
  getOfficialLiveLink,
  getYoutubeLiveLink,
  hasYoutubeCandidate,
} from "../lib/channelPlayback";

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
    live_not_found: "YouTube tarafinda aktif resmi canli yayin bulunamadi.",
    missing_youtube_source: "Bu kanal icin tanimli YouTube canli kaynagi yok.",
    invalid_youtube_url: "YouTube kaynagi gecersiz gorunuyor.",
    timeout: "YouTube canli kontrolu zaman asimina ugradi.",
    network_error: "YouTube canli kontrolu sirasinda baglanti hatasi olustu.",
  };

  return map[String(reason || "")] || "YouTube canli yayini dogrulanamadi.";
}

function buildYoutubeState(channel, playbackStatus, youtubeLiveLink) {
  if (!youtubeLiveLink?.url) {
    return {
      ...EMPTY_YOUTUBE_STATE,
      status: "unavailable",
      reason: "missing_youtube_source",
    };
  }

  if (playbackStatus?.verified && playbackStatus.playbackType === "youtube" && playbackStatus.playable) {
    return {
      ...EMPTY_YOUTUBE_STATE,
      status: "ready",
      available: true,
      embedUrl: playbackStatus.embedUrl || "",
      watchUrl: playbackStatus.liveUrl || playbackStatus.watchUrl || youtubeLiveLink.url,
      liveUrl: playbackStatus.liveUrl || "",
      title: playbackStatus.youtubeTitle || channel?.name || "YouTube Canli",
      checkedAt: playbackStatus.checkedAt || "",
    };
  }

  if (
    playbackStatus?.verified &&
    !playbackStatus?.internalPlayable &&
    playbackStatus?.youtubeCandidate &&
    !playbackStatus?.playable
  ) {
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
    status: youtubeLiveLink?.url ? "checking" : "unavailable",
    watchUrl: youtubeLiveLink?.url || "",
    liveUrl: youtubeLiveLink?.url || "",
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
  const videoRef = useRef(null);
  const redirectTimerRef = useRef(null);

  const internalPlaybackAllowed = canUseInternalStream(channel);
  const blockedByPolicy = isBlockedBySafeMode(channel);
  const streamOptions = useMemo(() => {
    if (!internalPlaybackAllowed) return [];
    return getChannelStreamOptions(channel);
  }, [channel, internalPlaybackAllowed]);
  const youtubeLiveLink = getYoutubeLiveLink(channel);
  const officialLiveLink = getOfficialLiveLink(channel);
  const hasYoutubeOption = hasYoutubeCandidate(channel);

  const [selectedSourceId, setSelectedSourceId] = useState(streamOptions[0]?.id || "");
  const [selectedPlayer, setSelectedPlayer] = useState(
    internalPlaybackAllowed ? "internal" : hasYoutubeOption ? "youtube" : "external"
  );
  const [youtubeState, setYoutubeState] = useState(() =>
    buildYoutubeState(channel, playbackStatus, youtubeLiveLink)
  );

  useEffect(() => {
    setSelectedSourceId(streamOptions[0]?.id || "");
  }, [channel?.id, streamOptions]);

  useEffect(() => {
    setSelectedPlayer(internalPlaybackAllowed ? "internal" : hasYoutubeOption ? "youtube" : "external");
    setYoutubeState(buildYoutubeState(channel, playbackStatus, youtubeLiveLink));
  }, [
    channel?.id,
    internalPlaybackAllowed,
    hasYoutubeOption,
    playbackStatus?.verified,
    playbackStatus?.playbackType,
    playbackStatus?.playable,
    playbackStatus?.embedUrl,
    playbackStatus?.watchUrl,
    playbackStatus?.liveUrl,
    playbackStatus?.youtubeTitle,
    playbackStatus?.youtubeReason,
    playbackStatus?.checkedAt,
    youtubeLiveLink?.url,
  ]);

  useEffect(() => {
    if (!youtubeLiveLink?.url) {
      setYoutubeState({
        ...EMPTY_YOUTUBE_STATE,
        status: "unavailable",
        reason: "missing_youtube_source",
      });
      return undefined;
    }

    if (
      playbackStatus?.verified &&
      ((playbackStatus.playbackType === "youtube" && playbackStatus.playable) ||
        (!playbackStatus.internalPlayable && playbackStatus.youtubeCandidate))
    ) {
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
  }, [
    channel?.id,
    channel?.name,
    playbackStatus?.verified,
    playbackStatus?.playable,
    playbackStatus?.playbackType,
    playbackStatus?.internalPlayable,
    playbackStatus?.youtubeCandidate,
    youtubeLiveLink?.url,
  ]);

  const orderedCandidates = useMemo(() => {
    if (streamOptions.length === 0) return [];
    const selectedIndex = Math.max(
      0,
      streamOptions.findIndex((item) => item.id === selectedSourceId)
    );
    const selected = streamOptions[selectedIndex];
    const rest = streamOptions.filter((item, index) => index !== selectedIndex);
    return [selected.url, ...rest.map((item) => item.url)];
  }, [selectedSourceId, streamOptions]);

  const internalCandidates = selectedPlayer === "internal" ? orderedCandidates : [];

  const { status, sourceIndex, sourceCount } = useHlsPlayer(videoRef, internalCandidates, {
    autoplay: true,
  });

  const youtubeReady = youtubeState.status === "ready" && Boolean(youtubeState.embedUrl);
  const youtubeChecking = youtubeState.status === "checking";
  const youtubeFailed = youtubeState.status === "unavailable" || youtubeState.status === "error";
  const checkedAtLabel = formatCheckedAt(youtubeState.checkedAt);
  const directYoutubeUrl = youtubeState.liveUrl || youtubeState.watchUrl || youtubeLiveLink?.url || "";
  const officialUrl = officialLiveLink?.url || "";
  const shouldAutoRedirectToOfficial =
    selectedPlayer === "external" &&
    !youtubeChecking &&
    !youtubeReady &&
    Boolean(officialUrl);

  useEffect(() => {
    if (!internalPlaybackAllowed) {
      if (youtubeReady) setSelectedPlayer("youtube");
      else if (!youtubeChecking) setSelectedPlayer("external");
      return;
    }

    if (selectedPlayer !== "internal") return;
    if (status !== "error" && status !== "unavailable") return;

    if (youtubeReady) {
      setSelectedPlayer("youtube");
      return;
    }

    if (!hasYoutubeOption || youtubeFailed) {
      setSelectedPlayer("external");
    }
  }, [
    internalPlaybackAllowed,
    selectedPlayer,
    status,
    youtubeReady,
    youtubeChecking,
    hasYoutubeOption,
    youtubeFailed,
  ]);

  useEffect(() => {
    if (selectedPlayer === "youtube" && youtubeFailed && !internalPlaybackAllowed) {
      setSelectedPlayer("external");
    }
  }, [internalPlaybackAllowed, selectedPlayer, youtubeFailed]);

  useEffect(() => {
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    if (!shouldAutoRedirectToOfficial || !officialUrl) {
      return undefined;
    }

    redirectTimerRef.current = window.setTimeout(() => {
      window.location.assign(officialUrl);
    }, 1200);

    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [channel?.id, officialUrl, shouldAutoRedirectToOfficial]);

  return (
    <div className="relative w-full aspect-video max-h-[72vh] overflow-hidden rounded-2xl border border-white/10 bg-black">
      {selectedPlayer === "youtube" && youtubeReady ? (
        <iframe
          src={youtubeState.embedUrl}
          title={`${channel.name} YouTube Canli`}
          className="h-full w-full bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : selectedPlayer === "internal" ? (
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          controls
          playsInline
        />
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}

      {selectedPlayer === "internal" && status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 px-6 text-center">
          <div className="h-10 w-10 rounded-full border-[3px] border-white/10 border-t-accent animate-spin" />
          <div className="mt-4 text-base font-bold text-white">Bizim yayin aciliyor</div>
          <p className="mt-2 text-xs text-white/55">
            {sourceCount > 1 ? `Kaynak ${sourceIndex + 1}/${sourceCount} deneniyor.` : "Kaynak baglantisi kuruluyor."}
          </p>
          {youtubeChecking && (
            <p className="mt-2 text-[11px] text-emerald-200">
              Yedek olarak YouTube canli yayin da kontrol ediliyor.
            </p>
          )}
        </div>
      )}

      {selectedPlayer === "internal" && (status === "error" || status === "unavailable") && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/78 px-6 text-center">
          <div className="text-base font-bold text-red-400">Bizim yayin su an baglanamadi</div>
          <p className="mt-2 max-w-md text-xs text-white/55">
            {blockedByPolicy && SAFE_MODE_ENABLED
              ? "Bu kanal dahili playerda guvenli mod nedeniyle kapali."
              : "Dahili kaynak hata verdi. Siradaki secenek olarak YouTube canli kontrol ediliyor."}
          </p>
          {youtubeChecking && (
            <div className="mt-4 h-8 w-8 rounded-full border-[3px] border-white/10 border-t-emerald-300 animate-spin" />
          )}
          {youtubeReady && (
            <button
              onClick={() => setSelectedPlayer("youtube")}
              className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/25"
            >
              YouTube'a Gec
            </button>
          )}
          {!youtubeChecking && !youtubeReady && officialUrl && (
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-black no-underline transition hover:brightness-110"
            >
              Resmi Siteye Git
            </a>
          )}
          {!youtubeChecking && !youtubeReady && !officialUrl && directYoutubeUrl && (
            <a
              href={directYoutubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-white/15"
            >
              YouTube'da Kontrol Et
            </a>
          )}
        </div>
      )}

      {(selectedPlayer === "youtube" && !youtubeReady) || selectedPlayer === "external" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/82 px-6 text-center">
          {youtubeChecking ? (
            <>
              <div className="h-10 w-10 rounded-full border-[3px] border-white/10 border-t-accent animate-spin" />
              <div className="mt-4 text-base font-bold text-white">YouTube canli yayin kontrol ediliyor</div>
              <p className="mt-2 max-w-md text-xs text-white/55">
                Bizde yayin acilmadi. Resmi YouTube yayini bulunursa ayni player alaninda acilacak.
              </p>
            </>
          ) : (
            <>
              <div className={`text-base font-bold ${shouldAutoRedirectToOfficial ? "text-accent" : "text-red-400"}`}>
                {shouldAutoRedirectToOfficial ? "Resmi siteye yonlendiriliyorsunuz" : "Site ici oynatici acilamadi"}
              </div>
              <p className="mt-2 max-w-md text-xs text-white/55">
                {shouldAutoRedirectToOfficial
                  ? "Bizde yayin ve YouTube canli secenegi su an acilmadi. Resmi canli yayin sayfasi birazdan otomatik acilacak."
                  : hasYoutubeOption
                    ? getReasonLabel(youtubeState.reason)
                    : "Bu kanal icin tanimli YouTube canli kaynagi bulunamadi."}
              </p>
              {checkedAtLabel && (
                <p className="mt-2 text-[11px] text-white/35">Son YouTube kontrolu: {checkedAtLabel}</p>
              )}
              {shouldAutoRedirectToOfficial && (
                <p className="mt-2 text-[11px] font-semibold text-accent/80">Yonlendirme otomatik baslatildi.</p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {directYoutubeUrl && !shouldAutoRedirectToOfficial && (
                  <a
                    href={directYoutubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-white/15"
                  >
                    YouTube'da Ac
                  </a>
                )}
                {officialUrl && (
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-black no-underline transition hover:brightness-110"
                  >
                    Resmi Siteye Git
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}

      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-5 py-4"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, transparent 100%)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/15 px-2.5 py-0.5 text-[10px] font-bold tracking-widest font-mono text-danger">
            <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
            CANLI
          </span>
          <span className="truncate text-sm font-bold text-white">{channel.name}</span>
        </div>

        {(internalPlaybackAllowed || youtubeReady || youtubeChecking) && (
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/35 p-1 sm:flex">
            {internalPlaybackAllowed && (
              <button
                onClick={() => setSelectedPlayer("internal")}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                  selectedPlayer === "internal"
                    ? "bg-accent text-black"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Bizim Yayin
              </button>
            )}
            {(youtubeReady || youtubeChecking) && (
              <button
                onClick={() => {
                  if (youtubeReady) setSelectedPlayer("youtube");
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                  selectedPlayer === "youtube" && youtubeReady
                    ? "bg-emerald-400 text-black"
                    : "text-white/70 hover:text-white"
                } ${youtubeChecking ? "cursor-wait opacity-70" : ""}`}
              >
                {youtubeChecking ? "YouTube..." : "YouTube"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
