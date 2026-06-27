import { describe, expect, it } from "vitest";
import type { CardValue } from "../data/cards";
import { buildFreshDeck } from "./deck";
import { dealRound } from "./dealRound";
import { resolvePlay } from "./resolveTurn";
import { validateMove } from "./validateMove";
import type { PlayerRoundState, RoundState } from "./types";

// Helpers para montar estados determinísticos (sem embaralhar).
function player(seat: number, hand: CardValue[], opts: Partial<PlayerRoundState> = {}): PlayerRoundState {
  return { seat, userId: `u${seat}`, hand: [...hand], eliminated: false, protected: false, ...opts };
}

function round(players: PlayerRoundState[], partial: Partial<RoundState> = {}): RoundState {
  return {
    players,
    deck: [2, 3],
    removedCard: 9 as unknown as CardValue,
    discardPile: [],
    currentTurnSeat: 1,
    status: "playing",
    roundNumber: 1,
    ...partial,
  };
}

describe("baralho", () => {
  it("tem 16 cartas com a composição correta", () => {
    const deck = buildFreshDeck();
    expect(deck).toHaveLength(16);
    const count = (v: number) => deck.filter((c) => c === v).length;
    expect([count(1), count(2), count(3), count(4), count(5), count(6), count(7), count(8)]).toEqual([
      5, 2, 2, 2, 2, 1, 1, 1,
    ]);
  });
});

describe("dealRound", () => {
  it("remove 1 carta e dá 1 para cada jogador", () => {
    const r = dealRound([{ seat: 1, userId: "a" }, { seat: 2, userId: "b" }, { seat: 3, userId: "c" }], 1);
    expect(r.players).toHaveLength(3);
    r.players.forEach((p) => expect(p.hand).toHaveLength(1));
    expect(r.removedCard).not.toBeNull();
    // 16 - 1 removida - 3 distribuídas = 12 no baralho
    expect(r.deck).toHaveLength(12);
  });
});

describe("Guarda (1)", () => {
  it("acerto elimina o alvo", () => {
    const r = round([player(1, [1, 4]), player(2, [5]), player(3, [6])]);
    const res = resolvePlay(r, { actingSeat: 1, playedCard: 1, targetSeat: 2, guessedValue: 5 });
    expect(r.players.find((p) => p.seat === 2)!.eliminated).toBe(true);
    expect(res.roundEnded).toBe(false);
  });

  it("erro não elimina", () => {
    const r = round([player(1, [1, 4]), player(2, [6]), player(3, [6])]);
    resolvePlay(r, { actingSeat: 1, playedCard: 1, targetSeat: 2, guessedValue: 5 });
    expect(r.players.find((p) => p.seat === 2)!.eliminated).toBe(false);
  });

  it("não pode chutar o valor Guarda (1)", () => {
    const r = round([player(1, [1, 4]), player(2, [5]), player(3, [6])]);
    const fail = validateMove(r, { actingSeat: 1, playedCard: 1, targetSeat: 2, guessedValue: 1 });
    expect(fail?.code).toBe("guess_cannot_be_guard");
  });
});

describe("Barão (3)", () => {
  it("quem tem a carta menor é eliminado", () => {
    // actor joga 3, sobra [2]; alvo tem [5] -> actor perde
    const r = round([player(1, [3, 2]), player(2, [5]), player(3, [6])]);
    resolvePlay(r, { actingSeat: 1, playedCard: 3, targetSeat: 2 });
    expect(r.players.find((p) => p.seat === 1)!.eliminated).toBe(true);
  });

  it("empate não elimina ninguém", () => {
    const r = round([player(1, [3, 5]), player(2, [5]), player(3, [6])]);
    resolvePlay(r, { actingSeat: 1, playedCard: 3, targetSeat: 2 });
    expect(r.players.some((p) => p.eliminated)).toBe(false);
  });
});

describe("Aia (4)", () => {
  it("protege e impede ser alvo", () => {
    const r = round([player(1, [4, 2]), player(2, [1, 6]), player(3, [6])]);
    resolvePlay(r, { actingSeat: 1, playedCard: 4 });
    expect(r.players.find((p) => p.seat === 1)!.protected).toBe(true);
    // agora seat 2 (vez dele) tenta mirar o seat 1 protegido com Guarda
    const fail = validateMove(r, { actingSeat: 2, playedCard: 1, targetSeat: 1, guessedValue: 5 });
    expect(fail?.code).toBe("invalid_target");
  });
});

