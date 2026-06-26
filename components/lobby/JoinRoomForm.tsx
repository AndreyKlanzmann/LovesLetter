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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="font-semibold">Entrar em uma sala</h2>
      <input
        className="rounded border px-3 py-2"
        placeholder="Seu nome"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={20}
        required
      />
      <input
        className="rounded border px-3 py-2 uppercase tracking-widest"
        placeholder="Código da sala"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={5}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
