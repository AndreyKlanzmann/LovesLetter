// Tipos manuais que espelham supabase/migrations/*.sql.
// Quando o projeto Supabase estiver criado, rode:
//   npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
// para substituir este arquivo pela versão gerada automaticamente.
//
// Insert/Update aqui são apenas para satisfazer o formato esperado pelo
// supabase-js — na prática não há policy de INSERT/UPDATE liberada para o
// client nessas tabelas (tudo passa pelas RPCs), então estes tipos nunca
// deveriam ser usados de fato pelo código da aplicação.

export type RoomStatus = "lobby" | "playing" | "finished";
export type RoundStatus = "dealing" | "playing" | "round_over" | "game_over";

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          code: string;
          game_type: string;
          status: RoomStatus;
          host_id: string;
          max_players: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["rooms"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["rooms"]["Row"]>;
        Relationships: [];
      };
      room_players: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          nickname: string;
          seat: number;
          is_connected: boolean;
          rounds_won: number;
          eliminated_this_round: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["room_players"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["room_players"]["Row"]>;
        Relationships: [];
      };
      game_states: {
        Row: {
          room_id: string;
          round_number: number;
          current_turn_seat: number | null;
          deck_count: number;
          discard_pile: number[];
          protected_seats: number[];
          round_status: RoundStatus;
          last_action: Record<string, unknown> | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["game_states"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["game_states"]["Row"]>;
        Relationships: [];
      };
      player_hands: {
        Row: {
          room_id: string;
          user_id: string;
          cards: number[];
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["player_hands"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["player_hands"]["Row"]>;
        Relationships: [];
      };
      round_decks: {
        Row: {
          room_id: string;
          remaining_cards: number[];
          removed_card: number | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["round_decks"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["round_decks"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_room: {
        Args: { p_nickname: string };
        Returns: { room_id: string; code: string }[];
      };
      join_room: {
        Args: { p_code: string; p_nickname: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
