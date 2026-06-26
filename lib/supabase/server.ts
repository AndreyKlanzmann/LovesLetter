import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Client "do usuário" para Server Components/Actions: respeita RLS, usa a
// sessão (cookie) de quem está logado. Use para qualquer leitura/escrita que
// deve continuar sujeita às policies normais.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}

// Client "privilegiado": ignora RLS (service role). Só pode ser usado em
// código que roda no servidor (Server Actions do motor de jogo) — nunca
// importe isto em um Client Component. É aqui que o motor de Love Letter lê
// o baralho/mãos de todos para aplicar efeitos (Padre, Rei, Barão) e depois
// grava o resultado, mantendo o client comum sempre restrito pela RLS.
export function createServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceRoleClient não pode ser usado no browser");
  }
  return createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
