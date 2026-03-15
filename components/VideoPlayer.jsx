import { useRef, useState, useEffect, useCallback, useMemo } from "react";
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
  hasYoutubePlayback,
} from "../lib/channelPlayback";

const PERFORMANCE_MODE_LABELS = {
  performance: "Performans",
  balanced: "Dengeli",
  quality: "Yuksek Kalite",
};

const IMAGE_MODE_LABELS = {
  standard: "Standart",
  clear: "Net",
  vivid: "Canli",
};

const IMAGE_FILTERS = {
  standard: "none",
  clear: "contrast(1.08) saturate(1.06)",
  vivid: "contrast(1.12) saturate(1.14) brightness(1.02)",
};

const EMPTY_YOUTUBE_STATE = {
  status: "unavailable",
  available: false,
  embedUrl: "",
  watchUrl: "",
  title: "",
  reason: "",
};

export default function VideoPlayer({ channel }) {
  const videoRef = useRef(null);
  const hideTimer = useRef(null);

  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [performanceMode, setPerformanceMode] = useState("balanced");
  const [imageMode, setImageMode] = useState("standard");
  const [selectedPlayer, setSelectedPlayer] = useState("internal");
  const [youtubeState, setYoutubeState] = useState(EMPTY_YOUTUBE_STATE);

  const internalPlaybackAllowed = canUseInternalStream(channel);
  const blockedByPolicy = isBlockedBySafeMode(channel);
  const youtubeLiveLink = getYoutubeLiveLink(channel);
  const officialLiveLink = getOfficialLiveLink(channel);
  const hasYoutubeCandidate = hasYoutubePlayback(channel);

  const streamOptions = useMemo(() => {
    if (!internalPlaybackAllowed) return [];
    return getChannelStreamOptions(channel);
  }, [channel, internalPlaybackAllowed]);

  const [selectedSourceId, setSelectedSourceId] = useState(streamOptions[0]?.id || "");

  useEffect(() => {
    setSelectedSourceId(streamOptions[0]?.id || "");
  }, [channel.id, streamOptions]);

  useEffect(() => {
    setSelectedPlayer(internalPlaybackAllowed ? "internal" : hasYoutubeCandidate ? "youtube" : "internal");
    setShowQuality(false);
    setYoutubeState(
      hasYoutubeCandidate
        ? {
            status: "checking",
            available: false,
            embedUrl: "",
            watchUrl: "",
            title: "",
            reason: "",
          }
        : EMPTY_YOUTUBE_STATE
    );
  }, [channel.id, internalPlaybackAllowed, hasYoutubeCandidate]);

  useEffect(() => {
    if (!youtubeLiveLink?.url) {
      setYoutubeState(EMPTY_YOUTUBE_STATE);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setYoutubeState((prev) => ({
      ...prev,
      status: "checking",
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
            status: "ready",
            available: true,
            embedUrl: payload.embedUrl,
            watchUrl: payload.watchUrl || youtubeLiveLink.url,
            title: payload.title || "",
            reason: "",
          });

          if (!internalPlaybackAllowed) {
            setSelectedPlayer("youtube");
          }

          return;
        }

        setYoutubeState({
          status: "unavailable",
          available: false,
          embedUrl: "",
          watchUrl: youtubeLiveLink.url,
          title: payload.title || "",
          reason: payload.reason || "live_not_found",
        });
      })
      .catch((error) => {
        if (!active || error?.name === "AbortError") return;

        setYoutubeState({
          status: "error",
          available: false,
          embedUrl: "",
          watchUrl: youtubeLiveLink.url,
          title: "",
          reason: error?.message || "youtube_status_failed",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [channel.id, youtubeLiveLink?.url, internalPlaybackAllowed]);

  const orderedCandidates = useMemo(() => {
    if (streamOptions.length === 0) return [];
    const selectedIndex = Math.max(
      0,
      streamOptions.findIndex((item) => item.id === selectedSourceId)
    );
    const selected = streamOptions[selectedIndex];
    const rest = streamOptions.filter((item, idx) => idx !== selectedIndex);
    return [selected.url, ...rest.map((item) => item.url)];
  }, [streamOptions, selectedSourceId]);

  const internalCandidates = selectedPlayer === "internal" ? orderedCandidates : [];
  const selectedSource =
    streamOptions.find((item) => item.id === selectedSourceId) || streamOptions[0] || null;

  const {
    status,
    qualities,
    currentQuality,
    changeQuality,
    sourceIndex,
    sourceCount,
  } = useHlsPlayer(videoRef, internalCandidates, { autoplay: true, performanceMode });

  const youtubeReady = youtubeState.status === "ready" && Boolean(youtubeState.embedUrl);
  const youtubeChecking = youtubeState.status === "checking";
  const youtubeFailed = youtubeState.status === "unavailable" || youtubeState.status === "error";

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = muted ? 0 : volume / 100;
    videoRef.current.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || status !== "playing" || selectedPlayer !== "internal") return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing, status, selectedPlayer]);

  useEffect(() => {
    if (selectedPlayer !== "internal") return;
    if ((status === "error" || status === "unavailable") && youtubeReady) {
      setSelectedPlayer("youtube");
    }
  }, [selectedPlayer, status, youtubeReady]);

  const handleMouseMove = useCallback(() => {
    setShowUI(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUI(false), 3500);
  }, []);

  const toggleFullscreen = () => {
    const el = document.querySelector("[data-player-wrap]");
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const qualityLabel = (level) => {
    if (!level) return "Otomatik";
    if (level.height) return `${level.height}p`;
    if (level.bitrate) return `${Math.round(level.bitrate / 1000)}k`;
    return "Otomatik";
  };

  const topLabel =
    selectedPlayer === "youtube"
      ? youtubeState.title || "YouTube Canli"
      : status === "playing"
        ? currentQuality === -1
          ? `${PERFORMANCE_MODE_LABELS[performanceMode]}`
          : qualityLabel(qualities[currentQuality])
        : "-";

  const showInternalOverlay = selectedPlayer === "internal";
  const showYoutubeFrame = selectedPlayer === "youtube" && youtubeReady;

  return (
    <div
      data-player-wrap
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowUI(false)}
      className="relative w-full aspect-video max-h-[72vh] bg-black overflow-hidden rounded-2xl border border-white/10"
      style={{ cursor: showUI ? "default" : "none" }}
    >
      {showYoutubeFrame ? (
        <iframe
          src={youtubeState.embedUrl}
          title={`${channel.name} YouTube Canli`}
          className="w-full h-full bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          style={{ filter: IMAGE_FILTERS[imageMode] }}
          playsInline
          onClick={() => setPlaying((prev) => !prev)}
        />
      )}

      {showInternalOverlay && status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 z-10">
          <div className="w-10 h-10 border-[3px] border-white/10 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-white/60 mt-3.5">
            Yayin aciliyor {sourceCount > 1 ? `(${sourceIndex + 1}/${sourceCount})` : ""}
          </span>
        </div>
      )}

      {selectedPlayer === "youtube" && youtubeChecking && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10 px-6 text-center">
          <div className="w-10 h-10 border-[3px] border-white/10 border-t-accent rounded-full animate-spin" />
          <div className="text-base font-bold text-white mt-4">YouTube canli yayin kontrol ediliyor</div>
          <p className="text-xs text-white/50 mt-2">Canli yayin bulunursa ayni sayfada player acilacak</p>
        </div>
      )}

      {showInternalOverlay && status === "error" && !youtubeReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10 px-6 text-center">
          <div className="text-4xl mb-2">!</div>
          <div className="text-base font-bold text-red-400">Yayin su an acilamadi</div>
          <p className="text-xs text-white/50 mt-2 mb-4">
            {youtubeChecking
              ? "Dahili kaynak hata verdi. YouTube canli yedegi kontrol ediliyor..."
              : "Farkli bir kaynak secin veya daha sonra tekrar deneyin"}
          </p>
          {youtubeChecking && (
            <div className="text-xs text-emerald-300 mb-3">YouTube player hazirsa otomatik gecilecek</div>
          )}
          {officialLiveLink?.url && (
            <a
              href={officialLiveLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 rounded-xl bg-accent text-black text-sm font-bold hover:brightness-110 transition no-underline mb-2"
            >
              Resmi Canli Ac
            </a>
          )}
          {youtubeLiveLink?.url && (
            <a
              href={youtubeLiveLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition no-underline mb-2"
            >
              YouTube'da Ac
            </a>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-semibold hover:bg-accent hover:text-black hover:border-accent transition"
          >
            Yeniden Dene
          </button>
        </div>
      )}

      {showInternalOverlay && status === "unavailable" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10 px-6 text-center gap-2.5">
          {blockedByPolicy && SAFE_MODE_ENABLED && (
            <div className="max-w-md rounded-xl border border-amber-400/40 bg-amber-300/10 px-4 py-2 text-xs text-amber-200">
              Bu kanal dahili playerda Guvenli Mod nedeniyle kapali.
            </div>
          )}

          {youtubeChecking && (
            <div className="max-w-md rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-200">
              YouTube canli player kontrol ediliyor.
            </div>
          )}

          {youtubeReady && (
            <button
              onClick={() => setSelectedPlayer("youtube")}
              className="px-5 py-2.5 rounded-xl border border-emerald-400/35 bg-emerald-400/15 text-emerald-100 text-sm font-bold hover:bg-emerald-400/25 transition"
            >
              YouTube Player'a Gec
            </button>
          )}

          {officialLiveLink && (
            <a
              href={officialLiveLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-accent text-black text-sm font-bold hover:brightness-110 transition no-underline"
            >
              Resmi Canli Ac
            </a>
          )}

          {youtubeLiveLink && !youtubeReady && (
            <a
              href={youtubeLiveLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition no-underline"
            >
              YouTube Canli Ac
            </a>
          )}

          {!officialLiveLink && !youtubeLiveLink && (
            <div className="text-sm text-white/70">Canli kaynak bulunamadi</div>
          )}
        </div>
      )}

      {selectedPlayer === "youtube" && youtubeFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10 px-6 text-center gap-2.5">
          <div className="text-base font-bold text-red-400">YouTube canli yedegi bulunamadi</div>
          <p className="text-xs text-white/50 max-w-md">
            Bu kanal icin YouTube tarafinda aktif embed edilebilir canli yayin bulunamadi.
          </p>
          {internalPlaybackAllowed && (
            <button
              onClick={() => setSelectedPlayer("internal")}
              className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition"
            >
              Dahili Player'a Don
            </button>
          )}
          {officialLiveLink?.url && (
            <a
              href={officialLiveLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-accent text-black text-sm font-bold hover:brightness-110 transition no-underline"
            >
              Resmi Canli Ac
            </a>
          )}
        </div>
      )}

      <div
        className="absolute top-0 inset-x-0 px-5 py-4 flex justify-between items-center z-20 transition-opacity duration-300"
        style={{
          opacity: showUI ? 1 : 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%)",
          pointerEvents: showUI ? "auto" : "none",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 bg-danger/15 border border-danger/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-danger tracking-widest font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            CANLI
          </span>
          <span className="text-sm font-bold truncate">{channel.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {(internalPlaybackAllowed || youtubeReady || youtubeChecking) && (
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/10 bg-black/35 p-1">
              {internalPlaybackAllowed && (
                <button
                  onClick={() => setSelectedPlayer("internal")}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                    selectedPlayer === "internal"
                      ? "bg-accent text-black"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Dahili
                </button>
              )}
              {(youtubeReady || youtubeChecking) && (
                <button
                  onClick={() => {
                    if (youtubeReady) setSelectedPlayer("youtube");
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                    selectedPlayer === "youtube" && youtubeReady
                      ? "bg-emerald-400 text-black"
                      : "text-white/70 hover:text-white"
                  } ${youtubeChecking ? "opacity-70 cursor-wait" : ""}`}
                >
                  {youtubeChecking ? "YouTube..." : "YouTube"}
                </button>
              )}
            </div>
          )}
          <span className="font-mono text-[11px] text-white/70 max-w-[180px] truncate">{topLabel}</span>
          {selectedPlayer === "internal" && selectedSource && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {selectedSource.label}
            </span>
          )}
          {selectedPlayer === "youtube" && youtubeReady && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-100 border border-emerald-400/25">
              YouTube Player
            </span>
          )}
        </div>
      </div>

      <div
        className="absolute bottom-0 inset-x-0 px-5 pb-4 pt-10 flex items-center justify-between z-20 transition-opacity duration-300"
        style={{
          opacity: showUI ? 1 : 0,
          background: "linear-gradient(0deg, rgba(0,0,0,0.86) 0%, transparent 100%)",
          pointerEvents: showUI ? "auto" : "none",
        }}
      >
        {selectedPlayer === "internal" ? (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaying((prev) => !prev)}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition"
              >
                {playing ? "||" : ">"}
              </button>

              <button
                onClick={() => setMuted((prev) => !prev)}
                className="text-white/70 hover:text-white transition p-1"
              >
                {muted ? "M" : volume > 50 ? "L" : "S"}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(false);
                }}
                className="w-20 h-[3px] accent-accent"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowQuality((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/80 text-xs font-semibold hover:bg-white/10 transition"
                >
                  Ayarlar
                </button>

                {showQuality && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[rgba(15,15,22,0.96)] border border-white/10 rounded-xl p-1.5 min-w-[220px] backdrop-blur-xl z-50 max-h-[60vh] overflow-auto">
                    <div className="px-3 py-2 text-[10px] text-white/40 font-bold tracking-wide">
                      YAYIN KAYNAGI
                    </div>
                    {streamOptions.length > 0 ? (
                      streamOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSelectedSourceId(option.id);
                            setShowQuality(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                            selectedSourceId === option.id
                              ? "bg-accent/10 text-accent"
                              : "text-white/60 hover:bg-white/5"
                          }`}
                        >
                          <div>{option.label}</div>
                          {option.sourceHost && (
                            <div className="text-[10px] text-white/35 mt-0.5">{option.sourceHost}</div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-white/45">Dahili kaynak bulunamadi</div>
                    )}

                    {(youtubeReady || youtubeChecking) && (
                      <>
                        <div className="mx-2 my-1 border-t border-white/10" />
                        <div className="px-3 py-2 text-[10px] text-white/40 font-bold tracking-wide">
                          OYNATICI
                        </div>
                        <button
                          onClick={() => {
                            if (youtubeReady) {
                              setSelectedPlayer("youtube");
                              setShowQuality(false);
                            }
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                            youtubeReady
                              ? "text-white/60 hover:bg-white/5"
                              : "text-white/35 cursor-wait"
                          }`}
                        >
                          {youtubeChecking ? "YouTube canli kontrol ediliyor" : "YouTube Player'a Gec"}
                        </button>
                      </>
                    )}

                    <div className="mx-2 my-1 border-t border-white/10" />

                    <div className="px-3 py-2 text-[10px] text-white/40 font-bold tracking-wide">
                      OYNATMA MODU
                    </div>
                    {Object.entries(PERFORMANCE_MODE_LABELS).map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setPerformanceMode(mode);
                          changeQuality(-1);
                        }}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                          performanceMode === mode && currentQuality === -1
                            ? "bg-accent/10 text-accent"
                            : "text-white/60 hover:bg-white/5"
                        }`}
                      >
                        {label}
                      </button>
                    ))}

                    <div className="mx-2 my-1 border-t border-white/10" />

                    <div className="px-3 py-2 text-[10px] text-white/40 font-bold tracking-wide">
                      GORUNTU MODU
                    </div>
                    {Object.entries(IMAGE_MODE_LABELS).map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => setImageMode(mode)}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                          imageMode === mode
                            ? "bg-accent/10 text-accent"
                            : "text-white/60 hover:bg-white/5"
                        }`}
                      >
                        {label}
                      </button>
                    ))}

                    {qualities.length > 0 && (
                      <>
                        <div className="mx-2 my-1 border-t border-white/10" />
                        <div className="px-3 py-2 text-[10px] text-white/40 font-bold tracking-wide">
                          COZUNURLUK
                        </div>
                        {[{ idx: -1, label: "Otomatik" }, ...qualities.map((q, idx) => ({ idx, label: qualityLabel(q) }))].map(
                          (item) => (
                            <button
                              key={item.idx}
                              onClick={() => changeQuality(item.idx)}
                              className={`w-full px-3 py-2 rounded-lg text-xs font-semibold text-left transition ${
                                currentQuality === item.idx
                                  ? "bg-accent/10 text-accent"
                                  : "text-white/60 hover:bg-white/5"
                              }`}
                            >
                              {item.idx === -1
                                ? `${PERFORMANCE_MODE_LABELS[performanceMode]} / Otomatik`
                                : item.label}
                            </button>
                          )
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition text-sm"
              >
                [ ]
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 text-xs font-bold">
                YouTube Canli Player
              </span>
              {internalPlaybackAllowed && (
                <button
                  onClick={() => setSelectedPlayer("internal")}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/80 text-xs font-semibold hover:bg-white/10 transition"
                >
                  Dahili'ye Don
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {youtubeState.watchUrl && (
                <a
                  href={youtubeState.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/80 text-xs font-semibold hover:bg-white/10 transition no-underline"
                >
                  YouTube'da Ac
                </a>
              )}
              <button
                onClick={toggleFullscreen}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition text-sm"
              >
                [ ]
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
