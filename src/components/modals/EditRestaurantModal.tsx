"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Building2,
  Check,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  updateRestaurantWithFormData,
  deleteRestaurantDocument,
  type RestaurantRecord,
} from "@/src/app/actions/restaurants";
import { type StoredAsset } from "@/src/app/actions/restaurant-images";
import { CUISINES, PACKAGES, getServicesForPackage } from "@/src/lib/constants/restaurant-options";
import { formatAddress } from "@/src/lib/utils/address";

type Props = {
  accessToken: string;
  restaurant: RestaurantRecord;
  onClose: () => void;
  onUpdated: (updated: RestaurantRecord) => void;
};

export default function EditRestaurantModal({
  accessToken,
  restaurant,
  onClose,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  // Editable fields
  const [restaurantName, setRestaurantName] = useState(restaurant.restaurant_name || "");
  const [domainUrl, setDomainUrl] = useState(restaurant.domain_url || "");
  const [posDomain, setPosDomain] = useState(restaurant.pos_domain || "");
  const [email, setEmail] = useState(restaurant.email || "");
  const [contact, setContact] = useState(restaurant.contact ? String(restaurant.contact) : "");
  const [address, setAddress] = useState(formatAddress(restaurant.address));
  const [selectedPackage, setSelectedPackage] = useState(restaurant.package || "marinate-menu");
  const [customCuisineInput, setCustomCuisineInput] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    restaurant.cuisines && restaurant.cuisines.length > 0 ? restaurant.cuisines : ["North Indian"]
  );
  const [description, setDescription] = useState(restaurant.description || "");
  const [about, setAbout] = useState(restaurant.about || "");
  const [gstNumber, setGstNumber] = useState(restaurant.gst_number || "");
  const [fssaiNumber, setFssaiNumber] = useState(restaurant.fssai_number || "");
  const [timeZone, setTimeZone] = useState(restaurant.time_zone || "Asia/Kolkata");

  // Files to upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(restaurant.logo_url || null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(restaurant.background_image_url || null);

  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [fssaiFile, setFssaiFile] = useState<File | null>(null);

  // Existing documents
  const [existingImages, setExistingImages] = useState<StoredAsset[]>(restaurant.images || []);

  const toggleCuisine = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      if (selectedCuisines.length === 1) {
        toast.error("At least 1 cuisine required.");
        return;
      }
      setSelectedCuisines(selectedCuisines.filter((c) => c !== cuisine));
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const addCustomCuisine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customCuisineInput.trim();
    if (!trimmed) return;
    if (selectedCuisines.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Cuisine already added.");
      return;
    }
    setSelectedCuisines([...selectedCuisines, trimmed]);
    setCustomCuisineInput("");
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo must be under 5MB");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error("Background must be under 8MB");
        return;
      }
      setBgFile(file);
      setBgPreview(URL.createObjectURL(file));
    }
  };

  function triggerDeleteDocument(storagePath: string) {
    setDocToDelete(storagePath);
  }

  async function executeDeleteDocument(storagePath: string) {
    setDeletingPath(storagePath);
    try {
      const res = await deleteRestaurantDocument(accessToken, restaurant.id, storagePath);
      if (res.ok) {
        setExistingImages((prev) => prev.filter((img) => img.storage_path !== storagePath));
        toast.success("Document removed from storage.");
        setDocToDelete(null);
      } else {
        toast.error(res.error || "Failed to delete document.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete document.");
    } finally {
      setDeletingPath(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantName.trim()) {
      toast.error("Restaurant name is required.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("accessToken", accessToken);
      formData.append("restaurantId", restaurant.id);

      const payload = {
        restaurant_name: restaurantName.trim(),
        domain_name: restaurant.domain_name,
        domain_url: domainUrl.trim() || undefined,
        pos_domain: posDomain.trim() || undefined,
        email: email.trim() || undefined,
        contact: contact.trim() || undefined,
        address: address.trim(),
        package: selectedPackage,
        services: getServicesForPackage(selectedPackage),
        cuisines: selectedCuisines,
        description: description.trim() || undefined,
        about: about.trim() || undefined,
        gst_number: gstNumber.trim() || undefined,
        fssai_number: fssaiNumber.trim() || undefined,
        time_zone: timeZone,
      };

      formData.append("payload", JSON.stringify(payload));

      if (logoFile) formData.append("logo_url", logoFile);
      if (bgFile) formData.append("background_image_url", bgFile);
      if (panFile) formData.append("pan_card", panFile);
      if (gstFile) formData.append("gst_certificate", gstFile);
      if (fssaiFile) formData.append("fssai_license", fssaiFile);

      const result = await updateRestaurantWithFormData(formData);
      if (result.ok) {
        toast.success("Restaurant details updated successfully!");
        onUpdated(result.data);
      } else {
        toast.error(result.error || "Failed to update restaurant.");
      }
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-200">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Edit Restaurant Details</h3>
              <p className="text-xs text-zinc-500">{restaurant.domain_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Info */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-orange-600 mb-3">
              Basic Restaurant Info
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">
                  Restaurant Name <span className="text-red-500">*</span>
                </span>
                <input
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Food Ordering App URL</span>
                <input
                  value={domainUrl}
                  onChange={(e) => setDomainUrl(e.target.value)}
                  placeholder="e.g. mandi-king.marinate360.com"
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">POS Domain</span>
                <input
                  value={posDomain}
                  onChange={(e) => setPosDomain(e.target.value)}
                  placeholder=""
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Contact Number</span>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Address</span>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Package</span>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                >
                  {PACKAGES.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Time Zone</span>
                <input
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </label>
            </div>
          </div>

          {/* Cuisines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-orange-600">
                Cuisines ({selectedCuisines.length} selected)
              </h4>
              <span className="text-xs text-zinc-400">Click to toggle or add custom below</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CUISINES.map((c) => {
                const active = selectedCuisines.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleCuisine(c)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "bg-orange-500 text-white shadow-xs"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:border-orange-300"
                    }`}
                  >
                    {active && <Check size={11} />}
                    {c}
                  </button>
                );
              })}

              {/* Render custom cuisines not in CUISINES */}
              {selectedCuisines
                .filter((c) => !CUISINES.includes(c as any))
                .map((custom) => (
                  <span
                    key={custom}
                    className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 text-white px-3 py-1 text-xs font-semibold shadow-xs"
                  >
                    <Check size={11} />
                    <span>{custom}</span>
                    <button
                      type="button"
                      onClick={() => toggleCuisine(custom as any)}
                      className="hover:text-zinc-200 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
            </div>

            {/* Custom Cuisine Input */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Add custom cuisine (e.g. Arabian Mandi, Mughlai, Bakery)..."
                value={customCuisineInput}
                onChange={(e) => setCustomCuisineInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomCuisine();
                  }
                }}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => addCustomCuisine()}
                className="rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Images & Visuals */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-orange-600 mb-3">
              Logo & Background Images
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 p-4">
                <span className="text-sm font-semibold text-zinc-900">Restaurant Logo</span>
                <div className="mt-2 flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-white">
                      <Image src={logoPreview} alt="Logo" fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-400">
                      No logo
                    </div>
                  )}
                  <label className="cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50">
                    Replace Logo
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
                {logoFile && <p className="mt-2 text-xs text-emerald-600 font-medium truncate">New: {logoFile.name}</p>}
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <span className="text-sm font-semibold text-zinc-900">Background Image</span>
                <div className="mt-2 flex items-center gap-4">
                  {bgPreview ? (
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-white">
                      <Image src={bgPreview} alt="Background" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-400">
                      No banner
                    </div>
                  )}
                  <label className="cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50">
                    Replace Banner
                    <input type="file" accept="image/*" onChange={handleBgChange} className="hidden" />
                  </label>
                </div>
                {bgFile && <p className="mt-2 text-xs text-emerald-600 font-medium truncate">New: {bgFile.name}</p>}
              </div>
            </div>
          </div>

          {/* Legal Documents & Certificates */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-orange-600 mb-3">
              Certificates & Documents
            </h4>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <span className="text-sm font-semibold text-zinc-900">GST Number & File</span>
                  <input
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="GST Number"
                    className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm uppercase outline-none focus:border-orange-500"
                  />
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setGstFile(e.target.files?.[0] || null)}
                    className="mt-2 w-full text-xs"
                  />
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <span className="text-sm font-semibold text-zinc-900">FSSAI Number & File</span>
                  <input
                    value={fssaiNumber}
                    onChange={(e) => setFssaiNumber(e.target.value)}
                    placeholder="FSSAI Number"
                    className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                  />
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setFssaiFile(e.target.files?.[0] || null)}
                    className="mt-2 w-full text-xs"
                  />
                </div>
              </div>

              {/* Existing uploaded documents */}
              {existingImages.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                    Existing Uploaded Documents ({existingImages.length})
                  </span>
                  <div className="mt-3 divide-y divide-zinc-200">
                    {existingImages.map((doc) => (
                      <div key={doc.storage_path} className="flex items-center justify-between py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className="text-orange-600 shrink-0" />
                          <span className="truncate font-medium text-zinc-800">{doc.original_name}</span>
                          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 uppercase">
                            {doc.image_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={doc.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                          >
                            <ExternalLink size={12} />
                            View
                          </a>
                          <button
                            type="button"
                            disabled={deletingPath === doc.storage_path}
                            onClick={() => triggerDeleteDocument(doc.storage_path)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Document Confirmation Modal */}
      {docToDelete && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Document?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Permanently delete this verification document from storage? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={Boolean(deletingPath)}
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingPath)}
                onClick={() => executeDeleteDocument(docToDelete)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {deletingPath ? "Deleting..." : "Delete Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
