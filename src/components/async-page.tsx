"use client";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { onRefresh } from "@/lib/refresh";

export class NotFoundError extends Error {}
/** Vervanger van next/navigation notFound() voor schermen die in de browser laden. */
export function notFound(): never {
  throw new NotFoundError("Niet gevonden");
}

type Render = (sp: URLSearchParams) => Promise<ReactNode>;

function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4">
      <span className="sr-only">Gegevens worden geladen…</span>
      <div className="h-7 w-72 rounded bg-line" />
      <div className="h-4 w-[28rem] max-w-full rounded bg-line" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 rounded-lg border border-line bg-surface" />)}
      </div>
    </div>
  );
}

function Inner({ render }: { render: Render }) {
  const sp = useSearchParams();
  const key = sp.toString();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ key: string; node?: ReactNode; error?: unknown } | null>(null);

  useEffect(() => onRefresh(() => setTick((t) => t + 1)), []);
  useEffect(() => {
    let alive = true;
    render(new URLSearchParams(key))
      .then((node) => alive && setState({ key, node }))
      .catch((error) => alive && setState({ key, error }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  useEffect(() => {
    const h1 = document.querySelector("main h1")?.textContent;
    if (h1) document.title = `${h1} · Digitale Informatie`;
  }, [state]);

  if (!state || (state.key !== key && !state.node)) return <Loading />;
  if (state.error instanceof NotFoundError) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold">Niet gevonden</h1>
        <p className="mt-1 text-sm text-muted">Dit item bestaat niet (meer) of deze demorol heeft er geen toegang toe.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary underline">Terug naar het dashboard</Link>
      </div>
    );
  }
  if (state.error) {
    const msg = state.error instanceof Error ? state.error.message : String(state.error);
    const forbidden = /rechten|permission/i.test(msg);
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-bad" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">{forbidden ? "Geen toegang" : "Er ging iets mis"}</h1>
        <p className="mt-1 text-sm text-muted">{forbidden ? "Deze demorol heeft geen toegang tot dit scherm. Wissel rechtsboven van rol." : msg}</p>
        <button onClick={() => setTick((t) => t + 1)} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm text-white">Opnieuw proberen</button>
      </div>
    );
  }
  return <>{state.node}</>;
}

/** Laadt een scherm in de browser; wordt opnieuw opgehaald bij URL-wijziging of refreshData(). */
export function AsyncPage({ render }: { render: Render }) {
  return <Suspense fallback={<Loading />}><Inner render={render} /></Suspense>;
}

/** Hulp: zoekparameters als object (vervanger van Next searchParams). */
export const spObject = (sp: URLSearchParams) => Object.fromEntries(sp.entries()) as Record<string, string | undefined>;
