export function SetupError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-lg px-5 py-16">
      <h1 className="text-ink text-2xl font-semibold tracking-tight">Banco não respondeu</h1>
      <p className="text-muted mt-3 text-sm leading-relaxed">
        O app está no ar, mas o Supabase recusou a consulta. Na maioria das vezes é uma
        destas duas coisas:
      </p>
      <ol className="text-muted mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        <li>
          O schema <code className="text-accent font-mono">workout_tracker</code> não está em{" "}
          <span className="text-ink">Settings → API → Exposed schemas</span>.
        </li>
        <li>As migrations em <code className="font-mono">supabase/migrations</code> não rodaram.</li>
      </ol>
      <pre className="border-line bg-surface text-muted mt-6 overflow-x-auto rounded-xl border p-4 font-mono text-xs">
        {message}
      </pre>
    </main>
  );
}
