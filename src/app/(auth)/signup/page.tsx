"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useState } from "react";
import { ensureCustomerProfile } from "@/src/app/actions/profiles";
import { supabase } from "@/src/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function validate() {
    if (!username.trim()) return "Username is required.";
    if (!email.trim()) return "Email is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.session?.access_token) {
      const profileResult = await ensureCustomerProfile(data.session.access_token, {
        email: email.trim(),
        username: username.trim(),
      });

      if (profileResult.ok) {
        localStorage.setItem("accessToken", data.session.access_token);
        localStorage.setItem("user", JSON.stringify(profileResult.data));
        localStorage.setItem("isLoggedIn", "true");
        router.push("/");
        return;
      }
    }

    setSuccess("Account created. Please check your email, then sign in.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#fff7ed] px-4 py-10 text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border border-orange-100 bg-white p-6 shadow-xl shadow-orange-100/70 sm:p-8">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white">
              <UserPlus size={24} />
            </div>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-zinc-500">Register first, then submit your restaurant onboarding form.</p>
          </div>

          {success && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
          {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                placeholder="restaurant-owner"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                placeholder="owner@restaurant.com"
              />
            </label>

            <PasswordField
              label="Password"
              value={password}
              show={showPassword}
              onShowChange={setShowPassword}
              onChange={setPassword}
            />
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              show={showConfirmPassword}
              onShowChange={setShowConfirmPassword}
              onChange={setConfirmPassword}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus size={18} />
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-6 text-center text-sm text-zinc-600">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

function PasswordField({
  label,
  value,
  show,
  onShowChange,
  onChange,
}: {
  label: string;
  value: string;
  show: boolean;
  onShowChange: (value: boolean) => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-4 py-3 pr-12 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          placeholder={label}
        />
        <button
          type="button"
          onClick={() => onShowChange(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
