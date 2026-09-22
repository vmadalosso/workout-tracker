import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

/** Client de servidor. Um por request — nunca reaproveite entre requests. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "workout_tracker">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "workout_tracker" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component não pode escrever cookie; o middleware renova a sessão.
          }
        },
      },
    },
  );
}
