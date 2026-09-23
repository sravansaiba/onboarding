"use client";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Settings as SettingsIcon,
  Store,
  User,
  ShieldCheck,
  TrendingUp,
  Award,
  Sparkles,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  getRestaurantDetails,
  listRestaurants,
  type RestaurantRecord,
} from "@/src/app/actions/restaurants";
import {
  listRestaurantSettings,
  type RestaurantSetting,
} from "@/src/app/actions/restaurant-settings";
import type { AppProfile } from "@/src/app/actions/profiles";
import { RESTAURANT_SETTING_DEFINITIONS, type RestaurantSettingDefinition } from "@/src/lib/constants/restaurant-settings";
import { formatAddress } from "@/src/lib/utils/address";
import SelectPackageModal from "@/src/components/modals/SelectPackageModal";
import UsersManagementView from "@/src/components/admin/UsersManagementView";
import EditRestaurantModal from "@/src/components/modals/EditRestaurantModal";
import AccountSettingsView from "@/src/components/admin/AccountSettingsView";

type Props = {
  accessToken: string;
  profile: AppProfile;
  onLogout: () => void;
};

type StaffView = "overview" | "restaurants" | "users" | "settings";
type RestaurantPanelTab = "overview" | "settings";

const PACKAGES = ["marinate-menu", "marinate-dinein", "marinate360", "marinate-foodtruck"];

