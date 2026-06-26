import type { CardEffect, EffectContext, EffectResult } from "../types";
import { activeOpponents, getPlayer } from "../targeting";

export const baronEffect: CardEffect = {
  requiresTarget: true,

  validTargets(round, actingSeat) {
    return activeOpponents(round, actingSeat);
  },

  resolve(ctx: EffectContext): EffectResult {
    const { round, actingSeat, targetSeat } = ctx;
    if (targetSeat === undefined) throw new Error("Barão exige um alvo");

    const actor = getPlayer(round, actingSeat);
    const target = getPlayer(round, targetSeat);
    const [actorValue] = actor.hand;
    const [targetValue] = target.hand;

    let eliminatedSeat: number | null = null;
    if (actorValue < targetValue) eliminatedSeat = actingSeat;
    else if (targetValue < actorValue) eliminatedSeat = targetSeat;
    // valores iguais: ninguém é eliminado

    if (eliminatedSeat !== null) {
      getPlayer(round, eliminatedSeat).eliminated = true;
    }

    return {
      log: { type: "baron_compare", actingSeat, targetSeat, eliminatedSeat },
    };
  },
};
