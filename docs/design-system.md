# SooriyaBooks V2 — Design System

Reference document for all storefront/admin UI work. Establishes the visual
foundation before Phase 3+ (header, homepage, product/category, cart/checkout).
Direction: premium modern bookstore / digital library — editorial, warm,
restrained. Not a generic e-commerce template.

## 1. Official Brand Asset

- **Logo (source of truth):** admin-supplied artwork (`Group-176.png`, 1449×236),
  stored at `public/brand/sooriya-logo.png`. Has a solid black background by
  design — not transparent, kept as supplied rather than altered.
- **Sun mark (icon-only):** `public/brand/sooriya-mark.png` (512×512, from
  `Sooriya-icon-512x512-1.png`, the same file the live WordPress site uses as
  its favicon). Used for compact mobile header and the site favicon
  (`src/app/icon.png`).
- **Component:** `src/components/shared/logo.tsx` — `<Logo variant="full" | "mark" height={n} />`.
  Width is always derived from the source aspect ratio (~6.14:1 for `full`,
  1:1 for `mark`) — never set width and height independently, never stretch.
  Used in: header (desktop = `full`, mobile = `mark`), footer (`full`), auth
  layout (`full`).
- **Clear space:** don't place the logo directly against other content or a
  competing background color; the header/footer/auth usages already give it
  its own flex slot with natural padding — preserve that when reusing it
  elsewhere.
- **Do not**: redesign, recolor, re-crop, add drop shadows/effects, or place
  it on a background that fights the orange (e.g. a saturated orange section
  background).

## 2. Color Tokens

Defined in `src/app/globals.css` (HSL CSS variables, consumed via
`tailwind.config.ts`). These already existed pre-Phase-2 and were verified
against the real brand this phase — confirmed accurate, not changed.

| Token | Light value | Role |
|---|---|---|
| `--background` | `40 33% 99%` | Page background — warm off-white, not pure white |
| `--foreground` | `0 0% 7%` | Primary text — near-black, not pure black |
| `--card` | `0 0% 100%` | Card/surface background |
| `--secondary` / `--muted` | `40 15% 95%` | Warm neutral surfaces (footer, subtle sections) |
| `--muted-foreground` | `0 0% 40%` | Secondary/meta text |
| `--accent` | `37 87% 58%` | Sooriya orange — CTAs, sale badges, links, active states |
| `--border` / `--input` | `40 10% 88%` | Hairline borders, warm-tinted not cold gray |
| `--destructive` | `0 72% 51%` | Errors, remove actions |

Dark mode equivalents exist in `.dark` (near-black background, same accent
orange held constant — the brand color must not shift between themes).

`brand.50`–`brand.900` (`tailwind.config.ts`) is the extended orange ramp for
cases needing a lighter/darker tint than the single `accent` token (e.g.
badge backgrounds, hover states) — `brand.400`/`500` are the primary-orange
family the logo's orange itself sits within.

**Usage rule:** reach for the semantic token (`accent`, `muted`,
`border`, …) in components; reach for `brand-{n}` only when you need a
specific tint the semantic tokens don't expose. Never hardcode a hex value
in a component.

## 3. Typography

- **Headings/display:** `Marcellus` (serif) — `font-heading`. Editorial,
  premium feel. Used for every `h1`–`h6` by default (`globals.css`).
- **Body/UI:** `Jost` (sans) — `font-body`. Matches the live WordPress
  site's body font exactly (verified), so the transition feels continuous
  to returning customers.
- Both loaded via `next/font/google` in `src/app/layout.tsx` — self-hosted,
  no FOUC, `display: swap`.

### Type scale

| Role | Class | Size / leading | Weight/font |
|---|---|---|---|
| Display (hero) | `text-5xl md:text-6xl` | 48px→60px / tight | `font-heading` |
| Page title / H1 | `text-3xl md:text-4xl` | 30px→36px / tight | `font-heading` |
| Section heading / H2 | `text-2xl md:text-3xl` | 24px→30px / snug | `font-heading` |
| Card heading / H3 | `text-base` | 16px / snug | `font-heading` |
| Body large | `text-lg` | 18px / relaxed | `font-body` regular |
| Body regular | `text-base` | 16px / relaxed | `font-body` regular |
| Body small | `text-sm` | 14px / normal | `font-body` regular |
| Metadata | `text-xs` | 12px / normal | `font-body`, `text-muted-foreground` |
| Price | `text-base` / `text-lg` for emphasis | — | `font-body` medium, `text-accent` when discounted |
| Labels/buttons | `text-sm` | 14px | `font-body` medium |

Rules:
- Never go above `text-6xl` anywhere — no oversized hero stunts.
- Headings use `font-heading` only; never mix Marcellus into body copy or
  buttons (it reads decorative at small sizes/long strings).
