"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import {
  updateMyPassword,
  updateMyProfile,
  type AppProfile,
} from "@/src/app/actions/profiles";

type Props = {
  accessToken: string;
  profile: AppProfile;
  onProfileUpdated: (updated: AppProfile) => void;
};

export default function AccountSettingsView({
  accessToken,
  profile,
  onProfileUpdated,
}: Props) {
  // Profile Form State
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [lastName, setLastName] = useState(profile.last_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username cannot be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateMyProfile(accessToken, {
        first_name: firstName,
        last_name: lastName,
        username: username,
        phone: phone,
      });

      if (res.ok) {
        toast.success("Profile updated successfully!");
        onProfileUpdated(res.data);
      } else {
        toast.error(res.error || "Failed to update profile.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await updateMyPassword(accessToken, newPassword);
      if (res.ok) {
        toast.success("Password changed successfully!");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "Failed to change password.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-bold text-lg">
              {(profile.first_name?.[0] || profile.username?.[0] || profile.email?.[0] || "U").toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-900">
                  {profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : profile.username || "Account Settings"}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-semibold text-sky-700 capitalize">
                  <ShieldCheck size={12} />
                  {profile.role.replace("_", " ")}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600">
              User ID: <span className="font-mono text-zinc-900">{profile.id.slice(0, 8)}...</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card 1: Personal Information */}
      <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="mb-5 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <User size={18} className="text-orange-600" />
            <h3 className="text-base font-bold text-zinc-900">Personal Information</h3>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Update your public username, real name, and contact details.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Phone Number</label>
              <div className="relative">
                <Phone size={15} className="pointer-events-none absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full rounded-lg border border-zinc-200 pl-9 pr-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Email Address (Read-only)</label>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="email"
                value={profile.email || ""}
                disabled
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-9 py-2 text-sm text-zinc-500 cursor-not-allowed"
              />
              <Lock size={15} className="pointer-events-none absolute right-3 top-2.5 text-zinc-400" />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Email is managed by Supabase authentication.</p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 disabled:opacity-50 transition"
            >
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Profile Changes
            </button>
          </div>
        </form>
      </section>

      {/* Card 2: Security & Password (At the bottom after profile data) */}
      <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="mb-5 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-indigo-600" />
            <h3 className="text-base font-bold text-zinc-900">Change Password</h3>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Choose a secure password of at least 6 characters to protect your account.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword || !newPassword}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Update Password
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
