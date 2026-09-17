export const CUISINES = [
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
] as const;

export const PACKAGES = [
  "marinate-menu",
  "marinate-dinein",
  "marinate360",
  "marinate-foodtruck",
] as const;

export const PACKAGE_SERVICES_MAP: Record<string, string[]> = {
  "marinate-menu": ["dine_in", "takeaway"],
  "marinate-dinein": ["dine_in", "takeaway"],
  "marinate360": ["dine_in", "delivery", "takeaway", "catering"],
  "marinate-foodtruck": ["dine_in", "takeaway"],
  "foodtruck": ["dine_in", "takeaway"],
};

export function getServicesForPackage(pkg: string): string[] {
  const normalized = (pkg || "marinate-menu").toLowerCase().trim();
  return PACKAGE_SERVICES_MAP[normalized] || ["dine_in", "takeaway"];
}
