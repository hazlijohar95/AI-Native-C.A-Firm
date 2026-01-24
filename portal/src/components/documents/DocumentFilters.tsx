/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Filter,
  X,
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
} from "@/lib/icons";

// Document categories
const categories = [
  { value: "all", label: "All Categories" },
  { value: "tax_return", label: "Tax Returns" },
  { value: "financial_statement", label: "Financial Statements" },
  { value: "invoice", label: "Invoices" },
  { value: "agreement", label: "Agreements" },
  { value: "receipt", label: "Receipts" },
  { value: "other", label: "Other" },
];

// Generate fiscal years (current year and 5 previous years)
function getFiscalYears() {
  const currentYear = new Date().getFullYear();
  return [
    { value: "all", label: "All Years" },
    ...Array.from({ length: 6 }, (_, i) => ({
      value: String(currentYear - i),
      label: String(currentYear - i),
    })),
  ];
}

// Sort options
const sortOptions = [
  { value: "uploadedAt-desc", label: "Newest first" },
  { value: "uploadedAt-asc", label: "Oldest first" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "size-desc", label: "Largest first" },
  { value: "size-asc", label: "Smallest first" },
];

export interface DocumentFiltersState {
  searchQuery: string;
  category: string;
  fiscalYear: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface DocumentFiltersProps {
  filters: DocumentFiltersState;
  onFiltersChange: (filters: DocumentFiltersState) => void;
  className?: string;
}

export function DocumentFilters({
  filters,
  onFiltersChange,
  className,
}: DocumentFiltersProps) {
  const fiscalYears = getFiscalYears();

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ ...filters, category: value });
  };

  const handleFiscalYearChange = (value: string) => {
    onFiltersChange({ ...filters, fiscalYear: value });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-") as [string, "asc" | "desc"];
    onFiltersChange({ ...filters, sortBy, sortOrder });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: "",
      category: "all",
      fiscalYear: "all",
      sortBy: "uploadedAt",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.category !== "all" ||
    filters.fiscalYear !== "all";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main filter row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9d9da6]" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-10 bg-white border-[#EBEBEB] rounded-lg text-sm"
          />
          {filters.searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9d9da6] hover:text-[#6b6b76]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#9d9da6]" />
          <Select value={filters.category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[160px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fiscal Year Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#9d9da6]" />
          <Select value={filters.fiscalYear} onValueChange={handleFiscalYearChange}>
            <SelectTrigger className="w-[130px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {fiscalYears.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-[#9d9da6]" />
          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[140px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-[#6b6b76] hover:text-[#0f0f12]"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

// Compact filter bar for mobile
interface CompactFiltersProps {
  filters: DocumentFiltersState;
  onFiltersChange: (filters: DocumentFiltersState) => void;
  className?: string;
}

export function CompactFilters({
  filters,
  onFiltersChange,
  className,
}: CompactFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fiscalYears = getFiscalYears();

  const hasActiveFilters =
    filters.category !== "all" || filters.fiscalYear !== "all";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search and filter button row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9d9da6]" />
          <Input
            type="text"
            placeholder="Search..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="pl-10 h-10 bg-white border-[#EBEBEB] rounded-lg text-sm"
          />
        </div>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-10 w-10 border-[#EBEBEB]",
                hasActiveFilters && "bg-[#0f0f12] text-white border-[#0f0f12]"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-4">
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Filters</h3>

              <div className="space-y-2">
                <label className="text-xs text-[#6b6b76]">Category</label>
                <Select
                  value={filters.category}
                  onValueChange={(v) => onFiltersChange({ ...filters, category: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#6b6b76]">Fiscal Year</label>
                <Select
                  value={filters.fiscalYear}
                  onValueChange={(v) => onFiltersChange({ ...filters, fiscalYear: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYears.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#6b6b76]">Sort By</label>
                <Select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onValueChange={(v) => {
                    const [sortBy, sortOrder] = v.split("-") as [string, "asc" | "desc"];
                    onFiltersChange({ ...filters, sortBy, sortOrder });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      category: "all",
                      fiscalYear: "all",
                    });
                    setIsOpen(false);
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Default filters
export const defaultFilters: DocumentFiltersState = {
  searchQuery: "",
  category: "all",
  fiscalYear: "all",
  sortBy: "uploadedAt",
  sortOrder: "desc",
};