- Line-height: use Tailwind's default leading for the class (`leading-tight`
  on display/H1 only, everything else keeps normal/relaxed body leading).

## 4. Spacing & Layout

- **Container:** `container` class (`tailwind.config.ts`) — centered,
  `1rem` padding, caps at `1400px` (`2xl` breakpoint). Use `container` on
  every top-level page section instead of ad-hoc `max-w-*` + manual padding.
- **Gutters:** the container's `1rem` base padding covers mobile; Tailwind's
  responsive container padding scales with breakpoint automatically — don't
  override per-page.
- **Section vertical rhythm:** `py-16` (mobile) stepping to `py-16 md:py-28`
  for hero-weight sections; `py-16` flat for standard content sections
  (matches current homepage sections — keep consistent going forward).
- **Card spacing:** `gap-6` in card grids (`grid grid-cols-2 md:grid-cols-4
  gap-6`), `mt-3`/`mt-2` internal stacking (title → author → price).
- **Header height:** `h-20` (80px) — fixed, don't vary per page.
- **Footer:** `mt-24` separation from page content, `py-16` internal, `gap-10`
  between columns.
- Spacing values otherwise follow Tailwind's default 4px scale
  (`1`=4px … `4`=16px … `6`=24px … `8`=32px) — don't introduce arbitrary
  pixel values (`mt-[13px]` etc.) except for pixel-exact asset alignment.

### Breakpoints (Tailwind defaults, unchanged)

`sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px · `2xl` 1400px (container cap)

## 5. Shape Language

- **Radius:** `--radius: 0.5rem` (8px) as `rounded-lg`; `rounded-md`/`rounded-sm`
  derive from it (`-2px`/`-4px`). Applied consistently to cards, buttons,
  inputs, badges — no per-component radius overrides.
- **Borders over shadows:** default surfaces use a 1px warm-gray border
  (`border-border`) rather than drop shadows. Shadow is reserved for
  genuinely elevated UI (dialogs/popovers — `shadow-sm` at most). No card
  hover shadows, no glassmorphism, no gradients.
- **Images:** book covers use `aspect-[3/4]` with `object-cover` — consistent
  crop ratio across product cards, galleries, and related-book rails.

## 6. Motion Principles

Primitives added to `tailwind.config.ts` this phase (`animate-fade-in`,
`animate-fade-up`, `animate-scale-in`, `ease-premium`) — **not yet applied to
any page**; they exist so Phase 3+ component work has a consistent easing
curve/duration to reach for instead of inventing one per component.

- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (`ease-premium`) — a fast-out,
  gentle-settle curve. Use for anything meant to feel "premium," not a
  bouncy/elastic curve.
- **Durations:** micro-interactions (button/link hover) 150–200ms via
  `transition-colors`; content reveals (card entrance, gallery transition)
  300–500ms.
- **What gets animated:** image hover zoom on product cards (already
  implemented — `group-hover:scale-[1.03]`), header scroll transition,
  staggered grid entrance, gallery thumbnail switching, modal/drawer
  open-close, button/link hover — all already scoped in the original brief
  and left for their respective phases.
- **What doesn't:** no parallax, no spinning/bouncing, no animating on every
  element, no animation that delays the shopping action (e.g. add-to-cart
  should never wait on an animation to complete).
- **Accessibility:** `prefers-reduced-motion: reduce` is now handled globally
  in `globals.css` — all animations/transitions collapse to near-instant for
  users who request it. Component-level motion code doesn't need to
  duplicate this check.

## 7. Component Usage Principles

- Reuse `src/components/ui/*` (shadcn primitives) and `Button`'s existing
  `variant`/`size` system (`default`, `accent`, `outline`, `ghost`, `link`,
  `destructive` × `sm`/`default`/`lg`/`icon`) rather than one-off styled
  elements.
- New shared pieces should live in `src/components/shared` (cross-cutting,
  e.g. `Logo`) or `src/components/storefront` (storefront-only, e.g.
  `ProductCard`) — matching the existing module boundary in
  `docs/architecture.md` §5.

## 8. Accessibility

- Maintain visible focus rings (`focus-visible:ring-2 focus-visible:ring-ring`
  — already on `Button`; carry into any new interactive component).
- All logo usages set `alt="Sooriya Publishers"` — don't reuse the logo
  image as a generic decorative element without alt text.
- Reduced motion respected globally (§6).
- Color contrast: body text (`--foreground` near-black on `--background`
  warm off-white) and the accent orange on white both meet WCAG AA for the
  sizes they're used at; if accent orange is ever used as *text* on a
  *white* button background, verify contrast case-by-case — it's tuned for
  use as a background/icon/border color, not guaranteed AA as small text.
