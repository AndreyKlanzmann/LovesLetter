"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinRoom } from "@/lib/rooms/joinRoom";

export function JoinRoomForm() {
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await joinRoom(code, nickname);
      router.push(`/room/${code.trim().toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar na sala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <h2 className="font-semibold">Entrar em uma sala</h2>
      <input
        className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none placeholder:text-gray-500 focus:border-amber-400/60"
        placeholder="Seu nome"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={20}
        required
      />
      <input
        className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 uppercase tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:text-gray-500 focus:border-amber-400/60"
        placeholder="Código da sala"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={5}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg border border-white/20 px-3 py-2 font-semibold hover:bg-white/10 disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
