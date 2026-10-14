import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import type { TopicalQuestion } from "../data/questions";
import { resolveWorksheet, sourceLabel } from "../lib/worksheet";

function Row({ q, index, count, compact }: { q: TopicalQuestion; index: number; count: number; compact?: boolean }) {
  const { worksheet, setWorksheet, toggleWorksheetItem } = useApp();
  const controls = useDragControls();
  const move = (dir: -1 | 1) => {
    const next = [...worksheet];
    const target = index + dir;
    [next[index], next[target]] = [next[target], next[index]];
    setWorksheet(next);
  };

  return (
    <Reorder.Item value={q.id} dragListener={false} dragControls={controls} className="list-none">
      <div className={clsx("flex items-start gap-2 rounded-lg border border-line bg-surface", compact ? "p-2.5" : "p-3")}>
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="mt-1 w-5 shrink-0 font-mono text-xs font-bold">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <p className={clsx("text-sm leading-snug", compact && "line-clamp-2")}>{q.prompt}</p>
          <p className="mt-1 text-xs text-muted">
            {q.topic} · {sourceLabel(q)} · {q.marks}m
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <button type="button" disabled={index === 0} onClick={() => move(-1)} className="rounded p-1.5 text-muted hover:bg-hover hover:text-foreground disabled:opacity-30" aria-label="Move up">
            <ArrowUp className="size-3.5" />
          </button>
          <button type="button" disabled={index === count - 1} onClick={() => move(1)} className="rounded p-1.5 text-muted hover:bg-hover hover:text-foreground disabled:opacity-30" aria-label="Move down">
            <ArrowDown className="size-3.5" />
          </button>
          <button type="button" onClick={() => toggleWorksheetItem(q.id)} className="rounded p-1.5 text-muted hover:bg-hover hover:text-foreground" aria-label="Remove from worksheet">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}

export function WorksheetList({ compact }: { compact?: boolean }) {
  const { worksheet, setWorksheet } = useApp();
  const items = resolveWorksheet(worksheet);
  return (
    <Reorder.Group axis="y" values={worksheet} onReorder={setWorksheet} className="flex flex-col gap-2">
      {items.map((q, i) => (
        <Row key={q.id} q={q} index={i} count={items.length} compact={compact} />
      ))}
    </Reorder.Group>
  );
}
