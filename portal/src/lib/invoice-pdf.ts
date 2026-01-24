/**
 * Invoice PDF Generation
 *
 * Generates professional PDF invoices using jsPDF.
 * This runs client-side for fast generation without server load.
 */

import { jsPDF } from "jspdf";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  description: string;
  organizationName: string;
  lineItems: LineItem[];
  amount: number;
  currency: string;
  status: string;
  issuedDate: number;
  dueDate: number;
  paidAt?: number;
  notes?: string;
}

// Company details for invoice header
const COMPANY = {
  name: "Amjad & Hazli PLT",
  registration: "LLP0016803-LGN",
  tagline: "Chartered Accountants & Tax Advisors",
  address: [
    "Level 8, Menara MRCB",
    "No. 1, Jalan Syed Putra",
    "58000 Kuala Lumpur",
    "Malaysia",
  ],
  phone: "+60 3-7960 8888",
  email: "info@amjadhazli.com",
  website: "www.amjadhazli.com",
};

// Bank details for payment
const BANK_DETAILS = {
  bankName: "CIMB Bank Berhad",
  accountName: "Amjad & Hazli PLT",
  accountNumber: "8008123456",
  swiftCode: "CIBBMYKL",
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
    month: "long",
    day: "numeric",
  });
}

/**
 * Generate a PDF invoice and trigger download
 */
