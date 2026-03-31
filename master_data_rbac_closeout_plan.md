# Master Data RBAC Closeout Plan

Date: 2026-03-23

## Purpose

This document isolates the remaining work for the `Master Data` surface so it can be closed without reopening broader product scope.

Use this after:

- `frontend_depth_closeout_plan.md`
- `reports_rbac_closeout_plan.md`

## Current Reality

The master-data page exists and is usable:

- [master-data/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/master-data/page.tsx)

It already supports:

- client list
- vendor list
- organization list
- create/edit/delete for the current supported records

Relevant backend/master seed surfaces already exist too:

- [master_data.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/master_data.py)
- [api.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/api.py)

## Actual Gap

`/master-data` is still visible in frontend role maps and navigation, but it is **not yet modeled as a first-class backend-gated route family** in:

- [permission_engine.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/permission_engine.py)

That means the route is still weaker than the main governed lanes such as:

- `/projects`
- `/engineering`
- `/procurement`
- `/execution`
- `/finance`
- `/hr`
- `/documents`
- `/reports`

## What “Done” Should Mean

Master Data is complete only when:

1. `/master-data` is explicitly gated by backend RBAC.
2. There is a real backend capability for master-data access.
3. Role-pack mappings grant this route intentionally.
4. Frontend fallback visibility matches backend truth.
5. Route guard, sidebar, and backend payload agree.

## Recommended Implementation

## Phase M1: Add Master Data To Backend Route Truth

### Goal

Make `Master Data` a real gated route family.

### Work

- add a capability in [rbac_seed.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/rbac_seed.py):
  - `master_data.module.access`
- add a route family in [permission_engine.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/permission_engine.py):
  - `"/master-data"`
- add a module-to-capability mapping:
  - `master_data -> master_data.module.access`

### Rule

Do not expand this into row-level permission modeling right now.

This pass is about route-truth closure, not granular CRUD policy redesign.

## Phase M2: Add Master Data Pack

### Goal

Grant master-data access deliberately.

### Work

- add a `master_data` permission pack in [rbac_seed.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/rbac_seed.py)
- keep the pack minimal for now:
  - `master_data.module.access`

### Suggested default grants

- `Director` -> `master_data`, `all`, `action`
- `Department Head` -> `master_data`, `all` or `department`, `action`
- optionally `Project Head` -> `master_data`, `read` only if business wants visibility

### Keep out unless explicitly approved

- `Project Manager`
- `Presales Executive`
- `Engineer`
- `Purchase`
- `Store Manager`
- `Stores Logistics Head`
- `Field Technician`
- `OM Operator`
- `RMA Manager`
- `HR Manager`
- `Accounts`

Unless the client explicitly wants broad master-data self-service, this should stay tightly controlled.

## Phase M3: Align Frontend Fallback And Sidebar

### Goal

Prevent fallback-mode UI from exposing `Master Data` to roles that backend truth would deny.

### Work

- update [RoleContext.tsx](/workspace/development/Erp_code/erp_frontend/src/context/RoleContext.tsx)
- keep `/master-data` only for the roles actually granted by the new pack
- confirm [Sidebar.tsx](/workspace/development/Erp_code/erp_frontend/src/components/Sidebar.tsx) and [RouteGuard.tsx](/workspace/development/Erp_code/erp_frontend/src/components/RouteGuard.tsx) remain aligned

## Phase M4: Validate

### Source checks

Add a small source-level test file such as:

- `test_master_data_rbac_structure.py`

Minimum assertions:

- `permission_engine.py` includes `/master-data`
- `rbac_seed.py` includes `master_data.module.access`
- `rbac_seed.py` includes a `master_data` pack
- expected role-pack mappings exist
- frontend fallback visibility matches intended role set

### Runtime checks

After `bench --site dev.localhost migrate`, verify:

- an allowed user gets `/master-data` in:
  - `gov_erp.permission_engine.get_accessible_routes`
- a denied user does **not** get `/master-data`

Suggested users:

- allowed:
  - `director@technosys.local`
  - `dept.head@technosys.local`
- denied:
  - `project.manager@technosys.local`
  - `field.tech@technosys.local`
  - `presales.exec@technosys.local`

### Frontend checks

- run `npm test`
- run `npm run build`

## Nice-To-Have But Not Required For Closure

These are not part of the RBAC closeout itself:

- richer organization editing
- advanced vendor/client validation workflows
- import/export for master records
- duplicate detection improvements
- approval workflow for master-data changes

Those are future product improvements, not blockers for route-truth closure.

## Acceptance Criteria

Master Data can be marked closed when:

1. `/master-data` is explicitly governed in backend RBAC.
2. The route no longer depends on frontend-only visibility assumptions.
3. At least one allowed and one denied runtime check pass.
4. Frontend fallback and backend truth agree.
5. Build and tests pass after the change.

## Recommended Next Step

Implement `Phase M1 + M2 + M3` together in one pass.

Then validate with:

1. `pytest`
2. `bench migrate`
3. live `get_accessible_routes(...)`
4. `npm test`
5. `npm run build`

Do not expand into “master data workflow redesign” during this pass.
