import { useEffect, useMemo, useRef, useState } from "react";

let iframeApiPromise = null;

function loadIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no_window"));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (iframeApiPromise) {
    return iframeApiPromise;
  }

  iframeApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("iframe_api_load_failed"));
      document.head.appendChild(script);
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      resolve(window.YT);
    };

    window.setTimeout(() => {
      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }
      reject(new Error("iframe_api_timeout"));
    }, 12000);
  });

  return iframeApiPromise;
}

function getErrorLabel(code) {
  if (code === 101 || code === 150) {
    return "Bu film telif veya yayin politikasi nedeniyle sayfa icinde oynatilamiyor.";
  }

  if (code === 100) {
    return "Video su anda kullanilamiyor.";
  }

  return "YouTube oynatici baslatilamadi.";
}

export default function YouTubeMoviePlayer({
  videoId,
  title,
  watchUrl,
  fallbackWatchUrl = "",
  fallbackLabel = "",
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const [errorCode, setErrorCode] = useState(0);
  const [loading, setLoading] = useState(true);

  const playerVars = useMemo(() => {
    if (typeof window === "undefined") return {};

    return {
      autoplay: 1,
      mute: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      enablejsapi: 1,
      origin: window.location.origin,
    };
  }, []);

  useEffect(() => {
    let active = true;

    setErrorCode(0);
    setLoading(true);

    loadIframeApi()
      .then((YT) => {
        if (!active || !containerRef.current) return;

        if (playerRef.current) {
          playerRef.current.destroy();
        }

        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars,
          events: {
            onReady: (event) => {
              if (!active) return;
              setLoading(false);
              event.target.playVideo?.();
            },
            onError: (event) => {
              if (!active) return;
              setLoading(false);
              setErrorCode(Number(event?.data || 0));
            },
          },
        });
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setErrorCode(-1);
      });

    return () => {
      active = false;
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [playerVars, videoId]);

  useEffect(() => {
    if (!errorCode) return undefined;

    const targetUrl = fallbackWatchUrl || watchUrl;

    redirectTimerRef.current = window.setTimeout(() => {
      window.location.assign(targetUrl);
    }, 1200);

    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [errorCode, fallbackWatchUrl, watchUrl]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[32px] border border-white/10 bg-black">
      <div ref={containerRef} className="h-full w-full" />

      {loading && !errorCode && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/72 px-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/10 border-t-accent" />
          <div className="mt-4 text-base font-bold text-white">Film hazirlaniyor</div>
          <p className="mt-2 text-xs text-white/55">YouTube oynatici yukleniyor.</p>
        </div>
      )}

      {Boolean(errorCode) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/84 px-6 text-center">
          <div className="text-base font-bold text-[#f6d18e]">Sayfa icinde baslatilamadi</div>
          <p className="mt-2 max-w-md text-xs leading-6 text-white/60">{getErrorLabel(errorCode)}</p>
          <p className="mt-2 text-[11px] font-semibold text-accent/80">
            {fallbackWatchUrl
              ? "Seni uygun YouTube videosuna yonlendiriyoruz."
              : "Seni dogrudan YouTube sayfasina yonlendiriyoruz."}
          </p>
          <a
            href={fallbackWatchUrl || watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black no-underline transition hover:brightness-110"
          >
            {fallbackLabel || "YouTube'da izle"}
          </a>
          <p className="mt-3 text-[11px] text-white/35">{title}</p>
        </div>
      )}
    </div>
  );
}
