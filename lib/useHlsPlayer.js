import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/**
 * HLS player hook with source failover.
 * @param {React.RefObject<HTMLVideoElement>} videoRef
 * @param {string|string[]} streamInput
 * @param {{ autoplay?: boolean, performanceMode?: "performance"|"balanced"|"quality" }} options
 */
export function useHlsPlayer(videoRef, streamInput, options = {}) {
  const { autoplay = true, performanceMode = "balanced" } = options;

  const streamList = useMemo(() => {
    if (Array.isArray(streamInput)) {
      return streamInput.filter(Boolean);
    }
    return streamInput ? [streamInput] : [];
  }, [streamInput]);

  const streamSignature = useMemo(() => streamList.join("||"), [streamList]);

  const hlsRef = useRef(null);
  const streamListRef = useRef(streamList);
  const sourceIndexRef = useRef(0);
  const performanceModeRef = useRef(performanceMode);

  const [status, setStatus] = useState("idle");
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [sourceIndex, setSourceIndex] = useState(0);

  const activeStream = streamList[sourceIndex] || "";

  useEffect(() => {
    streamListRef.current = streamList;
  }, [streamList]);

  useEffect(() => {
    sourceIndexRef.current = sourceIndex;
  }, [sourceIndex]);

  useEffect(() => {
    performanceModeRef.current = performanceMode;
  }, [performanceMode]);

  useEffect(() => {
    setSourceIndex(0);
    setCurrentQuality(-1);
    setQualities([]);
  }, [streamSignature]);

  const tryNextSource = useCallback(() => {
    const nextIndex = sourceIndexRef.current + 1;
    if (nextIndex >= streamListRef.current.length) {
      return false;
    }

    setStatus("loading");
    setSourceIndex(nextIndex);
    return true;
  }, []);

  const applyAutoLevelCap = useCallback((mode) => {
    const hls = hlsRef.current;
    if (!hls || !hls.levels?.length) return;

    const maxHeightByMode = {
      performance: 480,
      balanced: 720,
      quality: Infinity,
    };

    const maxHeight = maxHeightByMode[mode] ?? 720;
    if (!Number.isFinite(maxHeight)) {
      hls.autoLevelCapping = -1;
      return;
    }

    let capIndex = -1;
    hls.levels.forEach((level, index) => {
      if ((level.height || 0) <= maxHeight) {
        capIndex = index;
      }
    });

    hls.autoLevelCapping = capIndex;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!activeStream) {
      setStatus("unavailable");
      return;
    }

    setStatus("loading");

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeStream;

      const onLoaded = () => setStatus("playing");
      const onError = () => {
        if (!tryNextSource()) {
          setStatus("error");
        }
      };

      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("error", onError);

      if (autoplay) video.play().catch(() => {});

      return () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onError);
      };
    }

    const Hls = require("hls.js");
    if (!Hls.default.isSupported()) {
      setStatus("error");
      return;
    }

    const hls = new Hls.default({
      enableWorker: true,
      lowLatencyMode: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      debug: process.env.NODE_ENV === "development",
    });

    hls.loadSource(activeStream);
    hls.attachMedia(video);

    hls.on(Hls.default.Events.MANIFEST_PARSED, (event, data) => {
      setStatus("playing");
      setQualities(hls.levels || []);
      setCurrentQuality(-1);
      applyAutoLevelCap(performanceModeRef.current);
      if (autoplay) video.play().catch(() => {});
      console.log(`[HLS] Manifest parsed - ${data.levels.length} levels`);
    });

    hls.on(Hls.default.Events.LEVEL_SWITCHED, (event, data) => {
      setCurrentQuality(data.level);
    });

    hls.on(Hls.default.Events.ERROR, (event, data) => {
      if (!data.fatal) return;

      if (tryNextSource()) {
        hls.destroy();
        return;
      }

      switch (data.type) {
        case Hls.default.ErrorTypes.NETWORK_ERROR:
          hls.startLoad();
          break;
        case Hls.default.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          setStatus("error");
          hls.destroy();
          break;
      }
    });

    hlsRef.current = hls;

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoRef, activeStream, autoplay, tryNextSource, applyAutoLevelCap]);

  useEffect(() => {
    if (currentQuality === -1) {
      applyAutoLevelCap(performanceMode);
    }
  }, [performanceMode, currentQuality, applyAutoLevelCap]);

  const changeQuality = useCallback(
    (level) => {
      const hls = hlsRef.current;
      if (!hls) return;

      hls.currentLevel = level;
      setCurrentQuality(level);

      if (level === -1) {
        applyAutoLevelCap(performanceModeRef.current);
      } else {
        hls.autoLevelCapping = -1;
      }
    },
    [applyAutoLevelCap]
  );

  return {
    status,
    qualities,
    currentQuality,
    changeQuality,
    hlsInstance: hlsRef.current,
    sourceIndex,
    sourceCount: streamList.length,
  };
}
