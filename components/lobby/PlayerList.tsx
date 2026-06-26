import type { Database } from "@/lib/supabase/types";

type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

export function PlayerList({ players, maxPlayers }: { players: RoomPlayerRow[]; maxPlayers: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {players.map((p) => (
        <li key={p.id} className="flex items-center justify-between rounded border px-3 py-2">
          <span>
            {p.nickname} <span className="text-xs text-gray-500">(seat {p.seat})</span>
          </span>
          <span className={p.is_connected ? "text-green-600" : "text-gray-400"}>
            {p.is_connected ? "online" : "offline"}
          </span>
        </li>
      ))}
      {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
        <li key={`empty-${i}`} className="rounded border border-dashed px-3 py-2 text-gray-400">
          Aguardando jogador...
        </li>
      ))}
    </ul>
  );
}
