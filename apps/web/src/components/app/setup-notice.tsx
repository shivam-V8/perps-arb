import { Logo } from "@/components/brand/logo";

/** Shown when DATABASE_URL is missing, instead of a crash. */
export function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-md">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">Database not configured</h1>
        <p className="mt-2 text-muted-foreground">
          Start Postgres with <code className="rounded bg-black/5 px-1">docker compose up -d db</code>, set{" "}
          <code className="rounded bg-black/5 px-1">DATABASE_URL</code> in <code className="rounded bg-black/5 px-1">apps/web/.env.development.local</code>,
          run <code className="rounded bg-black/5 px-1">pnpm db:migrate</code>, then restart the dev server.
        </p>
      </div>
    </div>
  );
}
