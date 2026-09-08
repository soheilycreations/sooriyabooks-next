"use client";

import { useRef } from "react";
import { BarcodeScannerButton } from "@/components/admin/barcode-scanner-button";

/** Same GET-form search as before, plus a camera scan button — scanning a
 *  book's barcode fills the field with its ISBN/EAN and submits straight
 *  away, so finding a product is one scan instead of typing the number in. */
export function ProductSearchBar({ defaultValue }: { defaultValue?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form ref={formRef} className="mb-4 flex max-w-sm gap-2">
      <input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search by title, SKU, or ISBN..."
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <BarcodeScannerButton
        label="Scan ISBN barcode"
        onScan={(text) => {
          if (inputRef.current) inputRef.current.value = text;
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}
