# Remaining To Do

## Purpose

This is the clean remaining-work list for the current ERP state.

Use this instead of reconstructing status from chat.

## Current Position

- Core backend foundation exists
- Core frontend shell exists
- Main ERP spirit is understood:
  - `Project as spine`
  - `Departments as lenses`
  - `Hierarchy as access altitude`
- `2026-03-15`: Priority 4 live smoke pass completed on clean local instances
  - frontend verified on `3010`
  - backend verified on `8010`
  - settings, pre-sales finance, MIS, and documents route cluster answered successfully
- `2026-03-15`: Priorities 1, 2, 3 fully executed and live on `dev.localhost`
  - `Project Head` role seeded and confirmed live in `tabRole`
  - 5 role aliases added as Python constants in `role_utils.py`
  - 10 client departments seeded via `master_data.py` (`seed_departments`)
  - 29 designations seeded via `master_data.py` (`seed_designations`)
  - 5 new ANDA tracker DocTypes live in DB: `GE Project Communication Log`, `GE Project Asset`, `GE Petty Cash`, `GE Manpower Log`, `GE Device Uptime Log`
  - `GE Site`, `GE Milestone`, `GE Vendor Comparison`, `GE Invoice`, `GE Dispatch Challan` extended and migrated
  - `bench migrate` completed cleanly, all gov_erp DocTypes at 100%
- `2026-03-15`: Priority 7 frontend wiring completed in `erp_frontend`
  - All 7 role dashboards now fetch live data from `/api/dashboards/[dashboard]`
  - Executive landing dashboard now fetches live portfolio aggregates
  - `/documents` now reads custom `GE Document Folder` and `GE Project Document` APIs instead of mock data
  - `npm run build` passed after the live integration changes
- `2026-03-15`: Priority 11 repo hygiene executed to commit-and-push level
  - curated repo snapshot committed as `1b12afb` and pushed to `origin/master`
  - repo backend mirror matches the live bench app copy after sync verification
  - remaining repo hygiene is now limited to local untracked source artifacts that were intentionally kept out of Git
- `2026-03-16`: Priority 1 DocType layer executed to completion
  - created `GE Test Result Item` child table for `GE Test Report` (test_case_id, description, expected_result, actual_result, status, remarks)
  - `GE Device Register` `ip_address` field changed from plain `Data` to `Link` → `GE IP Allocation`
  - alert/escalation confirmed as config-driven via existing `GE SLA Profile.escalation_user` — no admin DocType needed now
  - `bench migrate` clean, all 76 gov_erp DocTypes live
  - repo mirror synced
- `2026-03-16`: Priority 2 Backend & API layer executed to completion
  - 17 workflow helper APIs added to `api.py` (7143 lines total):
    - Technical Deviation: `approve`, `reject`, `close`
    - Change Request: `submit`, `approve`, `reject`
    - Test Report: `approve`, `reject`
    - Device Register: `commission`, `mark_faulty`, `decommission` (auto-releases IP allocation)
    - IP Allocation: `release`
    - Commissioning Checklist: `start`, `complete` (validates all items done)
    - Client Signoff: `sign`, `approve`
    - Drawing: `submit`, `approve`, `supersede`
  - 15 new Next.js proxy routes created under `/api/engineering/*` and `/api/execution/*`:
    - `engineering/technical-deviations`, `engineering/drawings`, `engineering/change-requests`
    - `execution/dependency-rules`, `execution/dependency-overrides`
    - `execution/project-team-members`, `execution/project-assets`
    - `execution/commissioning/device-registers`, `execution/commissioning/ip-pools`, `execution/commissioning/ip-allocations`, `execution/commissioning/device-uptime-logs`
    - `execution/commissioning/test-reports`, `execution/commissioning/checklists`, `execution/commissioning/client-signoffs`
  - All role/access guards verified: `_require_roles()` with proper business role checks
  - Backend tests: 9/9 passed
  - Frontend build: clean pass
  - Repo mirror synced
  - `2026-03-16`: Demo operational dataset seeded for walkthrough prep
    - added idempotent seeder at `backend/gov_erp/gov_erp/demo_seed.py`
    - populated live records on `dev.localhost` for cost sheets, budget allocations, material requests, vendor comparisons, dispatch challans, sites, milestones, drawings, deviations, change requests, invoices, document folders, project documents, project team/assets, petty cash, manpower, commissioning, tickets, RMA, SLA, PDC, and dependency rules
    - second run created `0` additional records across all seeded DocTypes, confirming idempotency

