import type { CardEffect, EffectContext, EffectResult } from "../types";
import { activeOpponents, getPlayer } from "../targeting";

export const kingEffect: CardEffect = {
  requiresTarget: true,

  validTargets(round, actingSeat) {
    return activeOpponents(round, actingSeat);
  },

  resolve(ctx: EffectContext): EffectResult {
    const { round, actingSeat, targetSeat } = ctx;
    if (targetSeat === undefined) throw new Error("Rei exige um alvo");

    const actor = getPlayer(round, actingSeat);
    const target = getPlayer(round, targetSeat);
    [actor.hand, target.hand] = [target.hand, actor.hand];

    return { log: { type: "king_swap", actingSeat, targetSeat } };
  },
};
