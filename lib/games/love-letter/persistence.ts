import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { CardValue } from "./data/cards";
import type { RoundState } from "./engine/types";

// Ponte entre o RoundState (em memória, usado pelo motor puro) e as 5 tabelas
// do Supabase. Toda leitura/escrita aqui usa o client service-role (ignora
// RLS) — é o ÚNICO lugar que enxerga o baralho e as mãos de todos ao mesmo
// tempo. As Server Actions chamam estas funções; o client comum nunca.
//
// Mapeamento:
//   round.players[].hand      -> player_hands.cards            (uma linha/jogador)
//   round.players[].protected -> game_states.protected_seats   (array de seats)
//   round.players[].eliminated-> room_players.eliminated_this_round
//   round.deck / removedCard  -> round_decks
//   round.discardPile         -> game_states.discard_pile
//   round.currentTurnSeat     -> game_states.current_turn_seat
//   round.status/roundNumber  -> game_states.round_status / round_number

type Svc = SupabaseClient<Database>;

export type DbRoundStatus = "playing" | "round_over" | "game_over";

export interface RoundSeed {
  seat: number;
  userId: string;
}

// Carrega o estado completo da rodada a partir das tabelas, remontando o
// RoundState que o motor entende. `seatToUserId` é devolvido junto porque as
// Server Actions precisam mapear o usuário autenticado para o seu seat.
export async function loadRound(
  svc: Svc,
  roomId: string
): Promise<{ round: RoundState; seatToUserId: Map<number, string> } | null> {
  const [{ data: gs }, { data: players }, { data: hands }, { data: deck }] =
    await Promise.all([
      svc.from("game_states").select("*").eq("room_id", roomId).maybeSingle(),
      svc.from("room_players").select("*").eq("room_id", roomId).order("seat"),
      svc.from("player_hands").select("*").eq("room_id", roomId),
      svc.from("round_decks").select("*").eq("room_id", roomId).maybeSingle(),
    ]);

  if (!gs || !players || !deck) return null;

  const protectedSeats = (gs.protected_seats as number[]) ?? [];
  const seatToUserId = new Map<number, string>();

  const roundPlayers = players.map((p) => {
    seatToUserId.set(p.seat, p.user_id);
    const handRow = hands?.find((h) => h.user_id === p.user_id);
    return {
      seat: p.seat,
      userId: p.user_id,
      hand: ((handRow?.cards as CardValue[]) ?? []).slice(),
      eliminated: p.eliminated_this_round,
      protected: protectedSeats.includes(p.seat),
    };
  });

  const round: RoundState = {
    players: roundPlayers,
    deck: ((deck.remaining_cards as CardValue[]) ?? []).slice(),
    removedCard: (deck.removed_card as CardValue | null) ?? null,
    discardPile: ((gs.discard_pile as CardValue[]) ?? []).slice(),
    currentTurnSeat: gs.current_turn_seat ?? roundPlayers[0].seat,
    status: gs.round_status === "playing" ? "playing" : "round_over",
    roundNumber: gs.round_number,
  };

  return { round, seatToUserId };
}

// Persiste o RoundState de volta nas tabelas. Faz as escritas "públicas"
// (game_states, room_players) e as "secretas" (player_hands, round_decks) numa
// tacada só. `dbStatus` permite forçar round_over/game_over (o motor só
// distingue playing/round_over).
export async function saveRound(
  svc: Svc,
  roomId: string,
  round: RoundState,
  dbStatus: DbRoundStatus,
  lastAction: Record<string, unknown> | null
): Promise<void> {
  const protectedSeats = round.players.filter((p) => p.protected).map((p) => p.seat);
  const now = new Date().toISOString();

  await svc.from("game_states").upsert({
    room_id: roomId,
    round_number: round.roundNumber,
    current_turn_seat: round.currentTurnSeat,
    deck_count: round.deck.length,
    discard_pile: round.discardPile,
    protected_seats: protectedSeats,
    round_status: dbStatus,
    last_action: lastAction,
    updated_at: now,
  });

  await svc.from("round_decks").upsert({
    room_id: roomId,
    remaining_cards: round.deck,
    removed_card: round.removedCard,
    updated_at: now,
  });

  // Cada mão na sua própria linha — a RLS de player_hands garante que cada
  // jogador só leia a sua. Aqui (service-role) escrevemos todas.
  for (const p of round.players) {
    await svc.from("player_hands").upsert({
      room_id: roomId,
      user_id: p.userId,
      cards: p.hand,
      updated_at: now,
    });
  }

  // eliminated_this_round vive em room_players (não em game_states) porque é
  // por-jogador e sobrevive ao fim da rodada até o placar ser exibido.
  for (const p of round.players) {
    await svc
      .from("room_players")
      .update({ eliminated_this_round: p.eliminated })
      .eq("room_id", roomId)
      .eq("user_id", p.userId);
  }
}
