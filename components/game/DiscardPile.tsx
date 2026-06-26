import type { CardValue } from "@/lib/games/love-letter/data/cards";
import { CardFace } from "./CardFace";

// Pilha de descarte — pública para todos. Mostra as cartas já jogadas na ordem.
export function DiscardPile({ discardPile }: { discardPile: CardValue[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <h2 className="mb-2 text-sm font-semibold text-gray-300">Descarte</h2>
      {discardPile.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma carta descartada ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {discardPile.map((c, i) => (
            <CardFace key={i} value={c} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
