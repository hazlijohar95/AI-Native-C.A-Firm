# Client Portal Roadmap
## Amjad & Hazli - AI-Native Chartered Accounting Firm

> **Status:** Enhancement Phase 2 Complete
> **Last Updated:** 2026-01-24
> **Current Phase:** Production with Enhancements

---

## Executive Summary

A secure client portal for Amjad & Hazli's accounting clients to access documents, view tasks, receive announcements, pay invoices, and sign documents electronically.

**Target URL:** `portal.amjadhazli.com`

---

## Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| **Frontend** | React 19 + Vite 7 | Fast SPA, excellent Convex integration |
| **Routing** | React Router v7 | Standard, well-supported |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Utility-first, beautiful components |
| **Forms** | React Hook Form + Zod | Type-safe validation |
| **Backend** | Convex | Real-time, serverless, TypeScript-native |
| **Auth** | WorkOS AuthKit | Google OAuth, email/password, enterprise SSO ready |
| **Auth Integration** | @convex-dev/workos-authkit | Official Convex component for user sync |
| **File Storage** | Convex Storage (R2 ready) | Built-in storage, R2 integration scaffolded |
| **Email** | Resend (scaffolded) | Developer-friendly, React templates |
| **Payments** | Stripe (scaffolded) | Industry standard |
| **Hosting** | Cloudflare Pages | Fast edge network, generous free tier |

---

## Implementation Phases

### Phase 1: Foundation
**Status:** Complete

- [x] Project setup (Vite + React + TypeScript + Tailwind + shadcn/ui)
- [x] Convex initialization and schema deployment
- [x] WorkOS AuthKit integration (Google OAuth)
- [x] Basic layout (shell, navigation, responsive sidebar)
- [x] User management (sync WorkOS to Convex)
- [x] Login, callback, dashboard pages

**Deliverable:** Users can sign up, log in, see dashboard

---

### Phase 2: Core Features
**Status:** Complete

- [x] Document management (upload placeholder, download placeholder, categories)
- [x] Task system (create, assign, complete, due dates, priorities)
- [x] Announcements (create, view, read tracking, pinned, targeted)
- [x] In-portal notifications (real-time, notification bell)
- [x] Dashboard with real data (status cards, activity feed)
- [x] Toast notifications (sonner)
- [x] Delete confirmation dialogs
- [x] Loading states with spinners

**Deliverable:** Functional client portal (except payments/signatures)

---

### Phase 3: Payments & Signatures
**Status:** Complete

- [x] Invoice schema (invoices, payments tables)
- [x] Invoice backend (CRUD, queries, status management)
- [x] Invoice UI (list, details, summary cards)
- [x] Stripe checkout session placeholder (ready for Stripe key)
- [x] Manual payment recording (bank transfer, cash)
- [x] E-signature schema (signatureRequests, signatures tables)
- [x] E-signature backend (create request, sign, decline)
- [x] Signature UI with canvas drawing and typed signatures
- [x] Email notifications placeholder (Resend ready)

**Deliverable:** Clients can view invoices, record payments, sign documents

**Note:** Stripe and Resend integrations are scaffolded but require API keys to be configured in Convex environment variables.

---

### Phase 4: Admin Panel
**Status:** Complete

- [x] Admin dashboard (overview, metrics, financial stats)
- [x] Client management (CRUD organizations with delete)
- [x] User management (role assignment, org assignment/removal)
- [x] Invoice management (create, edit drafts, publish, record payments)
- [x] Announcement editor (create, edit, target orgs, scheduled/expired view)
- [x] Audit log viewer (activity with clickable resource links)
- [x] Admin route protection (redirects non-admin users)
- [x] Input validation (email format, name length)
- [x] Proper accessibility (shadcn Checkbox components)

**Deliverable:** Complete admin panel for staff/admin users

**Admin Pages:**
- `/admin` - Dashboard with metrics overview
- `/admin/organizations` - Client organization management (with delete)
- `/admin/users` - User role and org assignment
- `/admin/invoices` - Invoice creation, editing, and payment recording
- `/admin/announcements` - Announcement editor with status filtering
- `/admin/activity` - Activity log viewer with resource links

---

### Phase 5: Polish & Security
**Status:** Complete

- [x] Security audit (rate limiting on sensitive mutations, input sanitization)
- [x] User deactivation workflow (soft delete with proper handling)
- [x] Block deactivated users from portal access
- [x] Filter deactivated users from client-facing queries
- [x] Performance optimization (pagination for activity log, lazy loading admin pages)
- [x] Error boundaries and global error handling
- [x] 404 Not Found page
- [x] E2E tests (Playwright setup with auth, navigation, visual tests)
- [x] Accessibility improvements (skip link, ARIA labels, semantic HTML)
- [x] Confirmation dialogs for destructive actions
- [ ] Onboarding flow for new clients (deferred to Phase 6)
- [ ] User documentation / help pages (deferred to Phase 6)
- [ ] Bulk actions for admin lists (deferred to Phase 6)
- [ ] Export functionality (CSV/Excel) (deferred to Phase 6)

