"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportReport, type ReportKey } from "@/server/reports";
import type { ExportFormat } from "@/server/export";
import { useToast } from "@/components/ui/toast";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

const LABELS: Record<ExportFormat, string> = { xlsx: "Excel", csv: "CSV", json: "JSON", html: "Print / PDF" };

/** Exportknoppen voor een rapportage; het bestand wordt in de browser gemaakt. */
export function ExportButtons({ report, year, formats = ["xlsx"], size = "md", className }: {
  report: ReportKey; year?: number; formats?: ExportFormat[]; size?: "sm" | "md"; className?: string;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const toast = useToast();
  return (
    <span className={cn("inline-flex gap-1 no-print", className)}>
      {formats.map((f) => (
        <button key={f} type="button" disabled={busy !== null} className={buttonClasses("secondary", size)}
          onClick={async () => {
            setBusy(f);
            try { await exportReport(report, f, year); } catch (e) { toast("error", e instanceof Error ? e.message : "Export mislukt"); }
            setBusy(null);
          }}>
          {busy === f ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : formats.length === 1 && <Download className="h-4 w-4" aria-hidden />}
          {formats.length === 1 && f === "xlsx" ? "Excel" : LABELS[f]}
        </button>
      ))}
    </span>
  );
}
