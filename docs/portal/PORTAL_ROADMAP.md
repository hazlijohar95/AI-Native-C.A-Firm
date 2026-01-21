# Client Portal Roadmap
## Amjad & Hazli - AI-Native Chartered Accounting Firm

> **Status:** In Progress  
> **Last Updated:** 2026-01-21  
> **Current Phase:** Phase 3 - Payments & Signatures

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
**Status:** Not Started

- [ ] Invoice upload (admin)
- [ ] Stripe integration (checkout, webhooks)
- [ ] Invoice dashboard (view, payment history)
- [ ] Simple e-signatures (draw/type, metadata capture)
- [ ] Email notifications (Resend)

**Deliverable:** Clients can pay invoices, sign documents

---

### Phase 4: Admin Panel
**Status:** Not Started

- [ ] Admin dashboard (overview, metrics)
- [ ] Client management (CRUD organizations)
- [ ] Document upload to clients
- [ ] Task creation for clients
- [ ] Announcement editor
- [ ] Audit log viewer

**Deliverable:** Complete admin panel

---

### Phase 5: Polish & Security
**Status:** Not Started

- [ ] Security audit
- [ ] Performance optimization
- [ ] Error handling
- [ ] Onboarding flow
- [ ] E2E tests (Playwright)
- [ ] User documentation

---

## Changelog

| Date | Phase | Changes |
|------|-------|---------|
| 2026-01-21 | Phase 2 | Completed Phase 2: Added toast notifications, delete confirmations, spinner loading states |
| 2026-01-21 | Phase 2 | Built Documents, Tasks, Announcements, Notifications with proper UX |
| 2026-01-21 | Phase 2 | Started Phase 2: Core Features |
| 2026-01-21 | Phase 1 | Completed Phase 1: Foundation |
| 2026-01-21 | Phase 1 | Implemented WorkOS AuthKit, Dashboard, Login |
| 2026-01-21 | Planning | Initial roadmap created |
