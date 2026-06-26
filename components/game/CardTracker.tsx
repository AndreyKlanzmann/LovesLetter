"use client";

import { useEffect, useState } from "react";
import {
  ALL_CARD_VALUES,
  CARD_DEFINITIONS,
  type CardValue,
} from "@/lib/games/love-letter/data/cards";

// "Colinha" pessoal de contagem de cartas. É TOTALMENTE local (cada jogador
// tem a sua, não é compartilhada nem sincronizada) e fica salva no navegador
// por sala, então sobrevive a um F5. Clique numa carta para marcar que saiu
// uma cópia (−1); quando zera, fica riscada. Os botõezinhos +/− ajustam e o
// "Reiniciar" volta tudo ao baralho cheio.

function fullCounts(): Record<number, number> {
  return Object.fromEntries(
    ALL_CARD_VALUES.map((v) => [v, CARD_DEFINITIONS[v].count])
  );
}

export function CardTracker({ roomId, round }: { roomId: string; round: number }) {
  const storageKey = `ll-tracker-${roomId}`;

  // Inicializa já lendo o localStorage (este componente só é montado no
  // client — a tela mostra "Carregando partida..." no servidor — então não há
  // risco de mismatch de hidratação).
  const [remaining, setRemaining] = useState<Record<number, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return { ...fullCounts(), ...JSON.parse(saved) };
        } catch {
          /* ignora json inválido */
        }
      }
    }
    return fullCounts();
  });
  const [open, setOpen] = useState(true);

  // Salva sempre que muda (só escreve em sistema externo — sem setState).
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(remaining));
  }, [remaining, storageKey]);

  function set(v: CardValue, delta: number) {
    setRemaining((r) => ({
      ...r,
      [v]: Math.max(0, Math.min(CARD_DEFINITIONS[v].count, r[v] + delta)),
    }));
  }

  function reset() {
    setRemaining(fullCounts());
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1 flex items-center justify-between">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-sm font-semibold text-gray-200"
        >
          <span>{open ? "▾" : "▸"}</span> Contador de cartas
        </button>
        <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-200">
          Reiniciar (rodada {round})
        </button>
      </div>

      {open && (
        <ul className="flex flex-col gap-1">
          {ALL_CARD_VALUES.map((v) => {
            const def = CARD_DEFINITIONS[v];
            const left = remaining[v] ?? def.count;
            const gone = left === 0;
            return (
              <li
                key={v}
                className={`flex items-center justify-between rounded-lg px-2 py-1 ${
                  gone ? "opacity-40" : "hover:bg-white/5"
                }`}
              >
                <button
                  onClick={() => set(v, -1)}
                  title="Marcar uma cópia como jogada (−1)"
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-white">
                    {v}
                  </span>
                  <span className={`text-sm ${gone ? "text-gray-400 line-through" : "text-gray-200"}`}>
                    {def.name}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => set(v, -1)}
                    className="h-6 w-6 rounded bg-white/10 text-sm hover:bg-white/20"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-mono text-sm">
                    {left}/{def.count}
                  </span>
                  <button
                    onClick={() => set(v, +1)}
                    className="h-6 w-6 rounded bg-white/10 text-sm hover:bg-white/20"
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
