"use client";

import { useEffect, useRef } from "react";

// Sons curtos gerados na hora (sem arquivos). Tudo client-side.
function tone(freq: number, durationMs: number, type: OscillatorType = "sine", peak = 0.15) {
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = ac.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);
    osc.start(t);
    osc.stop(t + durationMs / 1000 + 0.02);
    osc.onended = () => ac.close();
  } catch {
    /* áudio pode estar bloqueado — ignora */
  }
}

function playClick() {
  tone(420, 90, "triangle", 0.12);
}
function playRoundEnd() {
  tone(330, 180, "sine", 0.14);
  setTimeout(() => tone(440, 180, "sine", 0.14), 120);
}
function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 200, "sine", 0.16), i * 130));
}

// Toca um som sempre que a ação muda (para TODOS os jogadores): clique a cada
// jogada, acorde no fim de rodada, fanfarra no fim de partida.
export function useGameSounds(actionKey: string, status: string, muted: boolean) {
  const prevKey = useRef(actionKey);
  useEffect(() => {
    if (!muted && actionKey && actionKey !== prevKey.current) {
      if (status === "game_over") playWin();
      else if (status === "round_over") playRoundEnd();
      else playClick();
    }
    prevKey.current = actionKey;
  }, [actionKey, status, muted]);
}
