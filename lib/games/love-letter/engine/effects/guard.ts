import type { CardEffect, EffectContext, EffectResult } from "../types";
import { activeOpponents, getPlayer } from "../targeting";

export const guardEffect: CardEffect = {
  requiresTarget: true,
  requiresGuess: true,

  validTargets(round, actingSeat) {
    return activeOpponents(round, actingSeat);
  },

  resolve(ctx: EffectContext): EffectResult {
    const { round, actingSeat, targetSeat, guessedValue } = ctx;
    if (targetSeat === undefined || guessedValue === undefined) {
      throw new Error("Guarda exige alvo e palpite");
    }
    if (guessedValue === 1) {
      throw new Error("Não é permitido apostar no valor Guarda (1)");
    }

    const target = getPlayer(round, targetSeat);
    const hit = target.hand.includes(guessedValue);
    if (hit) {
      target.eliminated = true;
    }

    return {
      log: { type: "guard_guess", actingSeat, targetSeat, guessedValue, hit },
    };
  },
};
