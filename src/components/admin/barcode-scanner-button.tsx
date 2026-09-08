"use client";

import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { ScanBarcode, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Opens the device camera and scans a barcode (ISBN/EAN-13, most commonly,
 * printed on a book's back cover) with ZXing's pure-JS decoder — not the
 * native BarcodeDetector API, which Safari/iOS still doesn't support, so
 * this works the same way across desktop and phone browsers instead of
 * silently failing on some devices. Defaults to the rear camera on phones
 * (ZXing's own fallback when no device id is given).
 */
export function BarcodeScannerButton({
  onScan,
  label = "Scan barcode",
}: {
  onScan: (text: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, _err, controls) => {
        controlsRef.current = controls;
        if (cancelled || !result) return;
        onScan(result.getText());
        controls.stop();
        setOpen(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? `Could not access the camera: ${err.message}`
            : "Could not access the camera. Check camera permissions and try again.",
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onScan]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label={label} title={label}>
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/60" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <DialogPrimitive.Title className="font-heading text-lg">Scan Barcode</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-md bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          </div>
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Point the camera at the barcode on the book&apos;s back cover.
            </p>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
