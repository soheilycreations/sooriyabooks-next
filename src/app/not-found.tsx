import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-heading text-8xl text-accent">404</p>
      <h1 className="mt-4 font-heading text-2xl">Page not found</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
