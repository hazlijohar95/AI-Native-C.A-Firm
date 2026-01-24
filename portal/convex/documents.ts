import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";

// Document categories for filtering
export const categories = [
  { value: "tax_return", label: "Tax Returns" },
  { value: "financial_statement", label: "Financial Statements" },
  { value: "invoice", label: "Invoices" },
  { value: "agreement", label: "Agreements" },
  { value: "receipt", label: "Receipts" },
  { value: "other", label: "Other" },
] as const;

// Fiscal periods for filtering
export const fiscalPeriods = [
  { value: "Q1", label: "Q1 (Jan-Mar)" },
  { value: "Q2", label: "Q2 (Apr-Jun)" },
  { value: "Q3", label: "Q3 (Jul-Sep)" },
  { value: "Q4", label: "Q4 (Oct-Dec)" },
  { value: "Jan", label: "January" },
  { value: "Feb", label: "February" },
  { value: "Mar", label: "March" },
  { value: "Apr", label: "April" },
  { value: "May", label: "May" },
  { value: "Jun", label: "June" },
  { value: "Jul", label: "July" },
  { value: "Aug", label: "August" },
  { value: "Sep", label: "September" },
  { value: "Oct", label: "October" },
  { value: "Nov", label: "November" },
  { value: "Dec", label: "December" },
  { value: "Annual", label: "Annual" },
] as const;

// ============================================
// QUERIES
// ============================================

// List documents for current user's organization
export const list = query({
  args: {
    category: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    serviceTypeId: v.optional(v.id("serviceTypes")),
    fiscalYear: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("uploadedAt"), v.literal("name"), v.literal("size"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Admin/staff can see all, clients only see their org
    if (user.role === "client" && !user.organizationId) {
      return [];
    }

    let docsQuery;

    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all documents (later can filter by org)
      docsQuery = ctx.db.query("documents");
    } else {
      // Clients only see their organization's documents
      docsQuery = ctx.db
        .query("documents")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!));
    }

    let docs = await docsQuery.collect();

    // Filter out deleted
    docs = docs.filter((d) => !d.isDeleted);

    // Filter by service type if specified
    if (args.serviceTypeId) {
      docs = docs.filter((d) => d.serviceTypeId?.toString() === args.serviceTypeId?.toString());
    }

    // Filter by category if specified
    if (args.category) {
      docs = docs.filter((d) => d.category === args.category);
    }

    // Filter by folder if specified
    if (args.folderId !== undefined) {
      docs = docs.filter((d) => d.folderId === args.folderId);
    }

    // Filter by fiscal year if specified
    if (args.fiscalYear) {
      docs = docs.filter((d) => d.fiscalYear === args.fiscalYear);
    }

    // Search by name or description
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      docs = docs.filter((d) =>
        d.name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
      );
    }

    // Sort
    const sortBy = args.sortBy ?? "uploadedAt";
    const sortOrder = args.sortOrder ?? "desc";
    docs.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "uploadedAt") {
        comparison = a.uploadedAt - b.uploadedAt;
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "size") {
        comparison = a.size - b.size;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Apply limit
    if (args.limit && args.limit > 0) {
      docs = docs.slice(0, args.limit);
    }

    return docs;
  },
});

