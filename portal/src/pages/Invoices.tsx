import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  variant: "default" | "warning" | "destructive" | "success" | "secondary";
  label: string;
}> = {
  draft: { 
    icon: <Clock className="h-4 w-4" />, 
    variant: "secondary",
    label: "Draft",
  },
  pending: { 
    icon: <Clock className="h-4 w-4" />, 
    variant: "warning",
    label: "Pending",
  },
  overdue: { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    variant: "destructive",
    label: "Overdue",
  },
  paid: { 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    variant: "success",
    label: "Paid",
  },
  cancelled: { 
    icon: <XCircle className="h-4 w-4" />, 
    variant: "secondary",
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

  const invoices = useQuery(api.invoices.list, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const invoiceCounts = useQuery(api.invoices.countPending, {});

  const selectedInvoiceData = useQuery(
    api.invoices.get,
    detailDialogOpen && selectedInvoice ? { id: selectedInvoice } : "skip"
  );

  const handleViewDetails = (invoiceId: Id<"invoices">) => {
    setSelectedInvoice(invoiceId);
    setDetailDialogOpen(true);
  };

  const handlePayNow = () => {
    toast.info("Online payment coming soon", {
      description: "Please contact us for bank transfer details.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            View and pay your invoices
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {invoiceCounts === undefined ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-8 w-16 animate-pulse rounded bg-muted mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl">{invoiceCounts.pending}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Invoices awaiting payment
              </p>
            </CardContent>
          </Card>
          <Card className={invoiceCounts.overdue > 0 ? "border-destructive" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className={invoiceCounts.overdue > 0 ? "text-destructive" : ""}>
                Overdue
              </CardDescription>
              <CardTitle className={cn("text-2xl", invoiceCounts.overdue > 0 && "text-destructive")}>
                {invoiceCounts.overdue}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Past due date
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Outstanding</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(invoiceCounts.total)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Amount to be paid
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Label htmlFor="status-filter" className="sr-only">Filter by status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger id="status-filter" className="w-[150px]">
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
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Loading invoices...</p>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center">
            <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No invoices</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter !== "all"
                ? "No invoices match your filter"
                : "You have no invoices yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const displayStatus = invoice.displayStatus || invoice.status;
            const displayConfig = statusConfig[displayStatus] || statusConfig.pending;

            return (
              <Card
                key={invoice._id}
                className={cn(
                  "transition-shadow hover:shadow-md",
                  displayStatus === "overdue" && "border-destructive/50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Invoice Info */}
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        displayStatus === "paid" ? "bg-green-100" : 
                        displayStatus === "overdue" ? "bg-red-100" : "bg-muted"
                      )}>
                        <Receipt className={cn(
                          "h-5 w-5",
                          displayStatus === "paid" ? "text-green-600" :
                          displayStatus === "overdue" ? "text-red-600" : "text-muted-foreground"
                        )} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                          <Badge variant={displayConfig.variant} className="gap-1">
                            {displayConfig.icon}
                            {displayConfig.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                          {invoice.description}
                        </p>
                        {invoice.organizationName && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" aria-hidden="true" />
                            {invoice.organizationName}
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Issued {formatDate(invoice.issuedDate)}</span>
                          <span className={displayStatus === "overdue" ? "text-destructive font-medium" : ""}>
                            Due {formatDate(invoice.dueDate)}
                          </span>
                          {invoice.paidAt && (
                            <span className="text-green-600">
                              Paid {formatDate(invoice.paidAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                      <p className="text-xl font-semibold">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleViewDetails(invoice._id)}
                        >
                          <Eye className="h-3 w-3" aria-hidden="true" />
                          View
                        </Button>
                        {(displayStatus === "pending" || displayStatus === "overdue") && (
                          <Button size="sm" className="gap-1" onClick={handlePayNow}>
                            <CreditCard className="h-3 w-3" aria-hidden="true" />
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoiceData?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoiceData ? (
            <div className="space-y-6">
              {/* Status & Dates */}
              <div className="flex flex-wrap items-center gap-4">
                <Badge 
                  variant={statusConfig[selectedInvoiceData.displayStatus || selectedInvoiceData.status]?.variant || "default"}
                  className="gap-1"
                >
                  {statusConfig[selectedInvoiceData.displayStatus || selectedInvoiceData.status]?.icon}
                  {statusConfig[selectedInvoiceData.displayStatus || selectedInvoiceData.status]?.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Issued: {formatDate(selectedInvoiceData.issuedDate)}
                </span>
                <span className="text-sm text-muted-foreground">
                  Due: {formatDate(selectedInvoiceData.dueDate)}
                </span>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedInvoiceData.description}
                </p>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-medium mb-2">Line Items</h4>
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left">Description</th>
                        <th scope="col" className="px-4 py-2 text-right">Qty</th>
                        <th scope="col" className="px-4 py-2 text-right">Unit Price</th>
                        <th scope="col" className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoiceData.lineItems.map((item: LineItem, index: number) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(item.unitPrice, selectedInvoiceData.currency)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatCurrency(item.amount, selectedInvoiceData.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">
                          Total
                        </td>
                        <td className="px-4 py-2 text-right font-bold">
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
                  <h4 className="font-medium mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedInvoiceData.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="gap-1" 
                  disabled
                  title="PDF download coming soon"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download PDF
                </Button>
                {(selectedInvoiceData.displayStatus === "pending" || 
                  selectedInvoiceData.displayStatus === "overdue" ||
                  selectedInvoiceData.status === "pending") && (
                  <Button className="gap-1" onClick={handlePayNow}>
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Pay Now
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center" aria-busy="true">
              <Spinner />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
