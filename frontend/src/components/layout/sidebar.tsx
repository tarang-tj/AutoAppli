"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, Send, Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resume", label: "Resume Builder", icon: FileText },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/jobs", label: "Job Search", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 md:hidden" onClick={() => setOpen(!open)}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-200 md:translate-x-0 flex flex-col", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center gap-2 px-6 py-5 border-b border-zinc-800 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">A</div>
          <span className="text-lg font-semibold text-white">AutoAppli</span>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-blue-600/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50")}>
                <item.icon className="h-5 w-5" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 px-3 py-4 border-t border-zinc-800 text-xs text-zinc-500 flex flex-wrap gap-x-2 gap-y-1">
          <Link href="/privacy" onClick={() => setOpen(false)} className="hover:text-zinc-300">
            Privacy
          </Link>
          <span className="text-zinc-700" aria-hidden>
            ·
          </span>
          <Link href="/terms" onClick={() => setOpen(false)} className="hover:text-zinc-300">
            Terms
          </Link>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
