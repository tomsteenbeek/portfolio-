"use client";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = error.message?.includes("rechten");
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-bad" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">{forbidden ? "Geen toegang" : "Er ging iets mis"}</h1>
      <p className="mt-1 text-sm text-muted">
        {forbidden ? "U heeft geen rechten om deze pagina of gegevens te bekijken." : "De gegevens konden niet worden geladen. Probeer het opnieuw of neem contact op met de beheerder."}
      </p>
      {error.digest && <p className="mt-2 text-[12px] text-subtle">Referentie: {error.digest}</p>}
      <button onClick={reset} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm text-white">Opnieuw proberen</button>
    </div>
  );
}
