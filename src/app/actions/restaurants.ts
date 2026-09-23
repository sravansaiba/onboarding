"use server";

import { revalidatePath } from "next/cache";
import {
  deleteRestaurantAsset,
  insertRestaurantImageRecords,
  listRestaurantImages,
  uploadRestaurantAsset,
  type StoredAsset,
} from "./restaurant-images";
import {
  getSupabaseAdmin,
  getUserFromAccessToken,
  requireSuperAdmin,
  requireStaffOrAdmin,
  isStaffOrSuperAdminRole,
  isSuperAdminRole,
  type ActionResult,
} from "./supabase/server";
import type { OnboardingApplication } from "./onboarding-applications";
import { writeAuditLog, loggedAction } from "./app-logs";
import { formatAddress, buildStructuredAddress, parseStructuredAddress } from "@/src/lib/utils/address";
import { fetchAllPaginatedRows } from "@/src/lib/utils/supabase-pagination";
import { getServicesForPackage } from "@/src/lib/constants/restaurant-options";

export type RestaurantRecord = {
  id: string;
  restaurant_name: string;
  domain_name: string;
  domain_url: string | null;
  description: string | null;
  about: string | null;
  address: string;
  raw_address?: any;
  email: string | null;
  contact: number | null;
  package: string;
  is_active: boolean;
  services: string[];
  cuisines: string[] | null;
  timings: Record<string, unknown> | null;
  delivery_timings: Record<string, unknown> | null;
  takeaway_timings: Record<string, unknown> | null;
  gst_number: string | null;
  fssai_number: string | null;
  logo_url: string | null;
  background_image_url: string | null;
  pos_domain: string | null;
  theme?: string | null;
  fullname?: string | null;
  owner_name?: string | null;
  fssai_expiry?: string | null;
  pan_number?: string | null;
  fullnameaspan?: string | null;
  registered_business_address?: string | null;
  bank_accno?: string | null;
  ifsc_code?: string | null;
  account_type?: string | null;
  pan_card_url?: string | null;
  gst_certificate_url?: string | null;
  fssai_license_url?: string | null;
  other_info?: Record<string, any> | null;
  time_zone: string;
  updated_at: string;
  created_at: string;
  images?: StoredAsset[];
  created_by?: string | null;
  creator_role?: "staff" | "super_admin" | "admin" | string | null;
  creator_name?: string | null;
  creator_email?: string | null;
};

export type DirectRestaurantInput = {
  restaurant_name: string;
  fullname?: string;
  timings?: any;
  domain_name?: string;
  domain_url?: string;
  email?: string;
  contact?: string;
  address: string;
  services?: string[];
  cuisines?: string[];
  package: string;
  description?: string;
  about?: string;
  gst_number?: string;
  fssai_number?: string;
  fssai_expiry?: string;
  pan_number?: string;
  fullnameaspan?: string;
  registered_business_address?: string;
  bank_accno?: string;
  ifsc_code?: string;
  account_type?: string;
  other_info?: Record<string, any>;
  pos_domain?: string;
  theme?: string;
  time_zone?: string;
};

export type UpdateRestaurantInput = {
  restaurant_name: string;
  domain_name?: string;
  domain_url?: string;
  email?: string;
  contact?: string;
  address: string;
  package: string;
  services?: string[];
  cuisines?: string[];
  description?: string;
  about?: string;
  gst_number?: string;
  fssai_number?: string;
  fssai_expiry?: string;
  pan_number?: string;
  fullnameaspan?: string;
  registered_business_address?: string;
  bank_accno?: string;
  ifsc_code?: string;
  account_type?: string;
  other_info?: Record<string, any>;
  pos_domain?: string;
  theme?: string;
  time_zone?: string;
};

function compactAddress(address: unknown): string {
  return formatAddress(address);
}

function numericContact(value?: string | null): number | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function getPublicUrl(asset?: StoredAsset): string | null {
  return asset?.public_url ?? null;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 48);
}

