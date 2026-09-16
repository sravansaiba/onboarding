"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Check,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Unlink,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  createManagedUser,
  deleteManagedUser,
  listManagedUsers,
  removeUserFromRestaurant,
  updateManagedUser,
  updateManagedUserPassword,
  type CreateManagedUserInput,
  type ManagedUser,
  type UpdateManagedUserInput,
} from "@/src/app/actions/user-management";
import type { RestaurantRecord } from "@/src/app/actions/restaurants";

type Props = {
  accessToken: string;
  restaurants: RestaurantRecord[];
};

const ROLES_LIST = [
  { value: "admin", label: "Admin", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "staff", label: "Staff", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "super_admin", label: "Super Admin", color: "bg-purple-50 text-purple-700 border-purple-200" },
];

function getRoleBadge(role: string) {
  const found = ROLES_LIST.find((r) => r.value === role.toLowerCase());
  const label = found ? found.label : role;
  const color = found ? found.color : "bg-zinc-100 text-zinc-700 border-zinc-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {role === "super_admin" && <Shield size={12} />}
      {label}
    </span>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function UsersManagementView({ accessToken, restaurants }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await listManagedUsers(accessToken, {
      search: search.trim() || undefined,
      role: roleFilter,
      restaurantId: restaurantFilter,
    });

    if (res.ok) {
      setUsers(res.data);
    } else {
      toast.error(res.error || "Failed to load users.");
    }
    setLoading(false);
  }, [accessToken, search, roleFilter, restaurantFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Summary counts
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "admin").length;
    const staff = users.filter((u) => u.role === "staff").length;
    const assigned = users.filter((u) => Boolean(u.restaurant_id)).length;
    return { total, admins, staff, assigned };
  }, [users]);

  // Action handlers
  async function handleCreateUser(input: CreateManagedUserInput) {
    const res = await createManagedUser(accessToken, input);
    if (res.ok) {
      toast.success("User created successfully!");
      setShowCreateModal(false);
      fetchUsers();
    } else {
      toast.error(res.error || "Failed to create user.");
    }
  }

  async function handleUpdateUser(userId: string, input: UpdateManagedUserInput) {
    const res = await updateManagedUser(accessToken, userId, input);
    if (res.ok) {
      toast.success("User updated successfully!");
      setEditingUser(null);
      fetchUsers();
    } else {
      toast.error(res.error || "Failed to update user.");
    }
  }

  async function handleChangePassword(userId: string, newPass: string) {
    const res = await updateManagedUserPassword(accessToken, userId, newPass);
    if (res.ok) {
      toast.success("Password changed successfully!");
      setPasswordUser(null);
    } else {
      toast.error(res.error || "Failed to change password.");
    }
  }

  async function handleRemoveFromRestaurant(userId: string) {
    const res = await removeUserFromRestaurant(accessToken, userId);
    if (res.ok) {
      toast.success("User unassigned from restaurant.");
      fetchUsers();
    } else {
      toast.error(res.error || "Failed to unassign restaurant.");
    }
  }

  async function handleDeleteUser(userId: string) {
    const res = await deleteManagedUser(accessToken, userId);
    if (res.ok) {
      toast.success("User permanently deleted.");
      setDeletingUser(null);
      fetchUsers();
    } else {
      toast.error(res.error || "Failed to delete user.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Users</p>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.total}</p>
          <p className="mt-1 text-xs text-zinc-500">Registered profiles</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Admins</p>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Shield size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.admins}</p>
          <p className="mt-1 text-xs text-zinc-500">Restaurant admin roles</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Staff Members</p>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.staff}</p>
          <p className="mt-1 text-xs text-zinc-500">Platform staff roles</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Assigned</p>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Building2 size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.assigned}</p>
          <p className="mt-1 text-xs text-zinc-500">Linked to a restaurant</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Search user by name, email, role, or restaurant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Role Filter */}
            <div className="sm:w-44">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {/* Restaurant Filter */}
            <div className="sm:w-56">
              <select
                value={restaurantFilter}
                onChange={(e) => setRestaurantFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="all">All Restaurants</option>
                <option value="unassigned">Unassigned Only</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.restaurant_name} ({r.domain_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              title="Refresh users list"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
            >
              <UserPlus size={16} />
              New User
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">User</th>
                <th className="px-5 py-3.5 font-semibold">Role</th>
                <th className="px-5 py-3.5 font-semibold">Assigned Restaurant</th>
                <th className="px-5 py-3.5 font-semibold">Contact</th>
                <th className="px-5 py-3.5 font-semibold">Created</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                    <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                    <Users size={32} className="mx-auto mb-2 text-zinc-300" />
                    No users match the criteria.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "User";
                  const initial = (user.first_name?.[0] || user.username?.[0] || user.email?.[0] || "U").toUpperCase();

                  return (
                    <tr key={user.id} className="transition hover:bg-zinc-50/70">
                      {/* User Column */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 font-semibold text-white shadow-sm">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900">{displayName}</p>
                            <p className="truncate text-xs text-zinc-400">{user.email || "No email"}</p>
                            {user.username && user.username !== displayName && (
                              <p className="text-[11px] text-zinc-400">@{user.username}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Assigned Restaurant */}
                      <td className="px-5 py-3.5">
                        {user.restaurant_name ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-800">{user.restaurant_name}</span>
                            <span className="text-xs text-zinc-400">{user.restaurant_domain}</span>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {user.phone ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-zinc-700">
                            <Phone size={12} className="text-zinc-400" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-5 py-3.5 text-xs whitespace-nowrap text-zinc-500">
                        {formatDate(user.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                            title="Edit role & restaurant"
                          >
                            <Edit3 size={13} />
                            Edit
                          </button>

                          <button
                            onClick={() => setPasswordUser(user)}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                            title="Change password"
                          >
                            <KeyRound size={13} />
                            Password
                          </button>

                          {user.role !== "super_admin" && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50/60 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                              title="Delete user"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <CreateUserModal
          restaurants={restaurants}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          restaurants={restaurants}
          onClose={() => setEditingUser(null)}
          onSubmit={(input) => handleUpdateUser(editingUser.id, input)}
        />
      )}

      {/* CHANGE PASSWORD MODAL */}
      {passwordUser && (
        <ChangePasswordModal
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
          onSubmit={(newPass) => handleChangePassword(passwordUser.id, newPass)}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <DeleteUserConfirmationModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => handleDeleteUser(deletingUser.id)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Create User Modal
// ---------------------------------------------------------------------------

function CreateUserModal({
  restaurants,
  onClose,
  onSubmit,
}: {
  restaurants: RestaurantRecord[];
  onClose: () => void;
  onSubmit: (input: CreateManagedUserInput) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState("staff");
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    await onSubmit({
      email: email.trim(),
      password,
      role,
      restaurant_id: restaurantId || null,
      username: username.trim() || undefined,
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Create New User</h3>
              <p className="text-xs text-zinc-500">Add an admin, staff member, or manager to the system</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="staff@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 pr-10 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                User Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="staff">Staff (Platform Staff)</option>
                <option value="admin">Admin (Restaurant Admin)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Assign Restaurant
              </label>
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">No restaurant (Unassigned)</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.restaurant_name} ({r.domain_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">First Name</label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">Last Name</label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">Username</label>
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">Phone Number</label>
            <input
              type="tel"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-200 hover:bg-orange-600 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Edit User Modal
// ---------------------------------------------------------------------------

function EditUserModal({
  user,
  restaurants,
  onClose,
  onSubmit,
}: {
  user: ManagedUser;
  restaurants: RestaurantRecord[];
  onClose: () => void;
  onSubmit: (input: UpdateManagedUserInput) => Promise<void>;
}) {
  const [role, setRole] = useState(user.role || "staff");
  const [restaurantId, setRestaurantId] = useState<string>(user.restaurant_id || "");
  const [username, setUsername] = useState(user.username || "");
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      role,
      restaurant_id: restaurantId || null,
      username,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Edit User Details</h3>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                {user.role === "super_admin" && <option value="super_admin">Super Admin</option>}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Assigned Restaurant
              </label>
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">No restaurant (Unassigned)</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.restaurant_name} ({r.domain_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-200 hover:bg-orange-600 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Change Password Modal
// ---------------------------------------------------------------------------

function ChangePasswordModal({
  user,
  onClose,
  onSubmit,
}: {
  user: ManagedUser;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    await onSubmit(password);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Change Password</h3>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">New Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                placeholder="Enter at least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 pr-10 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600">Confirm Password</label>
            <input
              type={showPass ? "text" : "password"}
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-200 hover:bg-amber-600 disabled:opacity-60"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Delete User Confirmation Modal
// ---------------------------------------------------------------------------

function DeleteUserConfirmationModal({
  user,
  onClose,
  onConfirm,
}: {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <Trash2 size={24} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-zinc-900">Delete User Account?</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Are you sure you want to delete <span className="font-semibold text-zinc-900">{user.email || user.username}</span>?
            This will permanently remove the user from both the <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">profiles</code> table
            and the Supabase authentication <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">auth.users</code> database.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-rose-200 hover:bg-rose-700 disabled:opacity-60"
          >
            {submitting ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
