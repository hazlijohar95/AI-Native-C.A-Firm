import {
  Calculator,
  Receipt,
  Lightbulb,
  Building2,
  Users,
  FileText,
} from "@/lib/icons";

/**
 * Icon mapping for service types
 * Maps icon names (from serviceTypes.icon) to Lucide components
 */
export const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  Receipt,
  Lightbulb,
  Building2,
  Users,
  FileText,
};

/**
 * Get service icon component by name
 */
export function getServiceIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return serviceIcons[iconName] || FileText;
}

/**
 * Color configuration for service types
 * All color variants that might be needed across components
 */
export interface ServiceColorConfig {
  /** Light background (e.g., bg-blue-50) */
  bg: string;
  /** Lighter background with opacity */
  bgLight: string;
  /** Background for icons */
  iconBg: string;
  /** Text color (e.g., text-blue-700) */
  text: string;
  /** Border color */
  border: string;
  /** Light border color */
  borderLight: string;
  /** Active/selected background */
  activeBg: string;
  /** Gradient for cards */
  gradient: string;
}

/**
 * Color mapping for service types (Tailwind colors)
 * Keyed by color name (from serviceTypes.color)
 */
export const serviceColors: Record<string, ServiceColorConfig> = {
  blue: {
    bg: "bg-blue-50",
    bgLight: "bg-blue-50/50",
    iconBg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    borderLight: "border-blue-100",
    activeBg: "bg-blue-600",
    gradient: "from-blue-50 to-blue-100/50",
  },
  emerald: {
    bg: "bg-emerald-50",
    bgLight: "bg-emerald-50/50",
    iconBg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    borderLight: "border-emerald-100",
    activeBg: "bg-emerald-600",
    gradient: "from-emerald-50 to-emerald-100/50",
  },
  violet: {
    bg: "bg-violet-50",
    bgLight: "bg-violet-50/50",
    iconBg: "bg-violet-100",
    text: "text-violet-700",
    border: "border-violet-200",
    borderLight: "border-violet-100",
    activeBg: "bg-violet-600",
    gradient: "from-violet-50 to-violet-100/50",
  },
  amber: {
    bg: "bg-amber-50",
    bgLight: "bg-amber-50/50",
    iconBg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    borderLight: "border-amber-100",
    activeBg: "bg-amber-600",
    gradient: "from-amber-50 to-amber-100/50",
  },
  cyan: {
    bg: "bg-cyan-50",
    bgLight: "bg-cyan-50/50",
    iconBg: "bg-cyan-100",
    text: "text-cyan-700",
    border: "border-cyan-200",
    borderLight: "border-cyan-100",
    activeBg: "bg-cyan-600",
    gradient: "from-cyan-50 to-cyan-100/50",
  },
  gray: {
    bg: "bg-gray-50",
    bgLight: "bg-gray-50/50",
    iconBg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    borderLight: "border-gray-100",
    activeBg: "bg-gray-600",
    gradient: "from-gray-50 to-gray-100/50",
  },
};

/**
 * Get service color config by color name
 */
export function getServiceColor(colorName: string): ServiceColorConfig {
  return serviceColors[colorName] || serviceColors.gray;
}
