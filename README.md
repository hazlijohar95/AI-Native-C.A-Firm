<div align="center">

<img src="portal/public/favicon.svg" width="80" height="80" alt="Amjad & Hazli Logo" />

# Amjad & Hazli

### AI-Native Chartered Accounting Firm

[![Website](https://img.shields.io/badge/Website-amjadhazli.com-2B3A55?style=for-the-badge&logo=safari&logoColor=white)](https://amjadhazli.com)
[![Portal](https://img.shields.io/badge/Portal-portal.amjadhazli.com-B8986B?style=for-the-badge&logo=shield&logoColor=white)](https://portal.amjadhazli.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Convex](https://img.shields.io/badge/Convex-Realtime-F97316?style=for-the-badge&logo=convex&logoColor=white)](https://convex.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

---

**Modern accounting services powered by AI and automation**

*Bookkeeping • Tax Advisory • Virtual CFO • Technology Solutions • Company Incorporation*

[View Website](https://amjadhazli.com) · [Access Portal](https://portal.amjadhazli.com) · [Documentation](docs/portal/PORTAL_ROADMAP.md)

</div>

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AMJAD & HAZLI                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐              ┌─────────────────────┐              │
│   │   LANDING WEBSITE   │              │    CLIENT PORTAL    │              │
│   │   amjadhazli.com    │              │ portal.amjadhazli.com│              │
│   ├─────────────────────┤              ├─────────────────────┤              │
│   │ • HTML/CSS/JS       │              │ • React 19 + Vite 7 │              │
│   │ • Responsive Design │              │ • Tailwind CSS v4   │              │
│   │ • Cal.com Booking   │              │ • shadcn/ui + Radix │              │
│   │ • Blog & Resources  │              │ • TypeScript 5      │              │
│   └─────────────────────┘              └──────────┬──────────┘              │
│                                                   │                         │
│                                        ┌──────────▼──────────┐              │
│                                        │       CONVEX        │              │
│                                        │   Real-time Backend │              │
│                                        ├─────────────────────┤              │
│                                        │ • Serverless        │              │
│                                        │ • TypeScript-native │              │
│                                        │ • Auto-scaling      │              │
│                                        │ • Real-time sync    │              │
│                                        └──────────┬──────────┘              │
│                                                   │                         │
│   ┌──────────────┬──────────────┬────────────────┼────────────────┐         │
│   │              │              │                │                │         │
│   ▼              ▼              ▼                ▼                ▼         │
│ WorkOS        Resend        Stripe          Cloudflare       Convex        │
│  Auth         Email        Payments           R2             Storage       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Monorepo Structure

```
amjad&hazli/
├── 🌐 Landing Website (Root)
│   ├── index.html              # Homepage
│   ├── about.html              # Team & Credentials
│   ├── blog.html               # Blog Listing
│   ├── schedule.html           # Booking Page
│   ├── resources.html          # Tools & Guides
│   ├── privacy.html            # Privacy Policy
│   ├── terms.html              # Terms of Service
│   └── services/
│       ├── bookkeeping.html
│       ├── tax.html
│       ├── cfo.html
│       ├── technology.html
│       └── incorporation.html
│
├── 🔐 portal/                  # Client Portal
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # Admin-specific components
│   │   │   ├── brand/          # Logo, branding assets
│   │   │   ├── common/         # EmptyState, LoadingState, SearchInput
│   │   │   ├── documents/      # Document management components
│   │   │   ├── layout/         # Header, Sidebar
│   │   │   ├── notifications/  # NotificationBell
│   │   │   ├── signatures/     # Multi-party signature components
│   │   │   ├── skeletons/      # Loading skeletons
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities, icons, constants
│   │   └── pages/
│   │       ├── admin/          # Admin panel pages
│   │       └── *.tsx           # Client pages
│   └── convex/                 # Backend functions
│       ├── schema.ts           # Database schema
│       ├── lib/                # Auth, helpers
│       └── *.ts                # API endpoints
│
└── 📚 docs/
    └── portal/
        └── PORTAL_ROADMAP.md   # Feature roadmap & changelog
```

---

## ✨ Portal Features

<table>
<tr>
<td width="50%" valign="top">

### 👤 For Clients

| Feature | Description |
|---------|-------------|
| 📁 **Documents** | Upload, download, organize by service |
| 📂 **Folders** | Hierarchical organization with breadcrumbs |
| ✅ **Tasks** | Track assigned work with comments |
| 💳 **Invoices** | View, download PDF, pay online |
| ✍️ **Signatures** | Draw, type, or upload signatures |
| 🔔 **Notifications** | Real-time alerts & email preferences |
| 📢 **Announcements** | Firm updates & tax deadlines |
| ⚙️ **Settings** | Profile & notification preferences |

</td>
<td width="50%" valign="top">

### 👔 For Admins

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Overview with metrics & analytics |
| 🏢 **Organizations** | Client management & subscriptions |
| 👥 **Users** | Role assignment & bulk actions |
| 📄 **Doc Requests** | Request specific documents |
| 💰 **Invoices** | Create, edit, bulk operations |
| ✍️ **Signatures** | Multi-party signature workflows |
| 📢 **Announcements** | Targeted announcements |
| 📈 **Activity** | Audit logs with analytics |
| 🏷️ **Services** | Manage service types |
| 📋 **Task Templates** | Recurring task automation |

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" width="48" height="48" alt="React" />
<br>React 19
</td>
<td align="center" width="96">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" width="48" height="48" alt="TypeScript" />
<br>TypeScript
</td>
<td align="center" width="96">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" width="48" height="48" alt="Tailwind" />
<br>Tailwind v4
</td>
<td align="center" width="96">
<img src="https://vitejs.dev/logo.svg" width="48" height="48" alt="Vite" />
<br>Vite 7
</td>
<td align="center" width="96">
<img src="https://avatars.githubusercontent.com/u/108468352" width="48" height="48" alt="Convex" />
<br>Convex
</td>
</tr>
</table>

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + Vite 7 + TypeScript | Fast SPA with type safety |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Utility-first design system |
| **Backend** | Convex | Real-time serverless database |
| **Auth** | WorkOS AuthKit | Google OAuth + enterprise SSO |
| **Email** | Resend | Transactional emails |
| **Payments** | Stripe | Online payment processing |
| **Storage** | Convex Storage (R2 ready) | Document storage |
| **Hosting** | Cloudflare Pages | Edge deployment |

---

## 🎨 Design System

<table>
<tr>
<td valign="top" width="50%">

### Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| 🔵 **Navy** | `#2B3A55` | Primary, headings |
| 🟡 **Gold** | `#B8986B` | Accent, CTAs |
| 🟤 **Gold Hover** | `#A6875A` | Hover states |
| 🔲 **Ink** | `#090516` | Body text |
| ⬜ **Cream** | `#FAF8F5` | Background |

</td>
<td valign="top" width="50%">

### Typography

| Use | Font | Weight |
|-----|------|--------|
| **Display** | Playfair Display | 400, 500 |
| **Body** | Manrope | 400, 500, 600 |
| **Mono** | DM Mono | 400, 500 |

</td>
</tr>
</table>

### Responsive Breakpoints

```
Mobile-First Design
├── 320px   Extra small phones (iPhone SE)
├── 375px   Small phones (iPhone 12/13/14)
├── 480px   Large phones
├── 640px   Small tablets
├── 768px   Tablets (iPad Mini)
├── 1024px  Large tablets / Small desktops
└── 1440px+ Desktop
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Convex account

### Installation

```bash
# Clone the repository
git clone https://github.com/amjadhazli/zed.git
cd zed

# Install portal dependencies
cd portal && npm install

# Start development servers
npm run dev              # Frontend → localhost:5173
npx convex dev           # Backend (in another terminal)
```

### Environment Variables

```bash
# Convex Environment (set via CLI or dashboard)
npx convex env set WORKOS_CLIENT_ID client_xxx
npx convex env set WORKOS_API_KEY sk_xxx
npx convex env set RESEND_API_KEY re_xxx
npx convex env set STRIPE_SECRET_KEY sk_xxx
npx convex env set STRIPE_WEBHOOK_SECRET whsec_xxx
npx convex env set PORTAL_URL https://portal.amjadhazli.com
```

---

## 📦 Deployment

| Project | Platform | Branch | URL |
|---------|----------|--------|-----|
| Website | Netlify | `master` | amjadhazli.com |
| Portal | Cloudflare Pages | `master` | portal.amjadhazli.com |
| Backend | Convex Cloud | Auto-deploy | — |

```bash
# Deploy Portal
cd portal
npm run build
npx wrangler pages deploy dist

# Deploy Convex Backend
npx convex deploy
```

---

## 📋 Development Phases

### ✅ Completed

| Phase | Features |
|-------|----------|
| **1-6** | Core portal: Auth, Documents, Tasks, Invoices, Signatures, Admin |
| **Enhancement 1** | Doc requests, task comments, email notifications, signature preview |
| **Enhancement 2** | Service-based docs, folders, versioning, code refactoring |
| **Enhancement 3** | IP capture, hash verification, Stripe, PDF invoices, reminders |
| **Enhancement 4** | Multi-party signatures, task templates, recurring tasks, financial dashboard |
| **Enhancement 5** | Pagination, bulk operations, activity analytics with Recharts |
| **Mobile Responsive** | Fluid design tokens, touch targets, responsive dialogs & filters |

### 🔮 Planned

- [ ] Recurring invoices (auto-generate on schedule)
- [ ] Dark mode support
- [ ] Two-factor authentication (TOTP)
- [ ] Mobile app (React Native)
- [ ] Signature certificates

---

## 📄 Documentation

- [**Portal Roadmap**](docs/portal/PORTAL_ROADMAP.md) — Complete feature list, changelog, and technical details
- [**Claude Instructions**](.claude/CLAUDE.md) — AI development guidelines

---

## 🔒 Security Features

| Feature | Description |
|---------|-------------|
| **WorkOS Auth** | Enterprise-grade authentication with SSO support |
| **Document Hash** | SHA-256 integrity verification for signatures |
| **IP Capture** | Audit trail with IP and user agent |
| **Rate Limiting** | Protection on sensitive mutations |
| **Stripe Webhooks** | HMAC-SHA256 signature verification |
| **User Deactivation** | Soft delete preserving referential integrity |

---

## 📱 Mobile Responsiveness

The portal is fully responsive with:

- **Fluid typography** using CSS `clamp()` for smooth scaling
- **Touch-friendly** targets (minimum 44×44px)
- **Collision-aware** dropdowns and dialogs
- **Mobile card views** for tables on small screens
- **Safe area** support for notched devices

---

<div align="center">

### Built with precision for Malaysian businesses

**© 2026 Amjad & Hazli. All rights reserved.**

---

<sub>Powered by React, Convex, and modern web technologies</sub>

</div>
