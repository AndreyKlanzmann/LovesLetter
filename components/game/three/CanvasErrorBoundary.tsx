"use client";

import { Component, type ReactNode } from "react";

// Protege a árvore 3D: se o WebGL/Three falhar (placa antiga, contexto
// perdido, etc.), mostramos um aviso com um botão para cair no modo 2D, em
// vez de quebrar a tela inteira.
interface Props {
  onFallback: () => void;
  children: ReactNode;
}
interface State {
  failed: boolean;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-amber-100/80">
            Não foi possível carregar a mesa 3D neste dispositivo.
          </p>
          <button
            onClick={this.props.onFallback}
            className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400"
          >
            Jogar em 2D
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
