"use client";

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
import { LogOut } from "lucide-react";

export function Header() {
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6">
      <div />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="flex items-center gap-2 outline-none cursor-pointer">
            <span className="text-sm text-zinc-200 hidden sm:block">{user?.email}</span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
          <DropdownMenuItem onClick={handleLogout} className="text-zinc-300 cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
