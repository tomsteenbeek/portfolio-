"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type Toast = { id: number; kind: "ok" | "error"; text: string };
const Ctx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 8000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="fixed bottom-4 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 no-print">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm shadow-lg bg-surface ${t.kind === "ok" ? "border-[#b7d9c4]" : "border-[#e3b4ae]"}`}>
            {t.kind === "ok" ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-ok shrink-0" aria-hidden /> : <AlertTriangle className="h-4 w-4 mt-0.5 text-bad shrink-0" aria-hidden />}
            <span className="flex-1">{t.text}</span>
            <button aria-label="Melding sluiten" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
