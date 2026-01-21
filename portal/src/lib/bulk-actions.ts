import { useState, useCallback, useMemo } from "react";

/**
 * Custom hook for managing bulk selection in lists
 */
export function useBulkSelection<T extends { _id: string }>(items: T[] | undefined) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!items) return;
    setSelectedIds(new Set(items.map((item) => item._id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    if (!items) return;
    if (selectedIds.size === items.length) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [items, selectedIds.size, clearSelection, selectAll]);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const selectedItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => selectedIds.has(item._id));
  }, [items, selectedIds]);

  const allSelected = useMemo(() => {
    if (!items || items.length === 0) return false;
    return selectedIds.size === items.length;
  }, [items, selectedIds.size]);

  const someSelected = useMemo(() => {
    return selectedIds.size > 0 && !allSelected;
  }, [selectedIds.size, allSelected]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    selectedItems,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    toggleAll,
    allSelected,
    someSelected,
  };
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: { key: keyof T; header: string; formatter?: (value: unknown) => string }[]
) {
  // Create header row
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  // Create data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        const formatted = col.formatter ? col.formatter(value) : String(value ?? "");
        // Escape quotes and wrap in quotes
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  // Combine and create blob
  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for export
 */
export function formatDateForExport(timestamp: number | undefined): string {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString().split("T")[0];
}

/**
 * Format datetime for export
 */
export function formatDateTimeForExport(timestamp: number | undefined): string {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Format currency for export (from cents to ringgit)
 */
export function formatCurrencyForExport(cents: number | undefined): string {
  if (cents === undefined || cents === null) return "";
  return (cents / 100).toFixed(2);
}
