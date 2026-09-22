"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, Mail, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const redirect = new URL("/auth/callback", window.location.origin);
    if (next !== "/") redirect.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirect.toString() },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="border-line bg-surface rounded-2xl border p-6 text-center">
        <MailCheck aria-hidden className="text-accent mx-auto mb-3 h-8 w-8" />
        <p className="text-ink text-base font-medium">Link enviado</p>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Abra o e-mail em <span className="text-ink">{email}</span> e clique no link para
          entrar. Ele vale por 1 hora.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-muted hover:text-ink mt-5 text-sm underline underline-offset-4"
        >
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-muted text-sm">
        E-mail
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="voce@exemplo.com"
        className="border-line bg-surface text-ink placeholder:text-muted/60 focus:border-accent h-12 rounded-xl border px-4 text-base outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="bg-accent text-accent-ink flex h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold transition-opacity disabled:opacity-60"
      >
        {status === "sending" ? (
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Mail aria-hidden className="h-4 w-4" />
        )}
        {status === "sending" ? "Enviando..." : "Receber link de acesso"}
      </button>
      {status === "error" && (
        <p className="text-danger flex items-start gap-2 text-sm" role="alert">
          <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {message}
        </p>
      )}
    </form>
  );
}
