import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ShippingManager, type District, type WeightBand, type RateMap } from "./shipping-manager";

export default async function AdminShippingPage() {
  await requireStaff();
  const supabase = await createClient();

  const [{ data: districtsRaw }, { data: citiesRaw }, { data: bandsRaw }, { data: ratesRaw }] = await Promise.all([
    supabase.from("shipping_districts").select("id, name").order("sort_order"),
    supabase.from("shipping_cities").select("id, district_id, name").order("sort_order"),
    supabase.from("shipping_weight_bands").select("id, min_weight_g, max_weight_g, label"),
    supabase.from("shipping_rates").select("city_id, weight_band_id, price"),
  ]);

  const districts: District[] = (districtsRaw ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    cities: (citiesRaw ?? []).filter((c) => c.district_id === d.id).map((c) => ({ id: c.id, name: c.name })),
  }));

  const weightBands: WeightBand[] = (bandsRaw ?? []).map((b) => ({
    id: b.id,
    minWeightG: b.min_weight_g,
    maxWeightG: b.max_weight_g,
    label: b.label,
  }));

  const rates: RateMap = {};
  for (const r of ratesRaw ?? []) {
    rates[`${r.city_id}:${r.weight_band_id}`] = Number(r.price);
  }

  return (
    <div>
      <AdminPageHeader
        title="Shipping"
        description="Districts, cities, weight bands, and per-city delivery rates. This directly drives the checkout shipping calculation."
      />
      <ShippingManager districts={districts} weightBands={weightBands} rates={rates} />
    </div>
  );
}
