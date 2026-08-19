"use server";

import { createClient } from "@/lib/supabase/server";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/checkout";
import { quoteShippingCost } from "@/lib/shipping/queries";
import type { ActionResult } from "@/lib/auth/actions";

/**
 * Places an order. Never trusts client-submitted prices/weights — every
 * amount is recomputed server-side from the current `books`/`inventory`
 * rows, and stock is atomically reserved via reserve_stock() so concurrent
 * checkouts can't oversell (see supabase/migrations/0002_functions.sql).
 */
export async function createOrder(input: CheckoutInput): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid checkout data" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in to place an order" };
  }

  // 0. Self-heal a missing profiles row before it can break the
  // addresses insert below (addresses.customer_id -> profiles(id)).
  // signIn() also does this, but only at the moment of a fresh login —
  // a session that was already active before that fix shipped, or an
  // account that predates it, would never pick it up otherwise. Doing it
  // here guarantees the row exists at the exact point it's needed,
  // regardless of session age. Upserting only `id` is a no-op for an
  // existing row (touches no other column).
  const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!existingProfile) {
    const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id });
    if (profileError) {
      console.error("createOrder: failed to self-heal missing profiles row:", {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
        userId: user.id,
      });
      const detail = process.env.NODE_ENV !== "production" ? ` (${profileError.message})` : "";
      return { ok: false, error: `Could not prepare your account for checkout${detail}` };
    }
  }

  // 1. Re-price every line item from the database — client totals are UI-only.
  const bookIds = data.items.map((i) => i.bookId);
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id, title, sku, selling_price, discount_price, weight_grams, is_active")
    .in("id", bookIds);

  if (booksError || !books || books.length !== bookIds.length) {
    return { ok: false, error: "One or more items in your cart are no longer available" };
  }

  const lineItems = data.items.map((item) => {
    const book = books.find((b) => b.id === item.bookId)!;
    const unitPrice =
      book.discount_price != null && Number(book.discount_price) < Number(book.selling_price)
        ? Number(book.discount_price)
        : Number(book.selling_price);
    return {
      bookId: book.id,
      title: book.title,
      sku: book.sku,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      weightGrams: book.weight_grams,
    };
  });

  const subtotal = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const totalWeightGrams = lineItems.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0);

  // 2. Resolve/validate the shipping address.
  let addressId = data.addressId ?? null;
  if (!addressId && data.newAddress) {
    const { data: newAddr, error: addrError } = await supabase
      .from("addresses")
      .insert({
        customer_id: user.id,
        label: data.newAddress.label || null,
        recipient_name: data.newAddress.recipientName,
        phone: data.newAddress.phone,
        line1: data.newAddress.line1,
        line2: data.newAddress.line2 || null,
        city_id: data.cityId,
        postal_code: data.newAddress.postalCode || null,
      })
      .select("id")
      .single();
    if (addrError || !newAddr) {
      // Never swallow the real cause — log it server-side unconditionally,
      // and surface it to the caller too when running in development so it
      // shows up directly in the checkout UI while diagnosing, without
      // exposing internal DB detail to real customers in production.
      console.error("createOrder: failed to insert delivery address:", {
        message: addrError?.message,
        details: addrError?.details,
        hint: addrError?.hint,
        code: addrError?.code,
        customerId: user.id,
        cityId: data.cityId,
      });
      const detail = process.env.NODE_ENV !== "production" && addrError ? ` (${addrError.message})` : "";
      return { ok: false, error: `Could not save delivery address${detail}` };
    }
    addressId = newAddr.id;
  }
  if (!addressId) {
    return { ok: false, error: "A delivery address is required" };
  }

  // 3. Quote shipping server-side (never trust a client-submitted shipping fee).
  const shippingTotal = await quoteShippingCost(data.cityId, totalWeightGrams);
  if (shippingTotal === null) {
    return { ok: false, error: "No delivery rate is configured for this city yet. Please contact us to complete your order." };
  }

  // 4. Coupon lookup (validation + discount calculation happens after the
  // order exists — validate_and_redeem_coupon() needs an order_id to
  // record the redemption against, see step 5b below).
  let couponId: string | null = null;
  if (data.couponCode) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("id")
      .eq("code", data.couponCode)
      .maybeSingle();
    if (!coupon) {
      return { ok: false, error: "Invalid coupon code" };
    }
    couponId = coupon.id;
  }

  const grandTotal = subtotal + shippingTotal;

  // 5. Create the order (pending_payment / payment_status pending until reservation succeeds).
  const { data: orderNumberResult } = await supabase.rpc("next_order_number");
  const orderNumber = orderNumberResult ?? `SB-${Date.now()}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: user.id,
      status: "pending_payment",
      payment_method: data.paymentMethod,
      payment_status: "pending",
      subtotal,
      discount_total: 0,
      shipping_total: shippingTotal,
      tax_total: 0,
      grand_total: grandTotal,
      coupon_id: couponId,
      shipping_address_id: addressId,
      billing_address_id: addressId,
      total_weight_g: totalWeightGrams,
      customer_note: data.customerNote || null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    return { ok: false, error: "Could not create order. Please try again." };
  }

  // 5b. Validate + redeem the coupon now that we have an order_id, then
  // apply the real discount to the order. validate_and_redeem_coupon()
  // re-checks expiry/usage-limits/minimum-order atomically (see
  // supabase/migrations/0002_functions.sql) — the earlier lookup was only
  // to resolve the coupon's id, not to authorize the discount.
  if (data.couponCode) {
    const { data: discount, error: couponError } = await supabase.rpc("validate_and_redeem_coupon", {
      p_code: data.couponCode,
      p_customer_id: user.id,
      p_order_id: order.id,
      p_order_subtotal: subtotal,
    });
    if (couponError || discount == null) {
      await supabase.rpc("mark_order_failed", { p_order_id: order.id, p_note: "Coupon could not be applied" });
      return { ok: false, error: couponError?.message || "This coupon could not be applied" };
    }
    const { error: applyError } = await supabase.rpc("apply_order_coupon_discount", {
      p_order_id: order.id,
      p_discount: Number(discount),
    });
    if (applyError) {
      // validate_and_redeem_coupon() already recorded the redemption at
      // this point (usage_count incremented, coupon_redemptions row
      // inserted) — failing the whole order here would let the customer
      // re-redeem a single-use coupon on retry. Log for investigation and
      // proceed with the order at full price rather than double-charge or
      // double-redeem; this path should be effectively unreachable since
      // validate_and_redeem_coupon() already clamps the discount to a
      // valid range, but never fail silently if it somehow does happen.
      console.error(`apply_order_coupon_discount failed for order ${order.id}:`, applyError.message);
    }
  }

  // 6. Reserve stock per line item. If any line fails partway through, the
  // items already reserved in this loop are released before failing the
  // order — otherwise their stock would stay locked as "reserved" forever.
  const reservedSoFar: { bookId: string; quantity: number }[] = [];
  for (const item of lineItems) {
    const { error: reserveError } = await supabase.rpc("reserve_stock", {
      p_book_id: item.bookId,
      p_quantity: item.quantity,
      p_order_id: order.id,
    });
    if (reserveError) {
      for (const reserved of reservedSoFar) {
        await supabase.rpc("release_reserved_stock", {
          p_book_id: reserved.bookId,
          p_quantity: reserved.quantity,
          p_order_id: order.id,
        });
      }
      await supabase.rpc("mark_order_failed", { p_order_id: order.id, p_note: `Insufficient stock for "${item.title}"` });
      return { ok: false, error: `Insufficient stock for "${item.title}"` };
    }
    reservedSoFar.push({ bookId: item.bookId, quantity: item.quantity });
  }

  // 7. Insert order line items (price/weight snapshots, immutable history).
  const { error: itemsError } = await supabase.from("order_items").insert(
    lineItems.map((item) => ({
      order_id: order.id,
      book_id: item.bookId,
      title_snapshot: item.title,
      sku_snapshot: item.sku,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
    })),
  );
  if (itemsError) {
    // Stock was already reserved in step 6 — release it, or it would stay
    // locked as "reserved" forever against an order that never got its
    // line items recorded.
    for (const reserved of reservedSoFar) {
      await supabase.rpc("release_reserved_stock", {
        p_book_id: reserved.bookId,
        p_quantity: reserved.quantity,
        p_order_id: order.id,
      });
    }
    await supabase.rpc("mark_order_failed", { p_order_id: order.id, p_note: "Could not save order items" });
    return { ok: false, error: "Could not save order items" };
  }

  // 8. Cash on Delivery is confirmed immediately (payment collected on
  // delivery); Bank IPG stays pending until the gateway webhook confirms
  // payment (src/app/api/webhooks/bank-ipg — Phase 5). confirm_cod_order()
  // is a SECURITY DEFINER function that validates order ownership itself
  // before committing stock/updating status — see 0002_functions.sql —
  // because committing stock and updating `orders`/`order_status_history`
  // are staff-only operations under RLS otherwise.
  if (data.paymentMethod === "cod") {
    const { error: confirmError } = await supabase.rpc("confirm_cod_order", { p_order_id: order.id });
    if (confirmError) {
      return { ok: false, error: "Order created but could not be confirmed. Please contact support." };
    }
  }

  return { ok: true, data: { orderId: order.id, orderNumber: order.order_number } };
}