The main remaining work is fidelity, integration, and alignment with client trackers and org hierarchy.

## Right Now

This is the practical next-action list, in order.

1. Re-run the full walkthrough on the newly seeded live demo journey so Priority 10 can be closed honestly
  - verify tender, survey, BOQ, costing, procurement, dispatch, execution, billing, and ticket/RMA screens against the seeded records
2. Close the QA gap on demo-critical pages
  - confirm each page shows real records where available
  - where records are still absent, keep explicit honest empty states instead of implied completeness
3. Refine workflow helper APIs for engineering and commissioning
  - move beyond CRUD and add action-oriented flow helpers where operators need guided state transitions
4. Do the final low-priority repo cleanup
  - remove, relocate, or ignore the leftover local-only source artifacts before the next push

## Frontend Screen Map For Missing Entity UIs

These backend APIs exist, but still do not have dedicated frontend screens in the current Next app.

### 1. Engineering → Technical Deviations

Build route:

- `erp_frontend/src/app/engineering/deviations/page.tsx`

Use this screen for:

- `create_technical_deviation`
- `get_technical_deviation`
- `get_technical_deviations`
- `update_technical_deviation`
- `delete_technical_deviation`

Reason:

- technical deviation belongs to Module 7 Engineering & Design, next to drawings and change requests

### 2. Execution → Dependency Rules & Overrides

Build route:

- `erp_frontend/src/app/execution/dependencies/page.tsx`

Use this screen for:

- `create_dependency_override`
- `approve_dependency_override`
- `reject_dependency_override`
- `get_dependency_overrides`
- `create_dependency_rule`
- `update_dependency_rule`
- `delete_dependency_rule`
- `get_dependency_rules`

Reason:

- dependency engine is part of Module 6 Project Execution, not Engineering BOQ

### 3. Execution → Project Structure

Build route:

- `erp_frontend/src/app/execution/project-structure/page.tsx`

Use this screen for:

- `create_project_team_member`
- `get_project_team_member`
- `get_project_team_members`
- `update_project_team_member`
- `delete_project_team_member`
- `create_project_asset`
- `get_project_asset`
- `get_project_assets`
- `update_project_asset`
- `delete_project_asset`

Reason:

- project team mapping and project assets are execution-side project structure entities, not inventory stock or HR master data

### 4. Execution → Commissioning → Devices & IP

Build route:

- `erp_frontend/src/app/execution/commissioning/devices/page.tsx`

Use this screen for:

- `create_device_register`
- `get_device_register`
- `get_device_registers`
- `update_device_register`
- `delete_device_register`
- `create_device_uptime_log`
- `get_device_uptime_log`
- `get_device_uptime_logs`
- `update_device_uptime_log`
- `delete_device_uptime_log`
- `create_ip_pool`
- `get_ip_pool`
- `get_ip_pools`
- `update_ip_pool`
- `delete_ip_pool`
- `create_ip_allocation`
- `get_ip_allocation`
- `get_ip_allocations`
- `update_ip_allocation`
- `delete_ip_allocation`

Reason:

- device register, uptime, IP pools, and IP allocations all sit inside Module 8 Network & Commissioning and should be managed together

### 5. Execution → Commissioning → Test Reports

Build route:

- `erp_frontend/src/app/execution/commissioning/test-reports/page.tsx`

Use this screen for:

- `create_test_report`
- `get_test_report`
- `get_test_reports`
- `update_test_report`
- `delete_test_report`

Reason:

- test reports are commissioning deliverables and should live beside device/IP and client signoff work, not inside BOQ or RMA

### Optional Navigation Update

If these screens are built, the sidebar should expand `Execution (I&C)` into child routes for:

- `Dependencies`
- `Project Structure`
- `Commissioning / Devices & IP`
- `Commissioning / Test Reports`

And `Engineering` should gain:

- `Technical Deviations`

## Priority 1: DocTypes To Create Or Reuse

This priority is the data-model layer only.

### Reuse ERPNext Built-ins

