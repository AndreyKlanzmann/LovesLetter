import type { Database } from "@/lib/supabase/types";

type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

// Mesa: mostra cada jogador com o VERSO das cartas que tem na mão. A
// quantidade é deduzida de info pública (não vaza a carta):
//   eliminado -> 0 ; jogador da vez -> 2 (já comprou) ; demais -> 1.
// Destaca de quem é a vez e quem jogou por último.
function handCount(
  seat: number,
  eliminated: boolean,
  currentTurnSeat: number | null,
  playing: boolean
): number {
  if (eliminated) return 0;
  if (playing && seat === currentTurnSeat) return 2;
  return 1;
}

function CardBack() {
  return (
    <div className="h-12 w-9 rounded-md border border-indigo-300/40 bg-gradient-to-br from-indigo-600 to-indigo-900 shadow-sm">
      <div className="m-1 h-[calc(100%-0.5rem)] rounded-sm border border-white/15 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:6px_6px]" />
    </div>
  );
}

export function PlayersTable({
  players,
  currentTurnSeat,
  protectedSeats,
  playing,
  myUserId,
  lastActorSeat,
}: {
  players: RoomPlayerRow[];
  currentTurnSeat: number | null;
  protectedSeats: number[];
  playing: boolean;
  myUserId: string | null;
  lastActorSeat: number | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <h2 className="mb-2 text-sm font-semibold text-gray-300">Mesa</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {players.map((p) => {
          const isTurn = p.seat === currentTurnSeat && playing;
          const isProtected = protectedSeats.includes(p.seat);
          const justPlayed = p.seat === lastActorSeat;
          const count = handCount(p.seat, p.eliminated_this_round, currentTurnSeat, playing);
          return (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-2 rounded-lg border p-2 transition ${
                isTurn
                  ? "anim-turn border-amber-400/60 bg-amber-400/10"
                  : justPlayed
                    ? "border-sky-400/50 bg-sky-400/10"
                    : "border-white/10"
              }`}
            >
              <div className="flex items-center gap-1 text-sm">
                <span
                  className={p.eliminated_this_round ? "text-gray-500 line-through" : "text-gray-200"}
                >
                  {p.nickname}
                  {p.user_id === myUserId && <span className="text-xs text-gray-500"> (você)</span>}
                </span>
                {isProtected && (
                  <span className="rounded bg-blue-500/30 px-1 text-[10px] text-blue-200">Aia</span>
                )}
              </div>
              <div className={`flex gap-1 ${justPlayed ? "anim-pop" : ""}`}>
                {p.eliminated_this_round ? (
                  <span className="text-xl" title="eliminado">
                    💀
                  </span>
                ) : (
                  Array.from({ length: count }).map((_, i) => <CardBack key={i} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
