"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch, isResumeApiConfigured } from "@/lib/api";
import type { UserProfile } from "@/types";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

export default function SettingsPage() {
  const apiOn = isResumeApiConfigured();
  const { data, mutate, isLoading } = useSWR<UserProfile>("/profile", () => apiGet<UserProfile>("/profile"), {
    revalidateOnFocus: false,
  });

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.display_name ?? "");
    setHeadline(data.headline ?? "");
    setLinkedinUrl(data.linkedin_url ?? "");
  }, [data]);

  const handleSave = async () => {
    try {
      const next = await apiPatch<UserProfile>("/profile", {
        display_name: displayName,
        headline,
        linkedin_url: linkedinUrl,
      });
      void mutate(next, { revalidate: false });
      toast.success(apiOn ? "Profile saved" : "Profile saved for this browser session (demo)");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="h-7 w-7 text-blue-400" aria-hidden />
          Settings
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
          Your display name is used in outreach drafts for greetings and sign-offs. Headline and LinkedIn are
          for your own reference (and future features).
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 max-w-xl">
        <CardHeader>
          <CardTitle className="text-white">Profile</CardTitle>
          <CardDescription className="text-zinc-500">
            {apiOn
              ? "Stored in your database when the API has Supabase credentials."
              : "Demo: profile is kept in this browser session only. Set NEXT_PUBLIC_API_URL to sync via the API."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Display name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex Morgan"
              disabled={isLoading}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Professional headline</Label>
            <Textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Software Engineer · ML infra"
              rows={2}
              disabled={isLoading}
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">LinkedIn URL</Label>
            <Input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              disabled={isLoading}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
