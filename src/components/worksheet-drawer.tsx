import { FileStack, Printer } from "lucide-react";
import { useApp } from "../store";
import { resolveWorksheet, totalMarks } from "../lib/worksheet";
import { Button, Drawer, EmptyState } from "./ui";
import { WorksheetList } from "./worksheet-list";

export function WorksheetDrawer() {
  const { worksheet, worksheetOpen, setWorksheetOpen, setWorksheet, setView } = useApp();
  const items = resolveWorksheet(worksheet);
  const close = () => setWorksheetOpen(false);

  return (
    <Drawer
      open={worksheetOpen}
      onClose={close}
      title="Worksheet"
      footer={
        items.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              <span className="font-bold text-foreground">{items.length}</span> questions · <span className="font-bold text-foreground">{totalMarks(items)}</span> marks
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setWorksheet([])}>
                Clear
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  close();
                  setView("worksheet");
                }}
              >
                <Printer className="size-4" aria-hidden="true" />
                Open builder
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="p-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<FileStack className="size-5" />}
            title="Your worksheet is empty"
            description="Add questions from the Topical Bank and they will collect here."
            action={
              <Button
                size="sm"
                onClick={() => {
                  close();
                  setView("topical");
                }}
              >
                Browse questions
              </Button>
            }
          />
        ) : (
          <WorksheetList compact />
        )}
      </div>
    </Drawer>
  );
}
