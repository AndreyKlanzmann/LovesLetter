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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="font-semibold">Criar sala</h2>
      <input
        className="rounded border px-3 py-2"
        placeholder="Seu nome"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={20}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Criando..." : "Criar sala"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
