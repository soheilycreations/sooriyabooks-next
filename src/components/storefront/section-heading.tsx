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
          <p
            className={cn(
              "mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent",
              align === "center" && "justify-center",
            )}
          >
            <span className="h-px w-6 bg-accent" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2 className="font-heading text-3xl leading-tight md:text-4xl md:leading-tight">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent/80"
        >
          {viewAllLabel}
          <span aria-hidden className="transition-transform duration-200 ease-premium group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      )}
    </div>
  );
}
