-- SooriyaBooks Commerce Platform V2
-- 0018_site_settings_whatsapp.sql
-- Adds a WhatsApp link to the site_settings singleton (see 0017) so staff
-- can set/change the storefront's WhatsApp contact link from /admin/settings
-- without a code deploy, same as the existing social links.

alter table public.site_settings add column whatsapp_url text;
