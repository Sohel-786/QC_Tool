import type { TransactionFiltersState } from "@/components/filters/transaction-filters";

/**
 * Build API query params from transaction filters for server-side filtering.
 * Only includes keys when a filter is active.
 */
export function buildFilterParams(
  f: TransactionFiltersState
): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.companyIds.length) params.companyIds = f.companyIds.join(",");
  if (f.contractorIds.length) params.contractorIds = f.contractorIds.join(",");
  if (f.machineIds.length) params.machineIds = f.machineIds.join(",");
  if (f.locationIds.length) params.locationIds = f.locationIds.join(",");
  if (f.itemCategoryIds.length) params.itemCategoryIds = f.itemCategoryIds.join(",");
  if (f.itemIds.length) params.itemIds = f.itemIds.join(",");
  if (f.conditions?.length) params.conditions = f.conditions.join(",");
  const opName = (f.operatorName || "").trim();
  if (opName) params.operatorName = opName;

  const recvBy = (f.receivedBy || "").trim();
  if (recvBy) params.receivedBy = recvBy;

  const search = (f.search || "").trim();
  if (search) params.search = search;
  return params;
}

export function hasActiveFilters(f: TransactionFiltersState): boolean {
  return (
    f.companyIds.length > 0 ||
    f.locationIds.length > 0 ||
    f.contractorIds.length > 0 ||
    f.machineIds.length > 0 ||
    f.itemCategoryIds.length > 0 ||
    f.itemIds.length > 0 ||
    (f.conditions?.length ?? 0) > 0 ||
    !!(f.operatorName || "").trim() ||
    !!(f.receivedBy || "").trim() ||
    !!(f.search || "").trim()
  );
}
