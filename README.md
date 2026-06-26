# Love Letter — multiplayer web (Next.js + Supabase)

## Configurando o Supabase (passo a passo)

1. **Criar o projeto**: acesse https://supabase.com/dashboard, clique em "New project", escolha organização, nome (ex: `loves-letter`), senha do banco (guarde-a) e a região mais próxima dos jogadores. Aguarde o provisionamento (~2 min).
2. **Habilitar Auth anônima**: no painel, vá em *Authentication → Sign In / Providers → Anonymous Sign-ins* e ative. Sem isso, `supabase.auth.signInAnonymously()` falha.
3. **Pegar as chaves**: em *Project Settings → API*:
   - `Project URL` → copie para `NEXT_PUBLIC_SUPABASE_URL`.
   - `anon public` key → copie para `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - `service_role` key (em "Project API keys", clique para revelar) → copie para `SUPABASE_SERVICE_ROLE_KEY`. **Nunca** prefixe esta com `NEXT_PUBLIC_` nem a exponha no client — ela ignora todas as RLS policies e só pode ser usada em Server Actions/rotas que rodam no servidor.
4. Copie `.env.local.example` para `.env.local` e preencha as três variáveis.
5. **Rodar as migrations**: instale a CLI (`npm i -g supabase` ou via `npx supabase`), faça login (`npx supabase login`), associe o projeto (`npx supabase link --project-ref <seu-ref>`) e aplique:
   ```bash
   npx supabase db push
   ```
   Isso roda, em ordem, os arquivos em `supabase/migrations/`:
   - `0001_rooms_and_lobby.sql`: cria as tabelas (`rooms`, `room_players`, `game_states`, `player_hands`, `round_decks`) e todas as RLS policies, com comentários explicando cada uma.
   - `0002_lobby_rpc.sql`: cria as funções `create_room` e `join_room`.

   Alternativa sem CLI: abra *SQL Editor* no dashboard e cole o conteúdo de cada arquivo, na ordem, executando um por vez.
6. (Opcional, recomendado) Gere os tipos TypeScript reais a partir do schema publicado:
   ```bash
   npx supabase gen types typescript --project-id <seu-ref> > lib/supabase/types.ts
   ```
   Até lá, `lib/supabase/types.ts` contém tipos escritos manualmente que espelham as migrations.

## Por que a mão de cada jogador é realmente privada (não só escondida na UI)

A tabela `player_hands` guarda a mão de cada jogador numa linha própria (`room_id`, `user_id`, `cards`). A única RLS policy de `SELECT` nessa tabela é:

```sql
using (user_id = auth.uid())
```

Isso significa que, no nível do Postgres, uma query `select * from player_hands` feita por um jogador autenticado só pode retornar a própria linha — as linhas de outros jogadores não existem do ponto de vista daquela conexão, independentemente do que o client tente fazer (inclusive abrindo o devtools e chamando a API diretamente). Não há `INSERT`/`UPDATE` liberado para o client nessa tabela: toda escrita (distribuir cartas, comprar, descartar, efeitos) passa por Server Actions que usam a `service_role` key (que ignora RLS) — só código que roda no servidor consegue gravar mãos.

O baralho restante (`round_decks`) recebe a mesma proteção: zero policies, ou seja, acesso negado por padrão para qualquer usuário comum.

## Estrutura

```
app/                          rotas (Next.js App Router)
components/lobby, components/game   UI
lib/supabase/                 clients (browser, server, service-role) + tipos
lib/rooms/                    sistema de salas reusável (criar/entrar/realtime)
lib/games/love-letter/data/   dados das cartas (nome, descrição, arte) — sem regra
lib/games/love-letter/engine/ motor puro: deck, distribuição, validação e
                               efeitos (um arquivo por carta em engine/effects/)
supabase/migrations/          schema + RLS + RPCs, com comentários explicando
                               cada policy
```

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000, crie uma sala, compartilhe o código com os 2 amigos.

## Como a partida funciona (Server Actions + motor)

Toda escrita de estado de jogo passa por **Server Actions** (`lib/games/love-letter/actions.ts`),
que rodam só no servidor:

- A **identidade** de quem joga vem do cookie de sessão (RLS) — o client não
  escolhe "qual assento" está jogando; o servidor descobre pelo `auth.uid()`.
- A **leitura/escrita do estado** usa o client **service-role** (ignora RLS),
  porque o motor precisa ver as mãos e o baralho de todos para resolver efeitos
  como Padre, Rei e Barão. O navegador continua sempre restrito pela RLS.
- O motor puro (`engine/`) é chamado pela action: `resolvePlay()` valida a
  jogada, aplica o efeito modular daquela carta e decide o fim da rodada. A
  action então persiste o resultado nas tabelas (`persistence.ts`).
- A revelação do **Padre** (ver a mão de um oponente) volta apenas como retorno
  da action para quem jogou — **nunca** é gravada em nenhuma coluna legível por
  outro jogador.

> Nota sobre a decisão de arquitetura: as RPCs SQL (`SECURITY DEFINER`) foram
> usadas só para as operações atômicas de lobby (`create_room`/`join_room`). A
> lógica de jogo ficou em Server Actions com service-role em vez de RPC, para
> manter cada efeito como um arquivo TypeScript modular (um por carta), como
> pedido — em vez de espalhar a regra em PL/pgSQL.

## Status atual

Implementado: configuração do Supabase, lobby (criar/entrar sala, realtime de
jogadores), o motor de regras do Love Letter (baralho, distribuição, validação,
os 8 efeitos modulares), as Server Actions da partida (iniciar rodada, jogar
carta, placar de melhor-de-3) e a tela de jogo (mão própria, vez atual, pilha de
descarte, indicador de proteção da Aia, placar e painel de regras sempre
acessível).
