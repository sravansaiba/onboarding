

"use client";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  LogOut,
  Plus,
  Power,
  RefreshCw,
  Search,
  Store,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  listOnboardingApplications,
  type ApplicationStatus,
  type OnboardingApplication,
} from "@/src/app/actions/onboarding-applications";
import {
  approveOnboardingApplication,
  createRestaurantDirect,
  deleteRestaurantRecord,
  listRestaurants,
  rejectOnboardingApplication,
  setRestaurantActiveState,
  type RestaurantRecord,
  updateRestaurantRecord,
} from "@/src/app/actions/restaurants";
import {
  deleteRestaurantSetting,
  listRestaurantSettings,
  upsertRestaurantSetting,
  type RestaurantSetting,
} from "@/src/app/actions/restaurant-settings";
import { listAppLogs, type AppLogRecord, type LogType } from "@/src/app/actions/app-logs";
import type { AppProfile } from "@/src/app/actions/profiles";
import { supabase } from "@/src/lib/supabase/client";
import { RESTAURANT_SETTING_DEFINITIONS, type RestaurantSettingDefinition } from "@/src/lib/constants/restaurant-settings";

type Props = {
  accessToken: string;
  profile: AppProfile;
  onLogout: () => void;
};

type AdminView = "overview" | "applications" | "restaurants" | "logs";
type RestaurantPanelTab = "overview" | "settings";

const STATUS_TABS: Array<ApplicationStatus | "all"> = ["all", "pending", "accepted", "rejected"];
const PACKAGES = ["marinate-menu", "marinate-dinein", "marinate360", "marinate-foodtruck"];

