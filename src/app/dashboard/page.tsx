"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/src/components/AdminDashboard";
import CustomerDashboard from "@/src/components/CustomerDashboard";
import { getCurrentProfile, type AppProfile } from "@/src/app/actions/profiles";
import { supabase } from "@/src/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";

      if (!token) {
        router.push("/login");
        return;
      }

      const result = await getCurrentProfile(token);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      localStorage.setItem("accessToken", token);
      localStorage.setItem("user", JSON.stringify(result.data));
      localStorage.setItem("isLoggedIn", "true");
      setAccessToken(token);
      setProfile(result.data);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    ["accessToken", "user", "isLoggedIn", "jwt"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          <p className="mt-4 text-sm font-medium text-zinc-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold text-zinc-950">Could not open dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">{error || "Profile not found."}</p>
          <button onClick={handleLogout} className="mt-5 rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white">
            Sign in again
          </button>
        </div>
      </div>
    );
  }

  if (["super_admin", "admin"].includes(profile.role)) {
    return <AdminDashboard accessToken={accessToken} profile={profile} onLogout={handleLogout} />;
  }

  return <CustomerDashboard accessToken={accessToken} profile={profile} onLogout={handleLogout} />;
}
