import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ============================================
// EMAIL TEMPLATES
// ============================================

const BRAND = {
  name: "Amjad & Hazli",
  email: "portal@amjadhazli.com",
  website: "https://portal.amjadhazli.com",
  logo: "https://amjadhazli.com/logo.png",
};

// Base email template wrapper
function baseTemplate(content: string, unsubscribeNote?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amjad & Hazli</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #090516; padding: 24px 32px; text-align: center;">
              <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #ffffff; letter-spacing: -0.02em;">
                Amjad & Hazli
              </span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 24px 32px; border-top: 1px solid #ebebeb;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #737373; text-align: center;">
                © ${new Date().getFullYear()} Amjad & Hazli PLT (LLP0016803-LGN)
              </p>
              <p style="margin: 0; font-size: 12px; color: #737373; text-align: center;">
                Chartered Accountants & Tax Advisors
              </p>
              ${unsubscribeNote ? `
              <p style="margin: 16px 0 0 0; font-size: 11px; color: #999999; text-align: center;">
                ${unsubscribeNote}
              </p>
              ` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

// Button component for emails
function emailButton(text: string, url: string): string {
  return `
<a href="${url}" style="display: inline-block; background-color: #253FF6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
  ${text}
</a>
`.trim();
}

// ============================================
// EMAIL CONTENT GENERATORS
// ============================================

export const templates = {
  // Document requested by admin
  documentRequested: (recipientName: string, documentTitle: string, description: string | undefined, dueDate: number | undefined) => ({
    subject: `Document Requested: ${documentTitle}`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        Document Requested
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Hi ${recipientName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        We need you to upload the following document to your client portal:
      </p>
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #090516;">
          ${documentTitle}
        </p>
        ${description ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #737373;">${description}</p>` : ""}
        ${dueDate ? `<p style="margin: 0; font-size: 13px; color: #ef4444;"><strong>Due:</strong> ${new Date(dueDate).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</p>` : ""}
      </div>
      <p style="margin: 0 0 24px 0;">
        ${emailButton("Upload Document", `${BRAND.website}/documents`)}
      </p>
      <p style="margin: 0; font-size: 13px; color: #737373;">
        If you have any questions, please contact us.
      </p>
    `, "To manage your email preferences, visit Settings in your portal."),
  }),

  // Document uploaded (notify admin)
  documentUploaded: (clientName: string, documentTitle: string) => ({
    subject: `Document Uploaded: ${documentTitle}`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        Document Uploaded
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        ${clientName} has uploaded a document that requires your review:
      </p>
      <div style="background-color: #dbeafe; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e40af;">
          ${documentTitle}
        </p>
      </div>
      <p style="margin: 0 0 24px 0;">
        ${emailButton("Review Document", `${BRAND.website}/admin/documents`)}
      </p>
    `),
  }),

  // Document approved
  documentApproved: (recipientName: string, documentTitle: string) => ({
    subject: `Document Approved: ${documentTitle}`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        Document Approved ✓
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Hi ${recipientName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Great news! Your document has been reviewed and approved:
      </p>
      <div style="background-color: #dcfce7; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #166534;">
          ${documentTitle}
        </p>
      </div>
      <p style="margin: 0; font-size: 13px; color: #737373;">
        No further action is required.
      </p>
    `, "To manage your email preferences, visit Settings in your portal."),
  }),

  // Document rejected
  documentRejected: (recipientName: string, documentTitle: string, reason: string | undefined) => ({
    subject: `Action Required: ${documentTitle}`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        Document Needs Resubmission
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Hi ${recipientName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Your document needs to be re-uploaded:
      </p>
      <div style="background-color: #fef2f2; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">
          ${documentTitle}
        </p>
        ${reason ? `<p style="margin: 0; font-size: 14px; color: #b91c1c;"><strong>Reason:</strong> ${reason}</p>` : ""}
      </div>
      <p style="margin: 0 0 24px 0;">
        ${emailButton("Re-upload Document", `${BRAND.website}/documents`)}
      </p>
    `, "To manage your email preferences, visit Settings in your portal."),
  }),

  // Task assigned
  taskAssigned: (recipientName: string, taskTitle: string, description: string | undefined, dueDate: number | undefined) => ({
    subject: `New Task: ${taskTitle}`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        New Task Assigned
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Hi ${recipientName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        A new task has been assigned to you:
      </p>
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #090516;">
          ${taskTitle}
        </p>
        ${description ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #737373;">${description}</p>` : ""}
        ${dueDate ? `<p style="margin: 0; font-size: 13px; color: #ef4444;"><strong>Due:</strong> ${new Date(dueDate).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</p>` : ""}
      </div>
      <p style="margin: 0 0 24px 0;">
        ${emailButton("View Task", `${BRAND.website}/tasks`)}
      </p>
    `, "To manage your email preferences, visit Settings in your portal."),
  }),

  // Task comment
  taskComment: (recipientName: string, commenterName: string, taskTitle: string, comment: string) => ({
    subject: `New comment on: ${taskTitle}`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        New Comment
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Hi ${recipientName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        ${commenterName} commented on <strong>${taskTitle}</strong>:
      </p>
      <div style="background-color: #f8f8f8; border-left: 4px solid #253FF6; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #404040; font-style: italic;">
          "${comment.length > 200 ? comment.substring(0, 200) + "..." : comment}"
        </p>
      </div>
      <p style="margin: 0 0 24px 0;">
        ${emailButton("Reply", `${BRAND.website}/tasks`)}
      </p>
    `, "To manage your email preferences, visit Settings in your portal."),
  }),

  // Invoice created
  invoiceCreated: (recipientName: string, invoiceNumber: string, amount: string, dueDate: number | undefined) => ({
    subject: `Invoice ${invoiceNumber} from Amjad & Hazli`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        New Invoice
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Hi ${recipientName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        A new invoice has been issued to your account:
      </p>
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #737373;">Invoice Number</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #090516; text-align: right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #737373;">Amount Due</td>
            <td style="padding: 8px 0; font-size: 18px; font-weight: 600; color: #090516; text-align: right;">${amount}</td>
          </tr>
          ${dueDate ? `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #737373;">Due Date</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #ef4444; text-align: right;">${new Date(dueDate).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</td>
          </tr>
          ` : ""}
        </table>
      </div>
      <p style="margin: 0 0 24px 0;">
        ${emailButton("View Invoice", `${BRAND.website}/invoices`)}
      </p>
    `, "To manage your email preferences, visit Settings in your portal."),
  }),

  // Signature request
  signatureRequest: (recipientName: string, documentTitle: string, requestedBy: string) => ({
    subject: `Signature Required: ${documentTitle}`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        Signature Required
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Hi ${recipientName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        ${requestedBy} has requested your signature on the following document:
      </p>
      <div style="background-color: #fef3c7; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">
          ${documentTitle}
        </p>
      </div>
      <p style="margin: 0 0 24px 0;">
        ${emailButton("Review & Sign", `${BRAND.website}/signatures`)}
      </p>
      <p style="margin: 0; font-size: 13px; color: #737373;">
        Please review the document carefully before signing.
      </p>
    `, "To manage your email preferences, visit Settings in your portal."),
  }),

  // New announcement
  newAnnouncement: (recipientName: string, title: string, preview: string) => ({
    subject: `📢 ${title}`,
    html: baseTemplate(`
      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #090516;">
        New Announcement
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #404040;">
        Hi ${recipientName},
      </p>
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #090516;">
          ${title}
        </p>
        <p style="margin: 0; font-size: 14px; color: #737373;">
          ${preview.length > 200 ? preview.substring(0, 200) + "..." : preview}
        </p>
      </div>
      <p style="margin: 0 0 24px 0;">
        ${emailButton("Read More", `${BRAND.website}/announcements`)}
      </p>
    `, "To manage your email preferences, visit Settings in your portal."),
  }),
};

// ============================================
// SEND EMAIL ACTION
// ============================================

export const send = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn("RESEND_API_KEY not configured - email not sent:", args.subject);
      return { success: false, error: "Email not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${BRAND.name} <${BRAND.email}>`,
          to: args.to,
          subject: args.subject,
          html: args.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Resend API error:", error);
        return { success: false, error };
      }

      const result = await response.json();
      console.log("Email sent:", result.id);
      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// ============================================
// NOTIFICATION EMAIL TRIGGERS
// ============================================

// Type for email preference categories
type EmailCategory = "documentRequests" | "taskAssignments" | "taskComments" | "invoices" | "signatures" | "announcements";

// Helper to check if user has email notifications enabled
// Uses runQuery to check internal query for preferences
async function shouldSendEmail(
  ctx: { runQuery: typeof import("./_generated/server").ActionCtx["runQuery"] },
  userId: string,
  category: EmailCategory
): Promise<boolean> {
  try {
    const prefs = await ctx.runQuery(internal.users.getEmailPreferences, { userId });
    if (!prefs) return true; // Default to sending if no preferences set
    return prefs[category] !== false;
  } catch (error) {
    console.warn("Failed to check email preferences:", error);
    return true; // Default to sending on error
  }
}

// Send document request email
export const sendDocumentRequestEmail = internalAction({
  args: {
    recipientId: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    documentTitle: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check user preferences before sending
    const shouldSend = await shouldSendEmail(ctx, args.recipientId, "documentRequests");
    if (!shouldSend) {
      console.log(`Skipping document request email - user ${args.recipientId} has disabled this notification`);
      return { success: false, reason: "user_preference_disabled" };
    }

    const emailContent = templates.documentRequested(
      args.recipientName,
      args.documentTitle,
      args.description,
      args.dueDate
    );

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});

// Send document uploaded email (to admins)
export const sendDocumentUploadedEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    clientName: v.string(),
    documentTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const emailContent = templates.documentUploaded(args.clientName, args.documentTitle);

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});

// Send document approved email
export const sendDocumentApprovedEmail = internalAction({
  args: {
    recipientId: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    documentTitle: v.string(),
  },
  handler: async (ctx, args) => {
    // Check user preferences before sending
    const shouldSend = await shouldSendEmail(ctx, args.recipientId, "documentRequests");
    if (!shouldSend) {
      console.log(`Skipping document approved email - user ${args.recipientId} has disabled this notification`);
      return { success: false, reason: "user_preference_disabled" };
    }

    const emailContent = templates.documentApproved(args.recipientName, args.documentTitle);

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});

// Send document rejected email
export const sendDocumentRejectedEmail = internalAction({
  args: {
    recipientId: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    documentTitle: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check user preferences before sending
    const shouldSend = await shouldSendEmail(ctx, args.recipientId, "documentRequests");
    if (!shouldSend) {
      console.log(`Skipping document rejected email - user ${args.recipientId} has disabled this notification`);
      return { success: false, reason: "user_preference_disabled" };
    }

    const emailContent = templates.documentRejected(args.recipientName, args.documentTitle, args.reason);

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});

// Send task assigned email
export const sendTaskAssignedEmail = internalAction({
  args: {
    recipientId: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    taskTitle: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check user preferences before sending
    const shouldSend = await shouldSendEmail(ctx, args.recipientId, "taskAssignments");
    if (!shouldSend) {
      console.log(`Skipping task assigned email - user ${args.recipientId} has disabled this notification`);
      return { success: false, reason: "user_preference_disabled" };
    }

    const emailContent = templates.taskAssigned(
      args.recipientName,
      args.taskTitle,
      args.description,
      args.dueDate
    );

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});

// Send task comment email
export const sendTaskCommentEmail = internalAction({
  args: {
    recipientId: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    commenterName: v.string(),
    taskTitle: v.string(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    // Check user preferences before sending
    const shouldSend = await shouldSendEmail(ctx, args.recipientId, "taskComments");
    if (!shouldSend) {
      console.log(`Skipping task comment email - user ${args.recipientId} has disabled this notification`);
      return { success: false, reason: "user_preference_disabled" };
    }

    const emailContent = templates.taskComment(
      args.recipientName,
      args.commenterName,
      args.taskTitle,
      args.comment
    );

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});

// Send invoice created email
export const sendInvoiceCreatedEmail = internalAction({
  args: {
    recipientId: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    invoiceNumber: v.string(),
    amount: v.string(),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check user preferences before sending
    const shouldSend = await shouldSendEmail(ctx, args.recipientId, "invoices");
    if (!shouldSend) {
      console.log(`Skipping invoice email - user ${args.recipientId} has disabled this notification`);
      return { success: false, reason: "user_preference_disabled" };
    }

    const emailContent = templates.invoiceCreated(
      args.recipientName,
      args.invoiceNumber,
      args.amount,
      args.dueDate
    );

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});

// Send signature request email
export const sendSignatureRequestEmail = internalAction({
  args: {
    recipientId: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    documentTitle: v.string(),
    requestedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check user preferences before sending
    const shouldSend = await shouldSendEmail(ctx, args.recipientId, "signatures");
    if (!shouldSend) {
      console.log(`Skipping signature request email - user ${args.recipientId} has disabled this notification`);
      return { success: false, reason: "user_preference_disabled" };
    }

    const emailContent = templates.signatureRequest(
      args.recipientName,
      args.documentTitle,
      args.requestedBy
    );

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});

// Send announcement email
export const sendAnnouncementEmail = internalAction({
  args: {
    recipientId: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    title: v.string(),
    preview: v.string(),
  },
  handler: async (ctx, args) => {
    // Check user preferences before sending
    const shouldSend = await shouldSendEmail(ctx, args.recipientId, "announcements");
    if (!shouldSend) {
      console.log(`Skipping announcement email - user ${args.recipientId} has disabled this notification`);
      return { success: false, reason: "user_preference_disabled" };
    }

    const emailContent = templates.newAnnouncement(
      args.recipientName,
      args.title,
      args.preview
    );

    return await ctx.runAction(internal.emails.send, {
      to: args.recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  },
});
