# Client Portal Roadmap
## Amjad & Hazli - AI-Native Chartered Accounting Firm

> **Status:** In Progress  
> **Last Updated:** 2026-01-21  
> **Current Phase:** Phase 5 Complete - Ready for Deployment

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
| **Styling** | Tailwind CSS v3 + shadcn/ui | Utility-first, beautiful components |
| **Forms** | React Hook Form + Zod | Type-safe validation |
| **Backend** | Convex | Real-time, serverless, TypeScript-native |
| **Auth** | WorkOS AuthKit | Google OAuth, email/password, enterprise SSO ready |
| **Auth Integration** | @convex-dev/workos-authkit | Official Convex component for user sync |
| **File Storage** | Cloudflare R2 | S3-compatible, no egress fees |
| **Email** | Resend | Developer-friendly, React templates |
| **Payments** | Stripe | Industry standard |
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

### Phase 6: Final Polish (Future)
**Status:** Not Started

- [ ] Onboarding flow for new clients
- [ ] User documentation / help pages
- [ ] Bulk actions for admin lists
- [ ] Export functionality (CSV/Excel)
- [ ] File upload to Cloudflare R2 (currently placeholder)
- [ ] Stripe payment integration (API key required)
- [ ] Resend email integration (API key required)

---

## Changelog

| Date | Phase | Changes |
|------|-------|---------|
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
