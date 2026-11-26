import type { BarcodeNotFoundDetails, BarcodeProductDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { BackRow } from "@/components/log/barcode/back-row";
import { NotFound, type NotFoundReason } from "@/components/log/barcode/not-found";
import { ProductScreen } from "@/components/log/barcode/product-screen";
import { ProductSkeleton } from "@/components/skeletons";
import { Screen } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { choiceParams, dayFromParam, mealFromParam } from "@/lib/meal-param";
import { openPremium, premiumFeatureOf } from "@/lib/premium";

/** Screens 7d (found) and 7e (not found) for one barcode. Barcode lookups never use a photo scan. */
export default function ProductRoute() {
  const params = useLocalSearchParams<{ code: string; meal?: string; date?: string }>();
  const product = useQuery({
    queryKey: ["barcode", params.code],
    queryFn: () => api<BarcodeProductDto>(`/api/foods/barcode/${params.code}`),
    retry: false,
  });

  // Barcode scanning is Premium for free users: go back and show the locked sheet instead.
  const premiumFeature = premiumFeatureOf(product.error);
  useEffect(() => {
    if (!premiumFeature) return;
    router.back();
    openPremium(premiumFeature, { meal: params.meal, date: params.date });
  }, [premiumFeature, params.meal, params.date]);

  if (product.isPending || premiumFeature) {
    return (
      <Screen>
        <BackRow />
        <ProductSkeleton />
      </Screen>
    );
  }
  if (product.isError || !product.data.food) {
    const err = product.error;
    const status = err instanceof ApiError ? err.status : 0;
    const reason: NotFoundReason = status === 400 ? "invalid" : status === 404 || !err ? "unknown" : "unreachable";
    // A product database may know the product without its nutrition: use that to prefill.
    const known =
      err instanceof ApiError && status === 404 ? (err.details as BarcodeNotFoundDetails | undefined) : undefined;
    return (
      <NotFound
        known={known?.name ? { name: known.name, brand: known.brand ?? null, imageUrl: known.imageUrl ?? null } : null}
        code={params.code}
        choice={choiceParams(mealFromParam(params.meal), dayFromParam(params.date))}
        reason={reason}
      />
    );
  }
  return <ProductScreen food={product.data.food} code={product.data.code} />;
}
