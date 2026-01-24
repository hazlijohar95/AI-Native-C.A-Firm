/**
 * Document category type
 */
export type DocumentCategory =
  | "tax_return"
  | "financial_statement"
  | "invoice"
  | "agreement"
  | "receipt"
  | "other";

/**
 * Category options for selects/dropdowns
 */
export const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "tax_return", label: "Tax Returns" },
  { value: "financial_statement", label: "Financial Statements" },
  { value: "invoice", label: "Invoices" },
  { value: "agreement", label: "Agreements" },
  { value: "receipt", label: "Receipts" },
  { value: "other", label: "Other" },
] as const;

/**
 * Category display labels
 */
export const categoryLabels: Record<string, string> = {
  tax_return: "Tax Return",
  financial_statement: "Financial Statement",
  invoice: "Invoice",
  agreement: "Agreement",
  receipt: "Receipt",
  other: "Other",
};

/**
 * Category color configuration
 */
export interface CategoryColorConfig {
  bg: string;
  text: string;
}

/**
 * Category colors for badges and tags
 */
export const categoryColors: Record<string, CategoryColorConfig> = {
  tax_return: { bg: "bg-blue-50", text: "text-blue-700" },
  financial_statement: { bg: "bg-emerald-50", text: "text-emerald-700" },
  invoice: { bg: "bg-amber-50", text: "text-amber-700" },
  agreement: { bg: "bg-violet-50", text: "text-violet-700" },
  receipt: { bg: "bg-gray-100", text: "text-gray-700" },
  other: { bg: "bg-gray-100", text: "text-gray-700" },
};

/**
 * Get category color config by category name
 */
export function getCategoryColor(category: string): CategoryColorConfig {
  return categoryColors[category] || categoryColors.other;
}

/**
 * Get category label by category name
 */
export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}
