import { CARD_DEFINITIONS, type CardValue } from "@/lib/games/love-letter/data/cards";

// Pilha de descarte — pública para todos. Mostra as cartas já jogadas na ordem.
export function DiscardPile({ discardPile }: { discardPile: CardValue[] }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <h2 className="mb-2 font-semibold">Descarte</h2>
      {discardPile.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma carta descartada ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {discardPile.map((c, i) => (
            <span
              key={i}
              title={CARD_DEFINITIONS[c].name}
              className="flex h-8 min-w-8 items-center justify-center rounded border border-gray-300 bg-gray-50 px-1 text-sm"
            >
              {c}
              <span className="ml-1 text-xs text-gray-500">{CARD_DEFINITIONS[c].name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