- [x] Reuse `Material Request` for indent flow
- [x] Reuse `Purchase Order` for PO flow
- [x] Reuse `Purchase Receipt` for GRN flow
- [x] Reuse `Warehouse` and `Bin` for stock views
- [x] Reuse `Project`, `Task`, `Item`, `Supplier`, and `Employee` where already suitable

### Custom DocTypes Already Created

- [x] `GE Budget Allocation`
- [x] `GE Document Folder`
- [x] `GE Project Document`
- [x] `GE PDC Instrument`
- [x] `GE Drawing`
- [x] `GE Technical Deviation`
- [x] `GE Change Request`
- [x] `GE Device Register`
- [x] `GE IP Pool`
- [x] `GE IP Allocation`
- [x] `GE Commissioning Checklist`
- [x] `GE Commissioning Checklist Item`
- [x] `GE Test Report`
- [x] `GE Test Result Item` (child table of GE Test Report)
- [x] `GE Client Signoff`
- [x] `GE Project Communication Log`
- [x] `GE Project Asset`
- [x] `GE Petty Cash`
- [x] `GE Manpower Log`
- [x] `GE Device Uptime Log`
- [x] `GE Dependency Rule`
- [x] `GE Dependency Override`
- [x] `GE Project Team Member`

### Existing DocTypes Already Extended

- [x] `GE Site`
- [x] `GE Milestone`
- [x] `GE Vendor Comparison`
- [x] `GE Invoice`
- [x] `GE Dispatch Challan`
- [x] `GE Tender Checklist Item`

### Remaining DocType Work

- [x] Confirm whether any new child DocType or configuration DocType is still needed for engineering/commissioning workflow helpers
  - **Done 2026-03-16**: Created `GE Test Result Item` child table for `GE Test Report` so individual test cases track pass/fail
  - **Done 2026-03-16**: Changed `GE Device Register.ip_address` from `Data` to `Link` → `GE IP Allocation`
- [x] Confirm whether alert/escalation settings should stay config-driven only or need a custom admin DocType later
  - **Done 2026-03-16**: Config-driven via `GE SLA Profile.escalation_user` is sufficient for current scope; defer escalation matrix DocType to future enhancement

## Priority 2: Backend And API Creation

This priority is backend logic, wrappers, CRUD, workflow actions, and frontend proxy routes.

### Already Complete

- [x] ERPNext wrapper APIs for indent / PO / GRN / stock
- [x] Dashboard aggregation APIs for role dashboards
- [x] Document management APIs
- [x] CRUD APIs for engineering, commissioning, dependency, project structure, RMA, HR, finance, dispatch, and related modules
- [x] Frontend proxy coverage for major live modules already surfaced in the app

### Remaining Backend/API Work

- [x] Add/refine workflow helper APIs for engineering and commissioning where CRUD exists but guided lifecycle actions are still thin
  - **Done 2026-03-16**: Technical deviation approve/reject/close, change request submit/approve/reject, test report approve/reject, device commission/faulty/decommission, IP release, commissioning start/complete, client signoff sign/approve, drawing submit/approve/supersede
- [x] Review whether any of the newly planned frontend screens still need dedicated Next proxy routes instead of generic backend hookups
  - **Done 2026-03-16**: 15 proxy routes created under `/api/engineering/*` and `/api/execution/*` — all action-based POST dispatch (action field selects workflow helper)
- [x] Keep role/access guards aligned with business roles as new workflow actions are added
  - **Done 2026-03-16**: All 17 new workflow helpers use `_require_roles()` with correct business roles (Engineering Head, Project Manager, Project Head, Field Technician as appropriate)

## Priority 3: Frontend Screens And Backend Connections

This priority is dedicated UI modules and their connection to backend APIs.

### Already Complete

- [x] Live dashboard wiring for all 7 role dashboards
- [x] Executive dashboard live aggregates
- [x] Documents module wiring
- [x] Survey, inventory, execution, finance billing, finance costing, O&M helpdesk, and RMA core screens connected to live backend actions

### Remaining Frontend Work

- [x] Build `erp_frontend/src/app/engineering/deviations/page.tsx`
  - **Done 2026-03-16**: Stats, table, create modal, approve/reject/close actions wired via `/api/engineering/technical-deviations`
