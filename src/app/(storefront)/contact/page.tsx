import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact Us" };

// Real business details migrated from the legacy site's Contact Us page
// and WooCommerce store-address settings — not invented.
const CONTACT_DETAILS = [
  { icon: MapPin, label: "Address", value: "No. 114, Ven. S. Mahinda Mawatha, Colombo 10, Sri Lanka" },
  { icon: Phone, label: "Phone", value: "(+94) 77 408 9433", href: "tel:+94774089433" },
  { icon: Mail, label: "Email", value: "online@sooriyabooks.lk", href: "mailto:online@sooriyabooks.lk" },
  { icon: Clock, label: "Store Hours", value: "Mon – Sat: 9.00 AM to 5.00 PM" },
];

export default function ContactPage() {
  return (
    <div className="container max-w-5xl py-12 md:py-16">
      <h1 className="mb-2 font-heading text-3xl">Contact Us</h1>
      <p className="mb-10 max-w-xl text-muted-foreground">
        Questions about an order, a book, or anything else — send us a message and we&apos;ll respond as soon as we
        can, or reach us directly using the details below.
      </p>

      <div className="grid gap-10 md:grid-cols-2">
        <ContactForm />

        <div className="space-y-5">
          {CONTACT_DETAILS.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                {href ? (
                  <a href={href} className="font-medium hover:text-accent">
                    {value}
                  </a>
                ) : (
                  <p className="font-medium">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
