-- SooriyaBooks Commerce Platform V2
-- 0017_site_settings.sql
-- Singleton table for store-wide settings that don't fit any existing
-- table — starting with social media links (footer icons), editable from
-- /admin/settings instead of being hardcoded, since these are business
-- details staff should be able to change without a code deploy.

create table public.site_settings (
  id uuid primary key default uuid_generate_v4(),
  facebook_url text,
  instagram_url text,
  twitter_url text,
  youtube_url text,
  telegram_url text,
  updated_at timestamptz not null default now()
);

-- Enforce exactly one row (a constant-expression unique index is the
-- standard Postgres singleton-table trick).
create unique index site_settings_singleton on public.site_settings ((true));

-- Instagram is the one handle confirmed real (@sooriyabooks, stated on the
-- live sooriyabooks.lk site) — the rest start empty until staff add them.
insert into public.site_settings (instagram_url) values ('https://instagram.com/sooriyabooks');

alter table public.site_settings enable row level security;
create policy "site_settings_public_read" on public.site_settings for select using (true);
create policy "site_settings_staff_write" on public.site_settings for update using (public.is_staff()) with check (public.is_staff());
