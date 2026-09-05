import { redirect } from "next/navigation";
import { getStaffRole } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
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
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between gap-2 border-b bg-card px-3 md:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <AdminMobileNav />
            <p className="truncate text-sm text-muted-foreground">
              <span className="hidden sm:inline">Signed in as </span>
              <span className="font-medium capitalize">{role}</span>
            </p>
          </div>
          <form action={signOutAction} className="shrink-0">
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
