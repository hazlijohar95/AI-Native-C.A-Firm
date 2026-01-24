# Client Portal Roadmap
## Amjad & Hazli - AI-Native Chartered Accounting Firm

> **Status:** Mobile Responsive Implementation Complete
> **Last Updated:** 2026-01-25
> **Current Phase:** Production with Full Mobile Support

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

### Enhancement Phase 3: Invoice & Signature Improvements
**Status:** Complete

Security and functionality improvements for invoices and signatures.

- [x] **IP Address Capture for Signatures** - Enhanced audit trail
  - Fetches client IP via ipify.org before signing
  - Stored alongside userAgent for complete audit record
  - Best-effort (signing continues if IP fetch fails)

- [x] **Document Hash Verification** - Integrity protection
  - SHA-256 hash generated when signature request created
  - Hash verified at signing time to detect tampering
  - Custom `DocumentIntegrityError` class for robust error handling
  - Prevents signing if document was modified after request

- [x] **Upload Signature Option** - Third signature method
  - Upload PNG/JPG signature image (max 500KB)
  - Preview uploaded image before signing
  - Remove and re-upload capability

- [x] **Signature Request Email Notifications** - Automated alerts
  - Email sent to all org users when signature requested
  - Uses existing email preference system
  - `createWithNotifications` action for complete workflow

- [x] **PDF Invoice Generation** - Client-side download
  - Professional branded PDF using jsPDF
  - Company letterhead with logo placeholder
  - Line items table with totals
  - Bank payment details footer
  - Download button enabled in invoice detail dialog

- [x] **Stripe Payment Integration** - Online payments
  - `createCheckoutSession` action creates Stripe checkout
  - Webhook handler at `/stripe/webhook`
  - Cryptographic signature verification (HMAC-SHA256)
  - Automatic payment recording on successful checkout
  - Graceful fallback when Stripe not configured

- [x] **Automated Invoice Reminders** - Payment follow-up
  - Daily cron job at 10 AM Malaysia time
  - 3 days before due: "Invoice due soon" email
  - 1 day overdue: First overdue reminder
  - Weekly thereafter: Recurring overdue reminders
  - Tracking in `remindersSent` field prevents duplicates

- [x] **Security Hardening**
  - Stripe webhook signature verification
  - Custom error classes for type-safe error handling
  - Document integrity checks before signing

**Key Files Added/Modified:**
- `convex/http.ts` - Stripe webhook handler with signature verification
- `convex/invoices.ts` - Stripe checkout, reminder processing
- `convex/signatures.ts` - Hash verification, email notifications, IP capture
- `convex/emails.ts` - Invoice reminder email templates
- `convex/crons.ts` - Daily reminder cron job
- `convex/lib/helpers.ts` - `generateDocumentHash()`, `DocumentIntegrityError`
- `src/pages/Signatures.tsx` - Upload UI, IP fetching
- `src/pages/Invoices.tsx` - PDF download enabled
- `src/lib/invoice-pdf.ts` - PDF generation using jsPDF

**Schema Changes:**
- Added `documentHash`, `signedDocumentHash` to `signatureRequests`
- Added `remindersSent` tracking object to `invoices`

**Environment Variables Required:**
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORTAL_URL=https://portal.amjadhazli.com
```

---

## Future Enhancements

### Enhancement Phase 4: Multi-Party Signatures & Task Enhancements
**Status:** Complete

- [x] **Task Templates** - Common workflow templates
  - Create templates for recurring task types
  - Admin UI for template management
  - Apply templates when creating new tasks

- [x] **Recurring Tasks** - Automated task scheduling
  - Weekly, monthly, quarterly recurrence options
  - Automatic task creation via cron jobs
  - Next occurrence tracking

- [x] **Client Financial Summary Dashboard** - Financial overview
  - Revenue and outstanding amounts per client
  - Invoice and payment history charts
  - Subscription service breakdown

- [x] **Multi-Party Signatures** - Multiple signers workflow
  - Create requests with 2-10 signers
  - Drag-and-drop signer ordering
  - Internal user search combobox
  - External signer email input
  - Sequential signing option
  - Require all signatures option
  - Signer progress tracking in details view
  - Admin dropdown: Single Signer / Multi-Party

**Key Files Added:**
- `src/components/signatures/CreateMultiPartyDialog.tsx` - Multi-step wizard
- `src/components/signatures/SignerList.tsx` - Drag-and-drop sortable list
- `src/components/signatures/AddSignerForm.tsx` - Internal/external signer form
- `src/components/signatures/SignerProgressList.tsx` - Signer status tracking
- `src/components/ui/combobox.tsx` - User search combobox

**Dependencies Added:**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` - Drag-and-drop

