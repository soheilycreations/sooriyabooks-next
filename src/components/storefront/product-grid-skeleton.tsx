export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="container py-12 md:py-16" aria-hidden>
      <div className="mb-8 flex flex-col gap-4 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
