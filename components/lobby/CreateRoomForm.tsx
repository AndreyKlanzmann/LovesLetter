"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom } from "@/lib/rooms/createRoom";

export function CreateRoomForm() {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { code } = await createRoom(nickname);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar sala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <h2 className="font-semibold">Criar sala</h2>
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
        disabled={loading}
        className="rounded-lg bg-amber-500 px-3 py-2 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {loading ? "Criando..." : "Criar sala"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
