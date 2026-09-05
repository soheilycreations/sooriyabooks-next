"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyRecaptcha } from "@/lib/security/recaptcha";
import type { ActionResult } from "@/lib/auth/actions";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  message: z.string().min(10, "Message is too short"),
});

export async function submitContactMessage(
  input: z.infer<typeof contactSchema>,
  recaptchaToken?: string,
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!(await verifyRecaptcha(recaptchaToken))) {
    return { ok: false, error: "Please complete the CAPTCHA verification" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(parsed.data);
  if (error) return { ok: false, error: "Could not send message. Please try again." };
  return { ok: true, data: undefined };
}
