"use client";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

const DEMO_USER = {
  id: "demo-user",
  email: "demo@autoappli.dev",
  user_metadata: { full_name: "Demo User" },
} as unknown as User;

export function useUser() {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(() => (configured ? null : DEMO_USER));
  const [loading, setLoading] = useState(() => configured);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  return { user, loading };
}
