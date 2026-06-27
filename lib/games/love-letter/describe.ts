import { CARD_DEFINITIONS, type CardValue } from "./data/cards";

// Transforma o `last_action` (estruturado, baseado em seats) numa frase legível.
// É puro e roda nos dois lados: o servidor pode pré-calcular, mas a UI também
// chama isto para resolver nomes de jogadores a partir do seat. Nenhuma
// informação secreta entra aqui — note que o Padre só revela "olhou a mão",
// nunca o valor visto (esse vai só para quem jogou, via retorno da action).

export interface LastAction {
  seat: number;
  card: CardValue;
  type: string;
  targetSeat?: number;
  guessedValue?: CardValue;
  hit?: boolean;
  eliminatedSeat?: number | null;
  discarded?: CardValue;
  eliminated?: boolean;
  roundEnded?: boolean;
  winnerSeat?: number | null;
  matchOver?: boolean;
  firstSeat?: number; // só em round_start
  prev?: LastAction | null; // a ação imediatamente anterior (1 nível só)
  // Mãos reveladas no fim da rodada (showdown) — público, só preenchido quando
  // roundEnded. Mostra a carta final de cada jogador ainda vivo.
  reveal?: { seat: number; card: CardValue }[];
}

export function describeAction(
  action: LastAction,
  nameForSeat: (seat: number) => string
): string {
  const actor = nameForSeat(action.seat);
  const cardName = CARD_DEFINITIONS[action.card].name;
  const target =
    action.targetSeat !== undefined ? nameForSeat(action.targetSeat) : null;

  switch (action.type) {
    case "guard_guess":
      return action.hit
        ? `${actor} jogou Guarda contra ${target}, acertou ${CARD_DEFINITIONS[action.guessedValue!].name} — ${target} foi eliminado!`
        : `${actor} jogou Guarda contra ${target} chutando ${CARD_DEFINITIONS[action.guessedValue!].name} — errou.`;
    case "priest_peek":
      return `${actor} jogou Padre e olhou a mão de ${target}.`;
    case "baron_compare":
      if (action.eliminatedSeat == null)
        return `${actor} jogou Barão contra ${target} — empate, ninguém eliminado.`;
      return `${actor} jogou Barão contra ${target} — ${nameForSeat(action.eliminatedSeat)} tinha a carta menor e foi eliminado!`;
    case "handmaid_protect":
      return `${actor} jogou Aia e está protegido até o próximo turno.`;
    case "prince_discard":
      return action.eliminated
        ? `${actor} jogou Príncipe forçando ${target} a descartar a Princesa — ${target} foi eliminado!`
        : `${actor} jogou Príncipe; ${target} descartou ${action.discarded ? CARD_DEFINITIONS[action.discarded].name : "a mão"} e comprou outra carta.`;
    case "king_swap":
      return `${actor} jogou Rei e trocou de mão com ${target}.`;
    case "countess_noop":
      return `${actor} descartou a Condessa.`;
    case "princess_discarded":
      return `${actor} descartou a Princesa e foi eliminado!`;
    case "fizzle":
      return `${actor} jogou ${cardName}, mas todos os alvos estavam protegidos — sem efeito.`;
    default:
      return `${actor} jogou ${cardName}.`;
  }
}
