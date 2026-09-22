import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

/** Client do browser. Usado para as escritas (check, carga, reset). */
export function createClient() {
  return createBrowserClient<Database, "workout_tracker">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "workout_tracker" } },
  );
}
