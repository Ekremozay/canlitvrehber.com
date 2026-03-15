import { CATEGORIES } from "../lib/channels";

export default function CategoryMenu({ active, onChange }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold text-white/20 tracking-[2px] uppercase px-2 mb-2">
        Kategoriler
      </div>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition
            ${
              active === cat.id
                ? "bg-accent/10 text-accent"
                : "text-white/40 hover:text-white hover:bg-white/[0.03]"
            }`}
        >
          <span
            className={`inline-flex items-center justify-center min-w-[46px] px-2 py-1 rounded-md text-[10px] font-black tracking-[0.8px] leading-none border ${
              active === cat.id
                ? "border-accent/45 bg-accent/15 text-accent"
                : "border-white/15 bg-white/5 text-white/65"
            }`}
          >
            {cat.icon}
          </span>
          <span className="flex-1 text-left leading-tight">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
