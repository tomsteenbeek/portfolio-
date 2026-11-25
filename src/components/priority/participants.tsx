"use client";
import { useEffect, useState, useTransition } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { refreshData } from "@/lib/refresh";
import { addParticipant, removeParticipant } from "@/server/actions/participants";
import { DEFAULT_DEMO_EMAIL, getCurrentUser, listDemoUsers, setDemoUser } from "@/lib/auth/current-user";
import type { DemoUser } from "@/lib/db";

/** Deelnemers voor prioriteringssessies beheren (alleen een naam; geen accounts of wachtwoorden). */
export function ParticipantsPanel({ participants }: { participants: { id: string; display_name: string; sessions: number }[] }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const act = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    const r = await fn(); toast(r.ok ? "ok" : "error", (r.ok ? r.message : r.error) ?? ""); if (r.ok) { setName(""); refreshData(); }
  });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Iedere deelnemer beoordeelt in een sessie individueel. Er zijn geen accounts nodig: je kiest in de sessie bij &quot;Beoordelen als&quot; wie er aan de beurt is.
        Let op: de site is openbaar zonder login; gebruik eventueel initialen of functies in plaats van volledige namen.</p>
      <form className="flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); act(() => addParticipant(name)); }}>
        <label htmlFor="pp-name" className="sr-only">Naam deelnemer</label>
        <input id="pp-name" className={`${inputClass} h-9`} placeholder="Naam, initialen of functie" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        <Button type="submit" variant="primary" disabled={pending}><UserPlus className="h-4 w-4" aria-hidden />Toevoegen</Button>
      </form>
      <ul className="divide-y divide-line rounded-md border border-line text-sm">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2">
            <span>{p.display_name.replace(" (fictief)", "")}<span className="ml-2 text-[12px] text-muted">{p.sessions} sessie(s)</span></span>
            <button type="button" className="text-subtle hover:text-bad" aria-label={`${p.display_name} verwijderen`} disabled={pending}
              onClick={() => confirm(`${p.display_name} verwijderen als deelnemer?`) && act(() => removeParticipant(p.id))}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {participants.length === 0 && <li className="px-4 py-3 text-muted">Nog geen deelnemers.</li>}
      </ul>
    </div>
  );
}

/** Kies wie er beoordeelt in deze sessie (geldt alleen voor dit browsertabblad). */
export function AssessAs({ members }: { members: { user_id: string; display_name: string }[] }) {
  const [users, setUsers] = useState<DemoUser[]>([]);
  useEffect(() => { listDemoUsers().then(setUsers).catch(() => {}); }, []);
  const me = getCurrentUser();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm">
      <label htmlFor="assess-as" className="font-medium">Beoordelen als</label>
      <select id="assess-as" className={`${inputClass} h-9 w-auto`} value={me?.id ?? ""} onChange={(e) => {
        const u = users.find((x) => x.id === e.target.value);
        setDemoUser(!u || u.email === DEFAULT_DEMO_EMAIL ? null : u.email);
        window.location.reload();
      }}>
        {!members.some((m) => m.user_id === me?.id) && <option value={me?.id ?? ""}>— kies een deelnemer —</option>}
        {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name.replace(" (fictief)", "")}</option>)}
      </select>
      <span className="text-[12px] text-muted">Kies je eigen naam; anderen zien je scores pas in de bespreking.</span>
    </div>
  );
}
