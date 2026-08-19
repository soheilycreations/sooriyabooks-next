import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  viewAllHref,
  viewAllLabel = "View all",
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  align?: "start" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
      )}
    >
      <div className={cn(align === "center" && "max-w-xl")}>
        {eyebrow && (
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">{eyebrow}</p>
        )}
        <h2 className="font-heading text-3xl leading-tight">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="shrink-0 text-sm font-medium text-accent hover:underline">
          {viewAllLabel}
        </Link>
      )}
    </div>
  );
}
