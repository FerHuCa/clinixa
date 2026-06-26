import { Suspense } from "react";
import { SubscriptionPageClient } from "./subscription-page-client";

export default function SubscriptionPage() {
  // useSearchParams() inside the client component forces CSR bailout during
  // prerender; a Suspense boundary is required or `next build` fails.
  return (
    <Suspense>
      <SubscriptionPageClient />
    </Suspense>
  );
}
