"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CARD_DEFINITIONS, type CardValue } from "@/lib/games/love-letter/data/cards";
import { playAgain, playCard, startRound } from "@/lib/games/love-letter/actions";
import { useGameChannel } from "@/lib/games/love-letter/useGameChannel";
import {
  cardRequiresGuess,
  cardRequiresTarget,
  playableCards,
  targetableSeats,
} from "@/lib/games/love-letter/clientTargeting";
import { describeAction, type LastAction } from "@/lib/games/love-letter/describe";
import { Scoreboard } from "./Scoreboard";
import { DiscardPile } from "./DiscardPile";
import { RulesPanel } from "./RulesPanel";
import { CardFace } from "./CardFace";
import { CardTracker } from "./CardTracker";
import { PlayersTable } from "./PlayersTable";
import { Table3DView } from "./three/Table3DView";
import { useTurnAlert } from "./useTurnAlert";
import { useGameSounds } from "./useGameSounds";

const GUESS_VALUES: CardValue[] = [2, 3, 4, 5, 6, 7, 8]; // Guarda não pode chutar 1

export function GameBoard({ roomId, code }: { roomId: string; code: string }) {
  const { gameState, players, myHand, myUserId, loading } = useGameChannel(roomId);

  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [selectedGuess, setSelectedGuess] = useState<CardValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [muted, setMuted] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("ll-muted") === "1"
  );
  const [view3d, setView3d] = useState(
    () => typeof window === "undefined" || localStorage.getItem("ll-2d") !== "1"
  );

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (typeof window !== "undefined") localStorage.setItem("ll-muted", next ? "1" : "0");
      return next;
    });
  }

  function toggleView() {
    setView3d((v) => {
      const next = !v;
      if (typeof window !== "undefined") localStorage.setItem("ll-2d", next ? "0" : "1");
      return next;
    });
  }

  // Alerta de "sua vez" (som + título) e sons de ação. Calculado aqui, antes
  // de qualquer return condicional, para respeitar as regras de hooks.
  const meEarly = players.find((p) => p.user_id === myUserId);
  const isMyTurnAlert =
    !!gameState &&
    gameState.round_status === "playing" &&
    !!meEarly &&
    gameState.current_turn_seat === meEarly.seat &&
    !meEarly.eliminated_this_round;
  useTurnAlert(isMyTurnAlert, muted);

  const lastAct = gameState?.last_action as LastAction | null;
  const soundKey = lastAct
    ? `${lastAct.type}-${lastAct.seat}-${(gameState?.discard_pile as number[] | undefined)?.length ?? 0}`
    : "";
  useGameSounds(soundKey, gameState?.round_status ?? "", muted);

  if (loading || !gameState) {
    return <main className="mx-auto max-w-2xl px-6 py-16">Carregando partida...</main>;
  }

  const me = players.find((p) => p.user_id === myUserId);
  const mySeat = me?.seat ?? null;
  const nameForSeat = (seat: number) =>
    players.find((p) => p.seat === seat)?.nickname ?? `assento ${seat}`;

  const protectedSeats = (gameState.protected_seats as number[]) ?? [];
  const discardPile = (gameState.discard_pile as CardValue[]) ?? [];
  const lastAction = gameState.last_action as LastAction | null;
  const status = gameState.round_status;

  const isMyTurn =
    status === "playing" &&
    mySeat !== null &&
    gameState.current_turn_seat === mySeat &&
    me != null &&
    !me.eliminated_this_round;

  const playable = playableCards(myHand);

  function resetSelection() {
    setSelectedCard(null);
    setSelectedTarget(null);
    setSelectedGuess(null);
  }

  // Selecionar uma carta (usado tanto pelos botões 2D quanto pelo clique 3D).
  function selectCard(c: CardValue) {
    if (!isMyTurn || !playable.includes(c)) return;
    setError(null);
    setSelectedCard(c);
    setSelectedTarget(null);
    setSelectedGuess(null);
  }

  function publicPlayers() {
    return players.map((p) => ({ seat: p.seat, eliminated: p.eliminated_this_round }));
  }

  function confirmPlay() {
    if (selectedCard === null || mySeat === null) return;
    const targets = targetableSeats(selectedCard, mySeat, publicPlayers(), protectedSeats);
    const needsTarget = cardRequiresTarget(selectedCard) && targets.length > 0;
    const needsGuess = cardRequiresGuess(selectedCard) && targets.length > 0;

    if (needsTarget && selectedTarget === null) {
      setError("Escolha um alvo.");
      return;
    }
    if (needsGuess && selectedGuess === null) {
      setError("Escolha um palpite.");
      return;
    }

    const move = {
      playedCard: selectedCard,
      targetSeat: needsTarget ? selectedTarget! : undefined,
      guessedValue: needsGuess ? selectedGuess! : undefined,
    };

    setError(null);
    startTransition(async () => {
      const res = await playCard(roomId, move);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.privateReveal) {
        setReveal(
          `Mão de ${nameForSeat(res.privateReveal.targetSeat)}: ${
            CARD_DEFINITIONS[res.privateReveal.cardValue].name
          } (${res.privateReveal.cardValue})`
        );
      }
      resetSelection();
    });
  }

  function nextRound() {
    setError(null);
    setReveal(null);
    startTransition(async () => {
      const res = await startRound(roomId);
      if (!res.ok) setError(res.error);
    });
  }

  function newMatch() {
    setError(null);
    setReveal(null);
    startTransition(async () => {
      const res = await playAgain(roomId);
      if (!res.ok) setError(res.error);
    });
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).catch(() => {});
  }

  // Texto público de uma ação (resolve nomes pelos seats).
  function actionTextFor(a: LastAction | null | undefined): string | null {
    if (!a) return null;
    if (a.type === "round_start") {
      return `Nova rodada começou. ${
        a.firstSeat != null ? nameForSeat(a.firstSeat) : "?"
      } joga primeiro.`;
    }
    return describeAction(a, nameForSeat);
  }

  // As duas últimas atividades (a atual e a anterior aninhada).
  const recentActions = [actionTextFor(lastAction), actionTextFor(lastAction?.prev)].filter(
    (t): t is string => t != null
  );

  const targetsForSelected =
    selectedCard !== null && mySeat !== null
      ? targetableSeats(selectedCard, mySeat, publicPlayers(), protectedSeats)
      : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl text-amber-200">Sala {code}</h1>
          <button
            onClick={copyCode}
            title="Copiar código da sala"
            className="rounded border border-white/20 px-2 py-0.5 text-xs text-gray-300 hover:border-white/40"
          >
            copiar
          </button>
          <span className="text-sm text-gray-400">· rodada {gameState.round_number}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleView}
            title={view3d ? "Ver em 2D" : "Ver em 3D"}
            className="rounded border border-white/20 px-2 py-1 text-xs hover:border-white/40"
          >
            {view3d ? "3D" : "2D"}
          </button>
          <button
            onClick={toggleMute}
            title={muted ? "Ativar sons" : "Silenciar"}
            className="rounded border border-white/20 px-2 py-1 text-sm hover:border-white/40"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <RulesPanel />
        </div>
      </header>

      <Scoreboard
        players={players}
        currentTurnSeat={gameState.current_turn_seat}
        protectedSeats={protectedSeats}
        myUserId={myUserId}
      />

      {recentActions.length > 0 && (
        <div className="panel-wood rounded-lg px-3 py-2">
          {recentActions.map((t, i) => (
            <p key={i} className={`text-sm ${i === 0 ? "text-gray-200" : "text-gray-500"}`}>
              {i === 0 ? "» " : "  "}
              {t}
            </p>
          ))}
        </div>
      )}

      {view3d ? (
        <Table3DView
          players={players}
          currentTurnSeat={gameState.current_turn_seat}
          protectedSeats={protectedSeats}
          playing={status === "playing"}
          myUserId={myUserId}
          lastActorSeat={lastAction && lastAction.type !== "round_start" ? lastAction.seat : null}
          deckCount={gameState.deck_count}
          discardPile={discardPile}
          myHand={myHand}
          isMyTurn={isMyTurn}
          playable={playable}
          selectedCard={selectedCard}
          onSelectCard={selectCard}
        />
      ) : (
        <PlayersTable
          players={players}
          currentTurnSeat={gameState.current_turn_seat}
          protectedSeats={protectedSeats}
          playing={status === "playing"}
          myUserId={myUserId}
          lastActorSeat={lastAction && lastAction.type !== "round_start" ? lastAction.seat : null}
          deckCount={gameState.deck_count}
        />
      )}

      <DiscardPile discardPile={discardPile} />

      <CardTracker discardPile={discardPile} myHand={myHand} />

      {/* Resultado privado do Padre — só este jogador vê. */}
      {reveal && (
        <div className="flex items-center justify-between rounded bg-purple-100 px-3 py-2 text-sm text-purple-800">
          <span>{reveal}</span>
          <button onClick={() => setReveal(null)} className="text-purple-600 hover:underline">
            ok
          </button>
        </div>
      )}

      {/* Fim de rodada / partida */}
      {status === "round_over" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-gray-900">
          <p className="font-semibold">
            Fim da rodada — {lastAction?.winnerSeat != null ? nameForSeat(lastAction.winnerSeat) : "?"} venceu!
          </p>
          {lastAction?.reveal && lastAction.reveal.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-600">Mãos reveladas:</p>
              <div className="flex flex-wrap gap-2">
                {lastAction.reveal.map((r) => (
                  <div
                    key={r.seat}
                    className={`flex items-center gap-2 ${
                      r.seat === lastAction.winnerSeat ? "" : "opacity-70"
                    }`}
                  >
                    <span className="text-xs">{nameForSeat(r.seat)}</span>
                    <CardFace value={r.card} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={nextRound}
            disabled={pending}
            className="mt-3 rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            Próxima rodada
          </button>
        </div>
      )}
      {status === "game_over" && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-gray-900">
          <p className="text-lg font-bold">
            🏆 {lastAction?.winnerSeat != null ? nameForSeat(lastAction.winnerSeat) : "?"} venceu a partida!
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={newMatch}
              disabled={pending}
              className="rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? "Reiniciando..." : "Jogar novamente"}
            </button>
            <Link href="/" className="text-sm text-blue-700 hover:underline">
              Voltar ao início
            </Link>
          </div>
        </div>
      )}

      {/* Mão do jogador + controles de jogada */}
      {status === "playing" && (
        <div className={`panel-wood rounded-xl p-4 ${isMyTurn ? "anim-turn" : ""}`}>
          <h2 className="mb-2 font-display text-amber-100">
            Sua mão {isMyTurn && <span className="text-amber-400">· sua vez!</span>}
          </h2>
          {me?.eliminated_this_round ? (
            <p className="text-sm text-gray-500">
              Você foi eliminado nesta rodada. Aguarde o fim para a próxima.
            </p>
          ) : myHand.length === 0 ? (
            <p className="text-sm text-gray-400">Sem cartas no momento...</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {myHand.map((c, i) => {
                const canPlay = isMyTurn && playable.includes(c);
                const selected = selectedCard === c;
                return (
                  <button
                    key={`${c}-${i}`}
                    disabled={!canPlay || pending}
                    onClick={() => selectCard(c)}
                    className={`rounded-xl transition ${
                      selected ? "ring-4 ring-amber-400" : ""
                    } ${canPlay ? "hover:-translate-y-1 hover:shadow-lg" : "cursor-not-allowed opacity-50"}`}
                  >
                    <CardFace value={c} size="lg" showDescription />
                  </button>
                );
              })}
            </div>
          )}

          {!isMyTurn && !me?.eliminated_this_round && (
            <p className="mt-3 text-sm text-gray-500">
              Aguardando a vez de {gameState.current_turn_seat != null ? nameForSeat(gameState.current_turn_seat) : "..."}.
            </p>
          )}

          {/* Escolha de alvo / palpite quando uma carta está selecionada */}
          {isMyTurn && selectedCard !== null && (
            <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-3">
              {cardRequiresTarget(selectedCard) && targetsForSelected.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Alvo:</p>
                  <div className="flex flex-wrap gap-2">
                    {targetsForSelected.map((seat) => (
                      <button
                        key={seat}
                        onClick={() => setSelectedTarget(seat)}
                        className={`rounded-lg border px-3 py-1 text-sm ${
                          selectedTarget === seat
                            ? "border-amber-400 bg-amber-400 font-semibold text-black"
                            : "border-white/20 hover:border-white/40"
                        }`}
                      >
                        {nameForSeat(seat)}
                        {seat === mySeat && " (você)"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cardRequiresTarget(selectedCard) && targetsForSelected.length === 0 && (
                <p className="text-sm text-gray-500">
                  Todos os outros estão protegidos — esta carta será jogada sem efeito.
                </p>
              )}

              {cardRequiresGuess(selectedCard) && targetsForSelected.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Palpite (valor da carta do alvo):</p>
                  <div className="flex flex-wrap gap-2">
                    {GUESS_VALUES.map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGuess(g)}
                        className={`rounded-lg border px-2 py-1 text-sm ${
                          selectedGuess === g
                            ? "border-amber-400 bg-amber-400 font-semibold text-black"
                            : "border-white/20 hover:border-white/40"
                        }`}
                        title={CARD_DEFINITIONS[g].name}
                      >
                        {g} · {CARD_DEFINITIONS[g].name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={confirmPlay}
                  disabled={pending}
                  className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {pending ? "Jogando..." : `Jogar ${CARD_DEFINITIONS[selectedCard].name}`}
                </button>
                <button
                  onClick={resetSelection}
                  disabled={pending}
                  className="rounded-lg border border-white/20 px-4 py-2 hover:border-white/40"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
