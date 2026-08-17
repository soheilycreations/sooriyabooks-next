-- 0009_homepage_banner_scheduling.sql
-- Adds optional scheduling window to homepage_section_items, so the admin
-- "Homepage Banners" screen can schedule a slide to go live/expire without
-- needing a cron job — visibility is computed at read time.

alter table public.homepage_section_items
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists button_text text;