---

### Enhancement Phase 5: Search, Bulk Operations & Analytics
**Status:** Complete

Scalability and usability improvements across the admin panel.

- [x] **Admin Invoice Pagination** - Cursor-based pagination for invoices
  - Page size selector (20/50/100)
  - Total count and range display
  - Filter + pagination integration

- [x] **Invoice Bulk Operations** - Multi-select actions
  - Checkbox selection with select all
  - Bulk publish draft invoices
  - Bulk mark as paid
  - Bulk cancel
  - Export selected to CSV

- [x] **Announcement Bulk Operations** - Multi-select actions
  - Bulk pin/unpin
  - Bulk delete
  - Export selected to CSV

- [x] **Activity Analytics Dashboard** - Visual analytics
  - Summary stats (total activities, active users, avg/day)
  - Time range selector (7-90 days)
  - Daily activity trend line chart
  - Resource type bar chart
  - Action type pie chart
  - Top active users leaderboard
  - Activity heatmap by day/hour

- [x] **Document Search Enhancement** - Improved client-side search
  - Real-time filtering
  - Search across name/description/tags

**Key Files Added:**
- `src/components/admin/ActivityAnalytics.tsx` - Analytics dashboard with Recharts
- `convex/admin.ts` - `listInvoicesPaginated` query
- `convex/invoices.ts` - `bulkPublish`, `bulkMarkPaid`, `bulkCancel` mutations
- `convex/announcements.ts` - `bulkTogglePin`, `bulkDelete` mutations
- `convex/activity.ts` - `getAnalytics` query

**Dependencies Added:**
- `recharts` - Charting library for analytics

---

### Mobile Responsiveness Implementation
**Status:** Complete

Pixel-perfect mobile experience from 320px to 1440px+ viewports.

#### Landing Page CSS Foundation
- [x] **Fluid Design Tokens** - CSS `clamp()` for smooth scaling
  - `--space-section: clamp(48px, 8vw, 96px)`
  - `--text-hero: clamp(28px, 6vw, 48px)`
  - `--text-section: clamp(24px, 4.5vw, 40px)`
- [x] **Extra-Small Breakpoint** - 479px for iPhone SE and small phones
- [x] **Grid Gap Optimization** - Fluid gaps for testimonials, features, team, services grids
- [x] **CTA Section** - Stack buttons vertically on mobile
- [x] **Footer Links** - 44px touch targets on mobile
- [x] **Service Hero Icons** - Responsive sizing with `clamp(64px, 15vw, 96px)`
- [x] **Calendar Modal** - Responsive min-height for booking widget

#### Portal UI Components
- [x] **Dialog Component** - `w-[calc(100%-2rem)]` on mobile, `max-h-[90vh]` with overflow scroll
- [x] **Select Component** - Collision avoidance, `collisionPadding={16}`
- [x] **Dropdown Menu** - `max-w-[calc(100vw-2rem)]` prevents off-screen
- [x] **Button Component** - `min-h-[44px]` touch targets for sm/icon sizes

#### Portal Layout
- [x] **Header** - 44px menu button, min-height on user dropdown
- [x] **Sidebar** - 44px close button with larger icon

#### Portal Pages
- [x] **Settings** - Flex-col on mobile for toggle rows, full-width inputs
- [x] **Invoices** - Full-width filters, mobile card view for line items
- [x] **Tasks** - Full-width filter selects
- [x] **Documents** - Full-width category filter

#### Admin Pages
- [x] **AdminInvoices** - Full-width filters, responsive pagination buttons
- [x] **AdminActivity** - Full-width filter select
- [x] **AdminAnnouncements** - Full-width type and status filters
- [x] **AdminServices** - Full-width org filter
- [x] **AdminSignatures** - Full-width org and status filters

#### Global CSS Utilities
- [x] **Utility Classes** - `.form-control-responsive`, `.filter-select-responsive`, `.touch-target-min`
- [x] **Safe Area Support** - CSS variables for notched devices