async function getAvailableDomainName(baseName: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const base = slugify(baseName) || `restaurant${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  while (suffix < 50) {
    const [{ data: restaurant }, { data: application }] = await Promise.all([
      admin.from("restaurants").select("id").eq("domain_name", candidate).maybeSingle(),
      admin.from("onboarding_applications").select("id").eq("domain_name", candidate).maybeSingle(),
    ]);

    if (!restaurant && !application) return candidate;
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return `${base}${Date.now()}`;
}

async function checkUrlCollisions(
  domainUrl: string | null | undefined,
  posDomain: string | null | undefined,
  excludeRestaurantId?: string
) {
  if (!domainUrl && !posDomain) return;
  const admin = getSupabaseAdmin();

  if (domainUrl) {
    let query = admin.from("restaurants").select("id, restaurant_name").eq("domain_url", domainUrl);
    if (excludeRestaurantId) {
      query = query.neq("id", excludeRestaurantId);
    }
    const { data } = await query.maybeSingle();
    if (data) {
      throw new Error(`Food Ordering App URL "${domainUrl}" is already present with another restaurant (${data.restaurant_name}).`);
    }
  }

  if (posDomain) {
    let query = admin.from("restaurants").select("id, restaurant_name").eq("pos_domain", posDomain);
    if (excludeRestaurantId) {
      query = query.neq("id", excludeRestaurantId);
    }
    const { data } = await query.maybeSingle();
    if (data) {
      throw new Error(`POS Domain "${posDomain}" is already present with another restaurant (${data.restaurant_name}).`);
    }
  }
}

// ---------------------------------------------------------------------------
// Approve onboarding Ã¢â€ â€™ create restaurant
// ---------------------------------------------------------------------------

export async function approveOnboardingApplication(
  accessToken: string,
  applicationId: string
): Promise<ActionResult<{ restaurantId: string }>> {
  return loggedAction(
    { actionName: "approveOnboardingApplication", httpMethod: "POST", httpPath: "/restaurants/approve" },
    async (ctx) => {
      const reviewer = await requireSuperAdmin(accessToken);
      ctx.actorId = reviewer.id;

      const admin = getSupabaseAdmin();
      const { data: application, error: appError } = await admin
        .from("onboarding_applications")
        .select("*")
        .eq("id", applicationId)
        .single();

      if (appError) throw new Error(appError.message);
      if (!application) throw new Error("Application not found.");
      if (application.status === "accepted") {
        return { ok: true, data: { restaurantId: application.restaurant_id } };
      }

      const app = application as OnboardingApplication;
      const legal = app.legal ?? {};
      const images = app.images ?? {};
      const documents = app.documents ?? {};
      const allAssets = [...Object.values(images), ...Object.values(documents)].filter(Boolean) as StoredAsset[];

      const cleanDomain = app.domain_name.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      const defaultDomainUrl = `${cleanDomain}.marinate360.com`;
      const defaultPosDomain = "pos.marinate360.com";

      let coords: { latitude?: number | null; longitude?: number | null } | undefined = undefined;
      if (app.mapEmbedUrl && app.mapEmbedUrl.includes("[")) {
        try {
          const parsedCoords = JSON.parse(app.mapEmbedUrl);
          if (Array.isArray(parsedCoords) && parsedCoords.length === 2) {
            coords = { latitude: parseFloat(parsedCoords[0]), longitude: parseFloat(parsedCoords[1]) };
          }
        } catch {}
      }

      const appInsertPayload: Record<string, any> = {
        restaurant_name: app.restaurant_name,
        domain_name: cleanDomain,
        domain_url: defaultDomainUrl,
        logo_url: getPublicUrl(images.logo_url),
        background_image_url: getPublicUrl(images.background_image_url),
        is_active: true,
        services: app.services && app.services.length > 0 ? app.services : getServicesForPackage(app.package),
        address: buildStructuredAddress(app.address, coords),
        cuisines: app.cuisines,
        timings: app.timings,
        contact: numericContact(app.restaurant_primary_contact || app.phone),
        email: app.email,
        theme: "light",
        about: null,
        delivery_timings: app.delivery_timings,
        takeaway_timings: app.takeaway_timings,
        gst_number: String(legal.gst_number ?? "") || null,
        fssai_number: String(legal.fssai_number ?? "") || null,
        package: app.package || "marinate-menu",
        pos_domain: defaultPosDomain,
        time_zone: "Asia/Kolkata",
        created_by: reviewer.id,
      };

      let { data: restaurant, error: restaurantError } = await admin
        .from("restaurants")
        .insert(appInsertPayload)
        .select("id")
        .single();

      if (restaurantError && restaurantError.message && restaurantError.message.includes("created_by")) {
        delete appInsertPayload.created_by;
        const retry = await admin
          .from("restaurants")
          .insert(appInsertPayload)
          .select("id")
          .single();
        restaurant = retry.data;
        restaurantError = retry.error;
      }

      if (restaurantError || !restaurant) throw new Error(restaurantError?.message || "Failed to create restaurant.");

      ctx.restaurantId = restaurant.id;
      await insertRestaurantImageRecords(restaurant.id, allAssets);

      if (app.submitted_by) {
        const { data: currentProfile } = await admin
          .from("profiles")
          .select("restaurant_id, restaurant_ids")
          .eq("id", app.submitted_by)
          .single();

        const existingIds = Array.isArray(currentProfile?.restaurant_ids)
          ? currentProfile.restaurant_ids
          : currentProfile?.restaurant_id
          ? [currentProfile.restaurant_id]
          : [];

        const updatedIds = Array.from(new Set([...existingIds, restaurant.id]));

        const { error: profileError } = await admin
          .from("profiles")
          .update({
            restaurant_id: currentProfile?.restaurant_id || restaurant.id,
            restaurant_ids: updatedIds,
            role: "admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", app.submitted_by);

        if (profileError) throw new Error(profileError.message);
      }

      const { error: updateError } = await admin
        .from("onboarding_applications")
        .update({
          status: "accepted",
          restaurant_id: restaurant.id,
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (updateError) throw new Error(updateError.message);

      void writeAuditLog({
        source: "approveOnboardingApplication",
        eventType: "application.approved",
        actorId: reviewer.id,
        restaurantId: restaurant.id,
        entityType: "onboarding_application",
        entityId: applicationId,
        message: `Approved onboarding and created restaurant ${app.restaurant_name}.`,
        metadata: { domain_name: cleanDomain, submitted_by: app.submitted_by },
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { restaurantId: restaurant.id } };
    }
  );
}

// ---------------------------------------------------------------------------
// Reject onboarding
// ---------------------------------------------------------------------------

export async function rejectOnboardingApplication(
  accessToken: string,
  applicationId: string,
  reviewNotes: string
): Promise<ActionResult<{ id: string }>> {
  return loggedAction(
    { actionName: "rejectOnboardingApplication", httpMethod: "PUT", httpPath: "/applications/reject" },
    async (ctx) => {
      const reviewer = await requireSuperAdmin(accessToken);
      ctx.actorId = reviewer.id;

      const admin = getSupabaseAdmin();
      const { error } = await admin
        .from("onboarding_applications")
        .update({
          status: "rejected",
          review_notes: reviewNotes || "Rejected by super admin.",
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (error) throw new Error(error.message);

      void writeAuditLog({
        source: "rejectOnboardingApplication",
        eventType: "application.rejected",
        actorId: reviewer.id,
        entityType: "onboarding_application",
        entityId: applicationId,
        level: "warning",
        message: "Rejected onboarding application.",
        metadata: { review_notes: reviewNotes || "Rejected by super admin." },
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { id: applicationId } };
    }
  );
}

// ---------------------------------------------------------------------------
// List restaurants (Staff & Admin)
// ---------------------------------------------------------------------------

export async function listRestaurants(accessToken: string): Promise<ActionResult<RestaurantRecord[]>> {
  return loggedAction(
    { actionName: "listRestaurants", httpMethod: "GET", httpPath: "/restaurants" },
    async (ctx) => {
      const actor = await requireStaffOrAdmin(accessToken);
      ctx.actorId = actor.id;

      const admin = getSupabaseAdmin();

      // Exhaustively fetch all restaurants using pagination (1000 records per batch)
      const rawRestaurants = await fetchAllPaginatedRows<any>((from, to) =>
        admin
          .from("restaurants")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to)
      );

      // Collect creator IDs to batch-resolve creator details (role, email, name)
      const creatorIds = Array.from(
        new Set(rawRestaurants.map((r) => r.created_by).filter((id): id is string => Boolean(id)))
      );

      const creatorMap = new Map<string, { role: string; email?: string | null; full_name?: string | null }>();
      if (creatorIds.length > 0) {
        const profiles = await fetchAllPaginatedRows<any>((from, to) =>
          admin
            .from("profiles")
            .select("id, role, email, first_name, last_name")
            .in("id", creatorIds)
            .range(from, to)
        );
        for (const p of profiles) {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || null;
          creatorMap.set(p.id, {
            role: p.role,
            email: p.email,
            full_name: name,
          });
        }
      }

      const formatted = rawRestaurants.map((item) => {
        const creator = item.created_by ? creatorMap.get(item.created_by) : undefined;
        return {
          ...item,
          address: formatAddress(item.address),
          created_by: item.created_by ?? null,
          creator_role: creator?.role ?? null,
          creator_email: creator?.email ?? null,
          creator_name: creator?.full_name ?? null,
        };
      });

      return { ok: true, data: formatted as RestaurantRecord[] };
    }
  );
}

// ---------------------------------------------------------------------------
// Get Restaurant Details with Images & Documents
// ---------------------------------------------------------------------------

export async function getRestaurantDetails(
  accessToken: string,
  restaurantId: string
): Promise<ActionResult<RestaurantRecord>> {
  return loggedAction(
    { actionName: "getRestaurantDetails", httpMethod: "GET", httpPath: `/restaurants/${restaurantId}` },
    async (ctx) => {
      const actor = await getUserFromAccessToken(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Restaurant not found.");

      const isStaffOrAdmin = isStaffOrSuperAdminRole(actor.role);
      const isOwner =
        data.created_by === actor.id ||
        (data.email && actor.email && data.email.toLowerCase() === actor.email.toLowerCase()) ||
        (Array.isArray(actor.restaurant_ids) && actor.restaurant_ids.includes(restaurantId)) ||
        actor.restaurant_id === restaurantId;

      if (!isStaffOrAdmin && !isOwner) {
        const { data: userApp } = await admin
          .from("onboarding_applications")
          .select("id")
          .or(`submitted_by.eq.${actor.id},email.eq.${actor.email}`)
          .or(`restaurant_id.eq.${restaurantId},domain_name.eq.${data.domain_name}`)
          .maybeSingle();

        if (!userApp) {
          throw new Error("You are not authorized to view this restaurant.");
        }
      }

      const images = await listRestaurantImages(restaurantId);

      const panCardAsset = images.find(
        (img) =>
          img.image_type === "pan_card" ||
          img.image_type === "pan" ||
          (img.image_type === "certificates" && img.original_name.toLowerCase().includes("pan")) ||
          img.storage_path.toLowerCase().includes("pan")
      );
      const gstAsset = images.find(
        (img) =>
          img.image_type === "gst_certificate" ||
          img.image_type === "gst" ||
          (img.image_type === "certificates" && img.original_name.toLowerCase().includes("gst")) ||
          img.storage_path.toLowerCase().includes("gst")
      );
      const fssaiAsset = images.find(
        (img) =>
          img.image_type === "fssai_license" ||
          img.image_type === "fssai" ||
          (img.image_type === "certificates" && img.original_name.toLowerCase().includes("fssai")) ||
          img.storage_path.toLowerCase().includes("fssai")
      );

      let otherInfo: Record<string, any> = (data.other_info && typeof data.other_info === "object") ? data.other_info : {};

      if (Object.keys(otherInfo).length === 0) {
        const { data: settingRow } = await admin
          .from("restaurant_settings")
          .select("setting_value")
          .eq("restaurant_id", restaurantId)
          .eq("setting_key", "other_info")
          .maybeSingle();

        if (settingRow?.setting_value) {
          try {
            otherInfo = typeof settingRow.setting_value === "string" ? JSON.parse(settingRow.setting_value) : settingRow.setting_value;
          } catch {}
        }
      }

      if (Object.keys(otherInfo).length === 0) {
        const { data: appData } = await admin
          .from("onboarding_applications")
          .select("legal, bank, address")
          .or(`restaurant_id.eq.${restaurantId},domain_name.eq.${data.domain_name}`)
          .maybeSingle();

        if (appData) {
          otherInfo = {
            pan_number: (appData.legal as any)?.pan_number || "",
            fullnameaspan: (appData.legal as any)?.fullnameaspan || "",
            registered_business_address: (appData.address as any)?.registered_business_address || "",
            fssai_expiry: (appData.legal as any)?.fssai_expiry || "",
            bank_accno: (appData.bank as any)?.bank_accno || "",
            ifsc_code: (appData.bank as any)?.ifsc_code || "",
            account_type: (appData.bank as any)?.account_type || "savings",
          };
        }
      }

      let ownerName: string | null = otherInfo.fullname || otherInfo.owner_name || null;
      if (!ownerName && (restaurantId || data.email)) {
        try {
          const { data: prof } = await admin
            .from("profiles")
            .select("username, first_name, last_name, email")
            .or(`restaurant_id.eq.${restaurantId},email.eq.${data.email}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (prof) {
            const combined = [prof.first_name, prof.last_name].filter(Boolean).join(" ");
            ownerName = combined || prof.username || null;
          }
        } catch (e) {}
      }

      if (!ownerName) {
        try {
          const { data: appData } = await admin
            .from("onboarding_applications")
            .select("owner_name")
            .or(`restaurant_id.eq.${restaurantId},domain_name.eq.${data.domain_name}`)
            .maybeSingle();

          if (appData?.owner_name) {
            ownerName = appData.owner_name;
          }
        } catch (e) {}
      }

      const record: RestaurantRecord = {
        ...data,
        address: typeof data.address === "string" ? data.address : JSON.stringify(data.address),
        raw_address: data.address,
        fullname: ownerName || otherInfo.fullname || null,
        owner_name: ownerName || otherInfo.owner_name || null,
        other_info: otherInfo,
        pan_number: otherInfo.pan_number || null,
        fullnameaspan: otherInfo.fullnameaspan || null,
        registered_business_address: otherInfo.registered_business_address || null,
        fssai_expiry: otherInfo.fssai_expiry || null,
        bank_accno: otherInfo.bank_accno || null,
        ifsc_code: otherInfo.ifsc_code || null,
        account_type: otherInfo.account_type || null,
        pan_card_url: panCardAsset?.public_url || otherInfo.pan_card_url || null,
        gst_certificate_url: gstAsset?.public_url || otherInfo.gst_certificate_url || null,
        fssai_license_url: fssaiAsset?.public_url || otherInfo.fssai_license_url || null,
        images,
      };

      return { ok: true, data: record };
    }
  );
}

