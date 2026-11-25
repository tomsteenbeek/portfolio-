"use client";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { archiveProject } from "@/server/actions/projects";

export function ArchiveProject({ id }: { id: string }) {
  const toast = useToast();
  const router = useRouter();
  return (
    <Button variant="danger" onClick={async () => {
      if (!confirm("Dit project/initiatief archiveren?")) return;
      const r = await archiveProject(id); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); if (r.ok) router.push("/projecten");
    }}><Archive className="h-4 w-4" aria-hidden />Archiveren</Button>
  );
}
