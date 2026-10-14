import { Check } from "lucide-react";
import clsx from "clsx";
import type { PaperStatus } from "../lib/tracker";

export const statusCellClass: Record<PaperStatus, string> = {
  "not-started": "border border-line bg-hover text-muted",
  "in-progress": "border-2 border-accent bg-transparent text-accent",
  completed: "border border-foreground bg-foreground text-background",
  "needs-revision": "border-2 border-dotted border-foreground bg-transparent text-foreground",
};

export function StatusSwatch({ status, className }: { status: PaperStatus; className?: string }) {
  return (
    <span className={clsx("flex size-4 shrink-0 items-center justify-center rounded", statusCellClass[status], className)} aria-hidden="true">
      {status === "completed" && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}
