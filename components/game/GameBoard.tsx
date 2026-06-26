"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CARD_DEFINITIONS, type CardValue } from "@/lib/games/love-letter/data/cards";
import { playCard, startRound } from "@/lib/games/love-letter/actions";
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

const GUESS_VALUES: CardValue[] = [2, 3, 4, 5, 6, 7, 8]; // Guarda não pode chutar 1

export function GameBoard({ roomId, code }: { roomId: string; code: string }) {
  const { gameState, players, myHand, myUserId, loading } = useGameChannel(roomId);

  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [selectedGuess, setSelectedGuess] = useState<CardValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  // Texto da última ação (jogada anterior), público.
  let actionText: string | null = null;
  if (lastAction) {
    if (lastAction.type === "round_start") {
      actionText = `Nova rodada começou. ${nameForSeat(
        (lastAction as unknown as { firstSeat: number }).firstSeat
      )} joga primeiro.`;
    } else {
      actionText = describeAction(lastAction, nameForSeat);
    }
  }

  const targetsForSelected =
    selectedCard !== null && mySeat !== null
      ? targetableSeats(selectedCard, mySeat, publicPlayers(), protectedSeats)
      : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Sala {code}{" "}
          <span className="text-sm font-normal text-gray-500">
            · rodada {gameState.round_number}
          </span>
        </h1>
        <RulesPanel />
      </header>

      <Scoreboard
        players={players}
        currentTurnSeat={gameState.current_turn_seat}
        protectedSeats={protectedSeats}
        myUserId={myUserId}
      />

      {actionText && (
        <p className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700">{actionText}</p>
      )}

      <DiscardPile discardPile={discardPile} />

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
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold">
            Fim da rodada — {lastAction?.winnerSeat != null ? nameForSeat(lastAction.winnerSeat) : "?"} venceu!
          </p>
          <button
            onClick={nextRound}
            disabled={pending}
            className="mt-2 rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            Próxima rodada
          </button>
        </div>
      )}
      {status === "game_over" && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <p className="font-semibold">
            🏆 {lastAction?.winnerSeat != null ? nameForSeat(lastAction.winnerSeat) : "?"} venceu a partida!
          </p>
          <Link href="/" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Voltar ao início
          </Link>
        </div>
      )}

      {/* Mão do jogador + controles de jogada */}
      {status === "playing" && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-2 font-semibold">Sua mão</h2>
          {me?.eliminated_this_round ? (
            <p className="text-sm text-gray-500">
              Você foi eliminado nesta rodada. Aguarde o fim para a próxima.
            </p>
          ) : myHand.length === 0 ? (
            <p className="text-sm text-gray-400">Sem cartas no momento...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {myHand.map((c, i) => {
                const def = CARD_DEFINITIONS[c];
                const canPlay = isMyTurn && playable.includes(c);
                const selected = selectedCard === c;
                return (
                  <button
                    key={`${c}-${i}`}
                    disabled={!canPlay || pending}
                    onClick={() => {
                      setError(null);
                      setSelectedCard(c);
                      setSelectedTarget(null);
                      setSelectedGuess(null);
                    }}
                    className={`w-32 rounded-lg border p-3 text-left transition ${
                      selected ? "border-black ring-2 ring-black" : "border-gray-300"
                    } ${canPlay ? "hover:border-black" : "cursor-not-allowed opacity-50"}`}
                  >
                    <p className="font-bold">
                      {def.value} · {def.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">{def.description}</p>
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
            <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-3">
              {cardRequiresTarget(selectedCard) && targetsForSelected.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Alvo:</p>
                  <div className="flex flex-wrap gap-2">
                    {targetsForSelected.map((seat) => (
                      <button
                        key={seat}
                        onClick={() => setSelectedTarget(seat)}
                        className={`rounded border px-3 py-1 text-sm ${
                          selectedTarget === seat ? "border-black bg-black text-white" : "border-gray-300"
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
                        className={`rounded border px-2 py-1 text-sm ${
                          selectedGuess === g ? "border-black bg-black text-white" : "border-gray-300"
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
                  className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                  {pending ? "Jogando..." : `Jogar ${CARD_DEFINITIONS[selectedCard].name}`}
                </button>
                <button
                  onClick={resetSelection}
                  disabled={pending}
                  className="rounded border border-gray-300 px-4 py-2"
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
