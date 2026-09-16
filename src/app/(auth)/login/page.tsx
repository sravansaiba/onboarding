"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { getCurrentProfile } from "@/src/app/actions/profiles";
import { supabase } from "@/src/lib/supabase/client";
import { saveAuthSession } from "@/src/lib/auth-storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.session) {
      setError(authError?.message ?? "Invalid email or password.");
      setLoading(false);
      return;
    }

    const profileResult = await getCurrentProfile(data.session.access_token);
    const profile = profileResult.ok
      ? profileResult.data
      : {
          id: data.user.id,
          email: data.user.email ?? email,
          username: data.user.user_metadata?.username ?? email.split("@")[0],
          role: "customer",
          restaurant_id: null,
        };

    // Save token and profile to cookies
    saveAuthSession(data.session.access_token, profile, rememberMe);

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#fff7ed] px-4 py-8 text-zinc-950">
      {/* Top single back button */}
      <div className="mx-auto max-w-6xl pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-orange-200/80 bg-white/90 px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-orange-300 hover:bg-white hover:text-orange-600"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">marinate360 onboarding</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-extrabold leading-tight">
            Bring every restaurant registration into one clean flow.
          </h1>
        </section>

        {/* Right Side: Sign-in Card */}
        <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-xl shadow-orange-100/70 sm:p-8">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-200">
              <LogIn size={24} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Sign in</h2>
          </div>

          {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
                className="w-full rounded-lg border border-zinc-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                placeholder="owner@restaurant.com"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-3 pr-12 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </div>

          <div className="my-5 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-zinc-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-orange-600"
              />
              Remember me
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={18} />
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-6 text-center text-sm text-zinc-600">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-orange-600 hover:text-orange-700">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
