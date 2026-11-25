"use client";
import type { ComponentProps } from "react";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { OWNER_SPECIAL } from "@/lib/domain";
import type { TeamOption } from "@/server/queries/team";

/**
 * Keuzelijst voor eigenaar/trekker: teamleden (vast en inhuur) plus de vaste keuzes
 * "Geen persoon beschikbaar" en "Geen capaciteit". Leeg = nog niet bepaald.
 * Een bestaande waarde die niet (meer) in het team staat blijft kiesbaar.
 */
export function OwnerSelect({ team, defaultValue, value, className, emptyLabel = "Nog niet bepaald", ...rest }:
  Omit<ComponentProps<"select">, "defaultValue" | "value"> & { team: TeamOption[]; defaultValue?: string | null; value?: string | null; emptyLabel?: string }) {
  const current = (value ?? defaultValue ?? "") as string;
  const known = new Set<string>([...team.map((t) => t.name), ...OWNER_SPECIAL]);
  const vast = team.filter((t) => t.kind === "Vast");
  const inhuur = team.filter((t) => t.kind === "Inhuur");
  const opt = (t: TeamOption) => <option key={t.name} value={t.name}>{t.name}{t.function_title ? ` – ${t.function_title}` : ""}</option>;
  return (
    <select className={cn(inputClass, "h-9 pr-8", className)} {...(value !== undefined ? { value: value ?? "" } : { defaultValue: current })} {...rest}>
      <option value="">{emptyLabel}</option>
      {vast.length > 0 && <optgroup label="Team">{vast.map(opt)}</optgroup>}
      {inhuur.length > 0 && <optgroup label="Inhuur">{inhuur.map(opt)}</optgroup>}
      <optgroup label="Geen eigenaar toe te wijzen">{OWNER_SPECIAL.map((s) => <option key={s} value={s}>{s}</option>)}</optgroup>
      {current && !known.has(current) && <optgroup label="Overig"><option value={current}>{current}</option></optgroup>}
    </select>
  );
}

/** Weergave van een eigenaar, met aparte opmaak voor de vaste keuzes. */
export function OwnerLabel({ name, empty = "Nog niet bepaald" }: { name: string | null | undefined; empty?: string }) {
  if (!name) return <span className="text-subtle">{empty}</span>;
  if ((OWNER_SPECIAL as readonly string[]).includes(name))
    return <span className="inline-flex items-center rounded bg-warn-bg px-1.5 py-0.5 text-[12px] font-medium text-warn">{name}</span>;
  return <>{name}</>;
}
