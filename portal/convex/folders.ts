import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";
import type { Id, Doc } from "./_generated/dataModel";

// ============================================
// QUERIES
// ============================================

/**
 * List folders for an organization, optionally filtered by service type
 */
export const list = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    serviceTypeId: v.optional(v.id("serviceTypes")),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Determine organization scope
    let orgId: Id<"organizations"> | undefined;
    if (user.role === "client") {
      if (!user.organizationId) return [];
      orgId = user.organizationId;
    } else if (args.organizationId) {
      orgId = args.organizationId;
    }

    let folders: Doc<"folders">[];

    if (orgId && args.serviceTypeId) {
      // Filter by org and service
      folders = await ctx.db
        .query("folders")
        .withIndex("by_service", (q) =>
          q.eq("organizationId", orgId!).eq("serviceTypeId", args.serviceTypeId!)
        )
        .collect();
    } else if (orgId) {
      // Filter by org only
      folders = await ctx.db
        .query("folders")
        .withIndex("by_organization", (q) => q.eq("organizationId", orgId!))
        .collect();
    } else {
      // Admin seeing all (shouldn't happen often)
      folders = await ctx.db.query("folders").collect();
    }

    // Filter by parent if specified
    if (args.parentId !== undefined) {
      folders = folders.filter((f) => f.parentId === args.parentId);
    } else {
      // By default, return only root folders (no parent)
      folders = folders.filter((f) => !f.parentId);
    }

    // Sort by name
    folders.sort((a, b) => a.name.localeCompare(b.name));

    // Get document counts for each folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
          .collect();
        const activeDocCount = docs.filter((d) => !d.isDeleted).length;

        return {
          ...folder,
          documentCount: activeDocCount,
        };
      })
    );

    return foldersWithCounts;
  },
});

/**
 * List folders by service type
 */
export const listByService = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    serviceTypeId: v.id("serviceTypes"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Determine organization scope
    let orgId: Id<"organizations"> | undefined;
    if (user.role === "client") {
      if (!user.organizationId) return [];
      orgId = user.organizationId;

      // Verify client has access to this service
      const subscription = await ctx.db
        .query("clientSubscriptions")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", orgId!).eq("status", "active")
        )
        .filter((q) => q.eq(q.field("serviceTypeId"), args.serviceTypeId))
        .first();

      if (!subscription) {
        throw new Error("You do not have access to this service");
      }
    } else if (args.organizationId) {
      orgId = args.organizationId;
    }

    let folders: Doc<"folders">[];

    if (orgId) {
      folders = await ctx.db
        .query("folders")
        .withIndex("by_service", (q) =>
          q.eq("organizationId", orgId!).eq("serviceTypeId", args.serviceTypeId)
        )
        .collect();
    } else {
      // Admin seeing all for this service type
      folders = await ctx.db
        .query("folders")
        .filter((q) => q.eq(q.field("serviceTypeId"), args.serviceTypeId))
        .collect();
    }

    // Sort by name
    folders.sort((a, b) => a.name.localeCompare(b.name));

    // Get document counts for each folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
          .collect();
        const activeDocCount = docs.filter((d) => !d.isDeleted).length;

        return {
          ...folder,
          documentCount: activeDocCount,
        };
      })
    );

    return foldersWithCounts;
  },
});

/**
 * Get folder hierarchy as a tree
 */
export const getHierarchy = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    serviceTypeId: v.optional(v.id("serviceTypes")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Determine organization scope
    let orgId: Id<"organizations"> | undefined;
    if (user.role === "client") {
      if (!user.organizationId) return [];
      orgId = user.organizationId;
    } else if (args.organizationId) {
      orgId = args.organizationId;
    }

    let folders: Doc<"folders">[];

    if (orgId && args.serviceTypeId) {
      folders = await ctx.db
        .query("folders")
        .withIndex("by_service", (q) =>
          q.eq("organizationId", orgId!).eq("serviceTypeId", args.serviceTypeId!)
        )
        .collect();
    } else if (orgId) {
      folders = await ctx.db
        .query("folders")
        .withIndex("by_organization", (q) => q.eq("organizationId", orgId!))
        .collect();
    } else {
      folders = await ctx.db.query("folders").collect();
    }

    // Build tree structure
    type FolderNode = Doc<"folders"> & { children: FolderNode[]; documentCount: number };

    // Get document counts
    const docCounts = new Map<string, number>();
    for (const folder of folders) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
        .collect();
      docCounts.set(folder._id.toString(), docs.filter((d) => !d.isDeleted).length);
    }

    const buildTree = (parentId: Id<"folders"> | undefined): FolderNode[] => {
      return folders
        .filter((f) => {
          if (parentId === undefined) return !f.parentId;
          return f.parentId?.toString() === parentId.toString();
        })
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((folder) => ({
          ...folder,
          children: buildTree(folder._id),
          documentCount: docCounts.get(folder._id.toString()) ?? 0,
        }));
    };

    return buildTree(undefined);
  },
});

