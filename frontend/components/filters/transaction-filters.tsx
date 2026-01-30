"use client";

import { Filter, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import type { MultiSelectSearchOption } from "@/components/ui/multi-select-search";
import { cn } from "@/lib/utils";

export type TransactionFilterStatus = "all" | "active" | "inactive";

export interface TransactionFiltersState {
  status: TransactionFilterStatus;
  companyIds: number[];
  contractorIds: number[];
  machineIds: number[];
  itemIds: number[];
  operatorName: string;
  search: string;
}

const defaultFilters: TransactionFiltersState = {
  status: "all",
  companyIds: [],
  contractorIds: [],
  machineIds: [],
  itemIds: [],
  operatorName: "",
  search: "",
};

export { defaultFilters };

export interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onFiltersChange: (f: TransactionFiltersState) => void;
  companyOptions: MultiSelectSearchOption[];
  contractorOptions: MultiSelectSearchOption[];
  machineOptions: MultiSelectSearchOption[];
  itemOptions: MultiSelectSearchOption[];
  onClear: () => void;
  /** Placeholder for the search bar; when set, the search bar is shown to the right of the filter icon */
  searchPlaceholder?: string;
  className?: string;
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  companyOptions,
  contractorOptions,
  machineOptions,
  itemOptions,
  onClear,
  searchPlaceholder,
  className,
}: TransactionFiltersProps) {
  const hasActiveFilters =
    filters.status !== "all" ||
    filters.companyIds.length > 0 ||
    filters.contractorIds.length > 0 ||
    filters.machineIds.length > 0 ||
    filters.itemIds.length > 0 ||
    !!filters.operatorName.trim() ||
    !!filters.search.trim();

  const update = (patch: Partial<TransactionFiltersState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <Card className={cn("overflow-visible", className)}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 overflow-visible">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-secondary-200 bg-secondary-50 text-secondary-600"
              aria-hidden
            >
              <Filter className="h-4 w-4" />
            </div>
            {searchPlaceholder ? (
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
                <Input
                  type="search"
                  value={filters.search}
                  onChange={(e) => update({ search: e.target.value })}
                  placeholder={searchPlaceholder}
                  className="pl-9 h-10 rounded-lg border-secondary-300 bg-white focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label="Search entries"
                />
              </div>
            ) : (
              <div className="flex-1 min-w-0" />
            )}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="shrink-0 h-9 px-3 text-secondary-600 hover:bg-secondary-100 hover:text-text"
              >
                <X className="h-4 w-4 mr-1.5" />
                Clear filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 overflow-visible items-start">
            <div className="min-w-0 flex flex-col">
              <Label
                htmlFor="filter-status"
                className="block text-sm mb-1.5 font-medium text-secondary-700"
              >
                Status
              </Label>
              <select
                id="filter-status"
                value={filters.status}
                onChange={(e) =>
                  update({ status: e.target.value as TransactionFilterStatus })
                }
                className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="min-w-0 flex flex-col">
              <MultiSelectSearch
                label="Company"
                options={companyOptions}
                value={filters.companyIds}
                onChange={(v) => update({ companyIds: v as number[] })}
                placeholder="All companies"
                searchPlaceholder="Search company…"
              />
            </div>

            <div className="min-w-0 flex flex-col">
              <MultiSelectSearch
                label="Contractor"
                options={contractorOptions}
                value={filters.contractorIds}
                onChange={(v) => update({ contractorIds: v as number[] })}
                placeholder="All contractors"
                searchPlaceholder="Search contractor…"
              />
            </div>

            <div className="min-w-0 flex flex-col">
              <MultiSelectSearch
                label="Machine"
                options={machineOptions}
                value={filters.machineIds}
                onChange={(v) => update({ machineIds: v as number[] })}
                placeholder="All machines"
                searchPlaceholder="Search machine…"
              />
            </div>

            <div className="min-w-0 flex flex-col">
              <MultiSelectSearch
                label="Item"
                options={itemOptions}
                value={filters.itemIds}
                onChange={(v) => update({ itemIds: v as number[] })}
                placeholder="All items"
                searchPlaceholder="Search item…"
              />
            </div>

            <div className="min-w-0 flex flex-col">
              <Label
                htmlFor="filter-operator"
                className="block text-sm mb-1.5 font-medium text-secondary-700"
              >
                Operator
              </Label>
              <Input
                id="filter-operator"
                value={filters.operatorName}
                onChange={(e) => update({ operatorName: e.target.value })}
                placeholder="Search operator…"
                className="h-10 rounded-lg border-secondary-300"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
