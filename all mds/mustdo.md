# Must Do

This is the discrepancy-driven must-fix list for the current app state.

## 1. Route-Level Access Control

- [x] Add real route/page-level role guards so hidden nav items are not still reachable by URL.
- [x] Enforce role access centrally in the frontend shell or a dedicated route guard, not only in the sidebar.
- [x] Verify sensitive pages like `/projects` and `/settings/*` are blocked for non-authorized roles even with direct URL access.

## 2. Projects Access Model

- [x] Decide the final rule for `/projects` and enforce it consistently in frontend and backend.
- [x] If `Projects` is project-side only, remove department-role fallback behavior from [projects/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/projects/page.tsx).
- [x] Align backend spine access in [api.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/api.py) with the intended project-side visibility model.
- [x] Recheck whether `Project Manager` should retain the current full project workspace behavior.

## 3. RBAC Truthfulness

- [x] Align the frontend stage-visibility policy with actual backend stage filtering.
- [x] Reconcile mismatches between [stage-visibility/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/settings/stage-visibility/page.tsx) and backend `DEPARTMENT_STAGE_MAP` in [api.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/api.py).
- [x] Add missing active roles to the stage matrix:
  - [x] `Purchase`
  - [x] `Stores Logistics Head`
  - [x] `Department Head`
- [x] Make clear which access rules are truly enforced by backend versus only documented in frontend policy pages.

## 4. Settings Cleanup

- [x] Finish the ERP-level `/settings` migration.
- [x] Replace redirect-only settings wrappers with real settings pages where required.
- [x] Remove the split-brain between `/settings/*` and `/pre-sales/settings/*`.
- [x] Separate live settings from informational/policy settings in the UI.

## 5. Credentials And Demo Hygiene

- [x] Remove plaintext POC password from [poc_login_list.md](/workspace/development/Erp_code/poc_login_list.md).
- [x] Keep credentials env-driven or site-config driven only through [poc_setup.py](/workspace/development/frappe-bench/apps/gov_erp/gov_erp/poc_setup.py).
- [x] Make [DEMO_CREDENTIALS.md](/workspace/development/Erp_code/DEMO_CREDENTIALS.md) and [poc_login_list.md](/workspace/development/Erp_code/poc_login_list.md) consistent and non-secret-bearing.
- [x] Keep one canonical login/provisioning document and make the other reference it.

## 6. Pre-Sales Boundary Cleanup

- [x] Reconcile project-side role access with the rule that pre-sales should end after tender-to-project conversion.
- [x] Decide whether `Project Head` and `Project Manager` should still see any `/pre-sales` routes.
- [x] Remove stale post-conversion pre-sales visibility if it conflicts with the project-spine model.

## 7. Documentation Alignment

- [x] Update [remaining_todo.md](/workspace/development/Erp_code/all%20mds/remaining_todo.md) to reflect these concrete discrepancies.
- [x] Add a short RBAC truth-table note covering:
  - [x] nav visibility
  - [x] route/page access
  - [x] backend data access
  - [x] stage visibility
- [x] Mark which settings screens are authoritative and which are reference/policy views.

## Recommended Fix Order

1. Route-level guards
2. `/projects` access model cleanup
3. POC credential cleanup
4. Backend/frontend stage-policy alignment
5. Settings migration cleanup
6. Pre-sales boundary cleanup
7. Doc alignment

## QA Re-Run Status

- [x] Route-level guards are active through [RouteGuard.tsx](/workspace/development/Erp_code/erp_frontend/src/components/RouteGuard.tsx).
- [x] `/projects` is now project-side only in both the page logic and backend workspace access.
- [x] Backend department stage lanes are aligned with the frontend stage-visibility model at the visibility-lane level.
- [x] `Project Head` and `Accounts` no longer retain stale `/pre-sales` access.
- [x] `/settings/*` is now the canonical implementation surface, and `/pre-sales/settings/*` wraps back to it.
- [x] Frontend production build passes after these fixes.