/**
 * Get breadcrumb path for a folder
 */
export const getBreadcrumb = query({
  args: {
    folderId: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const folder = await ctx.db.get(args.folderId);

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Check access
    if (user.role === "client") {
      if (folder.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Build path from folder to root
    const path: Array<{ _id: Id<"folders">; name: string }> = [];
    let current: Doc<"folders"> | null = folder;

    while (current) {
      path.unshift({ _id: current._id, name: current.name });
      if (current.parentId) {
        current = await ctx.db.get(current.parentId);
      } else {
        break;
      }
    }

    // Get service type if folder has one
    let serviceType: Doc<"serviceTypes"> | null = null;
    if (folder.serviceTypeId) {
      serviceType = await ctx.db.get(folder.serviceTypeId);
    }

    return { path, serviceType };
  },
});

/**
 * Get a single folder
 */
export const get = query({
  args: {
    id: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const folder = await ctx.db.get(args.id);

    if (!folder) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (folder.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Get document count
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
      .collect();
    const documentCount = docs.filter((d) => !d.isDeleted).length;

    // Get service type
    let serviceType: Doc<"serviceTypes"> | null = null;
    if (folder.serviceTypeId) {
      serviceType = await ctx.db.get(folder.serviceTypeId);
    }

    return {
      ...folder,
      documentCount,
      serviceType,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new folder
 * Note: We enforce 2-level max hierarchy (Service → Folder → Documents)
 * So parentId should not be used for nested subfolders
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    serviceTypeId: v.optional(v.id("serviceTypes")),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check access
    if (user.role === "client") {
      if (args.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate service type if provided
    if (args.serviceTypeId) {
      const serviceType = await ctx.db.get(args.serviceTypeId);
      if (!serviceType || !serviceType.isActive) {
        throw new Error("Invalid service type");
      }

      // For clients, verify they have access to this service
      if (user.role === "client") {
        const subscription = await ctx.db
          .query("clientSubscriptions")
          .withIndex("by_org_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", "active")
          )
          .filter((q) => q.eq(q.field("serviceTypeId"), args.serviceTypeId!))
          .first();

        if (!subscription) {
          throw new Error("You do not have access to this service");
        }
      }
    }

    // Enforce 2-level hierarchy: no nested subfolders
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent) {
        throw new Error("Parent folder not found");
      }
      if (parent.parentId) {
        throw new Error("Nested subfolders are not allowed. Maximum folder depth is 2 levels.");
      }
      if (parent.organizationId.toString() !== args.organizationId.toString()) {
        throw new Error("Parent folder belongs to different organization");
      }
      // Inherit service type from parent
      if (!args.serviceTypeId && parent.serviceTypeId) {
        args.serviceTypeId = parent.serviceTypeId;
      }
    }

    // Validate name
    if (!args.name.trim()) {
      throw new Error("Folder name is required");
    }
    if (args.name.length > 100) {
      throw new Error("Folder name too long");
    }

    // Check for duplicate name in same location
    const existingFolders = await ctx.db
      .query("folders")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const duplicate = existingFolders.find(
      (f) =>
        f.name.toLowerCase() === args.name.trim().toLowerCase() &&
        f.parentId?.toString() === args.parentId?.toString() &&
        f.serviceTypeId?.toString() === args.serviceTypeId?.toString()
    );

    if (duplicate) {
      throw new Error("A folder with this name already exists in this location");
    }

    const folderId = await ctx.db.insert("folders", {
      organizationId: args.organizationId,
      serviceTypeId: args.serviceTypeId,
      name: args.name.trim(),
      description: args.description?.trim(),
      color: args.color,
      parentId: args.parentId,
      createdAt: Date.now(),
      createdBy: user._id,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "created_folder",
      resourceType: "folder",
      resourceId: folderId,
      resourceName: args.name.trim(),
      createdAt: Date.now(),
    });

    return folderId;
  },
});

/**
 * Update a folder
 */
export const update = mutation({
  args: {
    id: v.id("folders"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const folder = await ctx.db.get(args.id);

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Check access
    if (user.role === "client") {
      if (folder.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate name if changing
    if (args.name !== undefined) {
      if (!args.name.trim()) {
        throw new Error("Folder name is required");
      }
      if (args.name.length > 100) {
        throw new Error("Folder name too long");
      }

      // Check for duplicate
      const existingFolders = await ctx.db
        .query("folders")
        .withIndex("by_organization", (q) => q.eq("organizationId", folder.organizationId))
        .collect();

      const duplicate = existingFolders.find(
        (f) =>
          f._id.toString() !== args.id.toString() &&
          f.name.toLowerCase() === args.name!.trim().toLowerCase() &&
          f.parentId?.toString() === folder.parentId?.toString() &&
          f.serviceTypeId?.toString() === folder.serviceTypeId?.toString()
      );

      if (duplicate) {
        throw new Error("A folder with this name already exists in this location");
      }
    }

    const updates: Partial<typeof folder> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.description !== undefined) updates.description = args.description?.trim();
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.id, updates);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: folder.organizationId,
      userId: user._id,
      action: "updated_folder",
      resourceType: "folder",
      resourceId: args.id,
      resourceName: args.name?.trim() ?? folder.name,
      createdAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Move a folder to a different parent
 * Note: With 2-level hierarchy, this is limited
 */
export const move = mutation({
  args: {
    id: v.id("folders"),
    newParentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const folder = await ctx.db.get(args.id);

    if (!folder) {
      throw new Error("Folder not found");
    }

    // If moving to a parent, validate
    if (args.newParentId) {
      const newParent = await ctx.db.get(args.newParentId);
      if (!newParent) {
        throw new Error("New parent folder not found");
      }
      if (newParent.organizationId.toString() !== folder.organizationId.toString()) {
        throw new Error("Cannot move folder to different organization");
      }
      // Enforce 2-level hierarchy
      if (newParent.parentId) {
        throw new Error("Cannot create nested subfolders. Maximum depth is 2 levels.");
      }
      // Prevent moving to self
      if (args.newParentId.toString() === args.id.toString()) {
        throw new Error("Cannot move folder into itself");
      }
    }

    await ctx.db.patch(args.id, {
      parentId: args.newParentId,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: folder.organizationId,
      userId: user._id,
      action: "moved_folder",
      resourceType: "folder",
      resourceId: args.id,
      resourceName: folder.name,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a folder (must be empty)
 */
export const remove = mutation({
  args: {
    id: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const folder = await ctx.db.get(args.id);

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Check access
    if (user.role === "client") {
      if (folder.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Check if folder has documents
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.id))
      .first();

    if (docs && !docs.isDeleted) {
      throw new Error("Cannot delete folder that contains documents. Please move or delete documents first.");
    }

    // Check if folder has subfolders
    const subfolders = await ctx.db
      .query("folders")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .first();

    if (subfolders) {
      throw new Error("Cannot delete folder that contains subfolders. Please delete subfolders first.");
    }

    await ctx.db.delete(args.id);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: folder.organizationId,
      userId: user._id,
      action: "deleted_folder",
      resourceType: "folder",
      resourceId: args.id,
      resourceName: folder.name,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Change a folder's service type
 */
export const changeService = mutation({
  args: {
    id: v.id("folders"),
    serviceTypeId: v.optional(v.id("serviceTypes")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const folder = await ctx.db.get(args.id);

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Validate new service type if provided
    if (args.serviceTypeId) {
      const serviceType = await ctx.db.get(args.serviceTypeId);
      if (!serviceType || !serviceType.isActive) {
        throw new Error("Invalid service type");
      }
    }

    await ctx.db.patch(args.id, {
      serviceTypeId: args.serviceTypeId,
    });

    // Also update all documents in this folder to match
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.id))
      .collect();

    for (const doc of docs) {
      await ctx.db.patch(doc._id, {
        serviceTypeId: args.serviceTypeId,
      });
    }

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: folder.organizationId,
      userId: user._id,
      action: "changed_folder_service",
      resourceType: "folder",
      resourceId: args.id,
      resourceName: folder.name,
      metadata: { newServiceTypeId: args.serviceTypeId, documentsUpdated: docs.length },
      createdAt: Date.now(),
    });

    return { success: true, documentsUpdated: docs.length };
  },
});