// List documents by service type with enhanced filtering
export const listByService = query({
  args: {
    serviceTypeId: v.optional(v.id("serviceTypes")),
    organizationId: v.optional(v.id("organizations")),
    folderId: v.optional(v.id("folders")),
    category: v.optional(v.string()),
    fiscalYear: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sortBy: v.optional(v.union(v.literal("uploadedAt"), v.literal("name"), v.literal("size"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Determine organization scope
    let orgId: Id<"organizations"> | undefined;
    if (user.role === "client") {
      if (!user.organizationId) return { documents: [], total: 0 };
      orgId = user.organizationId;
    } else if (args.organizationId) {
      orgId = args.organizationId;
    }

    // Base query
    let docs: Doc<"documents">[];
    if (orgId) {
      if (args.serviceTypeId) {
        docs = await ctx.db
          .query("documents")
          .withIndex("by_service", (q) =>
            q.eq("organizationId", orgId!).eq("serviceTypeId", args.serviceTypeId!)
          )
          .collect();
      } else {
        docs = await ctx.db
          .query("documents")
          .withIndex("by_organization", (q) => q.eq("organizationId", orgId!))
          .collect();
      }
    } else {
      docs = await ctx.db.query("documents").collect();
    }

    // Filter out deleted
    docs = docs.filter((d) => !d.isDeleted);

    // Apply filters
    if (args.serviceTypeId && !orgId) {
      docs = docs.filter((d) => d.serviceTypeId?.toString() === args.serviceTypeId?.toString());
    }
    if (args.category) {
      docs = docs.filter((d) => d.category === args.category);
    }
    if (args.folderId !== undefined) {
      docs = docs.filter((d) => d.folderId === args.folderId);
    }
    if (args.fiscalYear) {
      docs = docs.filter((d) => d.fiscalYear === args.fiscalYear);
    }
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      docs = docs.filter((d) =>
        d.name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
      );
    }

    // Filter by tags if specified
    if (args.tags && args.tags.length > 0) {
      const docIds = docs.map((d) => d._id);
      const allTags = await ctx.db.query("documentTags").collect();
      const taggedDocIds = new Set(
        allTags
          .filter((t) => args.tags!.includes(t.tag.toLowerCase()) && docIds.includes(t.documentId))
          .map((t) => t.documentId.toString())
      );
      docs = docs.filter((d) => taggedDocIds.has(d._id.toString()));
    }

    const total = docs.length;

    // Sort
    const sortBy = args.sortBy ?? "uploadedAt";
    const sortOrder = args.sortOrder ?? "desc";
    docs.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "uploadedAt") {
        comparison = a.uploadedAt - b.uploadedAt;
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "size") {
        comparison = a.size - b.size;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Pagination
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 50;
    docs = docs.slice(offset, offset + limit);

    // Fetch tags for each document
    const docsWithTags = await Promise.all(
      docs.map(async (doc) => {
        const tags = await ctx.db
          .query("documentTags")
          .withIndex("by_document", (q) => q.eq("documentId", doc._id))
          .collect();
        return {
          ...doc,
          tags: tags.map((t) => t.tag),
        };
      })
    );

    return { documents: docsWithTags, total };
  },
});

// Get document statistics per service type
export const getServiceStats = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
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

    // Get all service types
    const serviceTypes = await ctx.db
      .query("serviceTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get documents
    let docs: Doc<"documents">[];
    if (orgId) {
      docs = await ctx.db
        .query("documents")
        .withIndex("by_organization", (q) => q.eq("organizationId", orgId!))
        .collect();
    } else {
      docs = await ctx.db.query("documents").collect();
    }

    // Filter out deleted
    docs = docs.filter((d) => !d.isDeleted);

    // Get folders count per service
    let folders: Doc<"folders">[];
    if (orgId) {
      folders = await ctx.db
        .query("folders")
        .withIndex("by_organization", (q) => q.eq("organizationId", orgId!))
        .collect();
    } else {
      folders = await ctx.db.query("folders").collect();
    }

    // Calculate stats per service type
    const stats = serviceTypes
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((serviceType) => {
        const serviceDocs = docs.filter(
          (d) => d.serviceTypeId?.toString() === serviceType._id.toString()
        );
        const serviceFolders = folders.filter(
          (f) => f.serviceTypeId?.toString() === serviceType._id.toString()
        );
        const lastUpload = serviceDocs.length > 0
          ? Math.max(...serviceDocs.map((d) => d.uploadedAt))
          : null;

        return {
          serviceType,
          documentCount: serviceDocs.length,
          folderCount: serviceFolders.length,
          totalSize: serviceDocs.reduce((sum, d) => sum + d.size, 0),
          lastUploadAt: lastUpload,
        };
      });

    // Also include documents without service type
    const unassignedDocs = docs.filter((d) => !d.serviceTypeId);
    if (unassignedDocs.length > 0) {
      stats.push({
        serviceType: {
          _id: null as unknown as Id<"serviceTypes">,
          code: "unassigned",
          name: "Uncategorized",
          description: "Documents without service assignment",
          icon: "FolderOpen",
          color: "gray",
          displayOrder: 999,
          isActive: true,
          createdAt: 0,
          createdBy: null as unknown as Id<"users">,
        },
        documentCount: unassignedDocs.length,
        folderCount: 0,
        totalSize: unassignedDocs.reduce((sum, d) => sum + d.size, 0),
        lastUploadAt: Math.max(...unassignedDocs.map((d) => d.uploadedAt)),
      });
    }

    return stats;
  },
});

