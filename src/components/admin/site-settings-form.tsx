"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateSiteSettings } from "@/lib/settings/actions";
import type { SiteSettingsInput } from "@/lib/validation/site-settings";

const FIELDS: { key: keyof SiteSettingsInput; label: string; placeholder: string; hint?: string }[] = [
  { key: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/..." },
  { key: "twitterUrl", label: "Twitter / X", placeholder: "https://x.com/..." },
  { key: "youtubeUrl", label: "YouTube", placeholder: "https://youtube.com/@..." },
  { key: "telegramUrl", label: "Telegram", placeholder: "https://t.me/..." },
  {
    key: "whatsappUrl",
    label: "WhatsApp",
    placeholder: "https://wa.me/94771234567",
    hint: "A wa.me link — replace 94771234567 with the store's WhatsApp number in international format, no plus sign or leading zero.",
  },
];

/** Leave a field blank to hide that icon in the footer — only platforms with a real URL saved here show up. */
export function SiteSettingsForm({ initial }: { initial: SiteSettingsInput }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<SiteSettingsInput>(initial);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateSiteSettings(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type="url"
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
              />
              {field.hint && <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-accent">Saved — the footer will update on next page load.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
