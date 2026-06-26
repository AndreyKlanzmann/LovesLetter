import { CARD_EFFECTS } from "./effects";
import { drawCard, getPlayer, removeCardFromHand } from "./targeting";
import { validateMove } from "./validateMove";
import type { EffectResult, PlayInput, RoundState } from "./types";

// Orquestra um turno. Não conhece a regra de NENHUMA carta específica — só
// sabe o esqueleto comum: compra, descarta, chama o efeito registrado para
// aquele valor, e decide se a rodada terminou. Toda a "inteligência" de cada
// carta mora em engine/effects/*.

export function startTurn(round: RoundState): void {
  const player = getPlayer(round, round.currentTurnSeat);
  player.hand.push(drawCard(round));
}

export interface ResolvePlayResult {
  effect: EffectResult;
  roundEnded: boolean;
  winnerSeat: number | null; // só quando roundEnded
}

export function resolvePlay(round: RoundState, input: PlayInput): ResolvePlayResult {
  const failure = validateMove(round, input);
  if (failure) throw new Error(`${failure.code}: ${failure.message}`);

  const actor = getPlayer(round, input.actingSeat);
  removeCardFromHand(actor.hand, input.playedCard);
  round.discardPile.push(input.playedCard);

  const effect = CARD_EFFECTS[input.playedCard];
  const result = effect.resolve({
    round,
    actingSeat: input.actingSeat,
    targetSeat: input.targetSeat,
    guessedValue: input.guessedValue,
  });

  const { ended, winnerSeat } = checkRoundEnd(round);
  if (ended) {
    round.status = "round_over";
    return { effect: result, roundEnded: true, winnerSeat };
  }

  advanceTurn(round);
  return { effect: result, roundEnded: false, winnerSeat: null };
}

function checkRoundEnd(round: RoundState): { ended: boolean; winnerSeat: number | null } {
  const active = round.players.filter((p) => !p.eliminated);
  if (active.length === 1) {
    return { ended: true, winnerSeat: active[0].seat };
  }
  if (round.deck.length === 0) {
    const highest = active.reduce((best, p) =>
      p.hand[0] > best.hand[0] ? p : best
    );
    return { ended: true, winnerSeat: highest.seat };
  }
  return { ended: false, winnerSeat: null };
}

function advanceTurn(round: RoundState): void {
  const seats = round.players.map((p) => p.seat).sort((a, b) => a - b);
  const currentIdx = seats.indexOf(round.currentTurnSeat);

  for (let step = 1; step <= seats.length; step++) {
    const candidateSeat = seats[(currentIdx + step) % seats.length];
    const candidate = getPlayer(round, candidateSeat);
    if (!candidate.eliminated) {
      // A proteção da Aia dura até o início do próximo turno deste jogador:
      // ao chegar a vez dele de novo, a proteção cai aqui.
      candidate.protected = false;
      round.currentTurnSeat = candidateSeat;
      return;
    }
  }
}