// Search documents across all services
export const search = query({
  args: {
    query: v.string(),
    organizationId: v.optional(v.id("organizations")),
    serviceTypeId: v.optional(v.id("serviceTypes")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    if (!args.query.trim()) {
      return { results: [], total: 0 };
    }

    // Determine organization scope
    let orgId: Id<"organizations"> | undefined;
    if (user.role === "client") {
      if (!user.organizationId) return { results: [], total: 0 };
      orgId = user.organizationId;
    } else if (args.organizationId) {
      orgId = args.organizationId;
    }

    // Get documents
    let docs: Doc<"documents">[];
    if (orgId) {
      docs = await ctx.db
        .query("documents")
        .withIndex("by_organization", (q) => q.eq("organizationId", orgId!))
        .collect();
    } else {
      docs = await ctx.db.query("documents").collect();
    }

    // Filter out deleted
    docs = docs.filter((d) => !d.isDeleted);

    // Filter by service if specified
    if (args.serviceTypeId) {
      docs = docs.filter((d) => d.serviceTypeId?.toString() === args.serviceTypeId?.toString());
    }

    // Search in name, description, and tags
    const searchQuery = args.query.toLowerCase();

    // Get all tags
    const allTags = await ctx.db.query("documentTags").collect();
    const tagsByDoc = new Map<string, string[]>();
    for (const tag of allTags) {
      const docId = tag.documentId.toString();
      if (!tagsByDoc.has(docId)) {
        tagsByDoc.set(docId, []);
      }
      tagsByDoc.get(docId)!.push(tag.tag);
    }

    // Filter and score results
    const results = docs
      .map((doc) => {
        const docTags = tagsByDoc.get(doc._id.toString()) || [];
        const nameMatch = doc.name.toLowerCase().includes(searchQuery);
        const descMatch = doc.description?.toLowerCase().includes(searchQuery);
        const tagMatch = docTags.some((t) => t.toLowerCase().includes(searchQuery));

        if (!nameMatch && !descMatch && !tagMatch) {
          return null;
        }

        // Score: name matches highest, then description, then tags
        let score = 0;
        if (nameMatch) score += 3;
        if (descMatch) score += 2;
        if (tagMatch) score += 1;

        return { ...doc, tags: docTags, score };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.score - a.score);

    const total = results.length;
    const limit = args.limit ?? 20;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const limitedResults = results.slice(0, limit).map(({ score, ...doc }) => doc);

    // Group by service type for display
    const serviceTypes = await ctx.db
      .query("serviceTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    const serviceMap = new Map(serviceTypes.map((s) => [s._id.toString(), s]));

    const groupedByService = limitedResults.reduce(
      (acc, doc) => {
        const serviceId = doc.serviceTypeId?.toString() ?? "unassigned";
        if (!acc[serviceId]) {
          acc[serviceId] = {
            serviceType: doc.serviceTypeId ? serviceMap.get(serviceId) : null,
            documents: [],
          };
        }
        acc[serviceId].documents.push(doc);
        return acc;
      },
      {} as Record<string, { serviceType: Doc<"serviceTypes"> | null; documents: typeof limitedResults }>
    );

    return {
      results: limitedResults,
      groupedByService: Object.values(groupedByService),
      total,
    };
  },
});

// Get single document
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.isDeleted) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    return doc;
  },
});

