import { Suspense } from "react";
import { PaymentResultPageClient } from "./payment-result-page-client";

export default function PaymentResultPage() {
  return (
    <Suspense>
      <PaymentResultPageClient />
    </Suspense>
  );
}
