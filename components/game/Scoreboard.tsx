import type { Database } from "@/lib/supabase/types";
import { MATCH_TARGET } from "@/lib/games/love-letter/config";
import { avatarForSeat } from "@/lib/games/love-letter/avatars";

type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

// Placar da partida (vitórias de rodada) + indicadores de turno, proteção e
// eliminação. Tudo informação pública.
export function Scoreboard({
  players,
  currentTurnSeat,
  protectedSeats,
  myUserId,
}: {
  players: RoomPlayerRow[];
  currentTurnSeat: number | null;
  protectedSeats: number[];
  myUserId: string | null;
}) {
  return (
    <div className="panel-wood rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Placar</h2>
        <span className="text-xs text-gray-400">primeiro a {MATCH_TARGET} vence</span>
      </div>
      <ul className="flex flex-col gap-1">
        {players.map((p) => {
          const isTurn = p.seat === currentTurnSeat;
          const isProtected = protectedSeats.includes(p.seat);
          const isMe = p.user_id === myUserId;
          return (
            <li
              key={p.id}
              className={`flex items-center justify-between rounded-lg px-2 py-1 ${
                isTurn ? "bg-amber-500/20 ring-1 ring-amber-400/40" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{avatarForSeat(p.seat)}</span>
                <span className={p.eliminated_this_round ? "text-gray-400 line-through" : ""}>
                  {p.nickname}
                  {isMe && <span className="text-xs text-gray-500"> (você)</span>}
                </span>
                {isTurn && <span title="vez dele">▶</span>}
                {isProtected && (
                  <span className="rounded bg-blue-100 px-1 text-xs text-blue-700">
                    Aia
                  </span>
                )}
              </span>
              <span className="font-mono font-semibold">{p.rounds_won}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
