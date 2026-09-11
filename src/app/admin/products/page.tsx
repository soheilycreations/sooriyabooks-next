import { requireStaff } from "@/lib/auth/session";
import { AdminPageHeader } from "@/components/admin/page-header";
import { searchAdminProducts } from "@/lib/catalog/actions";
import { ProductsTable } from "./products-table";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
  const { q } = await searchParams;
  const books = await searchAdminProducts(q);

  return (
    <div>
      <AdminPageHeader title="Products" actionLabel="New Product" actionHref="/admin/products/new" />
      <ProductsTable initialBooks={books} initialQuery={q ?? ""} />
    </div>
  );
}
