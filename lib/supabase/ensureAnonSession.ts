import { createClient } from "./client";

// Garante que existe uma sessão (anônima ou não) antes de qualquer chamada
// que dependa de auth.uid() — RLS e as RPCs de lobby (create_room/join_room)
// exigem um usuário autenticado, mesmo que anônimo.
export async function ensureAnonSession() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return supabase;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return supabase;
}
