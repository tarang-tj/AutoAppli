import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

/** Authenticated app chrome: dark sidebar, header, and a main area that respects global theme. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <Header />
        <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6 text-foreground">
          {children}
        </main>
      </div>
    </div>
  );
}
