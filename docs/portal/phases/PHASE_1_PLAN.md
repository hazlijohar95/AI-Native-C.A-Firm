# Phase 1: Foundation
## Client Portal - Amjad & Hazli

> **Status:** Code Complete - Awaiting External Setup  
> **Target:** Weeks 1-3  
> **Goal:** Users can sign up, log in, and see empty dashboard

---

## Implementation Summary

The portal has been built following **official Convex + WorkOS best practices**:
- Using `@convex-dev/workos-authkit` component for user sync
- Using `@convex-dev/workos` for React provider
- Webhook-based user lifecycle management
- Proper JWT validation configuration

---

## Files Created

### Convex Backend (`convex/`)

| File | Purpose |
|------|---------|
| `convex.config.ts` | Registers WorkOS AuthKit component |
| `auth.config.ts` | JWT validation for WorkOS tokens |
| `auth.ts` | AuthKit component + event handlers for user sync |
| `http.ts` | HTTP routes for WorkOS webhooks |
| `schema.ts` | Database schema (users, organizations) |
| `users.ts` | User queries/mutations |
| `organizations.ts` | Organization queries/mutations |
| `files.ts` | R2 file actions (placeholder) |

### Frontend (`src/`)

| File | Purpose |
|------|---------|
| `main.tsx` | App entry with AuthKit + Convex providers |
| `App.tsx` | Routes with Authenticated/Unauthenticated gates |
| `pages/Login.tsx` | Login page with sign-in button |
| `pages/Callback.tsx` | OAuth callback handler |
| `pages/Dashboard.tsx` | Main dashboard with user sync |
| `components/layout/Shell.tsx` | Main layout wrapper |
| `components/layout/Sidebar.tsx` | Navigation sidebar |
| `components/layout/Header.tsx` | Top header with user info |
| `components/ui/*` | shadcn/ui components |

---

## Required Setup Steps

### Step 1: WorkOS Account Setup

1. Go to https://workos.com and create a free account
2. Navigate to **Authentication > AuthKit** and click "Set up AuthKit"
3. Configure authentication methods:
   - Enable **Google OAuth**
   - Enable **Email + Password**
4. Set redirect URIs:
   - Development: `http://localhost:5173/callback`
   - Production: `https://portal.amjadhazli.com/callback`
5. Configure CORS in **Authentication > Sessions**:
   - Add `http://localhost:5173`
6. Copy your **Client ID** from the dashboard

### Step 2: Deploy Convex

```bash
cd portal

# Run Convex dev (will prompt to log in and create project)
npx convex dev
```

This will:
- Create a Convex project
- Generate `_generated/` files
- Give you the `CONVEX_URL`

### Step 3: Set Environment Variables

#### Local (.env.local)
```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_WORKOS_CLIENT_ID=client_xxx
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
```

#### Convex Dashboard
Set these in https://dashboard.convex.dev > Settings > Environment Variables:

```
WORKOS_CLIENT_ID=client_xxx
```

### Step 4: Configure WorkOS Webhooks (For User Sync)

In WorkOS Dashboard > Webhooks:

1. Create a new webhook
2. **Endpoint URL**: `https://<your-convex-deployment>.convex.site/workos/webhook`
3. **Events**: Select `user.created`, `user.updated`, `user.deleted`
4. Copy the **Webhook Secret**

Then set in Convex:
```bash
npx convex env set WORKOS_WEBHOOK_SECRET=your-webhook-secret
```

### Step 5: Start Development

```bash
# Terminal 1: Convex backend
cd portal && npx convex dev

# Terminal 2: Frontend
cd portal && npm run dev
```

Open http://localhost:5173

---

## Architecture (Best Practices Applied)

### Authentication Flow

```
User clicks "Sign In"
       ↓
WorkOS AuthKit handles login (Google/Email)
       ↓
User redirected to /callback with auth code
       ↓
AuthKitProvider exchanges code for JWT
       ↓
ConvexProviderWithAuthKit sends JWT to Convex
       ↓
Convex validates JWT against WorkOS JWKS
       ↓
User authenticated, ctx.auth.getUserIdentity() works
```

### User Sync Flow (Webhook-based)

