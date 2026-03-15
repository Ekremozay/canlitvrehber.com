import { useState } from "react";
import Header from "../components/Header";
import ChannelCard from "../components/ChannelCard";
import AdSlot from "../components/AdSlot";
import SeoHead from "../components/SeoHead";
import { CHANNELS } from "../lib/channels";
import { AD_SLOTS } from "../lib/adSlots";

export default function Favorites({ favorites, toggleFavorite }) {
  const [search, setSearch] = useState("");

  const favChannels = CHANNELS.filter(
    (channel) =>
      favorites.includes(channel.id) &&
      channel.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <SeoHead
        title="Favori Kanallar"
        description="Favori canli TV kanallarini kaydet, tek ekrandan hizli ac ve yayina hemen ulas."
        path="/favorites"
      />

      <div className="min-h-screen bg-bg flex flex-col">
        <Header search={search} onSearch={setSearch} favCount={favorites.length} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AdSlot
            slot={AD_SLOTS.favoritesLeaderboard}
            label="Favori Sayfasi Ust Reklam"
            minHeight={110}
            className="mb-4"
          />

          <div className="flex items-baseline gap-3 mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight">Favori Kanallar</h1>
            <span className="text-sm text-white/30 font-medium">{favChannels.length} kanal</span>
          </div>

          {favChannels.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center rounded-2xl border border-white/10 bg-surface/40">
              <div className="text-5xl mb-4">-</div>
              <h3 className="text-lg font-bold mb-2">Henuz favori kanal yok</h3>
              <p className="text-sm text-white/40 max-w-md px-4">
                Kanal kartlarindaki favori butonuna basarak bu listeyi doldurabilirsin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {favChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isFav={true}
                  onToggleFav={toggleFavorite}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
