import type { Database } from "@/lib/supabase/types";
import { avatarForSeat } from "@/lib/games/love-letter/avatars";

type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

export function PlayerList({ players, maxPlayers }: { players: RoomPlayerRow[]; maxPlayers: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {players.map((p) => (
        <li
          key={p.id}
          className="panel-wood flex items-center justify-between rounded-lg px-3 py-2"
        >
          <span className="flex items-center gap-2">
            <span className="text-xl">{avatarForSeat(p.seat)}</span>
            <span>{p.nickname}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${p.is_connected ? "bg-green-400" : "bg-gray-500"}`}
            />
            <span className={p.is_connected ? "text-green-300" : "text-gray-400"}>
              {p.is_connected ? "online" : "offline"}
            </span>
          </span>
        </li>
      ))}
      {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
        <li
          key={`empty-${i}`}
          className="rounded-lg border border-dashed border-white/15 px-3 py-2 text-sm text-gray-500"
        >
          Aguardando jogador...
        </li>
      ))}
    </ul>
  );
}
