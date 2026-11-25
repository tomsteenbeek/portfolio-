"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const CloseCtx = createContext<(() => void) | null>(null);
/** Sluitfunctie van de omringende dialoog (of null). */
export const useDialogClose = () => useContext(CloseCtx);
import { X } from "lucide-react";
import { buttonClasses } from "./button";

/** Toegankelijke dialoog op basis van het native <dialog>-element (focus trap + Esc). */
export function Dialog({ trigger, title, description, children, wide, triggerVariant = "secondary", triggerSize }: {
  trigger: ReactNode; title: string; description?: string; children: ReactNode | ((close: () => void) => ReactNode); wide?: boolean;
  triggerVariant?: "primary" | "secondary" | "ghost" | "subtle" | "danger"; triggerSize?: "sm" | "md";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className={buttonClasses(triggerVariant, triggerSize)} onClick={() => setOpen(true)}>{trigger}</button>
      <dialog
        ref={ref}
        onClose={close}
        aria-labelledby="dlg-title"
        className={`m-auto w-[min(100vw-2rem,${wide ? "860px" : "560px"})] max-h-[88vh] rounded-lg border border-line bg-surface p-0 text-ink shadow-xl`}
        style={{ width: `min(calc(100vw - 2rem), ${wide ? 860 : 560}px)` }}
      >
        {open && (
          <div className="flex max-h-[88vh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
              <div>
                <h2 id="dlg-title" className="text-base font-semibold">{title}</h2>
                {description && <p className="text-[13px] text-muted">{description}</p>}
              </div>
              <button type="button" onClick={close} aria-label="Sluiten" className="text-muted hover:text-ink"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4"><CloseCtx.Provider value={close}>{typeof children === "function" ? children(close) : children}</CloseCtx.Provider></div>
          </div>
        )}
      </dialog>
    </>
  );
}
