CREATE OR REPLACE FUNCTION public.insert_default_settings()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    pkg text := lower(coalesce(new.package, 'marinate-menu'));
BEGIN

    -- =========================================================
    -- MARINATE MENU
    -- 13 settings
    -- =========================================================
    IF pkg = 'marinate-menu' THEN

        INSERT INTO public.restaurant_settings
            (setting_key, setting_value, restaurant_id)
        VALUES
            ('auto_table_generation', 'true', new.id),
            ('currency', 'INR', new.id),
            ('dinein_sound', 'true', new.id),
            ('dinein_sound_volume', '79', new.id),
            ('horizontal_scrollbar', 'false', new.id),
            ('kot_enabled', 'true', new.id),
            ('prep_time', '30', new.id),
            ('qr', 'true', new.id),
            ('session_code', 'false', new.id),
            ('tables-management', 'true', new.id),
            ('takeaway_sound', 'true', new.id),
            ('takeaway_sound_volume', '82', new.id),
            ('tax_on_original_price', 'false', new.id);

    -- =========================================================
    -- MARINATE DINEIN
    -- 17 settings
    -- =========================================================
    ELSIF pkg = 'marinate-dinein' THEN

        INSERT INTO public.restaurant_settings
            (setting_key, setting_value, restaurant_id)
        VALUES
            ('auto_table_generation', 'true', new.id),
            ('currency', 'INR', new.id),
            ('dinein_sound', 'true', new.id),
            ('dinein_sound_volume', '79', new.id),
            ('highchairs', 'false', new.id),
            ('horizontal_scrollbar', 'false', new.id),
            ('is_waiter', 'true', new.id),
            ('kot_enabled', 'true', new.id),
            ('prep_time', '30', new.id),
            ('qr', 'true', new.id),
            ('reservations', 'false', new.id),
            ('session_code', 'false', new.id),
            ('shifts', 'false', new.id),
            ('tables-management', 'true', new.id),
            ('takeaway_sound', 'true', new.id),
            ('takeaway_sound_volume', '82', new.id),
            ('tax_on_original_price', 'false', new.id);

    -- =========================================================
    -- MARINATE 360
    -- 23 settings
    -- =========================================================
    ELSIF pkg = 'marinate360' THEN

        INSERT INTO public.restaurant_settings
            (setting_key, setting_value, restaurant_id)
        VALUES
            ('auto_table_generation', 'true', new.id),
            ('cash_on_delivery', 'true', new.id),
            ('catering', 'true', new.id),
            ('currency', 'INR', new.id),
            (
                'delivery_fee_structure',
                '{"status":"false","max_delivery_km":1,"free_delivery_above":0,"tiers":[{"from_km":0,"to_km":1,"fee":10}]}',
                new.id
            ),
            ('delivery_sound', 'true', new.id),
            ('delivery_sound_volume', '87', new.id),
            ('dinein_sound', 'true', new.id),
            ('dinein_sound_volume', '79', new.id),
            ('highchairs', 'true', new.id),
            ('horizontal_scrollbar', 'false', new.id),
            ('is_delivery', 'true', new.id),
            ('is_waiter', 'true', new.id),
            ('kot_enabled', 'true', new.id),
            ('prep_time', '30', new.id),
            ('qr', 'true', new.id),
            ('reservations', 'true', new.id),
            ('session_code', 'false', new.id),
            ('shifts', 'true', new.id),
            ('tables-management', 'true', new.id),
            ('takeaway_sound', 'true', new.id),
            ('takeaway_sound_volume', '82', new.id),
            ('tax_on_original_price', 'false', new.id);

    -- =========================================================
    -- MARINATE FOODTRUCK
    -- 11 settings
    -- =========================================================
    ELSIF pkg = 'marinate-foodtruck' THEN

        INSERT INTO public.restaurant_settings
            (setting_key, setting_value, restaurant_id)
        VALUES
            ('currency', 'INR', new.id),
            ('dinein_sound', 'true', new.id),
            ('dinein_sound_volume', '79', new.id),
            ('foodtruck', 'true', new.id),
            ('horizontal_scrollbar', 'false', new.id),
            ('kot_enabled', 'true', new.id),
            ('prep_time', '30', new.id),
            ('session_code', 'false', new.id),
            ('takeaway_sound', 'true', new.id),
            ('takeaway_sound_volume', '82', new.id),
            ('tax_on_original_price', 'false', new.id);

    END IF;

    RETURN new;
END;
$function$;