export default function AdminDashboard({ accessToken, profile, onLogout }: Props) {
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [records, setRecords] = useState<OnboardingApplication[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OnboardingApplication | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedLogRestaurantId, setSelectedLogRestaurantId] = useState("");
  const [restaurantPanelTab, setRestaurantPanelTab] = useState<RestaurantPanelTab>("overview");
  const [settings, setSettings] = useState<RestaurantSetting[]>([]);
  const [appLogs, setAppLogs] = useState<AppLogRecord[]>([]);
  const [logTotalCount, setLogTotalCount] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logType, setLogType] = useState<LogType | "all">("all");
  const [status, setStatus] = useState<ApplicationStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logLevel, setLogLevel] = useState<"all" | "info" | "warning" | "error">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    const [applicationsResult, restaurantsResult] = await Promise.all([
      listOnboardingApplications({ accessToken, page, pageSize: 10, status, query: debouncedSearch }),
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
  }, [accessToken, debouncedSearch, page, status]);

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

  const loadLogs = useCallback(
    async (restaurantId?: string) => {
      const result = await listAppLogs({
        accessToken,
        restaurantId,
        level: logLevel,
        logType: logType,
        query: logSearch,
        limit: 250,
      });

      if (result.ok) {
        setAppLogs(result.data.records);
        setLogTotalCount(result.data.totalCount);
        setLogPage(1);
      } else {
        toast.error(result.error);
      }
    },
    [accessToken, logLevel, logType, logSearch]
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
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadRestaurantSettings(selectedRestaurantId);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadRestaurantSettings, selectedRestaurantId]);

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
    return {
      pending,
      accepted,
      rejected,
      restaurants: restaurants.length,
      total: pending + accepted + rejected,
    };
  }, [records, restaurants]);

  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null;
  const selectedLogRestaurant = restaurants.find((restaurant) => restaurant.id === selectedLogRestaurantId) ?? null;

  const packageDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    restaurants.forEach((restaurant) => {
      counts.set(restaurant.package, (counts.get(restaurant.package) ?? 0) + 1);
    });
    return PACKAGES.map((pkg) => ({ key: pkg, value: counts.get(pkg) ?? 0 }));
  }, [restaurants]);

  async function handleApprove(record: OnboardingApplication) {
    if (!confirm(`Accept ${record.restaurant_name} and create the restaurant?`)) return;
    setProcessingId(record.id);
    const result = await approveOnboardingApplication(accessToken, record.id);
    setProcessingId("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Restaurant accepted, created, and owner promoted to admin");
    setSelectedRecord(null);
    setActiveView("restaurants");
    await refreshDashboard();
    setSelectedRestaurantId(result.data.restaurantId);
  }

  async function handleReject(record: OnboardingApplication) {
    const notes = window.prompt("Reason for rejection", "Documents need review.");
    if (notes === null) return;

    setProcessingId(record.id);
    const result = await rejectOnboardingApplication(accessToken, record.id, notes);
    setProcessingId("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Application rejected");
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
    await refreshDashboard();
  }

  async function handleDeleteRestaurant() {
    if (!selectedRestaurant) return;
    if (!confirm(`Delete ${selectedRestaurant.restaurant_name}? This removes the restaurant and related settings.`)) return;
    const result = await deleteRestaurantRecord(accessToken, selectedRestaurant.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Restaurant deleted");
    setSelectedRestaurantId("");
    await refreshDashboard();
  }

  function handleLogoutRequest() {
    if (!confirm("Are you sure you want to logout?")) return;
    onLogout();
  }

  async function handleRestaurantSave(values: RestaurantEditorValues) {
    if (!selectedRestaurant) return;
    const result = await updateRestaurantRecord(accessToken, selectedRestaurant.id, values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Restaurant details updated");
    await refreshDashboard();
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
            <div className="border-b border-zinc-100 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Marinate360</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">Super Admin</h1>
              <p className="mt-1 text-sm text-zinc-500">{profile.email}</p>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              <SidebarButton icon={<LayoutDashboard size={18} />} label="Overview" active={activeView === "overview"} onClick={() => setActiveView("overview")} />
              <SidebarButton icon={<ClipboardList size={18} />} label="Applications" active={activeView === "applications"} onClick={() => setActiveView("applications")} badge={stats.pending} />
              <SidebarButton icon={<Store size={18} />} label="Restaurants" active={activeView === "restaurants"} onClick={() => setActiveView("restaurants")} />
              <SidebarButton icon={<FileClock size={18} />} label="Logs" active={activeView === "logs"} onClick={() => setActiveView("logs")} />
            </nav>
            <div className="border-t border-zinc-100 p-4">
              {/* <button onClick={() => void refreshDashboard()} className="mb-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
                <RefreshCw size={16} />
                Refresh
              </button> */}
              <button onClick={handleLogoutRequest} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/92 backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 xl:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Control panel</p>
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
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto lg:hidden">
                <MobileTab label="Overview" active={activeView === "overview"} onClick={() => setActiveView("overview")} />
                <MobileTab label="Applications" active={activeView === "applications"} onClick={() => setActiveView("applications")} />
                <MobileTab label="Restaurants" active={activeView === "restaurants"} onClick={() => setActiveView("restaurants")} />
                <MobileTab label="Logs" active={activeView === "logs"} onClick={() => setActiveView("logs")} />
              </div>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6 xl:px-8">
            {activeView === "overview" && (
              <div className="space-y-6">
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Pending review" value={stats.pending} sub="Awaiting decision" icon={<Bell size={18} />} tone="orange" />
                  <StatCard label="Accepted" value={stats.accepted} sub="Created restaurants" icon={<CheckCircle2 size={18} />} tone="green" />
                  <StatCard label="Rejected" value={stats.rejected} sub="Need follow-up" icon={<XCircle size={18} />} tone="red" />
                  <StatCard label="Restaurants" value={stats.restaurants} sub="In production data" icon={<Store size={18} />} tone="zinc" />
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
                  search={search}
                  setSearch={setSearch}
                  status={status}
                  setStatus={setStatus}
                  page={page}
                  setPage={setPage}
                  totalPages={totalPages}
                />
              </div>
            )}

            {activeView === "applications" && (
              <ApplicationsTable
                records={records}
                loading={loading}
                onReview={setSelectedRecord}
                search={search}
                setSearch={setSearch}
                status={status}
                setStatus={setStatus}
                page={page}
                setPage={setPage}
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
                  onSaveDetails={handleRestaurantSave}
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
                />
              )
            )}

            {activeView === "logs" && (
              selectedLogRestaurant ? (
                <RestaurantLogsWorkspace
                  restaurant={selectedLogRestaurant}
                  logs={appLogs}
                  totalCount={logTotalCount}
                  logSearch={logSearch}
                  setLogSearch={setLogSearch}
                  logLevel={logLevel}
                  setLogLevel={setLogLevel}
                  logType={logType}
                  setLogType={setLogType}
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
        />
      )}

      {showCreate && (
        <DirectRestaurantModal
          accessToken={accessToken}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await refreshDashboard();
          }}
        />
      )}
    </main>
  );
}

