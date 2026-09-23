/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Lock, Globe, Store, Shield, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import { submitOnboardingApplication, updateMyOnboardingApplicationWithFormData, getMyOnboardingApplication } from "@/src/app/actions/onboarding-applications";
import { createRestaurantWithFormData, updateRestaurantWithFormData, getRestaurantDetails } from "@/src/app/actions/restaurants";
import { supabase } from "@/src/lib/supabase/client";
import { getAuthSession } from "@/src/lib/auth-storage";

// Define types for clarity
type DayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
type CountryCode = "+91" | "+1" | "+44" | "+971";
type ServiceType = "dine_in" | "delivery" | "takeaway" | "catering";
type AccountType = "savings" | "current" | "checking";
type TimingMode = "all_days" | "custom_days" | "same_time" | "day_wise";

interface TimeSlot {
  open_time: string;
  close_time: string;
}

interface ErrorMap {
  [key: string]: string;
}

interface ResolvedAddress {
  buildingno?: string;
  floor?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  landmark?: string;
  address_line_1?: string;
  address_line_2?: string;
  fullAddress?: string;
}

interface User {
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: string | undefined;
}

const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const COUNTRY_CODES: Array<{ code: CountryCode; country: string; flag: string }> = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
];
const CUISINES = [
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
const TIME_SLOTS = [
  "12:00 ",
  "1:00",
  "2:00",
  "3:00",
  "4:00",
  "5:00",
  "6:00",
  "7:00",
  "8:00",
  "9:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00 ",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
  "23:59",
];

// Google Maps Location Picker Component
const LocationPicker = ({
  onLocationSelect,
  onAddressResolved,
  initialLocation,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  onAddressResolved: (address: ResolvedAddress) => void;
  initialLocation: { lat: number; lng: number } | null;
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load Google Maps SDK
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).google && (window as any).google.maps) {
      setMapLoaded(true);
      return;
    }

    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_CLIENT_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      "";

    const scriptId = "google-maps-js-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).google && (window as any).google.maps) {
        setMapLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setMapLoaded(true));
        existingScript.addEventListener("error", () =>
          setLoadError("Failed to initialize Google Maps. Please verify NEXT_PUBLIC_GOOGLE_MAPS_CLIENT_KEY.")
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapLoaded(true);
    };
    script.onerror = () => {
      setLoadError("Failed to load Google Maps SDK. Please check NEXT_PUBLIC_GOOGLE_MAPS_CLIENT_KEY in .env");
    };
    document.head.appendChild(script);
  }, []);

  // Helper to extract address components from Geocoder result
  const extractAddressFromComponents = (
    addressComponents: any[],
    fallbackLandmark?: string,
    formattedAddress?: string
  ) => {
    const getComp = (types: string[]) => {
      const found = addressComponents?.find((c: any) =>
        types.some((t: string) => c.types.includes(t))
      );
      return found ? found.long_name : "";
    };

    const streetNumber = getComp(["street_number"]);
    const route = getComp(["route"]);
    const subpremise = getComp(["subpremise", "premise"]);
    const building = [subpremise, streetNumber, route].filter(Boolean).join(" ").trim() || route;

    const sublocality = getComp(["sublocality_level_1", "sublocality", "neighborhood"]) || route;
    const locality = getComp(["locality", "administrative_area_level_2"]);
    const administrativeArea = getComp(["administrative_area_level_1"]);
    const country = getComp(["country"]) || "India";
    const postalCode = getComp(["postal_code"]);
    const landmark = fallbackLandmark || getComp(["point_of_interest", "establishment", "sublocality_level_2"]);

    onAddressResolved({
      buildingno: building || "",
      area: sublocality || "",
      city: locality || "",
      state: administrativeArea || "Telangana",
      country: country || "India",
      pincode: postalCode ? postalCode.trim().slice(0, 10) : "",
      landmark: landmark || "",
      fullAddress: formattedAddress || "",
      address_line_1: formattedAddress || [building, sublocality].filter(Boolean).join(", "),
      address_line_2: [route, sublocality].filter(Boolean).join(", ") || "",
    });
  };

  const reverseGeocode = (lat: number, lng: number) => {
    const google = (window as any).google;
    if (!google || !google.maps) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
      if (status === "OK" && results && results[0]) {
        extractAddressFromComponents(results[0].address_components, undefined, results[0].formatted_address);
      }
    });
  };

  // Initialize Map & Marker
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current) return;
    const google = (window as any).google;
    if (!google || !google.maps) return;

    const center = initialLocation
      ? { lat: initialLocation.lat, lng: initialLocation.lng }
      : { lat: 17.385044, lng: 78.486671 };

    const map = new google.maps.Map(mapContainerRef.current, {
      center,
      zoom: initialLocation ? 16 : 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    const marker = new google.maps.Marker({
      position: center,
      map,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });
    markerInstanceRef.current = marker;

    // Marker dragend
    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) {
        const lat = pos.lat();
        const lng = pos.lng();
        onLocationSelect(lat, lng);
        reverseGeocode(lat, lng);
      }
    });

    // Map click
    map.addListener("click", (e: any) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        onLocationSelect(lat, lng);
        reverseGeocode(lat, lng);
      }
    });

    // Google Places Autocomplete on Search input
    if (searchInputRef.current && google.maps.places) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry", "formatted_address", "address_components", "name"],
      });
      autocomplete.bindTo("bounds", map);
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        map.setCenter({ lat, lng });
        map.setZoom(16);
        marker.setPosition({ lat, lng });
        onLocationSelect(lat, lng);

        if (place.address_components) {
          extractAddressFromComponents(place.address_components, place.name, place.formatted_address);
        } else {
          reverseGeocode(lat, lng);
        }
        toast.success("Location set from Google Places!");
      });
      autocompleteRef.current = autocomplete;
    }
  }, [mapLoaded]);

  // Sync map and marker when initialLocation loads asynchronously
  useEffect(() => {
    if (initialLocation && mapInstanceRef.current && markerInstanceRef.current) {
      const google = (window as any).google;
      if (google && google.maps) {
        const latLng = new google.maps.LatLng(initialLocation.lat, initialLocation.lng);
        mapInstanceRef.current.setCenter(latLng);
        mapInstanceRef.current.setZoom(16);
        markerInstanceRef.current.setPosition(latLng);
      }
    }
  }, [initialLocation?.lat, initialLocation?.lng]);

  // Handle manual Enter / click search
  const handleManualSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a location to search");
      return;
    }
    const google = (window as any).google;
    if (!google || !google.maps) return;

    setIsSearching(true);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results: any, status: string) => {
      setIsSearching(false);
      if (status === "OK" && results && results[0]) {
        const res = results[0];
        const lat = res.geometry.location.lat();
        const lng = res.geometry.location.lng();
        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(16);
          markerInstanceRef.current.setPosition({ lat, lng });
          onLocationSelect(lat, lng);
          extractAddressFromComponents(res.address_components, undefined, res.formatted_address);
          toast.success("Location found on map!");
        }
      } else {
        toast.error("Location not found. Please try another search.");
      }
    });
  };

  // Instant My Location (fast, zero lag)
  const getCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapInstanceRef.current && markerInstanceRef.current) {
          const google = (window as any).google;
          const latLng = new google.maps.LatLng(lat, lng);
          mapInstanceRef.current.panTo(latLng);
          mapInstanceRef.current.setZoom(16);
          markerInstanceRef.current.setPosition(latLng);
          onLocationSelect(lat, lng);
          reverseGeocode(lat, lng);
          toast.success("Current location set!");
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error(err.message || "Failed to retrieve current location");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-xs transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
        >
          <MapPin className="w-4 h-4" />
          <span>{isLocating ? "Locating..." : "Use My Location"}</span>
        </button>

        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            placeholder="Search area, landmark, or street name..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
          />
        </div>

        <button
          type="button"
          onClick={handleManualSearch}
          disabled={isSearching}
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl font-semibold text-xs transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      <div className="relative w-full h-96 rounded-xl border border-gray-300 overflow-hidden shadow-2xs">
        <div ref={mapContainerRef} className="w-full h-full" />
        {!mapLoaded && !loadError && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-500">
              <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading Google Maps...</span>
            </div>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 bg-amber-50/90 flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="w-8 h-8 text-amber-600 mb-2" />
            <p className="text-sm font-semibold text-amber-800">{loadError}</p>
            <p className="text-xs text-amber-600 mt-1">Make sure NEXT_PUBLIC_GOOGLE_MAPS_CLIENT_KEY is present in your environment.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 flex items-center gap-1">
        <strong className="text-gray-700">Tip:</strong> Click anywhere on the map or drag the pin marker to automatically fill your address details below.
      </p>
    </div>
  );
};

// Define the shape of formData state
interface FormDataState {
  // Step 1: Restaurant Information
  restaurant_name: string;
  fullname: string;
  email: string;
  phone_country_code: CountryCode;
  phone: string;
  restaurant_primary_contact: string;
  same_as_owner: boolean;
  primary_country_code: CountryCode;
  buildingno: string;
  floor: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  landmark: string;
  address_line_1: string;
  address_line_2: string;
  latitude: string;
  longitude: string;
  logo_url: File | null;
  background_image_url: File | null;
  cuisines: string[];
  services: ServiceType[];
  restaurant_timing_mode: TimingMode;
  restaurant_all_day_timing: TimeSlot;
  restaurant_custom_timings: Partial<Record<DayName, TimeSlot[]>>; // Use Partial Record for optional days
  delivery_timing_mode: TimingMode;
  delivery_same_timing: TimeSlot;
  delivery_days: DayName[];
  delivery_custom_timings: Partial<Record<DayName, TimeSlot[]>>;
  takeaway_timing_mode: TimingMode;
  takeaway_same_timing: TimeSlot;
  takeaway_days: DayName[];
  takeaway_custom_timings: Partial<Record<DayName, TimeSlot[]>>;
  pan_number: string;
  fullnameaspan: string;
  registered_business_address: string;
  pan_card: File | null;
  gst: boolean;
  gst_number: string;
  gst_certificate: File | null;
  fssai_number: string;
  fssai_expiry: string;
  fssai_license: File | null;
  bank_accno: string;
  bank_accno_confirm: string;
  ifsc_code: string;
  account_type: AccountType;
}

