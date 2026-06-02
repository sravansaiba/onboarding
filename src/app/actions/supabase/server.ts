import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  role: string;
  username: string | null;
  restaurant_id: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env for server-side Supabase actions.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseVerifier(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getUserFromAccessToken(accessToken: string): Promise<AuthenticatedUser> {
  if (!accessToken) {
    throw new Error("Please sign in again.");
  }

  const verifier = getSupabaseVerifier();
  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await verifier.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, username, role, restaurant_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    id: userData.user.id,
    email: profile?.email ?? userData.user.email ?? null,
    role: profile?.role ?? "customer",
    username: profile?.username ?? userData.user.user_metadata?.username ?? null,
    restaurant_id: profile?.restaurant_id ?? null,
  };
}

export async function requireSuperAdmin(accessToken: string): Promise<AuthenticatedUser> {
  const user = await getUserFromAccessToken(accessToken);
  if (!["super_admin", "admin"].includes(user.role)) {
    throw new Error("Only a super admin can perform this action.");
  }
  return user;
}

export function toActionError(error: unknown): ActionResult<never> {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return { ok: false, error: message };
}
