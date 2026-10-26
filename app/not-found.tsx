import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center">
      <SectionLabel>404 · case not found</SectionLabel>
      <h1 className="mt-3 font-display text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.04em]">
        No such <em className="italic text-rust">lead</em>.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-muted">
        That page does not exist. Head back to the dashboard.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 border border-ink bg-ink px-3 py-2 text-xs font-medium text-paper hover:bg-ink-soft"
      >
        <ArrowLeft className="size-3.5" /> Back to dashboard
      </Link>
    </div>
  );
}
