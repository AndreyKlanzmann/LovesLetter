"use client";

import { useEffect, useRef } from "react";

// Avisa o jogador quando vira a vez dele: um "beep" curto (gerado na hora, sem
// arquivo de áudio) e o título da aba piscando "▶ Sua vez!" enquanto a aba
// estiver em segundo plano. Tudo client-side, nada compartilhado.
export function useTurnAlert(isMyTurn: boolean, muted = false) {
  const wasMyTurn = useRef(false);

  // Beep na transição "não era minha vez" -> "agora é".
  useEffect(() => {
    if (isMyTurn && !wasMyTurn.current && !muted) {
      try {
        const w = window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        };
        const Ctx = w.AudioContext ?? w.webkitAudioContext;
        if (Ctx) {
          const ac = new Ctx();
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.0001, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.35);
          osc.start();
          osc.stop(ac.currentTime + 0.36);
          osc.onended = () => ac.close();
        }
      } catch {
        /* navegador pode bloquear áudio sem interação — tudo bem */
      }
    }
    wasMyTurn.current = isMyTurn;
  }, [isMyTurn, muted]);

  // Título piscando enquanto for a minha vez e a aba estiver escondida.
  useEffect(() => {
    if (!isMyTurn) return;
    const original = document.title;
    let on = false;
    const id = setInterval(() => {
      if (document.hidden) {
        document.title = on ? original : "▶ Sua vez!";
        on = !on;
      } else {
        document.title = original;
      }
    }, 900);
    const onVisible = () => {
      if (!document.hidden) document.title = original;
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      document.title = original;
    };
  }, [isMyTurn]);
}
