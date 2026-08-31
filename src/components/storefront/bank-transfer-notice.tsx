/** Shown on order confirmation/tracking pages for a still-unpaid Direct
 *  Bank Transfer order — same account details and instructions offered at
 *  checkout, repeated here with the real order number as the payment
 *  reference the customer actually needs at this point. */
export function BankTransferNotice({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="mt-8 rounded-lg border bg-secondary/40 p-5 text-sm">
      <p className="font-heading text-base">Complete Your Bank Transfer</p>
      <p className="mt-2 text-muted-foreground">
        Please transfer the order total to the account below, using <strong className="text-foreground">{orderNumber}</strong>{" "}
        as the payment reference. Your order won&apos;t be shipped until the funds clear in our account.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Account name</dt>
        <dd>Sooriya Publishers (Pvt) Ltd.</dd>
        <dt className="text-muted-foreground">Account number</dt>
        <dd>012210007960</dd>
        <dt className="text-muted-foreground">Bank</dt>
        <dd>Sampath Bank — Rajagiriya</dd>
      </dl>
      <p className="mt-3 text-muted-foreground">
        After making your deposit, please send the payment slip via WhatsApp or email with your name and order
        number.
        <br />
        WhatsApp: 077 408 9433
      </p>
    </div>
  );
}
