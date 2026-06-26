"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { CardValue } from "./data/cards";

type GameStateRow = Database["public"]["Tables"]["game_states"]["Row"];
type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

export interface GameChannelState {
  gameState: GameStateRow | null;
  players: RoomPlayerRow[];
  myHand: CardValue[];
  myUserId: string | null;
  loading: boolean;
}

// Hook de tempo real da PARTIDA. Assina:
//  - game_states  (estado público: vez, descarte, protegidos, status)
//  - room_players (placar, eliminados, nomes)
//  - player_hands (mas a RLS só entrega a NOSSA linha — a mão dos outros nunca
//    chega aqui, nem pelo realtime)
// Qualquer evento recarrega tudo (simples e suficiente para 3 jogadores).
export function useGameChannel(roomId: string): GameChannelState {
  const [gameState, setGameState] = useState<GameStateRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [myHand, setMyHand] = useState<CardValue[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadAll() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? null;

      const [{ data: gs }, { data: pls }, { data: hand }] = await Promise.all([
        supabase.from("game_states").select("*").eq("room_id", roomId).maybeSingle(),
        supabase.from("room_players").select("*").eq("room_id", roomId).order("seat"),
        uid
          ? supabase
              .from("player_hands")
              .select("cards")
              .eq("room_id", roomId)
              .eq("user_id", uid)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (!active) return;
      setMyUserId(uid);
      setGameState(gs ?? null);
      setPlayers(pls ?? []);
      setMyHand(((hand?.cards as CardValue[]) ?? []).slice());
      setLoading(false);
    }
    loadAll();

    const channel = supabase
      .channel(`game:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_states", filter: `room_id=eq.${roomId}` },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_hands", filter: `room_id=eq.${roomId}` },
        () => loadAll()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { gameState, players, myHand, myUserId, loading };
}
