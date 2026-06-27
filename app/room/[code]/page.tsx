"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonSession } from "@/lib/supabase/ensureAnonSession";
import { joinRoom } from "@/lib/rooms/joinRoom";
import { useRoomChannel } from "@/lib/rooms/useRoomChannel";
import { PlayerList } from "@/components/lobby/PlayerList";
import { GameBoard } from "@/components/game/GameBoard";
import { startRound } from "@/lib/games/love-letter/actions";

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
    return <main className="mx-auto max-w-md px-6 py-16 text-amber-100/70">Carregando...</main>;
  }

  if (needsNickname) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 sm:px-6">
        <h1 className="font-display text-2xl text-amber-300">Entrar na sala {code}</h1>
        <form onSubmit={handleJoin} className="panel-wood flex flex-col gap-3 rounded-xl p-4">
          <input
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none placeholder:text-gray-500 focus:border-amber-400/60"
            placeholder="Seu nome"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-3 py-2 font-semibold text-black hover:bg-amber-400"
          >
            Entrar
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </main>
    );
  }

  return <RoomLobby roomId={roomId!} code={code} />;
}

function RoomLobby({ roomId, code }: { roomId: string; code: string }) {
  const { room, players, loading } = useRoomChannel(roomId);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading || !room) {
    return <main className="mx-auto max-w-md px-6 py-16 text-amber-100/70">Carregando sala...</main>;
  }

  // Assim que a partida começa, todos os clients trocam para o tabuleiro
  // (room.status muda em tempo real via useRoomChannel).
  if (room.status === "playing" || room.status === "finished") {
    return <GameBoard roomId={roomId} code={code} />;
  }

  async function handleStart() {
    setStartError(null);
    setStarting(true);
    const res = await startRound(roomId);
    setStarting(false);
    if (!res.ok) setStartError(res.error);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl text-amber-300">Sala {code}</h1>
          <p className="text-sm text-amber-100/60">Aguardando jogadores...</p>
        </div>
        <button
          onClick={copyCode}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-white/40"
        >
          {copied ? "copiado!" : "copiar código"}
        </button>
      </div>
      <PlayerList players={players} maxPlayers={room.max_players} />
      <p className="text-sm text-amber-100/60">
        Compartilhe o código <strong className="text-amber-200">{code}</strong> com seus amigos.
      </p>
      <button
        onClick={handleStart}
        disabled={starting || players.length < 2}
        className="rounded-lg bg-amber-500 px-3 py-2 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {starting
          ? "Iniciando..."
          : players.length < 2
            ? "Aguardando ao menos 2 jogadores"
            : `Começar partida (${players.length} jogadores)`}
      </button>
      {startError && <p className="text-sm text-red-400">{startError}</p>}
    </main>
  );
}
