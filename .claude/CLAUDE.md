# Amjad & Hazli Portal - Claude Instructions

> Project-specific instructions for the client portal development.

---

## Project Context

Building a **client portal** for Amjad & Hazli chartered accounting firm.

**Tech Stack:**
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- Backend: Convex
- Auth: WorkOS AuthKit
- Storage: Cloudflare R2
- Email: Resend
- Payments: Stripe
- Hosting: Cloudflare Pages

**Target URL:** `portal.amjadhazli.com`

---

## Documentation Locations

| Document | Path | Purpose |
|----------|------|---------|
| Master Roadmap | `docs/portal/PORTAL_ROADMAP.md` | Full project plan, architecture, schema |
| Current Phase | `docs/portal/phases/PHASE_X_PLAN.md` | Active phase details |
| Global Rules | `~/.claude/CLAUDE.md` | Personal Claude rules |

---

## Phase Workflow

### Starting a New Phase
1. Read `PORTAL_ROADMAP.md` for context
2. Create `docs/portal/phases/PHASE_X_PLAN.md` with detailed plan
3. Review plan with user before implementation
4. Mark phase as "In Progress" in roadmap

### During Implementation
1. Follow phase plan tasks in order
2. Update checkboxes as tasks complete
3. Ask clarifying questions when needed
4. Test each feature before moving on

### Completing a Phase
1. Verify all acceptance criteria met
2. Update `PORTAL_ROADMAP.md` phase status to complete
3. Delete the phase plan file (per user preference)
4. Note completion in roadmap changelog

---

## Coding Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `DocumentList.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Utils: `camelCase.ts` (e.g., `formatDate.ts`)
- Convex functions: `camelCase.ts` (e.g., `documents.ts`)

### Component Structure
```typescript
// 1. Imports
import { ... } from "react";

// 2. Types
interface Props { ... }

// 3. Component
export function ComponentName({ ... }: Props) {
  // Hooks first
  // Then handlers
  // Then render
}
```

### Convex Patterns
```typescript
// Query with auth check
export const myQuery = query({
  args: { ... },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    // ... rest
  },
});
```

---

## Common Commands

```bash
# Start dev servers
cd portal && npm run dev          # Frontend (Vite)
npx convex dev                    # Convex backend

# Deploy
npx convex deploy                 # Deploy Convex
npm run build && npx wrangler pages deploy dist  # Deploy frontend

# Convex env vars
npx convex env set KEY value
npx convex env list
```

---

## Important Notes

1. **No Next.js / Vercel** - User explicitly wants React + Vite + Cloudflare
2. **WorkOS, not Auth0** - Using WorkOS AuthKit for enterprise SSO capability
3. **Cloudflare R2, not S3** - User's choice for file storage
4. **Simple e-signatures** - Build custom, not DocuSign (for MVP)
5. **Manual invoices** - Upload PDFs, not integrated with Xero/QuickBooks

---

## Don't Forget

- Always check `PORTAL_ROADMAP.md` before starting work
- Update roadmap when phases complete
- Delete phase plan files after completion
- Test on mobile - responsive design is required
- Keep commits clean - no AI attribution lines
