<div align="center">

# Amjad & Hazli

### AI-Native Chartered Accounting Firm

[![Website](https://img.shields.io/badge/Website-amjadhazli.com-2B3A55?style=for-the-badge&logo=google-chrome&logoColor=white)](https://amjadhazli.com)
[![Portal](https://img.shields.io/badge/Portal-portal.amjadhazli.com-0f0f12?style=for-the-badge&logo=shield&logoColor=white)](https://portal.amjadhazli.com)
[![License](https://img.shields.io/badge/License-Proprietary-gray?style=for-the-badge)](LICENSE)

---

**Modern accounting services powered by AI and automation.**

*Bookkeeping • Tax Advisory • Virtual CFO • Technology Solutions*

</div>

---

## Overview

This monorepo contains two main projects:

| Project | Description | Tech Stack |
|---------|-------------|------------|
| **Main Website** | Marketing site & service pages | HTML, CSS, JavaScript |
| **Client Portal** | Secure client dashboard | React, Convex, WorkOS |

---

## Client Portal

A full-featured client portal for document management, task tracking, invoicing, and e-signatures.

### Features

<table>
<tr>
<td width="50%">

**For Clients**
- Secure document upload & download
- Task tracking with comments
- Invoice viewing & payment
- Electronic signature requests
- Real-time notifications
- Email notification preferences

</td>
<td width="50%">

**For Admins**
- Client organization management
- Document request workflow
- Task assignment & tracking
- Invoice creation & management
- Signature request management
- Activity audit logs

</td>
</tr>
</table>

### Tech Stack

```
Frontend        React 19 + Vite + TypeScript + Tailwind CSS
Components      shadcn/ui + Radix Primitives
Backend         Convex (real-time, serverless)
Auth            WorkOS AuthKit (Google OAuth, SSO-ready)
Email           Resend (transactional emails)
Payments        Stripe (scaffolded)
Hosting         Cloudflare Pages
```

### Quick Start

```bash
# Install dependencies
cd portal && npm install

# Start development servers
npm run dev              # Frontend (Vite) → localhost:5173
npx convex dev           # Backend (Convex)
```

### Environment Variables

```bash
# Convex (portal/convex/.env.local)
WORKOS_CLIENT_ID=client_xxx
WORKOS_API_KEY=sk_xxx
RESEND_API_KEY=re_xxx

# Set via Convex dashboard or CLI
npx convex env set WORKOS_CLIENT_ID client_xxx
```

### Project Structure

```
portal/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── common/     # EmptyState, LoadingState, SearchInput
│   │   ├── layout/     # Header, Sidebar
│   │   └── ui/         # shadcn components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities, icons
│   ├── pages/          # Route pages
│   │   ├── admin/      # Admin-only pages
│   │   └── ...         # Client pages
│   └── types/          # TypeScript types
├── convex/             # Backend functions
│   ├── schema.ts       # Database schema
│   ├── documents.ts    # Document CRUD + requests
│   ├── tasks.ts        # Tasks + comments
│   ├── invoices.ts     # Invoice management
│   ├── signatures.ts   # E-signature workflow
│   ├── emails.ts       # Email notifications
│   └── lib/            # Auth, helpers
└── public/             # Static assets
```

---

## Main Website

Static marketing website with service pages and blog.

### Structure

```
├── index.html              # Landing page
├── about.html              # Team & credentials
├── blog.html               # Blog listing
├── resources.html          # Tools & guides
├── services/
│   ├── bookkeeping.html
│   ├── tax.html
│   ├── cfo.html
│   ├── technology.html
│   └── incorporation.html
└── blog/                   # Article pages
```

### Local Development

```bash
python3 -m http.server 3000
# Open http://localhost:3000
```

---

## Design System

<table>
<tr>
<td>

**Colors**
| Token | Value |
|-------|-------|
| Navy | `#2B3A55` |
| Gold | `#B8986B` |
| Cream | `#FAF8F5` |
| Ink | `#1A1A1A` |

</td>
<td>

**Typography**
| Use | Font |
|-----|------|
| Headings | Playfair Display |
| Body | Manrope |
| Mono | DM Mono |

</td>
</tr>
</table>

**Spacing Scale:** 4, 8, 12, 16, 24, 32, 48, 64, 80px

**Breakpoints:** Mobile (375px) → Tablet (768px) → Desktop (1024px+)

---

## Deployment

| Project | Platform | Branch |
|---------|----------|--------|
| Website | Netlify | `master` |
| Portal | Cloudflare Pages | `master` |
| Backend | Convex Cloud | Auto-deploy |

```bash
# Deploy portal
cd portal
npm run build
npx wrangler pages deploy dist

# Deploy Convex
npx convex deploy
```

---

## Documentation

Detailed documentation is available in the `docs/` directory:

- [`docs/portal/PORTAL_ROADMAP.md`](docs/portal/PORTAL_ROADMAP.md) — Portal feature roadmap & changelog

---

## Development Phases

### Completed

- [x] **Phase 1-6:** Core portal functionality
- [x] **Enhancement Phase 1:** Document requests, task comments, email notifications, signature preview

### Planned

- [ ] **Enhancement Phase 2:** Folders, reminders, Stripe payments, search
- [ ] **Enhancement Phase 3:** Task templates, recurring tasks, multi-party signatures
- [ ] **Enhancement Phase 4:** Bulk operations, onboarding templates, analytics

---

<div align="center">

**Built with precision for Malaysian businesses**

© 2026 Amjad & Hazli. All rights reserved.

</div>
