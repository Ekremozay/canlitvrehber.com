import { useEffect, useRef, useState } from "react";
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
  const observerRef = useRef(null);
  const enabled = Boolean(ADSENSE_CLIENT && slot);
  const resolvedFormat = format === "fluid" && !layoutKey ? "auto" : format;
  const slotRenderKey = `${slot}:${resolvedFormat}:${layoutKey || "-"}`;
  const [slotState, setSlotState] = useState(enabled ? "loading" : "hidden");

  useEffect(() => {
    setSlotState(enabled ? "loading" : "hidden");
  }, [enabled, slotRenderKey]);

  useEffect(() => {
    if (!enabled) return;
    if (!adRef.current) return;
    const node = adRef.current;
    if (node.dataset.loadedKey === slotRenderKey) return;

    const updateState = () => {
      const status = node.getAttribute("data-ad-status");
      if (status === "filled") {
        setSlotState("filled");
        return;
      }
      if (status === "unfilled") {
        setSlotState("hidden");
      }
    };

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    observerRef.current = new MutationObserver(updateState);
    observerRef.current.observe(node, {
      attributes: true,
      attributeFilter: ["data-ad-status", "style"],
    });

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      node.dataset.loadedKey = slotRenderKey;
    } catch (error) {
      console.warn("[ads] slot render failed", error);
      setSlotState("hidden");
    }

    const timeout = window.setTimeout(() => {
      updateState();
      const status = node.getAttribute("data-ad-status");
      if (!status || status === "unfilled") {
        setSlotState("hidden");
      }
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [enabled, slotRenderKey]);

  if (!enabled || slotState === "hidden") {
    return null;
  }

  return (
    <div
      className={`overflow-hidden rounded-xl ${className} ${
        slotState === "filled"
          ? "border border-white/10 bg-surface/50 p-2.5 opacity-100"
          : "border border-transparent bg-transparent p-0 opacity-0 pointer-events-none"
      }`}
      style={{
        minHeight: slotState === "filled" ? minHeight : 0,
        maxHeight: slotState === "filled" ? "none" : 0,
      }}
    >
      {slotState === "filled" && (
        <div className="mb-2 px-1 text-[10px] uppercase tracking-wider text-white/30">
          {label}
        </div>
      )}

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
    </div>
  );
}
