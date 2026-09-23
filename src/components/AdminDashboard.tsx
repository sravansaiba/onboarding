

"use client";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  Settings as SettingsIcon,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileClock,
  FileText,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Calendar,
  Search,
  ShieldCheck,
  Store,
  User,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  deleteOnboardingApplication,
  listOnboardingApplications,
  type ApplicationStatus,
  type OnboardingApplication,
} from "@/src/app/actions/onboarding-applications";
import {
  approveOnboardingApplication,
  deleteRestaurantRecord,
  getRestaurantDetails,
  listRestaurants,
  rejectOnboardingApplication,
  setRestaurantActiveState,
  type RestaurantRecord,
} from "@/src/app/actions/restaurants";
import {
  deleteRestaurantSetting,
  listRestaurantSettings,
  upsertRestaurantSetting,
  type RestaurantSetting,
} from "@/src/app/actions/restaurant-settings";
import { listAppLogs, purgeOldAppLogs, type AppLogRecord, type LogType } from "@/src/app/actions/app-logs";
import type { AppProfile } from "@/src/app/actions/profiles";
import AccountSettingsView from "@/src/components/admin/AccountSettingsView";
import { supabase } from "@/src/lib/supabase/client";
import { RESTAURANT_SETTING_DEFINITIONS, type RestaurantSettingDefinition } from "@/src/lib/constants/restaurant-settings";
import { formatAddress } from "@/src/lib/utils/address";
import UsersManagementView from "./admin/UsersManagementView";
import SelectPackageModal from "@/src/components/modals/SelectPackageModal";
import EditRestaurantModal from "@/src/components/modals/EditRestaurantModal";

type Props = {
  accessToken: string;
  profile: AppProfile;
  onLogout: () => void;
};

type AdminView = "overview" | "applications" | "restaurants" | "users" | "logs" | "settings";
type RestaurantPanelTab = "overview" | "settings";

const STATUS_TABS: Array<ApplicationStatus | "all"> = ["all", "pending", "accepted", "rejected"];
const PACKAGES = ["marinate-menu", "marinate-dinein", "marinate360", "marinate-foodtruck"];

