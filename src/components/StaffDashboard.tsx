"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Store,
  X,
  XCircle,
} from "lucide-react";
import {
  createRestaurantDirect,
  listRestaurants,
  type RestaurantRecord,
} from "@/src/app/actions/restaurants";
import {
  deleteRestaurantSetting,
  listRestaurantSettings,
  upsertRestaurantSetting,
  type RestaurantSetting,
} from "@/src/app/actions/restaurant-settings";
import type { AppProfile } from "@/src/app/actions/profiles";
import { RESTAURANT_SETTING_DEFINITIONS, type RestaurantSettingDefinition } from "@/src/lib/constants/restaurant-settings";
import { formatAddress } from "@/src/lib/utils/address";

type Props = {
  accessToken: string;
  profile: AppProfile;
  onLogout: () => void;
};

type StaffView = "overview" | "restaurants";
type RestaurantPanelTab = "overview" | "settings";

const PACKAGES = ["marinate-menu", "marinate-dinein", "marinate360", "marinate-foodtruck"];

export default function StaffDashboard({ accessToken, profile, onLogout }: Props) {
  const [activeView, setActiveView] = useState<StaffView>("overview");
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [restaurantPanelTab, setRestaurantPanelTab] = useState<RestaurantPanelTab>("overview");
  const [settings, setSettings] = useState<RestaurantSetting[]>([]);
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    if (!selectedRestaurantId) return;
    loadRestaurantSettings(selectedRestaurantId);
  }, [loadRestaurantSettings, selectedRestaurantId]);

  const stats = useMemo(() => {
    const total = restaurants.length;
    const active = restaurants.filter((r) => r.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [restaurants]);

  const packageDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    restaurants.forEach((restaurant) => {
      counts.set(restaurant.package, (counts.get(restaurant.package) ?? 0) + 1);
    });
    return PACKAGES.map((pkg) => ({ key: pkg, value: counts.get(pkg) ?? 0 }));
  }, [restaurants]);

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) ?? null;

  async function handleAddSetting(definition: RestaurantSettingDefinition) {
    if (!selectedRestaurant) return;
    const result = await upsertRestaurantSetting(
      accessToken,
      selectedRestaurant.id,
      definition.key,
      defaultSettingValue(definition.type)
    );
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSettings((current) =>
      [...current.filter((item) => item.setting_key !== result.data.setting_key), result.data].sort((a, b) =>
        a.setting_key.localeCompare(b.setting_key)
      )
    );
    toast.success(`${definition.label} added`);
  }

  async function handleUpdateSetting(settingKey: string, settingValue: string) {
    if (!selectedRestaurant) return;
    const result = await upsertRestaurantSetting(accessToken, selectedRestaurant.id, settingKey, settingValue);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSettings((current) =>
      [...current.filter((item) => item.setting_key !== result.data.setting_key), result.data].sort((a, b) =>
        a.setting_key.localeCompare(b.setting_key)
      )
    );
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

  function handleLogoutRequest() {
    if (!confirm("Are you sure you want to logout?")) return;
    onLogout();
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <Toaster position="top-right" />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-zinc-100 px-5 py-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">STAFF</span>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Marinate360</p>
              </div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">Staff Portal</h1>
              <p className="mt-1 truncate text-sm text-zinc-500">{profile.email || profile.username || "Staff User"}</p>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
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
            </nav>
            <div className="border-t border-zinc-100 p-4">
              <button
                onClick={handleLogoutRequest}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                <LogOut size={16} />
                Logout
              </button>
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
                    {activeView === "overview" ? "Overview & Operations" : "Restaurant Directory & Settings"}
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

          <div className="px-4 py-6 sm:px-6 xl:px-8">
            {activeView === "overview" && (
              <div className="space-y-6">
                {/* Stats row */}
                <section className="grid gap-4 md:grid-cols-3">
                  <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Total Restaurants</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight">{stats.total}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                        <Store size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-zinc-400">Available across system</p>
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Active</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">{stats.active}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-zinc-400">Live restaurants</p>
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Inactive</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-500">{stats.inactive}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                        <XCircle size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-zinc-400">Disabled or pending</p>
                  </article>
                </section>

                {/* Package Distribution & Quick Actions */}
                <section className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <BarChart3 size={18} className="text-orange-600" />
                      Package distribution
                    </div>
                    <div className="space-y-4">
                      {packageDistribution.map((item) => {
                        const max = Math.max(...packageDistribution.map((d) => d.value), 1);
                        return (
                          <div key={item.key}>
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="font-medium capitalize text-zinc-700">
                                {item.key.replace("marinate-", "")}
                              </span>
                              <span className="text-zinc-500">{item.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100">
                              <div
                                className="h-2 rounded-full bg-orange-500"
                                style={{ width: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                        <Building2 size={18} className="text-sky-600" />
                        Quick Directory
                      </div>
                      <button
                        onClick={() => setActiveView("restaurants")}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                      >
                        View all ({restaurants.length}) &rarr;
                      </button>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {restaurants.slice(0, 5).map((r) => (
                        <div key={r.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-semibold text-zinc-900">{r.restaurant_name}</p>
                            <p className="text-xs text-zinc-500">{r.domain_name}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedRestaurantId(r.id);
                              setActiveView("restaurants");
                              setRestaurantPanelTab("settings");
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            <Sliders size={13} />
                            Settings
                          </button>
                        </div>
                      ))}
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
                  onAddSetting={handleAddSetting}
                  onUpdateSetting={handleUpdateSetting}
                  onRemoveSetting={handleRemoveSetting}
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
                          Browse restaurants, inspect configurations, and manage 21-key restaurant settings.
                        </p>
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

                  {filterRestaurants(restaurants, restaurantSearch).length === 0 ? (
                    <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
                      <Store size={36} className="mx-auto text-zinc-300" />
                      <h3 className="mt-3 text-lg font-semibold text-zinc-900">No restaurants found</h3>
                      <p className="mt-1 text-sm text-zinc-500">Try a different search query or create a new restaurant.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {filterRestaurants(restaurants, restaurantSearch).map((restaurant) => (
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
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                restaurant.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {restaurant.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                              {restaurant.package.replace("marinate-", "")}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedRestaurantId(restaurant.id);
                                setRestaurantPanelTab("overview");
                              }}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
                            >
                              Workspace & Settings
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            )}
          </div>
        </section>
      </div>

      {showCreate && (
        <StaffDirectRestaurantModal
          accessToken={accessToken}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await fetchRestaurants();
          }}
        />
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

function StaffRestaurantWorkspace({
  restaurant,
  settings,
  activeTab,
  onTabChange,
  onBack,
  onAddSetting,
  onUpdateSetting,
  onRemoveSetting,
}: {
  restaurant: RestaurantRecord;
  settings: RestaurantSetting[];
  activeTab: RestaurantPanelTab;
  onTabChange: (value: RestaurantPanelTab) => void;
  onBack: () => void;
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
              21-Key Settings ({settings.length})
            </button>
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
                <InfoCard label="Address" value={formatAddress(restaurant.address) || "N/A"} className="md:col-span-2" />
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
                <h4 className="text-sm font-semibold text-zinc-800">21-Key Restaurant Configurations</h4>
                <p className="mt-1 text-sm text-zinc-500">
                  Staff can configure the 21 system settings for this restaurant.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {RESTAURANT_SETTING_DEFINITIONS.map((definition) => {
                  const currentSetting = settingsMap.get(definition.key);
                  return (
                    <StaffSettingCard
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
              {missingSettings.length > 0 && (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  Missing settings: {missingSettings.map((item) => item.label).join(", ")}
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

function StaffSettingCard({
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
          <button
            onClick={onRemove}
            className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={onAdd}
            className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100"
          >
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
        {currentSetting && (
          <button
            onClick={() => onUpdate(value)}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}

function StaffDirectRestaurantModal({
  accessToken,
  onClose,
  onCreated,
}: {
  accessToken: string;
  onClose: () => void;
  onCreated: () => void;
}) {
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
      domain_url:
        form.domain_url || form.domain_name || form.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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

    toast.success("Restaurant created successfully");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">Create New Restaurant</h2>
            <p className="mt-1 text-sm text-zinc-500">Register a new restaurant from the staff portal.</p>
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
              <div
                key={label}
                className={`rounded-lg border px-4 py-3 ${
                  step === idx + 1 ? "border-orange-300 bg-orange-50" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{index}</div>
                <div className="mt-1 font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {step === 1 && (
            <>
              <StaffField
                label="Restaurant name"
                value={form.restaurant_name}
                onChange={(val) => setForm((c) => ({ ...c, restaurant_name: val }))}
              />
              <StaffField
                label="Domain name"
                value={form.domain_name}
                onChange={(val) => setForm((c) => ({ ...c, domain_name: val }))}
              />
              <StaffField
                label="Domain URL"
                value={form.domain_url}
                onChange={(val) => setForm((c) => ({ ...c, domain_url: val }))}
              />
              <StaffField
                label="Email"
                value={form.email}
                onChange={(val) => setForm((c) => ({ ...c, email: val }))}
              />
              <StaffField
                label="Contact"
                value={form.contact}
                onChange={(val) => setForm((c) => ({ ...c, contact: val }))}
              />
              <StaffField
                label="POS domain"
                value={form.pos_domain}
                onChange={(val) => setForm((c) => ({ ...c, pos_domain: val }))}
              />
              <StaffField
                label="Description"
                value={form.description}
                onChange={(val) => setForm((c) => ({ ...c, description: val }))}
                className="sm:col-span-2"
              />
              <StaffField
                label="About"
                value={form.about}
                onChange={(val) => setForm((c) => ({ ...c, about: val }))}
                className="sm:col-span-2"
              />
            </>
          )}

          {step === 2 && (
            <>
              <StaffField
                label="Address"
                value={form.address}
                onChange={(val) => setForm((c) => ({ ...c, address: val }))}
                className="sm:col-span-2"
              />
              <StaffField
                label="Cuisines (comma separated)"
                value={form.cuisines}
                onChange={(val) => setForm((c) => ({ ...c, cuisines: val }))}
              />
              <StaffField
                label="Services (comma separated)"
                value={form.services}
                onChange={(val) => setForm((c) => ({ ...c, services: val }))}
              />
              <StaffField
                label="Time zone"
                value={form.time_zone}
                onChange={(val) => setForm((c) => ({ ...c, time_zone: val }))}
              />
              <label>
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Package</span>
                <select
                  value={form.package}
                  onChange={(e) => setForm((c) => ({ ...c, package: e.target.value }))}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-orange-500"
                >
                  {PACKAGES.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <StaffField
                label="GST number"
                value={form.gst_number}
                onChange={(val) => setForm((c) => ({ ...c, gst_number: val }))}
              />
              <StaffField
                label="FSSAI number"
                value={form.fssai_number}
                onChange={(val) => setForm((c) => ({ ...c, fssai_number: val }))}
              />
              <div className="sm:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <h3 className="font-semibold text-zinc-900">Summary</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <InfoCard label="Restaurant" value={form.restaurant_name || "N/A"} />
                  <InfoCard label="Domain" value={form.domain_name || "N/A"} />
                  <InfoCard label="Package" value={form.package || "N/A"} />
                  <InfoCard label="Time zone" value={form.time_zone || "N/A"} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-zinc-50 p-4">
          <button onClick={onClose} className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-semibold">
            Cancel
          </button>
          {step > 1 && (
            <button
              onClick={() => setStep((current) => current - 1)}
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-semibold"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((current) => current + 1)}
              className="rounded-md bg-zinc-900 px-4 py-2 font-semibold text-white"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-md bg-orange-500 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create restaurant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-sm font-semibold text-zinc-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-orange-500"
      />
    </label>
  );
}
