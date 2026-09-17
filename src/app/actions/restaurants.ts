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
  requireSuperAdmin,
  requireStaffOrAdmin,
  type ActionResult,
} from "./supabase/server";
import type { OnboardingApplication } from "./onboarding-applications";
import { writeAuditLog, loggedAction } from "./app-logs";
import { formatAddress } from "@/src/lib/utils/address";
import { getServicesForPackage } from "@/src/lib/constants/restaurant-options";

export type RestaurantRecord = {
  id: string;
  restaurant_name: string;
  domain_name: string;
  domain_url: string | null;
  description: string | null;
  about: string | null;
  address: string;
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
  time_zone: string;
  updated_at: string;
  created_at: string;
  images?: StoredAsset[];
};

export type DirectRestaurantInput = {
  restaurant_name: string;
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
  pos_domain?: string;
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
  pos_domain?: string;
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
// Approve onboarding → create restaurant
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

      const { data: restaurant, error: restaurantError } = await admin
        .from("restaurants")
        .insert({
          restaurant_name: app.restaurant_name,
          domain_name: cleanDomain,
          domain_url: defaultDomainUrl,
          logo_url: getPublicUrl(images.logo_url),
          background_image_url: getPublicUrl(images.background_image_url),
          is_active: true,
          services: app.services && app.services.length > 0 ? app.services : getServicesForPackage(app.package),
          address: compactAddress(app.address),
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
        })
        .select("id")
        .single();

      if (restaurantError) throw new Error(restaurantError.message);

      ctx.restaurantId = restaurant.id;
      await insertRestaurantImageRecords(restaurant.id, allAssets);

      if (app.submitted_by) {
        const { error: profileError } = await admin
          .from("profiles")
          .update({
            restaurant_id: restaurant.id,
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
      const { data, error } = await admin
        .from("restaurants")
        .select("id, restaurant_name, domain_name, domain_url, description, about, address, email, contact, package, is_active, services, cuisines, timings, delivery_timings, takeaway_timings, gst_number, fssai_number, logo_url, background_image_url, pos_domain, time_zone, updated_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);

      const formatted = (data ?? []).map((item) => ({
        ...item,
        address: formatAddress(item.address),
      }));

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
      const actor = await requireStaffOrAdmin(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Restaurant not found.");

      const images = await listRestaurantImages(restaurantId);

      const record: RestaurantRecord = {
        ...data,
        address: formatAddress(data.address),
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
): Promise<ActionResult<{ restaurantId: string }>> {
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
      const { data, error } = await admin
        .from("restaurants")
        .insert({
          restaurant_name: payload.restaurant_name.trim(),
          domain_name: domainName,
          domain_url: defaultDomainUrl,
          logo_url: logoUrl,
          background_image_url: backgroundImageUrl,
          is_active: true,
          services: assignedServices,
          address: formatAddress(payload.address),
          cuisines: payload.cuisines && payload.cuisines.length > 0 ? payload.cuisines : ["North Indian"],
          timings: { hours: {} },
          contact: numericContact(payload.contact),
          email: payload.email ? payload.email.trim() : null,
          theme: "light",
          description: payload.description || null,
          about: payload.about || null,
          gst_number: payload.gst_number || null,
          fssai_number: payload.fssai_number || null,
          package: payload.package || "marinate-menu",
          pos_domain: defaultPosDomain,
          time_zone: payload.time_zone || "Asia/Kolkata",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      ctx.restaurantId = data.id;

      if (uploadedAssets.length > 0) {
        await insertRestaurantImageRecords(data.id, uploadedAssets);
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
      return { ok: true, data: { restaurantId: data.id } };
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
      const actor = await requireStaffOrAdmin(accessToken);
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

      const { data, error } = await admin
        .from("restaurants")
        .update({
          restaurant_name: payload.restaurant_name.trim(),
          domain_url: payload.domain_url || existing.domain_url,
          email: payload.email ? payload.email.trim() : null,
          contact: numericContact(payload.contact),
          address: formatAddress(payload.address),
          package: payload.package || existing.package,
          services: assignedServices,
          cuisines: payload.cuisines && payload.cuisines.length > 0 ? payload.cuisines : existing.cuisines,
          description: payload.description || null,
          about: payload.about || null,
          gst_number: payload.gst_number || null,
          fssai_number: payload.fssai_number || null,
          pos_domain: payload.pos_domain || existing.pos_domain,
          time_zone: payload.time_zone || existing.time_zone || "Asia/Kolkata",
          logo_url: newLogoUrl,
          background_image_url: newBackgroundUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurantId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

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
          address: formatAddress(data.address),
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
