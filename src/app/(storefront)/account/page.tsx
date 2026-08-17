import { getCurrentUser } from "@/lib/auth/session";

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();
  return (
    <div>
      <h1 className="font-heading text-2xl">My Account</h1>
      <p className="mt-2 text-muted-foreground">Welcome back, {user?.email}.</p>
    </div>
  );
}
