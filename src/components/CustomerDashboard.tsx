"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  useRouter } from "next/navigation";
import {
  Building2,
  Store,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Plus,
  ArrowLeft,
  Globe,
  Terminal,
  MapPin,
  Phone,
  Mail,
  FileCheck,
  Lock,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  X,
  Layers,
  Search,
  LogOut,
  Utensils,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Sun,
  Moon,
  Sparkles,
  User,
  KeyRound,
  ArrowRight,
  Pencil
} from "lucide-react";
import {
  getMyOnboardingApplications,
  updateMyOnboardingApplicationWithFormData,
  type OnboardingApplication,
} from "@/src/app/actions/onboarding-applications";
import {
  getMyRestaurants,
  updateRestaurantWithFormData,
  type RestaurantRecord,
} from "@/src/app/actions/restaurants";
import { clearAuthSession } from "@/src/lib/auth-storage";
import AccountSettingsView from "@/src/components/admin/AccountSettingsView";
import type { AppProfile } from "@/src/app/actions/profiles";

const PACKAGES = {
  "marinate-menu": {
    label: "Marinate Menu",
    badge: "Digital QR Menu",
    services: ["dine_in", "takeaway"],
    summary: "A clean QR menu and takeaway-ready setup for restaurants that want to go digital fast.",
    points: ["Unlimited QR code menu", "Easy menu management", "Customer self-service menu"],
  },
  "marinate-dinein": {
    label: "Marinate Dine",
    badge: "Table Operations",
    services: ["dine_in", "takeaway"],
    summary: "Table operations, KOT flow, waiter workflow, and dine-in focused ordering.",
    points: ["Table management", "Kitchen order tickets", "Shared order access"],
  },
  marinate360: {
    label: "Marinate 360",
    badge: "Full Suite",
    services: ["dine_in", "delivery", "takeaway", "catering"],
    summary: "The complete operating package for dine-in, delivery, takeaway, and catering.",
    points: ["Delivery and takeaway management", "Reservations and catering", "Analytics and reports"],
  },
  "marinate-foodtruck": {
    label: "Marinate Foodtruck",
    badge: "Fast Counter",
    services: ["dine_in", "takeaway"],
    summary: "Built for food trucks and fast counter setups with instant QR menus and quick takeaway flow.",
    points: ["Quick counter & takeaway ordering", "Mobile QR menu & digital payments", "Fast kitchen tickets & simple workflow"],
  },
} as const;

const STANDARD_CUISINES = [
  "North Indian",
  "South Indian",
  "Chinese",
  "Italian",
  "Mexican",
  "Thai",
  "Continental",
  "Fast Food",
  "Biryani",
  "Pizza",
  "Desserts",
  "Cafe",
  "Street Food",
  "Seafood",
  "BBQ",
];

type UnifiedOutlet = {
  id: string;
  name: string;
  domainName: string;
  domainUrl: string;
  posDomain: string;
  isLive: boolean;
  status: "active" | "pending" | "rejected";
  statusLabel: string;
  applicationId?: string;
  restaurantId?: string;
  package: string;
  services: string[];
  cuisines: string[];
  phone: string;
  email: string;
  address: {
    buildingno?: string;
    floor?: string;
    area?: string;
    city?: string;
    pincode?: string;
    landmark?: string;
    registered_business_address?: string;
  };
  legal: {
    pan_number?: string;
    fullnameaspan?: string;
    gst?: boolean;
    gst_number?: string;
    fssai_number?: string;
    fssai_expiry?: string;
  };
  bank: {
    bank_accno?: string;
    ifsc_code?: string;
    account_type?: string;
  };
  timings?: {
    hours?: Record<string, Array<{ open_time: string; close_time: string }>>;
  };
  images: Record<string, { public_url?: string; original_name?: string }>;
  documents: Record<string, { public_url?: string; original_name?: string }>;
  rawApplication?: OnboardingApplication;
  rawRestaurant?: RestaurantRecord;
};

