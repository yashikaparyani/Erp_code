# Frontend Deployment Handoff

## Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9
- **Frappe/ERPNext backend** (`gov_erp` app installed) running and accessible from the frontend server

---

## Environment Variables

Create `.env.local` (or `.env.production.local`) in the project root:

```env
# Required — Frappe backend URL the API routes proxy to
FRAPPE_URL=https://your-frappe-site.example.com

# Required — Backend credentials used by server-side API routes
FRAPPE_USERNAME=Administrator
FRAPPE_PASSWORD=<strong-password>

# Optional — API key pair (alternative to username/password for service auth)
# FRAPPE_API_KEY=<key>
# FRAPPE_API_SECRET=<secret>

# Optional — Public URL exposed to the browser (only needed if drawings or
# other client-side code fetches directly from Frappe)
# NEXT_PUBLIC_FRAPPE_URL=https://your-frappe-site.example.com
```

> **Security note:** Never commit `.env.local` or credentials to version control.

### Backend Assumptions

The frontend expects the Frappe site to have:

- `gov_erp` custom app installed with all doctypes and API methods.
- Users matching the ERP roles (Director, Project Head, HR Manager, etc.).
- Standard Frappe session/cookie authentication enabled (`/api/method/login`).

---

## Build & Start

```bash
cd /workspace/development/Erp_code/erp_frontend

# 1. Install dependencies
npm install

# 2. Production build
npm run build

# 3. Start production server (default port 3000)
npm start
```

To change the port: `PORT=8080 npm start`

Do not omit dev dependencies during install. The production build runs ESLint/type validation, so a deployment image using `npm install --omit=dev` will fail the build.

---

## Auth / Session Model

- **Cookie-based.** The frontend API routes forward `sid` and `frappe_csrf_token` cookies to the Frappe backend.
- Login: `POST /api/auth/login` → validates against Frappe, sets cookies.
- Session check: `GET /api/auth/session` → returns user, roles, full_name.
- Logout: `POST /api/auth/logout` → clears cookies.
- No external OAuth or JWT is involved.

---

## Dynamic Route Note

All `src/app/api/**/route.ts` files export `const dynamic = 'force-dynamic'`. This is intentional — every API route depends on cookies/session state and must never be statically generated. Do not add `revalidate` or ISR configuration to these routes.

There is no `next.config.js` — the app uses Next.js 14.1.0 defaults.

---

## Role-Gated Navigation

The sidebar filters pages by the authenticated user's role. Key restrictions:

| Area | Allowed Roles |
|---|---|
| `/settings/*` | Director, Department Head |
| `/settings/operations` | Director, System Manager |
| `/settings/anda-import` | Director, System Manager |
| `/projects` (project workspace) | Director, Project Head |
| `/project-head/*` (approval, requests) | Director, Project Head |
| `/finance/costing-queue/*` | Director, Accounts, System Manager |
| `/hr/*` | Director, Department Head, HR Manager |
| `/pre-sales/*` | Director, Department Head, Presales Tendering Head, Presales Executive |
| `/pre-sales/approvals` | Director only |

Full access matrix: `src/context/RoleContext.tsx` → `roleAccess` map.

### Admin-Only Pages

- `/settings/operations` — System operation tools, Director or System Manager only
- `/settings/anda-import` — ANDA data import, Director or System Manager only
- `/pre-sales/approvals` — Director-only bid approvals

---

## Smoke-Test URLs

After starting the production server, verify these pages load correctly:

| URL | What to check |
|---|---|
| `/login` | Login form renders, accepts credentials |
| `/` | Dashboard loads for authenticated user |
| `/projects` | Project list loads (Director/Project Head) |
| `/execution` | Execution hub with DPR list |
| `/execution/sites` | Sites register with add/edit |
| `/inventory` | Inventory landing page |
| `/project-manager/inventory` | PM inventory view |
| `/project-head/approval` | Approval hub |
| `/finance/costing-queue` | Costing queue list |
| `/finance/commercial` | Commercial landing (no demo-seed button) |
| `/pre-sales/bids` | Bid list |
| `/settings/operations` | Admin operations page |
| `/settings/anda-import` | ANDA import page |

---

## Rollback

If a deployment produces a bad build:

1. Keep the previous `.next/` output directory as a backup before deploying.
2. To rollback: restore the previous `.next/` directory and restart `npm start`.
3. Alternatively, checkout the last known-good commit, `npm install && npm run build && npm start`.

---

## Test Commands

```bash
# Full production build verification
npm run build

# Smoke tests (role-access matrix validation, no backend needed)
npx vitest run src/__tests__/smoke-routes.test.ts

# All tests
npm test
```

For final release smoke, also verify file-backed flows after login:

- site bulk upload template download from `/execution`
- commercial document share on `/finance/commercial`
- any DMS-backed upload/download path your release depends on

---

## File Structure Quick Reference

```
src/
  app/
    api/          → Server-side API routes (proxy to Frappe)
    login/        → Login page
    (other dirs)  → Feature pages
  components/
    Sidebar.tsx   → Role-filtered navigation
    shells/       → Layout shells (FormModal, PageShell)
    ui/           → Shared UI components (LinkPicker, entity pickers)
    ops/          → Operations workspace components
  context/
    AuthContext.tsx  → Authentication state
    RoleContext.tsx  → Role definitions and access matrix
  lib/
    typedApi.ts     → Typed API client wrappers
    frappeClient.ts → Low-level Frappe HTTP client
```
