"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Pencil,
  Store,
  XCircle,
} from "lucide-react";
import {
  getMyOnboardingApplication,
  updateMyOnboardingApplication,
  type OnboardingApplication,
} from "@/src/app/actions/onboarding-applications";
import type { AppProfile } from "@/src/app/actions/profiles";

type Props = {
  accessToken: string;
  profile: AppProfile;
  onLogout: () => void;
};

type CustomerView = "overview" | "application" | "documents" | "subscription";

export default function CustomerDashboard({ accessToken, profile, onLogout }: Props) {
  const router = useRouter();
  const [record, setRecord] = useState<OnboardingApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<CustomerView>("overview");

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getMyOnboardingApplication(accessToken);
    if (result.ok) {
      setRecord(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const statusView = useMemo(() => {
    if (!record) return null;
    if (record.status === "accepted") {
      return {
        icon: <CheckCircle2 size={20} />,
        title: "Restaurant is active",
        body: "Your onboarding is approved and your restaurant is live in the system.",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    }
    if (record.status === "rejected") {
      return {
        icon: <XCircle size={20} />,
        title: "Changes requested",
        body: record.review_notes || "Please update your details and submit again.",
        className: "border-rose-200 bg-rose-50 text-rose-800",
      };
    }
    return {
      icon: <Clock size={20} />,
      title: "Application under review",
      body: "A super admin will verify your documents and activate your restaurant.",
      className: "border-orange-200 bg-orange-50 text-orange-800",
    };
  }, [record]);

  async function handleSave(patch: Partial<OnboardingApplication>) {
    if (!record) return;
    setSaving(true);
    const result = await updateMyOnboardingApplication(accessToken, record.id, patch);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setRecord(result.data);
    setEditing(false);
    toast.success("Application updated");
  }

  function handleLogoutRequest() {
    if (!confirm("Are you sure you want to logout?")) return;
    onLogout();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          <p className="mt-4 text-sm font-medium text-zinc-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <Toaster position="top-right" />
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-zinc-100 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Restaurant partner</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">{profile.username || "Partner"}</h1>
              <p className="mt-1 text-sm text-zinc-500">{profile.email}</p>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              <SidebarButton icon={<LayoutDashboard size={18} />} label="Overview" active={activeView === "overview"} onClick={() => setActiveView("overview")} />
              <SidebarButton icon={<Store size={18} />} label="Application" active={activeView === "application"} onClick={() => setActiveView("application")} />
              <SidebarButton icon={<FileText size={18} />} label="Documents" active={activeView === "documents"} onClick={() => setActiveView("documents")} />
              <SidebarButton icon={<CreditCard size={18} />} label="Subscription" active={activeView === "subscription"} onClick={() => setActiveView("subscription")} />
            </nav>
            <div className="border-t border-zinc-100 p-4">
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Restaurant workspace</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {record ? record.restaurant_name : `Welcome, ${profile.username || "partner"}`}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">{record?.domain_name || "Start your onboarding to unlock restaurant setup."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record?.status === "pending" ? (
                    <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                      <Pencil size={16} />
                      Edit application
                    </button>
                  ) : null}
                  <button onClick={handleLogoutRequest} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto lg:hidden">
                <MobileTab label="Overview" active={activeView === "overview"} onClick={() => setActiveView("overview")} />
                <MobileTab label="Application" active={activeView === "application"} onClick={() => setActiveView("application")} />
                <MobileTab label="Documents" active={activeView === "documents"} onClick={() => setActiveView("documents")} />
                <MobileTab label="Subscription" active={activeView === "subscription"} onClick={() => setActiveView("subscription")} />
              </div>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6 xl:px-8">
            {!record ? (
              <EmptyCustomerState onStart={() => router.push("/")} />
            ) : (
              <>
                {statusView ? (
                  <section className={`mb-6 rounded-lg border p-4 ${statusView.className}`}>
                    <div className="flex gap-3">
                      <div className="mt-0.5">{statusView.icon}</div>
                      <div>
                        <h2 className="font-semibold">{statusView.title}</h2>
                        <p className="text-sm">{statusView.body}</p>
                      </div>
                    </div>
                  </section>
                ) : null}

                {activeView === "overview" ? <CustomerOverview record={record} /> : null}
                {activeView === "application" ? <CustomerApplication record={record} /> : null}
                {activeView === "documents" ? <CustomerDocuments record={record} /> : null}
                {activeView === "subscription" ? <CustomerSubscription status={record.status} /> : null}
              </>
            )}
          </div>
        </section>
      </div>

      {record && editing ? <EditModal record={record} saving={saving} onClose={() => setEditing(false)} onSave={handleSave} /> : null}
    </main>
  );
}

function CustomerOverview({ record }: { record: OnboardingApplication }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Application status" value={capitalize(record.status)} sub="Current review state" icon={<Clock size={18} />} />
        <MetricCard label="Package" value={record.package} sub="Current selected plan" icon={<CreditCard size={18} />} />
        <MetricCard label="Orders today" value="0" sub="Will populate after POS integration" icon={<Store size={18} />} />
        <MetricCard label="Subscription" value="Not set" sub="Expiry will show here after launch" icon={<CalendarClock size={18} />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <InfoPanel
          title="Restaurant profile"
          items={[
            ["Owner", record.owner_name],
            ["Email", record.email],
            ["Phone", record.phone],
            ["Primary contact", record.restaurant_primary_contact],
            ["Package", record.package],
            ["Services", record.services.join(", ")],
          ]}
        />
        <InfoPanel
          title="Address"
          items={[
            ["Building", String(record.address?.buildingno ?? "")],
            ["Area", String(record.address?.area ?? "")],
            ["City", String(record.address?.city ?? "")],
            ["Pincode", String(record.address?.pincode ?? "")],
            ["Landmark", String(record.address?.landmark ?? "")],
          ]}
        />
      </section>
    </div>
  );
}

function CustomerApplication({ record }: { record: OnboardingApplication }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <InfoPanel
          title="Legal details"
          items={[
            ["PAN", String(record.legal?.pan_number ?? "N/A")],
            ["Name as PAN", String(record.legal?.fullnameaspan ?? "N/A")],
            ["GST", String(record.legal?.gst_number ?? "Not registered")],
            ["FSSAI", String(record.legal?.fssai_number ?? "N/A")],
            ["FSSAI expiry", String(record.legal?.fssai_expiry ?? "N/A")],
          ]}
        />
        <InfoPanel
          title="Bank details"
          items={[
            ["Account number", String(record.bank?.bank_accno ?? "N/A")],
            ["IFSC", String(record.bank?.ifsc_code ?? "N/A")],
            ["Account type", String(record.bank?.account_type ?? "N/A")],
          ]}
        />
      </div>
      <div className="space-y-4">
        <TagPanel title="Cuisines" values={record.cuisines} />
        <TagPanel title="Services" values={record.services} />
      </div>
    </div>
  );
}

