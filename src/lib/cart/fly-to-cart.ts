/**
 * Clones the book cover, animates it from its on-screen position to the
 * header's cart icon, then removes the clone and lets the caller trigger
 * the cart icon's own "pulse" (via a CSS class toggle, not this file —
 * keeps this a pure DOM-animation utility with no component dependencies).
 * Purely decorative: the actual addItem() call happens synchronously
 * before/independent of this, so nothing about the cart depends on the
 * animation finishing (or even running, e.g. under prefers-reduced-motion).
 */
export function flyToCart(sourceEl: HTMLElement, imageUrl: string | null) {
  if (typeof window === "undefined") return;
  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const from = sourceEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || from.height === 0) return;

  const clone = document.createElement("div");
  clone.style.cssText = `
    position: fixed;
    left: ${from.left}px;
    top: ${from.top}px;
    width: ${from.width}px;
    height: ${from.height}px;
    z-index: 200;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    pointer-events: none;
    transition: transform 550ms cubic-bezier(0.16, 1, 0.3, 1), opacity 550ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, opacity;
  `;

  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
    clone.appendChild(img);
  } else {
    clone.style.background = "hsl(var(--accent))";
  }

  document.body.appendChild(clone);

  const toCenterX = to.left + to.width / 2;
  const toCenterY = to.top + to.height / 2;
  const fromCenterX = from.left + from.width / 2;
  const fromCenterY = from.top + from.height / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  // Force layout so the browser registers the starting position before the
  // transform kicks in — without this the clone can jump straight to the
  // end state instead of animating.
  void clone.offsetHeight;

  requestAnimationFrame(() => {
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.12)`;
    clone.style.opacity = "0.3";
  });

  clone.addEventListener(
    "transitionend",
    () => {
      clone.remove();
      target.classList.add("animate-cart-pulse");
      window.setTimeout(() => target.classList.remove("animate-cart-pulse"), 400);
    },
    { once: true },
  );

  // transitionend can fail to fire (e.g. tab backgrounded mid-animation) —
  // a hard timeout guarantees the clone never lingers forever.
  window.setTimeout(() => clone.remove(), 900);
}
