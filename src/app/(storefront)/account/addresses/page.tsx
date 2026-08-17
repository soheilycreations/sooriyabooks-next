import { createClient } from "@/lib/supabase/server";

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, label, recipient_name, phone, line1, line2, is_default")
    .order("is_default", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl">Addresses</h1>
      {!addresses || addresses.length === 0 ? (
        <p className="text-muted-foreground">
          No saved addresses yet — addresses are saved automatically when you check out.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-lg border p-4">
              <p className="font-medium">{addr.label || "Address"}</p>
              <p className="text-sm text-muted-foreground">{addr.recipient_name}</p>
              <p className="text-sm text-muted-foreground">{addr.phone}</p>
              <p className="mt-2 text-sm">{addr.line1}</p>
              {addr.line2 && <p className="text-sm">{addr.line2}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
