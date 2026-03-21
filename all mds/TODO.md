# Master TODO

Last consolidated: 2026-03-17

This is the canonical, current task tracker for the repo.

Use this file for active planning.

Other overlapping docs are now reference material only:

- `remaining_todo.md` = detailed historical execution log
- `backend_todo.md` = backend-specific archive / notes
- `FRONTEND_GAP_STATUS.md` = frontend implementation audit and partial-gap notes
- `CURRENT_STUBS_AND_404_FINDINGS.md` = UX cleanup reference

## Recently Closed

- [x] Major backend foundation, workflow APIs, and runtime tests
- [x] Main missing frontend pages and API proxy routes
- [x] Role dashboards wired to live backend data
- [x] Demo seed data and live walkthrough verification
- [x] Frontend settings moved to ERP-level `/settings`
- [x] `Projects` tab restricted to project-side roles only in frontend navigation
- [x] Initial settings UX for roles, permissions, and stage visibility
- [x] Route-level role guards — `RouteGuard` component blocks direct URL access for unauthorized roles
- [x] `/projects` access model — removed `Department Head` from full-picture view, project-side only
- [x] POC credential cleanup — plaintext passwords removed from docs, provisioning via site config
- [x] Stage-policy alignment — added `Department Head`, `Purchase`, `Stores Logistics Head` to stage matrix; aligned `Engineering Head`/`Engineer`/`HR Manager` with backend `DEPARTMENT_STAGE_MAP`
- [x] Settings migration — redirect stubs replaced with re-exports; `/pre-sales/settings` → `/settings` canonical
- [x] Pre-sales boundary — removed `/pre-sales` from `Project Manager`; post-conversion roles stay on spine

## Active Priorities

### 1. Project Spine Alignment

- [ ] Implement the backend `Project -> Site -> Stage` spine more explicitly where still missing
- [ ] Add project summary, site coverage, and action-queue behavior aligned with `backend_project_spine_model.md`
- [ ] Keep department tabs as project/site/stage-aware lenses instead of generic cross-module visibility
- [ ] Verify frontend navigation, dashboard visibility, and backend role guards remain aligned after the new settings/RBAC changes

### 2. Frontend Workflow Depth

- [ ] Expand `/pre-sales/approvals` beyond vendor comparison so each supported approval type has real approve/reject handling
- [ ] Add proper date-range filtering and export UX on `/pre-sales/mis/*`
- [ ] Add inline DPR edit/delete flows on `/execution`
- [ ] Deepen `/rma` lifecycle actions beyond the current simplified workflow
- [ ] Surface more of the backend ticket action spectrum in `/om-helpdesk`
- [ ] Build richer guided UX for purchase-order creation from vendor comparison
- [ ] Build richer SLA workflow UX for timers, penalty rules, penalty records, and related actions
- [ ] Add organization edit/delete when matching backend methods exist

### 3. UX Cleanup

- [ ] Replace remaining browser `alert()` flows with proper in-app feedback
- [ ] Replace remaining `prompt()`-based workflow inputs with structured modals/forms
- [ ] Replace remaining `confirm()` destructive actions with proper confirmation dialogs

### 4. Backend / Integration Follow-Up

- [ ] Review frontend endpoint contracts against the secured backend APIs
- [ ] Decide whether ERPNext `Task` linkage still needs custom-field work or whether milestone/dependency linkage is sufficient
- [ ] Add GRN-facing helpers or endpoints on top of `Purchase Receipt` if stores scope expands
- [ ] Add backend/API coverage for budget allocations if that module is needed in the frontend
- [ ] Add backend/API coverage for PDC instruments if that module is needed in the frontend

### 5. Org / RBAC Fidelity

- [ ] Refine designation-to-role mapping against `backend_org_mapping.md`
- [ ] Decide which future aliases/roles should be made explicit next: `Accounts Head`, `Project Coordinator`, `Network Engineer`, `Operator`, `Technical Executive`, `MIS Executive`, `Floor Incharge`
- [ ] Reduce reliance on generic stand-ins like `Department Head` where explicit business roles are now known

### 6. Repo And Data Hygiene

- [ ] Clean or explicitly ignore the remaining local-only source artifacts before the next push
- [ ] Keep tracker docs aligned so completed work does not remain listed as open
- [ ] Continue improving client tracker fidelity and data import alignment where required

### 7. Production Readiness

- [ ] Define production env/secrets strategy and templates
- [ ] Define deployment topology and supervised process startup
- [ ] Add backup, restore, and migration runbooks
- [ ] Add monitoring, alerting, and uptime checks
- [ ] Add browser-level E2E smoke coverage for the core journey
- [ ] Add release/CI checks for backend tests, frontend build, and deployment gates
- [ ] Complete focused security review of uploads, auth/session handling, permissions, and dependencies

## Notes

- This file is intentionally shorter than the archive docs.
- If a task needs detailed historical context, follow the reference docs listed at the top instead of duplicating detail here.

## RBAC Truth Table

How access control is enforced at each layer:

| Layer | Where | How | Authoritative? |
|-------|-------|-----|----------------|
| **Nav visibility** | `Sidebar.tsx` → `shouldShowNavLinkForRole()` + `filterAccessibleNavLinks()` | Filters visible nav items by `roleAccess` map and `PROJECT_SIDE_ROLES` | Yes — controls what users see |
| **Route/page access** | `RouteGuard.tsx` (inside `AppShell`) | Blocks rendering + shows "Access Denied" for disallowed paths | Yes — enforced client-side on every route |
| **Backend data access** | `api.py` → `_require_roles()` family | Each whitelisted endpoint calls its domain guard; Director/System Manager bypass | Yes — server-side, cannot be bypassed |
| **Stage visibility** | `/settings/stage-visibility` → `ROLE_STAGE_MAP` | 17-role × 9-stage matrix (full/read/none); informational display of intended policy | **Policy view** — not enforced at runtime; backend enforces via `DEPARTMENT_STAGE_MAP` |

### Settings screens: authoritative vs policy/reference

| Screen | Type | Notes |
|--------|------|-------|
| `/settings/department` | **Live** | CRUD against Frappe `Department` DocType |
| `/settings/designation` | **Live** | CRUD against Frappe `Designation` DocType |
| `/settings/user-management` | **Live** | CRUD against Frappe `User` DocType |
| `/settings/checklist` | **Live** | CRUD against `Tender Checklist` DocType |
| `/settings/roles` | **Reference** | Displays role categories and module mapping; does not change backend roles |
| `/settings/permissions` | **Reference** | Displays permission profiles and enforcement notes; does not change backend permissions |
| `/settings/stage-visibility` | **Reference** | Displays stage-visibility matrix; does not change backend stage filtering |

