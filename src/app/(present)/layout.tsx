"use client";
import { BrandBar } from "@/components/layout/brand-bar";
import { UserGate } from "@/components/layout/user-gate";

/** Presentatiemodus: geen navigatie, grote typografie, geschikt voor beamer. */
export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return <UserGate>{() => <><BrandBar /><main id="inhoud" className="min-h-screen bg-surface px-6 py-6 sm:px-12">{children}</main></>}</UserGate>;
}