// Get download URL for a document (query version for reactive updates)
export const getDownloadUrl = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.isDeleted) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        return null;
      }
    }

    // Get URL from Convex storage
    if (doc.convexStorageId) {
      const url = await ctx.storage.getUrl(doc.convexStorageId as Id<"_storage">);
      return url;
    }

    return null;
  },
});

// Count documents for dashboard
export const count = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    if (user.role === "client" && !user.organizationId) {
      return 0;
    }

    let docs;
    if (user.role === "admin" || user.role === "staff") {
      docs = await ctx.db.query("documents").collect();
    } else {
      docs = await ctx.db
        .query("documents")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
    }

    return docs.filter((d) => !d.isDeleted).length;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Create document record (after successful upload)
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageKey: v.string(),
    convexStorageId: v.optional(v.string()), // For Convex storage fallback
    category: v.union(
      v.literal("tax_return"),
      v.literal("financial_statement"),
      v.literal("invoice"),
      v.literal("agreement"),
      v.literal("receipt"),
      v.literal("other")
    ),
    folderId: v.optional(v.id("folders")),
    // New fields for enhanced document metadata
    serviceTypeId: v.optional(v.id("serviceTypes")),
    description: v.optional(v.string()),
    fiscalYear: v.optional(v.string()),
    fiscalPeriod: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Verify user has access to this organization
    if (user.role === "client") {
      if (args.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate service type if provided
    if (args.serviceTypeId) {
      const serviceType = await ctx.db.get(args.serviceTypeId);
      if (!serviceType) {
        throw new Error("Service type not found");
      }
      if (!serviceType.isActive) {
        throw new Error("Service type is not active");
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
          throw new Error("Your organization does not have access to this service");
        }
      }
    }

    // Validate folder if provided
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) {
        throw new Error("Folder not found");
      }
      if (folder.organizationId.toString() !== args.organizationId.toString()) {
        throw new Error("Folder belongs to different organization");
      }
      // If folder has a service type, document should match
      if (folder.serviceTypeId && args.serviceTypeId) {
        if (folder.serviceTypeId.toString() !== args.serviceTypeId.toString()) {
          throw new Error("Document service type must match folder service type");
        }
      }
    }

    // Validate inputs
    if (!args.name.trim()) {
      throw new Error("Document name is required");
    }
    if (args.name.length > 255) {
      throw new Error("Document name too long");
    }

    const docId = await ctx.db.insert("documents", {
      organizationId: args.organizationId,
      folderId: args.folderId,
      serviceTypeId: args.serviceTypeId,
      name: args.name.trim(),
      type: args.type,
      size: args.size,
      storageKey: args.storageKey,
      convexStorageId: args.convexStorageId,
      category: args.category,
      description: args.description?.trim(),
      fiscalYear: args.fiscalYear,
      fiscalPeriod: args.fiscalPeriod,
      currentVersion: 1,
      uploadedBy: user._id,
      uploadedAt: Date.now(),
    });

    // Create initial version record
    await ctx.db.insert("documentVersions", {
      documentId: docId,
      version: 1,
      storageKey: args.storageKey,
      convexStorageId: args.convexStorageId,
      size: args.size,
      uploadedBy: user._id,
      uploadedAt: Date.now(),
      changeNote: "Initial upload",
    });

    // Create tags if provided
    if (args.tags && args.tags.length > 0) {
      for (const tag of args.tags) {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag) {
          await ctx.db.insert("documentTags", {
            documentId: docId,
            tag: normalizedTag,
            createdAt: Date.now(),
            createdBy: user._id,
          });
        }
      }
    }

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "uploaded_document",
      resourceType: "document",
      resourceId: docId,
      resourceName: args.name.trim(),
      metadata: {
        serviceTypeId: args.serviceTypeId,
        category: args.category,
        fiscalYear: args.fiscalYear,
      },
      createdAt: Date.now(),
    });

    // Create notification for admins/staff (inline to avoid circular dependency)
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
      .collect();

    for (const admin of admins) {
      if (admin._id.toString() !== user._id.toString()) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "new_document",
          title: "New Document Uploaded",
          message: `${user.name} uploaded "${args.name.trim()}"`,
          link: `/documents`,
          relatedId: docId,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return docId;
  },
});