export default function CustomerDashboard({
  accessToken,
  profile,
  onLogout,
  initialUser,
}: {
  accessToken: string;
  profile?: any;
  onLogout?: () => Promise<void>;
  initialUser?: { id: string; email?: string | null; role?: string };
}) {
  const router = useRouter();
  const [appTheme, setAppTheme] = useState<"light" | "dark">("light");
  const [customerView, setCustomerView] = useState<"outlets" | "settings">("outlets");
  const [currentProfile, setCurrentProfile] = useState<AppProfile>(profile);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [outletSearch, setOutletSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [applications, setApplications] = useState<OnboardingApplication[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "operations" | "compliance" | "location">("overview");
  const [showOutletSwitcher, setShowOutletSwitcher] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [isEditingPending, setIsEditingPending] = useState(false);
  const [isEditingLive, setIsEditingLive] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem("marinate_portal_theme");
    if (saved === "dark" || saved === "light") {
      setAppTheme(saved);
    }
  }, []);

  const toggleAppTheme = () => {
    const next = appTheme === "light" ? "dark" : "light";
    setAppTheme(next);
    localStorage.setItem("marinate_portal_theme", next);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appRes, restRes] = await Promise.all([
        getMyOnboardingApplications(accessToken),
        getMyRestaurants(accessToken),
      ]);

      if (appRes.ok && appRes.data) {
        setApplications(appRes.data);
      }
      if (restRes.ok && restRes.data) {
        setRestaurants(restRes.data);
      }
    } catch (err) {
      console.error("Failed to load customer outlets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [accessToken]);

  // Aggregate Unified Outlets
  const outlets = useMemo<UnifiedOutlet[]>(() => {
    const list: UnifiedOutlet[] = [];
    const matchedAppIds = new Set<string>();

    for (const r of restaurants) {
      const matchingApp = applications.find(
        (a) => a.restaurant_id === r.id || a.domain_name === r.domain_name
      );
      if (matchingApp) matchedAppIds.add(matchingApp.id);

      let rAddress: any = {};
      if (typeof r.address === "object" && r.address !== null) {
        rAddress = r.address;
      } else if (typeof r.address === "string") {
        try {
          rAddress = JSON.parse(r.address);
        } catch {
          rAddress = {};
        }
      }
      const addrObj = rAddress as Record<string, string>;

      const buildingno = addrObj.address_line_1 || addrObj.buildingno || (typeof r.address === "string" && !r.address.startsWith("{") ? r.address : "");
      const floor = addrObj.address_line_2 || addrObj.floor || "";
      const area = addrObj.area || (addrObj.address_line_2 ? addrObj.address_line_2 : "") || buildingno;
      const city = addrObj.city || (matchingApp?.address as any)?.city || "";
      const pincode = addrObj.pincode || (matchingApp?.address as any)?.pincode || "";
      const landmark = addrObj.landmark || (matchingApp?.address as any)?.landmark || "";

      list.push({
        id: r.id,
        name: r.restaurant_name,
        domainName: r.domain_name,
        domainUrl: r.domain_url || `${r.domain_name}.marinate360.com`,
        posDomain: r.pos_domain || "pos.marinate360.com",
        isLive: true,
        status: r.is_active ? "active" : "rejected",
        statusLabel: r.is_active ? "Active Outlet" : "Deactivated",
        restaurantId: r.id,
        applicationId: matchingApp?.id,
        package: r.package || matchingApp?.package || "marinate-menu",
        services: Array.isArray(r.services) ? r.services : matchingApp?.services || [],
        cuisines: Array.isArray(r.cuisines) ? r.cuisines : matchingApp?.cuisines || [],
        phone: String(r.contact || matchingApp?.phone || ""),
        email: r.email || matchingApp?.email || "",
        address: {
          buildingno,
          floor,
          area,
          city,
          pincode,
          landmark,
          registered_business_address:
            addrObj.address_line_1 || addrObj.registered_business_address || (typeof r.address === "string" ? r.address : ""),
        },
        legal: {
          pan_number: (matchingApp?.legal?.pan_number as string) || "",
          fullnameaspan: (matchingApp?.legal?.fullnameaspan as string) || "",
          gst: Boolean(r.gst_number || matchingApp?.legal?.gst),
          gst_number: r.gst_number || (matchingApp?.legal?.gst_number as string) || "",
          fssai_number: r.fssai_number || (matchingApp?.legal?.fssai_number as string) || "",
          fssai_expiry: (matchingApp?.legal?.fssai_expiry as string) || "",
        },
        bank: {
          bank_accno: (matchingApp?.bank?.bank_accno as string) || "",
          ifsc_code: (matchingApp?.bank?.ifsc_code as string) || "",
          account_type: (matchingApp?.bank?.account_type as string) || "Current",
        },
        timings: (r.timings as UnifiedOutlet["timings"]) || matchingApp?.timings,
        images: (matchingApp?.images as UnifiedOutlet["images"]) || {
          logo_url: { public_url: r.logo_url ?? undefined },
          background_image_url: { public_url: r.background_image_url ?? undefined },
        },
        documents: (matchingApp?.documents as UnifiedOutlet["documents"]) || {},
        rawApplication: matchingApp,
        rawRestaurant: r,
      });
    }

    // Add pending or unlinked applications
    for (const a of applications) {
      if (matchedAppIds.has(a.id)) continue;
      const addr = (a.address || {}) as Record<string, string>;
      const leg = (a.legal || {}) as Record<string, string>;
      const bnk = (a.bank || {}) as Record<string, string>;

      list.push({
        id: a.id,
        name: a.restaurant_name,
        domainName: a.domain_name,
        domainUrl: `${a.domain_name}.marinate360.com`,
        posDomain: "pos.marinate360.com",
        isLive: false,
        status: a.status === "accepted" ? "active" : a.status === "rejected" ? "rejected" : "pending",
        statusLabel:
          a.status === "accepted"
            ? "Approved"
            : a.status === "rejected"
            ? "Action Required"
            : "Under Review",
        applicationId: a.id,
        package: a.package || "marinate-menu",
        services: Array.isArray(a.services) ? a.services : [],
        cuisines: Array.isArray(a.cuisines) ? a.cuisines : [],
        phone: String(a.phone || a.restaurant_primary_contact || ""),
        email: a.email || "",
        address: {
          buildingno: addr.buildingno || "",
          floor: addr.floor || "",
          area: addr.area || "",
          city: addr.city || "",
          pincode: addr.pincode || "",
          landmark: addr.landmark || "",
          registered_business_address: addr.registered_business_address || "",
        },
        legal: {
          pan_number: leg.pan_number || "",
          fullnameaspan: leg.fullnameaspan || "",
          gst: Boolean(leg.gst),
          gst_number: leg.gst_number || "",
          fssai_number: leg.fssai_number || "",
          fssai_expiry: leg.fssai_expiry || "",
        },
        bank: {
          bank_accno: bnk.bank_accno || "",
          ifsc_code: bnk.ifsc_code || "",
          account_type: bnk.account_type || "Current",
        },
        timings: a.timings,
        images: (a.images as UnifiedOutlet["images"]) || {},
        documents: (a.documents as UnifiedOutlet["documents"]) || {},
        rawApplication: a,
      });
    }

    return list;
  }, [applications, restaurants]);

  const currentOutlet = useMemo(() => {
    if (!selectedOutletId) return null;
    return outlets.find((o) => o.id === selectedOutletId) || null;
  }, [outlets, selectedOutletId]);

  const handleSignOut = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      clearAuthSession();
      router.push("/login");
    }
  };

  const filteredSwitcherOutlets = useMemo(() => {
    if (!switcherSearch.trim()) return outlets;
    const q = switcherSearch.toLowerCase();
    return outlets.filter((o) => o.name.toLowerCase().includes(q) || o.domainName.toLowerCase().includes(q));
  }, [outlets, switcherSearch]);

  const isDark = appTheme === "dark";

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-xs font-medium text-zinc-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen antialiased font-sans flex flex-col transition-colors duration-150 ${isDark ? "bg-zinc-950 text-zinc-100 dark" : "bg-[#fafafa] text-zinc-900"}`}>
      {/* Top Supabase-Style Navigation Bar */}
      <header className={`sticky top-0 z-40 w-full border-b px-4 sm:px-6 h-14 flex items-center justify-between backdrop-blur ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white/95 border-zinc-200/80"}`}>
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <Image
              src="/logo/m360logo.png"
              alt="Marinate360"
              width={28}
              height={28}
              className="h-7 w-auto object-contain"
            />
            <span className={`font-semibold text-sm tracking-tight hidden sm:inline-block ${isDark ? "text-white" : "text-zinc-900"}`}>
              Marinate360
            </span>
          </div>

          <span className={isDark ? "text-zinc-700" : "text-zinc-300"}>/</span>

          {/* Outlet Switcher Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOutletSwitcher(!showOutletSwitcher)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isDark
                  ? "border-zinc-800 hover:border-zinc-700 bg-zinc-800/60 text-zinc-200"
                  : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 text-zinc-800"
              }`}
            >
              <Store className="w-3.5 h-3.5 text-zinc-400" />
              <span className="max-w-[140px] truncate">
                {currentOutlet ? currentOutlet.name : "All Outlets Hub"}
              </span>
              {currentOutlet && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentOutlet.status === "active"
                      ? "bg-emerald-500"
                      : currentOutlet.status === "pending"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                />
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {showOutletSwitcher && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOutletSwitcher(false)}
                />
                <div className={`absolute left-0 mt-1.5 w-72 rounded-xl border shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}>
                  <div className="px-2 pt-1 pb-2">
                    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs ${isDark ? "bg-zinc-800/80 border-zinc-700 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-500"}`}>
                      <Search className="w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Search branches..."
                        value={switcherSearch}
                        onChange={(e) => setSwitcherSearch(e.target.value)}
                        className="bg-transparent outline-none w-full placeholder:text-zinc-400 text-xs"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400 px-2 pt-1">
                    Your Outlets
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutletId(null);
                        setShowOutletSwitcher(false);
                      }}
                      className={`w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                        selectedOutletId === null
                          ? "bg-orange-500/10 text-orange-600"
                          : isDark
                          ? "text-zinc-300 hover:bg-zinc-800"
                          : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-zinc-400" />
                        <span>All Outlets Overview</span>
                      </div>
                      {selectedOutletId === null && <Check className="w-3.5 h-3.5 text-orange-600" />}
                    </button>

                    {filteredSwitcherOutlets.map((outlet) => (
                      <button
                        key={outlet.id}
                        type="button"
                        onClick={() => {
                          setSelectedOutletId(outlet.id);
                          setShowOutletSwitcher(false);
                        }}
                        className={`w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                          selectedOutletId === outlet.id
                            ? "bg-orange-500/10 text-orange-600"
                            : isDark
                            ? "text-zinc-300 hover:bg-zinc-800"
                            : "text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{outlet.name}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            outlet.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : outlet.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          }`}
                        >
                          {outlet.statusLabel}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className={`border-t pt-1 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOutletSwitcher(false);
                        setShowPackageModal(true);
                      }}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-orange-600 hover:bg-orange-500/10 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register New Outlet</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {currentOutlet && currentOutlet.isLive && (
            <a
              href={`https://${currentOutlet.posDomain}`}
              target="_blank"
              rel="noreferrer"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition shadow-xs ${
                isDark
                  ? "border-zinc-800 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Launch POS</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          )}

          {/* Theme Toggle (Light / Dark for Onboarding App) */}
          <button
            type="button"
            onClick={toggleAppTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`p-1.5 rounded-lg border transition ${
              isDark
                ? "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-amber-400"
                : "border-zinc-200 hover:bg-zinc-100 text-zinc-600"
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Top-Right Account Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-2.5 text-xs font-semibold shadow-2xs transition ${
                isDark
                  ? "border-zinc-800 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800"
              }`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                {(currentProfile.first_name?.[0] || currentProfile.username?.[0] || currentProfile.email?.[0] || "C").toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className={`text-xs font-bold leading-tight ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                  {currentProfile.first_name ? `${currentProfile.first_name} ${currentProfile.last_name || ""}`.trim() : currentProfile.username || currentProfile.email?.split("@")[0] || "Account"}
                </span>
                <span className="text-[10px] text-zinc-400 capitalize">{currentProfile.role?.replace("_", " ") || "Owner"}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${profileDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {profileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                <div className={`absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100 ${
                  isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
                }`}>
                  <div className={`px-3 py-2 border-b ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                    <p className="text-xs font-bold">
                      {currentProfile.first_name ? `${currentProfile.first_name} ${currentProfile.last_name || ""}`.trim() : currentProfile.username || "Account"}
                    </p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{currentProfile.email}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-600 capitalize">
                      {currentProfile.role?.replace("_", " ") || "Restaurant Owner"}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setSelectedOutletId(null);
                        setCustomerView("outlets");
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        customerView === "outlets" && selectedOutletId === null
                          ? "bg-orange-500/10 text-orange-600 font-bold"
                          : isDark ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <Store size={14} className="text-zinc-400" />
                      My Outlets
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setSelectedOutletId(null);
                        setCustomerView("settings");
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        customerView === "settings"
                          ? "bg-orange-500/10 text-orange-600 font-bold"
                          : isDark ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <User size={14} className="text-zinc-400" />
                      Profile & Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setSelectedOutletId(null);
                        setCustomerView("settings");
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        isDark ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <KeyRound size={14} className="text-zinc-400" />
                      Change Password
                    </button>
                  </div>

                  <div className={`border-t pt-1 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowLogoutModal(true);
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
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {customerView === "settings" ? (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Account & Profile Settings
                </h1>
                <p className="text-xs text-zinc-500 mt-1">
                  Manage your personal details and security credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerView("outlets")}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition ${
                  isDark
                    ? "border-zinc-800 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                }`}
              >
                <ArrowLeft size={14} />
                Back to Outlets
              </button>
            </div>

            <AccountSettingsView
              accessToken={accessToken}
              profile={currentProfile}
              onProfileUpdated={(updated) => {
                setCurrentProfile(updated);
              }}
            />
          </div>
        ) : selectedOutletId === null ? (
          /* =================================================================== */
          /* OUTLETS HUB (GRID VIEW) - ELEVATED PREMIUM DESIGN                   */
          /* =================================================================== */
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Page Header with Stats & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Restaurant Outlets
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                    <Sparkles className="w-3 h-3" />
                    {outlets.length} {outlets.length === 1 ? "Outlet" : "Outlets"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-xl">
                  Select an outlet to manage operations, view compliance, or launch the POS terminal.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`hidden md:flex items-center gap-3 rounded-xl border px-3.5 py-2 text-xs ${
                  isDark ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200/80 bg-white"
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-zinc-500">Active:</span>
                    <strong className={`font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {outlets.filter((o) => o.status === "active").length}
                    </strong>
                  </div>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">Live POS:</span>
                    <strong className={`font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {outlets.filter((o) => o.isLive).length}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPackageModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Outlet</span>
                </button>
              </div>
            </div>

            {/* Quick Search when multiple outlets */}
            {outlets.length > 2 && (
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search outlet by name, city, or branch..."
                  value={outletSearch}
                  onChange={(e) => setOutletSearch(e.target.value)}
                  className={`w-full rounded-xl border pl-10 pr-4 py-2 text-xs font-medium transition focus:outline-hidden focus:ring-2 focus:ring-orange-500 ${
                    isDark
                      ? "border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-700"
                      : "border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500"
                  }`}
                />
                {outletSearch && (
                  <button
                    type="button"
                    onClick={() => setOutletSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Outlets Grid */}
            {(() => {
              const filteredOutlets = outlets.filter((outlet) => {
                if (!outletSearch.trim()) return true;
                const q = outletSearch.toLowerCase();
                return (
                  outlet.name.toLowerCase().includes(q) ||
                  outlet.address?.city?.toLowerCase().includes(q) ||
                  outlet.package?.toLowerCase().includes(q)
                );
              });

              if (filteredOutlets.length === 0) {
                return (
                  <div className={`p-12 text-center rounded-2xl border border-dashed ${
                    isDark ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-300 bg-white"
                  }`}>
                    <Store className="w-10 h-10 text-zinc-500 mx-auto" />
                    <h3 className={`mt-3 text-sm font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                      {outletSearch ? "No matching outlets found" : "No outlets registered"}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                      {outletSearch
                        ? `No branches match "${outletSearch}". Try clearing your search.`
                        : "Get started by registering your first restaurant branch with digital menu and POS workflows."}
                    </p>
                    {outletSearch ? (
                      <button
                        type="button"
                        onClick={() => setOutletSearch("")}
                        className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold"
                      >
                        Clear Search
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPackageModal(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register First Outlet</span>
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredOutlets.map((outlet) => (
                    <div
                      key={outlet.id}
                      className={`group flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                        isDark
                          ? "border-zinc-800 bg-zinc-900/90 hover:border-zinc-700"
                          : "border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-orange-500/5"
                      }`}
                    >
                      <div>
                        {/* Top status bar */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                              outlet.status === "active"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : outlet.status === "pending"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                outlet.status === "active"
                                  ? "bg-emerald-500 animate-pulse"
                                  : outlet.status === "pending"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            <span>{outlet.statusLabel || (outlet.status === "active" ? "Active Outlet" : outlet.status)}</span>
                          </span>

                          <span className="inline-block text-[10px] font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {outlet.package?.replace("-", " ") || "Marinate"}
                          </span>
                        </div>

                        {/* Outlet Info */}
                        <div className="mt-4 flex items-start gap-3.5">
                          <div className={`relative w-13 h-13 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group-hover:scale-105 transition-transform ${
                            isDark ? "border-zinc-800 bg-zinc-800" : "border-zinc-200 bg-zinc-50"
                          }`}>
                            {outlet.images?.logo_url?.public_url ? (
                              <Image
                                src={outlet.images.logo_url.public_url}
                                alt={outlet.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Store className="w-6 h-6 text-orange-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`text-base font-bold truncate group-hover:text-orange-600 transition-colors ${
                              isDark ? "text-zinc-100" : "text-zinc-900"
                            }`}>
                              {outlet.name}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-zinc-500 truncate mt-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                              <span className="truncate">
                                {outlet.address?.city
                                  ? `${outlet.address.city}${outlet.address.pincode ? `, ${outlet.address.pincode}` : ""}`
                                  : "Address pending"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Services badges */}
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {outlet.services.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize border ${
                                isDark
                                  ? "bg-zinc-800/80 border-zinc-700/60 text-zinc-300"
                                  : "bg-zinc-100/80 border-zinc-200/80 text-zinc-700"
                              }`}
                            >
                              {s.replace("_", " ")}
                            </span>
                          ))}
                          {outlet.services.length > 3 && (
                            <span className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${
                              isDark
                                ? "bg-zinc-800/80 border-zinc-700/60 text-zinc-400"
                                : "bg-zinc-100/80 border-zinc-200/80 text-zinc-500"
                            }`}>
                              +{outlet.services.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className={`mt-6 pt-4 border-t flex items-center justify-between gap-2.5 ${
                        isDark ? "border-zinc-800" : "border-zinc-100"
                      }`}>
                        <button
                          type="button"
                          onClick={() => setSelectedOutletId(outlet.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs py-2.5 px-3.5 shadow-xs shadow-orange-600/20 transition-all group/btn"
                        >
                          <span>Enter Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                        </button>

                        {outlet.isLive ? (
                          <a
                            href={`https://${outlet.posDomain}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold shadow-2xs transition ${
                              isDark
                                ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white"
                                : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 hover:text-orange-600"
                            }`}
                          >
                            <span>Open POS</span>
                            <ExternalLink className="w-3 h-3 text-orange-600" />
                          </a>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-2 rounded-xl ${
                            isDark ? "bg-zinc-800/60 text-zinc-500" : "bg-zinc-100 text-zinc-400"
                          }`}>
                            Under Review
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          /* =================================================================== */
          /* DEDICATED BRANCH WORKSPACE                                          */
          /* =================================================================== */
          currentOutlet && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Back to Hub Navigation */}
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedOutletId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Outlets Hub</span>
                </button>
              </div>

              {/* Outlet Header Card */}
              <div className={`rounded-xl border p-6 shadow-xs ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`relative w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden shadow-xs ${isDark ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-200"}`}>
                      {currentOutlet.images?.logo_url?.public_url ? (
                        <Image
                          src={currentOutlet.images.logo_url.public_url}
                          alt={currentOutlet.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Store className="w-7 h-7 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                          {currentOutlet.name}
                        </h1>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            currentOutlet.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : currentOutlet.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              currentOutlet.status === "active"
                                ? "bg-emerald-500"
                                : currentOutlet.status === "pending"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          <span>{currentOutlet.statusLabel}</span>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="font-mono">{currentOutlet.domainUrl}</span>
                        <span>&bull;</span>
                        <span className="capitalize">{currentOutlet.package.replace("-", " ")} Plan</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {!currentOutlet.isLive ? (
                      <button
                        type="button"
                        onClick={() => {
                          const appId = currentOutlet.rawApplication?.id || currentOutlet.id;
                          router.push(`/onboarding?editApplicationId=${encodeURIComponent(appId)}`);
                        }}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer ${
                          isDark
                            ? "bg-zinc-100 hover:bg-white text-zinc-900"
                            : "bg-zinc-900 hover:bg-zinc-800 text-white"
                        }`}
                      >
                        <Pencil size={13} />
                        <span>Edit Application</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const restId = currentOutlet.rawRestaurant?.id || currentOutlet.id;
                          router.push(`/onboarding?editRestaurantId=${encodeURIComponent(restId)}`);
                        }}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-semibold shadow-xs transition cursor-pointer ${
                          isDark
                            ? "border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                            : "border-zinc-200 hover:bg-zinc-50 text-zinc-800"
                        }`}
                      >
                        <Pencil size={13} />
                        <span>Edit Branch Info</span>
                      </button>
                    )}

                    {currentOutlet.isLive && (
                      <a
                        href={`https://${currentOutlet.posDomain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-medium text-white shadow-xs transition"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Launch POS Terminal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Horizontal Navigation Tabs (shadcn style) */}
                <div className={`mt-8 border-t pt-3 flex items-center gap-1 overflow-x-auto ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === "overview"
                        ? isDark ? "bg-zinc-800 text-white font-semibold" : "bg-zinc-100 text-zinc-900 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("operations")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === "operations"
                        ? isDark ? "bg-zinc-800 text-white font-semibold" : "bg-zinc-100 text-zinc-900 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    Operations & Services
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("compliance")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === "compliance"
                        ? isDark ? "bg-zinc-800 text-white font-semibold" : "bg-zinc-100 text-zinc-900 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    Compliance & Legal
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("location")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === "location"
                        ? isDark ? "bg-zinc-800 text-white font-semibold" : "bg-zinc-100 text-zinc-900 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    Location & Contact
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {!currentOutlet.isLive && (
                    <div className={`rounded-xl border p-4 flex items-start gap-3 ${isDark ? "border-amber-900/40 bg-amber-950/20 text-amber-300" : "border-amber-200/80 bg-amber-50/50 text-amber-900"}`}>
                      <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-semibold">
                          Application Under Verification
                        </h4>
                        <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? "text-amber-400/80" : "text-amber-700/90"}`}>
                          Your business documents (FSSAI, GSTIN, and PAN) are currently being reviewed by our operations team. You may update any data or replace documents anytime by clicking <strong>Edit Application</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Endpoints Card */}
                    <div className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>Digital Access Endpoints</h3>
                        <Globe className="w-4 h-4 text-zinc-400" />
                      </div>

                      <div className="space-y-3">
                        <div className={`p-3 rounded-lg border flex items-center justify-between ${isDark ? "bg-zinc-800/60 border-zinc-800" : "bg-zinc-50/70 border-zinc-100"}`}>
                          <div>
                            <div className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
                              Customer Web Menu
                            </div>
                            <div className={`text-xs font-medium mt-0.5 font-mono ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                              https://{currentOutlet.domainUrl}
                            </div>
                          </div>
                          <CopyButton text={`https://${currentOutlet.domainUrl}`} />
                        </div>

                        <div className={`p-3 rounded-lg border flex items-center justify-between ${isDark ? "bg-zinc-800/60 border-zinc-800" : "bg-zinc-50/70 border-zinc-100"}`}>
                          <div>
                            <div className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
                              POS Terminal Endpoint
                            </div>
                            <div className={`text-xs font-medium mt-0.5 font-mono ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                              https://{currentOutlet.posDomain}
                            </div>
                          </div>
                          <CopyButton text={`https://${currentOutlet.posDomain}`} />
                        </div>
                      </div>
                    </div>

                    {/* Operational Channels: Dine-in, Takeaway, Delivery, Catering (NO BAR) */}
                    <div className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>Active Order Channels</h3>
                        <Utensils className="w-4 h-4 text-zinc-400" />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { key: "dine_in", label: "Dine In" },
                          { key: "takeaway", label: "Takeaway" },
                          { key: "delivery", label: "Delivery" },
                          { key: "catering", label: "Catering" },
                        ].map(({ key, label }) => {
                          const isEnabled = currentOutlet.services.includes(key);
                          return (
                            <div
                              key={key}
                              className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-medium ${
                                isEnabled
                                  ? isDark
                                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                                    : "border-emerald-200 bg-emerald-50/40 text-emerald-800"
                                  : isDark
                                  ? "border-zinc-800 bg-zinc-800/40 text-zinc-500"
                                  : "border-zinc-100 bg-zinc-50/60 text-zinc-400"
                              }`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isEnabled ? "bg-emerald-500" : "bg-zinc-500"
                                }`}
                              />
                              <span>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "operations" && (
                <div className="space-y-5">
                  <div className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                    <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>Cuisines Served</h3>
                    <div className="flex flex-wrap gap-2">
                      {currentOutlet.cuisines.length > 0 ? (
                        currentOutlet.cuisines.map((c) => (
                          <span
                            key={c}
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${
                              isDark
                                ? "bg-orange-500/10 border border-orange-500/30 text-orange-400"
                                : "bg-orange-50 border border-orange-200/60 text-orange-800"
                            }`}
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-400">No cuisines specified yet</span>
                      )}
                    </div>
                  </div>

                  <div className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                    <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>Operating Timings</h3>
                    {currentOutlet.timings?.hours ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(currentOutlet.timings.hours).map(([day, slots]) => (
                          <div
                            key={day}
                            className={`p-3 rounded-lg border text-xs ${
                              isDark
                                ? "border-zinc-800 bg-zinc-800/50"
                                : "border-zinc-100 bg-zinc-50/60"
                            }`}
                          >
                            <span className={`font-semibold capitalize ${isDark ? "text-zinc-200" : "text-zinc-700"}`}>{day}</span>
                            <div className="mt-1 text-zinc-400 font-mono">
                              {slots && slots.length > 0
                                ? slots.map((s) => `${s.open_time} - ${s.close_time}`).join(", ")
                                : "Closed"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Standard business hours configured.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "compliance" && (
                <div className="space-y-6">
                  {/* Legal & Banking Grid */}
                  <div className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                    <div>
                      <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>
                        Regulatory & Banking Details
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        KYC identifiers submitted for compliance verification and settlement processing.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                      <PropertyCard
                        label="PAN Card Number"
                        value={currentOutlet.legal.pan_number || "Not provided"}
                        canCopy={Boolean(currentOutlet.legal.pan_number)}
                        isDark={isDark}
                      />
                      <PropertyCard
                        label="Name as on PAN"
                        value={currentOutlet.legal.fullnameaspan || "Not provided"}
                        isDark={isDark}
                      />
                      <PropertyCard
                        label="FSSAI License"
                        value={currentOutlet.legal.fssai_number || "Not provided"}
                        canCopy={Boolean(currentOutlet.legal.fssai_number)}
                        isDark={isDark}
                      />
                      <PropertyCard
                        label="GSTIN Number"
                        value={
                          currentOutlet.legal.gst_number
                            ? currentOutlet.legal.gst_number
                            : currentOutlet.legal.gst === false
                            ? "Not registered (Exempt)"
                            : "Not provided"
                        }
                        canCopy={Boolean(currentOutlet.legal.gst_number)}
                        isDark={isDark}
                      />
                      <BankCard
                        accNo={currentOutlet.bank.bank_accno}
                        type={currentOutlet.bank.account_type}
                        isDark={isDark}
                      />
                      <PropertyCard
                        label="Bank IFSC Code"
                        value={currentOutlet.bank.ifsc_code || "Not provided"}
                        canCopy={Boolean(currentOutlet.bank.ifsc_code)}
                        isDark={isDark}
                      />
                    </div>
                  </div>

                  {/* Verification Documents List */}
                  <div className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>
                          Submitted Verification Documents
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {currentOutlet.isLive
                            ? "Verified compliance documents are locked. Contact Super Admin to request alterations."
                            : "Documents can be replaced or removed while your application is under review."}
                        </p>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-zinc-400" />
                    </div>

                    {Object.keys(currentOutlet.documents).length === 0 ? (
                      <p className="text-xs text-zinc-400 py-3">No compliance files uploaded yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {Object.entries(currentOutlet.documents).map(([docKey, docAsset]) => (
                          <div
                            key={docKey}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                              isDark
                                ? "border-zinc-800 bg-zinc-800/50"
                                : "border-zinc-200/90 bg-zinc-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <FileCheck className="w-5 h-5 text-amber-500 shrink-0" />
                              <div className="truncate">
                                <div className={`text-xs font-semibold capitalize truncate ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                                  {docKey.replace(/_/g, " ")}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                                  {docAsset.original_name || `${docKey}.pdf`}
                                </div>
                              </div>
                            </div>

                            {docAsset.public_url ? (
                              <a
                                href={docAsset.public_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-2xs shrink-0 transition ${
                                  isDark
                                    ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                    : "border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700"
                                }`}
                              >
                                <span>View</span>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                              </a>
                            ) : (
                              <span className="text-xs text-zinc-400">Attached</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "location" && (
                <div className="space-y-5">
                  <div className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span className={isDark ? "text-white" : "text-zinc-900"}>Physical Address</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <PropertyCard label="Building / Premises" value={currentOutlet.address.buildingno || "N/A"} isDark={isDark} />
                      <PropertyCard label="Floor" value={currentOutlet.address.floor || "N/A"} isDark={isDark} />
                      <PropertyCard label="Area / Locality" value={currentOutlet.address.area || "N/A"} isDark={isDark} />
                      <PropertyCard label="City" value={currentOutlet.address.city || "N/A"} isDark={isDark} />
                      <PropertyCard label="Postal Code" value={currentOutlet.address.pincode || "N/A"} isDark={isDark} />
                      <PropertyCard label="Landmark" value={currentOutlet.address.landmark || "N/A"} isDark={isDark} />
                    </div>

                    <div className="pt-2">
                      <PropertyCard
                        label="Registered Business Address"
                        value={currentOutlet.address.registered_business_address || "N/A"}
                        isDark={isDark}
                      />
                    </div>
                  </div>

                  <div className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Phone className="w-4 h-4 text-orange-600" />
                      <span className={isDark ? "text-white" : "text-zinc-900"}>Contact Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <PropertyCard label="Primary Phone" value={currentOutlet.phone || "N/A"} canCopy={Boolean(currentOutlet.phone)} isDark={isDark} />
                      <PropertyCard label="Business Email" value={currentOutlet.email || "N/A"} canCopy={Boolean(currentOutlet.email)} isDark={isDark} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* =================================================================== */}
      {/* PACKAGE SELECTION MODAL (BEFORE ONBOARDING)                         */}
      {/* =================================================================== */}
      {showPackageModal && (
        <SelectPackageModal
          isDark={isDark}
          onClose={() => setShowPackageModal(false)}
          onSelect={(pkgKey, services) => {
            setShowPackageModal(false);
            router.push(
              `/onboarding?services=${encodeURIComponent(services.join(","))}&package=${encodeURIComponent(pkgKey)}`
            );
          }}
        />
      )}

      {/* =================================================================== */}
      {/* EDIT MODAL: COMPREHENSIVE PENDING APPLICATION EDITOR               */}
      {/* =================================================================== */}
      {isEditingPending && currentOutlet?.rawApplication && (
        <EditPendingApplicationModal
          application={currentOutlet.rawApplication}
          accessToken={accessToken}
          isDark={isDark}
          onClose={() => setIsEditingPending(false)}
          onSuccess={() => {
            setIsEditingPending(false);
            void loadData();
          }}
        />
      )}

      {/* =================================================================== */}
      {/* EDIT MODAL: LIVE RESTAURANT INFO (LOCKED POS/DOMAIN, NO DOC REUPLOAD)*/}
      {/* =================================================================== */}
      {isEditingLive && currentOutlet?.rawRestaurant && (
        <EditLiveRestaurantModal
          restaurant={currentOutlet.rawRestaurant}
          accessToken={accessToken}
          isDark={isDark}
          onClose={() => setIsEditingLive(false)}
          onSuccess={() => {
            setIsEditingLive(false);
            void loadData();
          }}
        />
      )}
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border space-y-4 ${
            isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
          }`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Sign out of Marinate360?</h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  You are currently signed in as <span className="font-semibold">{profile?.email || initialUser?.email || "your account"}</span>. Are you sure you want to end your session?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                  isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  void handleSignOut();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers & Subcomponents
// ---------------------------------------------------------------------------

function PropertyCard({
  label,
  value,
  canCopy = false,
  isDark = false,
}: {
  label: string;
  value: string;
  canCopy?: boolean;
  isDark?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border flex items-start justify-between gap-2 ${isDark ? "bg-zinc-800/60 border-zinc-800" : "bg-zinc-50/70 border-zinc-100"}`}>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
          {label}
        </div>
        <div className={`text-xs font-semibold mt-1 truncate ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>{value}</div>
      </div>
      {canCopy && <CopyButton text={value} />}
    </div>
  );
}

function BankCard({ accNo, type, isDark = false }: { accNo?: string; type?: string; isDark?: boolean }) {
  const [showFull, setShowFull] = useState(false);

  const clean = (accNo || "").trim();
  const masked = clean.length > 4 ? `•••• •••• ${clean.slice(-4)}` : clean || "Not provided";

  return (
    <div className={`p-3 rounded-lg border flex items-start justify-between gap-2 ${isDark ? "bg-zinc-800/60 border-zinc-800" : "bg-zinc-50/70 border-zinc-100"}`}>
      <div>
        <div className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
          Bank Account ({type || "Current"})
        </div>
        <div className={`text-xs font-semibold mt-1 font-mono ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
          {showFull ? clean : masked}
        </div>
      </div>
      {clean && (
        <button
          type="button"
          onClick={() => setShowFull(!showFull)}
          title={showFull ? "Hide Account Number" : "Show Account Number"}
          className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
        >
          {showFull ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component: Cuisine Selector (Checkbox/Pill style with custom cuisine adder)
// ---------------------------------------------------------------------------

function CuisineSelector({
  selectedCuisines,
  onChange,
  isDark = false,
}: {
  selectedCuisines: string[];
  onChange: (cuisines: string[]) => void;
  isDark?: boolean;
}) {
  const [customInput, setCustomInput] = useState("");

  const toggleCuisine = (cuisine: string) => {
    const isSelected = selectedCuisines.some(
      (c) => c.toLowerCase() === cuisine.toLowerCase()
    );
    if (isSelected) {
      onChange(selectedCuisines.filter((c) => c.toLowerCase() !== cuisine.toLowerCase()));
    } else {
      onChange([...selectedCuisines, cuisine]);
    }
  };

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customInput.trim();
    if (!val) return;
    if (!selectedCuisines.some((c) => c.toLowerCase() === val.toLowerCase())) {
      onChange([...selectedCuisines, val]);
    }
    setCustomInput("");
  };

  const customSelected = selectedCuisines.filter(
    (c) => !STANDARD_CUISINES.some((sc) => sc.toLowerCase() === c.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
          Select Cuisines ({selectedCuisines.length} selected)
        </label>
        <span className="text-[10px] text-zinc-400">Click to toggle or add custom below</span>
      </div>

      {/* Preset Pill Grid */}
      <div className={`flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-xl border ${isDark ? "border-zinc-800 bg-zinc-800/50" : "border-zinc-200 bg-zinc-50/60"}`}>
        {STANDARD_CUISINES.map((cuisine) => {
          const isSelected = selectedCuisines.some(
            (c) => c.toLowerCase() === cuisine.toLowerCase()
          );
          return (
            <button
              key={cuisine}
              type="button"
              onClick={() => toggleCuisine(cuisine)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                isSelected
                  ? "bg-orange-500 text-white border-orange-500 shadow-2xs"
                  : isDark
                  ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/60"
                  : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/60"
              }`}
            >
              {isSelected && <Check className="w-3 h-3" />}
              <span>{cuisine}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Selected Cuisines Badges */}
      {customSelected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {customSelected.map((c) => (
            <span
              key={c}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${
                isDark
                  ? "bg-orange-950/40 text-orange-300 border-orange-800/60"
                  : "bg-orange-100/80 text-orange-900 border-orange-200"
              }`}
            >
              <span>{c}</span>
              <button
                type="button"
                onClick={() => toggleCuisine(c)}
                className="hover:text-rose-500 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom Cuisine Input */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          placeholder="Add custom cuisine (e.g. Arabian Mandi, Mughlai, Bakery)..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom(e);
            }
          }}
          className={`flex-1 px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${
            isDark
              ? "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              : "bg-white border-zinc-200 text-zinc-900"
          }`}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-medium transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: Package Selection (Before Entering Registration)
// ---------------------------------------------------------------------------

function SelectPackageModal({
  onClose,
  onSelect,
  isDark = false,
}: {
  onClose: () => void;
  onSelect: (pkgKey: keyof typeof PACKAGES, services: string[]) => void;
  isDark?: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState<keyof typeof PACKAGES>("marinate-menu");

  const selected = PACKAGES[selectedKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
          <div>
            <h2 className="text-base font-bold">Select Restaurant Package</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Choose the package that aligns with this outlet's ordering and operational model.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Packages Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto max-h-[60vh]">
          {(Object.entries(PACKAGES) as Array<[keyof typeof PACKAGES, typeof PACKAGES[keyof typeof PACKAGES]]>).map(
            ([key, pkg]) => {
              const isSelected = selectedKey === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-orange-500 bg-orange-500/10 shadow-xs"
                      : isDark
                      ? "border-zinc-800 hover:border-zinc-700 bg-zinc-800/40"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                        {pkg.badge}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-orange-500 bg-orange-500 text-white"
                            : isDark
                            ? "border-zinc-600"
                            : "border-zinc-300"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </div>

                    <h3 className="text-base font-bold mt-1">{pkg.label}</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{pkg.summary}</p>
                  </div>

                  <ul className={`mt-4 pt-3 border-t space-y-1.5 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                    {pkg.points.map((pt) => (
                      <li key={pt} className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-end gap-2.5 ${isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border text-xs font-medium transition ${isDark ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300" : "border-zinc-200 hover:bg-white text-zinc-700"}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSelect(selectedKey, [...selected.services])}
            className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-semibold text-white shadow-xs transition"
          >
            Continue to Registration →
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: Full Comprehensive Pending Application Editor
// ---------------------------------------------------------------------------

function EditPendingApplicationModal({
  application,
  accessToken,
  onClose,
  onSuccess,
  isDark = false,
}: {
  application: OnboardingApplication;
  accessToken: string;
  onClose: () => void;
  onSuccess: () => void;
  isDark?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const addr = (application.address || {}) as Record<string, string>;
  const leg = (application.legal || {}) as Record<string, string>;
  const bnk = (application.bank || {}) as Record<string, string>;

  // Form states
  const [restaurantName, setRestaurantName] = useState(application.restaurant_name || "");
  const [ownerName, setOwnerName] = useState(application.owner_name || "");
  const [phone, setPhone] = useState(application.phone || "");
  const [primaryContact, setPrimaryContact] = useState(application.restaurant_primary_contact || "");
  const [cuisines, setCuisines] = useState<string[]>(
    Array.isArray(application.cuisines) ? application.cuisines : []
  );
  const [services, setServices] = useState(
    Array.isArray(application.services) ? application.services.join(", ") : ""
  );

  // Address
  const [building, setBuilding] = useState(addr.buildingno || "");
  const [floor, setFloor] = useState(addr.floor || "");
  const [area, setArea] = useState(addr.area || "");
  const [city, setCity] = useState(addr.city || "");
  const [pincode, setPincode] = useState(addr.pincode || "");
  const [landmark, setLandmark] = useState(addr.landmark || "");
  const [registeredAddress, setRegisteredAddress] = useState(addr.registered_business_address || "");

  // Legal & Bank
  const [panNumber, setPanNumber] = useState(leg.pan_number || "");
  const [panName, setPanName] = useState(leg.fullnameaspan || "");
  const [gstNumber, setGstNumber] = useState(leg.gst_number || "");
  const [fssaiNumber, setFssaiNumber] = useState(leg.fssai_number || "");
  const [fssaiExpiry, setFssaiExpiry] = useState(leg.fssai_expiry || "");
  const [bankAccount, setBankAccount] = useState(bnk.bank_accno || "");
  const [ifscCode, setIfscCode] = useState(bnk.ifsc_code || "");
  const [accountType, setAccountType] = useState(bnk.account_type || "Current");

  // File uploads
  const [newPanFile, setNewPanFile] = useState<File | null>(null);
  const [newGstFile, setNewGstFile] = useState<File | null>(null);
  const [newFssaiFile, setNewFssaiFile] = useState<File | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [removeKeys, setRemoveKeys] = useState<string[]>([]);

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        restaurant_name: restaurantName.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        restaurant_primary_contact: primaryContact.trim(),
        address: {
          buildingno: building.trim(),
          floor: floor.trim(),
          area: area.trim(),
          city: city.trim(),
          pincode: pincode.trim(),
          landmark: landmark.trim(),
          registered_business_address: registeredAddress.trim(),
        },
        legal: {
          pan_number: panNumber.trim(),
          fullnameaspan: panName.trim(),
          gst: Boolean(gstNumber.trim()),
          gst_number: gstNumber.trim() || null,
          fssai_number: fssaiNumber.trim(),
          fssai_expiry: fssaiExpiry.trim(),
        },
        bank: {
          bank_accno: bankAccount.trim(),
          ifsc_code: ifscCode.trim(),
          account_type: accountType.trim(),
        },
        cuisines: cuisines.map((c) => c.trim()).filter(Boolean),
        services: services.split(",").map((s) => s.trim()).filter(Boolean),
      };

      const fd = new FormData();
      fd.append("accessToken", accessToken);
      fd.append("applicationId", application.id);
      fd.append("payload", JSON.stringify(payload));
      fd.append("remove_keys", JSON.stringify(removeKeys));

      if (newPanFile) fd.append("pan_card", newPanFile);
      if (newGstFile) fd.append("gst_certificate", newGstFile);
      if (newFssaiFile) fd.append("fssai_license", newFssaiFile);
      if (newLogoFile) fd.append("logo_url", newLogoFile);

      const res = await updateMyOnboardingApplicationWithFormData(fd);
      if (!res.ok) {
        throw new Error(res.error || "Failed to update application");
      }

      // Close modal immediately upon completion and reload
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}>
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
          <div>
            <h2 className="text-base font-bold">Edit Application Details</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Update your business info and replace verification documents while under review.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Restaurant & Owner */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              1. Restaurant & Owner Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Restaurant Name</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Owner Full Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Primary Contact Person</label>
                <input
                  type="text"
                  value={primaryContact}
                  onChange={(e) => setPrimaryContact(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
            </div>

            {/* Interactive Cuisine Selector */}
            <div className="pt-2">
              <CuisineSelector
                selectedCuisines={cuisines}
                onChange={setCuisines}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Section 2: Address */}
          <div className={`space-y-3 pt-2 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              2. Physical Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Building / Door No.</label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Floor</label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Area / Locality</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Landmark</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div className="sm:col-span-3">
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Full Business Address</label>
                <input
                  type="text"
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Legal & Tax */}
          <div className={`space-y-3 pt-2 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              3. Legal & Regulatory Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>PAN Card Number</label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Name as on PAN</label>
                <input
                  type="text"
                  value={panName}
                  onChange={(e) => setPanName(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>FSSAI License Number</label>
                <input
                  type="text"
                  value={fssaiNumber}
                  onChange={(e) => setFssaiNumber(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>GSTIN Number (optional)</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                  placeholder="Leave empty if not registered"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bank Account */}
          <div className={`space-y-3 pt-2 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              4. Payout Bank Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Bank Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 font-mono ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 font-mono ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Document Replacement */}
          <div className={`space-y-3 pt-2 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                5. Compliance Documents & Certificates
              </h3>
              <span className="text-[11px] text-zinc-400">Attach new file to replace</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DocUploader
                label="PAN Card"
                currentFile={application.documents?.pan_card?.original_name}
                file={newPanFile}
                onFileChange={setNewPanFile}
                isDark={isDark}
              />
              <DocUploader
                label="FSSAI License"
                currentFile={application.documents?.fssai_license?.original_name}
                file={newFssaiFile}
                onFileChange={setNewFssaiFile}
                isDark={isDark}
              />
              <DocUploader
                label="GST Certificate"
                currentFile={application.documents?.gst_certificate?.original_name}
                file={newGstFile}
                onFileChange={setNewGstFile}
                isDark={isDark}
              />
              <DocUploader
                label="Restaurant Logo"
                currentFile={application.images?.logo_url?.original_name}
                file={newLogoFile}
                onFileChange={setNewLogoFile}
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer with visible sticky error banner */}
        <div className={`px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"}`}>
          <div className="flex-1">
            {errorMsg && (
              <div className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border text-xs font-medium transition ${isDark ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300" : "border-zinc-200 hover:bg-white text-zinc-700"}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-medium text-white shadow-xs transition disabled:opacity-50"
            >
              {saving ? "Saving Updates..." : "Save Application Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocUploader({
  label,
  currentFile,
  file,
  onFileChange,
  isDark = false,
}: {
  label: string;
  currentFile?: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  isDark?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border space-y-2 ${isDark ? "border-zinc-800 bg-zinc-800/40" : "border-zinc-200 bg-zinc-50/50"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>{label}</span>
        {currentFile && (
          <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">
            Current: {currentFile}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onFileChange(e.target.files[0]);
              }
            }}
          />
          <div className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 truncate ${
            isDark
              ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200"
              : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
          }`}>
            <Upload className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{file ? file.name : "Select replacement file"}</span>
          </div>
        </label>
        {file && (
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="p-1.5 text-zinc-400 hover:text-rose-500 transition"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: Live Restaurant Info Editor (Locked POS / Domain, No Doc Reupload)
// ---------------------------------------------------------------------------

function EditLiveRestaurantModal({
  restaurant,
  accessToken,
  onClose,
  onSuccess,
  isDark = false,
}: {
  restaurant: RestaurantRecord;
  accessToken: string;
  onClose: () => void;
  onSuccess: () => void;
  isDark?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  let addrObj: any = {};
  if (typeof restaurant.address === "object" && restaurant.address !== null) {
    addrObj = restaurant.address;
  } else if (typeof restaurant.address === "string") {
    try {
      addrObj = JSON.parse(restaurant.address);
    } catch {
      addrObj = {};
    }
  }
  const addr = addrObj as Record<string, string>;

  const [restaurantName, setRestaurantName] = useState(restaurant.restaurant_name || "");
  const [contact, setContact] = useState(String(restaurant.contact || ""));
  const [email, setEmail] = useState(restaurant.email || "");
  const [about, setAbout] = useState(restaurant.about || restaurant.description || "");
  const [cuisines, setCuisines] = useState<string[]>(
    Array.isArray(restaurant.cuisines) ? restaurant.cuisines : []
  );

  const [city, setCity] = useState(addr.city || "");
  const [pincode, setPincode] = useState(addr.pincode || "");
  const [registeredAddress, setRegisteredAddress] = useState(
    addr.address_line_1 || addr.registered_business_address || (typeof restaurant.address === "string" ? restaurant.address : "")
  );

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        restaurant_name: restaurantName.trim(),
        contact: String(contact).trim(),
        email: email.trim(),
        about: about.trim(),
        description: about.trim(),
        address: {
          ...addr,
          city: city.trim(),
          pincode: pincode.trim(),
          registered_business_address: registeredAddress.trim(),
        },
        cuisines: cuisines.map((c) => c.trim()).filter(Boolean),
      };

      const fd = new FormData();
      fd.append("accessToken", accessToken);
      fd.append("restaurantId", restaurant.id);
      fd.append("payload", JSON.stringify(payload));

      const res = await updateRestaurantWithFormData(fd);
      if (!res.ok) {
        throw new Error(res.error || "Failed to update restaurant info");
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update restaurant details.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
          <div>
            <h2 className="text-base font-bold">Edit Branch Information</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Update operational details for {restaurant.restaurant_name}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Locked Endpoints Notice */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${isDark ? "border-zinc-800 bg-zinc-800/40" : "border-zinc-200 bg-zinc-50"}`}>
            <Lock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-400">
              <span className={`font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>Platform Managed Endpoints</span>
              <p className="mt-0.5">
                POS domain (<code>{restaurant.pos_domain || "pos.marinate360.com"}</code>) and Food Ordering URL are locked and managed by the Marinate360 Super Admin.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Restaurant Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Primary Contact Phone</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Business Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
            </div>

            {/* Interactive Cuisine Selector */}
            <CuisineSelector
              selectedCuisines={cuisines}
              onChange={setCuisines}
              isDark={isDark}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
                />
              </div>
            </div>

            <div>
              <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Address Details</label>
              <input
                type="text"
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
              />
            </div>

            <div>
              <label className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>About / Description</label>
              <textarea
                rows={3}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className={`mt-1 w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-orange-500 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"}`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"}`}>
          <div className="flex-1">
            {errorMsg && (
              <div className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border text-xs font-medium transition ${isDark ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300" : "border-zinc-200 hover:bg-white text-zinc-700"}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-medium text-white shadow-xs transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
