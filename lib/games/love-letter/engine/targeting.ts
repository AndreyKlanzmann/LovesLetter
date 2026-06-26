import type { RoundState } from "./types";

// Helpers de "quem pode ser alvo" compartilhados pelos efeitos. Não é regra
// de uma carta específica — é a definição comum de "jogador vivo e não
// protegido pela Aia", reaproveitada por Guarda/Padre/Barão/Rei.

export function activeOpponents(round: RoundState, actingSeat: number): number[] {
  return round.players
    .filter((p) => p.seat !== actingSeat && !p.eliminated && !p.protected)
    .map((p) => p.seat);
}

export function activePlayersIncludingSelf(round: RoundState): number[] {
  return round.players.filter((p) => !p.eliminated).map((p) => p.seat);
}

export function getPlayer(round: RoundState, seat: number) {
  const player = round.players.find((p) => p.seat === seat);
  if (!player) throw new Error(`Jogador no seat ${seat} não encontrado`);
  return player;
}

export function drawCard(round: RoundState): import("../data/cards").CardValue {
  const card = round.deck.pop();
  if (card === undefined) throw new Error("Baralho vazio");
  return card;
}

export function removeCardFromHand(
  hand: import("../data/cards").CardValue[],
  card: import("../data/cards").CardValue
) {
  const idx = hand.indexOf(card);
  if (idx === -1) throw new Error("Carta não está na mão do jogador");
  hand.splice(idx, 1);
}