export default function StaffDashboard({ accessToken, profile, onLogout }: Props) {
  const [currentProfile, setCurrentProfile] = useState<AppProfile>(profile);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const router = useRouter();
  const [activeView, setActiveView] = useState<StaffView>("overview");
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantRecord | null>(null);
  const [restaurantPanelTab, setRestaurantPanelTab] = useState<RestaurantPanelTab>("overview");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [settings, setSettings] = useState<RestaurantSetting[]>([]);
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState<"all" | "my">("all");
  const [packageScope, setPackageScope] = useState<"all" | "my">("all");
  const [quickDirectoryScope, setQuickDirectoryScope] = useState<"all" | "my">("all");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantRecord | null>(null);
  const [restaurantPage, setRestaurantPage] = useState(1);
  const [restaurantPageSize, setRestaurantPageSize] = useState(10);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    const result = await listRestaurants(accessToken);
    if (result.ok) {
      setRestaurants(result.data);
    } else {
      toast.error(result.error || "Failed to load restaurants.");
    }
    setLoading(false);
  }, [accessToken]);

  const loadRestaurantSettings = useCallback(
    async (restaurantId: string) => {
      const result = await listRestaurantSettings(accessToken, restaurantId);
      if (result.ok) {
        setSettings(result.data);
      } else {
        toast.error(result.error);
      }
    },
    [accessToken]
  );

  const loadSelectedRestaurantDetails = useCallback(
    async (restaurantId: string) => {
      const result = await getRestaurantDetails(accessToken, restaurantId);
      if (result.ok) {
        setSelectedRestaurant(result.data);
      } else {
        // Fallback to list item
        const fallback = restaurants.find((r) => r.id === restaurantId) ?? null;
        setSelectedRestaurant(fallback);
      }
    },
    [accessToken, restaurants]
  );

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    if (!selectedRestaurantId) {
      setSelectedRestaurant(null);
      return;
    }
    loadSelectedRestaurantDetails(selectedRestaurantId);
    loadRestaurantSettings(selectedRestaurantId);
  }, [loadRestaurantSettings, loadSelectedRestaurantDetails, selectedRestaurantId]);

  const myRestaurants = useMemo(() => {
    return restaurants.filter((r) => r.created_by === currentProfile.id);
  }, [restaurants, currentProfile.id]);

  useEffect(() => {
    setRestaurantPage(1);
  }, [restaurantSearch, restaurantFilter]);

  const filteredRestaurants = useMemo(() => {
    return filterRestaurants(restaurants, restaurantSearch).filter(
      (r) => restaurantFilter === "all" || r.created_by === currentProfile.id
    );
  }, [restaurants, restaurantSearch, restaurantFilter, currentProfile.id]);

  const totalRestaurantPages = Math.max(1, Math.ceil(filteredRestaurants.length / restaurantPageSize));
  const paginatedRestaurants = useMemo(() => {
    const start = (restaurantPage - 1) * restaurantPageSize;
    return filteredRestaurants.slice(start, start + restaurantPageSize);
  }, [filteredRestaurants, restaurantPage, restaurantPageSize]);

  const stats = useMemo(() => {
    const total = restaurants.length;
    const active = restaurants.filter((r) => r.is_active).length;
    const inactive = total - active;
    const createdByMe = myRestaurants.length;
    const myActive = myRestaurants.filter((r) => r.created_by === currentProfile.id && r.is_active).length;
    const myInactive = createdByMe - myActive;
    const myContributionRate = total > 0 ? Math.round((createdByMe / total) * 100) : 0;
    const platformActiveRate = total > 0 ? Math.round((active / total) * 100) : 100;
    return {
      total,
      active,
      inactive,
      createdByMe,
      myActive,
      myInactive,
      myContributionRate,
      platformActiveRate,
    };
  }, [restaurants, myRestaurants]);

  const packageDistribution = useMemo(() => {
    const targetList = packageScope === "my" ? myRestaurants : restaurants;
    const counts = new Map<string, number>();
    targetList.forEach((restaurant) => {
      counts.set(restaurant.package, (counts.get(restaurant.package) ?? 0) + 1);
    });
    return PACKAGES.map((pkg) => ({ key: pkg, value: counts.get(pkg) ?? 0 }));
  }, [restaurants, myRestaurants, packageScope]);

  const displayedDirectory = useMemo(() => {
    const list = quickDirectoryScope === "my" ? myRestaurants : restaurants;
    return list.slice(0, 6);
  }, [quickDirectoryScope, myRestaurants, restaurants]);

  function handleLogoutRequest() {
    setShowLogoutModal(true);
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <Toaster position="top-right" />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex flex-col">
              <div className="border-b border-zinc-100 px-5 py-5">
                <div className="flex items-center gap-2">
                  <Image src="/logo/m360logo.png" alt="Marinate360" width={24} height={24} className="h-6 w-auto object-contain" />
                  <p className="text-md font-semibold uppercase tracking-[0.1em] text-orange-600">Marinate360</p>
                </div>
                <h1 className="mt-2 text-xl font-semibold tracking-tight">Staff Portal</h1>
                {/* <p className="mt-1 truncate text-sm text-zinc-500">{currentProfile.email || currentProfile.username || "Staff User"}</p> */}
              </div>
              <nav className="space-y-1 px-3 py-4">
                <SidebarButton
                  icon={<LayoutDashboard size={18} />}
                  label="Overview"
                  active={activeView === "overview"}
                  onClick={() => {
                    setActiveView("overview");
                    setSelectedRestaurantId("");
                  }}
                />
                <SidebarButton
                  icon={<Store size={18} />}
                  label="Restaurants"
                  active={activeView === "restaurants"}
                  onClick={() => setActiveView("restaurants")}
                  badge={stats.total}
                />
                <SidebarButton
                  icon={<Users size={18} />}
                  label="Users"
                  active={activeView === "users"}
                  onClick={() => {
                    setActiveView("users");
                    setSelectedRestaurantId("");
                  }}
                />
                <SidebarButton
                  icon={<SettingsIcon size={18} />}
                  label="Settings"
                  active={activeView === "settings"}
                  onClick={() => {
                    setActiveView("settings");
                    setSelectedRestaurantId("");
                  }}
                />
              </nav>
            </div>

            </div>
        </aside>

        {/* Content Section */}
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/92 backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 xl:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Staff workspace</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {activeView === "overview" ? "Overview & Operations" : activeView === "restaurants" ? "Restaurant Directory & Settings" : activeView === "users" ? "User & Admin Management" : "Account & Profile Settings"}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void fetchRestaurants()}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
                  >
                    <Plus size={16} />
                    New restaurant
                  </button>

                  {/* Top-Right Account Menu */}
                  <div className="relative ml-1">
                    <button
                      type="button"
                      onClick={() => setSettingsMenuOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1.5 pr-2.5 text-xs font-semibold shadow-2xs hover:bg-zinc-50 transition"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                        {(currentProfile.first_name?.[0] || currentProfile.username?.[0] || currentProfile.email?.[0] || "U").toUpperCase()}
                      </div>
                      <div className="hidden sm:flex flex-col text-left">
                        <span className="text-xs font-bold text-zinc-900 leading-tight">
                          {currentProfile.first_name ? `${currentProfile.first_name} ${currentProfile.last_name || ""}`.trim() : currentProfile.username || "Staff User"}
                        </span>
                        <span className="text-[10px] text-zinc-400 capitalize">{currentProfile.role.replace("_", " ")}</span>
                      </div>
                      <ChevronDown size={14} className={`text-zinc-400 transition-transform ${settingsMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {settingsMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setSettingsMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 z-40 w-60 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-2 border-b border-zinc-100">
                            <p className="text-xs font-bold text-zinc-900">
                              {currentProfile.first_name ? `${currentProfile.first_name} ${currentProfile.last_name || ""}`.trim() : currentProfile.username || "Account"}
                            </p>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">{currentProfile.email}</p>

                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSettingsMenuOpen(false);
                                setActiveView("settings");
                                setSelectedRestaurantId("");
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                activeView === "settings"
                                  ? "bg-orange-50 text-orange-700"
                                  : "text-zinc-700 hover:bg-zinc-100"
                              }`}
                            >
                              <User size={14} className="text-zinc-500" />
                              Profile & Password
                            </button>
                          </div>

                          <div className="border-t border-zinc-100 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSettingsMenuOpen(false);
                                handleLogoutRequest();
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                            >
                              <LogOut size={14} className="text-rose-500" />
                              Sign out
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto lg:hidden">
                <button
                  onClick={() => {
                    setActiveView("overview");
                    setSelectedRestaurantId("");
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    activeView === "overview" ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveView("restaurants")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    activeView === "restaurants" ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  Restaurants
                </button>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 xl:p-8">
            {activeView === "overview" && (
              <div className="space-y-6">
                {/* 4 Clean Metric Cards */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {/* Created by You */}
                  <article className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Created by You</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <UserCheck size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">{stats.createdByMe}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {stats.myActive} active {stats.myInactive > 0 ? `· ${stats.myInactive} inactive` : ""}
                    </p>
                  </article>

                  {/* Total Outlets */}
                  <article className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Restaurants</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        <Store size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">{stats.total}</p>
                    <p className="mt-1 text-xs text-zinc-500">All registered outlets</p>
                  </article>

                  {/* Active Outlets */}
                  <article className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Outlets</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-700">{stats.active}</p>
                    <p className="mt-1 text-xs text-zinc-500">Live in production</p>
                  </article>

                  {/* Inactive Outlets */}
                  <article className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Inactive Outlets</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                        <XCircle size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">{stats.inactive}</p>
                    <p className="mt-1 text-xs text-zinc-500">Draft or offline</p>
                  </article>
                </section>

                {/* 2-Column Clean Layout: Outlets Directory + Package Distribution */}
                <section className="grid gap-6 lg:grid-cols-5">
                  {/* Left Column (3/5): Recent Outlets */}
                  <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs lg:col-span-3">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-zinc-600" />
                        <h3 className="text-sm font-semibold text-zinc-900">Recent Outlets</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setQuickDirectoryScope("all")}
                            className={`rounded-md px-2.5 py-1 font-medium transition ${
                              quickDirectoryScope === "all" ? "bg-white text-zinc-900 shadow-2xs font-semibold" : "text-zinc-500 hover:text-zinc-800"
                            }`}
                          >
                            All ({stats.total})
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickDirectoryScope("my")}
                            className={`rounded-md px-2.5 py-1 font-medium transition ${
                              quickDirectoryScope === "my" ? "bg-indigo-600 text-white shadow-2xs font-semibold" : "text-zinc-500 hover:text-zinc-800"
                            }`}
                          >
                            Mine ({stats.createdByMe})
                          </button>
                        </div>
                        <button
                          onClick={() => setActiveView("restaurants")}
                          className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                        >
                          View all &rarr;
                        </button>
                      </div>
                    </div>

                    {displayedDirectory.length === 0 ? (
                      <div className="py-12 text-center">
                        <Store size={28} className="mx-auto text-zinc-300" />
                        <p className="mt-2 text-sm font-medium text-zinc-600">No outlets found</p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {quickDirectoryScope === "my"
                            ? "You haven't onboarded any outlets yet."
                            : "No registered outlets."}
                        </p>
                        {quickDirectoryScope === "my" && (
                          <button
                            onClick={() => setShowCreate(true)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
                          >
                            <Plus size={14} /> New restaurant
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {displayedDirectory.map((r) => (
                          <div key={r.id} className="flex items-center justify-between py-3">
                            <div className="min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-semibold text-zinc-900 text-sm">{r.restaurant_name}</p>
                                {r.created_by === currentProfile.id ? (
                                  <span className="shrink-0 rounded-full bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                    You
                                  </span>
                                ) : null}
                                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  r.is_active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? "bg-emerald-500" : "bg-zinc-400"}`} />
                                  {r.is_active ? "Live" : "Draft"}
                                </span>
                              </div>
                              <p className="truncate text-xs text-zinc-400 mt-0.5">{r.domain_name}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => router.push(`/onboarding?editRestaurantId=${encodeURIComponent(r.id)}`)}
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                <Pencil size={11} />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRestaurantId(r.id);
                                  setRestaurantPanelTab("overview");
                                  setActiveView("restaurants");
                                }}
                                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRestaurantId(r.id);
                                  setRestaurantPanelTab("settings");
                                  setActiveView("restaurants");
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                <Sliders size={12} />
                                Settings
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column (2/5): Package Distribution */}
                  <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 size={18} className="text-zinc-600" />
                        <h3 className="text-sm font-semibold text-zinc-900">Packages</h3>
                      </div>
                      <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setPackageScope("all")}
                          className={`rounded-md px-2.5 py-1 font-medium transition ${
                            packageScope === "all" ? "bg-white text-zinc-900 shadow-2xs font-semibold" : "text-zinc-500 hover:text-zinc-800"
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setPackageScope("my")}
                          className={`rounded-md px-2.5 py-1 font-medium transition ${
                            packageScope === "my" ? "bg-indigo-600 text-white shadow-2xs font-semibold" : "text-zinc-500 hover:text-zinc-800"
                          }`}
                        >
                          Mine
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-1">
                      {packageDistribution.map((item) => {
                        const max = Math.max(...packageDistribution.map((d) => d.value), 1);
                        return (
                          <div key={item.key}>
                            <div className="mb-1.5 flex justify-between text-xs">
                              <span className="font-medium capitalize text-zinc-700">
                                {item.key.replace("marinate-", "")}
                              </span>
                              <span className="font-semibold text-zinc-900">{item.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-orange-500 transition-all duration-300"
                                style={{ width: `${Math.max((item.value / max) * 100, item.value ? 10 : 0)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeView === "restaurants" && (
              selectedRestaurant ? (
                <StaffRestaurantWorkspace
                  key={selectedRestaurant.id}
                  restaurant={selectedRestaurant}
                  settings={settings}
                  activeTab={restaurantPanelTab}
                  onTabChange={setRestaurantPanelTab}
                  onBack={() => setSelectedRestaurantId("")}
                  onEdit={() => router.push(`/onboarding?editRestaurantId=${encodeURIComponent(selectedRestaurant.id)}`)}
                />
              ) : (
                <section className="space-y-5">
                  <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h3 className="flex items-center gap-2 text-base font-semibold">
                          <Store size={18} className="text-orange-600" />
                          Restaurants
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          Browse registered restaurants, view operational details, and inspect configurations.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRestaurantFilter("all")}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              restaurantFilter === "all"
                                ? "bg-orange-500 text-white shadow-xs"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                          >
                            All Restaurants ({restaurants.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestaurantFilter("my")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              restaurantFilter === "my"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            }`}
                          >
                            <UserCheck size={13} />
                            Created by Me ({stats.createdByMe})
                          </button>
                        </div>
                      </div>
                      <label className="relative block w-full max-w-md">
                        <Search
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        />
                        <input
                          value={restaurantSearch}
                          onChange={(e) => setRestaurantSearch(e.target.value)}
                          placeholder="Search restaurant or domain..."
                          className="w-full rounded-md border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
                        />
                      </label>
                    </div>
                  </div>

                  {filteredRestaurants.length === 0 ? (
                    <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
                      <Store size={36} className="mx-auto text-zinc-300" />
                      <h3 className="mt-3 text-lg font-semibold text-zinc-900">No restaurants found</h3>
                      <p className="mt-1 text-sm text-zinc-500">Try a different search query or create a new restaurant.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {paginatedRestaurants.map((restaurant) => (
                        <div
                          key={restaurant.id}
                          className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-xl font-semibold tracking-tight text-zinc-900">
                                {restaurant.restaurant_name}
                              </h4>
                              <p className="mt-1 truncate text-sm text-zinc-500">{restaurant.domain_name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  restaurant.is_active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-zinc-100 text-zinc-600"
                                }`}
                              >
                                {restaurant.is_active ? "Active" : "Inactive"}
                              </span>
                              {restaurant.created_by === currentProfile.id ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                  <UserCheck size={10} /> Created by You
                                </span>
                              ) : restaurant.creator_role ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                                  {restaurant.creator_role === "super_admin" ? "Admin" : "Staff"}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                              {restaurant.package.replace("marinate-", "")}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => router.push(`/onboarding?editRestaurantId=${encodeURIComponent(restaurant.id)}`)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                              <span className="text-zinc-300">•</span>
                              <button
                                onClick={() => {
                                  setSelectedRestaurantId(restaurant.id);
                                  setRestaurantPanelTab("overview");
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                              >
                                Overview
                              </button>
                              <span className="text-zinc-300">•</span>
                              <button
                                onClick={() => {
                                  setSelectedRestaurantId(restaurant.id);
                                  setRestaurantPanelTab("settings");
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
                              >
                                <Sliders size={13} />
                                Settings
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>

                      {/* Pagination Toolbar */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-xs">
                        {/* Left: Rows per page */}
                        <div className="flex items-center gap-1.5 font-medium text-zinc-600">
                          <span>Rows per page:</span>
                          <select
                            value={restaurantPageSize}
                            onChange={(e) => {
                              setRestaurantPageSize(Number(e.target.value));
                              setRestaurantPage(1);
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
                          Showing {filteredRestaurants.length === 0 ? 0 : (restaurantPage - 1) * restaurantPageSize + 1}–{Math.min(restaurantPage * restaurantPageSize, filteredRestaurants.length)} of {filteredRestaurants.length} restaurants
                        </div>

                        {/* End: Prev / Page / Next */}
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={restaurantPage <= 1}
                            onClick={() => setRestaurantPage((p) => Math.max(1, p - 1))}
                            className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <span className="px-1 font-medium text-zinc-600">
                            Page <strong className="text-zinc-900">{restaurantPage}</strong> of <strong className="text-zinc-900">{totalRestaurantPages}</strong>
                          </span>
                          <button
                            type="button"
                            disabled={restaurantPage >= totalRestaurantPages}
                            onClick={() => setRestaurantPage((p) => Math.min(totalRestaurantPages, p + 1))}
                            className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )
            )}

            {activeView === "users" && (
              <UsersManagementView
                accessToken={accessToken}
                restaurants={restaurants}
                currentUserRole="staff"
              />
            )}

            {activeView === "settings" && (
              <AccountSettingsView
                accessToken={accessToken}
                profile={currentProfile}
                onProfileUpdated={(updated) => {
                  setCurrentProfile(updated);
                }}
              />
            )}
          </div>
        </section>
      </div>

      {showCreate && (
        <SelectPackageModal
          onClose={() => setShowCreate(false)}
          onSelect={(pkgKey, services) => {
            setShowCreate(false);
            router.push(`/onboarding?package=${encodeURIComponent(pkgKey)}&services=${encodeURIComponent(services.join(","))}`);
          }}
        />
      )}

      {editingRestaurant && (
        <EditRestaurantModal
          accessToken={accessToken}
          restaurant={editingRestaurant}
          onClose={() => setEditingRestaurant(null)}
          onUpdated={async (updated) => {
            setEditingRestaurant(null);
            setSelectedRestaurant(updated);
            setRestaurants((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            await fetchRestaurants();
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Sign out of Staff Portal?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Are you sure you want to end your staff session for <span className="font-semibold">{profile.email}</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Helpers & Subcomponents
// ---------------------------------------------------------------------------

function SidebarButton({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold transition ${
        active ? "bg-orange-50 text-orange-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {badge ? <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">{badge}</span> : null}
    </button>
  );
}

function filterRestaurants(restaurants: RestaurantRecord[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return restaurants;
  return restaurants.filter((r) =>
    [r.restaurant_name, r.domain_name, r.email ?? "", r.package].some((v) => v.toLowerCase().includes(query))
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function defaultSettingValue(type: RestaurantSettingDefinition["type"]) {
  if (type === "boolean") return "true";
  if (type === "number") return "0";
  return "";
}

function StaffRestaurantWorkspace({
  restaurant,
  settings,
  activeTab,
  onTabChange,
  onBack,
  onEdit,
}: {
  restaurant: RestaurantRecord;
  settings: RestaurantSetting[];
  activeTab: RestaurantPanelTab;
  onTabChange: (value: RestaurantPanelTab) => void;
  onBack: () => void;
  onEdit: () => void;
}) {
  const settingsMap = useMemo(() => new Map(settings.map((item) => [item.setting_key, item])), [settings]);
  const missingSettings = RESTAURANT_SETTING_DEFINITIONS.filter((definition) => !settingsMap.has(definition.key));

  return (
    <section className="space-y-4">
      {/* Header bar */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ArrowLeft size={16} />
              Back to directory
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold tracking-tight">{restaurant.restaurant_name}</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  restaurant.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {restaurant.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{restaurant.domain_name}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-orange-600"
            >
              <Pencil size={15} />
              Edit details
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTabChange("overview")}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                activeTab === "overview" ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => onTabChange("settings")}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                activeTab === "settings" ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Settings ({settings.length})
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "overview" ? (
            <div className="space-y-6">
              {/* Visuals / Branding Previews */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-3">
                  Visuals & Branding
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                    <span className="text-xs font-semibold text-zinc-500 block mb-2">Restaurant Logo</span>
                    {restaurant.logo_url ? (
                      <div className="relative h-20 w-36 overflow-hidden rounded-md border border-zinc-200 bg-white">
                        <Image src={restaurant.logo_url} alt="Logo" fill className="object-contain p-1" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-32 items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-400">
                        No logo uploaded
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                    <span className="text-xs font-semibold text-zinc-500 block mb-2">Background Banner</span>
                    {restaurant.background_image_url ? (
                      <div className="relative h-20 w-44 overflow-hidden rounded-md border border-zinc-200">
                        <Image src={restaurant.background_image_url} alt="Banner" fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-32 items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-400">
                        No background banner
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Info Card Grid */}
              <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoCard label="Food Ordering App URL" value={restaurant.domain_url || `${restaurant.domain_name}.marinate360.com`} />
                  <InfoCard label="POS domain" value={restaurant.pos_domain || "N/A"} />
                  <InfoCard label="Package" value={restaurant.package} />
                  <InfoCard label="Email" value={restaurant.email || "N/A"} />
                  <InfoCard label="Contact" value={restaurant.contact ? String(restaurant.contact) : "N/A"} />
                  <InfoCard label="Address" value={formatAddress(restaurant.address) || "N/A"} className="md:col-span-2" />
                  <InfoCard label="Description" value={restaurant.description || "N/A"} className="md:col-span-2" />
                  <InfoCard label="About" value={restaurant.about || "N/A"} className="md:col-span-2" />
                  <InfoCard label="GST" value={restaurant.gst_number || "N/A"} />
                  <InfoCard label="FSSAI" value={restaurant.fssai_number || "N/A"} />
                </div>

                <div className="space-y-3">
                  <InfoCard label="Services" value={restaurant.services.join(", ") || "N/A"} />
                  <InfoCard label="Cuisines" value={(restaurant.cuisines || []).join(", ") || "N/A"} />
                  <InfoCard label="Time zone" value={restaurant.time_zone || "N/A"} />
                  <InfoCard label="Created" value={formatDateTime(restaurant.created_at)} />
                  <InfoCard label="Updated" value={formatDateTime(restaurant.updated_at)} />
                </div>
              </div>

              {/* Certificates & Documents List */}
              {restaurant.images && restaurant.images.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-3">
                    Uploaded Documents & Certificates ({restaurant.images.length})
                  </h4>
                  <div className="divide-y divide-zinc-100">
                    {restaurant.images.map((doc) => (
                      <div key={doc.storage_path} className="flex items-center justify-between py-2.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className="text-orange-600 shrink-0" />
                          <span className="font-medium text-zinc-800 truncate">{doc.original_name}</span>
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                            {doc.image_type}
                          </span>
                        </div>
                        <a
                          href={doc.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          <ExternalLink size={12} />
                          Open
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {RESTAURANT_SETTING_DEFINITIONS.map((definition) => {
                  const currentSetting = settingsMap.get(definition.key);
                  const displayValue = currentSetting?.setting_value ?? defaultSettingValue(definition.type);
                  return (
                    <div
                      key={`${restaurant.id}-${definition.key}-${currentSetting?.setting_value ?? "missing"}`}
                      className="rounded-lg border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-zinc-900">{definition.label}</h4>
                          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{definition.key}</p>
                        </div>
                        {currentSetting ? (
                          <span
                            title="Configured (Read-only for Staff)"
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          >
                            <CheckCircle2 size={12} />
                            Active
                          </span>
                        ) : (
                          <span
                            title="Not Configured (Read-only for Staff)"
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500"
                          >
                            Not Set
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        {definition.type === "boolean" ? (
                          <select
                            aria-label={definition.label}
                            disabled
                            value={displayValue}
                            className="w-full cursor-not-allowed rounded-md border border-zinc-200 bg-zinc-100/80 px-3 py-2 text-sm text-zinc-700 opacity-90 outline-none"
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            aria-label={definition.label}
                            disabled
                            type={definition.type === "number" ? "number" : "text"}
                            value={displayValue}
                            placeholder="Not configured"
                            className="w-full cursor-not-allowed rounded-md border border-zinc-200 bg-zinc-100/80 px-3 py-2 text-sm text-zinc-700 opacity-90 outline-none"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {missingSettings.length > 0 && (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  Settings not yet configured by admin: {missingSettings.map((item) => item.label).join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function InfoCard({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-100 bg-zinc-50 p-4 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 break-words text-sm font-medium text-zinc-900">{value}</div>
    </div>
  );
}
