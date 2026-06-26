import { CARD_EFFECTS } from "./effects";
import type { PlayInput, RoundState } from "./types";

export interface ValidationFailure {
  code:
    | "not_your_turn"
    | "card_not_in_hand"
    | "countess_required"
    | "target_required"
    | "invalid_target"
    | "guess_required"
    | "guess_cannot_be_guard";
  message: string;
}

// Validação compartilhada por client (UX: bloquear botão) e pela Server
// Action (defesa real). Não conhece o efeito de cada carta em detalhe — só
// as regras de "a jogada é permitida", delegando a legalidade de alvo para
// `CardEffect.validTargets`.
export function validateMove(round: RoundState, input: PlayInput): ValidationFailure | null {
  const { actingSeat, playedCard, targetSeat, guessedValue } = input;

  if (round.currentTurnSeat !== actingSeat) {
    return { code: "not_your_turn", message: "Não é o seu turno." };
  }

  const player = round.players.find((p) => p.seat === actingSeat);
  if (!player || !player.hand.includes(playedCard)) {
    return { code: "card_not_in_hand", message: "Você não tem essa carta na mão." };
  }

  // Condessa obrigatória: se a mão (as 2 cartas, antes de descartar) tem
  // Condessa(7) junto com Rei(6) ou Príncipe(5), só pode descartar a 7.
  const hasCountess = player.hand.includes(7);
  const hasKingOrPrince = player.hand.includes(6) || player.hand.includes(5);
  if (hasCountess && hasKingOrPrince && playedCard !== 7) {
    return {
      code: "countess_required",
      message: "Com Condessa e Rei/Príncipe na mão, você deve descartar a Condessa.",
    };
  }

  const effect = CARD_EFFECTS[playedCard];

  if (effect.requiresTarget) {
    if (targetSeat === undefined) {
      return { code: "target_required", message: "Essa carta exige escolher um alvo." };
    }
    const validTargets = effect.validTargets(round, actingSeat);
    if (!validTargets.includes(targetSeat)) {
      return { code: "invalid_target", message: "Alvo inválido (eliminado, protegido ou inexistente)." };
    }
  }

  if (effect.requiresGuess) {
    if (guessedValue === undefined) {
      return { code: "guess_required", message: "O Guarda exige um palpite de valor." };
    }
    if (guessedValue === 1) {
      return { code: "guess_cannot_be_guard", message: "Não é permitido apostar no valor Guarda." };
    }
  }

  return null;
}
