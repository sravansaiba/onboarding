export type RestaurantSettingType = "boolean" | "number" | "text";

export type RestaurantSettingDefinition = {
  key: string;
  label: string;
  type: RestaurantSettingType;
};

export const RESTAURANT_SETTING_DEFINITIONS: RestaurantSettingDefinition[] = [
  { key: "auto_table_generation", label: "Auto table generation", type: "boolean" },
  { key: "cash_on_delivery", label: "Cash on delivery", type: "boolean" },
  { key: "catering", label: "Catering", type: "boolean" },
  { key: "currency", label: "Currency", type: "text" },
  { key: "delivery_sound", label: "Delivery sound", type: "boolean" },
  { key: "delivery_sound_volume", label: "Delivery sound volume", type: "number" },
  { key: "dinein_sound", label: "Dine-in sound", type: "boolean" },
  { key: "dinein_sound_volume", label: "Dine-in sound volume", type: "number" },
  { key: "foodtruck", label: "Foodtruck", type: "boolean" },
  { key: "highchairs", label: "Highchairs", type: "boolean" },
  { key: "horizontal_scrollbar", label: "Horizontal scrollbar", type: "boolean" },
  { key: "is_delivery", label: "Delivery enabled", type: "boolean" },
  { key: "is_waiter", label: "Waiter mode", type: "boolean" },
  { key: "kot_enabled", label: "KOT enabled", type: "boolean" },
  { key: "qr", label: "QR ordering", type: "boolean" },
  { key: "reservations", label: "Reservations", type: "boolean" },
  { key: "shifts", label: "Shifts", type: "boolean" },
  { key: "tables-management", label: "Tables management", type: "boolean" },
  { key: "takeaway_sound", label: "Takeaway sound", type: "boolean" },
  { key: "takeaway_sound_volume", label: "Takeaway sound volume", type: "number" },
  { key: "tax_on_original_price", label: "Tax on original price", type: "boolean" },
];

export const RESTAURANT_SETTING_KEYS = RESTAURANT_SETTING_DEFINITIONS.map((item) => item.key);
