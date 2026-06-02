"use server";

import { revalidatePath } from "next/cache";
import { uploadRestaurantAsset, type StoredAsset } from "./restaurant-images";
import {
  getSupabaseAdmin,
  getUserFromAccessToken,
  requireSuperAdmin,
  toActionError,
  type ActionResult,
} from "./supabase/server";
import { writeAuditLog, loggedAction } from "./app-logs";

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export type OnboardingApplication = {
  id: string;
  submitted_by: string | null;
  restaurant_id: string | null;
  restaurant_name: string;
  domain_name: string;
  owner_name: string;
  email: string;
  phone: string;
  restaurant_primary_contact: string;
  address: Record<string, unknown>;
  legal: Record<string, unknown>;
  bank: Record<string, unknown>;
  cuisines: string[];
  services: string[];
  package: string;
  timings: { hours: Record<string, Array<{ open_time: string; close_time: string }>> };
  delivery_timings: { hours: Record<string, Array<{ open_time: string; close_time: string }>> } | null;
  takeaway_timings: { hours: Record<string, Array<{ open_time: string; close_time: string }>> } | null;
  mapEmbedUrl: string | null;
  images: Record<string, StoredAsset>;
  documents: Record<string, StoredAsset>;
  status: ApplicationStatus;
  review_notes: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ListOptions = {
  accessToken: string;
  page?: number;
  pageSize?: number;
  status?: ApplicationStatus | "all";
  query?: string;
};

type OnboardingPayload = {
  accessToken?: string;
  restaurant_name: string;
  fullname: string;
  email: string;
  phone: string;
  restaurant_primary_contact: string;
  buildingno?: string;
  floor?: string;
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  address?: string;
  cuisines: string[];
  services: string[];
  timings: OnboardingApplication["timings"];
  delivery_timings?: OnboardingApplication["delivery_timings"];
  takeaway_timings?: OnboardingApplication["takeaway_timings"];
  mapEmbedUrl?: string;
  pan_number?: string;
  fullnameaspan?: string;
  gst?: boolean;
  gst_number?: string | null;
  fssai_number?: string;
  fssai_expiry?: string;
  bank_accno?: string;
  ifsc_code?: string;
  account_type?: string;
  package?: string;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

async function getAvailableDomainName(baseName: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const base = slugify(baseName) || `restaurant-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  while (suffix < 50) {
    const [{ data: restaurant }, { data: application }] = await Promise.all([
      admin.from("restaurants").select("id").eq("domain_name", candidate).maybeSingle(),
      admin.from("onboarding_applications").select("id").eq("domain_name", candidate).maybeSingle(),
    ]);

    if (!restaurant && !application) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return `${base}-${Date.now()}`;
}

function parsePayload(formData: FormData) {
  const payloadValue = formData.get("payload");
  if (typeof payloadValue !== "string") throw new Error("Missing onboarding payload.");
  return JSON.parse(payloadValue) as OnboardingPayload;
}

function getFile(formData: FormData, key: string): File | null {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return null;
  return file;
}

// ---------------------------------------------------------------------------
// Submit onboarding application (public — no auth required)
// ---------------------------------------------------------------------------

export async function submitOnboardingApplication(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // Note: this action uses manual try/catch because it handles FormData and 
  // needs to extract the access token from the payload before auth is available.
  // loggedAction requires ActionResult return type which we handle manually here.
  const start = Date.now();
  let userForLog: { id: string; email: string | null } | null = null;
  let restaurantName = "";

  try {
    const admin = getSupabaseAdmin();
    const payload = parsePayload(formData);
    restaurantName = payload.restaurant_name;
    const accessToken = String(payload.accessToken || "");
    const user = accessToken ? await getUserFromAccessToken(accessToken) : null;
    userForLog = user;

    if (!payload.restaurant_name || !payload.email) {
      throw new Error("Restaurant name and email are required.");
    }

    const domainName = await getAvailableDomainName(payload.restaurant_name);
    const assetEntries: Array<[string, string]> = [
      ["logo_url", "logo"],
      ["background_image_url", "background"],
      ["pan_card", "certificates"],
      ["gst_certificate", "certificates"],
      ["fssai_license", "certificates"],
    ];

    const uploaded: Record<string, StoredAsset> = {};
    for (const [formKey, imageType] of assetEntries) {
      const file = getFile(formData, formKey);
      if (file) {
        uploaded[formKey] = await uploadRestaurantAsset(domainName, imageType, file);
      }
    }

    const images = Object.fromEntries(
      Object.entries(uploaded).filter(([key]) => ["logo_url", "background_image_url"].includes(key))
    );
    const documents = Object.fromEntries(
      Object.entries(uploaded).filter(([key]) => !["logo_url", "background_image_url"].includes(key))
    );

    const address = {
      buildingno: payload.buildingno ?? "",
      floor: payload.floor ?? "",
      area: payload.area ?? "",
      city: payload.city ?? "",
      pincode: payload.pincode ?? "",
      landmark: payload.landmark ?? "",
      registered_business_address: payload.address ?? "",
    };

    const { data, error } = await admin
      .from("onboarding_applications")
      .insert({
        submitted_by: user?.id ?? null,
        restaurant_name: payload.restaurant_name,
        domain_name: domainName,
        owner_name: payload.fullname,
        email: payload.email,
        phone: payload.phone,
        restaurant_primary_contact: payload.restaurant_primary_contact,
        address,
        legal: {
          pan_number: payload.pan_number,
          fullnameaspan: payload.fullnameaspan,
          gst: payload.gst,
          gst_number: payload.gst_number,
          fssai_number: payload.fssai_number,
          fssai_expiry: payload.fssai_expiry,
        },
        bank: {
          bank_accno: payload.bank_accno,
          ifsc_code: payload.ifsc_code,
          account_type: payload.account_type,
        },
        cuisines: payload.cuisines,
        services: payload.services,
        timings: payload.timings,
        delivery_timings: payload.delivery_timings ?? null,
        takeaway_timings: payload.takeaway_timings ?? null,
        package: payload.package || "marinate-menu",
        mapEmbedUrl: payload.mapEmbedUrl ?? null,
        images,
        documents,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    void writeAuditLog({
      source: "submitOnboardingApplication",
      eventType: "onboarding.submitted",
      actorId: user?.id ?? null,
      entityType: "onboarding_application",
      entityId: data.id,
      message: `Submitted onboarding application for ${payload.restaurant_name}.`,
      metadata: {
        domain_name: domainName,
        email: payload.email,
        uploaded_assets: Object.keys(uploaded),
        duration_ms: Date.now() - start,
      },
    });

    revalidatePath("/dashboard");
    return { ok: true, data: { id: data.id } };
  } catch (error) {
    void writeAuditLog({
      source: "submitOnboardingApplication",
      eventType: "onboarding.submit_failed",
      level: "error",
      status: "failed",
      entityType: "onboarding_application",
      message: error instanceof Error ? error.message : "Failed to submit onboarding application.",
      actorId: userForLog?.id ?? null,
      metadata: {
        actor_email: userForLog?.email ?? null,
        restaurant_name: restaurantName || null,
        duration_ms: Date.now() - start,
      },
    });
    return toActionError(error);
  }
}

// ---------------------------------------------------------------------------
// List applications (read — only errors logged)
// ---------------------------------------------------------------------------

export async function listOnboardingApplications(options: ListOptions): Promise<
  ActionResult<{ records: OnboardingApplication[]; totalPages: number; totalCount: number }>
> {
  return loggedAction(
    { actionName: "listOnboardingApplications", httpMethod: "GET", httpPath: "/applications" },
    async (ctx) => {
      const actor = await requireSuperAdmin(options.accessToken);
      ctx.actorId = actor.id;

      const admin = getSupabaseAdmin();
      const page = Math.max(options.page ?? 1, 1);
      const pageSize = Math.min(Math.max(options.pageSize ?? 10, 5), 50);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = admin
        .from("onboarding_applications")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (options.status && options.status !== "all") {
        query = query.eq("status", options.status);
      }

      if (options.query?.trim()) {
        const search = `%${options.query.trim()}%`;
        query = query.or(`restaurant_name.ilike.${search},email.ilike.${search},domain_name.ilike.${search}`);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return {
        ok: true,
        data: {
          records: (data ?? []) as OnboardingApplication[],
          totalCount: count ?? 0,
          totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1),
        },
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Get my application (read — only errors logged)
// ---------------------------------------------------------------------------

export async function getMyOnboardingApplication(accessToken: string): Promise<ActionResult<OnboardingApplication | null>> {
  return loggedAction(
    { actionName: "getMyOnboardingApplication", httpMethod: "GET", httpPath: "/applications/mine" },
    async (ctx) => {
      const user = await getUserFromAccessToken(accessToken);
      ctx.actorId = user.id;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("onboarding_applications")
        .select("*")
        .or(`submitted_by.eq.${user.id},email.eq.${user.email}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return { ok: true, data: data as OnboardingApplication | null };
    }
  );
}

