"use client";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { loadCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { isConfigured } from "@/lib/db";

/** Laadt de demogebruiker (geen login) en toont een duidelijke melding als de database niet bereikbaar is. */
export function UserGate({ children }: { children: (user: CurrentUser) => ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!isConfigured()) { setError("De databasekoppeling is niet ingesteld. Zie de README: NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY."); return; }
    loadCurrentUser().then(setUser).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="max-w-lg rounded-lg border border-line bg-surface p-8 text-center shadow-card">
          <AlertTriangle className="mx-auto h-8 w-8 text-bad" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold">De database is niet bereikbaar</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <p className="mt-2 text-sm text-muted">Is het Supabase-project gepauzeerd? Zet het dan in Supabase weer aan en ververs deze pagina.</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm text-white">Opnieuw proberen</button>
        </div>
      </main>
    );
  }
  if (!user) return <main className="grid min-h-screen place-items-center text-sm text-muted" role="status">Dashboard wordt geladen…</main>;
  return <>{children(user)}</>;
}
