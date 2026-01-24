import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Receipt,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  Eye,
  Download,
  Building2,
  Sparkles,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import type { Id } from "../../convex/_generated/dataModel";

// Invoice status type
type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";
type StatusFilter = InvoiceStatus | "all";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Invoices" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const statusConfig: Record<string, {
  icon: React.ReactNode;
  bg: string;
  text: string;
  label: string;
}> = {
  draft: {
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "Draft",
  },
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: "bg-amber-50",
    text: "text-amber-700",
    label: "Pending",
  },
  overdue: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    bg: "bg-red-50",
    text: "text-red-700",
    label: "Overdue",
  },
  paid: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    label: "Paid",
  },
  cancelled: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "Cancelled",
  },
};

function formatCurrency(amount: number, currency: string = "MYR"): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Line item type for display
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export function Invoices() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Id<"invoices"> | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<Id<"invoices"> | null>(null);

  const invoices = useQuery(api.invoices.list, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const invoiceCounts = useQuery(api.invoices.countPending, {});

  const selectedInvoiceData = useQuery(
    api.invoices.get,
    detailDialogOpen && selectedInvoice ? { id: selectedInvoice } : "skip"
  );

  const createCheckoutSession = useAction(api.invoices.createCheckoutSession);

  const handleViewDetails = (invoiceId: Id<"invoices">) => {
    setSelectedInvoice(invoiceId);
    setDetailDialogOpen(true);
  };

  const handlePayNow = async (invoiceId: Id<"invoices">) => {
    try {
      setPayingInvoiceId(invoiceId);
      const result = await createCheckoutSession({ invoiceId });

      if (result.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl;
      } else {
        toast.info(result.message || "Online payment coming soon", {
          description: "Please contact us for bank transfer details.",
        });
      }
    } catch (error) {
      toast.error("Payment failed", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setPayingInvoiceId(null);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="motion-safe-slide-up">
        <h1 className="font-serif text-3xl sm:text-4xl text-[#2B3A55] tracking-tight">
          Your <span className="italic text-[#B8986B]">Invoices</span>
        </h1>
        <p className="mt-2 text-[#6b6b76]">
          View and pay your invoices
        </p>
      </div>

      {/* Summary Cards */}
      {invoiceCounts === undefined ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/5 p-5">
              <div className="h-4 w-20 animate-pulse rounded bg-[#f5f5f5]" />
              <div className="h-8 w-16 animate-pulse rounded bg-[#f5f5f5] mt-3" />
              <div className="h-3 w-32 animate-pulse rounded bg-[#f5f5f5] mt-3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 motion-safe-slide-up motion-safe-slide-up-delay-2">
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.02)]">
            <p className="text-xs font-medium text-[#9d9da6] uppercase tracking-wide">Pending</p>
            <p className="font-serif text-3xl text-[#0f0f12] mt-2">{invoiceCounts.pending}</p>
            <p className="text-xs text-[#9d9da6] mt-2">Invoices awaiting payment</p>
          </div>
          <div className={cn(
            "bg-white rounded-2xl border border-black/5 p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.02)]",
            invoiceCounts.overdue > 0 && "border-red-200 bg-red-50/30"
          )}>
            <p className={cn("text-xs font-medium uppercase tracking-wide", invoiceCounts.overdue > 0 ? "text-red-600" : "text-[#9d9da6]")}>
              Overdue
            </p>
            <p className={cn("font-serif text-3xl mt-2", invoiceCounts.overdue > 0 ? "text-red-600" : "text-[#0f0f12]")}>
              {invoiceCounts.overdue}
            </p>
            <p className="text-xs text-[#9d9da6] mt-2">Past due date</p>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.02)]">
            <p className="text-xs font-medium text-[#9d9da6] uppercase tracking-wide">Total Outstanding</p>
            <p className="font-serif text-3xl text-[#0f0f12] mt-2">{formatCurrency(invoiceCounts.total)}</p>
            <p className="text-xs text-[#9d9da6] mt-2">Amount to be paid</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 motion-safe-slide-up motion-safe-slide-up-delay-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-[#9d9da6] shrink-0" aria-hidden="true" />
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger id="status-filter" className="w-full min-w-[120px] sm:w-[150px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoice List */}
      {invoices === undefined ? (
        <div className="flex h-64 items-center justify-center" aria-busy="true" aria-live="polite">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
            <p className="text-sm text-[#9d9da6]">Loading invoices...</p>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa] motion-safe-slide-up motion-safe-slide-up-delay-4">
          <div className="w-14 h-14 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-4">
            <Receipt className="h-6 w-6 text-[#6b6b76]" />
          </div>
          <p className="text-base font-medium text-[#0f0f12]">No invoices</p>
          <p className="text-sm text-[#9d9da6] mt-1">
            {statusFilter !== "all"
              ? "No invoices match your filter"
              : "You have no invoices yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice, index) => {
            const displayStatus = invoice.displayStatus || invoice.status;
            const displayConfig = statusConfig[displayStatus] || statusConfig.pending;

            return (
              <div
                key={invoice._id}
                className={cn(
                  "group bg-white rounded-2xl border border-black/5 p-5 transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)] motion-safe-slide-up motion-safe-slide-up-delay-4",
                  displayStatus === "overdue" && "border-red-200"
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Invoice Info */}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0",
                      displayStatus === "paid" ? "bg-emerald-50" :
                      displayStatus === "overdue" ? "bg-red-50" : "bg-[#f8f8f8]"
                    )}>
                      <Receipt className={cn(
                        "h-5 w-5",
                        displayStatus === "paid" ? "text-emerald-600" :
                        displayStatus === "overdue" ? "text-red-600" : "text-[#6b6b76]"
                      )} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#0f0f12]">{invoice.invoiceNumber}</h3>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", displayConfig.bg, displayConfig.text)}>
                          {displayConfig.icon}
                          {displayConfig.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#6b6b76] line-clamp-1">
                        {invoice.description}
                      </p>
                      {invoice.organizationName && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-[#9d9da6]">
                          <Building2 className="h-3 w-3" aria-hidden="true" />
                          {invoice.organizationName}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#9d9da6] font-['DM_Mono']">
                        <span>Issued {formatDate(invoice.issuedDate)}</span>
                        <span className={displayStatus === "overdue" ? "text-red-600 font-medium" : ""}>
                          Due {formatDate(invoice.dueDate)}
                        </span>
                        {invoice.paidAt && (
                          <span className="text-emerald-600">
                            Paid {formatDate(invoice.paidAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
                    <p className="font-serif text-2xl text-[#0f0f12]">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(invoice._id)}
                        className="h-9 px-4 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors flex items-center gap-2"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        View
                      </button>
                      {(displayStatus === "pending" || displayStatus === "overdue") && (
                        <button
                          onClick={() => handlePayNow(invoice._id)}
                          disabled={payingInvoiceId === invoice._id}
                          className="h-9 px-4 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] disabled:bg-[#e5e5e7] disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          {payingInvoiceId === invoice._id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : (
                            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {payingInvoiceId === invoice._id ? "Processing..." : "Pay Now"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl border border-[#EBEBEB] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#0f0f12]">Invoice Details</DialogTitle>
            <DialogDescription className="text-[#6b6b76]">
              {selectedInvoiceData?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoiceData ? (
            <div className="space-y-6">
              {/* Status & Dates */}
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium uppercase tracking-wide",
                  statusConfig[selectedInvoiceData.displayStatus || selectedInvoiceData.status]?.bg,
                  statusConfig[selectedInvoiceData.displayStatus || selectedInvoiceData.status]?.text
                )}>
                  {statusConfig[selectedInvoiceData.displayStatus || selectedInvoiceData.status]?.icon}
                  {statusConfig[selectedInvoiceData.displayStatus || selectedInvoiceData.status]?.label}
                </span>
                <span className="text-sm text-[#6b6b76]">
                  Issued: {formatDate(selectedInvoiceData.issuedDate)}
                </span>
                <span className="text-sm text-[#6b6b76]">
                  Due: {formatDate(selectedInvoiceData.dueDate)}
                </span>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-[#0f0f12] mb-1">Description</h4>
                <p className="text-sm text-[#6b6b76]">
                  {selectedInvoiceData.description}
                </p>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="text-sm font-medium text-[#0f0f12] mb-3">Line Items</h4>

                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-3">
                  {selectedInvoiceData.lineItems.map((item: LineItem, index: number) => (
                    <div key={index} className="bg-[#f8f8f8] rounded-lg p-4 space-y-2">
                      <p className="font-medium text-[#0f0f12]">{item.description}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6b6b76]">Qty: {item.quantity}</span>
                        <span className="font-['DM_Mono'] text-[#0f0f12]">{formatCurrency(item.amount, selectedInvoiceData.currency)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="bg-[#0f0f12] rounded-lg p-4 flex justify-between items-center">
                    <span className="text-white font-medium">Total</span>
                    <span className="font-serif text-lg text-white">{formatCurrency(selectedInvoiceData.amount, selectedInvoiceData.currency)}</span>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block rounded-xl border border-[#EBEBEB] overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead className="border-b border-[#EBEBEB] bg-[#f8f8f8]">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[#6b6b76] uppercase tracking-wide">Description</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-[#6b6b76] uppercase tracking-wide">Qty</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-[#6b6b76] uppercase tracking-wide">Unit Price</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-[#6b6b76] uppercase tracking-wide">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoiceData.lineItems.map((item: LineItem, index: number) => (
                        <tr key={index} className="border-b border-[#EBEBEB] last:border-0">
                          <td className="px-4 py-3 text-[#0f0f12]">{item.description}</td>
                          <td className="px-4 py-3 text-right text-[#6b6b76]">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-[#6b6b76] font-['DM_Mono'] text-xs">
                            {formatCurrency(item.unitPrice, selectedInvoiceData.currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[#0f0f12] font-['DM_Mono'] text-xs">
                            {formatCurrency(item.amount, selectedInvoiceData.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#f8f8f8]">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-medium text-[#0f0f12]">
                          Total
                        </td>
                        <td className="px-4 py-3 text-right font-serif text-lg text-[#0f0f12]">
                          {formatCurrency(selectedInvoiceData.amount, selectedInvoiceData.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoiceData.notes && (
                <div>
                  <h4 className="text-sm font-medium text-[#0f0f12] mb-1">Notes</h4>
                  <p className="text-sm text-[#6b6b76]">
                    {selectedInvoiceData.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-5 border-t border-[#EBEBEB]">
                <button
                  onClick={() => {
                    generateInvoicePDF({
                      invoiceNumber: selectedInvoiceData.invoiceNumber,
                      description: selectedInvoiceData.description,
                      organizationName: selectedInvoiceData.organizationName,
                      lineItems: selectedInvoiceData.lineItems,
                      amount: selectedInvoiceData.amount,
                      currency: selectedInvoiceData.currency,
                      status: selectedInvoiceData.displayStatus || selectedInvoiceData.status,
                      issuedDate: selectedInvoiceData.issuedDate,
                      dueDate: selectedInvoiceData.dueDate,
                      paidAt: selectedInvoiceData.paidAt,
                      notes: selectedInvoiceData.notes,
                    });
                    toast.success("Invoice PDF downloaded");
                  }}
                  className="h-10 px-5 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download PDF
                </button>
                {(selectedInvoiceData.displayStatus === "pending" ||
                  selectedInvoiceData.displayStatus === "overdue" ||
                  selectedInvoiceData.status === "pending") && (
                  <button
                    onClick={() => handlePayNow(selectedInvoiceData._id)}
                    disabled={payingInvoiceId === selectedInvoiceData._id}
                    className="h-10 px-5 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] disabled:bg-[#e5e5e7] disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {payingInvoiceId === selectedInvoiceData._id ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                    )}
                    {payingInvoiceId === selectedInvoiceData._id ? "Processing..." : "Pay Now"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center" aria-busy="true">
              <div className="w-6 h-6 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
