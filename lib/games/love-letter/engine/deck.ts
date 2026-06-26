import { CARD_DEFINITIONS, type CardValue } from "../data/cards";

export function buildFreshDeck(): CardValue[] {
  const deck: CardValue[] = [];
  for (const def of Object.values(CARD_DEFINITIONS)) {
    for (let i = 0; i < def.count; i++) deck.push(def.value);
  }
  return shuffle(deck);
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