**Deliverable:** Production-ready portal with security hardening and testing

**Key Security Features:**
- Rate limiting on payment recording and document signing
- User deactivation (soft delete) preserving referential integrity
- Deactivated users blocked from all authenticated actions
- Input validation and sanitization throughout

**Testing:**
- Playwright E2E tests for auth flow, navigation, and visual elements
- Run with `npm run test` or `npm run test:ui` for interactive mode

---

### Phase 6: Final Polish
**Status:** Complete

- [x] Onboarding flow for new clients (multi-step wizard)
- [x] Help & documentation pages with FAQ
- [x] Bulk actions for admin lists (select, deactivate multiple)
- [x] CSV export functionality for users and invoices
- [x] File upload using Convex storage (R2 integration ready)
- [x] Stripe payment placeholder (scaffolded, needs API key)
- [x] Accordion component for FAQ
- [x] Improved schema with onboarding fields

**Key Features:**
- New client onboarding: Welcome screen, profile setup, org info, completion
- Help page: Searchable FAQ, categorized by feature, contact info
- Bulk actions: Multi-select in admin users table, bulk deactivate
- CSV export: Export users and invoices with custom column mapping
- File storage: Convex storage with unique keys, ready for R2 migration

---

### Enhancement Phase 1: Collaboration & Notifications
**Status:** Complete

Core improvements for accounting firm workflows based on product audit.

- [x] **Document Request Workflow** - Admin can request specific documents from clients
  - New `documentRequests` table for tracking requests
  - Request creation UI in admin documents page
  - Client-facing pending requests view with upload capability
  - Status tracking: pending → uploaded → reviewed/rejected
  - Category and due date support

- [x] **Task Comments** - Collaboration on task items
  - New `taskComments` table with proper indexing
  - Comment threads in task detail dialogs (client and admin)
  - Author attribution and timestamps
  - Pagination with 100-comment default limit
  - Error handling preserves comment text on failure

- [x] **Email Notifications via Resend** - Transactional email system
  - Document request notifications (new request, approved, rejected)
  - Task assignment and comment notifications
  - Invoice creation notifications
  - Signature request notifications
  - Announcement notifications
  - **User email preferences** with per-category opt-out toggles
  - Settings page integration for notification management

- [x] **Document Preview for Signatures** - Compliance requirement
  - Two-step signing flow: preview document → then sign
  - PDF/image preview in modal with fullscreen option
  - Audit trail logging for document preview
  - Preview timestamp recorded before signature

- [x] **Code Quality Improvements**
  - Fixed React hook usage (useState → useEffect for side effects)
  - Added email preference checking before all sends
  - Implemented pagination for unbounded queries
  - Improved error handling with user-friendly messages

**Key Files Added/Modified:**
- `convex/documentRequests.ts` - Document request backend
- `convex/emails.ts` - Resend email integration with preferences
- `convex/tasks.ts` - Task comments mutations/queries
- `convex/signatures.ts` - Document preview action
- `convex/users.ts` - Email preferences management
- `portal/src/pages/Documents.tsx` - Request fulfillment UI
- `portal/src/pages/Tasks.tsx` - Comment threads
- `portal/src/pages/Signatures.tsx` - Two-step preview flow
- `portal/src/pages/Settings.tsx` - Email preferences UI

---

### Enhancement Phase 2: Service-Based Document Management
**Status:** Complete

Major restructuring of document management with service-based organization.

- [x] **Service Types System** - Categorize documents by accounting services
  - New `serviceTypes` table for service definitions (Tax Returns, Bookkeeping, etc.)
  - Service icons and colors with admin configuration
  - Admin service management page (`/admin/services`)

- [x] **Client Subscriptions** - Track which services each client subscribes to
  - New `clientSubscriptions` table linking organizations to services
  - Admin UI for managing client service subscriptions
  - Service-filtered document views

- [x] **Folder Organization** - Hierarchical document storage
  - New `folders` table with parent/child relationships
  - Folder browser with breadcrumb navigation
  - Create, rename, delete folders within services
  - Color-coded folders with document counts

- [x] **Document Versioning** - Track document history
  - New `documentVersions` table for version tracking
  - Version history modal with download access
  - Automatic version incrementing on re-upload

- [x] **Enhanced Document UI** - Completely redesigned document experience
  - Service tabs navigation with document counts
  - Service overview grid showing all subscribed services
  - Folder browser with visual hierarchy
  - Document cards with service badges and metadata
  - Category and search filtering
  - Preview modal for PDFs and images

- [x] **Code Refactoring** - Major code quality improvements
  - Extracted `UploadDocumentDialog` component (~620 lines → separate file)
  - Reduced `Documents.tsx` from 1,335 lines to 705 lines (47% reduction)
  - Centralized constants: `lib/constants/services.ts`, `lib/constants/categories.ts`
  - Created `useTableFilters` hook for reusable table filtering
  - Added missing UI components: `switch.tsx`, `sheet.tsx`

