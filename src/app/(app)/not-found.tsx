import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-8 text-center">
      <h1 className="text-lg font-semibold">Niet gevonden</h1>
      <p className="mt-1 text-sm text-muted">Dit item bestaat niet (meer) of u heeft er geen toegang toe.</p>
      <Link href="/" className="mt-4 inline-block text-sm text-primary underline">Terug naar het dashboard</Link>
    </div>
  );
}