function viewTitle(view: AdminView) {
  return {
    overview: "Analytics overview",
    applications: "Application reviews",
    restaurants: "Restaurant workspace",
    logs: "Restaurant logs",
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

function StatCard({ label, value, sub, icon, tone }: { label: string; value: number; sub: string; icon: React.ReactNode; tone: "orange" | "green" | "red" | "zinc" }) {
  const toneStyles = {
    orange: "bg-orange-100 text-orange-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    zinc: "bg-zinc-100 text-zinc-700",
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
  search,
  setSearch,
  status,
  setStatus,
  page,
  setPage,
  totalPages,
  compact = false,
}: {
  records: OnboardingApplication[];
  loading: boolean;
  onReview: (record: OnboardingApplication) => void;
  search: string;
  setSearch: (value: string) => void;
  status: ApplicationStatus | "all";
  setStatus: (value: ApplicationStatus | "all") => void;
  page: number;
  setPage: (value: number | ((current: number) => number)) => void;
  totalPages: number;
  compact?: boolean;
}) {
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
        <div className="mt-4 flex gap-2 overflow-x-auto">
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  Loading applications...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  No applications found.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zinc-950">{record.restaurant_name}</div>
                    <div className="text-xs text-zinc-500">{record.domain_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{record.owner_name}</div>
                    <div className="text-xs text-zinc-500">{record.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{record.package}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onReview(record)} className="font-semibold text-orange-600 hover:text-orange-700">
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!compact && (
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-md border border-zinc-200 px-3 py-2 font-semibold disabled:opacity-40">
            Previous
          </button>
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-md border border-zinc-200 px-3 py-2 font-semibold disabled:opacity-40">
            Next
          </button>
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
}: {
  restaurants: RestaurantRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  onSelect: (value: string) => void;
}) {
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
          <label className="relative block w-full max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search restaurant or domain"
              className="w-full rounded-md border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
            />
          </label>
        </div>
      </div>

      {restaurants.length === 0 ? (
        <EmptyWorkspace title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              onClick={() => onSelect(restaurant.id)}
              className="group rounded-lg border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xl font-semibold tracking-tight">{restaurant.restaurant_name}</div>
                  <div className="mt-1 truncate text-sm text-zinc-500">{restaurant.domain_name}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${restaurant.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                  {restaurant.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
                Open workspace
                <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
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

function RestaurantLogsWorkspace({
  restaurant,
  logs,
  totalCount,
  logSearch,
  setLogSearch,
  logLevel,
  setLogLevel,
  logType,
  setLogType,
  logPage,
  setLogPage,
  onBack,
  onRefresh,
}: {
  restaurant: RestaurantRecord;
  logs: AppLogRecord[];
  totalCount: number;
  logSearch: string;
  setLogSearch: (value: string) => void;
  logLevel: "all" | "info" | "warning" | "error";
  setLogLevel: (value: "all" | "info" | "warning" | "error") => void;
  logType: LogType | "all";
  setLogType: (value: LogType | "all") => void;
  logPage: number;
  setLogPage: (value: number | ((current: number) => number)) => void;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const totalLogPages = Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE));
  const paginatedLogs = logs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);

  // Quick stats from loaded data
  const errorCount = logs.filter((l) => l.level === "error").length;
  const apiCount = logs.filter((l) => l.log_type === "api").length;
  const auditCount = logs.filter((l) => l.log_type === "audit").length;

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold tracking-tight">{restaurant.restaurant_name}</h3>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">Logs</span>
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">{totalCount} total</span>
              {errorCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">{errorCount} errors</span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-500">{restaurant.domain_name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
              <RefreshCw size={16} />
              Refresh
            </button>
            <button onClick={onBack} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">API Logs</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">{apiCount}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Audit Logs</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">{auditCount}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Errors</div>
          <div className={`mt-1 text-lg font-semibold ${errorCount > 0 ? "text-rose-600" : "text-zinc-900"}`}>{errorCount}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Showing</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">{logs.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px]">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={logSearch}
              onChange={(event) => setLogSearch(event.target.value)}
              placeholder="Search action, source, or message"
              className="w-full rounded-md border border-zinc-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
            />
          </label>
          <select defaultValue="all" value={logLevel} onChange={(event) => setLogLevel(event.target.value as typeof logLevel)} className="rounded-md border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500">
            <option value="all">All levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <select defaultValue="all" value={logType} onChange={(event) => setLogType(event.target.value as typeof logType)} className="rounded-md border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500">
            <option value="all">All types</option>
            <option value="api">API logs</option>
            <option value="audit">Audit logs</option>
            <option value="system">System logs</option>
          </select>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyWorkspace title="No logs found" body="This restaurant does not have matching API or admin action logs yet." />
      ) : (
        <>
          {/* Desktop table view */}
          <section className="hidden lg:block rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
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
    </section>
  );
}


function RestaurantWorkspace({
  restaurant,
  settings,
  activeTab,
  onTabChange,
  onBack,
  onSaveDetails,
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
  onSaveDetails: (values: RestaurantEditorValues) => void;
  onToggleState: () => void;
  onDelete: () => void;
  onAddSetting: (definition: RestaurantSettingDefinition) => void;
  onUpdateSetting: (settingKey: string, settingValue: string) => void;
  onRemoveSetting: (settingKey: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RestaurantEditorValues>({
    restaurant_name: restaurant.restaurant_name,
    domain_name: restaurant.domain_name,
    domain_url: restaurant.domain_url ?? restaurant.domain_name,
    email: restaurant.email ?? "",
    contact: restaurant.contact ? String(restaurant.contact) : "",
    address: restaurant.address,
    package: restaurant.package,
    description: restaurant.description ?? "",
    about: restaurant.about ?? "",
    gst_number: restaurant.gst_number ?? "",
    fssai_number: restaurant.fssai_number ?? "",
    pos_domain: restaurant.pos_domain ?? "",
    time_zone: restaurant.time_zone ?? "Asia/Kolkata",
  });

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
            <button onClick={() => setEditing((value) => !value)} className="rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600">
              {editing ? "Close edit" : "Edit details"}
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <Panel title="Restaurant details" icon={<Store size={18} />}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Restaurant name" value={form.restaurant_name} onChange={(value) => setForm((current) => ({ ...current, restaurant_name: value }))} />
            <Field label="Domain name" value={form.domain_name} onChange={(value) => setForm((current) => ({ ...current, domain_name: value }))} />
            <Field label="Domain URL" value={form.domain_url ?? ""} onChange={(value) => setForm((current) => ({ ...current, domain_url: value }))} />
            <Field label="Email" value={form.email ?? ""} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <Field label="Contact" value={form.contact ?? ""} onChange={(value) => setForm((current) => ({ ...current, contact: value }))} />
            <Field label="POS domain" value={form.pos_domain ?? ""} onChange={(value) => setForm((current) => ({ ...current, pos_domain: value }))} />
            <Field label="Address" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} className="md:col-span-2" />
            <Field label="Description" value={form.description ?? ""} onChange={(value) => setForm((current) => ({ ...current, description: value }))} className="md:col-span-2" />
            <Field label="About" value={form.about ?? ""} onChange={(value) => setForm((current) => ({ ...current, about: value }))} className="md:col-span-2" />
            <Field label="GST number" value={form.gst_number ?? ""} onChange={(value) => setForm((current) => ({ ...current, gst_number: value }))} />
            <Field label="FSSAI number" value={form.fssai_number ?? ""} onChange={(value) => setForm((current) => ({ ...current, fssai_number: value }))} />
            <Field label="Time zone" value={form.time_zone ?? ""} onChange={(value) => setForm((current) => ({ ...current, time_zone: value }))} />
            <label>
              <span className="mb-1 block text-sm font-semibold text-zinc-700">Package</span>
              <select value={form.package} onChange={(event) => setForm((current) => ({ ...current, package: event.target.value }))} className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-orange-500">
                {PACKAGES.map((pkg) => (
                  <option key={pkg} value={pkg}>
                    {pkg}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => onSaveDetails(form)} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
              Save restaurant
            </button>
          </div>
        </Panel>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <TabButton label="Overview" active={activeTab === "overview"} onClick={() => onTabChange("overview")} />
            <TabButton label="Settings" active={activeTab === "settings"} onClick={() => onTabChange("settings")} />
          </div>
        </div>
        <div className="p-4">
          {activeTab === "overview" ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard label="Domain" value={restaurant.domain_name} />
                <InfoCard label="Domain URL" value={restaurant.domain_url || "N/A"} />
                <InfoCard label="Package" value={restaurant.package} />
                <InfoCard label="Email" value={restaurant.email || "N/A"} />
                <InfoCard label="Contact" value={restaurant.contact ? String(restaurant.contact) : "N/A"} />
                <InfoCard label="Address" value={restaurant.address} className="md:col-span-2" />
                <InfoCard label="Description" value={restaurant.description || "N/A"} className="md:col-span-2" />
                <InfoCard label="About" value={restaurant.about || "N/A"} className="md:col-span-2" />
                <InfoCard label="GST" value={restaurant.gst_number || "N/A"} />
                <InfoCard label="FSSAI" value={restaurant.fssai_number || "N/A"} />
              </div>

              <div className="space-y-3">
                <InfoCard label="Services" value={restaurant.services.join(", ") || "N/A"} />
                <InfoCard label="Cuisines" value={(restaurant.cuisines || []).join(", ") || "N/A"} />
                <InfoCard label="POS domain" value={restaurant.pos_domain || "N/A"} />
                <InfoCard label="Time zone" value={restaurant.time_zone || "N/A"} />
                <InfoCard label="Created" value={formatDateTime(restaurant.created_at)} />
                <InfoCard label="Updated" value={formatDateTime(restaurant.updated_at)} />
              </div>
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

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-sm font-semibold text-zinc-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-orange-500" />
    </label>
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
}: {
  record: OnboardingApplication;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const address = record.address ?? {};
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
            <p className="mt-1 text-sm text-zinc-500">{record.domain_name}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-zinc-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <InfoGroup title="Owner" items={[["Name", record.owner_name], ["Email", record.email], ["Phone", record.phone], ["Primary contact", record.restaurant_primary_contact]]} />
            <InfoGroup title="Address" items={[["Building", String(address.buildingno ?? "")], ["Area", String(address.area ?? "")], ["City", String(address.city ?? "")], ["Pincode", String(address.pincode ?? "")]]} />
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

        <div className="flex flex-col gap-2 border-t border-zinc-100 bg-zinc-50 p-4 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-semibold">
            Close
          </button>
          {record.status === "pending" ? (
            <>
              <button onClick={onReject} disabled={processing} className="rounded-md bg-rose-500 px-4 py-2 font-semibold text-white disabled:opacity-60">
                Reject
              </button>
              <button onClick={onApprove} disabled={processing} className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
                {processing ? "Processing..." : "Accept and create"}
              </button>
            </>
          ) : null}
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
    <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm">
      <span className="text-zinc-500">
        {totalRecords} log{totalRecords !== 1 ? "s" : ""} · Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          className="rounded-md border border-zinc-200 px-3 py-1.5 font-semibold disabled:opacity-40 hover:bg-zinc-50"
        >
          Previous
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          className="rounded-md border border-zinc-200 px-3 py-1.5 font-semibold disabled:opacity-40 hover:bg-zinc-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function DirectRestaurantModal({ accessToken, onClose, onCreated }: { accessToken: string; onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    restaurant_name: "",
    domain_name: "",
    domain_url: "",
    email: "",
    contact: "",
    address: "",
    description: "",
    about: "",
    package: "marinate-menu",
    cuisines: "Indian",
    services: "dine_in,takeaway",
    gst_number: "",
    fssai_number: "",
    pos_domain: "",
    time_zone: "Asia/Kolkata",
  });
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    const result = await createRestaurantDirect(accessToken, {
      restaurant_name: form.restaurant_name,
      domain_name: form.domain_name || form.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      domain_url: form.domain_url || form.domain_name || form.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      email: form.email,
      contact: form.contact,
      address: form.address,
      package: form.package,
      cuisines: form.cuisines.split(",").map((item) => item.trim()).filter(Boolean),
      services: form.services.split(",").map((item) => item.trim()).filter(Boolean),
      description: form.description,
      about: form.about,
      gst_number: form.gst_number,
      fssai_number: form.fssai_number,
      pos_domain: form.pos_domain,
      time_zone: form.time_zone,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Restaurant created");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">Create restaurant directly</h2>
            <p className="mt-1 text-sm text-zinc-500">Use the same clean onboarding-style flow, but from the admin console.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-zinc-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["01", "Business"],
              ["02", "Operations"],
              ["03", "Compliance"],
            ].map(([index, label], idx) => (
              <div key={label} className={`rounded-lg border px-4 py-3 ${step === idx + 1 ? "border-orange-300 bg-orange-50" : "border-zinc-200 bg-zinc-50"}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{index}</div>
                <div className="mt-1 font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {step === 1 ? (
            <>
              <Field label="Restaurant name" value={form.restaurant_name} onChange={(value) => setForm((current) => ({ ...current, restaurant_name: value }))} />
              <Field label="Domain name" value={form.domain_name} onChange={(value) => setForm((current) => ({ ...current, domain_name: value }))} />
              <Field label="Domain URL" value={form.domain_url} onChange={(value) => setForm((current) => ({ ...current, domain_url: value }))} />
              <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
              <Field label="Contact" value={form.contact} onChange={(value) => setForm((current) => ({ ...current, contact: value }))} />
              <Field label="POS domain" value={form.pos_domain} onChange={(value) => setForm((current) => ({ ...current, pos_domain: value }))} />
              <Field label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} className="sm:col-span-2" />
              <Field label="About" value={form.about} onChange={(value) => setForm((current) => ({ ...current, about: value }))} className="sm:col-span-2" />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Address" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} className="sm:col-span-2" />
              <Field label="Cuisines comma separated" value={form.cuisines} onChange={(value) => setForm((current) => ({ ...current, cuisines: value }))} />
              <Field label="Services comma separated" value={form.services} onChange={(value) => setForm((current) => ({ ...current, services: value }))} />
              <Field label="Time zone" value={form.time_zone} onChange={(value) => setForm((current) => ({ ...current, time_zone: value }))} />
              <label>
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Package</span>
                <select value={form.package} onChange={(event) => setForm((current) => ({ ...current, package: event.target.value }))} className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-orange-500">
                  {PACKAGES.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field label="GST number" value={form.gst_number} onChange={(value) => setForm((current) => ({ ...current, gst_number: value }))} />
              <Field label="FSSAI number" value={form.fssai_number} onChange={(value) => setForm((current) => ({ ...current, fssai_number: value }))} />
              <div className="sm:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <h3 className="font-semibold">Quick summary</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <InfoCard label="Restaurant" value={form.restaurant_name || "N/A"} />
                  <InfoCard label="Domain" value={form.domain_name || "N/A"} />
                  <InfoCard label="Package" value={form.package || "N/A"} />
                  <InfoCard label="Time zone" value={form.time_zone || "N/A"} />
                </div>
              </div>
            </>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t bg-zinc-50 p-4">
          <button onClick={onClose} className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-semibold">
            Cancel
          </button>
          {step > 1 ? (
            <button onClick={() => setStep((current) => current - 1)} className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-semibold">
              Back
            </button>
          ) : null}
          {step < 3 ? (
            <button onClick={() => setStep((current) => current + 1)} className="rounded-md bg-zinc-900 px-4 py-2 font-semibold text-white">
              Continue
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving} className="rounded-md bg-orange-500 px-4 py-2 font-semibold text-white disabled:opacity-60">
              {saving ? "Creating..." : "Create restaurant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