// Soft delete document
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Only admin/staff can delete, or clients can delete their own uploads
    if (user.role === "client") {
      if (doc.uploadedBy.toString() !== user._id.toString()) {
        throw new Error("Access denied");
      }
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: doc.organizationId,
      userId: user._id,
      action: "deleted_document",
      resourceType: "document",
      resourceId: args.id,
      resourceName: doc.name,
      createdAt: Date.now(),
    });
  },
});

// Update document metadata
export const update = mutation({
  args: {
    id: v.id("documents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("tax_return"),
        v.literal("financial_statement"),
        v.literal("invoice"),
        v.literal("agreement"),
        v.literal("receipt"),
        v.literal("other")
      )
    ),
    serviceTypeId: v.optional(v.id("serviceTypes")),
    folderId: v.optional(v.id("folders")),
    fiscalYear: v.optional(v.string()),
    fiscalPeriod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate service type if changing
    if (args.serviceTypeId !== undefined) {
      if (args.serviceTypeId) {
        const serviceType = await ctx.db.get(args.serviceTypeId);
        if (!serviceType || !serviceType.isActive) {
          throw new Error("Invalid service type");
        }
      }
    }

    // Validate folder if changing
    if (args.folderId !== undefined && args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) {
        throw new Error("Folder not found");
      }
      if (folder.organizationId.toString() !== doc.organizationId.toString()) {
        throw new Error("Folder belongs to different organization");
      }
    }

    const updates: Partial<typeof doc> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.description !== undefined) updates.description = args.description?.trim();
    if (args.category !== undefined) updates.category = args.category;
    if (args.serviceTypeId !== undefined) updates.serviceTypeId = args.serviceTypeId;
    if (args.folderId !== undefined) updates.folderId = args.folderId;
    if (args.fiscalYear !== undefined) updates.fiscalYear = args.fiscalYear;
    if (args.fiscalPeriod !== undefined) updates.fiscalPeriod = args.fiscalPeriod;

    await ctx.db.patch(args.id, updates);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: doc.organizationId,
      userId: user._id,
      action: "updated_document",
      resourceType: "document",
      resourceId: args.id,
      resourceName: args.name?.trim() ?? doc.name,
      createdAt: Date.now(),
    });

    return args.id;
  },
});

// Add tags to a document
export const addTags = mutation({
  args: {
    documentId: v.id("documents"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Get existing tags
    const existingTags = await ctx.db
      .query("documentTags")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    const existingTagSet = new Set(existingTags.map((t) => t.tag));

    // Add new tags
    const addedTags: string[] = [];
    for (const tag of args.tags) {
      const normalizedTag = tag.toLowerCase().trim();
      if (normalizedTag && !existingTagSet.has(normalizedTag)) {
        await ctx.db.insert("documentTags", {
          documentId: args.documentId,
          tag: normalizedTag,
          createdAt: Date.now(),
          createdBy: user._id,
        });
        addedTags.push(normalizedTag);
      }
    }

    return { added: addedTags.length, tags: addedTags };
  },
});

// Remove tags from a document
export const removeTags = mutation({
  args: {
    documentId: v.id("documents"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    const tagsToRemove = new Set(args.tags.map((t) => t.toLowerCase().trim()));
    const existingTags = await ctx.db
      .query("documentTags")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    let removed = 0;
    for (const tag of existingTags) {
      if (tagsToRemove.has(tag.tag)) {
        await ctx.db.delete(tag._id);
        removed++;
      }
    }

    return { removed };
  },
});

// Get tags for a document
export const getTags = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    const tags = await ctx.db
      .query("documentTags")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    return tags.map((t) => t.tag);
  },
});

// Get version history for a document
export const getVersionHistory = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    const versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    // Fetch uploader names
    const versionsWithUploaders = await Promise.all(
      versions.map(async (v) => {
        const uploader = await ctx.db.get(v.uploadedBy);
        return {
          ...v,
          uploaderName: uploader?.name ?? "Unknown",
        };
      })
    );

    // Sort by version descending
    return versionsWithUploaders.sort((a, b) => b.version - a.version);
  },
});

