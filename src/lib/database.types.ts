// Tipos escritos a mao espelhando supabase/migrations/*.sql.
// Se o schema mudar, atualize aqui tambem (ou rode `supabase gen types`).

type Timestamp = string;

export type Database = {
  workout_tracker: {
    Tables: {
      workouts: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          title: string;
          day_label: string | null;
          position: number;
          archived_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          user_id: string;
          slug: string;
          title: string;
          day_label?: string | null;
          position?: number;
          archived_at?: Timestamp | null;
        };
        Update: {
          slug?: string;
          title?: string;
          day_label?: string | null;
          position?: number;
          archived_at?: Timestamp | null;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string;
          workout_id: string;
          name: string;
          hint: string;
          load_note: string;
          done: boolean;
          position: number;
          archived_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_id: string;
          name: string;
          hint?: string;
          load_note?: string;
          done?: boolean;
          position?: number;
          archived_at?: Timestamp | null;
        };
        Update: {
          name?: string;
          hint?: string;
          load_note?: string;
          done?: boolean;
          position?: number;
          archived_at?: Timestamp | null;
        };
        Relationships: [];
      };
      week_state: {
        Row: { user_id: string; week_number: number; started_at: Timestamp };
        Insert: { user_id: string; week_number?: number; started_at?: Timestamp };
        Update: { week_number?: number; started_at?: Timestamp };
        Relationships: [];
      };
      week_history: {
        Row: {
          id: string;
          user_id: string;
          week_number: number;
          started_at: Timestamp;
          completed_at: Timestamp;
          workouts_done: number;
          workouts_total: number;
          snapshot: HistorySnapshot;
        };
        Insert: {
          user_id: string;
          week_number: number;
          started_at: Timestamp;
          workouts_done?: number;
          workouts_total?: number;
          snapshot?: HistorySnapshot;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      bootstrap: { Args: Record<string, never>; Returns: undefined };
      reset_week: { Args: Record<string, never>; Returns: number };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type HistorySnapshot = {
  slug: string;
  title: string;
  day_label: string | null;
  done: boolean;
  exercises: { name: string; load_note: string; done: boolean }[];
}[];

export type WorkoutRow = Database["workout_tracker"]["Tables"]["workouts"]["Row"];
export type ExerciseRow = Database["workout_tracker"]["Tables"]["exercises"]["Row"];

/** Um card da tela: o treino com seus exercicios ja ordenados. */
export type WorkoutCard = Pick<
  WorkoutRow,
  "id" | "slug" | "title" | "day_label" | "position"
> & {
  exercises: Pick<ExerciseRow, "id" | "name" | "hint" | "load_note" | "done" | "position">[];
};
