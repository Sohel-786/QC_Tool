export type TransactionFilterStatus = "all" | "active" | "inactive";

export interface TransactionListFilters {
  status: TransactionFilterStatus;
  companyIds: number[];
  contractorIds: number[];
  machineIds: number[];
  itemIds: number[];
  operatorName: string;
  search: string;
}

export function parseTransactionFiltersFromQuery(q: {
  status?: string;
  companyIds?: string;
  contractorIds?: string;
  machineIds?: string;
  itemIds?: string;
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

  let status: TransactionFilterStatus = "all";
  if (q.status === "active" || q.status === "inactive") status = q.status;

  const search = typeof q.search === "string" ? q.search.trim() : "";

  return {
    status,
    companyIds: parseIds(q.companyIds),
    contractorIds: parseIds(q.contractorIds),
    machineIds: parseIds(q.machineIds),
    itemIds: parseIds(q.itemIds),
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
    f.itemIds.length > 0 ||
    f.operatorName.length > 0 ||
    f.search.length > 0
  );
}
