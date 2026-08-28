import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Official artwork — see docs/design-system.md §1. `sooriya-logo.png` has a
// solid black background (a design decision, not a bug — kept as supplied
// rather than silently making it transparent). Do not redraw, recolor, or
// alter proportions; only resize via the `height` prop (width follows the
// source aspect ratio automatically).
const LOGO_FULL_SRC = "/brand/sooriya-logo.png";
const LOGO_FULL_ASPECT = 1449 / 236;

const LOGO_MARK_SRC = "/brand/sooriya-mark.png";
const LOGO_MARK_ASPECT = 1;

export interface LogoProps {
  /** "full" = wordmark + sun mark (header, footer, auth). "mark" = sun icon only (compact mobile header, tight spaces). */
  variant?: "full" | "mark";
  /** Rendered height in pixels; width is derived from the source aspect ratio. */
  height?: number;
  className?: string;
  /** Wrap in a link to home. Set false when the logo sits inside an already-linked element. */
  href?: string | false;
  priority?: boolean;
}

export function Logo({ variant = "full", height = 40, className, href = "/", priority = false }: LogoProps) {
  const src = variant === "full" ? LOGO_FULL_SRC : LOGO_MARK_SRC;
  const aspect = variant === "full" ? LOGO_FULL_ASPECT : LOGO_MARK_ASPECT;
  const width = Math.round(height * aspect);

  const img = (
    <Image
      src={src}
      alt="Sooriya Publishers"
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
      style={{ height, width: "auto" }}
    />
  );

  if (href === false) return img;

  return (
    <Link href={href} aria-label="Sooriya Publishers home" className="inline-flex shrink-0 items-center">
      {img}
    </Link>
  );
}
