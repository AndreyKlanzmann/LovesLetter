-- =========================================================================
-- RPCs de lobby: criar sala e entrar em sala.
--
-- Por que RPC em vez de INSERT direto do client?
-- 1) create_room precisa gerar um código único e já inserir o host como
--    jogador (seat 1) na mesma transação — fazer isso em 2 chamadas do
--    client deixaria uma janela onde a sala existe sem host_player.
-- 2) join_room precisa: (a) achar a sala pelo código sem expor uma policy
--    de "SELECT por código" pública (ver comentário em 0001), (b) checar
--    atomicamente se ainda há vaga e atribuir o próximo seat livre — duas
--    pessoas entrando ao mesmo tempo não podem cair no mesmo seat. Isso só
--    é seguro fazendo a leitura+escrita dentro de uma única transação no
--    banco (SECURITY DEFINER), não em round-trips separados do client.
-- =========================================================================

create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem O/0/I/1 para evitar confusão
  result text := '';
  i int;
begin
  for i in 1..5 loop
    result := result || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.create_room(p_nickname text)
returns table (room_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_room_id uuid;
begin
  if p_nickname is null or length(trim(p_nickname)) = 0 then
    raise exception 'nickname é obrigatório';
  end if;

  loop
    v_code := public.generate_room_code();
    begin
      insert into public.rooms (code, host_id) values (v_code, auth.uid())
      returning id into v_room_id;
      exit;
    exception when unique_violation then
      -- código colidiu (raro), tenta gerar outro
      continue;
    end;
  end loop;

  insert into public.room_players (room_id, user_id, nickname, seat)
  values (v_room_id, auth.uid(), trim(p_nickname), 1);

  return query select v_room_id, v_code;
end;
$$;

create or replace function public.join_room(p_code text, p_nickname text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_seat smallint;
  v_taken_seats smallint[];
begin
  if p_nickname is null or length(trim(p_nickname)) = 0 then
    raise exception 'nickname é obrigatório';
  end if;

  select * into v_room from public.rooms where code = upper(trim(p_code));
  if v_room.id is null then
    raise exception 'sala não encontrada';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'sala já iniciou ou terminou';
  end if;

  -- trava a sala para evitar duas entradas simultâneas disputando o mesmo seat
  perform 1 from public.rooms where id = v_room.id for update;

  select array_agg(seat) into v_taken_seats
  from public.room_players where room_id = v_room.id;

  if array_length(v_taken_seats, 1) >= v_room.max_players then
    raise exception 'sala cheia';
  end if;

  -- já é jogador desta sala? devolve direto (reconexão)
  if exists (select 1 from public.room_players where room_id = v_room.id and user_id = auth.uid()) then
    return v_room.id;
  end if;

  v_seat := 1;
  while v_seat = any(v_taken_seats) loop
    v_seat := v_seat + 1;
  end loop;

  insert into public.room_players (room_id, user_id, nickname, seat)
  values (v_room.id, auth.uid(), trim(p_nickname), v_seat);

  return v_room.id;
end;
$$;

grant execute on function public.create_room(text) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
