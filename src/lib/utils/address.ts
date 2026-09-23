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

export interface StructuredAddress {
  address_line_1: string;
  address_line_2: string;
  landmark: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
}

export function buildStructuredAddress(
  raw: unknown,
  coords?: { latitude?: number | string | null; longitude?: number | string | null }
): string {
  let parsed: Record<string, any> = {};

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const candidate = JSON.parse(trimmed);
        if (candidate && typeof candidate === "object") {
          parsed = candidate;
        }
      } catch {
        parsed = {};
      }
    }
    if (!parsed || Object.keys(parsed).length === 0) {
      parsed = { address_line_1: trimmed };
    }
  } else if (typeof raw === "object" && raw !== null) {
    parsed = { ...(raw as Record<string, any>) };
  }

  // Determine latitude
  let lat: number | null = null;
  if (coords?.latitude !== undefined && coords.latitude !== null && coords.latitude !== "") {
    const parsedLat = parseFloat(String(coords.latitude));
    if (!isNaN(parsedLat)) lat = parsedLat;
  }
  if (lat === null && parsed.latitude !== undefined && parsed.latitude !== null && parsed.latitude !== "") {
    const parsedLat = parseFloat(String(parsed.latitude));
    if (!isNaN(parsedLat)) lat = parsedLat;
  }
  if (lat === null && parsed.lat !== undefined && parsed.lat !== null && parsed.lat !== "") {
    const parsedLat = parseFloat(String(parsed.lat));
    if (!isNaN(parsedLat)) lat = parsedLat;
  }

  // Determine longitude
  let lng: number | null = null;
  if (coords?.longitude !== undefined && coords.longitude !== null && coords.longitude !== "") {
    const parsedLng = parseFloat(String(coords.longitude));
    if (!isNaN(parsedLng)) lng = parsedLng;
  }
  if (lng === null && parsed.longitude !== undefined && parsed.longitude !== null && parsed.longitude !== "") {
    const parsedLng = parseFloat(String(parsed.longitude));
    if (!isNaN(parsedLng)) lng = parsedLng;
  }
  if (lng === null && parsed.lng !== undefined && parsed.lng !== null && parsed.lng !== "") {
    const parsedLng = parseFloat(String(parsed.lng));
    if (!isNaN(parsedLng)) lng = parsedLng;
  }
  if (lng === null && parsed.lon !== undefined && parsed.lon !== null && parsed.lon !== "") {
    const parsedLng = parseFloat(String(parsed.lon));
    if (!isNaN(parsedLng)) lng = parsedLng;
  }

  const line1 =
    parsed.address_line_1 ||
    parsed.full_address ||
    parsed.registered_business_address ||
    [parsed.buildingno, parsed.street, parsed.area].filter(Boolean).join(", ").trim() ||
    "";

  const line2 =
    parsed.address_line_2 ||
    parsed.floor ||
    (parsed.address_line_1 ? parsed.area : "") ||
    "";

  const landmark = parsed.landmark || "";
  const city = parsed.city || parsed.town || parsed.village || "";
  const state = parsed.state || parsed.state_district || "Telangana";
  const country = parsed.country || "India";
  const pincode = parsed.pincode || parsed.postcode || parsed.postal_code || "";

  const structured: StructuredAddress = {
    address_line_1: String(line1 || "").trim(),
    address_line_2: String(line2 || "").trim(),
    landmark: String(landmark || "").trim(),
    city: String(city || "").trim(),
    state: String(state || "").trim(),
    country: String(country || "India").trim(),
    pincode: String(pincode || "").trim(),
    latitude: lat,
    longitude: lng,
  };

  return JSON.stringify(structured);
}

export function parseStructuredAddress(raw: unknown): StructuredAddress | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === "object") {
          return {
            address_line_1: String(obj.address_line_1 || obj.buildingno || obj.registered_business_address || "").trim(),
            address_line_2: String(obj.address_line_2 || obj.floor || obj.area || "").trim(),
            landmark: String(obj.landmark || "").trim(),
            city: String(obj.city || "").trim(),
            state: String(obj.state || "").trim(),
            country: String(obj.country || "India").trim(),
            pincode: String(obj.pincode || "").trim(),
            latitude: typeof obj.latitude === "number" ? obj.latitude : (obj.latitude ? parseFloat(obj.latitude) : null),
            longitude: typeof obj.longitude === "number" ? obj.longitude : (obj.longitude ? parseFloat(obj.longitude) : null),
          };
        }
      } catch {}
    }
  } else if (typeof raw === "object" && raw !== null) {
    const obj = raw as any;
    return {
      address_line_1: String(obj.address_line_1 || obj.buildingno || obj.registered_business_address || "").trim(),
      address_line_2: String(obj.address_line_2 || obj.floor || obj.area || "").trim(),
      landmark: String(obj.landmark || "").trim(),
      city: String(obj.city || "").trim(),
      state: String(obj.state || "").trim(),
      country: String(obj.country || "India").trim(),
      pincode: String(obj.pincode || "").trim(),
      latitude: typeof obj.latitude === "number" ? obj.latitude : (obj.latitude ? parseFloat(obj.latitude) : null),
      longitude: typeof obj.longitude === "number" ? obj.longitude : (obj.longitude ? parseFloat(obj.longitude) : null),
    };
  }
  return null;
}

