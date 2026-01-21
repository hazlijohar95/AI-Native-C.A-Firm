// convex/auth.ts
// Official WorkOS AuthKit component integration
// Docs: https://www.convex.dev/components/workos-authkit

import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

// Get typed internal functions for event handling
const authFunctions: AuthFunctions = internal.auth;

// Initialize AuthKit component
export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions,
});

// Event handlers for user lifecycle
// These sync WorkOS users to your custom users table
export const { authKitEvent } = authKit.events({
  "user.created": async (ctx, event) => {
    // Create user in your custom users table when WorkOS user is created
    await ctx.db.insert("users", {
      workosId: event.data.id,
      email: event.data.email,
      name: `${event.data.firstName || ""} ${event.data.lastName || ""}`.trim() || event.data.email,
      avatarUrl: event.data.profilePictureUrl || undefined,
      role: "client", // Default role for new users
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
  },

  "user.updated": async (ctx, event) => {
    // Find and update the user in your custom table
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", event.data.id))
      .unique();

    if (!user) {
      // Create user if they don't exist (edge case - webhook order issue)
      await ctx.db.insert("users", {
        workosId: event.data.id,
        email: event.data.email,
        name: `${event.data.firstName || ""} ${event.data.lastName || ""}`.trim() || event.data.email,
        avatarUrl: event.data.profilePictureUrl || undefined,
        role: "client",
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      });
      return;
    }

    await ctx.db.patch(user._id, {
      email: event.data.email,
      name: `${event.data.firstName || ""} ${event.data.lastName || ""}`.trim() || event.data.email,
      avatarUrl: event.data.profilePictureUrl || undefined,
      lastLoginAt: Date.now(),
    });
  },

  "user.deleted": async (ctx, event) => {
    // Find and delete the user from your custom table
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", event.data.id))
      .unique();

    if (!user) {
      return;
    }

    await ctx.db.delete(user._id);
  },
});
