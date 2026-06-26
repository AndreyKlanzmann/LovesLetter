import type { CardValue } from "../data/cards";

export interface PlayerRoundState {
  seat: number;
  userId: string;
  hand: CardValue[]; // 1 carta normalmente; 2 durante o turno do jogador ativo
  eliminated: boolean;
  protected: boolean; // Aia ativa até o próximo turno deste jogador
}

export type RoundStatus = "playing" | "round_over";

export interface RoundState {
  players: PlayerRoundState[]; // ordenado por seat
  deck: CardValue[]; // topo = deck[deck.length - 1]; segredo, nunca exposto ao client
  removedCard: CardValue | null; // carta face-down do início da rodada; segredo
  discardPile: CardValue[]; // público
  currentTurnSeat: number;
  status: RoundStatus;
  roundNumber: number;
}

// Entrada de uma jogada: o jogador da vez descarta `playedCard` (uma das
// duas cartas na mão) e, se o efeito exigir, aponta um alvo/palpite.
export interface PlayInput {
  actingSeat: number;
  playedCard: CardValue;
  targetSeat?: number;
  guessedValue?: CardValue; // só Guarda
}

// O que cada efeito recebe para se resolver. Cada efeito só lê/escreve o
// round e devolve patches — nenhum efeito conhece os outros 7.
export interface EffectContext {
  round: RoundState;
  actingSeat: number;
  targetSeat?: number;
  guessedValue?: CardValue;
}

export interface EffectLogEntry {
  type: string; // ex: "guard_guess", "priest_peek", "baron_compare"
  actingSeat: number;
  targetSeat?: number;
  [key: string]: unknown;
}

export interface EffectResult {
  log: EffectLogEntry;
  // Visível só para quem jogou a carta (ex.: Padre revela o valor da carta
  // vista só para o ator) — nunca é gravado em game_states/discard, só
  // devolvido como resposta da Server Action a quem chamou.
  privateRevealToActor?: { targetSeat: number; cardValue: CardValue };
}

export interface CardEffect {
  requiresTarget: boolean;
  requiresGuess?: boolean; // só o Guarda
  // Alvos válidos no momento (já filtra eliminados/protegidos pela Aia,
  // exceto quando o próprio efeito permite atingir a si mesmo).
  validTargets(round: RoundState, actingSeat: number): number[];
  resolve(ctx: EffectContext): EffectResult;
}
