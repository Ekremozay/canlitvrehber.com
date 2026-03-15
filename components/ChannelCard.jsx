import Link from "next/link";
import { getChannelPlaybackType, isChannelPlayable } from "../lib/channelPlayback";
import { getCanliTvModeLabel, getCanliTvReference } from "../lib/canlitvReference";

export default function ChannelCard({ channel, isFav, onToggleFav }) {
  const hasStream = isChannelPlayable(channel);
  const playbackType = getChannelPlaybackType(channel);
  const reference = getCanliTvReference(channel);
  const initials = channel.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3);

  return (
    <div
      className="group relative bg-surface border border-white/[0.06] rounded-2xl p-5 flex flex-col
        hover:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        transition-all duration-300"
      style={{ animation: "fadeUp 0.5s ease both" }}
    >
      <div
        className="absolute inset-[-1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${channel.color}22, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3.5">
          <div
            className="w-13 h-13 rounded-[14px] flex items-center justify-center text-sm font-extrabold tracking-tight"
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
            onClick={(e) => {
              e.preventDefault();
              onToggleFav(channel.id);
            }}
            className="p-1 transition-transform hover:scale-110"
            style={{ color: isFav ? "#ff4757" : "rgba(255,255,255,0.2)" }}
          >
            {isFav ? "♥" : "♡"}
          </button>
        </div>

        <h3 className="text-[15px] font-bold tracking-tight mb-1">{channel.name}</h3>
        <p className="text-xs text-white/50 leading-relaxed mb-2.5">{channel.description}</p>

        <div className="flex flex-wrap items-center gap-2 mb-3.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono ${
              hasStream
                ? "bg-danger/10 border border-danger/25 text-danger"
                : "bg-white/5 border border-white/20 text-white/50"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasStream ? "bg-danger animate-pulse" : "bg-white/40"
              }`}
            />
            {hasStream
              ? playbackType === "youtube"
                ? "YOUTUBE"
                : "LIVE"
              : "KAYNAK YOK"}
          </span>

          {reference?.mode && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-amber-300/35 bg-amber-300/10 text-amber-100/85">
              Ref: {getCanliTvModeLabel(reference.mode)}
            </span>
          )}
        </div>

        <Link
          href={`/watch/${channel.id}`}
          className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white no-underline transition-all hover:brightness-110 hover:scale-[1.02]"
          style={{
            background: hasStream
              ? `linear-gradient(135deg, ${channel.color}, ${channel.color}bb)`
              : "linear-gradient(135deg, #4b5563, #374151)",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {hasStream ? (playbackType === "youtube" ? "YouTube Ile Izle" : "Izle") : "Kaynak Yok"}
        </Link>

        <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-14 transition-all duration-300 overflow-hidden">
          {channel.epg.slice(0, 2).map((e, i) => (
            <div key={i} className="flex gap-2 py-0.5 text-[11px]">
              <span
                className="font-mono font-semibold min-w-[38px]"
                style={{ color: channel.color }}
              >
                {e.time}
              </span>
              <span className="text-white/40">{e.show}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
