import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { AccountNav } from "./account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account");

  return (
    <div className="container py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <aside>
          <AccountNav />
          <form action={signOutAction} className="mt-4">
            <Button variant="outline" size="sm" type="submit" className="w-full">
              Sign out
            </Button>
          </form>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
