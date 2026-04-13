"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch, isResumeApiConfigured } from "@/lib/api";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { UserProfile } from "@/types";
import { User, Shield, Download, KeyRound } from "lucide-react";
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
      </div>
    </div>
  );
}
