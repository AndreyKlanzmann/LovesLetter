import type { CardValue } from "../../data/cards";
import type { CardEffect } from "../types";
import { guardEffect } from "./guard";
import { priestEffect } from "./priest";
import { baronEffect } from "./baron";
import { handmaidEffect } from "./handmaid";
import { princeEffect } from "./prince";
import { kingEffect } from "./king";
import { countessEffect } from "./countess";
import { princessEffect } from "./princess";

// Único ponto de acoplamento entre "valor da carta" e "efeito". Adicionar
// uma variante de carta com o mesmo valor (reskin) não muda nada aqui;
// trocar a regra de uma carta é editar só o arquivo daquele efeito.
export const CARD_EFFECTS: Record<CardValue, CardEffect> = {
  1: guardEffect,
  2: priestEffect,
  3: baronEffect,
  4: handmaidEffect,
  5: princeEffect,
  6: kingEffect,
  7: countessEffect,
  8: princessEffect,
};
