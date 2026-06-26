import type { CardValue } from "./data/cards";

// Validação no CLIENT (só UX: habilitar/desabilitar botões). A defesa real
// está nas Server Actions + validateMove. Usa apenas informação PÚBLICA
// (seats, eliminados, protegidos) — nunca a mão de outro jogador.

export interface PublicPlayer {
  seat: number;
  eliminated: boolean;
}

const OPPONENT_ONLY: CardValue[] = [1, 2, 3, 6]; // Guarda, Padre, Barão, Rei
const TARGETS_SELF_TOO: CardValue[] = [5]; // Príncipe

export function cardRequiresTarget(card: CardValue): boolean {
  return OPPONENT_ONLY.includes(card) || TARGETS_SELF_TOO.includes(card);
}

export function cardRequiresGuess(card: CardValue): boolean {
  return card === 1; // Guarda
}

export function targetableSeats(
  card: CardValue,
  mySeat: number,
  players: PublicPlayer[],
  protectedSeats: number[]
): number[] {
  const isFree = (p: PublicPlayer) => !p.eliminated && !protectedSeats.includes(p.seat);

  if (OPPONENT_ONLY.includes(card)) {
    return players.filter((p) => p.seat !== mySeat && isFree(p)).map((p) => p.seat);
  }
  if (TARGETS_SELF_TOO.includes(card)) {
    // Príncipe pode mirar a si mesmo (no próprio turno você nunca está protegido).
    return players.filter((p) => isFree(p)).map((p) => p.seat);
  }
  return [];
}

// Cartas que o jogador PODE descartar agora, aplicando a regra da Condessa:
// com Condessa(7) + Rei(6) ou Príncipe(5) na mão, só a Condessa é jogável.
export function playableCards(hand: CardValue[]): CardValue[] {
  const hasCountess = hand.includes(7);
  const hasKingOrPrince = hand.includes(6) || hand.includes(5);
  if (hasCountess && hasKingOrPrince) {
    return hand.filter((c) => c === 7);
  }
  return [...hand];
}
