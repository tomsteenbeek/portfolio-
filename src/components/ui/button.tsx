import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md";

export function buttonClasses(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 font-medium rounded-md border transition-colors whitespace-nowrap",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5 text-sm",
    variant === "primary" && "bg-primary text-white border-primary hover:bg-primary-hover",
    variant === "secondary" && "bg-surface text-ink border-line-strong hover:bg-surface-muted",
    variant === "ghost" && "bg-transparent text-ink border-transparent hover:bg-surface-muted",
    variant === "subtle" && "bg-primary-soft text-primary border-transparent hover:bg-[#d6e5ea]",
    variant === "danger" && "bg-surface text-bad border-[#e3b4ae] hover:bg-bad-bg",
    className,
  );
}

export function Button({ variant, size, className, type = "button", ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />;
}

export function LinkButton({ variant, size, className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
