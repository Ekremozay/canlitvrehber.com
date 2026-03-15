import "../styles/globals.css";
import { useState, useCallback, useEffect } from "react";
import { ADSENSE_CLIENT } from "../lib/adSlots";

// Favori state'ini tüm sayfalarda paylaşmak için App level'da tutuyoruz
export default function App({ Component, pageProps }) {
  const [favorites, setFavorites] = useState([]);

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

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
    <>
      <Component
        {...pageProps}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
      />
    </>
  );
}
