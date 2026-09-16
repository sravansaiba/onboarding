"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin, requireSuperAdmin, type ActionResult } from "./supabase/server";
import { writeAuditLog, loggedAction } from "./app-logs";

export type ManagedUser = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  restaurant_domain: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CreateManagedUserInput = {
  email: string;
  password: string;
  role: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  restaurant_id?: string | null;
};

export type UpdateManagedUserInput = {
  role?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  restaurant_id?: string | null;
};

// ---------------------------------------------------------------------------
// List managed users (from profiles + restaurant info)
// ---------------------------------------------------------------------------

export async function listManagedUsers(
  accessToken: string,
  params?: { search?: string; role?: string; restaurantId?: string }
): Promise<ActionResult<ManagedUser[]>> {
  return loggedAction(
    { actionName: "listManagedUsers", httpMethod: "GET", httpPath: "/users" },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;

      const admin = getSupabaseAdmin();

      // Query profiles and restaurants in parallel for maximum reliability
      // Filter strictly to platform-level roles (admin, staff, super_admin)
      let query = admin
        .from("profiles")
        .select("id, email, username, first_name, last_name, phone, role, restaurant_id, created_at, updated_at")
        .in("role", ["admin", "staff", "super_admin"])
        .order("created_at", { ascending: false });

      if (params?.role && params.role !== "all") {
        query = query.eq("role", params.role);
      }

      if (params?.restaurantId && params.restaurantId !== "all") {
        if (params.restaurantId === "unassigned") {
          query = query.is("restaurant_id", null);
        } else {
          query = query.eq("restaurant_id", params.restaurantId);
        }
      }

      const [{ data: profilesData, error: profilesError }, { data: restaurantsData }] = await Promise.all([
        query,
        admin.from("restaurants").select("id, restaurant_name, domain_name"),
      ]);

      if (profilesError) throw new Error(profilesError.message);

      const restaurantMap = new Map(
        (restaurantsData ?? []).map((r: any) => [r.id, r])
      );

      const users: ManagedUser[] = (profilesData ?? []).map((item: any) => {
        const rest = item.restaurant_id ? restaurantMap.get(item.restaurant_id) : null;
        return {
          id: item.id,
          email: item.email,
          username: item.username,
          first_name: item.first_name,
          last_name: item.last_name,
          phone: item.phone,
          role: item.role,
          restaurant_id: item.restaurant_id,
          restaurant_name: rest?.restaurant_name ?? null,
          restaurant_domain: rest?.domain_name ?? null,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });

      // Filter by search query in memory for flexible multi-field matching
      if (params?.search) {
        const q = params.search.toLowerCase().trim();
        return {
          ok: true,
          data: users.filter(
            (u) =>
              (u.email && u.email.toLowerCase().includes(q)) ||
              (u.username && u.username.toLowerCase().includes(q)) ||
              (u.first_name && u.first_name.toLowerCase().includes(q)) ||
              (u.last_name && u.last_name.toLowerCase().includes(q)) ||
              (u.phone && u.phone.toLowerCase().includes(q)) ||
              (u.role && u.role.toLowerCase().includes(q)) ||
              (u.restaurant_name && u.restaurant_name.toLowerCase().includes(q)) ||
              (u.restaurant_domain && u.restaurant_domain.toLowerCase().includes(q))
          ),
        };
      }

      return { ok: true, data: users };
    }
  );
}

// ---------------------------------------------------------------------------
// Create a new managed user (auth user + profile)
// ---------------------------------------------------------------------------

