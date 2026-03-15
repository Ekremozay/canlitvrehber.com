import "../styles/globals.css";
import { useState, useCallback } from "react";
import Script from "next/script";
import { ADSENSE_CLIENT } from "../lib/adSlots";

// Favori state'ini tüm sayfalarda paylaşmak için App level'da tutuyoruz
export default function App({ Component, pageProps }) {
  const [favorites, setFavorites] = useState([]);

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  return (
    <>
      {ADSENSE_CLIENT && (
        <Script
          id="adsense-script"
          strategy="afterInteractive"
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        />
      )}
      <Component
        {...pageProps}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
      />
    </>
  );
}
