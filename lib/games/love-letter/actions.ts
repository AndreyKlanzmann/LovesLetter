"use server";

// Server Actions = a camada de cálculo confiável do jogo. Rodam só no
// servidor e são o único lugar que escreve estado de partida. A identidade vem
// do cookie de sessão (RLS), mas a leitura/escrita do estado usa o client
// service-role (ignora RLS) — assim o motor enxerga as mãos/baralho de todos
// para resolver Padre/Rei/Barão, enquanto o navegador continua restrito.

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { CardValue } from "./data/cards";
import { dealRound } from "./engine/dealRound";
import { resolvePlay, startTurn } from "./engine/resolveTurn";
import type { PlayInput } from "./engine/types";
import { loadRound, saveRound, type DbRoundStatus } from "./persistence";
import { MATCH_TARGET } from "./config";

async function requireUserId(): Promise<string> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) throw new Error("não autenticado");
  return user.id;
}

export interface ActionError {
  ok: false;
  error: string;
}
export interface PlayOk {
  ok: true;
  // Padre: revelação visível só para quem jogou. Volta como retorno da action,
  // nunca é persistida em nenhuma coluna que outro jogador consiga ler.
  privateReveal: { targetSeat: number; cardValue: CardValue } | null;
}

// Inicia (ou reinicia, para a próxima rodada) uma rodada. Qualquer membro da
// sala pode disparar — é entre amigos.
export async function startRound(roomId: string): Promise<{ ok: true } | ActionError> {
  try {
    const userId = await requireUserId();
    const svc = createServiceRoleClient();

    const { data: members } = await svc
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .order("seat");
    if (!members || members.length < 2) {
      return { ok: false, error: "São necessários ao menos 2 jogadores." };
    }
    if (!members.some((m) => m.user_id === userId)) {
      return { ok: false, error: "Você não está nesta sala." };
    }

    const { data: gs } = await svc
      .from("game_states")
      .select("round_number, round_status, last_action")
      .eq("room_id", roomId)
      .maybeSingle();

    if (gs && gs.round_status === "playing") {
      return { ok: false, error: "A rodada atual ainda está em andamento." };
    }
    if (gs && gs.round_status === "game_over") {
      return { ok: false, error: "A partida já terminou. Crie uma nova sala." };
    }

    const seats = members.map((m) => ({ seat: m.seat, userId: m.user_id }));
    const roundNumber = gs ? gs.round_number + 1 : 1;

    // Pela regra, o vencedor da rodada anterior começa a próxima.
    const prevWinner = (gs?.last_action as { winnerSeat?: number } | null)?.winnerSeat;
    const firstSeat =
      prevWinner != null && seats.some((s) => s.seat === prevWinner)
        ? prevWinner
        : seats[0].seat;

    const round = dealRound(seats, roundNumber);
    round.currentTurnSeat = firstSeat;
    startTurn(round); // jogador da vez compra a 2ª carta

    await svc.from("rooms").update({ status: "playing" }).eq("id", roomId);
    await saveRound(svc, roomId, round, "playing", {
      type: "round_start",
      roundNumber,
      firstSeat,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "erro ao iniciar rodada" };
  }
}

export async function playCard(
  roomId: string,
  move: { playedCard: CardValue; targetSeat?: number; guessedValue?: CardValue }
): Promise<PlayOk | ActionError> {
  try {
    const userId = await requireUserId();
    const svc = createServiceRoleClient();

    const loaded = await loadRound(svc, roomId);
    if (!loaded) return { ok: false, error: "Rodada não encontrada." };
    const { round, seatToUserId } = loaded;

    if (round.status !== "playing") {
      return { ok: false, error: "A rodada não está em andamento." };
    }

    // Descobre o seat do jogador autenticado — o client não escolhe quem joga.
    const actingSeat = [...seatToUserId.entries()].find(([, uid]) => uid === userId)?.[0];
    if (actingSeat === undefined) return { ok: false, error: "Você não está nesta sala." };
    if (round.currentTurnSeat !== actingSeat) {
      return { ok: false, error: "Não é o seu turno." };
    }

    const input: PlayInput = {
      actingSeat,
      playedCard: move.playedCard,
      targetSeat: move.targetSeat,
      guessedValue: move.guessedValue,
    };

    const result = resolvePlay(round, input); // valida + aplica efeito (pode lançar)

    const lastAction: Record<string, unknown> = {
      ...result.effect.log,
      seat: actingSeat,
      card: move.playedCard,
      roundEnded: result.roundEnded,
      winnerSeat: result.winnerSeat,
    };

    let dbStatus: DbRoundStatus = "playing";

    if (result.roundEnded) {
      const winnerSeat = result.winnerSeat!;
      const winnerUserId = seatToUserId.get(winnerSeat)!;

      // Incrementa o placar do vencedor da rodada.
      const { data: winnerRow } = await svc
        .from("room_players")
        .select("rounds_won")
        .eq("room_id", roomId)
        .eq("user_id", winnerUserId)
        .single();
      const newWins = (winnerRow?.rounds_won ?? 0) + 1;
      await svc
        .from("room_players")
        .update({ rounds_won: newWins })
        .eq("room_id", roomId)
        .eq("user_id", winnerUserId);

      const matchOver = newWins >= MATCH_TARGET;
      dbStatus = matchOver ? "game_over" : "round_over";
      lastAction.matchOver = matchOver;
      if (matchOver) {
        await svc.from("rooms").update({ status: "finished" }).eq("id", roomId);
      }
    } else {
      // Próximo jogador compra a 2ª carta para começar o turno dele.
      startTurn(round);
    }

    await saveRound(svc, roomId, round, dbStatus, lastAction);

    return { ok: true, privateReveal: result.effect.privateRevealToActor ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "jogada inválida" };
  }
}
