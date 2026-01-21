// convex/lib/auth.ts
// Shared authentication and authorization helpers

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export type UserRole = "admin" | "staff" | "client";

/**
 * Get the current authenticated user from the database
 * Returns null if not authenticated or user not found
 */
export async function getCurrentUserOrNull(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
    .unique();
}

/**
 * Get the current authenticated user from the database
 * Throws if not authenticated or user not found
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
}

/**
 * Require admin role
 * Throws if not authenticated or not an admin
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);
  
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

/**
 * Require admin or staff role
 * Throws if not authenticated or not admin/staff
 */
export async function requireAdminOrStaff(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);
  
  if (user.role !== "admin" && user.role !== "staff") {
    throw new Error("Admin or staff access required");
  }

  return user;
}

/**
 * Check if user has access to an organization
 * Admin/staff can access all, clients can only access their own
 */
export async function requireOrgAccess(
  ctx: QueryCtx | MutationCtx,
  organizationId: string
): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);

  // Admin and staff can access any organization
  if (user.role === "admin" || user.role === "staff") {
    return user;
  }

  // Clients can only access their own organization
  if (user.organizationId?.toString() !== organizationId) {
    throw new Error("Access denied to this organization");
  }

  return user;
}