// Get download URL for a specific version
export const getVersionDownloadUrl = query({
  args: {
    versionId: v.id("documentVersions"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const version = await ctx.db.get(args.versionId);

    if (!version) {
      return null;
    }

    // Get parent document to check access
    const doc = await ctx.db.get(version.documentId);
    if (!doc || doc.isDeleted) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        return null;
      }
    }

    // Get URL from Convex storage
    if (version.convexStorageId) {
      const url = await ctx.storage.getUrl(version.convexStorageId as Id<"_storage">);
      return url;
    }

    return null;
  },
});

// Upload a new version of a document
export const uploadNewVersion = mutation({
  args: {
    documentId: v.id("documents"),
    storageKey: v.string(),
    convexStorageId: v.optional(v.string()),
    size: v.number(),
    changeNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    const newVersion = (doc.currentVersion ?? 1) + 1;

    // Create version record
    await ctx.db.insert("documentVersions", {
      documentId: args.documentId,
      version: newVersion,
      storageKey: args.storageKey,
      convexStorageId: args.convexStorageId,
      size: args.size,
      uploadedBy: user._id,
      uploadedAt: Date.now(),
      changeNote: args.changeNote?.trim(),
    });

    // Update document with new version info
    await ctx.db.patch(args.documentId, {
      storageKey: args.storageKey,
      convexStorageId: args.convexStorageId,
      size: args.size,
      currentVersion: newVersion,
      uploadedBy: user._id,
      uploadedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: doc.organizationId,
      userId: user._id,
      action: "uploaded_new_version",
      resourceType: "document",
      resourceId: args.documentId,
      resourceName: doc.name,
      metadata: { version: newVersion },
      createdAt: Date.now(),
    });

    return { version: newVersion };
  },
});

