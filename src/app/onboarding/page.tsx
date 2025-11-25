/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Map as LMap, Marker as LMarker } from 'leaflet';

// Define types for clarity
type DayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
type CountryCode = "+91" | "+1" | "+44" | "+971";
type ServiceType = "dine_in" | "delivery" | "takeaway" | "catering";
type AccountType = "savings" | "current";
type TimingMode = "all_days" | "custom_days" | "same_time" | "day_wise";

interface TimeSlot {
  open_time: string;
  close_time: string;
}

interface ErrorMap {
  [key: string]: string;
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

// Map Component
const LocationPicker = ({
  onLocationSelect,
  initialLocation,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation: { lat: number; lng: number } | null;
}) => {
  const [map, setMap] = useState<LMap|null>(null); 
  const [marker, setMarker] = useState<LMarker |null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [user, setUser] = useState<{
    username?: string;
    isLoggedIn?: boolean;
    role?: string;
    email?: string;
  } | null>(null);






  useEffect(() => {
          const loadUserData = () => {
            try {
              const getFromStorage = (key: string) =>
                sessionStorage.getItem(key) || localStorage.getItem(key);
      
              const storedUser = getFromStorage('user');
              const storedIsLoggedIn = getFromStorage('isLoggedIn');
      
              let parsedUser: User | null = null;
              let username: string = "";
                let role: string = "";
                let email: string = "";
      
              if (storedUser) {
                try {
                  parsedUser = JSON.parse(storedUser);
                  username = parsedUser?.username || parsedUser?.name || parsedUser?.email?.split('@')[0] || 'User';
                    role = parsedUser?.role || 'customer';
                      email = parsedUser?.email || '';
                } catch (e) {
                  console.error('Error parsing user data:', e);
                }
              }
      
              const isLoggedIn = !!parsedUser || storedIsLoggedIn === 'true';
      
              if (isLoggedIn && username) {
                setUser({
                  username,
                  isLoggedIn: true,
                    role: role,
                      email: email,
                });
              } else {
                setUser({ isLoggedIn: false });
              }
            } catch (err) {
              console.error('Error loading user data:', err);
              setUser({ isLoggedIn: false });
            }
          };
      
          loadUserData();
          const timeoutId = setTimeout(loadUserData, 200);
      
          const handleStorageChange = (e: StorageEvent) => {
            if (['user', 'isLoggedIn'].includes(e.key || '')) {
              loadUserData();
            }
          };
      
          window.addEventListener('storage', handleStorageChange);
          return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('storage', handleStorageChange);
          };
  }, []);
  
  const email = user?.email || '';

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        const mapInstance = L.default.map("map").setView(
          initialLocation ? [initialLocation.lat, initialLocation.lng] : [17.385044, 78.486671],
          13
        );

        L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(mapInstance);

        const markerInstance = L.default.marker(
          initialLocation ? [initialLocation.lat, initialLocation.lng] : [17.385044, 78.486671],
          { draggable: true }
        ).addTo(mapInstance);

        markerInstance.on("dragend", (e: any) => {
          const position = e.target.getLatLng();
          onLocationSelect(position.lat, position.lng);
        });

        mapInstance.on("click", (e: any) => {
          markerInstance.setLatLng(e.latlng);
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });

        setMap(mapInstance);
        setMarker(markerInstance);

