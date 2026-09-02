const STORAGE_KEY = "sb_last_address";

export interface SavedAddress {
  recipientName: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  postalCode: string;
}

/** Remembers the shopper's own delivery details in the browser after a
 * successful order, so returning customers don't have to retype their name,
 * phone, email and address on every checkout. */
export function saveLastAddress(address: SavedAddress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
  } catch {
    // Private/incognito mode or storage disabled — just won't be remembered next time.
  }
}

export function loadLastAddress(): SavedAddress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.recipientName === "string" && typeof parsed?.phone === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}
