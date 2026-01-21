# Client Portal Roadmap
## Amjad & Hazli - AI-Native Chartered Accounting Firm

> **Status:** In Progress  
> **Last Updated:** 2026-01-21  
> **Current Phase:** Phase 1 - Foundation

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
| **File Storage** | Cloudflare R2 | S3-compatible, no egress fees |
| **Email** | Resend | Developer-friendly, React templates |
| **Payments** | Stripe | Industry standard |
| **Hosting** | Cloudflare Pages | Fast edge network, generous free tier |

### Key Packages
```json
{
  "@convex-dev/workos-authkit": "User sync via webhooks",
  "@convex-dev/workos": "React provider integration",
  "@workos-inc/authkit-react": "AuthKit React SDK"
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                                   │
│  ┌──────────────────────┐    ┌────────────────────────────────────┐ │
│  │   Cloudflare Pages   │    │        Cloudflare R2               │ │
│  │  portal.amjadhazli.com│   │   (Document Storage)               │ │
│  │  React + Vite SPA    │    │   - Client documents               │ │
│  │  shadcn/ui           │    │   - Invoices, Signed agreements    │ │
│  └──────────┬───────────┘    └──────────────┬─────────────────────┘ │
└─────────────┼───────────────────────────────┼───────────────────────┘
              │                               │
              ▼                               │
┌─────────────────────────────────────────────┼───────────────────────┐
│                         CONVEX                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Convex Backend                               │ │
│  │  Users │ Organizations │ Documents │ Tasks │ Invoices │ etc.   │ │
│  │  Real-time subscriptions • Mutations • Queries • Actions       │ │
│  └─────────────────────────────────┬──────────────────────────────┘ │
└────────────────────────────────────┼────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
┌───────────────┐          ┌─────────────────┐          ┌─────────────────┐
│    WorkOS     │          │     Resend      │          │     Stripe      │
│   AuthKit     │          │   (Email)       │          │   (Payments)    │
└───────────────┘          └─────────────────┘          └─────────────────┘
```

---

## Database Schema

### Core Tables

```typescript
// Organizations (Client Companies)
organizations: {
  name: string
  registrationNumber?: string
  email: string
  phone?: string
  address?: string
  createdAt: number
  createdBy: Id<"users">
}

// Users
users: {
  workosId: string
  email: string
  name: string
  role: "admin" | "client" | "staff"
  organizationId?: Id<"organizations">
  lastLoginAt?: number
  createdAt: number
}

// Documents
documents: {
  organizationId: Id<"organizations">
  folderId?: Id<"folders">
  name: string
  type: string  // MIME
  size: number
  storageKey: string  // R2 key
  uploadedBy: Id<"users">
  uploadedAt: number
  category: "tax_return" | "financial_statement" | "invoice" | "agreement" | "other"
}

// Folders
folders: {
  organizationId: Id<"organizations">
  name: string
  parentId?: Id<"folders">
  createdAt: number
}

// Tasks
tasks: {
  organizationId: Id<"organizations">
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed"
  priority: "low" | "medium" | "high"
  dueDate?: number
  assignedTo?: Id<"users">
  createdBy: Id<"users">
  createdAt: number
  completedAt?: number
}

// Announcements
announcements: {
  title: string
  content: string  // Markdown
  type: "general" | "tax" | "deadline" | "news"
  targetOrganizations?: Id<"organizations">[]  // null = all
  publishedAt: number
  expiresAt?: number
  createdBy: Id<"users">
  isPinned: boolean
}

// Announcement Read Status
announcementReads: {
  announcementId: Id<"announcements">
  userId: Id<"users">
  readAt: number
}

// Invoices
invoices: {
  organizationId: Id<"organizations">
  invoiceNumber: string
  amount: number  // cents
  currency: string
  status: "draft" | "sent" | "paid" | "overdue"
  dueDate: number
  paidAt?: number
  stripePaymentIntentId?: string
  documentId?: Id<"documents">
  description: string
  createdAt: number
  createdBy: Id<"users">
}

// Signatures (Simple)
signatures: {
  documentId: Id<"documents">
  signedBy: Id<"users">
  signatureData: string  // Base64
  signedAt: number
  ipAddress: string
  userAgent: string
}

// Notifications
notifications: {
  userId: Id<"users">
  type: "new_document" | "new_task" | "task_due" | "invoice_due" | "announcement" | "payment_received"
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: number
}

// Audit Logs
auditLogs: {
  userId: Id<"users">
  action: string
  resourceType: string
  resourceId: string
  metadata?: any
  ipAddress?: string
  createdAt: number
}
```

---

## Page Routes

### Client Routes
| Route | Description |
|-------|-------------|
| `/` | Redirect to /dashboard |
| `/login` | WorkOS login |
| `/signup` | WorkOS signup |
| `/dashboard` | Home (status, activity) |
| `/documents` | Document list + folders |
| `/documents/:id` | Document viewer |
| `/tasks` | Task list |
| `/announcements` | Updates and news |
| `/invoices` | Invoice list |
| `/invoices/:id` | Invoice detail + pay |
| `/sign/:documentId` | E-signature page |
| `/settings` | Profile, notifications |

