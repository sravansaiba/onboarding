"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import SearchableRestaurantSelect from "./SearchableRestaurantSelect";

type Props = {
  accessToken: string;
  restaurants: RestaurantRecord[];
  currentUserRole?: "super_admin" | "staff" | string;
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

function RestaurantFilterSelect({
  restaurants,
  value,
  onChange,
}: {
  restaurants: RestaurantRecord[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const selectedRestaurant = useMemo(() => {
    if (value === "all" || value === "unassigned") return null;
    return restaurants.find((r) => r.id === value) || null;
  }, [restaurants, value]);

  const displayLabel = useMemo(() => {
    if (value === "all") return "All Restaurants";
    if (value === "unassigned") return "Unassigned Only";
    return selectedRestaurant ? selectedRestaurant.restaurant_name : "Select Restaurant";
  }, [value, selectedRestaurant]);

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => {
      const name = (r.restaurant_name || "").toLowerCase();
      const domain = (r.domain_name || "").toLowerCase();
      return name.includes(q) || domain.includes(q);
    });
  }, [restaurants, searchQuery]);

  return (
    <div className="relative sm:w-64" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery("");
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm font-medium text-zinc-700 shadow-2xs outline-none transition ${
          isOpen
            ? "border-orange-500 ring-2 ring-orange-100"
            : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <Building2 size={15} className={`shrink-0 ${value !== "all" ? "text-orange-500" : "text-zinc-400"}`} />
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[280px] rounded-xl border border-zinc-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="relative mb-2">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search among restaurants..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-semibold transition ${
                value === "all" ? "bg-orange-50 text-orange-600" : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <span>All Restaurants</span>
              {value === "all" && <Check size={14} className="text-orange-600" />}
            </button>

            <button
              type="button"
              onClick={() => {
                onChange("unassigned");
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-semibold transition ${
                value === "unassigned" ? "bg-orange-50 text-orange-600" : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <span>Unassigned Only</span>
              {value === "unassigned" && <Check size={14} className="text-orange-600" />}
            </button>

            <div className="my-1 border-t border-zinc-100" />

            {filteredRestaurants.length === 0 ? (
              <div className="py-4 text-center text-zinc-400">
                No restaurants matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredRestaurants.map((r) => {
                const isSelected = value === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onChange(r.id);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${
                      isSelected ? "bg-orange-50 text-orange-600 font-semibold" : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-medium">{r.restaurant_name}</div>
                      {r.domain_name && (
                        <div className="truncate text-[10px] text-zinc-400">{r.domain_name}</div>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-orange-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersManagementView({
  accessToken,
  restaurants,
  currentUserRole = "super_admin",
}: Props) {
  const isStaff = currentUserRole === "staff";
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(isStaff ? "admin" : "all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await listManagedUsers(accessToken, {
      search: search.trim() || undefined,
      role: isStaff ? "admin" : roleFilter,
      restaurantId: restaurantFilter,
    });

    if (res.ok) {
      setUsers(res.data);
    } else {
      toast.error(res.error || "Failed to load users.");
    }
    setLoading(false);
  }, [accessToken, search, roleFilter, restaurantFilter, isStaff]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, restaurantFilter]);

  // Summary counts
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "admin").length;
    const staff = users.filter((u) => u.role === "staff").length;
    const assigned = users.filter((u) => Boolean(u.restaurant_id)).length;
    return { total, admins, staff, assigned };
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);

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
        {isStaff ? (
          <>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Admins</p>
                <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <Shield size={18} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.admins}</p>
              <p className="mt-1 text-xs text-zinc-500">Restaurant admin roles</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Assigned Admins</p>
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <Building2 size={18} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.assigned}</p>
              <p className="mt-1 text-xs text-zinc-500">Linked to an outlet</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Unassigned Admins</p>
                <div className="rounded-lg bg-zinc-100 p-2 text-zinc-500">
                  <Users size={18} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900">{Math.max(0, stats.admins - stats.assigned)}</p>
              <p className="mt-1 text-xs text-zinc-500">No restaurant linked</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Outlets</p>
                <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                  <Building2 size={18} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900">{restaurants.length}</p>
              <p className="mt-1 text-xs text-zinc-500">Available restaurants</p>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
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
                placeholder={isStaff ? "Search admin by name, email, or restaurant..." : "Search user by name, email, role, or restaurant..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Role Filter (hidden for staff since staff only sees admins) */}
            {!isStaff && (
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
            )}

            {/* Restaurant Filter */}
            <RestaurantFilterSelect
              restaurants={restaurants}
              value={restaurantFilter}
              onChange={setRestaurantFilter}
            />
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
                paginatedUsers.map((user) => {
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 shadow-2xs"
                            title="Edit details & restaurant"
                          >
                            <Edit3 size={13} />
                            Edit
                          </button>

                          {/* Password modification is strictly super_admin only */}
                          {!isStaff && (
                            <button
                              onClick={() => setPasswordUser(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 shadow-2xs"
                              title="Change password"
                            >
                              <KeyRound size={13} />
                              Password
                            </button>
                          )}

                          {/* Delete user: Strictly Super Admin only! Staff cannot delete users */}
                          {!isStaff && user.role !== "super_admin" && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 shadow-2xs"
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

        {/* Pagination Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-100 bg-white px-5 py-3 text-xs">
          {/* Left: Rows per page */}
          <div className="flex items-center gap-1.5 font-medium text-zinc-600">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 outline-none focus:border-orange-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Center: Showing count */}
          <div className="text-center font-medium text-zinc-500">
            Showing {users.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, users.length)} of {users.length} users
          </div>

          {/* End: Prev / Page / Next */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-1 font-medium text-zinc-600">
              Page <strong className="text-zinc-900">{page}</strong> of <strong className="text-zinc-900">{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <CreateUserModal
          restaurants={restaurants}
          isStaff={isStaff}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          restaurants={restaurants}
          isStaff={isStaff}
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
// 1. Create User Modal (Spacious, modern, non-congested)
// ---------------------------------------------------------------------------

function CreateUserModal({
  restaurants,
  isStaff = false,
  onClose,
  onSubmit,
}: {
  restaurants: RestaurantRecord[];
  isStaff?: boolean;
  onClose: () => void;
  onSubmit: (input: CreateManagedUserInput) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState(isStaff ? "admin" : "admin");
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
      role: isStaff ? "admin" : role,
      restaurant_id: restaurantId || null,
      username: username.trim() || undefined,
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 flex min-h-full items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4.5 bg-gradient-to-r from-orange-50/50 to-amber-50/30 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-200">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 leading-tight">
                {isStaff ? "Create Restaurant Admin" : "Create New User"}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isStaff
                  ? "Create a new administrator account and assign them to a restaurant"
                  : "Add a new platform admin or staff user to the system"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="p-6 sm:p-7 space-y-4">
          {/* Role Status / Selector */}
          {isStaff ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">User Role: Admin (Restaurant Admin)</p>
                  <p className="text-[11px] text-amber-700/80">Staff can create and assign administrators for restaurants</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-200/70 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 tracking-wide uppercase">
                Staff Action
              </span>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                User Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
              >
                <option value="admin">Admin (Restaurant Admin)</option>
                <option value="staff">Staff (Platform Staff)</option>
              </select>
            </div>
          )}

          {/* Assigned Restaurant - Full Width with Rich Searchable Combobox */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Assign Restaurant / Outlet
            </label>
            <SearchableRestaurantSelect
              restaurants={restaurants}
              value={restaurantId}
              onChange={setRestaurantId}
              placeholder="Search and select an outlet..."
            />
          </div>

          {/* Credentials: Email and Password */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="email"
                  required
                  placeholder="admin@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-10 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Personal Details: First and Last Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                First Name
              </label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* Contact Details: Username and Phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Username (Optional)
              </label>
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
          </div>

          </div>
          {/* Modal Actions Footer */}
          <div className="border-t border-zinc-100 bg-zinc-50/90 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-200 hover:bg-orange-600 disabled:opacity-60 transition"
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
// 2. Edit User Modal (Spacious, modern, non-congested)
// ---------------------------------------------------------------------------

function EditUserModal({
  user,
  restaurants,
  isStaff = false,
  onClose,
  onSubmit,
}: {
  user: ManagedUser;
  restaurants: RestaurantRecord[];
  isStaff?: boolean;
  onClose: () => void;
  onSubmit: (input: UpdateManagedUserInput) => Promise<void>;
}) {
  const [role, setRole] = useState(isStaff ? "admin" : (user.role || "admin"));
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
      role: isStaff ? "admin" : role,
      restaurant_id: restaurantId || null,
      username,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 flex min-h-full items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4.5 bg-gradient-to-r from-amber-50/60 to-orange-50/30 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-200">
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 leading-tight">Edit User Details</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{user.email || "No email"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="p-6 sm:p-7 space-y-4">
          {/* Role Status / Selector */}
          {isStaff ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">User Role: Admin (Restaurant Admin)</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-200/70 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 tracking-wide uppercase">
                ADMIN ROLE
              </span>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                User Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                {user.role === "super_admin" && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
          )}

          {/* Assigned Restaurant - Full Width with Rich Searchable Combobox */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Assigned Restaurant / Outlet
            </label>
            <SearchableRestaurantSelect
              restaurants={restaurants}
              value={restaurantId}
              onChange={setRestaurantId}
              placeholder="Search and select an outlet..."
            />
          </div>

          {/* Personal Details: First and Last Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* Contact Details: Username and Phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
          </div>

          </div>
          {/* Modal Actions Footer */}
          <div className="border-t border-zinc-100 bg-zinc-50/90 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-200 hover:bg-orange-600 disabled:opacity-60 transition"
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
// 3. Change Password Modal (Super Admin only)
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 flex min-h-full items-center justify-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-gradient-to-r from-amber-50/60 to-orange-50/30">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Change Password</h3>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition">
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
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
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
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-200 hover:bg-amber-600 disabled:opacity-60 transition"
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
// 4. Delete User Confirmation Modal (Super Admin only)
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 flex min-h-full items-center justify-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
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
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-rose-200 hover:bg-rose-700 disabled:opacity-60 transition"
          >
            {submitting ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
