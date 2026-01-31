export type TransactionFilterStatus = "all" | "active" | "inactive";

const VALID_CONDITIONS = ["OK", "Damaged", "Calibration Required", "Missing"] as const;

export interface TransactionListFilters {
  status: TransactionFilterStatus;
  companyIds: number[];
  contractorIds: number[];
  machineIds: number[];
  locationIds: number[];
  itemIds: number[];
  conditions: string[];
  operatorName: string;
  search: string;
}

export function parseTransactionFiltersFromQuery(q: {
  status?: string;
  companyIds?: string;
  contractorIds?: string;
  machineIds?: string;
  locationIds?: string;
  itemIds?: string;
  conditions?: string;
  operatorName?: string;
  search?: string;
}): TransactionListFilters {
  const parseIds = (s: string | undefined): number[] => {
    if (!s || typeof s !== "string") return [];
    return s
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !Number.isNaN(n));
  };

  const parseConditions = (s: string | undefined): string[] => {
    if (!s || typeof s !== "string") return [];
    return s
      .split(",")
      .map((c) => c.trim())
      .filter((c) => VALID_CONDITIONS.includes(c as (typeof VALID_CONDITIONS)[number]));
  };

  let status: TransactionFilterStatus = "all";
  if (q.status === "active" || q.status === "inactive") status = q.status;

  const search = typeof q.search === "string" ? q.search.trim() : "";

  return {
    status,
    companyIds: parseIds(q.companyIds),
    contractorIds: parseIds(q.contractorIds),
    machineIds: parseIds(q.machineIds),
    locationIds: parseIds(q.locationIds),
    itemIds: parseIds(q.itemIds),
    conditions: parseConditions(q.conditions),
    operatorName: typeof q.operatorName === "string" ? q.operatorName.trim() : "",
    search,
  };
}

export function hasActiveFilters(f: TransactionListFilters): boolean {
  return (
    f.status !== "all" ||
    f.companyIds.length > 0 ||
    f.contractorIds.length > 0 ||
    f.machineIds.length > 0 ||
    f.locationIds.length > 0 ||
    f.itemIds.length > 0 ||
    f.conditions.length > 0 ||
    f.operatorName.length > 0 ||
    f.search.length > 0
  );
}
