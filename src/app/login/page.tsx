import { CircleAlert, Dumbbell } from "lucide-react";

import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const rawNext = params.next;
  const next = typeof rawNext === "string" && rawNext.startsWith("/") ? rawNext : "/";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      <h1 className="text-ink flex items-center gap-2.5 text-3xl font-semibold tracking-tight">
        <Dumbbell aria-hidden className="text-accent h-7 w-7" />
        Treino
      </h1>
      <p className="text-muted mt-2 mb-8 text-sm">
        Entre com seu e-mail. Sem senha — chega um link de acesso.
      </p>

      {error && (
        <p className="border-danger/30 bg-danger/10 text-danger mb-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm">
          <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <LoginForm next={next} />
    </main>
  );
}
