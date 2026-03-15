import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "../lib/adSlots";

export default function AdSlot({
  slot = "",
  label = "Sponsorlu",
  className = "",
  minHeight = 90,
  format = "auto",
}) {
  const adRef = useRef(null);
  const enabled = Boolean(ADSENSE_CLIENT && slot);

  useEffect(() => {
    if (!enabled) return;
    if (!adRef.current) return;
    if (adRef.current.dataset.loaded === "true") return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adRef.current.dataset.loaded = "true";
    } catch (error) {
      // Keep the slot visible even when ad network fails.
      console.warn("[ads] slot render failed", error);
    }
  }, [enabled, slot]);

  return (
    <div
      className={`rounded-xl border border-white/10 bg-surface/50 p-2.5 ${className}`}
      style={{ minHeight }}
    >
      <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2 px-1">
        {label}
      </div>

      {enabled ? (
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: Math.max(60, minHeight - 24) }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        <div
          className="w-full rounded-lg border border-dashed border-white/20 bg-black/20 flex items-center justify-center text-xs text-white/40"
          style={{ minHeight: Math.max(60, minHeight - 24) }}
        >
          Reklam alani (AdSense slot bekleniyor)
        </div>
      )}
    </div>
  );
}

