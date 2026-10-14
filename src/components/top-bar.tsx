import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, FileText, Hash, Menu, Moon, Search, ShoppingBag, Sun } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import { SUBJECTS, subjectCode, seriesLabel } from "../data/subjects";
import { QUESTIONS } from "../data/questions";
import { parsePaperQuery } from "../lib/papacambridge";
import { Button, Select } from "./ui";

interface Result {
  key: string;
  icon: typeof Search;
  title: string;
  meta: string;
  run: () => void;
}

function SearchBox() {
  const { openInFinder, openInTopical, setActiveSubjectId } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Result[] = [];
    const ref = parsePaperQuery(q);
    if (ref) {
      out.push({
        key: "paper",
        icon: FileText,
        title: `${ref.code} · ${seriesLabel(ref.series)} ${ref.year} · Paper ${ref.paper}`,
        meta: "Open in Paper Finder",
        run: () => openInFinder(ref),
      });
    }
    for (const s of SUBJECTS) {
      if (s.name.toLowerCase().includes(q) || Object.values(s.codes).some((c) => c?.includes(q))) {
        out.push({ key: `s-${s.id}`, icon: BookOpen, title: s.name, meta: `Subject · ${subjectCode(s)}`, run: () => setActiveSubjectId(s.id) });
      }
      for (const t of s.topics) {
        if (t.toLowerCase().includes(q)) {
          out.push({ key: `t-${s.id}-${t}`, icon: Hash, title: t, meta: `Topic · ${s.name}`, run: () => openInTopical({ subjectId: s.id, topic: t }) });
        }
      }
    }
    const qMatches = QUESTIONS.filter((x) => x.prompt.toLowerCase().includes(q)).slice(0, 4);
    for (const x of qMatches) {
      out.push({
        key: `q-${x.id}`,
        icon: Search,
        title: x.prompt.slice(0, 70) + (x.prompt.length > 70 ? "…" : ""),
        meta: `Question · ${x.topic}`,
        run: () => openInTopical({ subjectId: x.subjectId, search: query.trim() }),
      });
    }
    return out.slice(0, 8);
  }, [query, openInFinder, openInTopical, setActiveSubjectId]);

  const choose = (r: Result) => {
    r.run();
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (results[active]) choose(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search topics, subjects or 9702_s23_qp_12"
        aria-label="Search papers and topics"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-14 text-sm tracking-tight placeholder:text-muted hover:border-line-strong"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[10px] font-medium text-muted sm:block">
        Ctrl K
      </kbd>
      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.ul
            id="search-results"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-2xl shadow-black/40"
          >
            {results.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted">No matches. Try a topic like “Kinematics”.</li>
            ) : (
              results.map((r, i) => (
                <li key={r.key} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(r)}
                    className={clsx("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left", i === active && "bg-hover")}
                  >
                    <r.icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium tracking-tight">{r.title}</span>
                      <span className="block truncate text-xs text-muted">{r.meta}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggleTheme, activeSubjectId, setActiveSubjectId, worksheet, setWorksheetOpen } = useApp();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-background/85 px-4 backdrop-blur md:px-6 print:hidden">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <SearchBox />
      <div className="ml-auto flex items-center gap-2">
        <Select
          value={activeSubjectId}
          onChange={(e) => setActiveSubjectId(e.target.value)}
          aria-label="Active subject"
          className="hidden w-52 md:block"
        >
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({subjectCode(s)})
            </option>
          ))}
        </Select>
        <Button variant="outline" size="icon" onClick={() => setWorksheetOpen(true)} aria-label={`Open worksheet, ${worksheet.length} questions`} className="relative">
          <ShoppingBag className="size-4" />
          {worksheet.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
              {worksheet.length}
            </span>
          )}
        </Button>
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
    </header>
  );
}
