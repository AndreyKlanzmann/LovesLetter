import { CARD_DEFINITIONS, type CardValue } from "@/lib/games/love-letter/data/cards";

// Visual reutilizável de uma carta. A cor por valor é só estética (mora aqui,
// não no motor) — um reskin futuro troca cores/arte sem tocar nas regras.
const CARD_COLORS: Record<CardValue, { ring: string; badge: string; tint: string }> = {
  1: { ring: "border-slate-300", badge: "bg-slate-600", tint: "from-slate-50" },
  2: { ring: "border-sky-300", badge: "bg-sky-600", tint: "from-sky-50" },
  3: { ring: "border-amber-300", badge: "bg-amber-600", tint: "from-amber-50" },
  4: { ring: "border-emerald-300", badge: "bg-emerald-600", tint: "from-emerald-50" },
  5: { ring: "border-indigo-300", badge: "bg-indigo-600", tint: "from-indigo-50" },
  6: { ring: "border-yellow-300", badge: "bg-yellow-600", tint: "from-yellow-50" },
  7: { ring: "border-rose-300", badge: "bg-rose-600", tint: "from-rose-50" },
  8: { ring: "border-fuchsia-300", badge: "bg-fuchsia-700", tint: "from-fuchsia-50" },
};

export function CardFace({
  value,
  size = "lg",
  showDescription = false,
}: {
  value: CardValue;
  size?: "sm" | "lg";
  showDescription?: boolean;
}) {
  const def = CARD_DEFINITIONS[value];
  const c = CARD_COLORS[value];

  if (size === "sm") {
    return (
      <div
        title={`${def.name} — ${def.description}`}
        className={`flex h-20 w-14 flex-col items-center justify-between rounded-md border ${c.ring} bg-gradient-to-b ${c.tint} to-white p-1 text-gray-800 shadow-sm`}
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${c.badge} text-xs font-bold text-white`}>
          {value}
        </span>
        <span className="pb-1 text-center text-[10px] font-semibold leading-tight">
          {def.name}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-44 w-32 flex-col rounded-xl border-2 ${c.ring} bg-gradient-to-b ${c.tint} to-white p-2 text-gray-800 shadow-md`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${c.badge} font-bold text-white`}>
          {value}
        </span>
      </div>
      <p className="mt-1 text-center text-sm font-bold">{def.name}</p>
      {showDescription && (
        <p className="mt-1 flex-1 overflow-hidden text-center text-[11px] leading-tight text-gray-600">
          {def.description}
        </p>
      )}
    </div>
  );
}
