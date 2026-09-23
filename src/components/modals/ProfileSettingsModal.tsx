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
  X,
} from "lucide-react";
import {
  updateMyPassword,
  updateMyProfile,
  type AppProfile,
} from "@/src/app/actions/profiles";

type Props = {
  accessToken: string;
  profile: AppProfile;
  onClose: () => void;
  onProfileUpdated: (updated: AppProfile) => void;
  initialTab?: "profile" | "password";
};

export default function ProfileSettingsModal({
  accessToken,
  profile,
  onClose,
  onProfileUpdated,
  initialTab = "profile",
}: Props) {
  // Profile state
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [lastName, setLastName] = useState(profile.last_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Account & Profile Settings</h2>
              <p className="text-xs text-zinc-500">Manage your staff credentials and security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1: Profile Information */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={16} className="text-orange-600" />
                <h3 className="text-sm font-bold text-zinc-900">Personal Information</h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-semibold text-sky-700 capitalize">
                <ShieldCheck size={12} />
                {profile.role.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Phone</label>
                <div className="relative">
                  <Phone size={14} className="pointer-events-none absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full rounded-lg border border-zinc-200 pl-8 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-700">Email Address (Read-only)</label>
              <div className="relative">
                <Mail size={14} className="pointer-events-none absolute left-3 top-3 text-zinc-400" />
                <input
                  type="email"
                  value={profile.email || ""}
                  disabled
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-8 py-2 text-sm text-zinc-500 cursor-not-allowed"
                />
                <Lock size={14} className="pointer-events-none absolute right-3 top-3 text-zinc-400" />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 disabled:opacity-50 transition"
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Profile Data
              </button>
            </div>
          </form>

          {/* Section Divider */}
          <div className="border-t border-zinc-200 pt-5">
            {/* Section 2: Change Password */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Change Password</h3>
                  <p className="text-xs text-zinc-500">Update your account login password</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPassword || !newPassword}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
