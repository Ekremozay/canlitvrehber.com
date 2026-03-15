import Link from "next/link";
import { getCanliTvModeLabel, getCanliTvReference } from "../lib/canlitvReference";
import { getBasePlaybackStatus } from "../lib/playbackStatus";

function prettyCategory(category) {
  const map = {
    general: "Genel",
    news: "Haber",
    sports: "Spor",
    kids: "Çocuk",
    documentary: "Belgesel",
    religious: "Dini",
    local: "Yerel",
    commercial: "Ticari",
  };
  return map[category] || category;
}

export default function ChannelListItem({ channel, isFav, onToggleFav, playable, playbackType }) {
  const basePlaybackStatus = getBasePlaybackStatus(channel);
  const hasStream = typeof playable === "boolean" ? playable : basePlaybackStatus.playable;
  const resolvedPlaybackType = playbackType || basePlaybackStatus.playbackType;
  const reference = getCanliTvReference(channel);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface/40 px-3.5 py-3 transition hover:bg-surface/70 sm:flex-nowrap flex-wrap">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-black"
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
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold text-white">{channel.name}</h3>
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/60">
            {prettyCategory(channel.category)}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              hasStream
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-white/20 bg-white/5 text-white/45"
            }`}
          >
            {hasStream
              ? resolvedPlaybackType === "internal"
                ? "Yayın"
                : resolvedPlaybackType === "youtube"
                  ? "YouTube"
                  : "Canlı"
              : "Harici"}
          </span>
          {reference?.mode && (
            <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-0.5 text-[10px] text-amber-100/85">
              Kaynak: {getCanliTvModeLabel(reference.mode)}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-white/45">
          {channel.country ? `${channel.country} - ` : ""}
          {channel.description}
        </p>
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
        <button
          onClick={() => onToggleFav(channel.id)}
          className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {isFav ? "Favoride" : "Ekle"}
        </button>

        <Link
          href={`/watch/${channel.id}`}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold no-underline transition ${
            hasStream
              ? "bg-accent text-black hover:brightness-110"
              : "bg-white/10 text-white/70 hover:bg-white/15"
          }`}
        >
          {hasStream ? "İzle" : "Detay"}
        </Link>
      </div>
    </div>
  );
}
