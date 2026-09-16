-- Migration 0004: Add 'staff' role to profiles table check constraint


alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (
    role = any (
      array[
        'super_admin'::text,
        'admin'::text,
        'staff'::text,
        'manager'::text,
        'waiter'::text,
        'customer'::text,
        'kitchen_staff'::text
      ]
    )
  );
