import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Receipt, 
  Plus, 
  Search,
  Building2,
  X,
  Send,
  CreditCard,
  Edit,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils";
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from "@/lib/bulk-actions";
import { InvoiceStatusBadge, PaymentStatusBadge, type InvoiceStatus } from "@/components/status-badges";
import type { Id } from "../../../convex/_generated/dataModel";

export function AdminInvoices() {
  const invoices = useQuery(api.admin.listAllInvoices);
  const organizations = useQuery(api.organizations.list);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<(typeof invoices extends (infer T)[] | undefined ? T : never) | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<(typeof invoices extends (infer T)[] | undefined ? T : never) | null>(null);

  // Filter invoices with memoization
  const filteredInvoices = useMemo(() => 
    invoices?.filter((invoice) => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || invoice.displayStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    [invoices, searchQuery, statusFilter]
  );

  const handleExportInvoices = () => {
    if (!filteredInvoices) return;
    
    exportToCSV(filteredInvoices, "invoices-export", [
      { key: "invoiceNumber", header: "Invoice Number" },
      { key: "organizationName", header: "Client" },
      { key: "description", header: "Description" },
      { key: "amount", header: "Amount (RM)", formatter: formatCurrencyForExport as (val: unknown) => string },
      { key: "displayStatus", header: "Status" },
      { key: "issuedDate", header: "Issued Date", formatter: formatDateForExport as (val: unknown) => string },
      { key: "dueDate", header: "Due Date", formatter: formatDateForExport as (val: unknown) => string },
      { key: "paidAt", header: "Paid Date", formatter: formatDateForExport as (val: unknown) => string },
    ]);

    toast.success(`Exported ${filteredInvoices.length} invoices`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Invoices
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage client invoices and payments
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <CreateInvoiceDialog 
            organizations={organizations || []}
            onClose={() => setIsCreateOpen(false)} 
          />
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleExportInvoices} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Invoices List */}
      {invoices === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredInvoices?.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium">No invoices found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Create your first invoice to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Invoices list">
              <caption className="sr-only">
                List of invoices with client, amount, due date, and status information
              </caption>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Invoice</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Client</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Due Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices?.map((invoice) => (
                  <tr key={invoice._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {invoice.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {invoice.organizationName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{formatCurrency(invoice.amount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{formatDate(invoice.dueDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={invoice.displayStatus as InvoiceStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceActions 
                        invoice={invoice}
                        onViewDetails={() => setSelectedInvoice(invoice)}
                        onEdit={() => setEditingInvoice(invoice)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        {selectedInvoice && (
          <InvoiceDetailsDialog 
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </Dialog>

      {/* Edit Invoice Dialog (drafts only) */}
      <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
        {editingInvoice && (
          <EditInvoiceDialog 
            invoice={editingInvoice}
            onClose={() => setEditingInvoice(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

interface InvoiceActionsProps {
  invoice: {
    _id: Id<"invoices">;
    status: string;
    displayStatus: string;
  };
  onViewDetails: () => void;
  onEdit: () => void;
}

function InvoiceActions({ invoice, onViewDetails, onEdit }: InvoiceActionsProps) {
  const publishInvoice = useMutation(api.invoices.publish);
  const cancelInvoice = useMutation(api.invoices.cancel);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publishInvoice({ id: invoice._id });
      toast.success("Invoice published");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish invoice");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelInvoice({ id: invoice._id });
      toast.success("Invoice cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel invoice");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={onViewDetails} aria-label="View invoice details">
        View
      </Button>

      {invoice.status === "draft" && (
        <>
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit invoice">
            <Edit className="h-4 w-4 mr-1" aria-hidden="true" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={handlePublish} disabled={isPublishing} aria-label="Publish invoice">
            {isPublishing ? <Spinner size="sm" className="mr-1" /> : <Send className="h-4 w-4 mr-1" aria-hidden="true" />}
            Publish
          </Button>
        </>
      )}

      {(invoice.displayStatus === "pending" || invoice.displayStatus === "overdue") && (
        <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Record payment">
              <CreditCard className="h-4 w-4 mr-1" aria-hidden="true" />
              Payment
            </Button>
          </DialogTrigger>
          <RecordPaymentDialog 
            invoiceId={invoice._id}
            onClose={() => setIsRecordPaymentOpen(false)}
          />
        </Dialog>
      )}

      {invoice.status !== "paid" && invoice.status !== "cancelled" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={isCancelling} aria-label="Cancel invoice">
              {isCancelling ? <Spinner size="sm" /> : <X className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The invoice will be marked as cancelled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
                Cancel Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

interface CreateInvoiceDialogProps {
  organizations: Array<{ _id: Id<"organizations">; name: string }>;
  onClose: () => void;
}

function CreateInvoiceDialog({ organizations, onClose }: CreateInvoiceDialogProps) {
  const createInvoice = useMutation(api.invoices.create);
  
  const [organizationId, setOrganizationId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationId || !description.trim() || !amount || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await createInvoice({
        organizationId: organizationId as Id<"organizations">,
        description: description.trim(),
        lineItems: [{
          description: description.trim(),
          quantity: 1,
          unitPrice: amountInCents,
          amount: amountInCents,
        }],
        dueDate: new Date(dueDate).getTime(),
        notes: notes.trim() || undefined,
        isDraft,
      });
      toast.success(isDraft ? "Draft invoice created" : "Invoice created and sent");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a client
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="organization">Client Organization *</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger id="organization">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Professional services - January 2026"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (RM) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000.00"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, bank details, etc."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isDraft"
              checked={isDraft}
              onCheckedChange={(checked) => setIsDraft(checked === true)}
            />
            <Label htmlFor="isDraft" className="text-sm font-normal">
              Save as draft (don't notify client)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            {isDraft ? "Save Draft" : "Create & Send"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

interface RecordPaymentDialogProps {
  invoiceId: Id<"invoices">;
  onClose: () => void;
}

function RecordPaymentDialog({ invoiceId, onClose }: RecordPaymentDialogProps) {
  const invoice = useQuery(api.invoices.get, { id: invoiceId });
  const recordPayment = useMutation(api.invoices.recordPayment);
  
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank_transfer" | "cash" | "other">("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default amount when invoice loads
  useEffect(() => {
    if (invoice && !amount) {
      setAmount((invoice.amount / 100).toFixed(2));
    }
  }, [invoice, amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        invoiceId,
        amount: amountInCents,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Payment recorded");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a manual payment for this invoice
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {invoice && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-sm text-muted-foreground">Invoice Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(invoice.amount)}</p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="paymentAmount">Payment Amount (RM) *</Label>
            <Input
              id="paymentAmount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={(invoice?.amount ? invoice.amount / 100 : 0).toFixed(2)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="method">Payment Method *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reference">Reference Number</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction ID or receipt number"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentNotes">Notes</Label>
            <Input
              id="paymentNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional payment notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            Record Payment
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

interface InvoiceDetailsDialogProps {
  invoice: {
    _id: Id<"invoices">;
    invoiceNumber: string;
    organizationName: string;
    description: string;
    amount: number;
    currency: string;
    displayStatus: string;
    dueDate: number;
    issuedDate: number;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    notes?: string;
    paidAt?: number;
  };
  onClose: () => void;
}

function InvoiceDetailsDialog({ invoice, onClose }: InvoiceDetailsDialogProps) {
  const payments = useQuery(api.invoices.getPayments, { invoiceId: invoice._id });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Invoice {invoice.invoiceNumber}</DialogTitle>
        <DialogDescription>
          {invoice.organizationName}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(invoice.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-lg font-medium capitalize">{invoice.displayStatus}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Issued Date</p>
            <p>{formatDate(invoice.issuedDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Due Date</p>
            <p>{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h4 className="font-medium mb-2">Line Items</h4>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td colSpan={3} className="px-3 py-2 text-right font-medium">Total</td>
                  <td className="px-3 py-2 text-right font-bold">{formatCurrency(invoice.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Payment History</h4>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.method.replace("_", " ")} - {formatDate(payment.paidAt)}
                    </p>
                    {payment.reference && (
                      <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                    )}
                  </div>
                  <PaymentStatusBadge status={payment.status as "pending" | "completed"} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div>
            <h4 className="font-medium mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

interface EditInvoiceDialogProps {
  invoice: {
    _id: Id<"invoices">;
    invoiceNumber: string;
    organizationName: string;
    description: string;
    amount: number;
    dueDate: number;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    notes?: string;
  };
  onClose: () => void;
}

function EditInvoiceDialog({ invoice, onClose }: EditInvoiceDialogProps) {
  const updateInvoice = useMutation(api.invoices.update);
  
  const [description, setDescription] = useState(invoice.description);
  const [amount, setAmount] = useState((invoice.amount / 100).toFixed(2));
  const [dueDate, setDueDate] = useState(new Date(invoice.dueDate).toISOString().split("T")[0]);
  const [notes, setNotes] = useState(invoice.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateInvoice({
        id: invoice._id,
        description: description.trim(),
        lineItems: [{
          description: description.trim(),
          quantity: 1,
          unitPrice: amountInCents,
          amount: amountInCents,
        }],
        dueDate: new Date(dueDate).getTime(),
        notes: notes.trim() || undefined,
      });
      toast.success("Invoice updated");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Edit Invoice {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Update draft invoice for {invoice.organizationName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="editDescription">Description *</Label>
            <Input
              id="editDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Professional services - January 2026"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="editAmount">Amount (RM) *</Label>
              <Input
                id="editAmount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDueDate">Due Date *</Label>
              <Input
                id="editDueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="editNotes">Notes (optional)</Label>
            <Input
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, bank details, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
