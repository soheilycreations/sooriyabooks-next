import { z } from "zod";

export const checkoutCartItemSchema = z.object({
  bookId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutCartItemSchema).min(1, "Your cart is empty"),
  cityId: z.string().uuid("Select a delivery city"),
  addressId: z.string().uuid().optional(),
  newAddress: z
    .object({
      label: z.string().optional(),
      recipientName: z.string().min(1),
      phone: z.string().min(9),
      line1: z.string().min(1),
      line2: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  paymentMethod: z.enum(["cod", "bank_ipg", "bank_transfer"]),
  couponCode: z.string().optional(),
  customerNote: z.string().optional(),
}).refine((data) => data.addressId || data.newAddress, {
  message: "An address is required",
  path: ["addressId"],
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
