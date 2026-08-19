import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
      <Logo variant="full" height={44} priority className="mb-8" />
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">{children}</div>
    </div>
  );
}
