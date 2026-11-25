import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-lg rounded-lg border border-line bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold">Pagina niet gevonden</h1>
        <p className="mt-1 text-sm text-muted">Deze pagina bestaat niet (meer).</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary underline">Naar het dashboard</Link>
      </div>
    </main>
  );
}
