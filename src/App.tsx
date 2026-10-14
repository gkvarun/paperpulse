import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp, type View } from "./store";
import { usePersistentState } from "./lib/use-persistent-state";
import { Sidebar } from "./components/sidebar";
import { TopBar } from "./components/top-bar";
import { WorksheetDrawer } from "./components/worksheet-drawer";
import { Dashboard } from "./views/dashboard";
import { PaperFinder } from "./views/paper-finder";
import { TopicalBank } from "./views/topical-bank";
import { WorksheetBuilder } from "./views/worksheet-builder";
import { Analytics } from "./views/analytics";
import { Settings } from "./views/settings";

const VIEWS: Record<View, () => JSX.Element> = {
  dashboard: Dashboard,
  finder: PaperFinder,
  topical: TopicalBank,
  worksheet: WorksheetBuilder,
  analytics: Analytics,
  settings: Settings,
};

export default function App() {
  const { view } = useApp();
  const [collapsed, setCollapsed] = usePersistentState("sidebarCollapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const Current = VIEWS[view];

  return (
    <div className="flex min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <div className="print:hidden">
          <TopBar onMenu={() => setMobileOpen(true)} />
        </div>
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8 print:max-w-none print:p-0">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <Current />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <WorksheetDrawer />
    </div>
  );
}