```
User signs up in WorkOS
       ↓
WorkOS sends webhook to /workos/webhook
       ↓
authKit.registerRoutes() receives event
       ↓
authKitEvent "user.created" handler runs
       ↓
User inserted into custom users table
```

### Component Architecture

```
@convex-dev/workos-authkit (Component)
├── Manages its own user table with WorkOS data
├── Handles webhook verification
├── Provides getAuthUser() method
└── Fires events for user.created/updated/deleted

Your Custom users Table
├── References WorkOS user by workosId
├── Stores app-specific data (role, organizationId)
└── Synced via event handlers
```

---

## Database Schema

```typescript
// Users - Your app's user table
users: defineTable({
  workosId: v.string(),           // Links to WorkOS user
  email: v.string(),
  name: v.string(),
  role: "admin" | "client" | "staff",
  organizationId?: Id<"organizations">,
  avatarUrl?: v.string(),
  lastLoginAt?: v.number(),
  createdAt: v.number(),
})
  .index("by_workos_id", ["workosId"])
  .index("by_email", ["email"])
  .index("by_organization", ["organizationId"])

// Organizations - Client companies
organizations: defineTable({
  name: v.string(),
  registrationNumber?: v.string(),
  email: v.string(),
  phone?: v.string(),
  address?: v.string(),
  createdAt: v.number(),
  createdBy: Id<"users">,
})
```

---

## Key Implementation Details

### 1. Convex Config (`convex/convex.config.ts`)
```typescript
import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workOSAuthKit);  // Registers the component
export default app;
```

### 2. AuthKit Setup (`convex/auth.ts`)
```typescript
import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import { components, internal } from "./_generated/api";

const authFunctions: AuthFunctions = internal.auth;

export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions,
});

// Event handlers sync WorkOS users to your custom table
export const { authKitEvent } = authKit.events({
  "user.created": async (ctx, event) => { /* insert into users */ },
  "user.updated": async (ctx, event) => { /* update users */ },
  "user.deleted": async (ctx, event) => { /* delete from users */ },
});
```

### 3. HTTP Routes (`convex/http.ts`)
```typescript
import { httpRouter } from "convex/server";
import { authKit } from "./auth";

const http = httpRouter();
authKit.registerRoutes(http);  // Handles /workos/webhook
export default http;
```

### 4. Frontend Provider (`src/main.tsx`)
```typescript
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";

<AuthKitProvider clientId={...} redirectUri={...}>
  <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
    <App />
  </ConvexProviderWithAuthKit>
</AuthKitProvider>
```

---

## Testing Checklist

After completing setup:

- [ ] `npm run dev` starts without errors
- [ ] `npx convex dev` shows "Convex functions ready"
- [ ] Login page renders at http://localhost:5173
- [ ] Clicking "Sign In" redirects to WorkOS
- [ ] After login, redirects back to /callback
- [ ] Dashboard loads with user name
- [ ] User appears in Convex dashboard (users table)
- [ ] Sign out works

---

## Troubleshooting

### "Unauthorized" errors
- Check WORKOS_CLIENT_ID is set in Convex dashboard
- Ensure auth.config.ts uses the correct client ID
- Verify CORS is configured in WorkOS for your domain

### User not syncing
- Check webhook is configured in WorkOS
- Verify webhook URL: `https://<deployment>.convex.site/workos/webhook`
- Check WORKOS_WEBHOOK_SECRET is set
- Look at Convex logs for webhook errors

### Login redirect loop
- Check VITE_WORKOS_REDIRECT_URI matches WorkOS settings
- Ensure /callback route is not protected

---

## Next Steps

Once setup is complete and tested:

1. **Phase 2**: Document management, tasks, announcements
2. **Phase 3**: Stripe payments, e-signatures
3. **Phase 4**: Admin panel
4. **Phase 5**: Polish and security audit

---

## References

- [Convex WorkOS AuthKit Guide](https://docs.convex.dev/auth/authkit)
- [WorkOS AuthKit Component](https://www.convex.dev/components/workos-authkit)
- [WorkOS AuthKit React](https://workos.com/docs/authkit/react)
- [Component GitHub](https://github.com/get-convex/workos-authkit)
