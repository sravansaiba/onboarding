/**
 * Formats an address from various possible representations (plain text,
 * JSON string, structured object from OpenStreetMap / Nominatim, or legacy schema)
 * into a clean, human-readable address string.
 */
export function formatAddress(raw: unknown): string {
  if (raw === null || raw === undefined) return "";

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return "";

    // Check if it's a JSON-encoded string
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return formatAddress(parsed);
        }
      } catch {
        // Not valid JSON, treat as plain text
      }
    }
    return trimmed;
  }

  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;

    // Support both new schema (address_line_1, address_line_2, etc.)
    // and legacy schema (buildingno, floor, area, city, pincode, etc.)
    const line1 = String(obj.address_line_1 || obj.buildingno || obj.street || "").trim();
    const line2 = String(obj.address_line_2 || obj.floor || obj.area || "").trim();
    const landmark = String(obj.landmark || "").trim();
    const city = String(obj.city || obj.town || obj.village || obj.municipality || "").trim();
    const state = String(obj.state || obj.state_district || "").trim();
    const pincode = String(obj.pincode || obj.postcode || obj.postal_code || "").trim();
    const country = String(obj.country || "").trim();

    // If line1 already contains the full address (e.g. from reverse geocoding)
    if (line1 && (!line2 && !city && !state && !pincode)) {
      return line1;
    }

    const rawParts = [line1, line2, landmark, city, state, pincode, country].filter(Boolean);

    // Filter out parts that are already fully contained inside earlier parts
    const parts: string[] = [];
    for (const part of rawParts) {
      const isDuplicate = parts.some(
        (existing) =>
          existing.toLowerCase() === part.toLowerCase() ||
          existing.toLowerCase().includes(part.toLowerCase())
      );
      if (!isDuplicate) {
        parts.push(part);
      }
    }

    if (parts.length > 0) {
      return parts.join(", ");
    }

    // Fallbacks
    if (typeof obj.registered_business_address === "string" && obj.registered_business_address.trim()) {
      return formatAddress(obj.registered_business_address);
    }

    if (typeof obj.full_address === "string" && obj.full_address.trim()) {
      return formatAddress(obj.full_address);
    }

    if (typeof obj.address === "string" && obj.address.trim()) {
      return formatAddress(obj.address);
    }

    if (typeof obj.address === "object" && obj.address !== null) {
      return formatAddress(obj.address);
    }

    // Fallback: extract any string values (excluding coordinates and metadata)
    const ignoredKeys = new Set([
      "latitude",
      "longitude",
      "lat",
      "lng",
      "lon",
      "id",
      "created_at",
      "updated_at",
      "restaurant_id",
    ]);

    const fallbackParts = Object.entries(obj)
      .filter(([k, v]) => !ignoredKeys.has(k.toLowerCase()) && typeof v === "string" && v.trim())
      .map(([, v]) => (v as string).trim());

    if (fallbackParts.length > 0) {
      return fallbackParts.join(", ");
    }
  }

  return String(raw);
}
