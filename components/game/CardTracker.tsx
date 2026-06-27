"use client";

import {
  ALL_CARD_VALUES,
  CARD_DEFINITIONS,
  type CardValue,
} from "@/lib/games/love-letter/data/cards";

// Contador AUTOMÁTICO de cartas. Como a pilha de descarte é pública (e as
// cartas de quem é eliminado também vão para lá), dá para deduzir quantas
// cópias de cada carta ainda podem estar em jogo: total − quantas já saíram.
// Nada de clicar — atualiza sozinho a cada jogada. Carta com 0 fica riscada.
export function CardTracker({ discardPile }: { discardPile: CardValue[] }) {
  const seen = (v: CardValue) => discardPile.filter((c) => c === v).length;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <h2 className="mb-1 text-sm font-semibold text-gray-200">Cartas restantes</h2>
      <p className="mb-2 text-xs text-gray-400">
        Quantas cópias de cada carta ainda podem estar em jogo (calculado pelo
        descarte).
      </p>
      <ul className="grid grid-cols-2 gap-1">
        {ALL_CARD_VALUES.map((v) => {
          const def = CARD_DEFINITIONS[v];
          const left = def.count - seen(v);
          const gone = left <= 0;
          return (
            <li
              key={v}
              className={`flex items-center justify-between rounded-lg px-2 py-1 ${
                gone ? "opacity-40" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-white">
                  {v}
                </span>
                <span className={`text-sm ${gone ? "text-gray-400 line-through" : "text-gray-200"}`}>
                  {def.name}
                </span>
              </span>
              <span className="font-mono text-sm text-gray-300">
                {Math.max(0, left)}/{def.count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
