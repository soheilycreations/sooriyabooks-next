"use server";

import { quoteShippingCost, getDistrictsWithCities } from "./queries";

export async function getShippingOptionsAction() {
  return getDistrictsWithCities();
}

export async function quoteShippingAction(cityId: string, totalWeightGrams: number) {
  const rate = await quoteShippingCost(cityId, totalWeightGrams);
  if (rate === null) {
    return { ok: false as const, error: "No shipping rate configured for this city/weight. Contact us to complete your order." };
  }
  return { ok: true as const, rate };
}
