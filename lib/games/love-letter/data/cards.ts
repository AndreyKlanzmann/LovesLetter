// Dados puros das cartas: nome, descrição e arte. NENHUMA regra de jogo mora
// aqui — quem decide o que cada carta FAZ é lib/games/love-letter/engine/effects.
// Um reskin temático futuro troca só este arquivo (e os assets em /public),
// sem tocar no motor.

export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface CardDefinition {
  value: CardValue;
  name: string;
  count: number; // quantas cópias existem no baralho de 16 cartas
  description: string;
  art: string; // caminho do asset em /public
  icon: string; // emoji/ícone temático (visual; um reskin troca aqui)
}

export const CARD_DEFINITIONS: Record<CardValue, CardDefinition> = {
  1: {
    value: 1,
    name: "Guarda",
    count: 5,
    description:
      "Escolha um jogador e diga um valor de carta (exceto Guarda). Se ele tiver essa carta, é eliminado.",
    art: "/cards/guard.png",
    icon: "🔍",
  },
  2: {
    value: 2,
    name: "Padre",
    count: 2,
    description: "Olhe a mão de outro jogador.",
    art: "/cards/priest.png",
    icon: "👁️",
  },
  3: {
    value: 3,
    name: "Barão",
    count: 2,
    description:
      "Compare sua mão com a de outro jogador em segredo. Quem tiver o menor valor é eliminado.",
    art: "/cards/baron.png",
    icon: "⚔️",
  },
  4: {
    value: 4,
    name: "Aia",
    count: 2,
    description: "Você fica protegido contra efeitos até o início do seu próximo turno.",
    art: "/cards/handmaid.png",
    icon: "🛡️",
  },
  5: {
    value: 5,
    name: "Príncipe",
    count: 2,
    description:
      "Escolha um jogador (pode ser você mesmo) para descartar a mão e comprar uma nova carta.",
    art: "/cards/prince.png",
    icon: "🤴",
  },
  6: {
    value: 6,
    name: "Rei",
    count: 1,
    description: "Troque sua mão com a de outro jogador.",
    art: "/cards/king.png",
    icon: "👑",
  },
  7: {
    value: 7,
    name: "Condessa",
    count: 1,
    description:
      "Sem efeito ao jogar. Deve ser descartada obrigatoriamente se você tiver o Rei ou o Príncipe na mão.",
    art: "/cards/countess.png",
    icon: "🌹",
  },
  8: {
    value: 8,
    name: "Princesa",
    count: 1,
    description: "Se você descartar esta carta por qualquer motivo, está eliminado na hora.",
    art: "/cards/princess.png",
    icon: "💌",
  },
};

export const ALL_CARD_VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 8];

export const TOTAL_CARDS_IN_DECK = Object.values(CARD_DEFINITIONS).reduce(
  (sum, def) => sum + def.count,
  0
); // 16
