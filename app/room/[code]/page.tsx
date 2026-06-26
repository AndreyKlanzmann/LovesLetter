"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonSession } from "@/lib/supabase/ensureAnonSession";
import { joinRoom } from "@/lib/rooms/joinRoom";
import { useRoomChannel } from "@/lib/rooms/useRoomChannel";
import { PlayerList } from "@/components/lobby/PlayerList";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [needsNickname, setNeedsNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function lookup() {
      await ensureAnonSession();
      const supabase = createClient();
      // RLS só devolve esta linha se o usuário já for membro da sala
      // (host na criação, ou já entrou antes). Se vier vazio, ele ainda
      // não entrou e precisamos pedir o nickname para chamar join_room.
      const { data } = await supabase.from("rooms").select("id").eq("code", code).maybeSingle();
      if (!active) return;
      if (data) {
        setRoomId(data.id);
      } else {
        setNeedsNickname(true);
      }
      setChecking(false);
    }
    lookup();
    return () => {
      active = false;
    };
  }, [code]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const id = await joinRoom(code, nickname);
      setRoomId(id);
      setNeedsNickname(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar na sala");
    }
  }

  if (checking) {
    return <main className="mx-auto max-w-md px-6 py-16">Carregando...</main>;
  }

  if (needsNickname) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16">
        <h1 className="text-xl font-bold">Entrar na sala {code}</h1>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            className="rounded border px-3 py-2"
            placeholder="Seu nome"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            required
          />
          <button type="submit" className="rounded bg-black px-3 py-2 text-white">
            Entrar
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </main>
    );
  }

  return <RoomLobby roomId={roomId!} code={code} />;
}

function RoomLobby({ roomId, code }: { roomId: string; code: string }) {
  const { room, players, loading } = useRoomChannel(roomId);

  if (loading || !room) {
    return <main className="mx-auto max-w-md px-6 py-16">Carregando sala...</main>;
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-xl font-bold">Sala {code}</h1>
        <p className="text-sm text-gray-500">
          {room.status === "lobby"
            ? "Aguardando jogadores..."
            : `Status: ${room.status}`}
        </p>
      </div>
      <PlayerList players={players} maxPlayers={room.max_players} />
      {room.status === "lobby" && (
        <p className="text-sm text-gray-500">
          Compartilhe o código <strong>{code}</strong> com seus amigos. A partida começa
          automaticamente quando os 3 jogadores entrarem.
        </p>
      )}
    </main>
  );
}