// ---------------------------------------------------------------------------
// Create restaurant directly with File Uploads (Staff & Super Admin)
// ---------------------------------------------------------------------------

export async function createRestaurantWithFormData(
  formData: FormData
): Promise<ActionResult<{ restaurantId: string; adminPassword?: string | null; adminEmail?: string | null }>> {
  const accessToken = String(formData.get("accessToken") || "");
  const payloadStr = String(formData.get("payload") || "{}");
  const payload = JSON.parse(payloadStr) as DirectRestaurantInput;

  return loggedAction(
    { actionName: "createRestaurantWithFormData", httpMethod: "POST", httpPath: "/restaurants" },
    async (ctx) => {
      const actor = await requireStaffOrAdmin(accessToken);
      ctx.actorId = actor.id;

      if (!payload.restaurant_name || !payload.restaurant_name.trim()) {
        throw new Error("Restaurant name is required.");
      }

      const domainName = (await getAvailableDomainName(payload.restaurant_name)).toLowerCase().trim();
      const assignedServices = getServicesForPackage(payload.package || "marinate-menu");

      const defaultDomainUrl = payload.domain_url?.trim() || `${domainName}.marinate360.com`;
      const defaultPosDomain = payload.pos_domain?.trim() || `pos.marinate360.com`;

      // Check collision
      await checkUrlCollisions(defaultDomainUrl, defaultPosDomain);

      // Handle file uploads
      const uploadedAssets: StoredAsset[] = [];
      const fileMappings: Array<[string, string]> = [
        ["logo_url", "logo"],
        ["background_image_url", "background"],
        ["pan_card", "certificates"],
        ["gst_certificate", "certificates"],
        ["fssai_license", "certificates"],
      ];

      let logoUrl: string | null = null;
      let backgroundImageUrl: string | null = null;

      for (const [fieldKey, imageType] of fileMappings) {
        const file = formData.get(fieldKey);
        if (file instanceof File && file.size > 0) {
          const asset = await uploadRestaurantAsset(domainName, imageType, file);
          uploadedAssets.push(asset);
          if (fieldKey === "logo_url") logoUrl = asset.public_url;
          if (fieldKey === "background_image_url") backgroundImageUrl = asset.public_url;
        }
      }

      const admin = getSupabaseAdmin();

      const otherInfoToSave = {
        fullname: payload.fullname || (payload as any).owner_name || (payload.other_info as any)?.fullname || (payload.other_info as any)?.owner_name || null,
        owner_name: payload.fullname || (payload as any).owner_name || (payload.other_info as any)?.owner_name || (payload.other_info as any)?.fullname || null,
        pan_number: payload.pan_number || (payload as any).pan || (payload.other_info as any)?.pan_number || null,
        fullnameaspan: payload.fullnameaspan || (payload.other_info as any)?.fullnameaspan || null,
        registered_business_address: payload.registered_business_address || (payload.other_info as any)?.registered_business_address || null,
        fssai_expiry: payload.fssai_expiry || (payload.other_info as any)?.fssai_expiry || null,
        bank_accno: payload.bank_accno || (payload.other_info as any)?.bank_accno || null,
        ifsc_code: payload.ifsc_code || (payload.other_info as any)?.ifsc_code || null,
        account_type: payload.account_type || (payload.other_info as any)?.account_type || "savings",
      };

      const insertPayload: Record<string, any> = {
        restaurant_name: payload.restaurant_name.trim(),
        domain_name: domainName,
        domain_url: defaultDomainUrl,
        logo_url: logoUrl,
        background_image_url: backgroundImageUrl,
        is_active: true,
        services: assignedServices,
        address: buildStructuredAddress(payload.address, {
          latitude: (payload as any).latitude,
          longitude: (payload as any).longitude,
        }),
        cuisines: payload.cuisines && payload.cuisines.length > 0 ? payload.cuisines : ["North Indian"],
        timings: payload.timings || { hours: {} },
        contact: numericContact(payload.contact),
        email: payload.email ? payload.email.trim() : null,
        theme: "light",
        description: payload.description || null,
        about: payload.about || null,
        gst_number: payload.gst_number || null,
        fssai_number: payload.fssai_number || null,
        other_info: otherInfoToSave,
        package: payload.package || "marinate-menu",
        pos_domain: defaultPosDomain,
        time_zone: payload.time_zone || "Asia/Kolkata",
        created_by: actor.id,
      };

      let { data, error } = await admin
        .from("restaurants")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error && error.message && error.message.includes("other_info")) {
        delete insertPayload.other_info;
        const retry = await admin
          .from("restaurants")
          .insert(insertPayload)
          .select("id")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error && error.message && error.message.includes("created_by")) {
        delete insertPayload.created_by;
        const retry = await admin
          .from("restaurants")
          .insert(insertPayload)
          .select("id")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error || !data) throw new Error(error?.message || "Failed to create restaurant.");
      ctx.restaurantId = data.id;

      if (uploadedAssets.length > 0) {
        await insertRestaurantImageRecords(data.id, uploadedAssets);
      }

      let generatedAdminPassword: string | null = null;
      let targetEmail: string | null = null;

      // Provision or link admin user account for the specified owner email
      if (payload.email && payload.email.trim()) {
        targetEmail = payload.email.trim().toLowerCase();

        try {
          const { data: existingProfile } = await admin
            .from("profiles")
            .select("id, restaurant_id, restaurant_ids, role")
            .eq("email", targetEmail)
            .maybeSingle();

          if (existingProfile) {
            const existingIds = Array.isArray(existingProfile.restaurant_ids)
              ? existingProfile.restaurant_ids
              : existingProfile.restaurant_id
              ? [existingProfile.restaurant_id]
              : [];
            const updatedIds = Array.from(new Set([...existingIds, data.id]));

            await admin
              .from("profiles")
              .update({
                restaurant_id: existingProfile.restaurant_id || data.id,
                restaurant_ids: updatedIds,
                role: "admin",
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingProfile.id);
          } else {
            // Auto-generate password with marinate@<random 4 digits>
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const autoPassword = `marinate@${randomSuffix}`;
            generatedAdminPassword = autoPassword;

            const { data: createdAuthUser, error: authCreateErr } = await admin.auth.admin.createUser({
              email: targetEmail,
              password: autoPassword,
              email_confirm: true,
              user_metadata: {
                username: payload.fullname || targetEmail.split("@")[0],
                full_name: payload.fullname || targetEmail.split("@")[0],
                role: "admin",
              },
            });

            if (createdAuthUser?.user?.id) {
              await admin
                .from("profiles")
                .upsert({
                  id: createdAuthUser.user.id,
                  email: targetEmail,
                  username: payload.fullname || targetEmail.split("@")[0],
                  first_name: payload.fullname ? payload.fullname.split(" ")[0] : null,
                  last_name: payload.fullname && payload.fullname.split(" ").length > 1 ? payload.fullname.split(" ").slice(1).join(" ") : null,
                  role: "admin",
                  restaurant_id: data.id,
                  restaurant_ids: [data.id],
                  updated_at: new Date().toISOString(),
                });
            } else if (authCreateErr) {
              console.warn("Could not create auth user for owner email:", authCreateErr.message);
              // If user is already registered in Auth, find them and link/promote to admin
              try {
                const { data: listData } = await admin.auth.admin.listUsers();
                const existingAuth = listData?.users?.find(
                  (u) => u.email?.toLowerCase() === targetEmail
                );
                if (existingAuth) {
                  await admin.auth.admin.updateUserById(existingAuth.id, {
                    user_metadata: {
                      ...(existingAuth.user_metadata || {}),
                      role: "admin",
                      full_name: payload.fullname || existingAuth.user_metadata?.full_name,
                    },
                  });
                  await admin.from("profiles").upsert({
                    id: existingAuth.id,
                    email: targetEmail,
                    username: payload.fullname || existingAuth.email?.split("@")[0],
                    role: "admin",
                    restaurant_id: data.id,
                    restaurant_ids: [data.id],
                    updated_at: new Date().toISOString(),
                  });
                }
              } catch (lookupErr) {
                console.warn("Failed syncing existing auth user:", lookupErr);
              }
            }
          }
        } catch (provisionErr: any) {
          console.warn("Failed provisioning admin user for owner email:", provisionErr?.message || provisionErr);
        }
      }

      // Resilient fallback storage in restaurant_settings
      try {
        await admin.from("restaurant_settings").upsert({
          restaurant_id: data.id,
          setting_key: "other_info",
          setting_value: JSON.stringify(otherInfoToSave),
          updated_at: new Date().toISOString(),
        }, { onConflict: "restaurant_id,setting_key" });
      } catch (settingsErr) {
        console.warn("Could not save other_info to restaurant_settings on creation:", settingsErr);
      }

      void writeAuditLog({
        source: "createRestaurantWithFormData",
        eventType: "restaurant.created",
        actorId: actor.id,
        restaurantId: data.id,
        entityType: "restaurant",
        entityId: data.id,
        message: `Created restaurant ${payload.restaurant_name} with files.`,
        metadata: { domain_name: domainName, package: payload.package, logo_uploaded: Boolean(logoUrl) },
      });

      revalidatePath("/dashboard");
      return {
        ok: true,
        data: {
          restaurantId: data.id,
          adminPassword: generatedAdminPassword,
          adminEmail: targetEmail,
        },
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Legacy JSON Create restaurant direct fallback
// ---------------------------------------------------------------------------

export async function createRestaurantDirect(
  accessToken: string,
  values: DirectRestaurantInput
): Promise<ActionResult<{ restaurantId: string }>> {
  const fd = new FormData();
  fd.append("accessToken", accessToken);
  fd.append("payload", JSON.stringify(values));
  return createRestaurantWithFormData(fd);
}

// ---------------------------------------------------------------------------
// Update restaurant with File Uploads (Staff & Super Admin)
// ---------------------------------------------------------------------------

export async function updateRestaurantWithFormData(
  formData: FormData
): Promise<ActionResult<RestaurantRecord>> {
  const accessToken = String(formData.get("accessToken") || "");
  const restaurantId = String(formData.get("restaurantId") || "");
  const payloadStr = String(formData.get("payload") || "{}");
  const payload = JSON.parse(payloadStr) as UpdateRestaurantInput & {
    deletedFilePaths?: string[];
  };

  return loggedAction(
    { actionName: "updateRestaurantWithFormData", httpMethod: "PUT", httpPath: `/restaurants/${restaurantId}` },
    async (ctx) => {
      const actor = await getUserFromAccessToken(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      const admin = getSupabaseAdmin();

      // Fetch existing restaurant
      const { data: existing, error: findError } = await admin
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .single();

      if (findError || !existing) throw new Error("Restaurant not found.");

      const isStaffOrAdmin = isStaffOrSuperAdminRole(actor.role);
      const isOwner =
        existing.created_by === actor.id ||
        (existing.email && actor.email && existing.email.toLowerCase() === actor.email.toLowerCase()) ||
        (Array.isArray(actor.restaurant_ids) && actor.restaurant_ids.includes(restaurantId)) ||
        actor.restaurant_id === restaurantId;

      if (!isStaffOrAdmin && !isOwner) {
        const { data: userApp } = await admin
          .from("onboarding_applications")
          .select("id")
          .or(`submitted_by.eq.${actor.id},email.eq.${actor.email}`)
          .or(`restaurant_id.eq.${restaurantId},domain_name.eq.${existing.domain_name}`)
          .maybeSingle();

        if (!userApp) {
          throw new Error("You are not authorized to update this restaurant.");
        }
      }

      // Non-staff/non-admins cannot modify platform-managed domains or statuses
      if (!isStaffOrAdmin) {
        delete payload.domain_url;
        delete payload.pos_domain;
        delete (payload as any).is_active;
        delete (payload as any).status;
      }

      const domainName = (existing.domain_name || slugify(payload.restaurant_name)).toLowerCase().trim();

      // Check collision on domain_url and pos_domain
      if (payload.domain_url || payload.pos_domain) {
        await checkUrlCollisions(payload.domain_url, payload.pos_domain, restaurantId);
      }

      // Handle deleted files
      if (payload.deletedFilePaths && payload.deletedFilePaths.length > 0) {
        for (const filePath of payload.deletedFilePaths) {
          await deleteRestaurantAsset(filePath);
        }
      }

      // Handle new file uploads
      const uploadedAssets: StoredAsset[] = [];
      const fileMappings: Array<[string, string]> = [
        ["logo_url", "logo"],
        ["background_image_url", "background"],
        ["pan_card", "certificates"],
        ["gst_certificate", "certificates"],
        ["fssai_license", "certificates"],
      ];

      let newLogoUrl = existing.logo_url;
      let newBackgroundUrl = existing.background_image_url;

      for (const [fieldKey, imageType] of fileMappings) {
        const file = formData.get(fieldKey);
        if (file instanceof File && file.size > 0) {
          // If replacing logo, delete old logo from storage
          if (fieldKey === "logo_url" && existing.logo_url) {
            await deleteRestaurantAsset(existing.logo_url);
          }
          if (fieldKey === "background_image_url" && existing.background_image_url) {
            await deleteRestaurantAsset(existing.background_image_url);
          }

          const asset = await uploadRestaurantAsset(domainName, imageType, file);
          uploadedAssets.push(asset);
          if (fieldKey === "logo_url") newLogoUrl = asset.public_url;
          if (fieldKey === "background_image_url") newBackgroundUrl = asset.public_url;
        }
      }

      if (uploadedAssets.length > 0) {
        await insertRestaurantImageRecords(restaurantId, uploadedAssets);
      }

      const assignedServices = payload.services && payload.services.length > 0
        ? payload.services
        : getServicesForPackage(payload.package || existing.package);

      const isSuperAdmin = actor.role === "super_admin";
      const domainUrlToSave = isSuperAdmin && payload.domain_url ? payload.domain_url.trim() : existing.domain_url;
      const posDomainToSave = isSuperAdmin && payload.pos_domain ? payload.pos_domain.trim() : existing.pos_domain;

      const otherInfoToSave = {
        ...((existing.other_info as any) || {}),
        ...((payload as any).other_info || {}),
        fullname: payload.fullname ?? (payload as any).other_info?.fullname ?? (payload as any).other_info?.owner_name ?? (existing.other_info as any)?.fullname ?? (existing.other_info as any)?.owner_name ?? null,
        owner_name: payload.fullname ?? (payload as any).other_info?.owner_name ?? (payload as any).other_info?.fullname ?? (existing.other_info as any)?.owner_name ?? (existing.other_info as any)?.fullname ?? null,
        pan_number: payload.pan_number ?? (payload as any).other_info?.pan_number ?? (existing.other_info as any)?.pan_number ?? null,
        fullnameaspan: payload.fullnameaspan ?? (payload as any).other_info?.fullnameaspan ?? (existing.other_info as any)?.fullnameaspan ?? null,
        registered_business_address: payload.registered_business_address ?? (payload as any).other_info?.registered_business_address ?? (existing.other_info as any)?.registered_business_address ?? null,
        fssai_expiry: payload.fssai_expiry ?? (payload as any).other_info?.fssai_expiry ?? (existing.other_info as any)?.fssai_expiry ?? null,
        bank_accno: payload.bank_accno ?? (payload as any).other_info?.bank_accno ?? (existing.other_info as any)?.bank_accno ?? null,
        ifsc_code: payload.ifsc_code ?? (payload as any).other_info?.ifsc_code ?? (existing.other_info as any)?.ifsc_code ?? null,
        account_type: payload.account_type ?? (payload as any).other_info?.account_type ?? (existing.other_info as any)?.account_type ?? null,
      };

      const updateData: Record<string, any> = {
        restaurant_name: payload.restaurant_name.trim(),
        domain_url: domainUrlToSave,
        email: payload.email ? payload.email.trim() : null,
        contact: numericContact(payload.contact),
        address: buildStructuredAddress(payload.address, {
          latitude: (payload as any).latitude !== undefined ? (payload as any).latitude : parseStructuredAddress(existing.address)?.latitude,
          longitude: (payload as any).longitude !== undefined ? (payload as any).longitude : parseStructuredAddress(existing.address)?.longitude,
        }),
        package: payload.package || existing.package,
        services: assignedServices,
        cuisines: payload.cuisines && payload.cuisines.length > 0 ? payload.cuisines : existing.cuisines,
        timings: (payload as any).timings || existing.timings,
        description: payload.description || null,
        about: payload.about || null,
        gst_number: payload.gst_number || null,
        fssai_number: payload.fssai_number || null,
        other_info: otherInfoToSave,
        pos_domain: payload.pos_domain || existing.pos_domain,
        time_zone: payload.time_zone || existing.time_zone || "Asia/Kolkata",
        theme: payload.theme || existing.theme || "light",
        logo_url: newLogoUrl,
        background_image_url: newBackgroundUrl,
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await admin
        .from("restaurants")
        .update(updateData)
        .eq("id", restaurantId)
        .select("*")
        .single();

      if (error && error.message && error.message.includes("other_info")) {
        delete updateData.other_info;
        const retry = await admin
          .from("restaurants")
          .update(updateData)
          .eq("id", restaurantId)
          .select("*")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw new Error(error.message);

      // Resilient fallback storage in restaurant_settings
      try {
        await admin.from("restaurant_settings").upsert({
          restaurant_id: restaurantId,
          setting_key: "other_info",
          setting_value: JSON.stringify(otherInfoToSave),
          updated_at: new Date().toISOString(),
        }, { onConflict: "restaurant_id,setting_key" });
      } catch (settingsErr) {
        console.warn("Could not save to restaurant_settings:", settingsErr);
      }

      if (payload.fullname) {
        try {
          const parts = payload.fullname.trim().split(" ");
          const firstName = parts[0] || null;
          const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
          await admin
            .from("profiles")
            .update({
              first_name: firstName,
              last_name: lastName,
              username: payload.fullname.trim(),
              updated_at: new Date().toISOString(),
            })
            .or(`restaurant_id.eq.${restaurantId},email.eq.${payload.email || existing.email}`);
        } catch (profErr) {
          console.warn("Could not sync profile full name on restaurant update:", profErr);
        }
      }

      void writeAuditLog({
        source: "updateRestaurantWithFormData",
        eventType: "restaurant.updated",
        actorId: actor.id,
        restaurantId,
        entityType: "restaurant",
        entityId: restaurantId,
        message: `Updated restaurant details for ${payload.restaurant_name}.`,
      });

      revalidatePath("/dashboard");
      const images = await listRestaurantImages(restaurantId);
      return {
        ok: true,
        data: {
          ...data,
          address: typeof data.address === "string" ? data.address : JSON.stringify(data.address),
          raw_address: data.address,
          images,
        } as RestaurantRecord,
      };
    }
  );
}

export async function updateRestaurantRecord(
  accessToken: string,
  restaurantId: string,
  values: UpdateRestaurantInput
): Promise<ActionResult<RestaurantRecord>> {
  const fd = new FormData();
  fd.append("accessToken", accessToken);
  fd.append("restaurantId", restaurantId);
  fd.append("payload", JSON.stringify(values));
  return updateRestaurantWithFormData(fd);
}

// ---------------------------------------------------------------------------
// Delete a specific Restaurant Image / Certificate from Storage
// ---------------------------------------------------------------------------

export async function deleteRestaurantDocument(
  accessToken: string,
  restaurantId: string,
  storagePathOrUrl: string
): Promise<ActionResult<{ success: boolean }>> {
  return loggedAction(
    { actionName: "deleteRestaurantDocument", httpMethod: "DELETE", httpPath: `/restaurants/${restaurantId}/documents` },
    async (ctx) => {
      const actor = await requireStaffOrAdmin(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      await deleteRestaurantAsset(storagePathOrUrl);

      void writeAuditLog({
        source: "deleteRestaurantDocument",
        eventType: "restaurant_document.deleted",
        actorId: actor.id,
        restaurantId,
        entityType: "restaurant_image",
        entityId: storagePathOrUrl,
        message: `Deleted restaurant document ${storagePathOrUrl}.`,
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { success: true } };
    }
  );
}

// ---------------------------------------------------------------------------
// Toggle restaurant active state
// ---------------------------------------------------------------------------

export async function setRestaurantActiveState(
  accessToken: string,
  restaurantId: string,
  isActive: boolean
): Promise<ActionResult<{ id: string; is_active: boolean }>> {
  return loggedAction(
    { actionName: "setRestaurantActiveState", httpMethod: "PUT", httpPath: `/restaurants/${restaurantId}/state` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("restaurants")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurantId)
        .select("id, is_active")
        .single();

      if (error) throw new Error(error.message);

      void writeAuditLog({
        source: "setRestaurantActiveState",
        eventType: isActive ? "restaurant.activated" : "restaurant.deactivated",
        actorId: actor.id,
        restaurantId,
        entityType: "restaurant",
        entityId: restaurantId,
        message: isActive ? "Activated restaurant." : "Deactivated restaurant.",
      });

      revalidatePath("/dashboard");
      return { ok: true, data };
    }
  );
}

// ---------------------------------------------------------------------------
// Delete restaurant
// ---------------------------------------------------------------------------

export async function deleteRestaurantRecord(
  accessToken: string,
  restaurantId: string
): Promise<ActionResult<{ id: string }>> {
  return loggedAction(
    { actionName: "deleteRestaurantRecord", httpMethod: "DELETE", httpPath: `/restaurants/${restaurantId}` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      const admin = getSupabaseAdmin();

      // Proactively clean up images from storage bucket
      const images = await listRestaurantImages(restaurantId);
      for (const img of images) {
        await deleteRestaurantAsset(img.storage_path);
      }

      await admin.from("restaurant_settings").delete().eq("restaurant_id", restaurantId);
      await admin.from("restaurant_images").delete().eq("restaurant_id", restaurantId);
      await admin.from("onboarding_applications").update({ restaurant_id: null }).eq("restaurant_id", restaurantId);
      await admin.from("profiles").update({ restaurant_id: null, role: "customer" }).eq("restaurant_id", restaurantId);

      const { error } = await admin.from("restaurants").delete().eq("id", restaurantId);
      if (error) throw new Error(error.message);

      void writeAuditLog({
        source: "deleteRestaurantRecord",
        eventType: "restaurant.deleted",
        actorId: actor.id,
        restaurantId,
        entityType: "restaurant",
        entityId: restaurantId,
        level: "warning",
        message: "Deleted restaurant from admin console.",
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { id: restaurantId } };
    }
  );
}


// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Get restaurants belonging to the authenticated user/owner
// ---------------------------------------------------------------------------

export async function getMyRestaurants(
  accessToken: string
): Promise<ActionResult<RestaurantRecord[]>> {
  return loggedAction(
    { actionName: "getMyRestaurants", httpMethod: "GET", httpPath: "/restaurants/mine" },
    async (ctx) => {
      const user = await getUserFromAccessToken(accessToken);
      ctx.actorId = user.id;

      const admin = getSupabaseAdmin();
      const { data: profile } = await admin.from("profiles").select("restaurant_id, restaurant_ids, role").eq("id", user.id).single();

      const { data: apps } = await admin
        .from("onboarding_applications")
        .select("domain_name, restaurant_id")
        .or(`submitted_by.eq.${user.id},email.eq.${user.email}`);

      const domainNames = (apps || []).map((a: { domain_name?: string }) => a.domain_name).filter(Boolean);
      const appRestIds = (apps || []).map((a: { restaurant_id?: string }) => a.restaurant_id).filter(Boolean) as string[];
      const profileRestIds = Array.isArray(profile?.restaurant_ids) ? [...profile.restaurant_ids] : [];
      if (profile?.restaurant_id && !profileRestIds.includes(profile.restaurant_id)) {
        profileRestIds.push(profile.restaurant_id);
      }

      const allTargetIds = Array.from(new Set([...appRestIds, ...profileRestIds]));

      let query = admin.from("restaurants").select("*");
      const orConditions = [`email.eq.${user.email}`];
      if (allTargetIds.length > 0) {
        orConditions.push(`id.in.(${allTargetIds.join(",")})`);
      }
      if (domainNames.length > 0) {
        orConditions.push(`domain_name.in.(${domainNames.join(",")})`);
      }
      query = query.or(orConditions.join(","));

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return { ok: true, data: (data || []) as RestaurantRecord[] };
    }
  );
}