describe("Príncipe (5)", () => {
  it("força descarte e nova compra", () => {
    const r = round([player(1, [5, 2]), player(2, [3]), player(3, [6])], { deck: [7] });
    resolvePlay(r, { actingSeat: 1, playedCard: 5, targetSeat: 2 });
    expect(r.players.find((p) => p.seat === 2)!.hand).toEqual([7]);
  });

  it("forçar descarte da Princesa elimina", () => {
    const r = round([player(1, [5, 2]), player(2, [8]), player(3, [6])]);
    resolvePlay(r, { actingSeat: 1, playedCard: 5, targetSeat: 2 });
    expect(r.players.find((p) => p.seat === 2)!.eliminated).toBe(true);
  });
});

describe("Rei (6)", () => {
  it("troca as mãos", () => {
    const r = round([player(1, [6, 2]), player(2, [5]), player(3, [6])]);
    resolvePlay(r, { actingSeat: 1, playedCard: 6, targetSeat: 2 });
    expect(r.players.find((p) => p.seat === 1)!.hand).toEqual([5]);
    expect(r.players.find((p) => p.seat === 2)!.hand).toEqual([2]);
  });
});

describe("Condessa (7)", () => {
  it("é obrigatória com Rei/Príncipe na mão", () => {
    const r = round([player(1, [7, 6]), player(2, [5]), player(3, [6])]);
    const fail = validateMove(r, { actingSeat: 1, playedCard: 6, targetSeat: 2 });
    expect(fail?.code).toBe("countess_required");
  });
});

describe("Princesa (8)", () => {
  it("jogar a Princesa elimina o próprio jogador", () => {
    const r = round([player(1, [8, 2]), player(2, [5]), player(3, [6])]);
    resolvePlay(r, { actingSeat: 1, playedCard: 8 });
    expect(r.players.find((p) => p.seat === 1)!.eliminated).toBe(true);
  });
});

describe("eliminação revela a carta no descarte", () => {
  it("a carta restante do eliminado vai para o descarte", () => {
    const r = round([player(1, [1, 4]), player(2, [5]), player(3, [6])]);
    resolvePlay(r, { actingSeat: 1, playedCard: 1, targetSeat: 2, guessedValue: 5 });
    // descarte: Guarda jogado (1) + carta revelada do eliminado (5)
    expect(r.discardPile).toContain(5);
    expect(r.players.find((p) => p.seat === 2)!.hand).toHaveLength(0);
  });
});

describe("fim de rodada", () => {
  it("sobrando 1 jogador, ele vence", () => {
    const r = round([player(1, [1, 4]), player(2, [5])], { deck: [2, 3] });
    const res = resolvePlay(r, { actingSeat: 1, playedCard: 1, targetSeat: 2, guessedValue: 5 });
    expect(res.roundEnded).toBe(true);
    expect(res.winnerSeat).toBe(1);
  });

  it("baralho vazio: vence a maior carta na mão", () => {
    const r = round([player(1, [4, 2]), player(2, [5])], { deck: [] });
    const res = resolvePlay(r, { actingSeat: 1, playedCard: 4 });
    expect(res.roundEnded).toBe(true);
    expect(res.winnerSeat).toBe(2); // seat1 ficou com [2], seat2 com [5]
  });
});

describe("carta sem alvo legal (todos protegidos)", () => {
  it("é jogada sem efeito (fizzle)", () => {
    const r = round([player(1, [1, 4]), player(2, [5], { protected: true })], { deck: [2, 3] });
    const res = resolvePlay(r, { actingSeat: 1, playedCard: 1 });
    expect(r.players.find((p) => p.seat === 2)!.eliminated).toBe(false);
    expect(res.effect.log.type).toBe("fizzle");
  });
});

describe("validação de jogada", () => {
  it("não é seu turno", () => {
    const r = round([player(1, [1, 4]), player(2, [5]), player(3, [6])]);
    expect(validateMove(r, { actingSeat: 2, playedCard: 5 })?.code).toBe("not_your_turn");
  });

  it("carta não está na mão", () => {
    const r = round([player(1, [1, 4]), player(2, [5]), player(3, [6])]);
    expect(validateMove(r, { actingSeat: 1, playedCard: 6 })?.code).toBe("card_not_in_hand");
  });
});
