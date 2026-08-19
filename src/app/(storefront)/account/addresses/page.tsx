import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select(
      `id, label, recipient_name, phone, line1, line2, postal_code, is_default,
       shipping_cities ( name, shipping_districts ( name ) )`,
    )
    .order("is_default", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl leading-tight">Addresses</h1>

      {!addresses || addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No saved addresses yet.</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Addresses are saved automatically the first time you check out.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const city = addr.shipping_cities as any;
            return (
              <div key={addr.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{addr.label || "Address"}</p>
                  {addr.is_default && <Badge variant="secondary">Default</Badge>}
                </div>
                <p className="mt-2 text-sm">{addr.recipient_name}</p>
                <p className="text-sm text-muted-foreground">{addr.phone}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {addr.line1}
                  {addr.line2 && <>, {addr.line2}</>}
                </p>
                {city && (
                  <p className="text-sm text-muted-foreground">
                    {city.name}
                    {city.shipping_districts?.name && `, ${city.shipping_districts.name}`}
                    {addr.postal_code && ` ${addr.postal_code}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
