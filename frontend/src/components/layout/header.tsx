"use client";

import { useApiHealth } from "@/hooks/use-api-health";
import { useUser } from "@/hooks/use-user";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const { user } = useUser();
  const router = useRouter();
  const apiHealth = useApiHealth();

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  const apiTitle =
    apiHealth === "idle"
      ? "API URL not set (demo / local only)"
      : apiHealth === "checking"
        ? "Checking API…"
        : apiHealth === "ok"
          ? "API reachable"
          : "API unreachable — check NEXT_PUBLIC_API_URL and CORS";

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6">
      <div className="flex items-center gap-2 min-w-0">
        {apiHealth !== "idle" ? (
          <span
            className="flex items-center gap-1.5 text-xs text-zinc-500"
            title={apiTitle}
            role="status"
            aria-live="polite"
            aria-label={apiTitle}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                apiHealth === "checking" && "bg-amber-500 animate-pulse",
                apiHealth === "ok" && "bg-emerald-500",
                apiHealth === "error" && "bg-red-500"
              )}
              aria-hidden="true"
            />
            <span className="hidden sm:inline truncate">{apiTitle}</span>
          </span>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={user?.email ? `Account menu for ${user.email}` : "Account menu"}>
          <span className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-zinc-200 hidden sm:block">{user?.email}</span>
            <Avatar className="h-8 w-8">
              <AvatarFallback aria-hidden="true" className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
          <DropdownMenuItem
            className="text-zinc-300 cursor-pointer"
            onClick={() => router.push("/settings")}
          >
            <Settings aria-hidden="true" className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="text-zinc-300 cursor-pointer">
            <LogOut aria-hidden="true" className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
