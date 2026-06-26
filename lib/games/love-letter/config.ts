// Configuração da partida, separada das Server Actions porque um módulo
// "use server" só pode exportar funções async.

// Partida = melhor de N: primeiro a este número de vitórias de rodada vence.
export const MATCH_TARGET = 3;
