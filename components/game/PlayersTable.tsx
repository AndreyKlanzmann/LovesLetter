import type { Database } from "@/lib/supabase/types";
import { avatarForSeat } from "@/lib/games/love-letter/avatars";

type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

// Mesa de saloon: cada adversário sentado com avatar e o VERSO das cartas em
// leque. A quantidade é deduzida de info pública (não vaza a carta):
//   eliminado -> 0 ; jogador da vez -> 2 (já comprou) ; demais -> 1.
function handCount(seat: number, eliminated: boolean, turn: number | null, playing: boolean): number {
  if (eliminated) return 0;
  if (playing && seat === turn) return 2;
  return 1;
}

function CardBack({ rotate }: { rotate: number }) {
  return (
    <div
      className="h-14 w-10 rounded-md border border-amber-200/30 bg-gradient-to-br from-rose-800 to-rose-950 shadow-md"
      style={{ transform: `rotate(${rotate}deg)`, transformOrigin: "bottom center", marginLeft: -10, marginRight: -10 }}
    >
      <div className="m-1 h-[calc(100%-0.5rem)] rounded-sm border border-amber-200/20 bg-[radial-gradient(circle_at_center,rgba(255,220,170,0.22)_1px,transparent_1px)] [background-size:6px_6px]" />
    </div>
  );
}

function Fan({ count }: { count: number }) {
  if (count === 0) return <span className="text-2xl">💀</span>;
  return (
    <div className="flex items-end justify-center pt-1">
      {Array.from({ length: count }).map((_, i) => (
        <CardBack key={i} rotate={(i - (count - 1) / 2) * 14} />
      ))}
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
  deckCount,
}: {
  players: RoomPlayerRow[];
  currentTurnSeat: number | null;
  protectedSeats: number[];
  playing: boolean;
  myUserId: string | null;
  lastActorSeat: number | null;
  deckCount: number;
}) {
  const opponents = players.filter((p) => p.user_id !== myUserId);
  const turnPlayer = players.find((p) => p.seat === currentTurnSeat);
  const myTurn = turnPlayer?.user_id === myUserId;

  return (
    <div className="felt rounded-[2rem] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-around gap-3">
        {opponents.map((p) => {
          const isTurn = p.seat === currentTurnSeat && playing;
          const isProtected = protectedSeats.includes(p.seat);
          const justPlayed = p.seat === lastActorSeat;
          const count = handCount(p.seat, p.eliminated_this_round, currentTurnSeat, playing);
          return (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-3xl transition ${
                  isTurn
                    ? "anim-turn border-amber-300 bg-amber-300/15"
                    : justPlayed
                      ? "border-sky-300/70 bg-sky-300/10"
                      : "border-black/30 bg-black/20"
                } ${p.eliminated_this_round ? "opacity-40 grayscale" : ""}`}
              >
                {avatarForSeat(p.seat)}
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-semibold ${
                    p.eliminated_this_round ? "text-gray-400 line-through" : "text-amber-50"
                  }`}
                >
                  {p.nickname}
                </span>
                {isProtected && (
                  <span className="rounded bg-blue-500/40 px-1 text-[10px] text-blue-100">Aia</span>
                )}
              </div>
              <Fan count={count} />
            </div>
          );
        })}
      </div>

      {/* Medalhão central: de quem é a vez + cartas no baralho */}
      <div className="mt-4 flex flex-col items-center">
        <div className="flex items-center gap-2 rounded-full border border-amber-200/25 bg-black/30 px-4 py-1.5">
          {turnPlayer && (
            <span className="text-lg">{avatarForSeat(turnPlayer.seat)}</span>
          )}
          <span className="font-display text-sm text-amber-100">
            {!playing
              ? "rodada encerrada"
              : myTurn
                ? "Sua vez!"
                : turnPlayer
                  ? `Vez de ${turnPlayer.nickname}`
                  : "..."}
          </span>
        </div>
        <span className="mt-1 text-xs text-amber-100/60">🂠 {deckCount} no baralho</span>
      </div>
    </div>
  );
}
