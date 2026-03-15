import Link from "next/link";
import { getCanliTvModeLabel, getCanliTvReference } from "../lib/canlitvReference";
import { getBasePlaybackStatus } from "../lib/playbackStatus";

export default function ChannelCard({ channel, isFav, onToggleFav, playable, playbackType }) {
  const basePlaybackStatus = getBasePlaybackStatus(channel);
  const hasStream = typeof playable === "boolean" ? playable : basePlaybackStatus.playable;
  const resolvedPlaybackType = playbackType || basePlaybackStatus.playbackType;
  const reference = getCanliTvReference(channel);
  const initials = channel.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 3);

  const playbackLabel = hasStream
    ? resolvedPlaybackType === "internal"
      ? "YAYIN"
      : resolvedPlaybackType === "youtube"
        ? "YOUTUBE"
        : "CANLI"
    : "HARİCİ";

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      style={{ animation: "fadeUp 0.5s ease both" }}
    >
      <div
        className="pointer-events-none absolute inset-[-1px] rounded-2xl opacity-0 transition-opacity duration-400 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${channel.color}22, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-3.5 flex items-start justify-between">
          <div
            className="flex h-13 w-13 items-center justify-center rounded-[14px] text-sm font-extrabold tracking-tight"
            style={{
              background: `linear-gradient(135deg, ${channel.color}25, ${channel.color}08)`,
              border: `1px solid ${channel.color}30`,
              color: channel.color,
              width: 52,
              height: 52,
            }}
          >
            {initials}
          </div>
          <button
            onClick={(event) => {
              event.preventDefault();
              onToggleFav(channel.id);
            }}
            className="p-1 transition-transform hover:scale-110"
            style={{ color: isFav ? "#ff4757" : "rgba(255,255,255,0.2)" }}
          >
            {isFav ? "♥" : "♡"}
          </button>
        </div>

        <h3 className="mb-1 text-[15px] font-bold tracking-tight">{channel.name}</h3>
        <p className="mb-2.5 text-xs leading-relaxed text-white/50">{channel.description}</p>

        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider font-mono ${
              hasStream
                ? "border border-danger/25 bg-danger/10 text-danger"
                : "border border-white/20 bg-white/5 text-white/50"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${hasStream ? "bg-danger animate-pulse" : "bg-white/40"}`}
            />
            {playbackLabel}
          </span>

          {reference?.mode && (
            <span className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-0.5 text-[10px] text-amber-100/85">
              Kaynak: {getCanliTvModeLabel(reference.mode)}
            </span>
          )}
        </div>

        <Link
          href={`/watch/${channel.id}`}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white no-underline transition-all hover:scale-[1.02] hover:brightness-110"
          style={{
            background: hasStream
              ? `linear-gradient(135deg, ${channel.color}, ${channel.color}bb)`
              : "linear-gradient(135deg, #4b5563, #374151)",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {hasStream ? "İzlemeye Başla" : "Detayı Aç"}
        </Link>

        <div className="mt-2.5 max-h-0 overflow-hidden border-t border-white/[0.06] pt-2.5 opacity-0 transition-all duration-300 group-hover:max-h-14 group-hover:opacity-100">
          {channel.epg.slice(0, 2).map((item, index) => (
            <div key={index} className="flex gap-2 py-0.5 text-[11px]">
              <span className="min-w-[38px] font-mono font-semibold" style={{ color: channel.color }}>
                {item.time}
              </span>
              <span className="text-white/40">{item.show}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
