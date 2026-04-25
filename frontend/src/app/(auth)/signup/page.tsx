"use client";

import { createClient } from "@/lib/supabase/client";
import { disableDemoMode } from "@/lib/demo-mode";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Exit demo mode: once a real account exists, all api.ts calls should
  // talk to Supabase with the fresh session.
  useEffect(() => {
    disableDemoMode();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) {
        if (error.message === "Failed to fetch") {
          router.push("/dashboard");
          return;
        }
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    }
  };

  return (
    <div
      className="min-h-screen bg-zinc-950 flex items-center justify-center px-4"
      style={{ colorScheme: "dark" }}
    >
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-2"
          >
            A
          </div>
          <CardTitle className="text-2xl text-white">Create account</CardTitle>
          <CardDescription className="text-zinc-400">
            Start automating your job applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} aria-busy={loading} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            {error ? (
              <p
                role="alert"
                aria-live="assertive"
                className="text-red-400 text-sm"
              >
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