**Key Files Added:**
- `convex/serviceTypes.ts` - Service type CRUD operations
- `convex/subscriptions.ts` - Client subscription management
- `convex/folders.ts` - Folder CRUD with breadcrumb queries
- `src/pages/admin/AdminServices.tsx` - Service management admin page
- `src/components/documents/UploadDocumentDialog.tsx` - Extracted upload dialog
- `src/components/documents/ServiceTabsNav.tsx` - Service tab navigation
- `src/components/documents/ServiceOverviewCard.tsx` - Service overview grid
- `src/components/documents/FolderCard.tsx` - Folder display components
- `src/components/documents/FolderBrowser.tsx` - Folder navigation
- `src/components/documents/Breadcrumb.tsx` - Breadcrumb navigation
- `src/components/documents/DocumentVersionHistory.tsx` - Version history modal
- `src/lib/constants/services.ts` - Service icon/color mappings
- `src/lib/constants/categories.ts` - Document category constants
- `src/hooks/useTableFilters.ts` - Reusable table filtering hook

**Schema Changes:**
- Added `serviceTypes` table with icon, color, displayOrder
- Added `clientSubscriptions` table linking orgs to services
- Added `folders` table with parentId for hierarchy
- Added `documentVersions` table for version history
- Updated `documents` table with serviceTypeId, folderId, currentVersion

---

## Future Enhancements

### Enhancement Phase 3 (Planned)
- [ ] Task reminders & due date alerts (cron jobs)
- [ ] Stripe payment integration (payment links, webhooks)
- [ ] Document search (full-text on name/description)

### Enhancement Phase 4 (Planned)
- [ ] Task templates for common workflows
- [ ] Recurring tasks (weekly, monthly, quarterly)
- [ ] Client financial summary dashboard
- [ ] Multi-party signatures

### Enhancement Phase 5 (Planned)
- [ ] Advanced bulk operations (assign, update, status change)
- [ ] Client onboarding templates
- [ ] Activity analytics and reporting

### Other Future Items
- [ ] R2 direct upload with presigned URLs (when bucket configured)
- [ ] Dark mode support
- [ ] Mobile app (React Native)
- [ ] Two-factor authentication

---

## Changelog

| Date | Phase | Changes |
|------|-------|---------|
| 2026-01-24 | Enhancement 2 | Added service types system for document categorization |
| 2026-01-24 | Enhancement 2 | Added client subscriptions linking clients to services |
| 2026-01-24 | Enhancement 2 | Added folder organization with hierarchical navigation |
| 2026-01-24 | Enhancement 2 | Added document versioning with history modal |
| 2026-01-24 | Enhancement 2 | Redesigned Documents page with service tabs and folder browser |
| 2026-01-24 | Enhancement 2 | Major code refactoring: extracted components, centralized constants |
| 2026-01-24 | Enhancement 2 | Created admin service management page |
| 2026-01-24 | Enhancement 1 | Added document request workflow with status tracking |
| 2026-01-24 | Enhancement 1 | Added task comments for collaboration |
| 2026-01-24 | Enhancement 1 | Implemented Resend email notifications with user preferences |
| 2026-01-24 | Enhancement 1 | Added two-step signature flow with document preview |
| 2026-01-24 | Enhancement 1 | Code review fixes: email preferences, React hooks, pagination |
| 2026-01-21 | Phase 6 | Added onboarding wizard, help pages, bulk actions, CSV export |
| 2026-01-21 | Phase 5 | Added Playwright E2E testing setup with auth and navigation tests |
| 2026-01-21 | Phase 5 | Added accessibility: skip link, ARIA labels, semantic HTML |
| 2026-01-21 | Phase 5 | Added cursor-based pagination for activity log |
| 2026-01-21 | Phase 5 | Added user deactivation with admin UI, rate limiting, error handling |
| 2026-01-21 | Phase 4 | Phase 4 review fixes: edit drafts, delete orgs, activity links, proper checkboxes |
| 2026-01-21 | Phase 4 | Phase 4 security fixes: admin route protection, email validation, form state management |
| 2026-01-21 | Phase 4 | Completed Phase 4: Admin dashboard, clients, users, invoices, announcements, activity log |
| 2026-01-21 | Phase 3 | Completed Phase 3: Invoices, Payments, E-Signatures |
| 2026-01-21 | Phase 2 | Completed Phase 2: Added toast notifications, delete confirmations, spinner loading states |
| 2026-01-21 | Phase 2 | Built Documents, Tasks, Announcements, Notifications with proper UX |
| 2026-01-21 | Phase 2 | Started Phase 2: Core Features |
| 2026-01-21 | Phase 1 | Completed Phase 1: Foundation |
| 2026-01-21 | Phase 1 | Implemented WorkOS AuthKit, Dashboard, Login |
| 2026-01-21 | Planning | Initial roadmap created |
