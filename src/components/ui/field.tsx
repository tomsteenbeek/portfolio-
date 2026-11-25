import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export const inputClass =
  "block w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-subtle " +
  "focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 disabled:bg-surface-muted aria-[invalid=true]:border-bad";

export function Field({ label, htmlFor, hint, error, required, children, className }: {
  label: ReactNode; htmlFor: string; hint?: ReactNode; error?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
        {label}
        {required && <span className="text-bad" aria-hidden> *</span>}
        {required && <span className="sr-only"> (verplicht)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="text-[12px] text-muted">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="text-[12px] text-bad">{error}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, "h-9", className)} {...rest} />;
}
export function Textarea({ className, rows = 3, ...rest }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(inputClass, "min-h-[72px]", className)} {...rest} />;
}
export function Select({ className, options, placeholder, ...rest }: ComponentProps<"select"> & {
  options: readonly (string | { value: string; label: string })[]; placeholder?: string;
}) {
  return (
    <select className={cn(inputClass, "h-9 pr-8", className)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === "string" ? { value: o, label: o } : o;
        return <option key={v.value} value={v.value}>{v.label}</option>;
      })}
    </select>
  );
}
export function Checkbox({ label, className, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex items-start gap-2 text-sm cursor-pointer", className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}
