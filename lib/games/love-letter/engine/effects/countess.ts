import type { CardEffect, EffectContext, EffectResult } from "../types";

// A Condessa não tem efeito ao ser jogada. A obrigatoriedade de descartá-la
// quando o jogador tem Rei ou Príncipe na mão é uma regra de VALIDAÇÃO da
// jogada (checada antes de chegar aqui), não um efeito — por isso mora em
// validateMove.ts, não neste arquivo.
export const countessEffect: CardEffect = {
  requiresTarget: false,

  validTargets() {
    return [];
  },

  resolve(ctx: EffectContext): EffectResult {
    return { log: { type: "countess_noop", actingSeat: ctx.actingSeat } };
  },
};
