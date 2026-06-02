create table if not exists public.onboarding_applications (
  id uuid primary key default extensions.uuid_generate_v4(),
  submitted_by uuid null references auth.users (id) on delete set null,
  restaurant_id uuid null references public.restaurants (id) on delete set null,
  restaurant_name text not null,
  domain_name text not null,
  owner_name text not null,
  email text not null,
  phone text not null,
  restaurant_primary_contact text not null,
  address jsonb not null default '{}'::jsonb,
  legal jsonb not null default '{}'::jsonb,
  bank jsonb not null default '{}'::jsonb,
  cuisines varchar[] not null default '{}'::varchar[],
  services jsonb not null default '[]'::jsonb,
  timings jsonb not null default '{"hours": {}}'::jsonb,
  delivery_timings jsonb null,
  takeaway_timings jsonb null,
  package text not null default 'marinate-menu',
  "mapEmbedUrl" text null,
  images jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  review_notes text null,
  reviewed_by uuid null references auth.users (id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint onboarding_applications_status_check check (status in ('pending', 'accepted', 'rejected')),
  constraint onboarding_applications_domain_name_key unique (domain_name)
);

create index if not exists idx_onboarding_applications_status
  on public.onboarding_applications using btree (status);

create index if not exists idx_onboarding_applications_submitted_by
  on public.onboarding_applications using btree (submitted_by);

create index if not exists idx_onboarding_applications_email
  on public.onboarding_applications using btree (email);

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (
    role = any (
      array[
        'super_admin'::text,
        'admin'::text,
        'manager'::text,
        'waiter'::text,
        'customer'::text,
        'kitchen_staff'::text
      ]
    )
  );

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists touch_onboarding_applications_updated_at on public.onboarding_applications;
create trigger touch_onboarding_applications_updated_at
before update on public.onboarding_applications
for each row execute function public.touch_updated_at();

create or replace function public.insert_default_settings()
returns trigger
language plpgsql
as $$
declare
  pkg text := lower(coalesce(new.package, 'marinate-menu'));
begin
  insert into public.restaurant_settings (setting_key, setting_value, restaurant_id)
  values
    ('auto_table_generation', 'true', new.id),
    ('cash_on_delivery', case when pkg in ('marinate360', 'marinate-menu') then 'true' else 'false' end, new.id),
    ('catering', case when pkg = 'marinate360' then 'true' else 'false' end, new.id),
    ('currency', 'INR', new.id),
    ('delivery_sound', 'true', new.id),
    ('delivery_sound_volume', '87', new.id),
    ('dinein_sound', 'true', new.id),
    ('dinein_sound_volume', '79', new.id),
    ('foodtruck', case when pkg in ('marinate-foodtruck', 'food-truck') then 'true' else 'false' end, new.id),
    ('highchairs', case when pkg = 'marinate360' then 'true' else 'false' end, new.id),
    ('horizontal_scrollbar', 'false', new.id),
    ('is_delivery', case when pkg in ('marinate360', 'marinate-menu') then 'true' else 'false' end, new.id),
    ('is_waiter', case when pkg in ('marinate360', 'marinate-dinein') then 'true' else 'false' end, new.id),
    ('kot_enabled', case when pkg in ('marinate360', 'marinate-dinein') then 'true' else 'false' end, new.id),
    ('qr', 'true', new.id),
    ('reservations', case when pkg = 'marinate360' then 'true' else 'false' end, new.id),
    ('shifts', case when pkg = 'marinate360' then 'true' else 'false' end, new.id),
    ('tables-management', 'true', new.id),
    ('takeaway_sound', 'true', new.id),
    ('takeaway_sound_volume', '82', new.id),
    ('tax_on_original_price', 'false', new.id)
  on conflict (setting_key, restaurant_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_insert_default_settings on public.restaurants;
create trigger trg_insert_default_settings
after insert on public.restaurants
for each row execute function public.insert_default_settings();
