const STORAGE_KEY = "sb_last_delivery";

/** Remembers the shopper's last-picked district/city in the browser so the
 * cart and checkout pages don't ask them to re-select it on every visit. */
export function saveLastDelivery(districtId: string, cityId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ districtId, cityId }));
  } catch {
    // Private/incognito mode or storage disabled — city just won't be remembered next time.
  }
}

export function loadLastDelivery(): { districtId: string; cityId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.districtId === "string" && typeof parsed?.cityId === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}
