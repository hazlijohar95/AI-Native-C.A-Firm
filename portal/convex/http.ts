// convex/http.ts
// HTTP router for WorkOS webhooks, Stripe webhooks, and other HTTP endpoints

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authKit } from "./auth";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

// Register WorkOS AuthKit webhook routes
// This handles user.created, user.updated, user.deleted events
authKit.registerRoutes(http);

// ============================================
// STRIPE WEBHOOKS
// ============================================

/**
 * Verify Stripe webhook signature using HMAC-SHA256
 * Implementation follows Stripe's signature verification spec:
 * https://stripe.com/docs/webhooks/signatures
 */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<{ valid: boolean; timestamp?: number }> {
  // Parse the signature header (format: t=timestamp,v1=signature,v1=signature,...)
  const parts = signature.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signatureParts = parts.filter((p) => p.startsWith("v1="));

  if (!timestampPart || signatureParts.length === 0) {
    return { valid: false };
  }

  const timestamp = parseInt(timestampPart.substring(2), 10);
  if (isNaN(timestamp)) {
    return { valid: false };
  }

  // Check timestamp is not too old (5 minutes tolerance)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  if (timestamp < fiveMinutesAgo) {
    console.error("Stripe webhook timestamp too old:", timestamp);
    return { valid: false };
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Check if any of the provided signatures match
  for (const sigPart of signatureParts) {
    const providedSignature = sigPart.substring(3); // Remove "v1=" prefix
    if (providedSignature === expectedSignature) {
      return { valid: true, timestamp };
    }
  }

  return { valid: false };
}

// Stripe webhook handler
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // If webhook secret is not configured, reject all requests
    if (!stripeWebhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get the Stripe signature header
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    // Get the raw body
    const body = await request.text();

    // Verify the webhook signature cryptographically
    const verification = await verifyStripeSignature(body, signature, stripeWebhookSecret);
    if (!verification.valid) {
      console.error("Invalid Stripe webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    try {
      // Parse the verified event
      const event = JSON.parse(body);

      console.log("Stripe webhook received:", event.type, "at timestamp:", verification.timestamp);

      // Handle the event
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;

          // Extract invoice ID from metadata
          const invoiceId = session.metadata?.invoice_id;
          if (!invoiceId) {
            console.error("No invoice_id in session metadata");
            return new Response("Missing invoice_id", { status: 400 });
          }

          // Record the payment
          await ctx.runMutation(internal.invoices.recordStripePayment, {
            invoiceId: invoiceId as Id<"invoices">,
            paymentIntentId: session.payment_intent || session.id,
            amount: session.amount_total,
            currency: session.currency?.toUpperCase() || "MYR",
          });

          console.log(`Payment recorded for invoice ${invoiceId}`);
          break;
        }

        case "payment_intent.succeeded": {
          // This can be used for additional confirmation
          console.log("Payment intent succeeded:", event.data.object.id);
          break;
        }

        case "payment_intent.payment_failed": {
          // Handle failed payment
          const paymentIntent = event.data.object;
          console.error("Payment failed:", paymentIntent.id, paymentIntent.last_payment_error?.message);
          break;
        }

        default:
          // Unhandled event type
          console.log("Unhandled Stripe event type:", event.type);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Webhook handler failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
