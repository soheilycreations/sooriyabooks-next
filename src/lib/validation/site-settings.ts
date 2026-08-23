import { z } from "zod";

const urlField = z.string().trim().url("Must be a full URL, e.g. https://...").optional().or(z.literal(""));

export const siteSettingsSchema = z.object({
  facebookUrl: urlField,
  instagramUrl: urlField,
  twitterUrl: urlField,
  youtubeUrl: urlField,
  telegramUrl: urlField,
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