// Log document access (for audit trail)
export const logAccess = mutation({
  args: {
    documentId: v.id("documents"),
    action: v.union(v.literal("view"), v.literal("download"), v.literal("preview")),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    await ctx.db.insert("documentAccessLogs", {
      documentId: args.documentId,
      userId: user._id,
      action: args.action,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

// Get access logs for a document (admin only)
export const getAccessLogs = query({
  args: {
    documentId: v.id("documents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    const logs = await ctx.db
      .query("documentAccessLogs")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .take(args.limit ?? 50);

    // Fetch user names
    const logsWithUsers = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "Unknown",
        };
      })
    );

    return logsWithUsers;
  },
});

// Move document to a different folder
export const moveToFolder = mutation({
  args: {
    documentId: v.id("documents"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate new folder if provided
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) {
        throw new Error("Folder not found");
      }
      if (folder.organizationId.toString() !== doc.organizationId.toString()) {
        throw new Error("Cannot move document to folder in different organization");
      }
    }

    await ctx.db.patch(args.documentId, {
      folderId: args.folderId,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: doc.organizationId,
      userId: user._id,
      action: "moved_document",
      resourceType: "document",
      resourceId: args.documentId,
      resourceName: doc.name,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Move document to a different service
export const moveToService = mutation({
  args: {
    documentId: v.id("documents"),
    serviceTypeId: v.optional(v.id("serviceTypes")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const doc = await ctx.db.get(args.documentId);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Validate new service type if provided
    if (args.serviceTypeId) {
      const serviceType = await ctx.db.get(args.serviceTypeId);
      if (!serviceType || !serviceType.isActive) {
        throw new Error("Invalid service type");
      }
    }

    await ctx.db.patch(args.documentId, {
      serviceTypeId: args.serviceTypeId,
      folderId: undefined, // Clear folder when changing service
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: doc.organizationId,
      userId: user._id,
      action: "changed_document_service",
      resourceType: "document",
      resourceId: args.documentId,
      resourceName: doc.name,
      metadata: { newServiceTypeId: args.serviceTypeId },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// ACTIONS (for file storage)
// ============================================

// Allowed file types for document uploads
const ALLOWED_FILE_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Text
  "text/plain",
] as const;

// Max file size: 25MB
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Validate file type against allowed list
 */
function validateFileType(contentType: string): { valid: boolean; error?: string } {
  const normalizedType = contentType.toLowerCase().trim();
  
  if (!normalizedType) {
    return { valid: false, error: "File type is required" };
  }
  
  if (!ALLOWED_FILE_TYPES.includes(normalizedType as typeof ALLOWED_FILE_TYPES[number])) {
    return { 
      valid: false, 
      error: `File type "${contentType}" is not allowed. Allowed types: PDF, Word, Excel, CSV, images (JPEG, PNG, GIF, WebP), and plain text.` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate filename
 */
function validateFilename(filename: string): { valid: boolean; error?: string; sanitized: string } {
  if (!filename || !filename.trim()) {
    return { valid: false, error: "Filename is required", sanitized: "" };
  }
  
  if (filename.length > 255) {
    return { valid: false, error: "Filename too long (max 255 characters)", sanitized: "" };
  }
  
  // Check for path traversal attempts
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return { valid: false, error: "Invalid filename", sanitized: "" };
  }
  
  // Sanitize: replace non-alphanumeric chars (except . and -) with underscore
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  
  return { valid: true, sanitized };
}

// Generate upload URL using Convex storage
export const generateUploadUrl = action({
  args: {
    filename: v.string(),
    contentType: v.string(),
    organizationId: v.string(),
    fileSize: v.optional(v.number()), // Optional file size for validation
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Validate file type
    const typeValidation = validateFileType(args.contentType);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    // Validate filename
    const filenameValidation = validateFilename(args.filename);
    if (!filenameValidation.valid) {
      throw new Error(filenameValidation.error);
    }

    // Validate file size if provided
    if (args.fileSize !== undefined) {
      if (args.fileSize <= 0) {
        throw new Error("Invalid file size");
      }
      if (args.fileSize > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
      }
    }

    // Generate a unique storage key
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const storageKey = `documents/${args.organizationId}/${timestamp}-${randomSuffix}-${filenameValidation.sanitized}`;

    // Use Convex's built-in storage (R2 integration can be added later)
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return {
      uploadUrl,
      storageKey,
    };
  },
});

// Get download URL for a document (with authorization check)
// Note: Uses internal query to avoid circular type reference
export const generateDownloadUrl = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args): Promise<{ downloadUrl: string | null; filename: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify user has access to this document via the get query
    // This checks organization access for clients
    const doc = await ctx.runQuery(api.documents.get, { id: args.documentId });
    if (!doc) {
      throw new Error("Document not found or access denied");
    }

    if (!doc.convexStorageId) {
      throw new Error("File not available for download");
    }

    // Use Convex storage URL
    const url = await ctx.storage.getUrl(doc.convexStorageId as Id<"_storage">);
    if (!url) {
      throw new Error("File not found");
    }
    
    return {
      downloadUrl: url,
      filename: doc.name,
    };
  },
});

// ============================================
// DOCUMENT REQUESTS
// ============================================

// List document requests for current user
export const listRequests = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("uploaded"),
      v.literal("reviewed"),
      v.literal("rejected")
    )),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    let requests;

    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all requests
      requests = await ctx.db.query("documentRequests").collect();
    } else if (user.organizationId) {
      // Clients see requests assigned to them
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_client", (q) => q.eq("clientId", user._id))
        .collect();
    } else {
      return [];
    }

    // Filter by status if specified
    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }

    // Sort by due date (soonest first), then by created date
    requests.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });

    return requests;
  },
});

// Get single document request
export const getRequest = query({
  args: { id: v.id("documentRequests") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const request = await ctx.db.get(args.id);

    if (!request) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (request.clientId.toString() !== user._id.toString()) {
        throw new Error("Access denied");
      }
    }

    return request;
  },
});

// Count pending document requests for dashboard
export const countPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    let requests;

    if (user.role === "admin" || user.role === "staff") {
      requests = await ctx.db.query("documentRequests").collect();
      // Admin sees count of uploaded (needs review)
      return requests.filter((r) => r.status === "uploaded").length;
    } else {
      // Clients see count of pending (needs upload)
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_client", (q) => q.eq("clientId", user._id))
        .collect();
      return requests.filter((r) => r.status === "pending" || r.status === "rejected").length;
    }
  },
});

