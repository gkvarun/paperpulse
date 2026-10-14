import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, FileSearch, FileStack, LayoutDashboard, Library, PanelLeftClose, PanelLeftOpen, Settings, X } from "lucide-react";
import clsx from "clsx";
import { useApp, type View } from "../store";

export const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "finder", label: "Paper Finder", icon: FileSearch },
  { id: "topical", label: "Topical Bank", icon: Library },
  { id: "worksheet", label: "Worksheet Builder", icon: FileStack },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12h4l3-8 4 16 3-8h6" />
        </svg>
      </div>
      {!compact && <span className="text-lg font-black tracking-tight">PaperPulse</span>}
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { view, setView, worksheet } = useApp();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              setView(id);
              onNavigate?.();
            }}
            aria-current={active ? "page" : undefined}
            title={collapsed ? label : undefined}
            className={clsx(
              "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium tracking-tight transition-colors",
              active ? "bg-hover text-foreground" : "text-muted hover:bg-hover hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {active && <motion.span layoutId="nav-indicator" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-foreground" />}
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{label}</span>}
            {collapsed && <span className="sr-only">{label}</span>}
            {id === "worksheet" && worksheet.length > 0 && (
              <span
                className={clsx(
                  "flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background",
                  collapsed ? "absolute right-1 top-1 h-4 min-w-4 px-1" : "ml-auto",
                )}
              >
                {worksheet.length}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onMobileClose: () => void }) {
  return (
    <>
      <aside
        className={clsx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface p-3 transition-[width] duration-200 lg:flex print:hidden",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={clsx("mb-6 flex h-10 items-center", collapsed ? "justify-center" : "justify-between pl-2")}>
          <Logo compact={collapsed} />
          {!collapsed && (
            <button type="button" onClick={onToggle} className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-foreground" aria-label="Collapse sidebar">
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>
        <NavList collapsed={collapsed} />
        <div className="mt-auto">
          {collapsed ? (
            <button type="button" onClick={onToggle} className="flex h-10 w-full items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-foreground" aria-label="Expand sidebar">
              <PanelLeftOpen className="size-4" />
            </button>
          ) : (
            <div className="rounded-lg border border-line p-3">
              <p className="text-xs font-bold tracking-tight">Saved locally</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">Progress, worksheets and notes are stored in this browser.</p>
            </div>
          )}
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onMobileClose} />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface p-3"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
            >
              <div className="mb-6 flex h-10 items-center justify-between pl-2">
                <Logo />
                <button type="button" onClick={onMobileClose} className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-foreground" aria-label="Close menu">
                  <X className="size-4" />
                </button>
              </div>
              <NavList onNavigate={onMobileClose} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
