"use server";

import { getSupabaseAdmin, getUserFromAccessToken, type ActionResult } from "./supabase/server";
import { loggedAction } from "./app-logs";

export type AppProfile = {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  restaurant_id: string | null;
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
            role: user.role === "super_admin" ? user.role : "customer",
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
