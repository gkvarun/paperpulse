import { useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import { QUALIFICATIONS, SUBJECTS, subjectCode } from "../data/subjects";
import { Button, Card, Field, Modal, PageHeader, Select } from "../components/ui";
import type { Qualification } from "../data/subjects";

export function Settings() {
  const { theme, toggleTheme, qualification, setQualification, trackedSubjects, setTrackedSubjects, resetAll, records, worksheet } = useApp();
  const [confirm, setConfirm] = useState<"empty" | "sample" | null>(null);

  const toggleSubject = (id: string) => {
    if (trackedSubjects.includes(id)) {
      if (trackedSubjects.length > 1) setTrackedSubjects(trackedSubjects.filter((s) => s !== id));
    } else setTrackedSubjects([...trackedSubjects, id]);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Settings" description="Preferences and data are saved in this browser only." />

      <Card as="section" className="p-5">
        <h2 className="text-lg font-bold tracking-tight">Appearance</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              onClick={() => theme !== t && toggleTheme()}
              className={clsx("flex items-center gap-3 rounded-lg border p-4 text-left text-sm font-bold capitalize", theme === t ? "border-foreground" : "border-line text-muted hover:text-foreground")}
            >
              {t === "dark" ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
              {t}
              {theme === t && <Check className="ml-auto size-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </Card>

      <Card as="section" className="p-5">
        <h2 className="text-lg font-bold tracking-tight">Study profile</h2>
        <Field label="Default qualification" className="mt-4 max-w-xs">
          {(id) => (
            <Select id={id} value={qualification} onChange={(e) => setQualification(e.target.value as Qualification)}>
              {QUALIFICATIONS.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </Select>
          )}
        </Field>
        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Tracked subjects</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUBJECTS.map((s) => {
              const on = trackedSubjects.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleSubject(s.id)}
                  className={clsx("flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm", on ? "border-foreground" : "border-line text-muted hover:text-foreground")}
                >
                  <span className={clsx("flex size-4 items-center justify-center rounded border", on ? "border-foreground bg-foreground text-background" : "border-line-strong")}>
                    {on && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted">{subjectCode(s, qualification)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </Card>

      <Card as="section" className="p-5">
        <h2 className="text-lg font-bold tracking-tight">Data</h2>
        <p className="mt-1 text-sm text-muted">
          {Object.keys(records).length} paper records and {worksheet.length} worksheet questions stored locally.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setConfirm("sample")}>Load sample progress</Button>
          <Button variant="outline" onClick={() => setConfirm("empty")}>
            Reset all data
          </Button>
        </div>
      </Card>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "empty" ? "Reset all data?" : "Replace with sample progress?"}
      >
        <div className="flex flex-col gap-5 p-5">
          <p className="text-sm text-muted">Your current paper statuses, scores, notes, worksheet and self-assessments will be replaced. This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (confirm) resetAll(confirm);
                setConfirm(null);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
