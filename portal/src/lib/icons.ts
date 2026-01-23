/**
 * Centralized icon exports from lucide-react
 *
 * This file re-exports all icons used in the application from a single location.
 * Import icons from '@/lib/icons' instead of 'lucide-react' directly.
 *
 * Benefits:
 * - Avoids barrel file import performance issues (200-800ms per file)
 * - Single source of truth for all icons
 * - Easier to track icon usage across the codebase
 * - Better tree-shaking in production builds
 */

export {
  // Navigation & Layout
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Home,

  // User & Auth
  User,
  Users,
  UserX,
  UserCheck,
  LogOut,
  Shield,

  // Documents & Files
  FileText,
  File,
  FileSpreadsheet,
  FileImage,
  FileSignature,
  FileQuestion,
  FolderOpen,
  Upload,
  Download,
  Trash,
  Trash2,

  // Tasks & Status
  CheckSquare,
  Check,
  CheckCheck,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  AlertTriangle,
  XCircle,

  // Communication
  Bell,
  Mail,
  Phone,
  MessageSquare,
  Megaphone,
  Send,

  // Business & Finance
  Building2,
  Receipt,
  CreditCard,
  TrendingUp,

  // Actions & Tools
  Search,
  Filter,
  Edit,
  Plus,
  Pen,
  PenTool,
  Eraser,
  Type,
  Settings,
  MoreHorizontal,
  RefreshCw,
  Loader2,

  // Content & Info
  Calendar,
  Newspaper,
  Pin,
  Globe,
  MapPin,
  Hash,
  History,
  HelpCircle,
  BookOpen,
  Sparkles,
  Eye,
  ScrollText,
  Maximize2,
  Minimize2,
} from "lucide-react";