export async function createManagedUser(
  accessToken: string,
  input: CreateManagedUserInput
): Promise<ActionResult<{ id: string }>> {
  return loggedAction(
    { actionName: "createManagedUser", httpMethod: "POST", httpPath: "/users" },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;

      if (!input.email || !input.password) {
        throw new Error("Email and password are required.");
      }

      if (input.password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const admin = getSupabaseAdmin();
      const email = input.email.trim().toLowerCase();
      const username = input.username?.trim() || email.split("@")[0];
      const role = input.role || "staff";

      // 1. Create user in Supabase auth
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          username,
          first_name: input.first_name?.trim() || null,
          last_name: input.last_name?.trim() || null,
          phone: input.phone?.trim() || null,
          role,
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Could not create user account.");
      }

      const userId = authData.user.id;

      // 2. Upsert profile in public.profiles
      const { error: profileError } = await admin.from("profiles").upsert(
        {
          id: userId,
          email,
          username,
          first_name: input.first_name?.trim() || null,
          last_name: input.last_name?.trim() || null,
          phone: input.phone?.trim() || null,
          role,
          restaurant_id: input.restaurant_id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (profileError) {
        // Rollback auth user creation if profile creation fails
        await admin.auth.admin.deleteUser(userId).catch(() => {});
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      void writeAuditLog({
        source: "createManagedUser",
        eventType: "user.created",
        actorId: actor.id,
        restaurantId: input.restaurant_id || undefined,
        entityType: "profile",
        entityId: userId,
        message: `Created ${role} user ${email}.`,
        metadata: {
          email,
          role,
          restaurant_id: input.restaurant_id ?? null,
        },
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { id: userId } };
    }
  );
}

// ---------------------------------------------------------------------------
// Update managed user profile (role, restaurant, contact details)
// ---------------------------------------------------------------------------

export async function updateManagedUser(
  accessToken: string,
  userId: string,
  input: UpdateManagedUserInput
): Promise<ActionResult<{ id: string }>> {
  return loggedAction(
    { actionName: "updateManagedUser", httpMethod: "PUT", httpPath: `/users/${userId}` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;

      const admin = getSupabaseAdmin();

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (input.role !== undefined) updatePayload.role = input.role;
      if (input.username !== undefined) updatePayload.username = input.username.trim();
      if (input.first_name !== undefined) updatePayload.first_name = input.first_name?.trim() || null;
      if (input.last_name !== undefined) updatePayload.last_name = input.last_name?.trim() || null;
      if (input.phone !== undefined) updatePayload.phone = input.phone?.trim() || null;
      if (input.restaurant_id !== undefined) updatePayload.restaurant_id = input.restaurant_id;

      const { error: profileError } = await admin
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (profileError) {
        throw new Error(profileError.message);
      }

      // Also sync user_metadata in auth if needed
      await admin.auth.admin
        .updateUserById(userId, {
          user_metadata: {
            username: updatePayload.username,
            first_name: updatePayload.first_name,
            last_name: updatePayload.last_name,
            phone: updatePayload.phone,
            role: updatePayload.role,
          },
        })
        .catch(() => {});

      void writeAuditLog({
        source: "updateManagedUser",
        eventType: "user.updated",
        actorId: actor.id,
        restaurantId: input.restaurant_id || undefined,
        entityType: "profile",
        entityId: userId,
        message: `Updated profile details for user ${userId}.`,
        metadata: updatePayload,
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { id: userId } };
    }
  );
}

// ---------------------------------------------------------------------------
// Change managed user password
// ---------------------------------------------------------------------------

export async function updateManagedUserPassword(
  accessToken: string,
  userId: string,
  newPassword: string
): Promise<ActionResult<{ id: string }>> {
  return loggedAction(
    { actionName: "updateManagedUserPassword", httpMethod: "PUT", httpPath: `/users/${userId}/password` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;

      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const admin = getSupabaseAdmin();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      void writeAuditLog({
        source: "updateManagedUserPassword",
        eventType: "user.password_changed",
        actorId: actor.id,
        entityType: "profile",
        entityId: userId,
        level: "warning",
        message: `Super admin updated password for user ${userId}.`,
      });

      return { ok: true, data: { id: userId } };
    }
  );
}

// ---------------------------------------------------------------------------
// Remove user from assigned restaurant
// ---------------------------------------------------------------------------

export async function removeUserFromRestaurant(
  accessToken: string,
  userId: string
): Promise<ActionResult<{ id: string }>> {
  return loggedAction(
    { actionName: "removeUserFromRestaurant", httpMethod: "PUT", httpPath: `/users/${userId}/unassign` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;

      const admin = getSupabaseAdmin();
      const { error } = await admin
        .from("profiles")
        .update({
          restaurant_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        throw new Error(error.message);
      }

      void writeAuditLog({
        source: "removeUserFromRestaurant",
        eventType: "user.unassigned_restaurant",
        actorId: actor.id,
        entityType: "profile",
        entityId: userId,
        message: `Removed user ${userId} from assigned restaurant.`,
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { id: userId } };
    }
  );
}

// ---------------------------------------------------------------------------
// Delete managed user (from both profiles and default auth.users table)
// ---------------------------------------------------------------------------

export async function deleteManagedUser(
  accessToken: string,
  userId: string
): Promise<ActionResult<{ id: string }>> {
  return loggedAction(
    { actionName: "deleteManagedUser", httpMethod: "DELETE", httpPath: `/users/${userId}` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;

      if (userId === actor.id) {
        throw new Error("You cannot delete your own super admin account.");
      }

      const admin = getSupabaseAdmin();

      // 1. Delete from profiles table
      const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
      if (profileError) {
        throw new Error(profileError.message);
      }

      // 2. Delete from Supabase default auth.users table
      const { error: authError } = await admin.auth.admin.deleteUser(userId);
      if (authError) {
        // Even if auth deletion had an issue, profile was deleted
        throw new Error(`Profile deleted, but auth user removal failed: ${authError.message}`);
      }

      void writeAuditLog({
        source: "deleteManagedUser",
        eventType: "user.deleted",
        actorId: actor.id,
        entityType: "profile",
        entityId: userId,
        level: "warning",
        message: `Permanently deleted user and auth account ${userId}.`,
      });

      revalidatePath("/dashboard");
      return { ok: true, data: { id: userId } };
    }
  );
}