        return () => {
          if (mapInstance) {
            mapInstance.remove();
          }
        };
      }).catch((error) => {
        console.error("Error loading Leaflet:", error);
      });
    }
  }, [initialLocation, onLocationSelect]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a location to search");
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (map && marker) {
          map.setView([parseFloat(lat), parseFloat(lon)], 15);
          marker.setLatLng([parseFloat(lat), parseFloat(lon)]);
          onLocationSelect(parseFloat(lat), parseFloat(lon));
          toast.success("Location found!");
        }
      } else {
        toast.error("Location not found. Please try another search.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Error searching location");
    } finally {
      setIsSearching(false);
    }
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (map && marker) {
            map.setView([latitude, longitude], 15);
            marker.setLatLng([latitude, longitude]);
            onLocationSelect(latitude, longitude);
            toast.success("Current location set!");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Unable to get current location");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };

  return (
    <div className="space-y-4 py-3 md:py-auto">
      <div className="md:flex md:flex-row sm:flex sm:flex-col sm:gap-4 ">
        <button
          type="button"
          onClick={getCurrentLocation}
          className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium flex items-center gap-2 mb-4 md:mb-auto w-full md:w-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          My Location
        </button>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search for area, street name..."
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 md:mb-auto w-full md:w-auto"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50 w-full md:w-auto"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>
      <div id="map" className="w-full h-96 rounded-lg border-2 border-gray-300"></div>
      <p className="text-sm text-gray-600">
        <strong>Tip:</strong> Click on the map or drag the marker to set your exact location
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
  pincode: string;
  landmark: string;
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
    state: "",
    pincode: "",
    landmark: "",
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
    // Helper to safely get from storage
    const getFromStorage = (key: string) =>
      typeof window !== 'undefined' ? (sessionStorage.getItem(key) || localStorage.getItem(key)) : null;

    let email = '';

    // First, try to get email from 'user' object (JSON string)
    const storedUser = getFromStorage('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && typeof parsed === 'object' && parsed.email && typeof parsed.email === 'string') {
          email = parsed.email.trim();
        }
      } catch (e) {
        console.warn('Failed to parse user from storage:', e);
      }
    }

    // Fallback: check if 'email' is stored directly
    if (!email) {
      const directEmail = getFromStorage('email');
      if (directEmail) {
        email = directEmail.trim();
      }
    }

    // Prefill only if valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && emailRegex.test(email)) {
      setFormData((prev) => ({ ...prev, email }));
    }
  }, []);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [previewImages, setPreviewImages] = useState({
    logo_url: null,
    background_image_url: null,
  });
  const [packagename, setPackageName] = useState<string | null>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const servicesParam = urlParams.get("services");
    const packageParam = urlParams.get("package");
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
    // if (!formData.state) newErrors.state = "State required";
    if (!formData.pincode.match(/^\d{6}$/)) newErrors.pincode = "Valid 6-digit pincode required";
    if (!formData.latitude || !formData.longitude) newErrors.location = "Please set location on map";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.logo_url) newErrors.logo_url = "Please upload restaurant logo";
    if (formData.cuisines.length === 0) newErrors.cuisines = "Select at least 1 cuisine";
    if (formData.cuisines.length > 3) newErrors.cuisines = "Maximum 3 cuisines allowed";
    // Services are now auto-set, so no validation needed for them here
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.pan_number.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
      newErrors.pan_number = "Valid PAN required (e.g., ABCDE1234F)";
    }
    if (!formData.fullnameaspan.trim()) newErrors.fullnameaspan = "Full name as per PAN required";
    if (!formData.registered_business_address.trim())
      newErrors.registered_business_address = "Registered business address required";
    if (!formData.pan_card) newErrors.pan_card = "PAN card document required";
    if (formData.gst) {
      if (!formData.gst_number.match(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)) {
        newErrors.gst_number = "Valid GST number required";
      }
      if (!formData.gst_certificate) newErrors.gst_certificate = "GST certificate required";
    }
    if (!formData.fssai_number.trim()) newErrors.fssai_number = "FSSAI number required";
    if (!formData.fssai_expiry) newErrors.fssai_expiry = "FSSAI expiry date required";
    if (!formData.fssai_license) newErrors.fssai_license = "FSSAI certificate required";
    if (!formData.bank_accno.match(/^\d{9,18}$/)) newErrors.bank_accno = "Valid account number required";
    if (formData.bank_accno !== formData.bank_accno_confirm) {
      newErrors.bank_accno_confirm = "Account numbers do not match";
    }
    if (!formData.ifsc_code.match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) {
      newErrors.ifsc_code = "Valid IFSC code required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = validateStep3();
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please fill all required fields correctly");
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = (field: keyof FormDataState, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
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
      if (current.length < 3) {
        updateField("cuisines", [...current, cuisine]);
      } else {
        toast.error("Maximum 3 cuisines allowed");
      }
    }
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

  // Function to upload a single file to Strapi
  const uploadFileToStrapi = async (file: File) => { // Changed parameter type to File
    const formDataForUpload = new FormData();
    formDataForUpload.append("files", file);
    try {
      const response = await fetch("https://onboarding-apis.app.f2c.io/api/upload", {
        method: "POST",
        body: formDataForUpload,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`Upload failed: ${response.status} - ${errorData.error?.message || errorData.message}`);
      }
      const result = await response.json();
      // Assuming the API returns an array, get the first file object
      const uploadedFile = result[0];
      if (!uploadedFile || !uploadedFile.id) {
        throw new Error("Upload response did not contain file ID");
      }
      return uploadedFile.id;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) {
      toast.error("Please complete all required fields");
      return;
    }
    const loadingToast = toast.loading("Submitting registration...");
    try {
      // 1. Upload all files first
      const uploadedFileIds: Partial<Record<keyof FormDataState, number>> = {}; // Use Partial Record
      if (formData.logo_url) {
        uploadedFileIds.logo_url = await uploadFileToStrapi(formData.logo_url);
      }
      if (formData.background_image_url) {
        uploadedFileIds.background_image_url = await uploadFileToStrapi(formData.background_image_url);
      }
      if (formData.pan_card) {
        uploadedFileIds.pan_card = await uploadFileToStrapi(formData.pan_card);
      }
      if (formData.gst_certificate) {
        uploadedFileIds.gst_certificate = await uploadFileToStrapi(formData.gst_certificate);
      }
      if (formData.fssai_license) {
        uploadedFileIds.fssai_license = await uploadFileToStrapi(formData.fssai_license);
      }

      // 2. Build restaurant hours (object format)
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

      // 3. Build delivery hours (object format)
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

      // 4. Build takeaway hours (object format)
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
      
      // 5. Build the main payload
      const payload: Record<string, any> = { // Using Record<string, any> for flexibility
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
        // Format cuisines and services as JSON strings as expected by the backend
        cuisines: JSON.stringify(formData.cuisines.map((c) => c.toLowerCase())), // Convert to lowercase if backend expects it
        services: JSON.stringify(formData.services.map((s) => s.toLowerCase())), // Convert to lowercase if backend expects it
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
        package: packagename,
      };

      // Add file IDs to the payload
      if (uploadedFileIds.logo_url) payload.logo_url = { id: uploadedFileIds.logo_url };
      if (uploadedFileIds.background_image_url) payload.background_image_url = { id: uploadedFileIds.background_image_url };
      if (uploadedFileIds.pan_card) payload.pan_card = { id: uploadedFileIds.pan_card };
      if (uploadedFileIds.gst_certificate) payload.gst_certificate = { id: uploadedFileIds.gst_certificate };
      if (uploadedFileIds.fssai_license) payload.fssai_license = { id: uploadedFileIds.fssai_license };

      // Add delivery and takeaway timings if applicable
      if (Object.keys(deliveryHours).length > 0) {
        payload.delivery_timings = { hours: deliveryHours }; // Wrap in 'hours' object
      }
      if (Object.keys(takeawayHours).length > 0) {
        payload.takeaway_timings = { hours: takeawayHours }; // Wrap in 'hours' object
      }

      // 6. Send the main payload
      const token = localStorage.getItem("authToken"); // Assuming token is stored in localStorage
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      console.log("Submitting main payload:", payload);
      const response = await fetch("https://onboarding-apis.app.f2c.io/api/onboardapis", {
        method: "POST",
        headers,
        body: JSON.stringify({ data: payload }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || errorData.message}`);
      }
      const result = await response.json();
      console.log("Submission result:", result);
      toast.dismiss(loadingToast);
      toast.success("Registration completed successfully! 🎉");
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Registration failed. Please try again. Error: ${error.message}`);
      console.error("Error:", error);
    }
  };

  const progressPercent = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-center" />
      <div className="mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete your registration</h1>
          <p className="text-gray-600 mb-4">Let&apos;s get your restaurant online</p>
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
                      currentStep === 3 ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Legal Documents</div>
                    <div className="text-xs text-gray-600 mt-1">PAN, GST, FSSAI & Bank</div>
                  </div>
                </div>
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-gray-300 bg-gray-300"
                          placeholder="your@gmail.com"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
                      initialLocation={
                        formData.latitude && formData.longitude
                          ? {
                              lat: parseFloat(formData.latitude),
                              lng: parseFloat(formData.longitude),
                            }
                          : null
                      }
                    />
                    {errors.location && <p className="text-red-500 text-sm mt-2">{errors.location}</p>}
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
                            onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className={`w-full px-4 py-3 border ${
                              errors.pincode ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder="Pincode *"
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
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-500 transition cursor-pointer">
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload("logo_url", e)}
                            accept="image/jpeg,image/jpg,image/png"
                            className="hidden"
                            id="logo-upload"
                          />
                          <label htmlFor="logo-upload" className="cursor-pointer">
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
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-500 transition cursor-pointer">
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload("background_image_url", e)}
                            accept="image/jpeg,image/jpg,image/png"
                            className="hidden"
                            id="bg-upload"
                          />
                          <label htmlFor="bg-upload" className="cursor-pointer">
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
                    {errors.cuisines && <p className="text-red-500 text-sm mt-2">{errors.cuisines}</p>}
                    <p className="text-sm text-gray-600 mt-3">Selected: {formData.cuisines.length}/3</p>
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Legal Documents</h2>
                    <p className="text-gray-600 mb-6">Provide required documents for verification</p>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-lg mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">PAN Details</h4>
                      <p className="text-sm text-gray-700">
                        Enter the PAN details of the person or company who legally owns the restaurant
                      </p>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            PAN Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.pan_number}
                            onChange={(e) => updateField("pan_number", e.target.value.toUpperCase())}
                            className={`w-full px-4 py-3 border ${
                              errors.pan_number ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono uppercase`}
                            placeholder="ABCDE1234F"
                            maxLength={10}
                          />
                          {errors.pan_number && (
                            <p className="text-red-500 text-sm mt-1">{errors.pan_number}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Full Name as per PAN <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.fullnameaspan}
                            onChange={(e) => updateField("fullnameaspan", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.fullnameaspan ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder="Full name as per PAN"
                          />
                          {errors.fullnameaspan && (
                            <p className="text-red-500 text-sm mt-1">{errors.fullnameaspan}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Registered Business Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.registered_business_address}
                          onChange={(e) => updateField("registered_business_address", e.target.value)}
                          className={`w-full px-4 py-3 border ${
                            errors.registered_business_address ? "border-red-500" : "border-gray-300"
                          } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                          placeholder="Enter complete registered business address as per PAN"
                          rows={3}
                        />
                        {errors.registered_business_address && (
                          <p className="text-red-500 text-sm mt-1">{errors.registered_business_address}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Upload PAN Card <span className="text-red-500">*</span>
                        </label>
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
                              ) : (
                                <div>
                                  <p className="text-gray-800 font-semibold">Upload PAN Card</p>
                                  <p className="text-sm text-gray-500 mt-1">PDF, JPG, PNG up to 5MB</p>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
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
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Upload GST Certificate <span className="text-red-500">*</span>
                          </label>
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
                          {errors.gst_certificate && (
                            <p className="text-red-500 text-sm mt-2">{errors.gst_certificate}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-8">
                    <div className="bg-green-50 border-l-4 border-green-400 p-5 rounded-lg mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">FSSAI License</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        Food license is mandatory for all food businesses
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Name on FSSAI must match restaurant name or PAN name</li>
                        <li>• Address on FSSAI must match restaurant address</li>
                      </ul>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            FSSAI Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.fssai_number}
                            onChange={(e) => updateField("fssai_number", e.target.value)}
                            className={`w-full px-4 py-3 border ${
                              errors.fssai_number ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder="14-digit FSSAI number"
                          />
                          {errors.fssai_number && (
                            <p className="text-red-500 text-sm mt-1">{errors.fssai_number}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Expiry Date <span className="text-red-500">*</span>
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Upload FSSAI License <span className="text-red-500">*</span>
                        </label>
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
                              ) : (
                                <div>
                                  <p className="text-gray-800 font-semibold">Upload FSSAI License</p>
                                  <p className="text-sm text-gray-500 mt-1">PDF, JPG, PNG up to 5MB</p>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
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
                        Your earnings will be deposited to this account
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
                            placeholder="Account number"
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
                            IFSC Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.ifsc_code}
                            onChange={(e) => updateField("ifsc_code", e.target.value.toUpperCase())}
                            className={`w-full px-4 py-3 border ${
                              errors.ifsc_code ? "border-red-500" : "border-gray-300"
                            } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono uppercase`}
                            placeholder="SBIN0001234"
                            maxLength={11}
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
                            <option value="savings">Savings Account</option>
                            <option value="current">Current Account</option>
                          </select>
                        </div>
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
                {currentStep < 3 ? (
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
                    Submit Registration
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