function CustomerDocuments({ record }: { record: OnboardingApplication }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <FileText size={18} className="text-orange-600" />
        Uploaded files
      </h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries({ ...record.images, ...record.documents }).map(([key, asset]) => (
          <a key={key} href={asset.public_url} target="_blank" rel="noreferrer" className="rounded-lg border border-dashed border-orange-200 p-4 hover:bg-orange-50">
            <div className="font-semibold capitalize">{key.replaceAll("_", " ")}</div>
            <div className="mt-1 truncate text-sm text-zinc-500">{asset.original_name}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function CustomerSubscription({ status }: { status: OnboardingApplication["status"] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <CreditCard size={18} className="text-orange-600" />
          Subscription
        </h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <InfoBlock label="Plan status" value={status === "accepted" ? "Ready for activation" : "Pending approval"} />
          <InfoBlock label="Current plan" value="Will sync after subscriptions launch" />
          <InfoBlock label="Plan expiry" value="Not configured yet" />
          <InfoBlock label="Renewal" value="Not configured yet" />
        </div>
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <BarHint />
          Future analytics
        </h3>
        <div className="mt-4 space-y-3">
          <InfoBlock label="Orders today" value="0" />
          <InfoBlock label="Revenue today" value="0" />
          <InfoBlock label="Menu scans" value="0" />
          <InfoBlock label="Last sync" value="Not connected" />
        </div>
      </section>
    </div>
  );
}

function EditModal({
  record,
  saving,
  onClose,
  onSave,
}: {
  record: OnboardingApplication;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: Partial<OnboardingApplication>) => void;
}) {
  const [restaurantName, setRestaurantName] = useState(record.restaurant_name);
  const [ownerName, setOwnerName] = useState(record.owner_name);
  const [phone, setPhone] = useState(record.phone);
  const [primaryContact, setPrimaryContact] = useState(record.restaurant_primary_contact);
  const [building, setBuilding] = useState(String(record.address?.buildingno ?? ""));
  const [floor, setFloor] = useState(String(record.address?.floor ?? ""));
  const [area, setArea] = useState(String(record.address?.area ?? ""));
  const [city, setCity] = useState(String(record.address?.city ?? ""));
  const [pincode, setPincode] = useState(String(record.address?.pincode ?? ""));
  const [landmark, setLandmark] = useState(String(record.address?.landmark ?? ""));
  const [registeredAddress, setRegisteredAddress] = useState(String(record.address?.registered_business_address ?? ""));
  const [cuisines, setCuisines] = useState(record.cuisines.join(", "));
  const [services, setServices] = useState(record.services.join(", "));
  const [panNumber, setPanNumber] = useState(String(record.legal?.pan_number ?? ""));
  const [panName, setPanName] = useState(String(record.legal?.fullnameaspan ?? ""));
  const [gstNumber, setGstNumber] = useState(String(record.legal?.gst_number ?? ""));
  const [fssaiNumber, setFssaiNumber] = useState(String(record.legal?.fssai_number ?? ""));
  const [fssaiExpiry, setFssaiExpiry] = useState(String(record.legal?.fssai_expiry ?? ""));
  const [bankAccount, setBankAccount] = useState(String(record.bank?.bank_accno ?? ""));
  const [ifscCode, setIfscCode] = useState(String(record.bank?.ifsc_code ?? ""));
  const [accountType, setAccountType] = useState(String(record.bank?.account_type ?? "savings"));

  function submit() {
    onSave({
      restaurant_name: restaurantName,
      owner_name: ownerName,
      phone,
      restaurant_primary_contact: primaryContact,
      address: {
        ...record.address,
        buildingno: building,
        floor,
        area,
        city,
        pincode,
        landmark,
        registered_business_address: registeredAddress,
      },
      legal: {
        ...record.legal,
        pan_number: panNumber,
        fullnameaspan: panName,
        gst_number: gstNumber,
        fssai_number: fssaiNumber,
        fssai_expiry: fssaiExpiry,
      },
      bank: {
        ...record.bank,
        bank_accno: bankAccount,
        ifsc_code: ifscCode,
        account_type: accountType,
      },
      cuisines: cuisines.split(",").map((item) => item.trim()).filter(Boolean),
      services: services.split(",").map((item) => item.trim()).filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="border-b p-5">
          <h2 className="text-xl font-semibold">Edit pending application</h2>
          <p className="mt-1 text-sm text-zinc-500">You can update the full submitted data while the application is still pending.</p>
        </div>

        <div className="space-y-6 p-5">
          <EditSection title="Restaurant and owner">
            <FieldGrid>
              <Field label="Restaurant name" value={restaurantName} onChange={setRestaurantName} />
              <Field label="Owner name" value={ownerName} onChange={setOwnerName} />
              <Field label="Phone" value={phone} onChange={setPhone} />
              <Field label="Primary contact" value={primaryContact} onChange={setPrimaryContact} />
              <Field label="Cuisines comma separated" value={cuisines} onChange={setCuisines} className="md:col-span-2" />
              <Field label="Services comma separated" value={services} onChange={setServices} className="md:col-span-2" />
            </FieldGrid>
          </EditSection>

          <EditSection title="Address">
            <FieldGrid>
              <Field label="Building" value={building} onChange={setBuilding} />
              <Field label="Floor" value={floor} onChange={setFloor} />
              <Field label="Area" value={area} onChange={setArea} />
              <Field label="City" value={city} onChange={setCity} />
              <Field label="Pincode" value={pincode} onChange={setPincode} />
              <Field label="Landmark" value={landmark} onChange={setLandmark} />
              <Field label="Registered business address" value={registeredAddress} onChange={setRegisteredAddress} className="md:col-span-2" />
            </FieldGrid>
          </EditSection>

          <EditSection title="Legal and bank">
            <FieldGrid>
              <Field label="PAN number" value={panNumber} onChange={setPanNumber} />
              <Field label="Name as PAN" value={panName} onChange={setPanName} />
              <Field label="GST number" value={gstNumber} onChange={setGstNumber} />
              <Field label="FSSAI number" value={fssaiNumber} onChange={setFssaiNumber} />
              <Field label="FSSAI expiry" value={fssaiExpiry} onChange={setFssaiExpiry} />
              <Field label="Bank account" value={bankAccount} onChange={setBankAccount} />
              <Field label="IFSC code" value={ifscCode} onChange={setIfscCode} />
              <Field label="Account type" value={accountType} onChange={setAccountType} />
            </FieldGrid>
          </EditSection>
        </div>

        <div className="flex justify-end gap-2 border-t bg-zinc-50 p-4">
          <button onClick={onClose} className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-semibold">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="rounded-md bg-orange-500 px-4 py-2 font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
        active ? "bg-orange-50 text-orange-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      {icon}
      {label}
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

function EmptyCustomerState({ onStart }: { onStart: () => void }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
          <Store size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-semibold">No application yet</h3>
        <p className="mt-2 text-zinc-600">Start your restaurant registration and upload the required business documents in one flow.</p>
        <button onClick={onStart} className="mt-6 rounded-md bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600">
          Start onboarding
        </button>
      </div>
    </section>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-100 text-orange-700">{icon}</div>
      </div>
      <p className="mt-3 text-xs font-medium text-zinc-400">{sub}</p>
    </article>
  );
}

function InfoPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <InfoBlock key={label} label={label} value={value || "N/A"} />
        ))}
      </div>
    </section>
  );
}

function TagPanel({ title, values }: { title: string; values: string[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
            {value.replace("_", " ")}
          </span>
        ))}
      </div>
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 break-words text-sm font-medium text-zinc-900">{value}</div>
    </div>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-sm font-semibold text-zinc-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-orange-500"
      />
    </label>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function BarHint() {
  return <MapPin size={18} className="text-orange-600" />;
}
