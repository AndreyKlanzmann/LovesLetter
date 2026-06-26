import { ensureAnonSession } from "../supabase/ensureAnonSession";

export async function joinRoom(code: string, nickname: string) {
  const supabase = await ensureAnonSession();
  const { data, error } = await supabase.rpc("join_room", {
    p_code: code.trim().toUpperCase(),
    p_nickname: nickname,
  });
  if (error) throw error;
  return data as string; // room_id
}