export default function AdminDashboard({
  // router initialized
 accessToken, profile, onLogout }: Props) {
  const [currentProfile, setCurrentProfile] = useState<AppProfile>(profile);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [records, setRecords] = useState<OnboardingApplication[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OnboardingApplication | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantRecord | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantRecord | null>(null);
  const [selectedLogRestaurantId, setSelectedLogRestaurantId] = useState("");
  const [restaurantPanelTab, setRestaurantPanelTab] = useState<RestaurantPanelTab>("overview");
  const [settings, setSettings] = useState<RestaurantSetting[]>([]);
  const [appLogs, setAppLogs] = useState<AppLogRecord[]>([]);
  const [logTotalCount, setLogTotalCount] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logType, setLogType] = useState<LogType | "all">("all");
  const [status, setStatus] = useState<ApplicationStatus | "all">("pending");
  const router = useRouter();
  const [creatorFilter, setCreatorFilter] = useState<"all" | "staff" | "super_admin">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_week" | "this_month">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logLevel, setLogLevel] = useState<"all" | "info" | "warning" | "error">("all");
  const [logTimeRange, setLogTimeRange] = useState<"1h" | "24h" | "7d" | "all">("24h");
  const [logStatusCategory, setLogStatusCategory] = useState<"all" | "2xx" | "4xx" | "5xx">("all");
  const [page, setPage] = useState(1);
  const [appPageSize, setAppPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [appToApprove, setAppToApprove] = useState<OnboardingApplication | null>(null);
  const [appToReject, setAppToReject] = useState<OnboardingApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [appToDelete, setAppToDelete] = useState<OnboardingApplication | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<RestaurantRecord | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    const [applicationsResult, restaurantsResult] = await Promise.all([
      listOnboardingApplications({
        accessToken,
        page,
        pageSize: appPageSize,
        status,
        query: debouncedSearch,
        creatorRole: creatorFilter,
        timeRange: dateFilter,
      }),
      listRestaurants(accessToken),
    ]);

    if (applicationsResult.ok) {
      setRecords(applicationsResult.data.records);
      setTotalPages(applicationsResult.data.totalPages);
    } else {
      toast.error(applicationsResult.error);
    }

    if (restaurantsResult.ok) {
      setRestaurants(restaurantsResult.data);
    } else {
      toast.error(restaurantsResult.error);
    }

    setLoading(false);
  }, [accessToken, debouncedSearch, page, appPageSize, status, creatorFilter, dateFilter]);

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
        const fallback = restaurants.find((r) => r.id === restaurantId) ?? null;
        setSelectedRestaurant(fallback);
      }
    },
    [accessToken, restaurants]
  );

  const loadLogs = useCallback(
    async (restaurantId?: string) => {
      const result = await listAppLogs({
        accessToken,
        restaurantId,
        level: logLevel,
        logType: logType,
        timeRange: logTimeRange,
        statusCategory: logStatusCategory,
        query: logSearch,
        limit: 300,
      });

      if (result.ok) {
        setAppLogs(result.data.records);
        setLogTotalCount(result.data.totalCount);
        setLogPage(1);
      } else {
        toast.error(result.error);
      }
    },
    [accessToken, logLevel, logType, logTimeRange, logStatusCategory, logSearch]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      startTransition(() => {
        setPage(1);
        setDebouncedSearch(search);
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("super-admin-onboarding")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "onboarding_applications" }, () => {
        toast.success("New restaurant application received");
        void refreshDashboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    if (!selectedRestaurantId) {
      setSelectedRestaurant(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadRestaurantSettings(selectedRestaurantId);
      void loadSelectedRestaurantDetails(selectedRestaurantId);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadRestaurantSettings, loadSelectedRestaurantDetails, selectedRestaurantId]);

  useEffect(() => {
    if (activeView !== "logs") return;
    const timeout = window.setTimeout(() => {
      void loadLogs(selectedLogRestaurantId || undefined);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeView, loadLogs, selectedLogRestaurantId]);

  const stats = useMemo(() => {
    const pending = records.filter((record) => record.status === "pending").length;
    const accepted = records.filter((record) => record.status === "accepted").length;
    const rejected = records.filter((record) => record.status === "rejected").length;
    const createdByStaff = restaurants.filter((r) => r.creator_role === "staff").length;
    const createdByAdmin = restaurants.filter((r) => r.creator_role === "super_admin").length;
    return {
      pending,
      accepted,
      rejected,
      restaurants: restaurants.length,
      createdByStaff,
      createdByAdmin,
      total: pending + accepted + rejected,
    };
  }, [records, restaurants]);

  const selectedLogRestaurant = restaurants.find((restaurant) => restaurant.id === selectedLogRestaurantId) ?? null;

  const packageDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    restaurants.forEach((restaurant) => {
      counts.set(restaurant.package, (counts.get(restaurant.package) ?? 0) + 1);
    });
    return PACKAGES.map((pkg) => ({ key: pkg, value: counts.get(pkg) ?? 0 }));
  }, [restaurants]);

  function handleApprove(record: OnboardingApplication) {
    setAppToApprove(record);
  }

  async function executeApprove(record: OnboardingApplication) {
    setProcessingId(record.id);
    const result = await approveOnboardingApplication(accessToken, record.id);
    setProcessingId("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Restaurant accepted, created, and owner promoted to admin");
    setAppToApprove(null);
    setSelectedRecord(null);
    setActiveView("restaurants");
    await refreshDashboard();
    setSelectedRestaurantId(result.data.restaurantId);
  }

  function handleReject(record: OnboardingApplication) {
    setAppToReject(record);
    setRejectReason("Documents need review.");
  }

  async function executeReject(record: OnboardingApplication) {
    setProcessingId(record.id);
    const result = await rejectOnboardingApplication(accessToken, record.id, rejectReason);
    setProcessingId("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Application rejected");
    setAppToReject(null);
    setSelectedRecord(null);
    await refreshDashboard();
  }

  function handleDeleteApplication(record: OnboardingApplication) {
    setAppToDelete(record);
  }

  async function executeDeleteApplication(record: OnboardingApplication) {
    setProcessingId(record.id);
    const result = await deleteOnboardingApplication(accessToken, record.id);
    setProcessingId("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Application deleted from queue");
    setAppToDelete(null);
    setSelectedRecord(null);
    await refreshDashboard();
  }

  async function handleToggleRestaurantState() {
    if (!selectedRestaurant) return;
    const result = await setRestaurantActiveState(accessToken, selectedRestaurant.id, !selectedRestaurant.is_active);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data.is_active ? "Restaurant activated" : "Restaurant deactivated");
    setSelectedRestaurant((prev) => (prev ? { ...prev, is_active: result.data.is_active } : null));
    await refreshDashboard();
  }

  function handleDeleteRestaurant() {
    if (!selectedRestaurant) return;
    setRestaurantToDelete(selectedRestaurant);
  }

  async function executeDeleteRestaurant(restaurant: RestaurantRecord) {
    setProcessingId(restaurant.id);
    const result = await deleteRestaurantRecord(accessToken, restaurant.id);
    setProcessingId("");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Restaurant deleted");
    setRestaurantToDelete(null);
    setSelectedRestaurantId("");
    setSelectedRestaurant(null);
    await refreshDashboard();
  }

  function handleLogoutRequest() {
    setShowLogoutModal(true);
  }

  async function handleAddSetting(definition: RestaurantSettingDefinition) {
    if (!selectedRestaurant) return;
    const result = await upsertRestaurantSetting(accessToken, selectedRestaurant.id, definition.key, defaultSettingValue(definition.type));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSettings((current) => [...current.filter((item) => item.setting_key !== result.data.setting_key), result.data].sort((a, b) => a.setting_key.localeCompare(b.setting_key)));
    toast.success(`${definition.label} added`);
  }

  async function handleUpdateSetting(settingKey: string, settingValue: string) {
    if (!selectedRestaurant) return;
    const result = await upsertRestaurantSetting(accessToken, selectedRestaurant.id, settingKey, settingValue);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSettings((current) => [...current.filter((item) => item.setting_key !== result.data.setting_key), result.data].sort((a, b) => a.setting_key.localeCompare(b.setting_key)));
    toast.success("Setting updated");
  }

  async function handleRemoveSetting(settingKey: string) {
    if (!selectedRestaurant) return;
    const result = await deleteRestaurantSetting(accessToken, selectedRestaurant.id, settingKey);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSettings((current) => current.filter((item) => item.setting_key !== result.data.setting_key));
    toast.success("Setting removed");
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <Toaster position="top-right" />
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex flex-col">
              <div className="border-b border-zinc-100 px-5 py-5">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/logo/m360logo.png"
                    alt="Marinate360"
                    width={28}
                    height={28}
                    className="h-7 w-auto object-contain"
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Marinate360</p>
                </div>
                <h1 className="mt-2 text-xl font-semibold tracking-tight">Super Admin</h1>
              </div>
              <nav className="space-y-1 px-3 py-4">
                <SidebarButton icon={<LayoutDashboard size={18} />} label="Overview" active={activeView === "overview"} onClick={() => setActiveView("overview")} />
                <SidebarButton icon={<ClipboardList size={18} />} label="Applications" active={activeView === "applications"} onClick={() => setActiveView("applications")} badge={stats.pending} />
                <SidebarButton icon={<Store size={18} />} label="Restaurants" active={activeView === "restaurants"} onClick={() => setActiveView("restaurants")} />
                <SidebarButton icon={<Users size={18} />} label="Manage users" active={activeView === "users"} onClick={() => setActiveView("users")} />
                <SidebarButton icon={<FileClock size={18} />} label="Logs" active={activeView === "logs"} onClick={() => setActiveView("logs")} />
                <SidebarButton icon={<SettingsIcon size={18} />} label="Settings" active={activeView === "settings"} onClick={() => setActiveView("settings")} />
              </nav>
            </div>

            </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/92 backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 xl:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600 flex items-center gap-1.5">
                    {/* <Image src="/logo/m360logo.png" alt="Marinate360" width={18} height={18} className="h-4.5 w-auto object-contain inline-block" /> */}
                    Control panel
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">{viewTitle(activeView)}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => void refreshDashboard()} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                  <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600">
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
                        {(currentProfile.first_name?.[0] || currentProfile.username?.[0] || currentProfile.email?.[0] || "A").toUpperCase()}
                      </div>
                      <div className="hidden sm:flex flex-col text-left">
                        <span className="text-xs font-bold text-zinc-900 leading-tight">
                          {currentProfile.first_name ? `${currentProfile.first_name} ${currentProfile.last_name || ""}`.trim() : currentProfile.username || "Super Admin"}
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
                              {currentProfile.first_name ? `${currentProfile.first_name} ${currentProfile.last_name || ""}`.trim() : currentProfile.username || "Super Admin"}
                            </p>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">{currentProfile.email}</p>
                            
                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSettingsMenuOpen(false);
                                setActiveView("settings");
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
                <MobileTab label="Overview" active={activeView === "overview"} onClick={() => setActiveView("overview")} />
                <MobileTab label="Applications" active={activeView === "applications"} onClick={() => setActiveView("applications")} />
                <MobileTab label="Restaurants" active={activeView === "restaurants"} onClick={() => setActiveView("restaurants")} />
                <MobileTab label="Manage users" active={activeView === "users"} onClick={() => setActiveView("users")} />
                <MobileTab label="Logs" active={activeView === "logs"} onClick={() => setActiveView("logs")} />
              </div>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6 xl:px-8">
            {activeView === "overview" && (
              <div className="space-y-6">
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <StatCard label="Pending review" value={stats.pending} sub="Awaiting decision" icon={<Bell size={18} />} tone="orange" />
                  <StatCard label="Accepted" value={stats.accepted} sub="Created restaurants" icon={<CheckCircle2 size={18} />} tone="green" />
                  <StatCard label="Rejected" value={stats.rejected} sub="Need follow-up" icon={<XCircle size={18} />} tone="red" />
                  <StatCard label="Restaurants" value={stats.restaurants} sub="In production data" icon={<Store size={18} />} tone="zinc" />
                  <StatCard label="Created by Staff" value={stats.createdByStaff} sub="Staff creations" icon={<Users size={18} />} tone="indigo" />
                  <StatCard label="Created by Admin" value={stats.createdByAdmin} sub="Owner creations" icon={<ShieldCheck size={18} />} tone="purple" />
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <Panel title="Application trend" icon={<Activity size={18} />}>
                    <TrendChart pending={stats.pending} accepted={stats.accepted} rejected={stats.rejected} />
                  </Panel>
                  <Panel title="Package distribution" icon={<BarChart3 size={18} />}>
                    <PackageChart data={packageDistribution} />
                  </Panel>
                </section>

                <ApplicationsTable
                  records={records.slice(0, 5)}
                  loading={loading}
                  compact
                  onReview={setSelectedRecord}
                  onDelete={(rec) => void handleDeleteApplication(rec)}
                  restaurants={restaurants}
                  search={search}
                  setSearch={setSearch}
                  status={status}
                  setStatus={setStatus}
                  creatorFilter={creatorFilter}
                  setCreatorFilter={setCreatorFilter}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  page={page}
                  setPage={setPage}
                  pageSize={appPageSize}
                  setPageSize={setAppPageSize}
                  totalPages={totalPages}
                />
              </div>
            )}

            {activeView === "applications" && (
              <ApplicationsTable
                records={records}
                loading={loading}
                onReview={setSelectedRecord}
                onDelete={(rec) => void handleDeleteApplication(rec)}
                restaurants={restaurants}
                search={search}
                setSearch={setSearch}
                status={status}
                setStatus={setStatus}
                creatorFilter={creatorFilter}
                setCreatorFilter={setCreatorFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                page={page}
                setPage={setPage}
                pageSize={appPageSize}
                setPageSize={setAppPageSize}
                totalPages={totalPages}
              />
            )}

            {activeView === "restaurants" && (
              selectedRestaurant ? (
                <RestaurantWorkspace
                  key={selectedRestaurant.id}
                  restaurant={selectedRestaurant}
                  settings={settings}
                  activeTab={restaurantPanelTab}
                  onTabChange={setRestaurantPanelTab}
                  onBack={() => setSelectedRestaurantId("")}
                  onEdit={() => router.push(`/onboarding?editRestaurantId=${encodeURIComponent(selectedRestaurant.id)}`)}
                  onToggleState={handleToggleRestaurantState}
                  onDelete={handleDeleteRestaurant}
                  onAddSetting={handleAddSetting}
                  onUpdateSetting={handleUpdateSetting}
                  onRemoveSetting={handleRemoveSetting}
                />
              ) : (
                <RestaurantsGrid
                  restaurants={filterRestaurants(restaurants, restaurantSearch)}
                  search={restaurantSearch}
                  onSearchChange={setRestaurantSearch}
                  title="Restaurants"
                  description="Search by restaurant name or domain, then open the workspace."
                  emptyTitle="No matching restaurant"
                  emptyBody="Try a different search or create a new restaurant."
                  onSelect={(id) => {
                    setSelectedRestaurantId(id);
                    setRestaurantPanelTab("overview");
                  }}
                  onEdit={(id) => {
                    router.push(`/onboarding?editRestaurantId=${encodeURIComponent(id)}`);
                  }}
                />
              )
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

            {activeView === "users" && (
              <UsersManagementView accessToken={accessToken} restaurants={restaurants} />
            )}

            {activeView === "logs" && (
              selectedLogRestaurant ? (
                <RestaurantLogsWorkspace
                  accessToken={accessToken}
                  restaurant={selectedLogRestaurant}
                  logs={appLogs}
                  totalCount={logTotalCount}
                  logSearch={logSearch}
                  setLogSearch={setLogSearch}
                  logLevel={logLevel}
                  setLogLevel={setLogLevel}
                  logType={logType}
                  setLogType={setLogType}
                  logTimeRange={logTimeRange}
                  setLogTimeRange={setLogTimeRange}
                  logStatusCategory={logStatusCategory}
                  setLogStatusCategory={setLogStatusCategory}
                  logPage={logPage}
                  setLogPage={setLogPage}
                  onBack={() => setSelectedLogRestaurantId("")}
                  onRefresh={() => void loadLogs(selectedLogRestaurantId)}
                />
              ) : (
                <RestaurantsGrid
                  restaurants={filterRestaurants(restaurants, restaurantSearch)}
                  search={restaurantSearch}
                  onSearchChange={setRestaurantSearch}
                  title="Logs"
                  description="Choose a restaurant to inspect API activity, admin actions, and failures."
                  emptyTitle="No matching restaurant"
                  emptyBody="Try a different restaurant name or domain."
                  onSelect={(id) => setSelectedLogRestaurantId(id)}
                />
              )
            )}
          </div>
        </section>
      </div>

      {selectedRecord && (
        <ApplicationModal
          record={selectedRecord}
          processing={processingId === selectedRecord.id}
          onClose={() => setSelectedRecord(null)}
          onApprove={() => void handleApprove(selectedRecord)}
          onReject={() => void handleReject(selectedRecord)}
          onDelete={() => void handleDeleteApplication(selectedRecord)}
        />
      )}

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
            await refreshDashboard();
          }}
        />
      )}
      {/* Modal: Approve Application Confirmation */}
      {appToApprove && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Approve Application?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Accept <span className="font-semibold text-zinc-900">{appToApprove.restaurant_name}</span> and generate live restaurant credentials? The applicant (<span className="font-semibold">{appToApprove.email}</span>) will be granted admin access to this outlet.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => setAppToApprove(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => executeApprove(appToApprove)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {processingId === appToApprove.id ? "Approving..." : "Accept & Create Restaurant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Application with Reason */}
      {appToReject && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Reject Application</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Provide feedback or reason for rejecting <span className="font-semibold text-zinc-900">{appToReject.restaurant_name}</span>.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete GST documents, invalid address..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => setAppToReject(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(processingId) || !rejectReason.trim()}
                onClick={() => executeReject(appToReject)}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {processingId === appToReject.id ? "Rejecting..." : "Reject Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Application */}
      {appToDelete && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Application?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Permanently delete the registration record for <span className="font-semibold text-zinc-900">{appToDelete.restaurant_name}</span>? This will permanently remove it from the onboarding queue.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => setAppToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => executeDeleteApplication(appToDelete)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {processingId === appToDelete.id ? "Deleting..." : "Delete Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Restaurant */}
      {restaurantToDelete && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Restaurant?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Permanently delete <span className="font-semibold text-zinc-900">{restaurantToDelete.restaurant_name}</span>? All menu items, tables, orders, and configurations associated with this outlet will be permanently deleted. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => setRestaurantToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => executeDeleteRestaurant(restaurantToDelete)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {processingId === restaurantToDelete.id ? "Deleting..." : "Delete Restaurant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Logout Confirmation */}
      {showLogoutModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Sign out of Super Admin?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Are you sure you want to end your Super Admin session for <span className="font-semibold">{profile.email}</span>?
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

function viewTitle(view: AdminView) {
  return {
    overview: "Analytics overview",
    applications: "Application reviews",
    restaurants: "Restaurant workspace",
    users: "User management",
    logs: "Restaurant logs",
    settings: "Account & Profile Settings",
  }[view];
}

function filterRestaurants(restaurants: RestaurantRecord[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return restaurants;
  return restaurants.filter((restaurant) =>
    [restaurant.restaurant_name, restaurant.domain_name, restaurant.email ?? "", restaurant.package].some((value) =>
      value.toLowerCase().includes(query)
    )
  );
}

function defaultSettingValue(type: RestaurantSettingDefinition["type"]) {
  if (type === "boolean") return "true";
  if (type === "number") return "0";
  return "";
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SidebarButton({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active: boolean; badge?: number; onClick: () => void }) {
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

function MobileTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-700"}`}>
      {label}
    </button>
  );
}

function StatCard({ label, value, sub, icon, tone }: { label: string; value: number; sub: string; icon: React.ReactNode; tone: "orange" | "green" | "red" | "zinc" | "indigo" | "purple" }) {
  const toneStyles = {
    orange: "bg-orange-100 text-orange-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    zinc: "bg-zinc-100 text-zinc-700",
    indigo: "bg-indigo-100 text-indigo-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneStyles[tone]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs font-medium text-zinc-400">{sub}</p>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
        <span className="text-orange-600">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function TrendChart({ pending, accepted, rejected }: { pending: number; accepted: number; rejected: number }) {
  const values = [Math.max(pending, 1), Math.max(pending + accepted, 2), Math.max(accepted + rejected, 1), Math.max(accepted, 1), Math.max(rejected + 1, 1)];
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${index * 82 + 12},${124 - (value / max) * 92}`).join(" ");

  return (
    <div>
      <svg viewBox="0 0 360 140" className="h-56 w-full">
        <path d="M12 124H348" stroke="#e4e4e7" strokeWidth="1" />
        <path d="M12 88H348" stroke="#f4f4f5" strokeWidth="1" />
        <path d="M12 52H348" stroke="#f4f4f5" strokeWidth="1" />
        <polyline points={points} fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return <circle key={point} cx={cx} cy={cy} r="4" fill="#f97316" stroke="#ffffff" strokeWidth="2" />;
        })}
      </svg>
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricBadge label="Pending" value={pending} color="bg-orange-500" />
        <MetricBadge label="Accepted" value={accepted} color="bg-emerald-500" />
        <MetricBadge label="Rejected" value={rejected} color="bg-rose-500" />
      </div>
    </div>
  );
}

function PackageChart({ data }: { data: Array<{ key: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.key}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium capitalize text-zinc-700">{item.key.replace("marinate-", "")}</span>
            <span className="text-zinc-500">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100">
            <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-zinc-600">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function ApplicationsTable({
  records,
  loading,
  onReview,
  onDelete,
  restaurants,
  search,
  setSearch,
  status,
  setStatus,
  creatorFilter,
  setCreatorFilter,
  dateFilter,
  setDateFilter,
  page,
  setPage,
  pageSize = 10,
  setPageSize,
  totalPages,
  compact = false,
}: {
  records: OnboardingApplication[];
  loading: boolean;
  onReview: (record: OnboardingApplication) => void;
  onDelete: (record: OnboardingApplication) => void;
  restaurants: RestaurantRecord[];
  search: string;
  setSearch: (value: string) => void;
  status: ApplicationStatus | "all";
  setStatus: (value: ApplicationStatus | "all") => void;
  creatorFilter: "all" | "staff" | "super_admin";
  setCreatorFilter: (value: "all" | "staff" | "super_admin") => void;
  dateFilter: "all" | "today" | "this_week" | "this_month";
  setDateFilter: (value: "all" | "today" | "this_week" | "this_month") => void;
  page: number;
  setPage: (value: number | ((current: number) => number)) => void;
  pageSize?: number;
  setPageSize?: (value: number) => void;
  totalPages: number;
  compact?: boolean;
}) {
  const restaurantMap = useMemo(() => {
    const map = new Map<string, RestaurantRecord>();
    restaurants.forEach((r) => {
      map.set(r.id, r);
      if (r.domain_name) map.set(r.domain_name.toLowerCase(), r);
    });
    return map;
  }, [restaurants]);

  const displayedRecords = useMemo(() => {
    if (creatorFilter === "all") return records;
    return records.filter((record) => {
      const linkedRest = record.restaurant_id
        ? restaurantMap.get(record.restaurant_id)
        : restaurantMap.get(record.domain_name.toLowerCase());
      const cRole = linkedRest?.creator_role 
        ?? (record.submitted_by_role === "staff" ? "staff" : record.submitted_by_role === "super_admin" ? "super_admin" : null);
      return cRole === creatorFilter;
    });
  }, [records, creatorFilter, restaurantMap]);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <ClipboardList size={18} className="text-orange-600" />
              Application queue
            </h3>
            <p className="mt-1 text-sm text-zinc-500">Review registrations before they become live restaurants.</p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border border-zinc-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              placeholder="Search restaurant or email"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatus(tab);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                  status === tab ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Creator Filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <span>Creator:</span>
              <select
                value={creatorFilter}
                onChange={(e) => {
                  setCreatorFilter(e.target.value as any);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="all">All Creators</option>
                <option value="staff">Staff Only</option>
                <option value="super_admin">Super Admin Only</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <span>Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value as any);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="all">All Time</option>
                <option value="today">Created Today</option>
                <option value="this_week">This Week (Last 7d)</option>
                <option value="this_month">This Month (Last 30d)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  Loading applications...
                </td>
              </tr>
            ) : displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No applications found.
                </td>
              </tr>
            ) : (
              displayedRecords.map((record) => {
                const linkedRest = record.restaurant_id
                  ? restaurantMap.get(record.restaurant_id)
                  : restaurantMap.get(record.domain_name.toLowerCase());

                // Prioritize the actual restaurant creator (from restaurants.created_by)
                // Fallback to applicant/submitter if created directly or by staff
                const creatorRole = linkedRest?.creator_role 
                  ?? (record.submitted_by_role === "staff" ? "staff" : record.submitted_by_role === "super_admin" ? "super_admin" : null);

                const creatorName = linkedRest?.creator_name 
                  || (creatorRole ? record.submitted_by_name : null);

                const creatorEmail = linkedRest?.creator_email 
                  || (creatorRole ? record.submitted_by_email : null);

                return (
                  <tr key={record.id} className="hover:bg-orange-50/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-950">{record.restaurant_name}</div>
                      <div className="text-xs text-zinc-500">{record.domain_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-800">{record.owner_name}</div>
                      <div className="text-xs text-zinc-500">{record.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {creatorRole ? (
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              creatorRole === "staff"
                                ? "bg-indigo-50 border border-indigo-200 text-indigo-700"
                                : "bg-purple-50 border border-purple-200 text-purple-700"
                            }`}
                          >
                            <User size={11} />
                            {creatorRole === "staff" ? "Staff" : "Super Admin"}
                          </span>
                          {(creatorName || creatorEmail) && (
                            <div className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[130px]" title={creatorEmail || creatorName || ""}>
                              {creatorName || creatorEmail}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                          Customer / Direct
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                        {record.package.replace("marinate-", "")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} />
                      {record.status === "accepted" && (
                        linkedRest ? (
                          <span
                            className={`block mt-1 text-[11px] font-semibold ${
                              linkedRest.is_active ? "text-emerald-700" : "text-zinc-500"
                            }`}
                          >
                            {linkedRest.is_active ? "● Live Outlet" : "○ Deactivated Outlet"}
                          </span>
                        ) : (
                          <span className="block mt-1 text-[11px] font-semibold text-rose-600">
                            ✕ Restaurant Deleted
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {record.status === "accepted" ? (
                        <div>
                          <span className="text-xs font-semibold text-emerald-800">Accepted</span>
                          <p className="text-[11px] text-zinc-500">
                            {formatDateTime(record.reviewed_at || record.updated_at)}
                          </p>
                        </div>
                      ) : record.status === "rejected" ? (
                        <div>
                          <span className="text-xs font-semibold text-rose-700">Rejected</span>
                          <p className="text-[11px] text-zinc-500">
                            {formatDateTime(record.reviewed_at || record.updated_at)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-semibold text-zinc-800">Submitted</span>
                          <p className="text-[11px] text-zinc-500">{formatDateTime(record.created_at)}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onReview(record)}
                          className="rounded-md border border-orange-200 bg-orange-50/60 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => onDelete(record)}
                          title="Permanently delete application from queue"
                          className="rounded-md p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!compact && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-100 px-4 py-3 text-sm text-zinc-700">
          {/* Left: Rows per page */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                if (setPageSize) setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 outline-none focus:border-orange-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Center: Showing count */}
          <div className="text-center text-xs font-medium text-zinc-500">
            Showing {records.length === 0 ? 0 : (page - 1) * pageSize + 1}–{(page - 1) * pageSize + records.length} applications
          </div>

          {/* End: Prev / Page / Next */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="px-1 text-xs font-medium text-zinc-600">
              Page <strong className="text-zinc-900">{page}</strong> of <strong className="text-zinc-900">{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RestaurantsGrid({
  restaurants,
  search,
  onSearchChange,
  title,
  description,
  emptyTitle,
  emptyBody,
  onSelect,
  onEdit,
}: {
  restaurants: RestaurantRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  onSelect: (value: string) => void;
  onEdit?: (value: string) => void;
}) {
  const [creatorFilter, setCreatorFilter] = useState<"all" | "staff" | "super_admin">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_week" | "this_month">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, creatorFilter, dateFilter]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      if (creatorFilter !== "all" && r.creator_role !== creatorFilter) {
        return false;
      }
      if (dateFilter !== "all") {
        const createdTime = new Date(r.created_at).getTime();
        const now = Date.now();
        if (dateFilter === "today") {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (createdTime < startOfToday.getTime()) return false;
        } else if (dateFilter === "this_week") {
          if (now - createdTime > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === "this_month") {
          if (now - createdTime > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }
      return true;
    });
  }, [restaurants, creatorFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize));
  const paginatedRestaurants = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRestaurants.slice(start, start + pageSize);
  }, [filteredRestaurants, page, pageSize]);

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Store size={18} className="text-orange-600" />
              {title}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={creatorFilter}
              onChange={(e) => setCreatorFilter(e.target.value as any)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 outline-none focus:border-orange-500"
            >
              <option value="all">All Creators</option>
              <option value="staff">Staff Created</option>
              <option value="super_admin">Super Admin Created</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 outline-none focus:border-orange-500"
            >
              <option value="all">All Time</option>
              <option value="today">Created Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
            <label className="relative block w-full sm:w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search restaurant or domain"
                className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
              />
            </label>
          </div>
        </div>
      </div>

      {filteredRestaurants.length === 0 ? (
        <EmptyWorkspace title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {paginatedRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              onClick={() => onSelect(restaurant.id)}
              className="group rounded-lg border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xl font-semibold tracking-tight">{restaurant.restaurant_name}</div>
                  <div className="mt-1 truncate text-sm text-zinc-500">{restaurant.domain_name}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${restaurant.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                    {restaurant.is_active ? "Active" : "Inactive"}
                  </span>
                  {restaurant.creator_role ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      restaurant.creator_role === "staff"
                        ? "bg-indigo-50 border border-indigo-200 text-indigo-700"
                        : "bg-purple-50 border border-purple-200 text-purple-700"
                    }`}>
                      <User size={10} />
                      {restaurant.creator_role === "staff" ? "Staff" : "Super Admin"}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[11px] text-zinc-500">
                <span className="truncate max-w-[140px]" title={restaurant.creator_email || ""}>
                  {restaurant.creator_name || restaurant.creator_email || "System"}
                </span>
                <span>{formatDateTime(restaurant.created_at)}</span>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
                  Open workspace
                  <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                </span>
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(restaurant.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition shadow-2xs"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredRestaurants.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-xs">
          {/* Left: Rows per page */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 outline-none focus:border-orange-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Center: Showing count */}
          <div className="text-center text-xs font-medium text-zinc-500">
            Showing {Math.min((page - 1) * pageSize + 1, filteredRestaurants.length)}–{Math.min(page * pageSize, filteredRestaurants.length)} of {filteredRestaurants.length} restaurants
          </div>

          {/* End: Prev / Page / Next */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="px-1 text-xs font-medium text-zinc-600">
              Page <strong className="text-zinc-900">{page}</strong> of <strong className="text-zinc-900">{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

type RestaurantEditorValues = {
  restaurant_name: string;
  domain_name: string;
  domain_url?: string;
  email?: string;
  contact?: string;
  address: string;
  package: string;
  description?: string;
  about?: string;
  gst_number?: string;
  fssai_number?: string;
  pos_domain?: string;
  time_zone?: string;
};

const LOGS_PER_PAGE = 20;

function LogActivityHistogram({
  logs,
  timeRange,
}: {
  logs: AppLogRecord[];
  timeRange: "1h" | "24h" | "7d" | "all";
}) {
  const buckets = useMemo(() => {
    const numBuckets = 20;
    const now = Date.now();
    const rangeMs = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      all: 30 * 24 * 60 * 60 * 1000,
    }[timeRange];

    const bucketDuration = rangeMs / numBuckets;
    const startTime = now - rangeMs;

    const result = Array.from({ length: numBuckets }, (_, i) => {
      const bStart = startTime + i * bucketDuration;
      const bEnd = bStart + bucketDuration;
      const label =
        timeRange === "1h"
          ? new Date(bStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : timeRange === "24h"
          ? new Date(bStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date(bStart).toLocaleDateString([], { month: "short", day: "numeric" });
      return {
        start: bStart,
        end: bEnd,
        label,
        total: 0,
        success: 0,
        clientError: 0,
        serverError: 0,
      };
    });

    logs.forEach((log) => {
      const logTime = new Date(log.created_at).getTime();
      if (logTime >= startTime && logTime <= now) {
        const bucketIndex = Math.min(Math.floor((logTime - startTime) / bucketDuration), numBuckets - 1);
        if (bucketIndex >= 0) {
          result[bucketIndex].total += 1;
          const code = log.status_code ?? (log.status === "failed" ? 500 : 200);
          if (code >= 500) result[bucketIndex].serverError += 1;
          else if (code >= 400) result[bucketIndex].clientError += 1;
          else result[bucketIndex].success += 1;
        }
      }
    });

    return result;
  }, [logs, timeRange]);

  const maxCount = Math.max(...buckets.map((b) => b.total), 1);
  const totalInView = logs.length;
  const errorsInView = logs.filter((l) => (l.status_code && l.status_code >= 400) || l.level === "error").length;
  const errorRate = totalInView > 0 ? ((errorsInView / totalInView) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl border border-orange-200/80 bg-gradient-to-b from-orange-50/50 via-white to-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500 text-white">
            <Activity size={14} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900">Event Volume & Status Timeline</h4>
            <p className="text-xs text-zinc-500">Live distribution across the selected time range</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> Success (2xx)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Client (4xx)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Error (5xx)
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">Error rate: {errorRate}%</span>
        </div>
      </div>

      <div className="flex h-28 items-end gap-1.5 pt-3 border-b border-zinc-100">
        {buckets.map((bucket, idx) => {
          const heightPercent = bucket.total ? Math.max((bucket.total / maxCount) * 100, 10) : 3;
          return (
            <div key={idx} className="group relative flex-1 flex flex-col justify-end h-full cursor-pointer">
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] text-white shadow-xl">
                <span className="font-semibold">{bucket.label}</span>
                <span>
                  {bucket.total} events ({bucket.success} ok, {bucket.clientError + bucket.serverError} err)
                </span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
              </div>

              {/* Bar */}
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-t transition-all ${
                  bucket.serverError > 0
                    ? "bg-rose-500 hover:bg-rose-600"
                    : bucket.clientError > 0
                    ? "bg-amber-500 hover:bg-amber-600"
                    : bucket.total > 0
                    ? "bg-gradient-to-t from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500"
                    : "bg-zinc-100/70"
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[11px] font-medium text-zinc-400 mt-2 px-1">
        <span>{buckets[0]?.label || "Past"}</span>
        <span>Timeline Activity</span>
        <span>{buckets[buckets.length - 1]?.label || "Now"}</span>
      </div>
    </div>
  );
}

function RestaurantLogsWorkspace({
  accessToken,
  restaurant,
  logs,
  totalCount,
  logSearch,
  setLogSearch,
  logLevel,
  setLogLevel,
  logType,
  setLogType,
  logTimeRange,
  setLogTimeRange,
  logStatusCategory,
  setLogStatusCategory,
  logPage,
  setLogPage,
  onBack,
  onRefresh,
}: {
  accessToken: string;
  restaurant: RestaurantRecord;
  logs: AppLogRecord[];
  totalCount: number;
  logSearch: string;
  setLogSearch: (value: string) => void;
  logLevel: "all" | "info" | "warning" | "error";
  setLogLevel: (value: "all" | "info" | "warning" | "error") => void;
  logType: LogType | "all";
  setLogType: (value: LogType | "all") => void;
  logTimeRange: "1h" | "24h" | "7d" | "all";
  setLogTimeRange: (value: "1h" | "24h" | "7d" | "all") => void;
  logStatusCategory: "all" | "2xx" | "4xx" | "5xx";
  setLogStatusCategory: (value: "all" | "2xx" | "4xx" | "5xx") => void;
  logPage: number;
  setLogPage: (value: number | ((current: number) => number)) => void;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [purging, setPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const totalLogPages = Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE));
  const paginatedLogs = logs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);

  // Quick stats from loaded data
  const errorCount = logs.filter((l) => l.level === "error" || (l.status_code && l.status_code >= 500)).length;
  const apiCount = logs.filter((l) => l.log_type === "api").length;
  const auditCount = logs.filter((l) => l.log_type === "audit").length;
  const avgDuration =
    logs.filter((l) => l.duration_ms != null).length > 0
      ? Math.round(
          logs.reduce((acc, l) => acc + (l.duration_ms || 0), 0) /
            logs.filter((l) => l.duration_ms != null).length
        )
      : null;

  async function executePurge() {
    setPurging(true);
    const res = await purgeOldAppLogs(accessToken, 7);
    setPurging(false);
    setShowPurgeConfirm(false);
    if (res.ok) {
      toast.success(`Purged ${res.data.deletedCount} log records older than 7 days.`);
      onRefresh();
    } else {
      toast.error(res.error || "Failed to purge old logs.");
    }
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-bold tracking-tight text-zinc-900">{restaurant.restaurant_name}</h3>
              <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                Observability & Logs
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                {totalCount} total events
              </span>
              {errorCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                  {errorCount} errors
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-500">{restaurant.domain_name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPurgeConfirm(true)}
              disabled={purging}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              title="Delete logs older than 7 days"
            >
              <Trash2 size={14} />
              {purging ? "Purging..." : "Purge >7d"}
            </button>
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">API Calls</div>
          <div className="mt-1 text-xl font-bold text-zinc-900">{apiCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Logged actions</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Audit & State</div>
          <div className="mt-1 text-xl font-bold text-zinc-900">{auditCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Admin operations</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Errors</div>
          <div className={`mt-1 text-xl font-bold ${errorCount > 0 ? "text-rose-600" : "text-zinc-900"}`}>
            {errorCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{errorCount > 0 ? "Needs inspection" : "All clean"}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Avg Latency</div>
          <div className="mt-1 text-xl font-bold text-orange-600">{avgDuration != null ? `${avgDuration}ms` : "—"}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Execution time</div>
        </div>
      </div>

      {/* Live Timeline Activity Histogram */}
      <LogActivityHistogram logs={logs} timeRange={logTimeRange} />

      {/* Filters Bar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_140px_140px_140px_130px]">
          {/* Search */}
          <label className="relative block sm:col-span-2 lg:col-span-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Filter by path, method, message, or source..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-500 focus:bg-white"
            />
          </label>

          {/* Time Range */}
          <select
            value={logTimeRange}
            onChange={(e) => setLogTimeRange(e.target.value as typeof logTimeRange)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-orange-500"
          >
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="all">All Time</option>
          </select>

          {/* Status Category */}
          <select
            value={logStatusCategory}
            onChange={(e) => setLogStatusCategory(e.target.value as typeof logStatusCategory)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="2xx">2xx Success</option>
            <option value="4xx">4xx Client Error</option>
            <option value="5xx">5xx Server Error</option>
          </select>

          {/* Log Type */}
          <select
            value={logType}
            onChange={(e) => setLogType(e.target.value as typeof logType)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-orange-500"
          >
            <option value="all">All Types</option>
            <option value="api">API Logs</option>
            <option value="audit">Audit Logs</option>
            <option value="system">System Logs</option>
          </select>

          {/* Log Level */}
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value as typeof logLevel)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-orange-500"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyWorkspace
          title="No logs match filters"
          body="No logs match the current search or time criteria for this restaurant."
        />
      ) : (
        <>
          {/* Desktop table view */}
          <section className="hidden lg:block rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 whitespace-nowrap">Method</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3 whitespace-nowrap">Source</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3 whitespace-nowrap">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paginatedLogs.map((log) => (
                    <LogTableRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
            <LogPagination page={logPage} totalPages={totalLogPages} totalRecords={logs.length} setPage={setLogPage} />
          </section>

          {/* Mobile card view */}
          <section className="grid gap-3 lg:hidden">
            {paginatedLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
            <LogPagination page={logPage} totalPages={totalLogPages} totalRecords={logs.length} setPage={setLogPage} />
          </section>
        </>
      )}

      {/* Modal: Purge Logs Confirmation */}
      {showPurgeConfirm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Purge Old Logs?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Permanently delete all audit and API logs older than 7 days? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={purging}
                onClick={() => setShowPurgeConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purging}
                onClick={executePurge}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {purging ? "Purging..." : "Purge Logs"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


function RestaurantWorkspace({
  restaurant,
  settings,
  activeTab,
  onTabChange,
  onBack,
  onEdit,
  onToggleState,
  onDelete,
  onAddSetting,
  onUpdateSetting,
  onRemoveSetting,
}: {
  restaurant: RestaurantRecord;
  settings: RestaurantSetting[];
  activeTab: RestaurantPanelTab;
  onTabChange: (value: RestaurantPanelTab) => void;
  onBack: () => void;
  onEdit: () => void;
  onToggleState: () => void;
  onDelete: () => void;
  onAddSetting: (definition: RestaurantSettingDefinition) => void;
  onUpdateSetting: (settingKey: string, settingValue: string) => void;
  onRemoveSetting: (settingKey: string) => void;
}) {
  const settingsMap = useMemo(() => new Map(settings.map((item) => [item.setting_key, item])), [settings]);
  const missingSettings = RESTAURANT_SETTING_DEFINITIONS.filter((definition) => !settingsMap.has(definition.key));

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button onClick={onBack} className="mb-3 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              <ArrowLeft size={16} />
              Back to restaurants
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold tracking-tight">{restaurant.restaurant_name}</h3>
              <StatusBadge status={restaurant.is_active ? "accepted" : "rejected"} />
            </div>
            <p className="mt-1 text-sm text-zinc-500">{restaurant.domain_name}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={onToggleState} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
              <Power size={16} />
              {restaurant.is_active ? "Deactivate" : "Activate"}
            </button>
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-600">
              <Pencil size={15} />
              Edit details
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <TabButton label="Overview" active={activeTab === "overview"} onClick={() => onTabChange("overview")} />
            <TabButton label="Settings" active={activeTab === "settings"} onClick={() => onTabChange("settings")} />
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

              {/* Uploaded Documents & Certificates */}
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
              <div>
                <h4 className="text-sm font-semibold text-zinc-800">Current 21-key settings</h4>
                <p className="mt-1 text-sm text-zinc-500">Only the approved setting keys can be present. Add missing ones or remove existing ones from here.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {RESTAURANT_SETTING_DEFINITIONS.map((definition) => {
                  const currentSetting = settingsMap.get(definition.key);
                  return (
                    <SettingCard
                      key={`${restaurant.id}-${definition.key}-${currentSetting?.setting_value ?? "missing"}`}
                      definition={definition}
                      currentSetting={currentSetting}
                      onAdd={() => onAddSetting(definition)}
                      onUpdate={(value) => onUpdateSetting(definition.key, value)}
                      onRemove={() => onRemoveSetting(definition.key)}
                    />
                  );
                })}
              </div>
              {missingSettings.length > 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  Missing settings: {missingSettings.map((item) => item.label).join(", ")}
                </div>
              ) : null}
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

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}>
      {label}
    </button>
  );
}

function SettingCard({
  definition,
  currentSetting,
  onAdd,
  onUpdate,
  onRemove,
}: {
  definition: RestaurantSettingDefinition;
  currentSetting?: RestaurantSetting;
  onAdd: () => void;
  onUpdate: (value: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(currentSetting?.setting_value ?? defaultSettingValue(definition.type));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-zinc-900">{definition.label}</h4>
          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{definition.key}</p>
        </div>
        {currentSetting ? (
          <button onClick={onRemove} className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">
            Remove
          </button>
        ) : (
          <button onClick={onAdd} className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">
            Add
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {definition.type === "boolean" ? (
          <select
            aria-label={definition.label}
            disabled={!currentSetting}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-orange-500 disabled:bg-zinc-100"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            aria-label={definition.label}
            disabled={!currentSetting}
            type={definition.type === "number" ? "number" : "text"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-orange-500 disabled:bg-zinc-100"
          />
        )}
        {currentSetting ? (
          <button onClick={() => onUpdate(value)} className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
            Save
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyWorkspace({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-500">{body}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const classes = {
    pending: "bg-orange-100 text-orange-700",
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes[status]}`}>{status}</span>;
}

function ApplicationModal({
  record,
  processing,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: {
  record: OnboardingApplication;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const address = record.address ?? {};
  const building = String(address.address_line_1 || address.buildingno || address.street || "");
  const area = String(address.address_line_2 || address.area || address.floor || address.landmark || "");
  const city = String(address.city || address.town || address.village || "");
  const pincode = String(address.pincode || address.postcode || address.postal_code || "");
  const legal = record.legal ?? {};
  const bank = record.bank ?? {};
  const images = record.images ?? {};
  const documents = record.documents ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold">{record.restaurant_name}</h2>
              <StatusBadge status={record.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span>{record.domain_name}</span>
              <span>•</span>
              <span>Submitted: {formatDateTime(record.created_at)}</span>
              {record.reviewed_at && (
                <>
                  <span>•</span>
                  <span className={record.status === "accepted" ? "text-emerald-700 font-medium" : "text-rose-700 font-medium"}>
                    {record.status === "accepted" ? "Accepted: " : "Rejected: "}
                    {formatDateTime(record.reviewed_at)}
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-zinc-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <InfoGroup title="Owner" items={[["Name", record.owner_name], ["Email", record.email], ["Phone", record.phone], ["Primary contact", record.restaurant_primary_contact]]} />
            <InfoGroup title="Address" items={[["Line 1 / Building", building], ["Line 2 / Area", area], ["City", city], ["Pincode", pincode]]} />
            <InfoGroup title="Legal" items={[["PAN", String(legal.pan_number ?? "")], ["FSSAI", String(legal.fssai_number ?? "")], ["GST", String(legal.gst_number ?? "Not registered")], ["Bank", String(bank.account_type ?? "")]]} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TagGroup title="Cuisines" items={record.cuisines} />
            <TagGroup title="Services" items={record.services} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <AssetGroup title="Images" assets={Object.values(images)} />
            <AssetGroup title="Documents" assets={Object.values(documents)} />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-100 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={onDelete}
            disabled={processing}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            <Trash2 size={15} />
            Delete application
          </button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button onClick={onClose} className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              Close
            </button>
            {record.status === "pending" ? (
              <>
                <button onClick={onReject} disabled={processing} className="rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">
                  Reject
                </button>
                <button onClick={onApprove} disabled={processing} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {processing ? "Processing..." : "Accept and create"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.map(([label, value]) => (
          <div key={label}>
            <div className="text-xs font-semibold uppercase text-zinc-500">{label}</div>
            <div className="break-words text-sm font-medium">{value || "N/A"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TagGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-zinc-100 p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
            {item.replace("_", " ")}
          </span>
        ))}
      </div>
    </section>
  );
}

function AssetGroup({ title, assets }: { title: string; assets: Array<{ public_url?: string; original_name?: string; image_type?: string }> }) {
  return (
    <section className="rounded-lg border border-zinc-100 p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {assets.length === 0 ? <p className="text-sm text-zinc-500">No files uploaded.</p> : null}
        {assets.map((asset) => (
          <a key={`${asset.public_url}-${asset.original_name}`} href={asset.public_url} target="_blank" rel="noreferrer" className="rounded-md border border-dashed border-orange-200 p-3 text-sm hover:bg-orange-50">
            <div className="font-semibold capitalize">{asset.image_type}</div>
            <div className="truncate text-xs text-zinc-500">{asset.original_name}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function LogLevelBadge({ level }: { level: AppLogRecord["level"] }) {
  const tone = {
    info: "bg-sky-100 text-sky-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-rose-100 text-rose-700",
  }[level];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}>{level}</span>;
}



function LogTableRow({ log }: { log: AppLogRecord }) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata = Object.keys(log.metadata || {}).length > 0;

  return (
    <>
      <tr
        className={`hover:bg-orange-50/40 cursor-pointer transition ${expanded ? "bg-orange-50/20" : ""}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">{formatDateTime(log.created_at)}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <LogTypeBadge type={log.log_type} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {log.http_method ? (
            <span className="font-mono text-xs font-semibold text-zinc-700">{log.http_method}</span>
          ) : (
            <span className="text-xs text-zinc-400">—</span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <StatusCodeBadge code={log.status_code} status={log.status} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <DurationBadge ms={log.duration_ms} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700">{log.source}</span>
        </td>
        <td className="px-4 py-3 text-zinc-600 max-w-[280px] truncate">{log.message}</td>
        <td className="px-4 py-3 whitespace-nowrap"><LogLevelBadge level={log.level} /></td>
      </tr>
      {expanded && (
        <tr className="bg-zinc-50/80">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid gap-3 md:grid-cols-5">
              <div><span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Path</span><p className="mt-0.5 text-sm font-medium text-zinc-800 break-all">{log.http_path || "—"}</p></div>
              <div><span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Event</span><p className="mt-0.5 text-sm font-medium text-zinc-800">{log.event_type}</p></div>
              <div><span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Entity</span><p className="mt-0.5 text-sm font-medium text-zinc-800">{log.entity_type || "—"} {log.entity_id ? `(${log.entity_id.slice(0, 8)}…)` : ""}</p></div>
              <div><span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Actor</span><p className="mt-0.5 text-sm font-medium text-zinc-800 break-all">{log.actor_id ? `${log.actor_id.slice(0, 8)}…` : "—"}</p></div>
              <div><span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Restaurant</span><p className="mt-0.5 text-sm font-medium text-zinc-800 break-all">{log.restaurant_id ? `${log.restaurant_id.slice(0, 8)}…` : "—"}</p></div>
            </div>
            <p className="mt-3 text-sm text-zinc-700">{log.message}</p>
            {hasMetadata && (
              <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Metadata</span>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-zinc-600">{JSON.stringify(log.metadata, null, 2)}</pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function LogCard({ log }: { log: AppLogRecord }) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata = Object.keys(log.metadata || {}).length > 0;

  return (
    <article
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm cursor-pointer transition hover:border-orange-200"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <LogTypeBadge type={log.log_type} />
          <LogLevelBadge level={log.level} />
          <StatusCodeBadge code={log.status_code} status={log.status} />
        </div>
        <div className="text-[11px] text-zinc-400 whitespace-nowrap">{formatDateTime(log.created_at)}</div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {log.http_method && <span className="font-mono text-[11px] font-bold text-zinc-600">{log.http_method}</span>}
        {log.http_path && <span className="text-[11px] text-zinc-500 truncate">{log.http_path}</span>}
        <DurationBadge ms={log.duration_ms} />
      </div>
      <h4 className="mt-1.5 text-sm font-semibold text-zinc-900">{log.source}</h4>
      <p className={`mt-1 text-xs text-zinc-600 ${expanded ? "" : "line-clamp-2"}`}>{log.message}</p>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="font-semibold text-zinc-400">Event:</span> {log.event_type}</div>
            <div><span className="font-semibold text-zinc-400">Entity:</span> {log.entity_type || "—"}</div>
          </div>
          {hasMetadata && (
            <pre className="rounded-md bg-zinc-50 p-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-zinc-600">{JSON.stringify(log.metadata, null, 2)}</pre>
          )}
        </div>
      )}
    </article>
  );
}

function LogTypeBadge({ type }: { type: AppLogRecord["log_type"] }) {
  const styles = {
    api: "bg-indigo-100 text-indigo-700",
    audit: "bg-violet-100 text-violet-700",
    system: "bg-zinc-100 text-zinc-700",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${styles[type] ?? styles.system}`}>{type}</span>;
}

function StatusCodeBadge({ code, status }: { code: number | null; status: AppLogRecord["status"] }) {
  if (code != null) {
    const color = code < 300 ? "text-emerald-700 bg-emerald-50" : code < 400 ? "text-amber-700 bg-amber-50" : code < 500 ? "text-orange-700 bg-orange-50" : "text-rose-700 bg-rose-50";
    return <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${color}`}>{code}</span>;
  }
  const tone = status === "failed" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}>{status}</span>;
}

function DurationBadge({ ms }: { ms: number | null }) {
  if (ms == null) return null;
  const color = ms < 500 ? "text-emerald-600" : ms < 2000 ? "text-amber-600" : "text-rose-600";
  return <span className={`text-[11px] font-medium ${color}`}>{ms}ms</span>;
}

function LogPagination({
  page,
  totalPages,
  totalRecords,
  setPage,
}: {
  page: number;
  totalPages: number;
  totalRecords: number;
  setPage: (value: number | ((current: number) => number)) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-100 px-4 py-3 text-sm">
      <span className="text-xs font-medium text-zinc-500">
        {totalRecords} total log{totalRecords !== 1 ? "s" : ""}
      </span>
      <span className="text-center text-xs font-medium text-zinc-600">
        Page <strong className="text-zinc-900">{page}</strong> of <strong className="text-zinc-900">{totalPages}</strong>
      </span>
      <div className="flex items-center justify-end gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
        >
          Previous
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}


