import { redirect } from "next/navigation";
import { getStaffRole } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getStaffRole();

  // Belt-and-braces: middleware already redirects unauthenticated requests
  // away from /admin, but this also catches an authenticated *customer*
  // (no staff_members row) trying to reach the admin shell directly.
  if (!role) {
    redirect("/login?redirectTo=/admin");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium capitalize">{role}</span>
          </p>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
