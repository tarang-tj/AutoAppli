"use client";

import { useApiHealth } from "@/hooks/use-api-health";
import { useUser } from "@/hooks/use-user";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import Link from "next/link";

interface Reminder {
  id: string;
  is_read: boolean;
  is_dismissed: boolean;
}

export function Header() {
  const { user } = useUser();
  const router = useRouter();
  const apiHealth = useApiHealth();

  const { data: reminders } = useSWR<Reminder[]>(
    "/reminders",
    () => apiGet<Reminder[]>("/reminders"),
    { revalidateOnFocus: false, refreshInterval: 60000 }
  );

  const unreadCount = reminders?.filter((r) => !r.is_read && !r.is_dismissed).length ?? 0;

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

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
      {/* Left side: Logo + API status */}
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            A
          </div>
          <span className="font-semibold text-white text-sm hidden md:block">AutoAppli</span>
        </Link>

        {apiHealth !== "idle" ? (
          <span
            className="flex items-center gap-1.5 text-xs text-zinc-500 ml-2"
            title={apiTitle}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                apiHealth === "checking" && "bg-amber-500 animate-pulse",
                apiHealth === "ok" && "bg-emerald-500",
                apiHealth === "error" && "bg-red-500"
              )}
              aria-hidden
            />
            <span className="hidden lg:inline truncate">{apiTitle}</span>
          </span>
        ) : null}
      </div>

      {/* Right side: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          onClick={() => router.push("/notifications")}
          className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title={unreadCount > 0 ? `${unreadCount} unread reminder${unreadCount > 1 ? "s" : ""}` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <span className="flex items-center gap-2 outline-none cursor-pointer">
              <span className="text-sm text-zinc-300 hidden sm:block truncate max-w-[160px]">
                {displayName}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem
              className="text-zinc-300 cursor-pointer"
              onClick={() => router.push("/settings")}
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-zinc-300 cursor-pointer"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem onClick={handleLogout} className="text-zinc-300 cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
