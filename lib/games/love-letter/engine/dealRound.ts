import { buildFreshDeck } from "./deck";
import type { RoundState } from "./types";

export interface RoundPlayerSeed {
  seat: number;
  userId: string;
}

// Início de rodada: embaralha, remove 1 carta face-down (fora do jogo,
// ninguém vê — fica em removedCard, que nunca é exposto via RLS), e dá 1
// carta para cada jogador. O primeiro a jogar é sempre o seat 1 (poderia
// rotacionar por rodada; mantido simples por ora).
export function dealRound(players: RoundPlayerSeed[], roundNumber: number): RoundState {
  const deck = buildFreshDeck();
  const removedCard = deck.pop()!;

  const roundPlayers = players
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({
      seat: p.seat,
      userId: p.userId,
      hand: [deck.pop()!],
      eliminated: false,
      protected: false,
    }));

  return {
    players: roundPlayers,
    deck,
    removedCard,
    discardPile: [],
    currentTurnSeat: roundPlayers[0].seat,
    status: "playing",
    roundNumber,
  };
}
