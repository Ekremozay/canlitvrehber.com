import "../styles/globals.css";
import { useState, useCallback, useEffect } from "react";
import { ADSENSE_CLIENT } from "../lib/adSlots";
import {
  FAVORITES_STORAGE_KEY,
  RECENTLY_WATCHED_STORAGE_KEY,
  normalizeFavoriteIds,
  normalizeRecentlyWatched,
  readStoredJson,
  upsertRecentlyWatched,
  writeStoredJson,
} from "../lib/personalization";

// Favori ve izleme gecmisi state'ini tum sayfalarda paylasiyoruz.
export default function App({ Component, pageProps }) {
  const [favorites, setFavorites] = useState([]);
  const [recentlyWatched, setRecentlyWatched] = useState([]);

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const recordWatch = useCallback((id) => {
    setRecentlyWatched((prev) => upsertRecentlyWatched(prev, id));
  }, []);

  useEffect(() => {
    setFavorites(normalizeFavoriteIds(readStoredJson(FAVORITES_STORAGE_KEY, [])));
    setRecentlyWatched(
      normalizeRecentlyWatched(readStoredJson(RECENTLY_WATCHED_STORAGE_KEY, []))
    );
  }, []);

  useEffect(() => {
    writeStoredJson(FAVORITES_STORAGE_KEY, normalizeFavoriteIds(favorites));
  }, [favorites]);

  useEffect(() => {
    writeStoredJson(
      RECENTLY_WATCHED_STORAGE_KEY,
      normalizeRecentlyWatched(recentlyWatched)
    );
  }, [recentlyWatched]);

  useEffect(() => {
    if (!ADSENSE_CLIENT) return;
    const scriptId = "adsense-script";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(script);
  }, []);

  return (
    <Component
      {...pageProps}
      favorites={favorites}
      recentlyWatched={recentlyWatched}
      toggleFavorite={toggleFavorite}
      recordWatch={recordWatch}
    />
  );
}
