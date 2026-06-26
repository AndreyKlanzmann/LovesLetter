import type { CardEffect, EffectContext, EffectResult } from "../types";
import { activeOpponents, getPlayer } from "../targeting";

export const priestEffect: CardEffect = {
  requiresTarget: true,

  validTargets(round, actingSeat) {
    return activeOpponents(round, actingSeat);
  },

  resolve(ctx: EffectContext): EffectResult {
    const { round, actingSeat, targetSeat } = ctx;
    if (targetSeat === undefined) throw new Error("Padre exige um alvo");

    const target = getPlayer(round, targetSeat);
    const [cardValue] = target.hand;

    return {
      log: { type: "priest_peek", actingSeat, targetSeat },
      // Só isto volta para quem jogou a carta; nunca é persistido em
      // nenhuma tabela/coluna que outro jogador possa ler.
      privateRevealToActor: { targetSeat, cardValue },
    };
  },
};
