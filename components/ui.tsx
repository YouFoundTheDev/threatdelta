import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "rust" | "olive" | "amber" | "slate" | "ink";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-line bg-paper-deep/60 text-muted",
  rust: "border-rust/25 bg-rust-soft text-rust",
  olive: "border-olive/25 bg-olive-soft text-olive",
  amber: "border-amber/30 bg-amber-soft text-amber",
  slate: "border-slate/20 bg-slate-soft text-slate",
  ink: "border-ink/20 bg-ink text-paper",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase leading-4 tracking-[0.08em]",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block size-1.5 rounded-full bg-current", className)} />;
}

export function Panel({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <Tag className={cn("border border-line bg-surface/70", className)}>{children}</Tag>;
}

export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted", className)}>
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  deck,
  actions,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  deck?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-line pb-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <SectionLabel>{eyebrow}</SectionLabel>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.94] tracking-[-0.035em] text-ink">
            {title}
          </h1>
          {deck ? <p className="mt-4 max-w-2xl text-[15px] leading-6 text-ink-soft">{deck}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}


const buttonVariants = {
  primary: "border-ink bg-ink text-paper hover:bg-ink-soft",
  secondary: "border-line-strong bg-surface text-ink hover:border-ink/50 hover:bg-paper-deep/70",
  ghost: "border-transparent bg-transparent text-ink-soft hover:border-line hover:bg-paper-deep/60",
} as const;

export function ButtonLink({
  href,
  children,
  variant = "secondary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonVariants;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 border px-3 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust",
        buttonVariants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 border px-3 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink/50 focus:ring-1 focus:ring-ink/10",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-ink/50 focus:ring-1 focus:ring-ink/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-rust underline decoration-rust/30 underline-offset-2 hover:decoration-rust"
    >
      {children}
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong px-6 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}
