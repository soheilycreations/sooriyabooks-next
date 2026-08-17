import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="mb-2 font-heading text-3xl">Contact Us</h1>
      <p className="mb-8 text-muted-foreground">
        Questions about an order, a book, or anything else — send us a message and we&apos;ll respond as soon as we can.
      </p>
      <ContactForm />
    </div>
  );
}
