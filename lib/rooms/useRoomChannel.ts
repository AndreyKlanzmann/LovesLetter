"use client";

import { useEffect, useState } from "react";
import { createClient } from "../supabase/client";
import type { Database } from "../supabase/types";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

interface RoomChannelState {
  room: RoomRow | null;
  players: RoomPlayerRow[];
  loading: boolean;
}

// Hook reusável (pensado para futuros jogos, não só Love Letter): assina
// `rooms` e `room_players` da sala e mantém a lista de jogadores em tempo
// real. A leitura inicial e os eventos de realtime obedecem às mesmas RLS
// policies da tabela — um jogador que não pertence à sala simplesmente não
// recebe nada daqui.
export function useRoomChannel(roomId: string | null): RoomChannelState {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const id = roomId;
    const supabase = createClient();
    let active = true;

    async function loadInitial() {
      const [{ data: roomData }, { data: playerData }] = await Promise.all([
        supabase.from("rooms").select("*").eq("id", id).single(),
        supabase.from("room_players").select("*").eq("room_id", id).order("seat"),
      ]);
      if (!active) return;
      setRoom(roomData ?? null);
      setPlayers(playerData ?? []);
      setLoading(false);
    }
    loadInitial();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => loadInitial()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        () => loadInitial()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { room, players, loading };
}
