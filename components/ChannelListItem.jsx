import Link from "next/link";
import { getChannelPlaybackType, isChannelPlayable } from "../lib/channelPlayback";
import { getCanliTvModeLabel, getCanliTvReference } from "../lib/canlitvReference";

function prettyCategory(category) {
  const map = {
    general: "Genel",
    news: "Haber",
    sports: "Spor",
    kids: "Cocuk",
    documentary: "Belgesel",
    religious: "Dini",
    local: "Yerel",
    commercial: "Ticari",
  };
  return map[category] || category;
}

export default function ChannelListItem({ channel, isFav, onToggleFav, playable, playbackType }) {
  const hasStream = typeof playable === "boolean" ? playable : isChannelPlayable(channel);
  const resolvedPlaybackType = playbackType || getChannelPlaybackType(channel);
  const reference = getCanliTvReference(channel);

  return (
    <div className="rounded-xl border border-white/10 bg-surface/40 px-3.5 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap hover:bg-surface/70 transition">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black"
        style={{
          color: channel.color,
          background: `${channel.color}20`,
          border: `1px solid ${channel.color}55`,
        }}
      >
        {channel.name
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-white truncate">{channel.name}</h3>
          <span className="px-2 py-0.5 rounded-full border border-white/15 text-[10px] text-white/60">
            {prettyCategory(channel.category)}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              hasStream
                ? "border-accent/40 text-accent bg-accent/10"
                : "border-white/20 text-white/45 bg-white/5"
            }`}
          >
            {hasStream
              ? resolvedPlaybackType === "youtube"
                ? "YouTube"
                : "Canli"
              : "Harici"}
          </span>
          {reference?.mode && (
            <span className="px-2 py-0.5 rounded-full border border-amber-300/35 bg-amber-300/10 text-[10px] text-amber-100/85">
              Ref: {getCanliTvModeLabel(reference.mode)}
            </span>
          )}
        </div>
        <p className="text-xs text-white/45 mt-1 truncate">
          {channel.country ? `${channel.country} - ` : ""}
          {channel.description}
        </p>
      </div>

      <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-end gap-2">
        <button
          onClick={() => onToggleFav(channel.id)}
          className="px-2.5 py-1.5 rounded-lg text-xs border border-white/20 text-white/70 hover:text-white hover:bg-white/10 transition"
        >
          {isFav ? "Favori" : "Ekle"}
        </button>

        <Link
          href={`/watch/${channel.id}`}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold no-underline transition ${
            hasStream
              ? "bg-accent text-black hover:brightness-110"
              : "bg-white/10 text-white/70 hover:bg-white/15"
          }`}
        >
          {hasStream ? (resolvedPlaybackType === "youtube" ? "YouTube" : "Izle") : "Ac"}
        </Link>
      </div>
    </div>
  );
}
