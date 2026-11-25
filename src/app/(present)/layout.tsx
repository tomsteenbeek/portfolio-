import { requireUser } from "@/lib/auth/current-user";

/** Presentatiemodus: geen navigatie, grote typografie, geschikt voor beamer. */
export default async function PresentLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <main id="inhoud" className="min-h-screen bg-surface px-6 py-6 sm:px-12">{children}</main>;
}
