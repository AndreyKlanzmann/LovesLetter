import type { CardEffect, EffectContext, EffectResult } from "../types";
import { getPlayer } from "../targeting";

// A Princesa nunca deveria ser jogada voluntariamente (não tem efeito
// positivo), mas pode ser descartada à força pelo Príncipe ou pelo Rei
// (trocada e depois descartada em outro turno) — a eliminação por
// "descartar a Princesa por qualquer motivo" é tratada de forma centralizada
// aqui E também dentro do efeito do Príncipe, que é o único outro caminho
// que força um descarte direto.
export const princessEffect: CardEffect = {
  requiresTarget: false,

  validTargets() {
    return [];
  },

  resolve(ctx: EffectContext): EffectResult {
    getPlayer(ctx.round, ctx.actingSeat).eliminated = true;
    return { log: { type: "princess_discarded", actingSeat: ctx.actingSeat } };
  },
};
