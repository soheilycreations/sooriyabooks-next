import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
      <Link href="/" className="mb-8 font-heading text-2xl">
        Sooriya <span className="text-accent">Publishers</span>
      </Link>
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">{children}</div>
    </div>
  );
}
