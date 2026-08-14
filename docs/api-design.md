# API Design

Most mutations are **Server Actions** (colocated with the calling component, type-safe, CSRF-safe by default) — not a separate REST/GraphQL API. Route Handlers exist only where a Server Action can't apply: external webhooks, file streaming, and machine-consumable endpoints (sitemap, robots.txt).

## Server Actions (by module)

```ts
// src/lib/catalog/actions.ts
createBook(input: BookInput): Promise<Book>
updateBook(id: string, input: Partial<BookInput>): Promise<Book>
deleteBook(id: string): Promise<void>
createCategory / updateCategory / deleteCategory
createAuthor / updateAuthor / deleteAuthor
createPublisher / updatePublisher / deletePublisher

// src/lib/inventory/actions.ts
adjustStock(bookId: string, delta: number, reason: string): Promise<void>
setLowStockThreshold(bookId: string, threshold: number): Promise<void>

// src/lib/shipping/actions.ts
quoteShipping(cityId: string, totalWeightG: number): Promise<{ rate: number }>   // wraps calculate_shipping_cost()
upsertDistrict / upsertCity / upsertWeightBand / upsertRate

// src/lib/orders/actions.ts
addToCart(bookId: string, quantity: number): Promise<Cart>
updateCartItem / removeCartItem
startCheckout(input: CheckoutInput): Promise<{ orderId: string }>   // reserves stock, quotes shipping+coupon
confirmOrder(orderId: string, paymentResult): Promise<Order>
updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<void>  // staff only

// src/lib/pricing/actions.ts
applyCoupon(code: string, cartSubtotal: number): Promise<{ discount: number }>  // wraps validate_and_redeem_coupon()
createCoupon / updateCoupon / deleteCoupon

// src/lib/customers/actions.ts
updateProfile, addAddress / updateAddress / deleteAddress
toggleWishlist(bookId: string): Promise<void>
moveWishlistItemToCart(bookId: string): Promise<void>
submitReview(bookId: string, rating: number, title, body): Promise<Review>
replyToReview(reviewId: string, reply: string): Promise<void>   // staff only
blockCustomer / unblockCustomer(customerId: string, reason?: string): Promise<void>  // staff only, generalizes the "Blocked Users" rule

// src/lib/content/actions.ts
upsertHomepageSection, reorderHomepageSections, toggleSectionVisibility
createBlogPost / updateBlogPost / publishBlogPost
updateStaticPage(slug, body)
updateSeoFields(entityType, entityId, seo: SeoInput)
```

## Route Handlers (`src/app/api/**`)

| Route | Purpose |
|---|---|
| `POST /api/webhooks/bank-ipg` | Payment gateway callback — verifies provider signature, updates `payment_transactions`/`orders`, never trusts client-submitted payment status directly |
| `GET /api/sitemap.xml` | Generated from `books`/`categories`/`blog_posts`/`static_pages`, revalidated on content change |
| `GET /api/robots.txt` | Static, environment-aware (blocks indexing on preview deployments) |
| `POST /api/admin/export` | Streams Excel/PDF/CSV report exports (large payloads — not a good fit for a Server Action's response model) |

## Validation

Every Server Action's input is parsed through a Zod schema shared with the calling form (`src/lib/validation/<entity>.ts`) — one schema, used for both client-side form validation and the server-side guard, so they can never drift.

## Error contract

Server Actions return a discriminated union rather than throwing across the server/client boundary:
```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };
```
