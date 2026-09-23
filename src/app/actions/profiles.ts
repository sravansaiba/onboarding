"use server";

import { getSupabaseAdmin, getUserFromAccessToken, isSuperAdminRole, type ActionResult } from "./supabase/server";
import { loggedAction } from "./app-logs";

export type AppProfile = {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  restaurant_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

// ---------------------------------------------------------------------------
// Get current profile (read — only errors logged)
// ---------------------------------------------------------------------------

export async function getCurrentProfile(accessToken: string): Promise<ActionResult<AppProfile>> {
  return loggedAction(
    { actionName: "getCurrentProfile", httpMethod: "GET", httpPath: "/profiles/me" },
    async (ctx) => {
      const user = await getUserFromAccessToken(accessToken);
      ctx.actorId = user.id;
      return { ok: true, data: user };
    }
  );
}

// ---------------------------------------------------------------------------
// Ensure customer profile (upsert — logged as POST)
// ---------------------------------------------------------------------------

export async function ensureCustomerProfile(
  accessToken: string,
  values: { username: string; email: string }
): Promise<ActionResult<AppProfile>> {
  return loggedAction(
    { actionName: "ensureCustomerProfile", httpMethod: "POST", httpPath: "/profiles" },
    async (ctx) => {
      const user = await getUserFromAccessToken(accessToken).catch(async () => {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin.auth.getUser(accessToken);
        if (error || !data.user) throw new Error("Could not verify the new account.");
        return {
          id: data.user.id,
          email: data.user.email ?? values.email,
          username: values.username,
          role: "customer",
          restaurant_id: null,
        };
      });

      ctx.actorId = user.id;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: values.email,
            username: values.username,
            role: isSuperAdminRole(user.role) ? user.role : "customer",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select("id, email, username, role, restaurant_id")
        .single();

      if (error) throw new Error(error.message);
      return { ok: true, data };
    }
  );
}

// ---------------------------------------------------------------------------
// Update current user profile
// ---------------------------------------------------------------------------

export async function updateMyProfile(
  accessToken: string,
  values: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    phone?: string | null;
  }
): Promise<ActionResult<AppProfile>> {
  return loggedAction(
    { actionName: "updateMyProfile", httpMethod: "PUT", httpPath: "/profiles/me" },
    async (ctx) => {
      const user = await getUserFromAccessToken(accessToken);
      ctx.actorId = user.id;

      const admin = getSupabaseAdmin();
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (values.first_name !== undefined) payload.first_name = values.first_name?.trim() || null;
      if (values.last_name !== undefined) payload.last_name = values.last_name?.trim() || null;
      if (values.username !== undefined) payload.username = values.username?.trim() || null;
      if (values.phone !== undefined) payload.phone = values.phone?.trim() || null;

      const { data, error } = await admin
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select("id, email, username, role, restaurant_id, first_name, last_name, phone")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return { ok: true, data };
    }
  );
}

// ---------------------------------------------------------------------------
// Update current user password
// ---------------------------------------------------------------------------

export async function updateMyPassword(
  accessToken: string,
  newPassword: string
): Promise<ActionResult<{ success: boolean }>> {
  return loggedAction(
    { actionName: "updateMyPassword", httpMethod: "POST", httpPath: "/profiles/me/password" },
    async (ctx) => {
      const user = await getUserFromAccessToken(accessToken);
      ctx.actorId = user.id;

      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const admin = getSupabaseAdmin();
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      return { ok: true, data: { success: true } };
    }
  );
}