export function generateInvoicePDF(invoice: InvoiceData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Colors
  const primaryColor = "#090516";
  const grayColor = "#6b7280";
  const lightGray = "#f3f4f6";

  // ================================
  // HEADER
  // ================================

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text(COMPANY.name, margin, y);

  // Registration & Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor);
  doc.text(`(${COMPANY.registration})`, margin, y + 7);
  doc.setFontSize(10);
  doc.text(COMPANY.tagline, margin, y + 13);

  // Invoice Title (right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(primaryColor);
  doc.text("INVOICE", pageWidth - margin, y, { align: "right" });

  y += 25;

  // ================================
  // COMPANY & CLIENT INFO
  // ================================

  // Company Address (left)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor);
  let addressY = y;
  for (const line of COMPANY.address) {
    doc.text(line, margin, addressY);
    addressY += 4;
  }
  doc.text(COMPANY.phone, margin, addressY);
  addressY += 4;
  doc.text(COMPANY.email, margin, addressY);

  // Invoice Details Box (right)
  const boxX = pageWidth - margin - 70;
  const boxWidth = 70;
  doc.setFillColor(lightGray);
  doc.roundedRect(boxX, y - 2, boxWidth, 35, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor);

  let detailY = y + 3;
  doc.text("Invoice Number:", boxX + 4, detailY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor);
  doc.text(invoice.invoiceNumber, boxX + boxWidth - 4, detailY, { align: "right" });

  detailY += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text("Issue Date:", boxX + 4, detailY);
  doc.setTextColor(primaryColor);
  doc.text(formatDate(invoice.issuedDate), boxX + boxWidth - 4, detailY, { align: "right" });

  detailY += 8;
  doc.setTextColor(grayColor);
  doc.text("Due Date:", boxX + 4, detailY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(invoice.status === "overdue" ? "#dc2626" : primaryColor);
  doc.text(formatDate(invoice.dueDate), boxX + boxWidth - 4, detailY, { align: "right" });

  detailY += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text("Status:", boxX + 4, detailY);
  const statusColors: Record<string, string> = {
    paid: "#059669",
    pending: "#d97706",
    overdue: "#dc2626",
    cancelled: "#6b7280",
    draft: "#6b7280",
  };
  doc.setFont("helvetica", "bold");
  doc.setTextColor(statusColors[invoice.status] || grayColor);
  doc.text(invoice.status.toUpperCase(), boxX + boxWidth - 4, detailY, { align: "right" });

  y = Math.max(addressY, y + 40) + 10;

  // ================================
  // BILL TO
  // ================================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(grayColor);
  doc.text("BILL TO", margin, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text(invoice.organizationName, margin, y);

  y += 12;

  // ================================
  // LINE ITEMS TABLE
  // ================================

  // Table header
  const colWidths = {
    description: 85,
    qty: 20,
    unitPrice: 35,
    amount: 30,
  };
  const tableStartX = margin;
  const tableWidth = pageWidth - margin * 2;

  // Header background
  doc.setFillColor(primaryColor);
  doc.rect(tableStartX, y, tableWidth, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor("#ffffff");

  let headerX = tableStartX + 3;
  doc.text("Description", headerX, y + 7);
  headerX += colWidths.description;
  doc.text("Qty", headerX, y + 7, { align: "center" });
  headerX += colWidths.qty;
  doc.text("Unit Price", headerX + colWidths.unitPrice - 3, y + 7, { align: "right" });
  headerX += colWidths.unitPrice;
  doc.text("Amount", headerX + colWidths.amount - 3, y + 7, { align: "right" });

  y += 12;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor);

  let rowIndex = 0;
  for (const item of invoice.lineItems) {
    // Alternate row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(lightGray);
      doc.rect(tableStartX, y - 3, tableWidth, 10, "F");
    }

    let itemX = tableStartX + 3;

    // Description (may wrap)
    const descLines = doc.splitTextToSize(item.description, colWidths.description - 6);
    doc.text(descLines[0], itemX, y + 4);

    itemX += colWidths.description;
    doc.text(item.quantity.toString(), itemX, y + 4, { align: "center" });

    itemX += colWidths.qty;
    doc.text(formatCurrency(item.unitPrice, invoice.currency), itemX + colWidths.unitPrice - 3, y + 4, { align: "right" });

    itemX += colWidths.unitPrice;
    doc.text(formatCurrency(item.amount, invoice.currency), itemX + colWidths.amount - 3, y + 4, { align: "right" });

    y += 10;
    rowIndex++;

    // Page break check
    if (y > pageHeight - 80) {
      doc.addPage();
      y = margin;
    }
  }

  // ================================
  // TOTALS
  // ================================

  y += 5;
  doc.setDrawColor(primaryColor);
  doc.line(tableStartX + colWidths.description + colWidths.qty, y, tableStartX + tableWidth, y);

  y += 8;
  const totalLabelX = tableStartX + colWidths.description + colWidths.qty + colWidths.unitPrice;
  const totalValueX = tableStartX + tableWidth - 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor);
  doc.text("TOTAL", totalLabelX, y);
  doc.setFontSize(14);
  doc.text(formatCurrency(invoice.amount, invoice.currency), totalValueX, y, { align: "right" });

  // ================================
  // NOTES
  // ================================

  if (invoice.notes) {
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(grayColor);
    doc.text("Notes", margin, y);

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor);
    const noteLines = doc.splitTextToSize(invoice.notes, tableWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4;
  }

  // ================================
  // PAYMENT DETAILS
  // ================================

  y += 15;

  // Check for page break
  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }

  // Payment box
  doc.setFillColor(lightGray);
  doc.roundedRect(margin, y, tableWidth, 40, 2, 2, "F");

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text("Payment Details", margin + 5, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor);

  const col1X = margin + 5;
  const col2X = margin + 50;

  doc.text("Bank:", col1X, y);
  doc.setTextColor(primaryColor);
  doc.text(BANK_DETAILS.bankName, col2X, y);

  y += 5;
  doc.setTextColor(grayColor);
  doc.text("Account Name:", col1X, y);
  doc.setTextColor(primaryColor);
  doc.text(BANK_DETAILS.accountName, col2X, y);

  y += 5;
  doc.setTextColor(grayColor);
  doc.text("Account No:", col1X, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor);
  doc.text(BANK_DETAILS.accountNumber, col2X, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);
  doc.text("Swift Code:", col1X, y);
  doc.setTextColor(primaryColor);
  doc.text(BANK_DETAILS.swiftCode, col2X, y);

  // Reference instruction
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(grayColor);
  doc.text(`Please include "${invoice.invoiceNumber}" as payment reference`, col1X, y);

  // ================================
  // FOOTER
  // ================================

  const footerY = pageHeight - 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(grayColor);
  doc.text("Thank you for your business.", pageWidth / 2, footerY, { align: "center" });
  doc.text(COMPANY.website, pageWidth / 2, footerY + 4, { align: "center" });

  // ================================
  // SAVE
  // ================================

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
