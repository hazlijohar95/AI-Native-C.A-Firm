import { useState, useMemo, useCallback } from "react";

/**
 * Filter configuration for a single filter field
 */
export interface FilterConfig<T> {
  /** The key in the data item to filter on */
  key: keyof T | ((item: T) => string | undefined);
  /** Default value for this filter (use "all" for "show all" filters) */
  defaultValue: string;
}

/**
 * Options for useTableFilters hook
 */
export interface UseTableFiltersOptions<T> {
  /** Array of data items to filter */
  data: T[] | undefined;
  /** Keys to search across when using searchQuery */
  searchKeys: Array<keyof T | ((item: T) => string | undefined)>;
  /** Additional filter configurations */
  filters?: Record<string, FilterConfig<T>>;
}

/**
 * Return type for useTableFilters hook
 */
export interface UseTableFiltersReturn<T> {
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Current filter values */
  filterValues: Record<string, string>;
  /** Set a specific filter value */
  setFilter: (key: string, value: string) => void;
  /** Filtered data */
  filteredData: T[];
  /** Whether any filters are active */
  hasActiveFilters: boolean;
  /** Clear all filters and search */
  clearFilters: () => void;
}

/**
 * Hook for managing table filtering with search and multiple filter fields.
 * Reduces boilerplate in admin pages that need search + filter functionality.
 *
 * @example
 * ```tsx
 * const {
 *   searchQuery,
 *   setSearchQuery,
 *   filterValues,
 *   setFilter,
 *   filteredData,
 *   hasActiveFilters,
 *   clearFilters,
 * } = useTableFilters({
 *   data: users,
 *   searchKeys: ["name", "email"],
 *   filters: {
 *     role: { key: "role", defaultValue: "all" },
 *     status: { key: (u) => u.isActive ? "active" : "inactive", defaultValue: "all" },
 *   },
 * });
 * ```
 */
export function useTableFilters<T>({
  data,
  searchKeys,
  filters = {},
}: UseTableFiltersOptions<T>): UseTableFiltersReturn<T> {
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize filter values from defaults
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.entries(filters).forEach(([key, config]) => {
      initial[key] = config.defaultValue;
    });
    return initial;
  });

  const setFilter = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    const resetValues: Record<string, string> = {};
    Object.entries(filters).forEach(([key, config]) => {
      resetValues[key] = config.defaultValue;
    });
    setFilterValues(resetValues);
  }, [filters]);

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim()) return true;
    return Object.entries(filterValues).some(([key, value]) => {
      const config = filters[key];
      return config && value !== config.defaultValue;
    });
  }, [searchQuery, filterValues, filters]);

  const filteredData = useMemo(() => {
    if (!data) return [];

    let result = [...data];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchKeys.some((key) => {
          const value = typeof key === "function" ? key(item) : item[key];
          return String(value ?? "").toLowerCase().includes(query);
        })
      );
    }

    // Apply additional filters
    Object.entries(filters).forEach(([filterKey, config]) => {
      const filterValue = filterValues[filterKey];
      if (filterValue && filterValue !== config.defaultValue) {
        result = result.filter((item) => {
          const itemValue = typeof config.key === "function"
            ? config.key(item)
            : String(item[config.key] ?? "");
          return itemValue === filterValue;
        });
      }
    });

    return result;
  }, [data, searchQuery, searchKeys, filters, filterValues]);

  return {
    searchQuery,
    setSearchQuery,
    filterValues,
    setFilter,
    filteredData,
    hasActiveFilters,
    clearFilters,
  };
}