// Create document request (admin/staff only)
export const createRequest = mutation({
  args: {
    organizationId: v.id("organizations"),
    clientId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("tax_return"),
      v.literal("financial_statement"),
      v.literal("invoice"),
      v.literal("agreement"),
      v.literal("receipt"),
      v.literal("other")
    ),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    // Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Validate client exists and belongs to organization
    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new Error("Client not found");
    }
    if (client.role !== "client") {
      throw new Error("User is not a client");
    }
    if (client.organizationId?.toString() !== args.organizationId.toString()) {
      throw new Error("Client does not belong to this organization");
    }

    // Validate title
    if (!args.title.trim()) {
      throw new Error("Request title is required");
    }
    if (args.title.length > 200) {
      throw new Error("Request title too long");
    }

    const requestId = await ctx.db.insert("documentRequests", {
      organizationId: args.organizationId,
      clientId: args.clientId,
      requestedBy: user._id,
      title: args.title.trim(),
      description: args.description?.trim(),
      category: args.category,
      dueDate: args.dueDate,
      status: "pending",
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "requested_document",
      resourceType: "documentRequest",
      resourceId: requestId,
      resourceName: args.title.trim(),
      createdAt: Date.now(),
    });

    // Notify the client
    await ctx.db.insert("notifications", {
      userId: args.clientId,
      type: "new_document",
      title: "Document Requested",
      message: `Please upload: "${args.title.trim()}"`,
      link: `/documents`,
      relatedId: requestId,
      isRead: false,
      createdAt: Date.now(),
    });

    return requestId;
  },
});

// Fulfill document request (client uploads document)
export const fulfillRequest = mutation({
  args: {
    requestId: v.id("documentRequests"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Request not found");
    }

    // Check access - only assigned client can fulfill
    if (user.role === "client") {
      if (request.clientId.toString() !== user._id.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate document exists
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    // Update request
    await ctx.db.patch(args.requestId, {
      status: "uploaded",
      documentId: args.documentId,
      uploadedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: "fulfilled_document_request",
      resourceType: "documentRequest",
      resourceId: args.requestId,
      resourceName: request.title,
      createdAt: Date.now(),
    });

    // Notify admins/staff
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        type: "new_document",
        title: "Document Uploaded",
        message: `${user.name} uploaded "${request.title}" for review`,
        link: `/documents`,
        relatedId: args.requestId,
        isRead: false,
        createdAt: Date.now(),
      });
    }
  },
});

// Review document request (admin/staff only)
export const reviewRequest = mutation({
  args: {
    requestId: v.id("documentRequests"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "uploaded") {
      throw new Error("Request must be in uploaded status to review");
    }

    const newStatus = args.action === "approve" ? "reviewed" : "rejected";

    await ctx.db.patch(args.requestId, {
      status: newStatus,
      reviewNote: args.note?.trim(),
      reviewedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: args.action === "approve" ? "approved_document" : "rejected_document",
      resourceType: "documentRequest",
      resourceId: args.requestId,
      resourceName: request.title,
      createdAt: Date.now(),
    });

    // Notify the client
    await ctx.db.insert("notifications", {
      userId: request.clientId,
      type: "new_document",
      title: args.action === "approve" ? "Document Approved" : "Document Rejected",
      message: args.action === "approve"
        ? `Your document "${request.title}" has been approved`
        : `Your document "${request.title}" needs to be re-uploaded${args.note ? `: ${args.note}` : ""}`,
      link: `/documents`,
      relatedId: args.requestId,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

// Cancel document request (admin/staff only)
export const cancelRequest = mutation({
  args: { id: v.id("documentRequests") },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const request = await ctx.db.get(args.id);

    if (!request) {
      throw new Error("Request not found");
    }

    await ctx.db.delete(args.id);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: "cancelled_document_request",
      resourceType: "documentRequest",
      resourceId: args.id,
      resourceName: request.title,
      createdAt: Date.now(),
    });
  },
});
