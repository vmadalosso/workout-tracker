import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Destino do magic link: troca o `code` por uma sessão em cookie. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Atrás do proxy da Vercel o host real vem no header, não em request.url.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin =
    process.env.NODE_ENV === "production" && forwardedHost
      ? `https://${forwardedHost}`
      : request.nextUrl.origin;

  const failure = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  const errorDescription = searchParams.get("error_description");
  if (errorDescription) return failure(errorDescription);

  if (!code) return failure("Link inválido ou expirado.");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failure(error.message);

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
}
