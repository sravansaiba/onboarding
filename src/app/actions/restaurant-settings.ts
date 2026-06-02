"use server";

import { getSupabaseAdmin, requireSuperAdmin, type ActionResult } from "./supabase/server";
import { RESTAURANT_SETTING_KEYS } from "@/src/lib/constants/restaurant-settings";
import { writeAuditLog, loggedAction } from "./app-logs";

export type RestaurantSetting = {
  restaurant_id: string;
  setting_key: string;
  setting_value: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// List settings (read — only errors logged)
// ---------------------------------------------------------------------------

export async function listRestaurantSettings(
  accessToken: string,
  restaurantId: string
): Promise<ActionResult<RestaurantSetting[]>> {
  return loggedAction(
    { actionName: "listRestaurantSettings", httpMethod: "GET", httpPath: `/restaurants/${restaurantId}/settings` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("restaurant_settings")
        .select("restaurant_id, setting_key, setting_value, updated_at")
        .eq("restaurant_id", restaurantId)
        .order("setting_key");

      if (error) throw new Error(error.message);
      return { ok: true, data: (data ?? []) as RestaurantSetting[] };
    }
  );
}

// ---------------------------------------------------------------------------
// Upsert setting
// ---------------------------------------------------------------------------

export async function upsertRestaurantSetting(
  accessToken: string,
  restaurantId: string,
  settingKey: string,
  settingValue: string
): Promise<ActionResult<RestaurantSetting>> {
  return loggedAction(
    { actionName: "upsertRestaurantSetting", httpMethod: "PUT", httpPath: `/restaurants/${restaurantId}/settings/${settingKey}` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      if (!RESTAURANT_SETTING_KEYS.includes(settingKey)) {
        throw new Error("Only approved restaurant settings can be updated.");
      }

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("restaurant_settings")
        .upsert(
          {
            restaurant_id: restaurantId,
            setting_key: settingKey,
            setting_value: settingValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key,restaurant_id" }
        )
        .select("restaurant_id, setting_key, setting_value, updated_at")
        .single();

      if (error) throw new Error(error.message);

      void writeAuditLog({
        source: "upsertRestaurantSetting",
        eventType: "restaurant_setting.updated",
        actorId: actor.id,
        restaurantId,
        entityType: "restaurant_setting",
        entityId: settingKey,
        message: `Updated setting ${settingKey}.`,
        metadata: { setting_value: settingValue },
      });

      return { ok: true, data };
    }
  );
}

// ---------------------------------------------------------------------------
// Delete setting
// ---------------------------------------------------------------------------

export async function deleteRestaurantSetting(
  accessToken: string,
  restaurantId: string,
  settingKey: string
): Promise<ActionResult<{ restaurant_id: string; setting_key: string }>> {
  return loggedAction(
    { actionName: "deleteRestaurantSetting", httpMethod: "DELETE", httpPath: `/restaurants/${restaurantId}/settings/${settingKey}` },
    async (ctx) => {
      const actor = await requireSuperAdmin(accessToken);
      ctx.actorId = actor.id;
      ctx.restaurantId = restaurantId;

      if (!RESTAURANT_SETTING_KEYS.includes(settingKey)) {
        throw new Error("Only approved restaurant settings can be removed.");
      }

      const admin = getSupabaseAdmin();
      const { error } = await admin
        .from("restaurant_settings")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("setting_key", settingKey);

      if (error) throw new Error(error.message);

      void writeAuditLog({
        source: "deleteRestaurantSetting",
        eventType: "restaurant_setting.deleted",
        actorId: actor.id,
        restaurantId,
        entityType: "restaurant_setting",
        entityId: settingKey,
        level: "warning",
        message: `Removed setting ${settingKey}.`,
      });

      return { ok: true, data: { restaurant_id: restaurantId, setting_key: settingKey } };
    }
  );
}
