"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPatch, isResumeApiConfigured } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { UserProfile } from "@/types";
import { User, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

/**
 * Settings page — user profile + job preferences.
 *
 * Sprint 8 added the supabase-direct PATCH fallback so the extended fields
 * (phone, location, portfolio_url, bio, remote_preference) actually persist
 * for signed-in users in production. This page is the UI that feeds them.
 *
 * remote_preference drives the recommendations rail's remote bonus
 * (+8 exact match, +3 remote↔hybrid overlap, −6 opposite) — so the empty
 * state copy nudges users to set it. Without it, the rail still works but
 * ranks everything equally regardless of WFH fit.
 */

const NO_PREFERENCE = "__none__";

type RemotePrefValue = "remote" | "hybrid" | "onsite" | typeof NO_PREFERENCE;

export default function SettingsPage() {
  const apiOn = isResumeApiConfigured();
  const supabaseOn = isSupabaseConfigured();
  const { data, mutate, isLoading } = useSWR<UserProfile>(
    "/profile",
    () => apiGet<UserProfile>("/profile"),
    { revalidateOnFocus: false },
  );

  // ── Profile fields ──
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [remotePreference, setRemotePreference] =
    useState<RemotePrefValue>(NO_PREFERENCE);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.display_name ?? "");
    setHeadline(data.headline ?? "");
    setLinkedinUrl(data.linkedin_url ?? "");
    setPortfolioUrl(data.portfolio_url ?? "");
    setPhone(data.phone ?? "");
    setLocation(data.location ?? "");
    setBio(data.bio ?? "");
    setRemotePreference(
      data.remote_preference === "remote" ||
        data.remote_preference === "hybrid" ||
        data.remote_preference === "onsite"
        ? data.remote_preference
        : NO_PREFERENCE,
    );
  }, [data]);

  const persistToast = (action: string) => {
    if (apiOn) return `${action} saved`;
    if (supabaseOn) return `${action} saved to your account`;
    return `${action} saved for this browser session (demo)`;
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const next = await apiPatch<UserProfile>("/profile", {
        display_name: displayName,
        headline,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        phone,
        location,
        bio,
      });
      void mutate(next, { revalidate: false });
      toast.success(persistToast("Profile"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      const next = await apiPatch<UserProfile>("/profile", {
        remote_preference:
          remotePreference === NO_PREFERENCE ? null : remotePreference,
      });
      void mutate(next, { revalidate: false });
      toast.success(persistToast("Preferences"));
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Could not save preferences",
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  const storageHint = apiOn
    ? "Stored in your database via the API."
    : supabaseOn
      ? "Stored in your Supabase account."
      : "Demo mode — changes stay in this browser session only.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User aria-hidden="true" className="h-7 w-7 text-blue-400" />
          Settings
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
          Your profile is used in outreach drafts, cover letters, and on your
          tailored resumes. Preferences shape which jobs Discover recommends.
        </p>
      </div>

      {/* ── Profile ───────────────────────────────────────────── */}
      <Card className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Profile</CardTitle>
          <CardDescription className="text-zinc-500">
            {storageHint}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveProfile();
            }}
            aria-busy={savingProfile}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings-display-name" className="text-zinc-300">Display name</Label>
                <Input
                  id="settings-display-name"
                  name="display_name"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Morgan"
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-phone" className="text-zinc-300">Phone</Label>
                <Input
                  id="settings-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 010-2030"
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-location" className="text-zinc-300">Location</Label>
              <Input
                id="settings-location"
                name="location"
                autoComplete="address-level2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
                disabled={isLoading}
                aria-describedby="settings-location-hint"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <p id="settings-location-hint" className="text-xs text-zinc-500">
                City and state. Shown on tailored resumes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-headline" className="text-zinc-300">Professional headline</Label>
              <Textarea
                id="settings-headline"
                name="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Senior Software Engineer · ML infra"
                rows={2}
                disabled={isLoading}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings-linkedin" className="text-zinc-300">LinkedIn URL</Label>
                <Input
                  id="settings-linkedin"
                  name="linkedin_url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-portfolio" className="text-zinc-300">Portfolio / website</Label>
                <Input
                  id="settings-portfolio"
                  name="portfolio_url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourname.com"
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-bio" className="text-zinc-300">Short bio</Label>
              <Textarea
                id="settings-bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A 2–3 sentence summary — what you do, what you’re looking for."
                rows={4}
                disabled={isLoading}
                aria-describedby="settings-bio-hint"
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
              />
              <p id="settings-bio-hint" className="text-xs text-zinc-500">
                Used as a starting point for cover letter openers.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || savingProfile}
              aria-busy={savingProfile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Job preferences ───────────────────────────────────── */}
      <Card className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Briefcase aria-hidden="true" className="h-5 w-5 text-emerald-400" />
            Job preferences
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Shapes which jobs get ranked higher on Discover&rsquo;s
            recommendations rail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSavePreferences();
            }}
            aria-busy={savingPreferences}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="settings-remote-preference" className="text-zinc-300">Remote preference</Label>
              <Select
                value={remotePreference}
                onValueChange={(v) => setRemotePreference(v as RemotePrefValue)}
              >
                <SelectTrigger
                  id="settings-remote-preference"
                  disabled={isLoading}
                  aria-describedby="settings-remote-preference-hint"
                  className="bg-zinc-800 border-zinc-700 text-white w-full md:w-64"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value={NO_PREFERENCE} className="text-white">
                    No preference
                  </SelectItem>
                  <SelectItem value="remote" className="text-white">
                    Remote only
                  </SelectItem>
                  <SelectItem value="hybrid" className="text-white">
                    Hybrid
                  </SelectItem>
                  <SelectItem value="onsite" className="text-white">
                    Onsite
                  </SelectItem>
                </SelectContent>
              </Select>
              <p id="settings-remote-preference-hint" className="text-xs text-zinc-500">
                Exact matches get a +8 bonus, overlapping setups (e.g. remote ↔
                hybrid) get +3, opposite gets &minus;6.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || savingPreferences}
              aria-busy={savingPreferences}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingPreferences ? "Saving…" : "Save preferences"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
