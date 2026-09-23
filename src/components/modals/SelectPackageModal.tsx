"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

export const PACKAGES = {
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

export type PackageKey = keyof typeof PACKAGES;

export type SelectPackageModalProps = {
  onClose: () => void;
  onSelect: (pkgKey: string, services: string[]) => void;
  isDark?: boolean;
};

export default function SelectPackageModal({
  onClose,
  onSelect,
  isDark = false,
}: SelectPackageModalProps) {
  const [selectedKey, setSelectedKey] = useState<PackageKey>("marinate-menu");

  const selected = PACKAGES[selectedKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${
          isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? "border-zinc-800" : "border-zinc-200"
          }`}
        >
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
          {(
            Object.entries(PACKAGES) as Array<
              [PackageKey, (typeof PACKAGES)[PackageKey]]
            >
          ).map(([key, pkg]) => {
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

                <ul
                  className={`mt-4 pt-3 border-t space-y-1.5 ${
                    isDark ? "border-zinc-800" : "border-zinc-100"
                  }`}
                >
                  {pkg.points.map((pt) => (
                    <li key={pt} className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-4 border-t flex items-center justify-end gap-2.5 ${
            isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border text-xs font-medium transition ${
              isDark
                ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                : "border-zinc-200 hover:bg-white text-zinc-700"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSelect(selectedKey, [...selected.services])}
            className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-semibold text-white shadow-xs transition"
          >
            Continue to Registration
          </button>
        </div>
      </div>
    </div>
  );
}
