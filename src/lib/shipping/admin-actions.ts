"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/auth/actions";

export async function createDistrict(name: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("shipping_districts").insert({ name });
  if (error) return { ok: false, error: error.message };
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}

export async function createCity(districtId: string, name: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("shipping_cities").insert({ district_id: districtId, name });
  if (error) return { ok: false, error: error.message };
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}

export async function deleteCity(id: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("shipping_cities").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}

export async function createWeightBand(minWeightG: number, maxWeightG: number, label: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("shipping_weight_bands").insert({ min_weight_g: minWeightG, max_weight_g: maxWeightG, label });
  if (error) return { ok: false, error: error.message };
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}

export async function deleteWeightBand(id: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("shipping_weight_bands").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}

export async function setShippingRate(cityId: string, weightBandId: string, price: number): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_rates")
    .upsert({ city_id: cityId, weight_band_id: weightBandId, price }, { onConflict: "city_id,weight_band_id" });
  if (error) return { ok: false, error: error.message };
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}