- [x] Build `erp_frontend/src/app/execution/dependencies/page.tsx`
  - **Done 2026-03-16**: Two-tab (Rules + Overrides) with dual modals, approve/reject on overrides wired via `/api/execution/dependency-rules` and `/api/execution/dependency-overrides`
- [x] Build `erp_frontend/src/app/execution/project-structure/page.tsx`
  - **Done 2026-03-16**: Two-tab (Team + Assets) with dual modals wired via `/api/execution/project-team-members` and `/api/execution/project-assets`
- [x] Build `erp_frontend/src/app/execution/commissioning/devices/page.tsx`
  - **Done 2026-03-16**: Four-tab page (Devices, IP Pools, IP Allocations, Uptime Logs) with commission/faulty/decommission/release actions wired via commissioning proxy routes
- [x] Build `erp_frontend/src/app/execution/commissioning/test-reports/page.tsx`
  - **Done 2026-03-16**: Three-tab page (Test Reports, Checklists, Client Signoffs) with submit/approve/reject/start/complete/sign actions wired via commissioning proxy routes
- [x] Update sidebar/navigation so these screens are reachable from `Engineering` and `Execution (I&C)`
  - **Done 2026-03-16**: Engineering gained Technical Deviations child; Execution (I&C) gained Dependencies, Project Structure, and Commissioning sub-group with Devices & IP and Test Reports & Signoffs
- [x] Keep honest empty states on every newly connected page where live records are still sparse
  - **Done 2026-03-16**: All 5 new pages show explicit empty-state rows ("No devices registered", "No test reports", etc.) when no data exists

## Priority 4: QA Across 1 + 2 + 3

This priority is verification of DocTypes, backend/API behavior, frontend screens, and real user flow.

### Already Complete

- [x] Live smoke pass on major frontend routes
- [x] Role-visibility validation with real POC users
- [x] Focused backend regression tests for API permission cleanup
- [x] Frontend production build validation on the live integration wave
- [x] Full frontend↔backend connectivity QA (`2026-03-16`)
  - 160 unique `callFrappeMethod` names cross-checked against 462 backend `def` functions: 0 mismatches
  - 23 proxy routes verified (proper 401-style JSON without auth, real data with auth)
  - 14 frontend pages return HTTP 200
  - 8 stats/dashboard API endpoints OK
  - Backend unit tests: 9/9 passed
  - Frontend production build: clean pass (exit 0)
  - Fixed 4 proxy routes that sent empty string for optional Int params (`dependency-rules`, `project-team-members`, `parties`, `organizations`): `|| ''` → `|| undefined`
  - Repo synced to bench (`api.py`, `role_utils.py`, `ge_vendor_comparison.json`), `bench migrate` clean
  - Commit `18abea5` pushed to `origin/master`

### Remaining QA Work

- [x] Load or create enough live demo data for costing, procurement, dispatch, execution, billing, and ticket flow
  - **Done 2026-03-16**: `demo_seed.py` populated the previously empty operational modules around `PROJ-0001` / `TEND-2026-001`
- [ ] Run the full live walkthrough of the main journey:
  - tender
  - survey
  - BOQ
  - costing
  - procurement
  - dispatch
  - execution
  - billing
  - ticket / RMA
- [ ] Make sure every demo-critical page uses real data or an honest empty state

## Low-Priority: Repo Hygiene

- [x] Repo backend copy and live bench copy are in sync
- [ ] Clean remaining local-only repo artifacts before next push
  - `ANDA.xlsx`
  - `HR Organitional Chart.xlsx`
  - `RMA Department & Help Desk.xlsx`
  - `WhatsApp Image 2026-03-14 at 6.45.20 PM.jpeg`
  - `anda acess.md`
  - `hiearchy.jpeg`
  - `notes.txt`
- [x] Keep tracker/docs aligned

## Status Summary

If judged against the intended ERP spirit:

- backend/domain alignment: roughly `89%`
- whole product alignment: roughly `84%`
- dashboards: `100% live` for the role dashboards, executive dashboard, and documents hub

The remaining gap is mostly:

- **Right now:** finish live demo data + walkthrough closure first
- **🟠 Workflow helper refinement still pending** — engineering and commissioning CRUD is live, but explicit workflow action endpoints can still be expanded
- client tracker fidelity / data import
- hierarchy fidelity / role permissions
