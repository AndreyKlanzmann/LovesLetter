"use client";

import { useEffect, useState } from "react";

// Evento de instalação do PWA (não está nos tipos padrão do DOM).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Botão visível de "Instalar no PC". Aparece quando o navegador (Chrome/Edge)
// considera o jogo instalável; some quando já está instalado. No iOS/Safari o
// evento não existe — nesse caso mostramos uma dica curta.
export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches === true
  );
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (!deferred) {
    // Sem prompt nativo disponível: mostra uma ajudinha de como instalar.
    return (
      <div className="text-center text-xs text-amber-100/50">
        <button onClick={() => setHint((h) => !h)} className="underline hover:text-amber-100/80">
          Como instalar no PC?
        </button>
        {hint && (
          <p className="mt-1">
            No Chrome/Edge: menu <strong>⋮</strong> → <strong>&ldquo;Instalar Love Letter&rdquo;</strong>{" "}
            (ou o ícone de instalar na barra de endereço). No celular: compartilhar →{" "}
            <strong>Adicionar à tela inicial</strong>.
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}
      className="w-full rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20"
    >
      ⬇️ Instalar no PC
    </button>
  );
}
