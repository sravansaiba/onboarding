"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Upload,
  Utensils,
  X,
} from "lucide-react";
import { createRestaurantWithFormData } from "@/src/app/actions/restaurants";
import { CUISINES, PACKAGES, getServicesForPackage } from "@/src/lib/constants/restaurant-options";

type Props = {
  accessToken: string;
  onClose: () => void;
  onCreated: (restaurantId: string) => void;
};

export default function CreateRestaurantModal({ accessToken, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string>("marinate-menu");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [description, setDescription] = useState("");
  const [about, setAbout] = useState("");
  const [posDomain, setPosDomain] = useState("");

  // Step 2: Cuisines & Images
  const [customCuisineInput, setCustomCuisineInput] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(["North Indian"]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);

  // Step 3: Legal & Documents
  const [panNumber, setPanNumber] = useState("");
  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstNumber, setGstNumber] = useState("");
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [fssaiNumber, setFssaiNumber] = useState("");
  const [fssaiFile, setFssaiFile] = useState<File | null>(null);

  // Auto-mapped services for package
  const activeServices = getServicesForPackage(selectedPackage);

  const toggleCuisine = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      if (selectedCuisines.length === 1) {
        toast.error("At least 1 cuisine is required.");
        return;
      }
      setSelectedCuisines(selectedCuisines.filter((c) => c !== cuisine));
    } else {
      if (selectedCuisines.length >= 5) {
        toast.error("Maximum 5 cuisines allowed.");
        return;
      }
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const addCustomCuisine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customCuisineInput.trim();
    if (!trimmed) return;
    if (selectedCuisines.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Cuisine already selected.");
      return;
    }
    if (selectedCuisines.length >= 5) {
      toast.error("Maximum 5 cuisines allowed.");
      return;
    }
    setSelectedCuisines([...selectedCuisines, trimmed]);
    setCustomCuisineInput("");
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
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
        toast.error("Background file size must be less than 8MB");
        return;
      }
      setBgFile(file);
      setBgPreview(URL.createObjectURL(file));
    }
  };

  const validateStep1 = () => {
    if (!restaurantName.trim()) {
      toast.error("Restaurant name is required.");
      return false;
    }
    if (!address.trim()) {
      toast.error("Address is required.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (selectedCuisines.length === 0) {
      toast.error("Please select at least 1 cuisine.");
      return false;
    }
    return true;
  };

  async function handleSubmit() {
    if (!restaurantName.trim()) {
      toast.error("Restaurant name is required.");
      setStep(1);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("accessToken", accessToken);

      const payload = {
        restaurant_name: restaurantName.trim(),
        email: email.trim() || undefined,
        contact: contact.trim() || undefined,
        address: address.trim(),
        package: selectedPackage,
        services: activeServices,
        cuisines: selectedCuisines,
        pos_domain: posDomain.trim() || undefined,
        time_zone: timeZone,
        description: description.trim() || undefined,
        about: about.trim() || undefined,
        gst_number: gstNumber.trim() || undefined,
        fssai_number: fssaiNumber.trim() || undefined,
      };

      formData.append("payload", JSON.stringify(payload));

      if (logoFile) formData.append("logo_url", logoFile);
      if (bgFile) formData.append("background_image_url", bgFile);
      if (panFile) formData.append("pan_card", panFile);
      if (gstFile) formData.append("gst_certificate", gstFile);
      if (fssaiFile) formData.append("fssai_license", fssaiFile);

      const result = await createRestaurantWithFormData(formData);
      if (result.ok) {
        toast.success(`Restaurant "${restaurantName}" created successfully!`);
        onCreated(result.data.restaurantId);
      } else {
        toast.error(result.error || "Failed to create restaurant.");
      }
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-200">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Create New Restaurant</h3>
              <p className="text-xs text-zinc-500">Step {step} of 3 • Full Registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 border-b border-zinc-100 bg-zinc-50/70 px-6 py-2.5 text-xs font-semibold">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 py-1 ${step === 1 ? "text-orange-600" : "text-zinc-500"}`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${step === 1 ? "bg-orange-500 text-white" : "bg-zinc-200 text-zinc-700"}`}>1</span>
            Basic Details & Package
          </button>
          <button
            onClick={() => validateStep1() && setStep(2)}
            className={`flex items-center gap-2 py-1 ${step === 2 ? "text-orange-600" : "text-zinc-500"}`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${step === 2 ? "bg-orange-500 text-white" : "bg-zinc-200 text-zinc-700"}`}>2</span>
            Cuisines & Branding
          </button>
          <button
            onClick={() => validateStep1() && validateStep2() && setStep(3)}
            className={`flex items-center gap-2 py-1 ${step === 3 ? "text-orange-600" : "text-zinc-500"}`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${step === 3 ? "bg-orange-500 text-white" : "bg-zinc-200 text-zinc-700"}`}>3</span>
            Legal & Certificates
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">
                    Restaurant Name <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g. Biryani Paradise"
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                  <span className="mt-1 block text-[11px] text-zinc-400">
                    Domain name is auto-generated in lowercase format.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">Email Address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@restaurant.com"
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">Contact Number</span>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">
                    Complete Address <span className="text-red-500">*</span>
                  </span>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop/Building, Street, Area, City, Pincode"
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">Operating Package</span>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
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
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              {/* Package Services Mapping Display (Locked / Non-editable) */}
              <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-orange-800">
                    Included Services for {selectedPackage}
                  </span>
                  <span className="text-[11px] font-medium text-orange-600">Auto-configured by package</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeServices.map((service) => (
                    <span
                      key={service}
                      className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-orange-800 shadow-xs"
                    >
                      <CheckCircle2 size={13} className="text-orange-600" />
                      {service.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Cuisines (At most 3) */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-900">
                    Select Cuisines ({selectedCuisines.length} selected) <span className="text-red-500">*</span>
                  </span>
                  <span className="text-xs font-medium text-zinc-500">
                    Up to 5 cuisines or add custom
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CUISINES.map((cuisine) => {
                    const active = selectedCuisines.includes(cuisine);
                    return (
                      <button
                        type="button"
                        key={cuisine}
                        onClick={() => toggleCuisine(cuisine)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:border-orange-300 hover:bg-orange-50/50"
                        }`}
                      >
                        {active && <Check size={12} />}
                        {cuisine}
                      </button>
                    );
                  })}

                  {/* Custom cuisines tags */}
                  {selectedCuisines
                    .filter((c) => !CUISINES.includes(c as any))
                    .map((custom) => (
                      <span
                        key={custom}
                        className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        <Check size={12} />
                        <span>{custom}</span>
                        <button
                          type="button"
                          onClick={() => toggleCuisine(custom as any)}
                          className="hover:text-zinc-200 ml-1"
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

              {/* Logo & Background Image Uploads */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <span className="text-sm font-semibold text-zinc-900">Restaurant Logo</span>
                  <p className="mt-0.5 text-xs text-zinc-500">PNG, JPG or WebP (Max 5MB)</p>
                  
                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 p-4 transition hover:border-orange-400 hover:bg-orange-50/30">
                    {logoPreview ? (
                      <div className="relative h-20 w-32 overflow-hidden rounded-md border border-zinc-200 bg-white">
                        <Image src={logoPreview} alt="Logo preview" fill className="object-contain" />
                      </div>
                    ) : (
                      <>
                        <Upload size={22} className="text-zinc-400" />
                        <span className="mt-1.5 text-xs font-semibold text-zinc-600">Click to upload logo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                  {logoFile && (
                    <p className="mt-2 truncate text-xs text-zinc-500">{logoFile.name}</p>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <span className="text-sm font-semibold text-zinc-900">Background Banner Image</span>
                  <p className="mt-0.5 text-xs text-zinc-500">Storefront or dining image (Max 8MB)</p>
                  
                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 p-4 transition hover:border-orange-400 hover:bg-orange-50/30">
                    {bgPreview ? (
                      <div className="relative h-20 w-32 overflow-hidden rounded-md border border-zinc-200 bg-white">
                        <Image src={bgPreview} alt="Background preview" fill className="object-cover" />
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={22} className="text-zinc-400" />
                        <span className="mt-1.5 text-xs font-semibold text-zinc-600">Click to upload banner</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleBgChange} className="hidden" />
                  </label>
                  {bgFile && (
                    <p className="mt-2 truncate text-xs text-zinc-500">{bgFile.name}</p>
                  )}
                </div>
              </div>

              {/* Description & About */}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">Short Description</span>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Authentic Hyderabadi Biryani and Mandi"
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">About the Brand</span>
                  <input
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="e.g. Serving authentic recipes since 2018"
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-zinc-700">PAN Number</span>
                    <input
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-orange-500"
                    />
                  </label>
                  <div>
                    <span className="mb-1 block text-sm font-semibold text-zinc-700">PAN Card Document</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-zinc-700">GST Number</span>
                    <input
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-orange-500"
                    />
                  </label>
                  <div>
                    <span className="mb-1 block text-sm font-semibold text-zinc-700">GST Certificate</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setGstFile(e.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-zinc-700">FSSAI Number</span>
                    <input
                      value={fssaiNumber}
                      onChange={(e) => setFssaiNumber(e.target.value)}
                      placeholder="14-digit FSSAI Number"
                      className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
                    />
                  </label>
                  <div>
                    <span className="mb-1 block text-sm font-semibold text-zinc-700">FSSAI License Certificate</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setFssaiFile(e.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-6 py-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && validateStep1()) setStep(2);
                else if (step === 2 && validateStep2()) setStep(3);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
              {saving ? "Creating restaurant..." : "Create Restaurant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
