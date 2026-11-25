"use client";
import { refreshData } from "@/lib/refresh";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "./toast";
import { buttonClasses } from "./button";
import { useDialogClose } from "./dialog";

export type ActionResult =
  | { ok: true; message?: string; redirect?: string; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string | undefined> };

type Props = {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  children: ReactNode | ((state: ActionResult | null) => ReactNode);
  success?: string;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (r: ActionResult) => void;
  confirm?: string;
  id?: string;
};

/** Formulier voor server actions met meldingen, foutweergave en optionele bevestiging. */
export function ActionForm({ action, children, success = "Opgeslagen", className, resetOnSuccess, onSuccess, confirm, id }: Props) {
  const [state, formAction] = useActionState(action, null);
  const toast = useToast();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const last = useRef<ActionResult | null>(null);
  const closeDialog = useDialogClose();

  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) {
      toast("ok", state.message ?? success);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (!state.redirect) closeDialog?.();
      if (state.redirect) router.push(state.redirect);
      else refreshData();
    } else {
      toast("error", state.error);
    }
  }, [state, toast, success, resetOnSuccess, router, onSuccess, closeDialog]);

  return (
    <form
      id={id}
      ref={ref}
      action={formAction}
      className={className}
      noValidate={false}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {typeof children === "function" ? children(state) : children}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary", size, className, name, value }: {
  children: ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost" | "subtle"; size?: "sm" | "md"; className?: string; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={buttonClasses(variant, size, className)}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function fieldError(state: ActionResult | null, name: string) {
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}