export default function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormDataState>({
    // Step 1: Restaurant Information
    restaurant_name: "",
    fullname: "",
    email: "",
    phone_country_code: "+91",
    phone: "",
    restaurant_primary_contact: "",
    same_as_owner: true,
    primary_country_code: "+91",
    buildingno: "",
    floor: "",
    area: "",
    city: "",
    state: "Telangana",
    country: "India",
    pincode: "",
    landmark: "",
    address_line_1: "",
    address_line_2: "",
    latitude: "",
    longitude: "",
    logo_url: null,
    background_image_url: null,
    cuisines: [],
    services: [],
    restaurant_timing_mode: "all_days",
    restaurant_all_day_timing: { open_time: "9:00", close_time: "23:00 " },
    restaurant_custom_timings: {}, // Initialize as empty object
    delivery_timing_mode: "same_time",
    delivery_same_timing: { open_time: "10:00 am", close_time: "22:00 " },
    delivery_days: [],
    delivery_custom_timings: {}, // Initialize as empty object
    takeaway_timing_mode: "same_time",
    takeaway_same_timing: { open_time: "10:00 ", close_time: "22:00 " },
    takeaway_days: [],
    takeaway_custom_timings: {}, // Initialize as empty object
    pan_number: "",
    fullnameaspan: "",
    registered_business_address: "",
    pan_card: null,
    gst: false,
    gst_number: "",
    gst_certificate: null,
    fssai_number: "",
    fssai_expiry: "",
    fssai_license: null,
    bank_accno: "",
    bank_accno_confirm: "",
    ifsc_code: "",
    account_type: "savings",
  });


  useEffect(() => {
    async function loadUserSession() {
      let email = "";
      let fullname = "";
      let hasToken = false;
      let detectedRole = "customer";

      // 1. First priority: Cookie session via getAuthSession
      try {
        const session = getAuthSession();
        if (session.isLoggedIn && session.accessToken) {
          hasToken = true;
          setSessionAccessToken(session.accessToken);
        }
        if (session.user?.role) {
          detectedRole = session.user.role;
          setUserRole(session.user.role);
        }
        if (session.user) {
          if (typeof session.user.email === "string" && session.user.email.trim()) {
            email = session.user.email.trim();
          }
          if (typeof session.user.username === "string" && session.user.username.trim()) {
            fullname = session.user.username.trim();
          } else if (typeof session.user.name === "string" && session.user.name.trim()) {
            fullname = session.user.name.trim();
          }
        }
      } catch (e) {
        console.warn("Error reading auth session:", e);
      }

      // 2. Second priority: Supabase active auth session / user
      if (!email || !hasToken) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.email) {
            email = userData.user.email.trim();
            fullname =
              fullname ||
              userData.user.user_metadata?.username ||
              userData.user.user_metadata?.name ||
              userData.user.user_metadata?.full_name ||
              "";
            if (userData.user.user_metadata?.role) {
              detectedRole = userData.user.user_metadata.role;
              setUserRole(userData.user.user_metadata.role);
            }
          }
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.access_token) {
            hasToken = true;
            setSessionAccessToken(sessionData.session.access_token);
            if (!email && sessionData.session.user?.email) {
              email = sessionData.session.user.email.trim();
            }
          }
        } catch (e) {
          console.warn("Supabase auth lookup error:", e);
        }
      }

      // 3. Third priority: LocalStorage / SessionStorage fallbacks
      if (typeof window !== "undefined") {
        try {
          const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed?.role) {
              detectedRole = parsed.role;
              setUserRole(parsed.role);
            }
            if (!email && parsed?.email) email = parsed.email.trim();
            if (!fullname && (parsed?.username || parsed?.name)) fullname = fullname || parsed.username || parsed.name;
          }
          if (!email) {
            const directEmail = sessionStorage.getItem("email") || localStorage.getItem("email");
            if (directEmail) email = directEmail.trim();
          }
        } catch (e) {
          console.warn("Storage fallback error:", e);
        }
      }

      // If user is not signed in, redirect to login
      if (!hasToken && !email) {
        toast.error("Please sign in to register your restaurant");
        router.push("/login");
        return;
      }

      // Prefill ONLY for customers! Staff and super_admin will enter the restaurant owner's name and email manually.
      const isStaffOrAdminSession = detectedRole === "staff" || detectedRole === "super_admin";
      if (!isStaffOrAdminSession) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && emailRegex.test(email)) {
          setFormData((prev) => ({
            ...prev,
            email,
            ...(fullname && !prev.fullname ? { fullname } : {}),
          }));
        }
      }
    }

    loadUserSession();
  }, [router]);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [previewImages, setPreviewImages] = useState<{
    logo_url: string | null;
    background_image_url: string | null;
    pan_card: string | null;
    gst_certificate: string | null;
    fssai_license: string | null;
  }>({
    logo_url: null,
    background_image_url: null,
    pan_card: null,
    gst_certificate: null,
    fssai_license: null,
  });
  const [packagename, setPackageName] = useState<string | null>("");
  const [userRole, setUserRole] = useState<string>("customer");
  const [sessionAccessToken, setSessionAccessToken] = useState<string>("");
  const [domainUrl, setDomainUrl] = useState<string>("");
  const [posDomain, setPosDomain] = useState<string>("");
  const [customCuisineInput, setCustomCuisineInput] = useState<string>("");
  const [editAppId, setEditAppId] = useState<string | null>(null);
  const [editRestaurantId, setEditRestaurantId] = useState<string | null>(null);
  const [isLiveRestaurantEdit, setIsLiveRestaurantEdit] = useState<boolean>(false);

  const isUS = Boolean(
    formData.country?.trim().toLowerCase().includes("united states") ||
    formData.country?.trim().toLowerCase().includes("usa") ||
    formData.country?.trim().toLowerCase() === "us"
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const servicesParam = urlParams.get("services");
    const packageParam = urlParams.get("package");
    const editRestId = urlParams.get("editRestaurantId");
    if (editRestId) {
      setEditRestaurantId(editRestId);
      setIsLiveRestaurantEdit(true);
      (async () => {
        try {
          const authSession = getAuthSession();
          const supabaseSession = await supabase.auth.getSession();
          const token = authSession.accessToken || supabaseSession.data.session?.access_token || "";

          let restData: any = null;
          if (token) {
            const res = await getRestaurantDetails(token, editRestId);
            if (res.ok && res.data) {
              restData = res.data;
            }
          }
          if (!restData) {
            // Client-side direct query fallback
            const { data: directData } = await supabase
              .from("restaurants")
              .select("*")
              .eq("id", editRestId)
              .maybeSingle();
            if (directData) {
              restData = directData;
            }
          }

          if (restData) {
            if (!restData.fullname && !restData.owner_name) {
              const oInfo = restData.other_info && typeof restData.other_info === "object" ? restData.other_info : {};
              if (oInfo.fullname || oInfo.owner_name) {
                restData.fullname = oInfo.fullname || oInfo.owner_name;
              } else {
                try {
                  const { data: prof } = await supabase
                    .from("profiles")
                    .select("username, first_name, last_name, email")
                    .or(`restaurant_id.eq.${editRestId},email.eq.${restData.email}`)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if (prof) {
                    const combined = [prof.first_name, prof.last_name].filter(Boolean).join(" ");
                    restData.fullname = combined || prof.username || "";
                  }
                } catch (e) {}
              }
            }

            const rest: any = restData;
            let addrObj: any = {};
            if (typeof rest.raw_address === "object" && rest.raw_address !== null) {
              addrObj = rest.raw_address;
            } else if (typeof rest.raw_address === "string") {
              try { addrObj = JSON.parse(rest.raw_address); } catch {}
            }

            if (Object.keys(addrObj).length === 0) {
              if (typeof rest.address === "object" && rest.address !== null) {
                addrObj = rest.address;
              } else if (typeof rest.address === "string") {
                const trimmed = rest.address.trim();
                if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                  try { addrObj = JSON.parse(trimmed); } catch {}
                }
              }
            }

            let lat = "";
            let lng = "";
            if (addrObj.latitude !== undefined && addrObj.latitude !== null && addrObj.latitude !== "") {
              lat = String(addrObj.latitude);
            }
            if (addrObj.longitude !== undefined && addrObj.longitude !== null && addrObj.longitude !== "") {
              lng = String(addrObj.longitude);
            }
            if ((!lat || !lng) && rest.mapEmbedUrl && rest.mapEmbedUrl.includes("[")) {
              try {
                const coords = JSON.parse(rest.mapEmbedUrl);
                if (Array.isArray(coords) && coords.length === 2) {
                  lat = String(coords[0]);
                  lng = String(coords[1]);
                }
              } catch (e) {}
            }

            const buildingno =
              addrObj.address_line_1 ||
              addrObj.buildingno ||
              (typeof rest.address === "string" && !rest.address.startsWith("{") ? rest.address.split(",")[0]?.trim() : "") ||
              "";

            const floor = addrObj.address_line_2 || addrObj.floor || "";
            const area =
              addrObj.area ||
              (addrObj.address_line_2 && addrObj.address_line_2 !== floor ? addrObj.address_line_2 : "") ||
              (typeof rest.address === "string" && !rest.address.startsWith("{") && rest.address.includes(",") ? rest.address.split(",")[1]?.trim() : "") ||
              buildingno;

            const city =
              addrObj.city ||
              (typeof rest.address === "string" && !rest.address.startsWith("{") && rest.address.includes(",") ? rest.address.split(",")[2]?.trim() : "Hyderabad");

            const pincode =
              addrObj.pincode ||
              (typeof rest.address === "string" ? rest.address.match(/\b\d{6}\b/)?.[0] || "" : "");

            const landmark = addrObj.landmark || "";
            const state = addrObj.state || "Telangana";
            const country = addrObj.country || "India";

            const otherInfo = rest.other_info && typeof rest.other_info === "object" ? rest.other_info : {};

            setFormData((prev) => ({
              ...prev,
              fullname: rest.fullname || rest.owner_name || otherInfo.fullname || otherInfo.owner_name || (rest.creator_name ? rest.creator_name : "") || prev.fullname,
              restaurant_name: rest.restaurant_name || prev.restaurant_name,
              email: rest.email || prev.email,
              phone: rest.contact ? String(rest.contact).slice(-10) : prev.phone,
              restaurant_primary_contact: rest.contact ? String(rest.contact).slice(-10) : prev.restaurant_primary_contact,
              buildingno: buildingno || prev.buildingno,
              floor: floor || prev.floor,
              area: area || prev.area,
              city: city || prev.city,
              state: state || prev.state,
              country: country || prev.country,
              pincode: pincode || prev.pincode,
              landmark: landmark || prev.landmark,
              address_line_1: addrObj.address_line_1 || prev.address_line_1,
              address_line_2: addrObj.address_line_2 || prev.address_line_2,
              latitude: lat || prev.latitude,
              longitude: lng || prev.longitude,
              cuisines: Array.isArray(rest.cuisines) && rest.cuisines.length > 0 ? rest.cuisines : prev.cuisines,
              services: Array.isArray(rest.services) && rest.services.length > 0 ? (rest.services as ServiceType[]) : prev.services,
              pan_number: rest.pan_number || otherInfo.pan_number || prev.pan_number,
              fullnameaspan: rest.fullnameaspan || otherInfo.fullnameaspan || prev.fullnameaspan,
              registered_business_address: rest.registered_business_address || otherInfo.registered_business_address || prev.registered_business_address,
              gst: Boolean(rest.gst_number),
              gst_number: rest.gst_number || prev.gst_number,
              fssai_number: rest.fssai_number || otherInfo.fssai_number || prev.fssai_number,
              fssai_expiry: rest.fssai_expiry || otherInfo.fssai_expiry || prev.fssai_expiry,
              bank_accno: rest.bank_accno || otherInfo.bank_accno || prev.bank_accno,
              bank_accno_confirm: rest.bank_accno || otherInfo.bank_accno || prev.bank_accno_confirm,
              ifsc_code: rest.ifsc_code || otherInfo.ifsc_code || prev.ifsc_code,
              account_type: (rest.account_type || otherInfo.account_type || prev.account_type || "savings") as AccountType,
            }));

            if (rest.domain_url) setDomainUrl(rest.domain_url);
            if (rest.pos_domain) setPosDomain(rest.pos_domain);
            if (rest.package) setPackageName(rest.package);

            setPreviewImages((prev) => ({
              ...prev,
              ...(rest.logo_url ? { logo_url: rest.logo_url } : {}),
              ...(rest.background_image_url ? { background_image_url: rest.background_image_url } : {}),
              ...(rest.pan_card_url || otherInfo.pan_card_url ? { pan_card: rest.pan_card_url || otherInfo.pan_card_url } : {}),
              ...(rest.gst_certificate_url || otherInfo.gst_certificate_url ? { gst_certificate: rest.gst_certificate_url || otherInfo.gst_certificate_url } : {}),
              ...(rest.fssai_license_url || otherInfo.fssai_license_url ? { fssai_license: rest.fssai_license_url || otherInfo.fssai_license_url } : {}),
            }));
          }
        } catch (err) {
          console.warn("Could not load restaurant details for editing:", err);
        }
      })();
    }

    const editId = urlParams.get("editApplicationId");
    if (editId) {
      setEditAppId(editId);
      (async () => {
        try {
          const authSession = getAuthSession();
          const supabaseSession = await supabase.auth.getSession();
          const token = authSession.accessToken || supabaseSession.data.session?.access_token || "";
          if (token) {
            const res = await getMyOnboardingApplication(token);
            if (res.ok && res.data) {
              const app = res.data;
              let lat = "";
              let lng = "";
              if (app.mapEmbedUrl && app.mapEmbedUrl.includes("[")) {
                try {
                  const coords = JSON.parse(app.mapEmbedUrl);
                  if (Array.isArray(coords) && coords.length === 2) {
                    lat = String(coords[0]);
                    lng = String(coords[1]);
                  }
                } catch (e) {}
              }
              setFormData((prev) => ({
                ...prev,
                restaurant_name: app.restaurant_name || prev.restaurant_name,
                fullname: app.owner_name || prev.fullname,
                email: app.email || prev.email,
                phone: app.phone ? app.phone.slice(-10) : prev.phone,
                restaurant_primary_contact: app.restaurant_primary_contact ? app.restaurant_primary_contact.slice(-10) : prev.restaurant_primary_contact,
                buildingno: (app.address as any)?.buildingno || (app.address as any)?.address_line1 || prev.buildingno,
                area: (app.address as any)?.area || prev.area,
                city: (app.address as any)?.city || prev.city,
                pincode: (app.address as any)?.pincode || prev.pincode,
                landmark: (app.address as any)?.landmark || prev.landmark,
                latitude: lat || prev.latitude,
                longitude: lng || prev.longitude,
                cuisines: Array.isArray(app.cuisines) && app.cuisines.length > 0 ? app.cuisines : prev.cuisines,
                services: Array.isArray(app.services) && app.services.length > 0 ? (app.services as ServiceType[]) : prev.services,
                pan_number: (app.legal as any)?.pan_number || prev.pan_number,
                fullnameaspan: (app.legal as any)?.fullnameaspan || prev.fullnameaspan,
                gst: Boolean((app.legal as any)?.gst_number),
                gst_number: (app.legal as any)?.gst_number || prev.gst_number,
                fssai_number: (app.legal as any)?.fssai_number || prev.fssai_number,
                fssai_expiry: (app.legal as any)?.fssai_expiry || prev.fssai_expiry,
                bank_accno: (app.bank as any)?.bank_accno || prev.bank_accno,
                bank_accno_confirm: (app.bank as any)?.bank_accno || prev.bank_accno_confirm,
                ifsc_code: (app.bank as any)?.ifsc_code || prev.ifsc_code,
                account_type: ((app.bank as any)?.account_type || prev.account_type || "savings") as AccountType,
                registered_business_address: (app.legal as any)?.address || prev.registered_business_address,
              }));
              if (app.package) {
                setPackageName(app.package);
              }
              setPreviewImages((prev) => ({
                ...prev,
                ...((app as any).logo_url ? { logo_url: (app as any).logo_url } : {}),
                ...((app as any).background_image_url ? { background_image_url: (app as any).background_image_url } : {}),
                ...((app.legal as any)?.pan_card_url ? { pan_card: (app.legal as any).pan_card_url } : {}),
                ...((app.legal as any)?.gst_certificate_url ? { gst_certificate: (app.legal as any).gst_certificate_url } : {}),
                ...((app.legal as any)?.fssai_license_url ? { fssai_license: (app.legal as any).fssai_license_url } : {}),
              }));
            }
          }
        } catch (e) {
          console.warn("Could not load application details for editing:", e);
        }
      })();
    }
    setPackageName(packageParam)
    if (servicesParam) {
      const servicesArray = servicesParam.split(",").filter((service) => service.trim() !== "");
      const validServices = servicesArray.filter((service) =>
        ["dine_in", "delivery", "takeaway", "catering"].includes(service)
      ) as ServiceType[];
      if (validServices.length > 0) {
        updateField("services", validServices);
      }
    }
    console.log("Package:", packageParam);
    console.log("Services from URL:", servicesParam);
    if (servicesParam) {
      const parsedServices = servicesParam.split(",").filter((service) => service.trim() !== "");
      const hasDelivery = parsedServices.includes("delivery");
      const hasTakeaway = parsedServices.includes("takeaway");
      if (hasDelivery) {
        updateField("delivery_days", [...DAYS]);
      }
      if (hasTakeaway) {
        updateField("takeaway_days", [...DAYS]);
      }
    }
  }, []);

  const updateField = <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.restaurant_name.trim()) newErrors.restaurant_name = "Restaurant name required";
    if (!formData.fullname.trim()) newErrors.fullname = "Owner name required";
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = "Valid email required";
    if (!formData.phone.match(/^\d{10}$/)) newErrors.phone = "Valid 10-digit phone required";
    if (!formData.same_as_owner && !formData.restaurant_primary_contact.match(/^\d{10}$/)) {
      newErrors.restaurant_primary_contact = "Valid 10-digit phone required";
    }
    if (!formData.buildingno.trim()) newErrors.buildingno = "Building/Shop number required";
    if (!formData.area.trim()) newErrors.area = "Area required";
    if (!formData.city.trim()) newErrors.city = "City required";

    const isUS =
      formData.country?.toLowerCase().includes("united states") ||
      formData.country?.toLowerCase().includes("usa") ||
      formData.country?.toLowerCase() === "us";

    const cleanedPincode = formData.pincode.trim();
    if (!cleanedPincode) {
      newErrors.pincode = isUS ? "ZIP code required" : "Postal / PIN code required";
    } else if (isUS) {
      if (!/^\d{5}(-\d{4})?$/.test(cleanedPincode)) {
        newErrors.pincode = "Valid 5-digit US ZIP code required (e.g. 95630)";
      }
    } else {
      if (!/^\d{5,6}(-\d{4})?$/.test(cleanedPincode)) {
        newErrors.pincode = "Valid postal / PIN code required (e.g. 500072 or 95630)";
      }
    }

    const hasValidCoords =
      formData.latitude &&
      formData.longitude &&
      !isNaN(parseFloat(formData.latitude)) &&
      !isNaN(parseFloat(formData.longitude)) &&
      parseFloat(formData.latitude) !== 0 &&
      parseFloat(formData.longitude) !== 0;

    if (!hasValidCoords) {
      newErrors.location = "Restaurant map location (latitude & longitude) is missing! Please click 'Use My Location', search your address, or click on the map to pin your location.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.logo_url && !previewImages.logo_url) newErrors.logo_url = "Please upload restaurant logo";
    if (formData.cuisines.length === 0) newErrors.cuisines = "Select at least 1 cuisine";
    if (formData.cuisines.length > 3) newErrors.cuisines = "Maximum 3 cuisines allowed";
    // Services are now auto-set, so no validation needed for them here
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (!isUS) {
      if (!formData.pan_number.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
        newErrors.pan_number = "Valid PAN required (e.g., ABCDE1234F)";
      }
      if (!formData.fullnameaspan.trim()) newErrors.fullnameaspan = "Full name as per PAN required";
      if (!formData.registered_business_address.trim())
        newErrors.registered_business_address = "Registered business address required";
      if (!formData.pan_card && !previewImages.pan_card) newErrors.pan_card = "PAN card document required";
      if (formData.gst) {
        if (!formData.gst_number.match(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)) {
          newErrors.gst_number = "Valid GST number required";
        }
        if (!formData.gst_certificate && !previewImages.gst_certificate) newErrors.gst_certificate = "GST certificate required";
      }
      if (!formData.fssai_number.trim()) newErrors.fssai_number = "FSSAI number required";
      if (!formData.fssai_expiry) newErrors.fssai_expiry = "FSSAI expiry date required";
      if (!formData.fssai_license && !previewImages.fssai_license) newErrors.fssai_license = "FSSAI certificate required";
      if (!formData.ifsc_code.match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) {
        newErrors.ifsc_code = "Valid IFSC code required";
      }
    } else {
      // US Establishments: PAN, GST, FSSAI certificates & numbers are completely optional!
      // Routing Number (ABA) validation: exactly 9 digits
      const routing = formData.ifsc_code.trim();
      if (!routing) {
        newErrors.ifsc_code = "9-digit ABA Routing number required";
      } else if (!/^\d{9}$/.test(routing)) {
        newErrors.ifsc_code = "Routing number must be exactly 9 digits";
      }
    }

    if (!formData.bank_accno.match(/^\d{8,18}$/)) newErrors.bank_accno = "Valid account number required";
    if (formData.bank_accno !== formData.bank_accno_confirm) {
      newErrors.bank_accno_confirm = "Account numbers do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = validateStep1();
      if (!isValid) {
        const hasValidCoords =
          formData.latitude &&
          formData.longitude &&
          !isNaN(parseFloat(formData.latitude)) &&
          !isNaN(parseFloat(formData.longitude)) &&
          parseFloat(formData.latitude) !== 0 &&
          parseFloat(formData.longitude) !== 0;

        if (!hasValidCoords) {
          toast.error("Location Missing: Please pin your restaurant location on the map, click 'Use My Location', or search your area.", { duration: 6000 });
        } else {
          toast.error("Please fill all required restaurant & address fields.");
        }
      }
    } else if (currentStep === 2) {
      isValid = validateStep2();
      if (!isValid) toast.error("Please upload logo and select cuisines");
    } else if (currentStep === 3) {
      isValid = validateStep3();
      if (!isValid) {
        toast.error(
          isUS
            ? "Please provide valid bank account & routing details"
            : "Please complete all required legal documents and bank details"
        );
      }
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = (field: keyof FormDataState, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error("File size should be less than 8MB");
        return;
      }
      updateField(field, file);
      if (field === "logo_url" || field === "background_image_url") {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImages((prev) => ({ ...prev, [field]: reader.result }));
        };
        reader.readAsDataURL(file);
      }
      toast.success("File uploaded successfully");
    }
  };

  const toggleCuisine = (cuisine: string) => {
    const current = formData.cuisines;
    if (current.includes(cuisine)) {
      updateField("cuisines", current.filter((c) => c !== cuisine));
    } else {
      if (current.length < 5) {
        updateField("cuisines", [...current, cuisine]);
      } else {
        toast.error("Maximum 5 cuisines allowed");
      }
    }
  };

  const addCustomCuisine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customCuisineInput.trim();
    if (!trimmed) return;
    if (formData.cuisines.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Cuisine already selected");
      return;
    }
    if (formData.cuisines.length >= 5) {
      toast.error("Maximum 5 cuisines allowed");
      return;
    }
    updateField("cuisines", [...formData.cuisines, trimmed]);
    setCustomCuisineInput("");
  };

  // For custom timings, we need functions to add/remove time slots per day
  const addTimeSlot = (type: "restaurant" | "delivery" | "takeaway", day: DayName) => {
    const timingsField: keyof FormDataState = `${type}_custom_timings`;
    const currentDaySlots = formData[timingsField][day] || [];
    const newSlot: TimeSlot = {
      open_time: "9:00 ",
      close_time: "23:00",
    };
    updateField(timingsField, {
      ...formData[timingsField],
      [day]: [...currentDaySlots, newSlot],
    } as any);
  };

  const removeTimeSlot = (type: "restaurant" | "delivery" | "takeaway", day: DayName, index: number) => {
    const timingsField: keyof FormDataState = `${type}_custom_timings`;
    const currentDaySlots = formData[timingsField][day] || [];
    if (currentDaySlots.length > 1) {
      const updatedSlots = currentDaySlots.filter((_: TimeSlot, i: number) => i !== index);
      updateField(timingsField, {
        ...formData[timingsField],
        [day]: updatedSlots,
      } as any); // Type assertion needed due to complex nested update
    }
  };

  const updateCustomTimingSlot = (
    type: "restaurant" | "delivery" | "takeaway",
    day: DayName,
    index: number,
    field: keyof TimeSlot,
    value: string
  ) => {
    const timingsField: keyof FormDataState = `${type}_custom_timings`;
    const currentDaySlots = formData[timingsField][day] || [];
    const updatedSlots = [...currentDaySlots];
    updatedSlots[index] = { ...updatedSlots[index], [field]: value };
    updateField(timingsField, {
      ...formData[timingsField],
      [day]: updatedSlots,
    } as any); // Type assertion needed due to complex nested update
  };

  const copyToAllDays = (type: "restaurant" | "delivery" | "takeaway") => {
    const timingsField: keyof FormDataState = `${type}_custom_timings`;
    const firstDayKey = Object.keys(formData[timingsField])[0] as DayName | undefined; // Get first day with slots
    if (firstDayKey) {
      const firstDaySlots = formData[timingsField][firstDayKey];
      if (firstDaySlots && firstDaySlots.length > 0) {
        const updated = {} as Partial<Record<DayName, TimeSlot[]>>;
        DAYS.forEach((day) => {
          updated[day] = [...firstDaySlots]; // Copy the slots to all days
        });
        updateField(timingsField, updated as any); // Type assertion needed
        toast.success("Timings copied to all days");
      }
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    updateField("latitude", lat.toFixed(6));
    updateField("longitude", lng.toFixed(6));
    if (errors.location) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.location;
        return newErrors;
      });
    }
  };

  const handleAddressResolved = (address: ResolvedAddress) => {
    if (address.buildingno) updateField("buildingno", address.buildingno);
    if (address.floor) updateField("floor", address.floor);
    if (address.area) updateField("area", address.area);
    if (address.city) updateField("city", address.city);
    if (address.state) updateField("state", address.state);
    if (address.country) updateField("country", address.country);
    if (address.pincode) updateField("pincode", address.pincode.trim().slice(0, 10));
    if (address.landmark) updateField("landmark", address.landmark);
    if (address.address_line_1) updateField("address_line_1", address.address_line_1);
    if (address.address_line_2) updateField("address_line_2", address.address_line_2);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) {
      toast.error("Please complete all required fields");
      return;
    }
    const loadingToast = toast.loading("Submitting registration...");
    try {
      // Build restaurant hours (object format)
      const restaurantHours: Partial<Record<DayName, TimeSlot[]>> = {}; // Use Partial Record
      if (formData.restaurant_timing_mode === "all_days") {
        DAYS.forEach((day) => {
          restaurantHours[day] = [
            {
              open_time: formData.restaurant_all_day_timing.open_time,
              close_time: formData.restaurant_all_day_timing.close_time,
            },
          ];
        });
      } else {
        // Use the object structure directly
        Object.keys(formData.restaurant_custom_timings).forEach((dayKey) => {
          const day = dayKey as DayName; // Type assertion
          restaurantHours[day] = [...(formData.restaurant_custom_timings[day] || [])]; // Ensure array exists
        });
      }

      // Build delivery hours (object format)
      const deliveryHours: Partial<Record<DayName, TimeSlot[]>> = {}; // Use Partial Record
      if (formData.services.includes("delivery")) {
        if (formData.delivery_timing_mode === "same_time") {
          formData.delivery_days.forEach((day) => {
            deliveryHours[day] = [
              {
                open_time: formData.delivery_same_timing.open_time,
                close_time: formData.delivery_same_timing.close_time,
              },
            ];
          });
        } else {
          // Use the object structure directly for selected days
          Object.keys(formData.delivery_custom_timings).forEach((dayKey) => {
            const day = dayKey as DayName; // Type assertion
            if (formData.delivery_days.includes(day)) {
              deliveryHours[day] = [...(formData.delivery_custom_timings[day] || [])]; // Ensure array exists
            }
          });
        }
      }

      // Build takeaway hours (object format)
      const takeawayHours: Partial<Record<DayName, TimeSlot[]>> = {}; // Use Partial Record
      if (formData.services.includes("takeaway")) {
        if (formData.takeaway_timing_mode === "same_time") {
          // If using same time, apply to all selected days
          formData.takeaway_days.forEach((day) => {
            takeawayHours[day] = [
              {
                open_time: formData.takeaway_same_timing.open_time,
                close_time: formData.takeaway_same_timing.close_time,
              },
            ];
          });
        } else {
          // Use the object structure directly for selected days
          Object.keys(formData.takeaway_custom_timings).forEach((dayKey) => {
            const day = dayKey as DayName; // Type assertion
            if (formData.takeaway_days.includes(day)) {
              takeawayHours[day] = [...(formData.takeaway_custom_timings[day] || [])]; // Ensure array exists
            }
          });
        }
      }
      
      const session = await supabase.auth.getSession();
      const accessToken =
        session.data.session?.access_token ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken") ||
        "";
      const normalizedPackage = packagename === "food-truck" ? "marinate-foodtruck" : packagename || "marinate-menu";

      // Build the main payload
      const payload: Record<string, any> = { // Using Record<string, any> for flexibility
        accessToken,
        restaurant_name: formData.restaurant_name,
        fullname: formData.fullname,
        email: formData.email,
        phone: `${formData.phone_country_code}${formData.phone}`,
        restaurant_primary_contact: formData.same_as_owner
          ? `${formData.phone_country_code}${formData.phone}`
          : `${formData.primary_country_code}${formData.restaurant_primary_contact}`,
        buildingno: formData.buildingno,
        floor: formData.floor,
        area: formData.area,
        city: formData.city,
        // state: formData.state,
        pincode: formData.pincode,
        landmark: formData.landmark,
        mapEmbedUrl: `[${formData.latitude},${formData.longitude}]`,
        cuisines: formData.cuisines.map((c) => c.toLowerCase()),
        services: formData.services.map((s) => s.toLowerCase()),
        timings: { hours: restaurantHours },
        pan_number: formData.pan_number,
        fullnameaspan: formData.fullnameaspan,
        address: formData.registered_business_address,
        gst: formData.gst,
        gst_number: formData.gst ? formData.gst_number : null,
        fssai_number: formData.fssai_number,
        fssai_expiry: formData.fssai_expiry,
        bank_accno: formData.bank_accno,
        ifsc_code: formData.ifsc_code,
        account_type: formData.account_type,
        package: normalizedPackage,
      };

      // Add delivery and takeaway timings if applicable
      if (Object.keys(deliveryHours).length > 0) {
        payload.delivery_timings = { hours: deliveryHours }; // Wrap in 'hours' object
      }
      if (Object.keys(takeawayHours).length > 0) {
        payload.takeaway_timings = { hours: takeawayHours }; // Wrap in 'hours' object
      }

      // 6. Send the main payload
      const registrationForm = new FormData();
      registrationForm.append("payload", JSON.stringify(payload));
      if (formData.logo_url) registrationForm.append("logo_url", formData.logo_url);
      if (formData.background_image_url) registrationForm.append("background_image_url", formData.background_image_url);
      if (formData.pan_card) registrationForm.append("pan_card", formData.pan_card);
      if (formData.gst_certificate) registrationForm.append("gst_certificate", formData.gst_certificate);
      if (formData.fssai_license) registrationForm.append("fssai_license", formData.fssai_license);

      const structuredAddressObj = {
        address_line_1:
          formData.address_line_1 ||
          formData.registered_business_address ||
          [formData.buildingno, formData.area, formData.city].filter(Boolean).join(", ").trim(),
        address_line_2:
          formData.address_line_2 ||
          formData.floor ||
          formData.area ||
          "",
        landmark: formData.landmark || "",
        city: formData.city || "",
        state: formData.state || "Telangana",
        country: formData.country || "India",
        pincode: formData.pincode || "",
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };
      const structuredAddressStr = JSON.stringify(structuredAddressObj);

      const isStaffOrAdmin = userRole === "super_admin" || userRole === "staff";

      const regBusinessAddr =
        formData.registered_business_address?.trim() ||
        (isUS
          ? [formData.buildingno, formData.area, formData.city, formData.state, formData.pincode, formData.country]
              .filter(Boolean)
              .join(", ")
          : undefined);

      if (editRestaurantId) {
        // Customer, Staff, or Super Admin updating existing restaurant
        const updatePayload: Record<string, any> = {
          restaurant_name: formData.restaurant_name.trim(),
          fullname: formData.fullname.trim(),
          owner_name: formData.fullname.trim(),
          contact: formData.same_as_owner
            ? `${formData.phone_country_code}${formData.phone}`
            : `${formData.primary_country_code}${formData.restaurant_primary_contact}`,
          email: formData.email.trim(),
          address: structuredAddressStr,
          latitude: structuredAddressObj.latitude,
          longitude: structuredAddressObj.longitude,
          package: normalizedPackage,
          services: formData.services.map((s) => s.toLowerCase()),
          cuisines: formData.cuisines,
          timings: { hours: restaurantHours },
          gst_number: formData.gst ? formData.gst_number : undefined,
          fssai_number: formData.fssai_number || undefined,
          fssai_expiry: formData.fssai_expiry || undefined,
          pan_number: formData.pan_number || undefined,
          fullnameaspan: formData.fullnameaspan || undefined,
          registered_business_address: regBusinessAddr,
          bank_accno: formData.bank_accno || undefined,
          ifsc_code: formData.ifsc_code || undefined,
          account_type: formData.account_type || undefined,
          other_info: {
            fullname: formData.fullname.trim(),
            owner_name: formData.fullname.trim(),
            pan_number: formData.pan_number || "",
            fullnameaspan: formData.fullnameaspan || "",
            registered_business_address: regBusinessAddr || "",
            fssai_expiry: formData.fssai_expiry || "",
            bank_accno: formData.bank_accno || "",
            ifsc_code: formData.ifsc_code || "",
            routing_number: isUS ? formData.ifsc_code : "",
            account_type: formData.account_type || (isUS ? "checking" : "savings"),
          },
        };

        // Super Admin can also update custom routing domains
        if (userRole === "super_admin") {
          if (domainUrl && domainUrl.trim()) updatePayload.domain_url = domainUrl.trim();
          if (posDomain && posDomain.trim()) updatePayload.pos_domain = posDomain.trim();
        }

        const updateForm = new FormData();
        updateForm.append("accessToken", accessToken || sessionAccessToken);
        updateForm.append("restaurantId", editRestaurantId);
        updateForm.append("payload", JSON.stringify(updatePayload));
        if (formData.logo_url) updateForm.append("logo_url", formData.logo_url);
        if (formData.background_image_url) updateForm.append("background_image_url", formData.background_image_url);
        if (formData.pan_card) updateForm.append("pan_card", formData.pan_card);
        if (formData.gst_certificate) updateForm.append("gst_certificate", formData.gst_certificate);
        if (formData.fssai_license) updateForm.append("fssai_license", formData.fssai_license);

        const updateRes = await updateRestaurantWithFormData(updateForm);
        if (!updateRes.ok) throw new Error(updateRes.error || "Failed to update restaurant.");

        toast.dismiss(loadingToast);
        toast.success(`Restaurant "${formData.restaurant_name}" updated successfully!`);
        window.location.href = "/dashboard";
        return;
      }

      if (isStaffOrAdmin) {
        // Direct restaurant creation for staff & super_admin
        const directPayload = {
          restaurant_name: formData.restaurant_name.trim(),
          domain_url: (domainUrl || defaultDomainUrl).trim(),
          pos_domain: (posDomain || defaultPosDomain).trim(),
          email: formData.email ? formData.email.trim() : undefined,
          fullname: formData.fullname ? formData.fullname.trim() : undefined,
          contact: formData.same_as_owner
            ? `${formData.phone_country_code}${formData.phone}`
            : `${formData.primary_country_code}${formData.restaurant_primary_contact}`,
          address: structuredAddressStr,
          latitude: structuredAddressObj.latitude,
          longitude: structuredAddressObj.longitude,
          package: normalizedPackage,
          services: formData.services.map((s) => s.toLowerCase()),
          cuisines: formData.cuisines,
          timings: { hours: restaurantHours },
          gst_number: formData.gst ? formData.gst_number : undefined,
          fssai_number: formData.fssai_number || undefined,
          fssai_expiry: formData.fssai_expiry || undefined,
          pan_number: formData.pan_number || undefined,
          fullnameaspan: formData.fullnameaspan || undefined,
          registered_business_address: regBusinessAddr,
          bank_accno: formData.bank_accno || undefined,
          ifsc_code: formData.ifsc_code || undefined,
          account_type: formData.account_type || undefined,
          other_info: {
            fullname: formData.fullname ? formData.fullname.trim() : "",
            owner_name: formData.fullname ? formData.fullname.trim() : "",
            pan_number: formData.pan_number || "",
            fullnameaspan: formData.fullnameaspan || "",
            registered_business_address: regBusinessAddr || "",
            fssai_expiry: formData.fssai_expiry || "",
            bank_accno: formData.bank_accno || "",
            ifsc_code: formData.ifsc_code || "",
            routing_number: isUS ? formData.ifsc_code : "",
            account_type: formData.account_type || (isUS ? "checking" : "savings"),
          },
        };

        const directForm = new FormData();
        directForm.append("accessToken", accessToken || sessionAccessToken);
        directForm.append("payload", JSON.stringify(directPayload));
        if (formData.logo_url) directForm.append("logo_url", formData.logo_url);
        if (formData.background_image_url) directForm.append("background_image_url", formData.background_image_url);
        if (formData.pan_card) directForm.append("pan_card", formData.pan_card);
        if (formData.gst_certificate) directForm.append("gst_certificate", formData.gst_certificate);
        if (formData.fssai_license) directForm.append("fssai_license", formData.fssai_license);

        const createRes = await createRestaurantWithFormData(directForm);
        if (!createRes.ok) throw new Error(createRes.error || "Failed to create restaurant directly.");

        toast.dismiss(loadingToast);
        if (createRes.data?.adminPassword) {
          toast.success(`Restaurant created! Admin account for ${formData.email}: Password is "${createRes.data.adminPassword}"`, { duration: 9000 });
        } else {
          toast.success(`Restaurant "${formData.restaurant_name}" created directly!`);
        }
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1800);
        return;
      }

      if (editAppId) {
        registrationForm.append("applicationId", editAppId);
        registrationForm.append("accessToken", accessToken || sessionAccessToken);
        const updateRes = await updateMyOnboardingApplicationWithFormData(registrationForm);
        if (!updateRes.ok) throw new Error(updateRes.error || "Failed to update application.");

        toast.dismiss(loadingToast);
        toast.success("Application updated successfully.");
        window.location.href = "/dashboard";
        return;
      }

      const result = await submitOnboardingApplication(registrationForm);
      if (!result.ok) throw new Error(result.error);
      toast.dismiss(loadingToast);
      toast.success("Registration submitted successfully.");
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const errorMessage = String(error?.message || "Unable to submit your application.");
      if (errorMessage.toLowerCase().includes("body exceeded") || errorMessage.toLowerCase().includes("payload")) {
        toast.error("Some uploaded files are too large for one submission. Please keep each file under 8MB and try again.");
      } else {
        toast.error(errorMessage);
      }
      console.error("Error:", error);
    }
  };

  const isStaffOrAdmin = userRole === "super_admin" || userRole === "staff";
  const totalSteps = isStaffOrAdmin ? 4 : 3;
  const progressPercent = (currentStep / totalSteps) * 100;
  const cleanSlug = formData.restaurant_name
    ? formData.restaurant_name.toLowerCase().replace(/[^a-z0-9]/g, "").trim()
    : "";
  const defaultPosDomain = cleanSlug ? `pos.marinate360.com` : "pos.marinate360.com";
  const defaultDomainUrl = cleanSlug ? `${cleanSlug}.marinate360.com` : "menu.marinate360.com";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-center" />
      <div className="mx-auto">
        {/* Top Navigation - Clean Button with Shadow, no card */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-orange-600 hover:border-orange-300 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <span className="text-xs font-semibold text-gray-500">
            {editRestaurantId
              ? "Restaurant Management • Profile Configuration"
              : editAppId
              ? "Application Management • Review & Edit"
              : userRole === "super_admin"
              ? "Executive Management • Direct Registration"
              : userRole === "staff"
              ? "Operations Portal • Direct Registration"
              : "Partner Registration Portal"}
          </span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {editRestaurantId
              ? "Update Restaurant Information"
              : editAppId
              ? "Update Application Details"
              : "Restaurant Registration"}
          </h1>
          <p className="text-gray-600 mb-4">
            {editRestaurantId
              ? "Review and configure operational details, compliance documents, and platform routing."
              : editAppId
              ? "Modify your submitted onboarding application details for verification."
              : "Complete the steps below to onboard and configure your restaurant on the platform."}
          </p>
          {/* Progress Bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-linear-to-r from-orange-500 to-red-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        {/* Sidebar & Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-5 sticky top-4">
              <div className="space-y-4">
                <div
                  className={`flex items-start gap-4 p-4 rounded-xl transition ${
                    currentStep === 1 ? "bg-orange-50 border-l-4 border-orange-500" : "bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      currentStep === 1
                        ? "bg-orange-500 text-white"
                        : currentStep > 1
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > 1 ? "✓" : "1"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Restaurant Details</div>
                    <div className="text-xs text-gray-600 mt-1">Basic info & location</div>
                  </div>
                </div>
                <div
                  className={`flex items-start gap-4 p-4 rounded-xl transition ${
                    currentStep === 2 ? "bg-orange-50 border-l-4 border-orange-500" : "bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      currentStep === 2
                        ? "bg-orange-500 text-white"
                        : currentStep > 2
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > 2 ? "✓" : "2"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Menu & Operations</div>
                    <div className="text-xs text-gray-600 mt-1">Cuisine & timings</div>
                  </div>
                </div>
                <div
                  className={`flex items-start gap-4 p-4 rounded-xl transition ${
                    currentStep === 3 ? "bg-orange-50 border-l-4 border-orange-500" : "bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      currentStep === 3
                        ? "bg-orange-500 text-white"
                        : currentStep > 3
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > 3 ? "✓" : "3"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{isUS ? "Business & Banking" : "Legal Documents"}</div>
                    <div className="text-xs text-gray-600 mt-1">{isUS ? "Tax & Banking Details" : "PAN, GST, FSSAI & Bank"}</div>
                  </div>
                </div>

                {/* Step 4 for Staff & Super Admin */}
                {isStaffOrAdmin && (
                  <div
                    className={`flex items-start gap-4 p-4 rounded-xl transition ${
                      currentStep === 4 ? "bg-orange-50 border-l-4 border-orange-500" : "bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        currentStep === 4 ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      4
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Platform & Domains</div>
                      <div className="text-xs text-gray-600 mt-1">POS & Food Ordering URLs</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {/* STEP 1: Restaurant Information */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Information</h2>
                    <p className="text-gray-600 mb-6">Tell us about your restaurant</p>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Restaurant Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.restaurant_name}
                          onChange={(e) => updateField("restaurant_name", e.target.value)}
                          className={`w-full px-4 py-3 border ${
                            errors.restaurant_name ? "border-red-500" : "border-gray-300"
                          } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                          placeholder="Enter your restaurant name"
                        />
                        {errors.restaurant_name && (
                          <p className="text-red-500 text-sm mt-1">{errors.restaurant_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Owner Details</h3>
                    <p className="text-gray-600 mb-6">Contact information for business communications</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.fullname}
                          onChange={(e) => updateField("fullname", e.target.value)}
                          className={`w-full px-4 py-3 border ${
                            errors.fullname ? "border-red-500" : "border-gray-300"
                          } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                          placeholder="Owner's full name"
                        />
                        {errors.fullname && <p className="text-red-500 text-sm mt-1">{errors.fullname}</p>}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Owner Email Address <span className="text-red-500">*</span>
                          </label>
                          {(userRole === "super_admin" || userRole === "staff") && (
                            <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                              Admin Account Creation
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          value={formData.email}
                          readOnly={userRole !== "super_admin" && userRole !== "staff"}
                          onChange={(e) => updateField("email", e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg text-sm transition ${
                            errors.email ? "border-red-500" : "border-gray-300"
                          } ${
                            userRole !== "super_admin" && userRole !== "staff"
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          }`}
                          placeholder={
                            userRole === "super_admin" || userRole === "staff"
                              ? "Enter restaurant owner's email address *"
                              : "your@gmail.com"
                          }
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        {(userRole === "super_admin" || userRole === "staff") && (
                          <p className="text-xs text-orange-700/80 mt-1 font-medium">
                            An Admin account with an auto-generated password will be provisioned directly for this email.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-5">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-3">
                        <select
                          aria-label="country code"
                          value={formData.phone_country_code}
                          onChange={(e) => updateField("phone_country_code", e.target.value as CountryCode)}
                          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                          {COUNTRY_CODES.map((cc) => (
                            <option key={cc.code} value={cc.code}>
                              {cc.flag} {cc.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                          }
                          className={`flex-1 px-4 py-3 border ${
                            errors.phone ? "border-red-500" : "border-gray-300"
                          } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                          placeholder="10-digit phone number"
                        />
                      </div>
                      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                  <div className="border-t pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Restaurant Primary Contact</h3>
                    <p className="text-gray-600 mb-6">Customers and delivery partners will call this number</p>
                    <div className="mb-5">
                      <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <input
                          type="checkbox"
                          checked={formData.same_as_owner}
                          onChange={(e) => updateField("same_as_owner", e.target.checked)}
                          className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-gray-800 font-medium">Same as owner mobile number</span>
                      </label>
                    </div>
                    {!formData.same_as_owner && (
                      <div className="flex gap-3">
                        <select
                          aria-label="country"
                          value={formData.primary_country_code}
                          onChange={(e) => updateField("primary_country_code", e.target.value as CountryCode)}
                          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                          {COUNTRY_CODES.map((cc) => (
                            <option key={cc.code} value={cc.code}>
                              {cc.flag} {cc.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={formData.restaurant_primary_contact}
                          onChange={(e) =>
                            updateField(
                              "restaurant_primary_contact",
                              e.target.value.replace(/\D/g, "").slice(0, 10)
                            )
                          }
                          className={`flex-1 px-4 py-3 border ${
                            errors.restaurant_primary_contact ? "border-red-500" : "border-gray-300"
                          } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                          placeholder="10-digit phone number"
                        />
                      </div>
                    )}
                    {errors.restaurant_primary_contact && (
                      <p className="text-red-500 text-sm mt-1">{errors.restaurant_primary_contact}</p>
                    )}
                  </div>
                  <div className="border-t pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Restaurant Location</h3>
                    <p className="text-gray-600 mb-6">Pin your exact location on the map</p>
                    <LocationPicker
                      onLocationSelect={handleLocationSelect}
                      onAddressResolved={handleAddressResolved}
                      initialLocation={
                        formData.latitude && formData.longitude
                          ? {
                              lat: parseFloat(formData.latitude),
                              lng: parseFloat(formData.longitude),
                            }
                          : null
                      }
                    />
                    {errors.location && (
                      <div className="mt-2.5 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold animate-pulse">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{errors.location}</span>
                      </div>
                    )}
                    {formData.latitude && formData.longitude && parseFloat(formData.latitude) !== 0 ? (
                      <div className="mt-2.5 flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Restaurant map coordinates captured automatically!</span>
                      </div>
                    ) : (
                      <div className="mt-2.5 flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Please set your restaurant location on the map, use &apos;Use My Location&apos;, or search your address.</span>
                      </div>
                    )}
                    <div className="mt-8">
                      <h4 className="font-semibold text-gray-900 mb-4">Address Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <input
                            type="text"
                            value={formData.buildingno}
                            onChange={(e) => updateField("buildingno", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.buildingno ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder="Shop/Building number *"
                          />
                          {errors.buildingno && <p className="text-red-500 text-sm mt-1">{errors.buildingno}</p>}
                        </div>
                        <div>
                          <input
                            type="text"
                            value={formData.floor}
                            onChange={(e) => updateField("floor", e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Floor/Tower (optional)"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={formData.area}
                            onChange={(e) => updateField("area", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.area ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder="Area/Sector/Locality *"
                          />
                          {errors.area && <p className="text-red-500 text-sm mt-1">{errors.area}</p>}
                        </div>
                        <div>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => updateField("city", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.city ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder="City *"
                          />
                          {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                        </div>
                        {/* <div>
                          <select
                            aria-label="state"
                            value={formData.state}
                            onChange={(e) => updateField("state", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.state ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white`}
                          >
                            <option value="">Select State *</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Punjab">Punjab</option>
                          </select>
                          {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                        </div> */}
                        <div>
                          <input
                            type="text"
                            value={formData.pincode}
                            onChange={(e) => updateField("pincode", e.target.value.replace(/[^0-9-]/g, "").slice(0, 10))}
                            className={`w-full px-4 py-3 border ${
                              errors.pincode ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder={
                              formData.country?.toLowerCase().includes("united states") ||
                              formData.country?.toLowerCase().includes("usa") ||
                              formData.country?.toLowerCase() === "us"
                                ? "ZIP Code *"
                                : "PIN / ZIP Code *"
                            }
                          />
                          {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
                        </div>
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={formData.landmark}
                            onChange={(e) => updateField("landmark", e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Nearby landmark (optional)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>


                </div>
              )}
              {/* STEP 2: Operational Details */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Images</h2>
                    <p className="text-gray-600 mb-6">Upload your restaurant logo and cover image</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Restaurant Logo *
                        </label>
                        {isLiveRestaurantEdit && (
                        <div className="flex items-center gap-2 p-2.5 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Logo is locked for active restaurants.</span>
                        </div>
                      )}
                      <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                        isLiveRestaurantEdit
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                          : "border-gray-300 hover:border-orange-500 cursor-pointer"
                      }`}>
                        <input
                          type="file"
                          disabled={isLiveRestaurantEdit}
                          onChange={(e) => handleFileUpload("logo_url", e)}
                          accept="image/jpeg,image/jpg,image/png"
                          className="hidden"
                          id="logo-upload"
                        />
                        <label htmlFor={isLiveRestaurantEdit ? undefined : "logo-upload"} className={isLiveRestaurantEdit ? "cursor-not-allowed" : "cursor-pointer"}>
                            {previewImages.logo_url ? (
                              <img
                                src={previewImages.logo_url as string}
                                alt="Logo preview"
                                className="w-full h-40 object-contain rounded-lg mb-3"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-8 h-8 text-orange-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                                <p className="font-medium text-gray-700">Upload Logo</p>
                                <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                              </div>
                            )}
                          </label>
                        </div>
                        {errors.logo_url && <p className="text-red-500 text-sm mt-2">{errors.logo_url}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Cover Image (Optional)
                        </label>
                        {isLiveRestaurantEdit && (
                        <div className="flex items-center gap-2 p-2.5 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Cover image is locked for active restaurants.</span>
                        </div>
                      )}
                      <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                        isLiveRestaurantEdit
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                          : "border-gray-300 hover:border-orange-500 cursor-pointer"
                      }`}>
                        <input
                          type="file"
                          disabled={isLiveRestaurantEdit}
                          onChange={(e) => handleFileUpload("background_image_url", e)}
                          accept="image/jpeg,image/jpg,image/png"
                          className="hidden"
                          id="bg-upload"
                        />
                        <label htmlFor={isLiveRestaurantEdit ? undefined : "bg-upload"} className={isLiveRestaurantEdit ? "cursor-not-allowed" : "cursor-pointer"}>
                            {previewImages.background_image_url ? (
                              <img
                                src={previewImages.background_image_url as string}
                                alt="Cover preview"
                                className="w-full h-40 object-cover rounded-lg mb-3"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                                <p className="font-medium text-gray-700">Upload Cover</p>
                                <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Cuisines</h3>
                    <p className="text-gray-600 mb-6">Select up to 3 cuisines that best describe your menu</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {CUISINES.map((cuisine) => (
                        <button
                          key={cuisine}
                          type="button"
                          onClick={() => toggleCuisine(cuisine)}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition border-2 ${
                            formData.cuisines.includes(cuisine)
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white border-gray-300 text-gray-700 hover:border-orange-500"
                          }`}
                        >
                          {cuisine}
                        </button>
                      ))}
                    </div>

                    {/* Custom cuisines tags */}
                    {formData.cuisines.filter((c) => !CUISINES.includes(c)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {formData.cuisines
                          .filter((c) => !CUISINES.includes(c))
                          .map((custom) => (
                            <span
                              key={custom}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold shadow-xs"
                            >
                              <span>{custom}</span>
                              <button
                                type="button"
                                onClick={() => toggleCuisine(custom)}
                                className="hover:text-zinc-200 text-sm ml-1"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Custom Cuisine Input */}
                    <div className="mt-4 flex gap-2">
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
                        className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomCuisine()}
                        className="rounded-lg bg-orange-500 hover:bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition"
                      >
                        Add
                      </button>
                    </div>

                    {errors.cuisines && <p className="text-red-500 text-sm mt-2">{errors.cuisines}</p>}
                    <p className="text-sm text-gray-600 mt-3">Selected: {formData.cuisines.length} / 5 max</p>
                  </div>
                  {/* Restaurant Opening Hours */}
                  <div className="border-t pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Restaurant Opening Hours</h3>
                    <p className="text-gray-600 mb-6">
                      These hours apply to dine-in and catering services
                    </p>
                    <div className="flex gap-3 mb-6">
                      <button
                        type="button"
                        onClick={() => updateField("restaurant_timing_mode", "all_days")}
                        className={`flex-1 px-5 py-3 rounded-lg border-2 text-sm font-medium transition ${
                          formData.restaurant_timing_mode === "all_days"
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-300 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        Same timing for all days
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("restaurant_timing_mode", "custom_days")}
                        className={`flex-1 px-5 py-3 rounded-lg border-2 text-sm font-medium transition ${
                          formData.restaurant_timing_mode === "custom_days"
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-300 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        Custom timing
                      </button>
                    </div>
                    {formData.restaurant_timing_mode === "all_days" ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Open time
                          </label>
                          <select
                            aria-label="reantestaurant_all_day_timing.open_time"
                            value={formData.restaurant_all_day_timing.open_time}
                            onChange={(e) =>
                              updateField("restaurant_all_day_timing", {
                                ...formData.restaurant_all_day_timing,
                                open_time: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            {TIME_SLOTS.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Close time
                          </label>
                          <select
                            aria-label="reantestaurant_all_day_timing.close_time"
                            value={formData.restaurant_all_day_timing.close_time}
                            onChange={(e) =>
                              updateField("restaurant_all_day_timing", {
                                ...formData.restaurant_all_day_timing,
                                close_time: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            {TIME_SLOTS.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {DAYS.map((day) => (
                          <div key={day} className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-3">{day}</h4>
                            {/* Render time slots for this day */}
                            {(formData.restaurant_custom_timings[day] || []).map(
                              (slot: TimeSlot, index: number) => (
                                <div key={index} className="flex items-center gap-4 mb-3">
                                  <select
                                    aria-label="select"
                                    value={slot.open_time}
                                    onChange={(e) =>
                                      updateCustomTimingSlot(
                                        "restaurant",
                                        day,
                                        index,
                                        "open_time",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    {TIME_SLOTS.map((time) => (
                                      <option key={time} value={time}>
                                        {time}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-gray-500">to</span>
                                  <select
                                    aria-label="close time"
                                    value={slot.close_time}
                                    onChange={(e) =>
                                      updateCustomTimingSlot(
                                        "restaurant",
                                        day,
                                        index,
                                        "close_time",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    {TIME_SLOTS.map((time) => (
                                      <option key={time} value={time}>
                                        {time}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    aria-label="button"
                                    type="button"
                                    onClick={() => removeTimeSlot("restaurant", day, index)}
                                    className="ml-2 p-1 text-red-500 hover:text-red-700"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 7l-.867 12.142A1 1 0 0117.133 21H6.867A1 1 0 016 19.133L4.867 7H19zm-1 7h-1v-7h1v7z"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              )
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => addTimeSlot("restaurant", day)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                + Add more time slots
                              </button>
                              {formData.restaurant_custom_timings[day] &&
                                formData.restaurant_custom_timings[day].length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => copyToAllDays("restaurant")}
                                    className="text-sm text-orange-600 hover:text-orange-700 font-medium ml-4"
                                  >
                                    📋 Copy to all days
                                  </button>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Delivery Timings */}
                  {formData.services.includes("delivery") && (
                    <div className="border-t pt-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Delivery Timings</h3>
                      <p className="text-gray-600 mb-6">Set your delivery service hours</p>
                      <div className="flex gap-3 mb-6">
                        <button
                          type="button"
                          onClick={() => updateField("delivery_timing_mode", "same_time")}
                          className={`flex-1 px-5 py-3 rounded-lg border-2 text-sm font-medium transition ${
                            formData.delivery_timing_mode === "same_time"
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          Same timing for selected days
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField("delivery_timing_mode", "day_wise")}
                          className={`flex-1 px-5 py-3 rounded-lg border-2 text-sm font-medium transition ${
                            formData.delivery_timing_mode === "day_wise"
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          Day wise timings
                        </button>
                      </div>
                      {formData.delivery_timing_mode === "same_time" ? (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Open time
                              </label>
                              <select
                                aria-label="delivery"
                                value={formData.delivery_same_timing.open_time}
                                onChange={(e) =>
                                  updateField("delivery_same_timing", {
                                    ...formData.delivery_same_timing,
                                    open_time: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              >
                                {TIME_SLOTS.map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Close time
                              </label>
                              <select
                                aria-label="select"
                                value={formData.delivery_same_timing.close_time}
                                onChange={(e) =>
                                  updateField("delivery_same_timing", {
                                    ...formData.delivery_same_timing,
                                    close_time: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              >
                                {TIME_SLOTS.map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">Mark open days</p>
                            <div className="flex flex-wrap gap-2">
                              {DAYS.map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const currentDays = [...formData.delivery_days];
                                    if (currentDays.includes(day)) {
                                      updateField("delivery_days", currentDays.filter((d) => d !== day));
                                    } else {
                                      updateField("delivery_days", [...currentDays, day]);
                                    }
                                  }}
                                  className={`px-4 py-2 text-sm rounded-lg border-2 transition font-medium ${
                                    formData.delivery_days.includes(day)
                                      ? "bg-orange-500 text-white border-orange-500"
                                      : "bg-white text-gray-700 border-gray-300 hover:border-orange-500"
                                  }`}
                                >
                                  {day.slice(0, 3)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          {DAYS.map((day) => (
                            <div key={day} className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-3">{day}</h4>
                              {/* Render time slots for this day */}
                              {(formData.delivery_custom_timings[day] || []).map(
                                (slot: TimeSlot, index: number) => (
                                  <div key={index} className="flex items-center gap-4 mb-3">
                                    <select
                                      aria-label="delivery"
                                      value={slot.open_time}
                                      onChange={(e) =>
                                        updateCustomTimingSlot(
                                          "delivery",
                                          day,
                                          index,
                                          "open_time",
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                      {TIME_SLOTS.map((time) => (
                                        <option key={time} value={time}>
                                          {time}
                                        </option>
                                      ))}
                                    </select>
                                    <span className="text-gray-500">to</span>
                                    <select
                                      aria-label="select"
                                      value={slot.close_time}
                                      onChange={(e) =>
                                        updateCustomTimingSlot(
                                          "delivery",
                                          day,
                                          index,
                                          "close_time",
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                      {TIME_SLOTS.map((time) => (
                                        <option key={time} value={time}>
                                          {time}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      aria-label="button"
                                      type="button"
                                      onClick={() => removeTimeSlot("delivery", day, index)}
                                      className="ml-2 p-1 text-red-500 hover:text-red-700"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M19 7l-.867 12.142A1 1 0 0117.133 21H6.867A1 1 0 016 19.133L4.867 7H19zm-1 7h-1v-7h1v7z"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                )
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => addTimeSlot("delivery", day)}
                                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  + Add more time slots
                                </button>
                                {/* Only show "Copy to all" if there are slots for this day */}
                                {formData.delivery_custom_timings[day] &&
                                  formData.delivery_custom_timings[day].length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => copyToAllDays("delivery")}
                                      className="text-sm text-orange-600 hover:text-orange-700 font-medium ml-4"
                                    >
                                      📋 Copy to all days
                                    </button>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Takeaway Timings */}
                  {formData.services.includes("takeaway") && (
                    <div className="border-t pt-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Takeaway Timings</h3>
                      <p className="text-gray-600 mb-6">Set your takeaway service hours</p>
                      <div className="flex gap-3 mb-6">
                        <button
                          type="button"
                          onClick={() => updateField("takeaway_timing_mode", "same_time")}
                          className={`flex-1 px-5 py-3 rounded-lg border-2 text-sm font-medium transition ${
                            formData.takeaway_timing_mode === "same_time"
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          Same timing for selected days
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField("takeaway_timing_mode", "day_wise")}
                          className={`flex-1 px-5 py-3 rounded-lg border-2 text-sm font-medium transition ${
                            formData.takeaway_timing_mode === "day_wise"
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          Day wise timings
                        </button>
                      </div>
                      {formData.takeaway_timing_mode === "same_time" ? (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Open time
                              </label>
                              <select
                                aria-label="select"
                                value={formData.takeaway_same_timing.open_time}
                                onChange={(e) =>
                                  updateField("takeaway_same_timing", {
                                    ...formData.takeaway_same_timing,
                                    open_time: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              >
                                {TIME_SLOTS.map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Close time
                              </label>
                              <select
                                aria-label="select"
                                value={formData.takeaway_same_timing.close_time}
                                onChange={(e) =>
                                  updateField("takeaway_same_timing", {
                                    ...formData.takeaway_same_timing,
                                    close_time: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              >
                                {TIME_SLOTS.map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">Mark open days</p>
                            <div className="flex flex-wrap gap-2">
                              {DAYS.map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const currentDays = [...formData.takeaway_days];
                                    if (currentDays.includes(day)) {
                                      updateField("takeaway_days", currentDays.filter((d) => d !== day));
                                    } else {
                                      updateField("takeaway_days", [...currentDays, day]);
                                    }
                                  }}
                                  className={`px-4 py-2 text-sm rounded-lg border-2 transition font-medium ${
                                    formData.takeaway_days.includes(day)
                                      ? "bg-orange-500 text-white border-orange-500"
                                      : "bg-white text-gray-700 border-gray-300 hover:border-orange-500"
                                  }`}
                                >
                                  {day.slice(0, 3)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          {DAYS.map((day) => (
                            <div key={day} className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-3">{day}</h4>
                              {/* Render time slots for this day */}
                              {(formData.takeaway_custom_timings[day] || []).map(
                                (slot: TimeSlot, index: number) => (
                                  <div key={index} className="flex items-center gap-4 mb-3">
                                    <select
                                      aria-label="select"
                                      value={slot.open_time}
                                      onChange={(e) =>
                                        updateCustomTimingSlot(
                                          "takeaway",
                                          day,
                                          index,
                                          "open_time",
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                      {TIME_SLOTS.map((time) => (
                                        <option key={time} value={time}>
                                          {time}
                                        </option>
                                      ))}
                                    </select>
                                    <span className="text-gray-500">to</span>
                                    <select
                                     aria-label="close"
                                      value={slot.close_time}
                                      onChange={(e) =>
                                        updateCustomTimingSlot(
                                          "takeaway",
                                          day,
                                          index,
                                          "close_time",
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                      {TIME_SLOTS.map((time) => (
                                        <option key={time} value={time}>
                                          {time}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      aria-label="ccc"
                                      type="button"
                                      onClick={() => removeTimeSlot("takeaway", day, index)}
                                      className="ml-2 p-1 text-red-500 hover:text-red-700"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M19 7l-.867 12.142A1 1 0 0117.133 21H6.867A1 1 0 016 19.133L4.867 7H19zm-1 7h-1v-7h1v7z"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                )
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => addTimeSlot("takeaway", day)}
                                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  + Add more time slots
                                </button>
                                {/* Only show "Copy to all" if there are slots for this day */}
                                {formData.takeaway_custom_timings[day] &&
                                  formData.takeaway_custom_timings[day].length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => copyToAllDays("takeaway")}
                                      className="text-sm text-orange-600 hover:text-orange-700 font-medium ml-4"
                                    >
                                      📋 Copy to all days
                                    </button>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* STEP 3: Documents */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {isUS ? "Business & Regulatory Details" : "Legal Documents"}
                    </h2>
                    <p className="text-gray-600 mb-6 text-sm">
                      {isUS
                        ? "Configure business tax identification, optional health permits, and direct deposit details."
                        : "Provide required statutory documents for verification and compliance."}
                    </p>
                    <div className={`${isUS ? "bg-blue-50 border-l-4 border-blue-500" : "bg-yellow-50 border-l-4 border-yellow-400"} p-5 rounded-lg mb-6`}>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {isUS ? "Tax & Business Identification (Optional)" : "PAN Details"}
                      </h4>
                      <p className="text-sm text-gray-700">
                        {isUS
                          ? "For US-based establishments, statutory Indian documents (PAN, GST, FSSAI) are optional. You may provide an EIN or State Tax ID if available."
                          : "Enter the PAN details of the person or company who legally owns the restaurant"}
                      </p>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {isUS ? "EIN / Business Tax ID" : "PAN Number"} {isUS ? <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span> : <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData.pan_number}
                            onChange={(e) => updateField("pan_number", e.target.value.toUpperCase())}
                            className={`w-full px-4 py-3 border ${
                              errors.pan_number ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono uppercase`}
                            placeholder={isUS ? "12-3456789 (optional)" : "ABCDE1234F"}
                            maxLength={isUS ? 12 : 10}
                          />
                          {errors.pan_number && (
                            <p className="text-red-500 text-sm mt-1">{errors.pan_number}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {isUS ? "Legal Business / Owner Name" : "Full Name as per PAN"} {isUS ? <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span> : <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData.fullnameaspan}
                            onChange={(e) => updateField("fullnameaspan", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.fullnameaspan ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder={isUS ? "Entity or owner legal name" : "Full name as per PAN"}
                          />
                          {errors.fullnameaspan && (
                            <p className="text-red-500 text-sm mt-1">{errors.fullnameaspan}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Registered Business Address {isUS ? <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span> : <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          value={formData.registered_business_address}
                          onChange={(e) => updateField("registered_business_address", e.target.value)}
                          className={`w-full px-4 py-3 border ${
                            errors.registered_business_address ? "border-red-500" : "border-gray-300"
                          } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                          placeholder={isUS ? "Registered business address (optional)" : "Enter complete registered business address as per PAN"}
                          rows={3}
                        />
                        {errors.registered_business_address && (
                          <p className="text-red-500 text-sm mt-1">{errors.registered_business_address}</p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            {isUS ? "Tax Document / EIN Letter" : "PAN Card Document"} {isUS ? <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span> : <span className="text-red-500">*</span>}
                          </label>
                          {isLiveRestaurantEdit && previewImages.pan_card && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <Shield className="w-3.5 h-3.5 text-emerald-600" />
                              Verified & Locked
                            </span>
                          )}
                        </div>
                        {isLiveRestaurantEdit && previewImages.pan_card ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Shield className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">PAN Card Verified</p>
                                <p className="text-xs text-gray-500">Document changes are locked for live restaurants</p>
                              </div>
                            </div>
                            <a
                              href={previewImages.pan_card}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 rounded-lg shadow-2xs hover:bg-emerald-50 transition cursor-pointer"
                            >
                              View Document
                            </a>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition cursor-pointer">
                            <input
                              type="file"
                              onChange={(e) => handleFileUpload("pan_card", e)}
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              id="pan-upload"
                            />
                            <label htmlFor="pan-upload" className="cursor-pointer">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-8 h-8 text-blue-500"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                {formData.pan_card ? (
                                  <div>
                                    <p className="text-green-600 font-semibold">
                                      ✓ {formData.pan_card.name}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">Click to change</p>
                                  </div>
                                ) : previewImages.pan_card ? (
                                  <div>
                                    <p className="text-emerald-600 font-semibold">✓ Document Uploaded</p>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                      <a
                                        href={previewImages.pan_card}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        View document
                                      </a>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">Click to replace</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-gray-800 font-semibold">{isUS ? "Upload Tax Document / EIN Letter" : "Upload PAN Card"}</p>
                                    <p className="text-sm text-gray-500 mt-1">PDF, JPG, PNG up to 5MB</p>
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        )}
                        {errors.pan_card && <p className="text-red-500 text-sm mt-2">{errors.pan_card}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-8">
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-5 rounded-lg mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">GST Details (Optional)</h4>
                      <p className="text-sm text-gray-700">
                        If you are GST registered, please provide your GST details
                      </p>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Are you GST registered?
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => updateField("gst", true)}
                          className={`flex-1 px-6 py-3 rounded-lg border-2 font-medium transition ${
                            formData.gst === true
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField("gst", false)}
                          className={`flex-1 px-6 py-3 rounded-lg border-2 font-medium transition ${
                            formData.gst === false
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                    {formData.gst && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            GST Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.gst_number}
                            onChange={(e) => updateField("gst_number", e.target.value.toUpperCase())}
                            className={`w-full px-4 py-3 border ${
                              errors.gst_number ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono uppercase`}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                          />
                          {errors.gst_number && (
                            <p className="text-red-500 text-sm mt-1">{errors.gst_number}</p>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-700">
                              GST Certificate <span className="text-red-500">*</span>
                            </label>
                            {isLiveRestaurantEdit && previewImages.gst_certificate && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                Verified & Locked
                              </span>
                            )}
                          </div>
                          {isLiveRestaurantEdit && previewImages.gst_certificate ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                  <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">GST Certificate Verified</p>
                                  <p className="text-xs text-gray-500">Document changes are locked for live restaurants</p>
                                </div>
                              </div>
                              <a
                                href={previewImages.gst_certificate}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 rounded-lg shadow-2xs hover:bg-emerald-50 transition cursor-pointer"
                              >
                                View Document
                              </a>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition cursor-pointer">
                              <input
                                type="file"
                                onChange={(e) => handleFileUpload("gst_certificate", e)}
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                id="gst-upload"
                              />
                              <label htmlFor="gst-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg
                                      className="w-8 h-8 text-blue-500"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  {formData.gst_certificate ? (
                                    <div>
                                      <p className="text-green-600 font-semibold">
                                        ✓ {formData.gst_certificate.name}
                                      </p>
                                      <p className="text-sm text-gray-500 mt-1">Click to change</p>
                                    </div>
                                  ) : previewImages.gst_certificate ? (
                                    <div>
                                      <p className="text-emerald-600 font-semibold">✓ Document Uploaded</p>
                                      <div className="flex items-center justify-center gap-2 mt-1">
                                        <a
                                          href={previewImages.gst_certificate}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          View document
                                        </a>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-500">Click to replace</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-gray-800 font-semibold">
                                        Upload GST Certificate
                                      </p>
                                      <p className="text-sm text-gray-500 mt-1">PDF, JPG, PNG up to 5MB</p>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                          )}
                          {errors.gst_certificate && (
                            <p className="text-red-500 text-sm mt-2">{errors.gst_certificate}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-8">
                    <div className={`${isUS ? "bg-blue-50 border-l-4 border-blue-500" : "bg-green-50 border-l-4 border-green-400"} p-5 rounded-lg mb-6`}>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {isUS ? "Food Safety & Health Permit (Optional)" : "FSSAI License"}
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        {isUS
                          ? "FSSAI certification is specific to India. For US restaurants, you may optionally provide your local County Health Department food permit or inspection certificate."
                          : "Food license is mandatory for all food businesses"}
                      </p>
                      {!isUS && (
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Name on FSSAI must match restaurant name or PAN name</li>
                          <li>• Address on FSSAI must match restaurant address</li>
                        </ul>
                      )}
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {isUS ? "Food Safety / Health Permit Number" : "FSSAI Number"} {isUS ? <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span> : <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData.fssai_number}
                            onChange={(e) => updateField("fssai_number", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.fssai_number ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder={isUS ? "Permit number (optional)" : "14-digit FSSAI number"}
                          />
                          {errors.fssai_number && (
                            <p className="text-red-500 text-sm mt-1">{errors.fssai_number}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {isUS ? "Permit Expiry Date" : "Expiry Date"} {isUS ? <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span> : <span className="text-red-500">*</span>}
                          </label>
                          <input
                            aria-label="fssai-expiry"
                            type="date"
                            value={formData.fssai_expiry}
                            onChange={(e) => updateField("fssai_expiry", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.fssai_expiry ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                          />
                          {errors.fssai_expiry && (
                            <p className="text-red-500 text-sm mt-1">{errors.fssai_expiry}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            {isUS ? "Health Permit Document" : "FSSAI License Certificate"} {isUS ? <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span> : <span className="text-red-500">*</span>}
                          </label>
                          {isLiveRestaurantEdit && previewImages.fssai_license && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <Shield className="w-3.5 h-3.5 text-emerald-600" />
                              Verified & Locked
                            </span>
                          )}
                        </div>
                        {isLiveRestaurantEdit && previewImages.fssai_license ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Shield className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">FSSAI License Verified</p>
                                <p className="text-xs text-gray-500">Document changes are locked for live restaurants</p>
                              </div>
                            </div>
                            <a
                              href={previewImages.fssai_license}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 rounded-lg shadow-2xs hover:bg-emerald-50 transition cursor-pointer"
                            >
                              View Document
                            </a>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition cursor-pointer">
                            <input
                              type="file"
                              onChange={(e) => handleFileUpload("fssai_license", e)}
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              id="fssai-upload"
                            />
                            <label htmlFor="fssai-upload" className="cursor-pointer">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-8 h-8 text-green-500"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                {formData.fssai_license ? (
                                  <div>
                                    <p className="text-green-600 font-semibold">
                                      ✓ {formData.fssai_license.name}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">Click to change</p>
                                  </div>
                                ) : previewImages.fssai_license ? (
                                  <div>
                                    <p className="text-emerald-600 font-semibold">✓ Document Uploaded</p>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                      <a
                                        href={previewImages.fssai_license}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        View document
                                      </a>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">Click to replace</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-gray-800 font-semibold">Upload FSSAI License</p>
                                    <p className="text-sm text-gray-500 mt-1">PDF, JPG, PNG up to 5MB</p>
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        )}
                        {errors.fssai_license && (
                          <p className="text-red-500 text-sm mt-2">{errors.fssai_license}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-8">
                    <div className="bg-purple-50 border-l-4 border-purple-400 p-5 rounded-lg mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">Bank Account Details</h4>
                      <p className="text-sm text-gray-700">
                        {isUS
                          ? "Your payouts and direct deposits will be processed to this account"
                          : "Your earnings will be deposited to this account"}
                      </p>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Bank Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.bank_accno}
                            onChange={(e) => updateField("bank_accno", e.target.value.replace(/\D/g, ""))}
                            className={`w-full px-4 py-3 border ${
                              errors.bank_accno ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder={isUS ? "Account number (8-17 digits)" : "Account number"}
                          />
                          {errors.bank_accno && (
                            <p className="text-red-500 text-sm mt-1">{errors.bank_accno}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Re-enter Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.bank_accno_confirm}
                            onChange={(e) =>
                              updateField("bank_accno_confirm", e.target.value.replace(/\D/g, ""))
                            }
                            className={`w-full px-4 py-3 border ${
                              errors.bank_accno_confirm ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder="Confirm account number"
                          />
                          {errors.bank_accno_confirm && (
                            <p className="text-red-500 text-sm mt-1">{errors.bank_accno_confirm}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {isUS ? "Routing Number (ABA)" : "IFSC Code"} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.ifsc_code}
                            onChange={(e) =>
                              updateField(
                                "ifsc_code",
                                isUS ? e.target.value.replace(/\D/g, "").slice(0, 9) : e.target.value.toUpperCase().slice(0, 11)
                              )
                            }
                            className={`w-full px-4 py-3 border ${
                              errors.ifsc_code ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono uppercase`}
                            placeholder={isUS ? "9-digit ABA routing number" : "SBIN0001234"}
                            maxLength={isUS ? 9 : 11}
                          />
                          {errors.ifsc_code && (
                            <p className="text-red-500 text-sm mt-1">{errors.ifsc_code}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Account Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            aria-label="account-type"
                            value={formData.account_type}
                            onChange={(e) => updateField("account_type", e.target.value as AccountType)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                          >
                            {isUS ? (
                              <>
                                <option value="checking">Checking Account</option>
                                <option value="savings">Savings Account</option>
                              </>
                            ) : (
                              <>
                                <option value="savings">Savings Account</option>
                                <option value="current">Current Account</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Platform & Domains (Staff & Super Admin) */}
              {currentStep === 4 && isStaffOrAdmin && (
                <div className="space-y-8 animate-in fade-in duration-150">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-orange-100 text-orange-700 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                        Infrastructure & Routing
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform & Domains</h2>
                    <p className="text-gray-600 mb-6 text-sm">
                      {userRole === "super_admin"
                        ? "Configure live POS terminal and Food Ordering App URLs. Custom domain mappings can be managed directly."
                        : "Review assigned POS terminal and Food Ordering App URLs. Domain routing is platform-managed and read-only for staff accounts."}
                    </p>

                    <div className="space-y-6 max-w-2xl">
                      {/* 1. POS Domain (FIRST) */}
                      <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            POS Terminal Domain <span className="text-red-500">*</span>
                          </label>
                          {userRole !== "super_admin" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-zinc-600 bg-white border border-gray-200 px-2.5 py-0.5 rounded-md font-semibold">
                              <Lock className="w-3 h-3 text-zinc-400" />
                              Platform Managed (Read Only)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-md font-semibold">
                              Configurable Endpoint
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          disabled={userRole !== "super_admin"}
                          value={posDomain !== "" ? posDomain : defaultPosDomain}
                          onChange={(e) => setPosDomain(e.target.value)}
                          placeholder="pos.marinate360.com"
                          className={`w-full px-4 py-3 border rounded-lg text-sm ${
                            userRole !== "super_admin"
                              ? "bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed font-medium select-none"
                              : "bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-medium"
                          }`}
                        />
                        <p className="text-xs text-gray-500 mt-1.5">
                          Operational POS terminal URL for order processing, billing, and kitchen display.
                        </p>
                      </div>

                      {/* 2. Food Ordering App URL (SECOND) */}
                      <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Food Ordering App URL <span className="text-red-500">*</span>
                          </label>
                          {userRole !== "super_admin" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-zinc-600 bg-white border border-gray-200 px-2.5 py-0.5 rounded-md font-semibold">
                              <Lock className="w-3 h-3 text-zinc-400" />
                              Platform Managed (Read Only)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-md font-semibold">
                              Configurable Endpoint
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          disabled={userRole !== "super_admin"}
                          value={domainUrl !== "" ? domainUrl : defaultDomainUrl}
                          onChange={(e) => setDomainUrl(e.target.value)}
                          placeholder="e.g. restaurant.marinate360.com"
                          className={`w-full px-4 py-3 border rounded-lg text-sm ${
                            userRole !== "super_admin"
                              ? "bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed font-medium select-none"
                              : "bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-medium"
                          }`}
                        />
                        <p className="text-xs text-gray-500 mt-1.5">
                          Public-facing web ordering URL and digital menu for customers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10 pt-8 border-t">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-8 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Back
                  </button>
                ) : (
                  <div></div>
                )}
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-10 py-3 rounded-lg font-bold transition shadow-lg flex items-center gap-2"
                  >
                    Continue
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-10 py-3 rounded-lg font-bold transition shadow-lg flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {editRestaurantId
                      ? "Save Restaurant Changes"
                      : editAppId
                      ? "Update Application"
                      : isStaffOrAdmin
                      ? "Create Restaurant Directly"
                      : "Submit Registration"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
