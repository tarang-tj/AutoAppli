import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { ShortcutsHelp } from "@/components/layout/shortcuts-help";

/**
 * Authenticated app chrome: dark sidebar, header, and a main area that
 * respects the global theme. Also mounts global overlays — the ⌘K command
 * palette and the `?` keyboard-shortcut help — so every authenticated
 * page gets them "for free" without touching each page.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6 text-zinc-100">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      {/* Global overlays — both self-open on their hotkeys. */}
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
