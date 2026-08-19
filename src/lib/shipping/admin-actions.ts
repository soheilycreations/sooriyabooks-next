"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/auth/actions";

export async function createDistrict(name: string): Promise<ActionResult> {
  await requireStaff();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "District name is required" };
  const supabase = await createClient();
  const { error } = await supabase.from("shipping_districts").insert({ name: trimmed });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "A district with this name already exists" : error.message };
  }
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}

export async function createCity(districtId: string, name: string): Promise<ActionResult> {
  await requireStaff();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "City name is required" };
  const supabase = await createClient();

  // Proactive duplicate check (in addition to the DB's own unique
  // (district_id, name) constraint) so the admin gets a clear message
  // instead of a raw constraint-violation error.
  const { data: existing } = await supabase
    .from("shipping_cities")
    .select("id")
    .eq("district_id", districtId)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `"${trimmed}" already exists in this district` };
  }

  const { error } = await supabase.from("shipping_cities").insert({ district_id: districtId, name: trimmed });
  if (error) {
    return { ok: false, error: error.code === "23505" ? `"${trimmed}" already exists in this district` : error.message };
  }
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
  if (!Number.isFinite(minWeightG) || !Number.isFinite(maxWeightG) || minWeightG < 0) {
    return { ok: false, error: "Enter valid, non-negative min/max weights" };
  }
  if (maxWeightG <= minWeightG) {
    return { ok: false, error: "Max weight must be greater than min weight" };
  }
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
  if (!cityId || !weightBandId) return { ok: false, error: "Select a city first" };
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Enter a valid, non-negative rate" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_rates")
    .upsert({ city_id: cityId, weight_band_id: weightBandId, price }, { onConflict: "city_id,weight_band_id" });
  if (error) return { ok: false, error: error.message };
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}

export async function deleteShippingRate(cityId: string, weightBandId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_rates")
    .delete()
    .eq("city_id", cityId)
    .eq("weight_band_id", weightBandId);
  if (error) return { ok: false, error: error.message };
  revalidateTag("shipping");
  revalidatePath("/admin/shipping");
  return { ok: true, data: undefined };
}
