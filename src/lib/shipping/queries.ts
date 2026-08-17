import { createClient } from "@/lib/supabase/server";

export interface DistrictWithCities {
  id: string;
  name: string;
  cities: { id: string; name: string }[];
}

export async function getDistrictsWithCities(): Promise<DistrictWithCities[]> {
  const supabase = await createClient();
  const [{ data: districts }, { data: cities }] = await Promise.all([
    supabase.from("shipping_districts").select("id, name, sort_order").order("sort_order"),
    supabase.from("shipping_cities").select("id, district_id, name, sort_order").order("sort_order"),
  ]);

  return (districts ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    cities: (cities ?? [])
      .filter((c) => c.district_id === d.id)
      .map((c) => ({ id: c.id, name: c.name })),
  }));
}

/** Wraps the calculate_shipping_cost() Postgres function — see supabase/migrations/0002_functions.sql. */
export async function quoteShippingCost(cityId: string, totalWeightGrams: number): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("calculate_shipping_cost", {
    p_city_id: cityId,
    p_total_weight_g: totalWeightGrams,
  });

  const first = data?.[0];
  if (error || !first) return null;
  return Number(first.rate);
}
