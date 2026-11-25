"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/** Formulier dat de invoer als zoekparameters naar een pagina stuurt (zonder server). */
export function GetForm({ path, children, className, role }: { path: string; children: ReactNode; className?: string; role?: string }) {
  const router = useRouter();
  return (
    <form role={role} className={className} onSubmit={(e) => {
      e.preventDefault();
      const qs = new URLSearchParams();
      for (const [k, v] of new FormData(e.currentTarget).entries()) if (typeof v === "string" && v !== "") qs.set(k, v);
      router.push(`${path}${qs.toString() ? `?${qs}` : ""}`);
    }}>
      {children}
    </form>
  );
}
