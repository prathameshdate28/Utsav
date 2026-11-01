"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

const buttonClassName = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:cursor-wait disabled:opacity-70";

type GenerateAiButtonProps = {
  label: string;
  busyLabel: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

export function GenerateAiButton({
  label,
  busyLabel,
  busy = false,
  disabled = false,
  onClick,
  className = "",
}: GenerateAiButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={`${buttonClassName} ${className}`.trim()}
    >
      {busy
        ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
      {busy ? busyLabel : label}
    </button>
  );
}

export function GenerateAiLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClassName} ${className}`.trim()}>
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
