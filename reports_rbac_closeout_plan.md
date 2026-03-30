# Reports RBAC Closeout Plan

Date: 2026-03-23

## Purpose

This document isolates the remaining work for the `Reports` surface so it can be closed cleanly without reopening unrelated scope.

Use this after:

- `frontend_depth_closeout_plan.md`
- the Phase 5 audit notes

## Current Reality

The reports page exists and is functional:

- [reports/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/reports/page.tsx)

It already shows live cross-module metrics and CSV export.

But it is **not yet fully RBAC-hardened** in the same way as the other major lanes.

## Actual Gap

Right now:

- `/reports` is still present in the frontend fallback role map
- the sidebar shows `Reports`
- but `Reports` is **not** modeled as its own backend-gated route family in:
  - [permission_engine.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/permission_engine.py)

That means:

- access behavior depends more on frontend curation than backend route truth
- the system is still slightly weaker here than for `projects`, `engineering`, `procurement`, `execution`, `finance`, `hr`, `om`, and `documents`

## What “Done” Should Mean

Reports is complete only when all of the following are true:

1. `/reports` is explicitly governed by backend RBAC route logic.
2. There is a real backend capability for reports access.
3. The relevant role-pack mappings grant or deny reports intentionally.
4. The frontend fallback map matches backend truth.
5. The route guard, sidebar, and live backend permission payload all agree.

## Recommended Implementation

## Phase R1: Add Reports To Backend RBAC Truth

### Goal

Make `Reports` a first-class gated route family.

### Work

- add a new capability in [rbac_seed.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/rbac_seed.py):
  - `reports.module.access`
- add a new route family in [permission_engine.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/permission_engine.py):
  - `"/reports"`
- add a module-to-capability mapping:
  - `reports -> reports.module.access`

### Decision rule

Do **not** overdesign this into a full report-builder permission system right now.

For this closure pass, only gate access to the existing reports hub.

## Phase R2: Add Reports Pack

### Goal

Grant reports access intentionally instead of by accident.

### Work

- add a `reports` permission pack in [rbac_seed.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/rbac_seed.py)
- keep it minimal:
  - `reports.module.access`

### Suggested default grants

- `Director` -> `reports`, `all`, `read/action`
- `Department Head` -> `reports`, `department`, `read`
- `Project Head` -> `reports`, `all`, `read`
- `Project Manager` -> `reports`, `assigned_project`, `read`
- `Presales Tendering Head` -> `reports`, `department`, `read`
- `Engineering Head` -> `reports`, `department`, `read`
- `Procurement Manager` -> `reports`, `department`, `read`
- `Accounts` -> `reports`, `department`, `read`
- `HR Manager` -> `reports`, `department`, `read`
- `RMA Manager` -> `reports`, `department`, `read`
- `OM Operator` -> `assigned_project` or `department`, depending on current operational expectation

### Keep out unless explicitly needed

- `Presales Executive`
- `Engineer`
- `Purchase`
- `Store Manager`
- `Stores Logistics Head`
- `Field Technician`

These can be added later if the business explicitly wants them to consume the reports hub.

## Phase R3: Align Frontend Fallback

### Goal

Prevent fallback-mode nav from showing routes the backend would deny.

### Work

- update [RoleContext.tsx](/workspace/development/Erp_code/erp_frontend/src/context/RoleContext.tsx)
- keep `/reports` only for the same roles that the backend reports pack grants
- verify [Sidebar.tsx](/workspace/development/Erp_code/erp_frontend/src/components/Sidebar.tsx) and [RouteGuard.tsx](/workspace/development/Erp_code/erp_frontend/src/components/RouteGuard.tsx) still behave correctly

## Phase R4: Test And Validate

### Source checks

Add a small source-level test file such as:

- `test_reports_rbac_structure.py`

Minimum assertions:

- `permission_engine.py` includes `/reports`
- `rbac_seed.py` includes `reports.module.access`
- `rbac_seed.py` includes a `reports` pack
- the expected role-pack mappings exist
- `RoleContext.tsx` fallback visibility matches the intended role set

### Runtime checks

After `bench --site dev.localhost migrate`, verify:

- a reports-allowed user gets `/reports` in:
  - `gov_erp.permission_engine.get_accessible_routes`
- a reports-disallowed user does **not** get `/reports`

Suggested users:

- allowed:
  - `director@technosys.local`
  - `project.manager@technosys.local`
  - `hr.manager@technosys.local`
- denied:
  - `field.tech@technosys.local`
  - `presales.exec@technosys.local`

### Frontend checks

- run `npm test`
- run `npm run build`

## Nice-To-Have But Not Required For Closure

These are not part of the RBAC closeout itself:

- PDF export
- XLS export
- report favorites
- filtered report gallery
- department-specific report templates
- saved report presets

Those are product enhancements, not blockers for route-truth closure.

## Acceptance Criteria

Reports can be marked closed when:

1. `/reports` is explicitly gated in backend RBAC.
2. The reports route no longer relies on frontend-only visibility assumptions.
3. Role-based runtime checks pass for at least one allowed and one denied user.
4. Frontend fallback and backend payload stay aligned.
5. Build and tests pass after the change.

## Recommended Next Step

Implement `Phase R1 + R2 + R3` together in one pass.

Then validate with:

1. `pytest`
2. `bench migrate`
3. live `get_accessible_routes(...)`
4. `npm test`
5. `npm run build`

Do not expand into “full reports module redesign” during this pass.
