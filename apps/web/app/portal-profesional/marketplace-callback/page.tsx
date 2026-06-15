import { Suspense } from "react";
import { MarketplaceCallbackClient } from "./marketplace-callback-client";

export default function MarketplaceCallbackPage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceCallbackClient />
    </Suspense>
  );
}
