import type { CardValue } from "../../data/cards";
import type { CardEffect, EffectContext, EffectResult } from "../types";
import { activePlayersIncludingSelf, getPlayer, removeCardFromHand } from "../targeting";

export const princeEffect: CardEffect = {
  requiresTarget: true,

  validTargets(round) {
    // Príncipe pode escolher a si mesmo, então não filtra protegidos contra
    // o próprio jogador, mas ainda assim exclui jogadores protegidos pela
    // Aia (eles não podem ser forçados a descartar) e eliminados.
    return activePlayersIncludingSelf(round).filter((seat) => {
      const player = round.players.find((p) => p.seat === seat)!;
      return !player.protected;
    });
  },

  resolve(ctx: EffectContext): EffectResult {
    const { round, actingSeat, targetSeat } = ctx;
    if (targetSeat === undefined) throw new Error("Príncipe exige um alvo");

    const target = getPlayer(round, targetSeat);
    const [discarded] = target.hand;
    removeCardFromHand(target.hand, discarded);
    round.discardPile.push(discarded);

    if (discarded === 8) {
      target.eliminated = true;
      return { log: { type: "prince_discard", actingSeat, targetSeat, discarded, eliminated: true } };
    }

    let drawn: CardValue;
    if (round.deck.length > 0) {
      drawn = round.deck.pop()!;
    } else if (round.removedCard !== null) {
      // Regra oficial: se o baralho esvaziar, o alvo compra a carta que
      // havia sido removida face-down no início da rodada.
      drawn = round.removedCard;
      round.removedCard = null;
    } else {
      throw new Error("Sem cartas disponíveis para o Príncipe forçar a compra");
    }

    target.hand.push(drawn);

    return { log: { type: "prince_discard", actingSeat, targetSeat, discarded, eliminated: false } };
  },
};