**Files Modified:**
- Landing pages: `index.html`, `schedule.html`, `services/*.html`
- UI Components: `dialog.tsx`, `select.tsx`, `dropdown-menu.tsx`, `button.tsx`
- Layout: `Header.tsx`, `Sidebar.tsx`
- Pages: `Settings.tsx`, `Invoices.tsx`, `Tasks.tsx`, `Documents.tsx`
- Admin: `AdminInvoices.tsx`, `AdminActivity.tsx`, `AdminAnnouncements.tsx`, `AdminServices.tsx`, `AdminSignatures.tsx`
- CSS: `portal/src/index.css`

---

### Enhancement Phase 6 (Planned)
- [ ] Client onboarding templates (pre-configured service packages)
- [ ] Recurring invoices (auto-generate on schedule)
- [ ] Dark mode support
- [ ] Two-factor authentication (TOTP)
- [ ] Signature certificate/receipt generation

### Other Future Items
- [ ] R2 direct upload with presigned URLs (when bucket configured)
- [ ] Dark mode support
- [ ] Mobile app (React Native)
- [ ] Two-factor authentication
- [ ] Recurring invoices
- [ ] Signature certificate/receipt generation

---

## Changelog

| Date | Phase | Changes |
|------|-------|---------|
| 2026-01-25 | Mobile | Complete mobile responsiveness implementation (320px-1440px+) |
| 2026-01-25 | Mobile | Added fluid design tokens with CSS clamp() for typography and spacing |
| 2026-01-25 | Mobile | Added 479px breakpoint for extra-small phones |
| 2026-01-25 | Mobile | Fixed dialog, select, dropdown collision and sizing on mobile |
| 2026-01-25 | Mobile | Added 44px minimum touch targets to buttons and interactive elements |
| 2026-01-25 | Mobile | Made all filter selects full-width on mobile |
| 2026-01-25 | Mobile | Added mobile card view for invoice line items |
| 2026-01-25 | Mobile | Added responsive utility classes to portal CSS |
| 2026-01-25 | Enhancement 5 | Added admin invoice pagination with cursor-based navigation |
| 2026-01-25 | Enhancement 5 | Added invoice bulk operations (publish, mark paid, cancel, export) |
| 2026-01-25 | Enhancement 5 | Added announcement bulk operations (pin/unpin, delete, export) |
| 2026-01-25 | Enhancement 5 | Added activity analytics dashboard with Recharts |
| 2026-01-25 | Enhancement 5 | Added analytics query with heatmap, trends, and top users |
| 2026-01-24 | Enhancement 4 | Added multi-party signature admin UI with drag-and-drop signer ordering |
| 2026-01-24 | Enhancement 4 | Added CreateMultiPartyDialog 3-step wizard (configure → signers → review) |
| 2026-01-24 | Enhancement 4 | Added SignerList with @dnd-kit for drag-and-drop reordering |
| 2026-01-24 | Enhancement 4 | Added AddSignerForm with internal user combobox and external email input |
| 2026-01-24 | Enhancement 4 | Added SignerProgressList for viewing signer status on existing requests |
| 2026-01-24 | Enhancement 4 | Added task templates for common workflows |
| 2026-01-24 | Enhancement 4 | Added recurring tasks (weekly/monthly/quarterly) |
| 2026-01-24 | Enhancement 4 | Added client financial summary dashboard |
| 2026-01-24 | Enhancement 3 | Added IP address capture for signature audit trail |
| 2026-01-24 | Enhancement 3 | Added document hash verification (SHA-256) for signature integrity |
| 2026-01-24 | Enhancement 3 | Added upload signature option (third method alongside draw/type) |
| 2026-01-24 | Enhancement 3 | Added signature request email notifications |
| 2026-01-24 | Enhancement 3 | Added PDF invoice generation using jsPDF |
| 2026-01-24 | Enhancement 3 | Implemented Stripe checkout session with webhook handler |
| 2026-01-24 | Enhancement 3 | Added cryptographic Stripe webhook signature verification |
| 2026-01-24 | Enhancement 3 | Added automated invoice payment reminders (cron job) |
| 2026-01-24 | Enhancement 3 | Added custom DocumentIntegrityError for type-safe error handling |
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
