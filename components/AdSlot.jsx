import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "../lib/adSlots";

export default function AdSlot({
  slot = "",
  label = "Sponsorlu",
  className = "",
  minHeight = 90,
  format = "auto",
  layoutKey = "",
}) {
  const adRef = useRef(null);
  const enabled = Boolean(ADSENSE_CLIENT && slot);
  const resolvedFormat = format === "fluid" && !layoutKey ? "auto" : format;
  const slotRenderKey = `${slot}:${resolvedFormat}:${layoutKey || "-"}`;

  useEffect(() => {
    if (!enabled) return;
    if (!adRef.current) return;
    if (adRef.current.dataset.loadedKey === slotRenderKey) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adRef.current.dataset.loadedKey = slotRenderKey;
    } catch (error) {
      // Keep the slot visible even when ad network fails.
      console.warn("[ads] slot render failed", error);
    }
  }, [enabled, slotRenderKey]);

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
          key={slotRenderKey}
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: Math.max(60, minHeight - 24) }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={resolvedFormat}
          {...(resolvedFormat === "fluid" && layoutKey
            ? { "data-ad-layout-key": layoutKey }
            : {})}
          data-full-width-responsive="true"
        />
      ) : (
        <div
          className="w-full rounded-lg border border-dashed border-white/20 bg-black/20 flex items-center justify-center text-xs text-white/40"
          style={{ minHeight: Math.max(60, minHeight - 24) }}
        >
          Reklam alanı (AdSense slotu bekleniyor)
        </div>
      )}
    </div>
  );
}