### Admin Routes
| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard |
| `/admin/clients` | Organization management |
| `/admin/clients/:id` | Client detail |
| `/admin/documents` | Upload docs to clients |
| `/admin/tasks` | Create/manage tasks |
| `/admin/announcements` | Create announcements |
| `/admin/invoices` | Manage invoices |
| `/admin/audit` | Audit log viewer |

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
**Status:** In Progress

- [ ] Project setup (Vite + React + TypeScript + Tailwind + shadcn/ui)
- [ ] Convex initialization and schema deployment
- [ ] WorkOS AuthKit integration (Google OAuth, email/password)
- [ ] Basic layout (shell, navigation, responsive sidebar)
- [ ] User management (sync WorkOS to Convex)
- [ ] Cloudflare R2 setup (presigned URLs)

**Deliverable:** Users can sign up, log in, see empty dashboard

---

### Phase 2: Core Features (Weeks 4-6)
**Status:** Not Started

- [ ] Document management (upload, download, folders)
- [ ] Task system (create, assign, complete)
- [ ] Announcements (create, view, read tracking)
- [ ] In-portal notifications
- [ ] Dashboard (status cards, activity feed)

**Deliverable:** Functional client portal (except payments/signatures)

---

### Phase 3: Payments & Signatures (Weeks 7-9)
**Status:** Not Started

- [ ] Invoice upload (admin)
- [ ] Stripe integration (checkout, webhooks)
- [ ] Invoice dashboard (view, payment history)
- [ ] Simple e-signatures (draw/type, metadata capture)
- [ ] Email notifications (Resend)

**Deliverable:** Clients can pay invoices, sign documents

---

### Phase 4: Admin Panel (Weeks 10-12)
**Status:** Not Started

- [ ] Admin dashboard (overview, metrics)
- [ ] Client management (CRUD organizations)
- [ ] Document upload to clients
- [ ] Task creation for clients
- [ ] Announcement editor
- [ ] Audit log viewer

**Deliverable:** Complete admin panel

---

### Phase 5: Polish & Security (Week 12+)
**Status:** Not Started

- [ ] Security audit
- [ ] Performance optimization
- [ ] Error handling
- [ ] Onboarding flow
- [ ] E2E tests (Playwright)
- [ ] User documentation

---

## Folder Structure

```
portal/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui
│   │   ├── layout/          # Shell, Sidebar, Header
│   │   ├── documents/
│   │   ├── tasks/
│   │   ├── invoices/
│   │   └── signatures/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Documents.tsx
│   │   ├── Tasks.tsx
│   │   ├── Invoices.tsx
│   │   ├── Announcements.tsx
│   │   ├── Settings.tsx
│   │   └── admin/
│   ├── lib/
│   ├── hooks/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── convex/
│   ├── schema.ts
│   ├── auth.config.ts
│   ├── users.ts
│   ├── organizations.ts
│   ├── documents.ts
│   ├── tasks.ts
│   ├── announcements.ts
│   ├── invoices.ts
│   ├── notifications.ts
│   ├── signatures.ts
│   └── http.ts
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Environment Variables

```bash
# Frontend (.env.local)
VITE_CONVEX_URL=https://xxx.convex.cloud
VITE_WORKOS_CLIENT_ID=client_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_xxx

# Convex (via CLI)
WORKOS_CLIENT_ID
WORKOS_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_ENDPOINT
```

---

## Cost Estimate (Monthly)

| Service | Cost |
|---------|------|
| Convex | $0 (free tier) |
| WorkOS AuthKit | $0 (free tier) |
| WorkOS SSO | $125/connection (when needed) |
| Cloudflare Pages | $0 |
| Cloudflare R2 | ~$5-15 |
| Resend | $0 (3K emails/mo) |
| Stripe | 2.9% + RM1 per txn |

**Estimated:** $5-20/month (before SSO)

---

## Security Checklist

- [ ] HTTPS enforced
- [ ] JWT validation on all Convex functions
- [ ] Role-based access control
- [ ] Organization-scoped data access
- [ ] File access verification
- [ ] Audit logging
- [ ] Input validation (Zod)
- [ ] Rate limiting (WorkOS handles)
- [ ] CORS configured
- [ ] Environment variables secured

---

## Changelog

| Date | Phase | Changes |
|------|-------|---------|
| 2026-01-21 | Phase 1 | Implemented official @convex-dev/workos-authkit component |
| 2026-01-21 | Phase 1 | Built all frontend pages (Login, Dashboard, Layout) |
| 2026-01-21 | Phase 1 | Created Convex schema and functions |
| 2026-01-21 | Phase 1 | Started Phase 1: Foundation |
| 2026-01-21 | Planning | Initial roadmap created |
