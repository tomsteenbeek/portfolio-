import { ZodError } from "zod";
import { AuthorizationError } from "@/lib/auth/current-user";

export type ActionResult =
  | { ok: true; message?: string; redirect?: string; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string | undefined> };

/** Vertaalt databasefouten naar begrijpelijke Nederlandse meldingen. */
export function friendlyError(e: unknown): ActionResult {
  if (e instanceof AuthorizationError) return { ok: false, error: e.message };
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Controleer de gemarkeerde velden.", fieldErrors };
  }
  const pg = e as { code?: string; message?: string; constraint?: string };
  if (pg?.code === "42501" && pg.message?.includes("teamleider")) return { ok: false, error: pg.message };
  switch (pg?.code) {
    case "42501":
      return { ok: false, error: pg.message?.includes("row-level security") ? "U heeft geen rechten voor deze wijziging." : pg.message ?? "Geen rechten." };
    case "23505":
      return { ok: false, error: "Deze waarde bestaat al (dubbele invoer)." };
    case "23503":
      return { ok: false, error: "Er wordt verwezen naar een record dat niet (meer) bestaat, of dat nog in gebruik is." };
    case "23514":
      return { ok: false, error: constraintMessage(pg.constraint) ?? pg.message ?? "Ongeldige invoer." };
    case "P0001":
      return { ok: false, error: pg.message ?? "Ongeldige bewerking." };
  }
  console.error("[actie]", e);
  return { ok: false, error: pg?.message ? `Opslaan mislukt: ${pg.message}` : "Er ging iets mis bij het opslaan. Probeer het opnieuw." };
}

function constraintMessage(c?: string) {
  const map: Record<string, string> = {
    topic_flag_rationale: "Een markering (wettelijk verplicht, harde deadline, enz.) vereist een onderbouwing.",
    topic_hard_deadline_date: "Bij 'Harde deadline' is een (wettelijke) deadline verplicht.",
    deviation_requires_rationale: "Afwijken van de gezamenlijke beoordeling vereist een motivering (minimaal 10 tekens).",
  };
  return c ? map[c] : undefined;
}

export async function run(fn: () => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    return friendlyError(e);
  }
}

/** FormData → plain object; lege strings worden null. */
export function formObject(fd: FormData): Record<string, string | null> {
  const o: Record<string, string | null> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    const s = typeof v === "string" ? v.trim() : null;
    o[k] = s === "" ? null : s;
  }
  return o;
}
