"use client";
import { refreshData } from "@/lib/refresh";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { archiveRecord } from "@/server/actions/registers";

export function ArchiveButton({ registerKey, id, archived }: { registerKey: string; id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button variant={archived ? "secondary" : "danger"} disabled={pending} onClick={() => {
      if (!archived && !confirm("Archiveren? Het record blijft bewaard en kan worden hersteld.")) return;
      start(async () => { const r = await archiveRecord(registerKey, id, archived); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); if (r.ok && r.redirect) router.push(r.redirect); else refreshData(); });
    }}>
      {archived ? <><ArchiveRestore className="h-4 w-4" aria-hidden />Herstellen</> : <><Archive className="h-4 w-4" aria-hidden />Archiveren</>}
    </Button>
  );
}