// ---------------------------------------------------------------------------
// Update my application
// ---------------------------------------------------------------------------

export async function updateMyOnboardingApplication(
  accessToken: string,
  applicationId: string,
  patch: Partial<OnboardingApplication>
): Promise<ActionResult<OnboardingApplication>> {
  return loggedAction(
    { actionName: "updateMyOnboardingApplication", httpMethod: "PUT", httpPath: `/applications/${applicationId}` },
    async (ctx) => {
      const user = await getUserFromAccessToken(accessToken);
      ctx.actorId = user.id;

      const admin = getSupabaseAdmin();
      const { data: existing, error: existingError } = await admin
        .from("onboarding_applications")
        .select("id, submitted_by, email, status")
        .eq("id", applicationId)
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);
      if (!existing) throw new Error("Application not found.");
      if (existing.status !== "pending") throw new Error("Accepted or rejected applications cannot be edited.");
      if (existing.submitted_by !== user.id && existing.email !== user.email) {
        throw new Error("You can only edit your own application.");
      }

      const allowedPatch = {
        restaurant_name: patch.restaurant_name,
        owner_name: patch.owner_name,
        phone: patch.phone,
        restaurant_primary_contact: patch.restaurant_primary_contact,
        address: patch.address,
        legal: patch.legal,
        bank: patch.bank,
        cuisines: patch.cuisines,
        services: patch.services,
        timings: patch.timings,
        delivery_timings: patch.delivery_timings,
        takeaway_timings: patch.takeaway_timings,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await admin
        .from("onboarding_applications")
        .update(allowedPatch)
        .eq("id", applicationId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      void writeAuditLog({
        source: "updateMyOnboardingApplication",
        eventType: "onboarding.updated",
        actorId: user.id,
        entityType: "onboarding_application",
        entityId: applicationId,
        message: "Updated pending onboarding application.",
        metadata: {
          fields: Object.keys(allowedPatch).filter((key) => key !== "updated_at"),
        },
      });

      revalidatePath("/dashboard");
      return { ok: true, data: data as OnboardingApplication };
    }
  );
}
