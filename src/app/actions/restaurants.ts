"use server";

import { revalidatePath } from "next/cache";
import { insertRestaurantImageRecords, type StoredAsset } from "./restaurant-images";
import { getSupabaseAdmin, requireSuperAdmin, toActionError, type ActionResult } from "./supabase/server";
import type { OnboardingApplication } from "./onboarding-applications";
import { writeAuditLog, loggedAction } from "./app-logs";

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
};

type DirectRestaurantInput = {
  restaurant_name: string;
  domain_name: string;
  domain_url?: string;
  email?: string;
  contact?: string;
  address: string;
  services: string[];
  cuisines: string[];
  package: string;
  description?: string;
  about?: string;
  gst_number?: string;
  fssai_number?: string;
  pos_domain?: string;
  time_zone?: string;
};

type UpdateRestaurantInput = {
  restaurant_name: string;
  domain_name: string;
  domain_url?: string;
  email?: string;
  contact?: string;
  address: string;
  package: string;
  description?: string;
  about?: string;
  gst_number?: string;
  fssai_number?: string;
  pos_domain?: string;
  time_zone?: string;
};

function compactAddress(address: Record<string, unknown>): string {
  return [
    address.buildingno,
    address.floor,
    address.area,
    address.city,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

function numericContact(value?: string | null): number | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function getPublicUrl(asset?: StoredAsset): string | null {
  return asset?.public_url ?? null;
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

      const { data: restaurant, error: restaurantError } = await admin
        .from("restaurants")
        .insert({
          restaurant_name: app.restaurant_name,
          domain_name: app.domain_name,
          domain_url: app.domain_name,
          logo_url: getPublicUrl(images.logo_url),
          background_image_url: getPublicUrl(images.background_image_url),
          is_active: true,
          services: app.services,
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

      // Audit log — business event
      void writeAuditLog({
        source: "approveOnboardingApplication",
        eventType: "application.approved",
        actorId: reviewer.id,
        restaurantId: restaurant.id,
        entityType: "onboarding_application",
        entityId: applicationId,
        message: `Approved onboarding and created restaurant ${app.restaurant_name}.`,
        metadata: { domain_name: app.domain_name, submitted_by: app.submitted_by },
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
// List restaurants (read — only errors logged)
// ---------------------------------------------------------------------------

export async function listRestaurants(accessToken: string): Promise<ActionResult<RestaurantRecord[]>> {
  return loggedAction(
    { actionName: "listRestaurants", httpMethod: "GET", httpPath: "/restaurants" },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("restaurants")
        .select("id, restaurant_name, domain_name, domain_url, description, about, address, email, contact, package, is_active, services, cuisines, timings, delivery_timings, takeaway_timings, gst_number, fssai_number, logo_url, background_image_url, pos_domain, time_zone, updated_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return { ok: true, data: (data ?? []) as RestaurantRecord[] };
    }
  );
}

// ---------------------------------------------------------------------------
// Create restaurant directly
// ---------------------------------------------------------------------------

export async function createRestaurantDirect(
  accessToken: string,
  values: DirectRestaurantInput
): Promise<ActionResult<{ restaurantId: string }>> {
  return loggedAction(
    { actionName: "createRestaurantDirect", httpMethod: "POST", httpPath: "/restaurants" },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("restaurants")
        .insert({
          restaurant_name: values.restaurant_name,
          domain_name: values.domain_name,
          domain_url: values.domain_url || values.domain_name,
          is_active: true,
          services: values.services,
          address: values.address,
          cuisines: values.cuisines,
          timings: { hours: {} },
          contact: numericContact(values.contact),
          email: values.email || null,
          theme: "light",
          description: values.description || null,
          about: values.about || null,
          gst_number: values.gst_number || null,
          fssai_number: values.fssai_number || null,
          package: values.package || "marinate-menu",
          pos_domain: values.pos_domain || null,
          time_zone: values.time_zone || "Asia/Kolkata",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      ctx.restaurantId = data.id;

      void writeAuditLog({
        source: "createRestaurantDirect",
        eventType: "restaurant.created",
        actorId: actor.id,
        restaurantId: data.id,
        entityType: "restaurant",
        entityId: data.id,
        message: `Created restaurant ${values.restaurant_name} directly from admin console.`,
        metadata: { domain_name: values.domain_name, package: values.package },
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { restaurantId: data.id } };
    }
  );
}

// ---------------------------------------------------------------------------
// Update restaurant
// ---------------------------------------------------------------------------

export async function updateRestaurantRecord(
  accessToken: string,
  restaurantId: string,
  values: UpdateRestaurantInput
): Promise<ActionResult<RestaurantRecord>> {
  return loggedAction(
    { actionName: "updateRestaurantRecord", httpMethod: "PUT", httpPath: `/restaurants/${restaurantId}` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("restaurants")
        .update({
          restaurant_name: values.restaurant_name,
          domain_name: values.domain_name,
          domain_url: values.domain_url || values.domain_name,
          email: values.email || null,
          contact: numericContact(values.contact),
          address: values.address,
          package: values.package,
          description: values.description || null,
          about: values.about || null,
          gst_number: values.gst_number || null,
          fssai_number: values.fssai_number || null,
          pos_domain: values.pos_domain || null,
          time_zone: values.time_zone || "Asia/Kolkata",
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurantId)
        .select("id, restaurant_name, domain_name, domain_url, description, about, address, email, contact, package, is_active, services, cuisines, timings, delivery_timings, takeaway_timings, gst_number, fssai_number, logo_url, background_image_url, pos_domain, time_zone, updated_at, created_at")
        .single();

      if (error) throw new Error(error.message);

      void writeAuditLog({
        source: "updateRestaurantRecord",
        eventType: "restaurant.updated",
        actorId: actor.id,
        restaurantId,
        entityType: "restaurant",
        entityId: restaurantId,
        message: `Updated restaurant ${values.restaurant_name}.`,
        metadata: { domain_name: values.domain_name, package: values.package },
      });

      revalidatePath("/dashboard");
      return { ok: true, data: data as RestaurantRecord };
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
