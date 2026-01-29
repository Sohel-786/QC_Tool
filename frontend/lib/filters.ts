import type { TransactionFiltersState } from "@/components/filters/transaction-filters";

/**
 * Build API query params from transaction filters for server-side filtering.
 * Only includes keys when a filter is active.
 */
export function buildFilterParams(
  f: TransactionFiltersState
): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.status !== "all") params.status = f.status;
  if (f.companyIds.length) params.companyIds = f.companyIds.join(",");
  if (f.contractorIds.length) params.contractorIds = f.contractorIds.join(",");
  if (f.machineIds.length) params.machineIds = f.machineIds.join(",");
  if (f.itemIds.length) params.itemIds = f.itemIds.join(",");
  if (f.operatorName.trim()) params.operatorName = f.operatorName.trim();
  if (f.search.trim()) params.search = f.search.trim();
  return params;
}

export function hasActiveFilters(f: TransactionFiltersState): boolean {
  return (
    f.status !== "all" ||
    f.companyIds.length > 0 ||
    f.contractorIds.length > 0 ||
    f.machineIds.length > 0 ||
    f.itemIds.length > 0 ||
    !!f.operatorName.trim() ||
    !!f.search.trim()
  );
}
