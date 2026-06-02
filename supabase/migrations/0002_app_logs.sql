create table if not exists public.app_logs (
  id uuid primary key default extensions.uuid_generate_v4(),
  level text not null default 'info',
  source text not null,
  event_type text not null,
  actor_id uuid null references auth.users (id) on delete set null,
  restaurant_id uuid null references public.restaurants (id) on delete cascade,
  entity_type text null,
  entity_id text null,
  status text not null default 'success',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint app_logs_level_check check (level in ('info', 'warning', 'error')),
  constraint app_logs_status_check check (status in ('success', 'failed'))
);

create index if not exists idx_app_logs_restaurant_created_at
  on public.app_logs using btree (restaurant_id, created_at desc);

create index if not exists idx_app_logs_source_created_at
  on public.app_logs using btree (source, created_at desc);

create index if not exists idx_app_logs_level_created_at
  on public.app_logs using btree (level, created_at desc);
