"use client";

import { useState } from "react";
import { ALL_CARD_VALUES, CARD_DEFINITIONS } from "@/lib/games/love-letter/data/cards";
import { MATCH_TARGET } from "@/lib/games/love-letter/config";

// Painel de regras sempre acessível. Mostra os 8 efeitos a partir de
// CARD_DEFINITIONS (a fonte de dados, separada do motor) — NUNCA revela
// nenhuma mão. É só referência.
export function RulesPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
      >
        Regras
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 text-gray-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Cartas e efeitos</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
            <ul className="flex flex-col gap-3">
              {ALL_CARD_VALUES.map((v) => {
                const card = CARD_DEFINITIONS[v];
                return (
                  <li key={v} className="flex gap-3 rounded border border-gray-200 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 font-bold text-white">
                      {card.value}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {card.name}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          ({card.count}x)
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">{card.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              Início da rodada: 1 carta é removida do jogo (ninguém vê). Na sua vez,
              compre 1 carta (fica com 2) e jogue 1. A rodada acaba quando sobra 1
              jogador ou o baralho acaba (vence a maior carta na mão). Primeiro a{" "}
              {MATCH_TARGET} vitórias vence a partida.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
