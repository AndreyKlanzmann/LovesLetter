import { ensureAnonSession } from "../supabase/ensureAnonSession";

export async function createRoom(nickname: string) {
  const supabase = await ensureAnonSession();
  const { data, error } = await supabase.rpc("create_room", { p_nickname: nickname });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("Falha ao criar sala");
  return row; // { room_id, code }
}
