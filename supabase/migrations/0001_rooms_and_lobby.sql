-- =========================================================================
-- Love Letter — esquema de salas/lobby (reusável para futuros jogos)
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- rooms: uma sala, identificada por um código curto que os amigos digitam.
-- ---------------------------------------------------------------------------
create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  game_type   text not null default 'love_letter',
  status      text not null default 'lobby'
              check (status in ('lobby', 'playing', 'finished')),
  host_id     uuid not null references auth.users (id),
  max_players smallint not null default 3,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- room_players: cada jogador dentro de uma sala (vínculo user_id <-> room_id).
-- ---------------------------------------------------------------------------
create table public.room_players (
  id                    uuid primary key default gen_random_uuid(),
  room_id               uuid not null references public.rooms (id) on delete cascade,
  user_id               uuid not null references auth.users (id),
  nickname              text not null,
  seat                  smallint not null,
  is_connected          boolean not null default true,
  rounds_won            smallint not null default 0,
  eliminated_this_round boolean not null default false,
  created_at            timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, seat)
);

-- ---------------------------------------------------------------------------
-- game_states: estado PÚBLICO da partida (tudo aqui pode ser visto pelos 3
-- jogadores). Note que NÃO existe nenhuma coluna de carta de jogador nem do
-- baralho aqui — isso é proposital, ver player_hands e round_decks abaixo.
-- ---------------------------------------------------------------------------
create table public.game_states (
  room_id           uuid primary key references public.rooms (id) on delete cascade,
  round_number      smallint not null default 1,
  current_turn_seat smallint,
  deck_count        smallint not null default 0,
  discard_pile      jsonb not null default '[]'::jsonb,
  protected_seats   jsonb not null default '[]'::jsonb,
  round_status      text not null default 'dealing'
                    check (round_status in ('dealing', 'playing', 'round_over', 'game_over')),
  last_action       jsonb,
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- player_hands: a mão PRIVADA de cada jogador. Tabela separada de propósito:
-- a policy de SELECT abaixo garante, no banco, que um jogador só lê a própria
-- linha — nenhuma query do client (nem inspecionando o devtools) consegue
-- puxar a mão de outro jogador.
-- ---------------------------------------------------------------------------
create table public.player_hands (
  room_id    uuid not null references public.rooms (id) on delete cascade,
  user_id    uuid not null references auth.users (id),
  cards      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ---------------------------------------------------------------------------
-- round_decks: o baralho restante e a carta removida face-down no início da
-- rodada. Isso é informação tão sensível quanto a mão de qualquer jogador
-- (revelar a ordem do baralho deixaria todos saberem o que vão comprar) —
-- por isso NENHUMA policy de SELECT é criada para esta tabela. Ela só é
-- lida/escrita por funções SECURITY DEFINER (ver 0002_rpc_functions.sql),
-- que executam com o dono da tabela (postgres) e por isso ignoram RLS.
-- ---------------------------------------------------------------------------
create table public.round_decks (
  room_id         uuid primary key references public.rooms (id) on delete cascade,
  remaining_cards jsonb not null default '[]'::jsonb,
  removed_card    smallint,
  updated_at      timestamptz not null default now()
);

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.rooms          enable row level security;
alter table public.room_players   enable row level security;
alter table public.game_states    enable row level security;
alter table public.player_hands   enable row level security;
alter table public.round_decks    enable row level security;

-- --- helper: "sou membro desta sala?" --------------------------------------
-- IMPORTANTE: uma policy de room_players NÃO pode consultar room_players
-- diretamente — o Postgres reaplica a RLS na subquery e cai em recursão
-- infinita ("infinite recursion detected in policy for relation room_players").
-- A saída padrão no Supabase é encapsular essa checagem numa função
-- SECURITY DEFINER: ela roda como dono da tabela e por isso ignora a RLS na
-- leitura interna, quebrando o ciclo. Reusada pelas 3 policies abaixo.
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.room_players
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- --- rooms -----------------------------------------------------------------
-- SELECT: só quem já é jogador da sala (ou o host) pode ver a linha da sala.
-- Importante: não existe policy de SELECT "ver por código" — descobrir uma
-- sala pelo código acontece via RPC join_room() (SECURITY DEFINER), nunca
-- por uma query direta do client. Isso evita que alguém liste/adivinhe todas
-- as salas do app.
create policy "rooms_select_members"
  on public.rooms for select
  to authenticated
  using (
    host_id = auth.uid()
    or public.is_room_member(id)
  );
-- Não há policy de INSERT/UPDATE/DELETE para authenticated: criação de sala
-- acontece via RPC create_room() (SECURITY DEFINER), que cria a sala e já
-- insere o host como jogador na mesma transação.

-- --- room_players ------------------------------------------------------
-- SELECT: um jogador vê todas as linhas (todos os jogadores) das salas onde
-- ele próprio também é jogador. A checagem passa pela função is_room_member
-- (SECURITY DEFINER) justamente para não recursar na própria tabela.
create policy "room_players_select_same_room"
  on public.room_players for select
  to authenticated
  using (
    public.is_room_member(room_id)
  );
-- UPDATE: cada jogador só atualiza a própria linha (ex.: nickname, presença).
create policy "room_players_update_self"
  on public.room_players for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Restrição extra por COLUNA: mesmo podendo fazer UPDATE na própria linha,
-- o client só tem permissão de escrever nickname/is_connected. Colunas como
-- rounds_won e eliminated_this_round só são alteradas pelas RPCs do motor do
-- jogo (que rodam como postgres e ignoram GRANTs/RLS).
revoke update on public.room_players from authenticated;
grant update (nickname, is_connected) on public.room_players to authenticated;
-- Não há policy de INSERT: entrar numa sala acontece via RPC join_room().
-- Não há policy de DELETE: remover jogador é uma decisão de regra de jogo,
-- não uma ação livre do client.

-- --- game_states -------------------------------------------------------
-- SELECT: estado público da partida, visível só para quem está na sala.
create policy "game_states_select_members"
  on public.game_states for select
  to authenticated
  using (
    public.is_room_member(room_id)
  );
-- Sem policies de INSERT/UPDATE/DELETE: todo o avanço de estado (distribuir
-- cartas, jogar carta, aplicar efeito) passa pelas RPCs do motor de jogo.

-- --- player_hands --------------------------------------------------------
-- *** A policy mais importante de todo o projeto ***
-- SELECT: um jogador só pode ler a linha cuja user_id é a dele mesmo
-- (auth.uid()). Mesmo que o client tente "SELECT * FROM player_hands" sem
-- filtro nenhum, o Postgres aplica esse "WHERE implícito" antes de devolver
-- qualquer linha — outras mãos simplesmente não existem do ponto de vista
-- dessa conexão. Não depende da UI esconder nada.
create policy "player_hands_select_own"
  on public.player_hands for select
  to authenticated
  using (user_id = auth.uid());
-- Sem policies de INSERT/UPDATE/DELETE: a mão só é escrita por RPCs
-- (distribuir, comprar, descartar, efeitos de Padre/Rei) executadas como
-- SECURITY DEFINER.

-- --- round_decks ---------------------------------------------------------
-- Nenhuma policy é criada aqui de propósito. Com RLS habilitado e zero
-- policies, TODO acesso de um usuário "authenticated" comum (incluindo
-- SELECT) é negado por padrão — só funções SECURITY DEFINER de propriedade
-- do superusuário/dono da tabela (postgres) conseguem ler/escrever, porque
-- o dono da tabela é isento de RLS a menos que FORCE ROW LEVEL SECURITY
-- seja usado (não usamos).

-- =========================================================================
-- Realtime: habilita publicação para as tabelas que o client assina.
-- (round_decks fica de fora — não há motivo para o client assinar algo que
-- ele nunca pode ler.)
-- =========================================================================
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.game_states;
alter publication supabase_realtime add table public.player_hands;
