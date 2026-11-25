import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function Stat({ label, value, sub, tone, href, unknown }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: "bad" | "warn" | "ok"; href?: string; unknown?: boolean;
}) {
  const body = (
    <div className={cn("h-full bg-surface border border-line rounded-lg px-4 py-3 shadow-card", href && "hover:border-line-strong transition-colors")}>
      <div className="text-[12px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1 num leading-tight",
        unknown ? "text-[15px] font-medium text-subtle pt-1.5" : "text-[24px] font-semibold",
        tone === "bad" && "text-bad", tone === "warn" && "text-warn", tone === "ok" && "text-ok")}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-muted">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block rounded-lg">{body}</Link> : body;
}
