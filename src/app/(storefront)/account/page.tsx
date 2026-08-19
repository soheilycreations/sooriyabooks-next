import Link from "next/link";
import { Package, Heart, MapPin, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

const QUICK_LINKS = [
  { href: "/account/orders", label: "Orders", description: "Track and review past orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", description: "Books you've saved", icon: Heart },
  { href: "/account/addresses", label: "Addresses", description: "Saved delivery addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", description: "Your account details", icon: User },
];

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="font-heading text-2xl leading-tight">My Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user?.email}.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-accent hover:bg-accent/5"
          >
            <link.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-medium">{link.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
