import type { CardEffect, EffectContext, EffectResult } from "../types";
import { getPlayer } from "../targeting";

export const handmaidEffect: CardEffect = {
  requiresTarget: false,

  validTargets() {
    return [];
  },

  resolve(ctx: EffectContext): EffectResult {
    const { round, actingSeat } = ctx;
    getPlayer(round, actingSeat).protected = true;
    // A proteção é removida no início do próximo turno deste jogador
    // (ver resolveTurn.ts: startTurn limpa `protected` do jogador da vez).

    return { log: { type: "handmaid_protect", actingSeat } };
  },
};
