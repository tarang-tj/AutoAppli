"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch, isResumeApiConfigured } from "@/lib/api";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { UserProfile } from "@/types";
import { User, Shield, Download, KeyRound, Bell, AlertTriangle, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

export default function SettingsPage() {
  const apiOn = isResumeApiConfigured();
  const supabaseOn = isSupabaseConfigured();
  const { data, mutate, isLoading } = useSWR<UserProfile>("/profile", () => apiGet<UserProfile>("/profile"), {
    revalidateOnFocus: false,
  });

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [bio, setBio] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // Notification preferences (stored in localStorage)
  const [notifStaleBookmarks, setNotifStaleBookmarks] = useState(true);
  const [notifNoResponse, setNotifNoResponse] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifLongInterviews, setNotifLongInterviews] = useState(true);

  // Danger zone
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Load notification prefs from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefs = localStorage.getItem("autoappli_notif_prefs");
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        setNotifStaleBookmarks(parsed.staleBookmarks ?? true);
        setNotifNoResponse(parsed.noResponse ?? true);
        setNotifDeadlines(parsed.deadlines ?? true);
        setNotifLongInterviews(parsed.longInterviews ?? true);
      } catch { /* ignore */ }
    }
  }, []);

  const saveNotifPrefs = (key: string, value: boolean) => {
    const current = {
      staleBookmarks: notifStaleBookmarks,
      noResponse: notifNoResponse,
      deadlines: notifDeadlines,
      longInterviews: notifLongInterviews,
      [key]: value,
    };
    localStorage.setItem("autoappli_notif_prefs", JSON.stringify(current));
    toast.success("Notification preference saved");
  };

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.display_name ?? "");
    setHeadline(data.headline ?? "");
    setLinkedinUrl(data.linkedin_url ?? "");
    setPhone(data.phone ?? "");
    setLocation(data.location ?? "");
    setPortfolioUrl(data.portfolio_url ?? "");
    setBio(data.bio ?? "");
  }, [data]);

  const handleSave = async () => {
    try {
      const next = await apiPatch<UserProfile>("/profile", {
        display_name: displayName,
        headline,
        linkedin_url: linkedinUrl,
        phone,
        location,
        portfolio_url: portfolioUrl,
        bio,
      });
      void mutate(next, { revalidate: false });
      toast.success(apiOn ? "Profile saved" : "Profile saved for this browser session (demo)");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const [jobs, profile] = await Promise.all([
        apiGet<unknown[]>("/jobs"),
        apiGet<UserProfile>("/profile"),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile,
        jobs,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autoappli-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
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
          Manage your profile, security, and data. Your display name is used in outreach messages for
          greetings and sign-offs.
        </p>
      </div>

      <div className="space-y-6 max-w-xl">
        {/* Profile Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              Profile
            </CardTitle>
            <CardDescription className="text-zinc-500">
              {apiOn
                ? "Stored in your database."
                : "Demo: profile is kept in this browser session only."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label className="text-zinc-300">Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
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
              <Label className="text-zinc-300">Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
                disabled={isLoading}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Short bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A brief summary of your background and what you're looking for..."
                rows={3}
                disabled={isLoading}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">LinkedIn URL</Label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Portfolio / GitHub</Label>
                <Input
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
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

        {/* Security Card */}
        {supabaseOn && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                Security
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Update your password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Current password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">New password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    minLength={6}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Confirm new password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
              <Button
                type="button"
                onClick={() => void handlePasswordChange()}
                disabled={passwordLoading || !newPassword || newPassword !== confirmPassword}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {passwordLoading ? "Updating..." : "Update password"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Data Export Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Download className="h-5 w-5 text-amber-400" />
              Data Export
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Download all your data as a JSON file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-4">
              Export your profile, job applications, and all related data. The download includes
              everything stored in your account.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportData()}
              disabled={exporting}
              className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export my data"}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-400" />
              Dashboard Nudges
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Control which smart reminders appear on your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                key: "staleBookmarks",
                label: "Stale bookmarks",
                desc: "Remind me about jobs bookmarked for over a week",
                checked: notifStaleBookmarks,
                set: setNotifStaleBookmarks,
              },
              {
                key: "noResponse",
                label: "No response follow-ups",
                desc: "Nudge me about applications with no response after 2 weeks",
                checked: notifNoResponse,
                set: setNotifNoResponse,
              },
              {
                key: "deadlines",
                label: "Upcoming deadlines",
                desc: "Warn about application deadlines within 3 days",
                checked: notifDeadlines,
                set: setNotifDeadlines,
              },
              {
                key: "longInterviews",
                label: "Long interview processes",
                desc: "Flag interviews in progress for 3+ weeks",
                checked: notifLongInterviews,
                set: setNotifLongInterviews,
              },
            ].map((pref) => (
              <label
                key={pref.key}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={pref.checked}
                  onChange={(e) => {
                    pref.set(e.target.checked);
                    saveNotifPrefs(pref.key, e.target.checked);
                  }}
                  className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm text-zinc-200 font-medium group-hover:text-white transition-colors">
                    {pref.label}
                  </p>
                  <p className="text-xs text-zinc-500">{pref.desc}</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {supabaseOn && (
          <Card className="bg-zinc-900 border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Irreversible account actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sign out */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-200 font-medium">Sign out</p>
                  <p className="text-xs text-zinc-500">
                    Sign out of your current session
                  </p>
                </div>
                {!confirmSignOut ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                    onClick={() => setConfirmSignOut(true)}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign out
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-zinc-600 text-zinc-200"
                      onClick={() => setConfirmSignOut(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={async () => {
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        window.location.href = "/login";
                      }}
                    >
                      Confirm sign out
                    </Button>
                  </div>
                )}
              </div>

              {/* Delete account */}
              <div className="border-t border-zinc-800 pt-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm text-red-300 font-medium">
                      Delete account
                    </p>
                    <p className="text-xs text-zinc-500">
                      Permanently delete your account and all associated data.
                      This cannot be undone.
                    </p>
                  </div>
                  {!confirmDeleteAccount ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-800 text-red-300 hover:bg-red-950/50 w-fit"
                      onClick={() => setConfirmDeleteAccount(true)}
                    >
                      Delete my account
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-lg bg-red-950/20 border border-red-900/50 p-3">
                      <p className="text-xs text-red-300">
                        Type <strong className="text-red-200">delete my account</strong> below to confirm:
                      </p>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="delete my account"
                        className="bg-zinc-950 border-red-900 text-white text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-zinc-600 text-zinc-200"
                          onClick={() => {
                            setConfirmDeleteAccount(false);
                            setDeleteConfirmText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={deleteConfirmText !== "delete my account"}
                          onClick={() => {
                            toast.error(
                              "Account deletion requires server-side processing. Please contact support."
                            );
                            setConfirmDeleteAccount(false);
                            setDeleteConfirmText("");
                          }}
                        >
                          Permanently delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
