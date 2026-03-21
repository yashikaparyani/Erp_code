# Backend Task Split

## Status

This file is now backend-specific reference material, not the canonical active tracker.

Use [TODO.md](/workspace/development/Erp_code/TODO.md) as the master current task list.

Keep this file for backend scope breakdown, implementation history, and deeper technical notes.

## BMD Tendering Port

- Use the absorbed BMD tendering design as input only; the `BMD` folder is now removed.
- Keep `backend/gov_erp` as the only runtime backend app.
- Tendering compatibility port completed:
  - `GE Organization`
  - `GE Tender.organization`
  - `GE Tender Result`
  - `GE Tender Checklist`
  - `GE Tender Reminder`
  - `GE Competitor`
  - tendering APIs for all of the above
  - runtime verification on `dev.localhost`

## Current Queue

### Immediate

- [x] Add runtime document tests for tender CRUD and tender -> project conversion
- [x] Add runtime document tests for BOQ and cost sheet workflows
- [x] Add runtime document tests for procurement and stores workflows
- [x] Add runtime document tests for execution, HR, billing, and O&M workflows
- [x] Add runtime tests for role-gated API access and non-admin permission matrix
- [ ] Review frontend contract against secured backend endpoints
- [x] Decide whether `GE Party` stays custom or maps into ERPNext `Customer` / `Supplier`

### Later

- [x] Tighten runtime coverage until every major module has at least one live document workflow test
- [ ] Revisit built-in ERPNext master reuse where custom domain objects overlap
- [ ] Keep payroll / leave out of scope unless HRMS-grade requirements are confirmed

## Actual Current State

- Bench exists at `/workspace/development/frappe-bench`
- Site exists at `dev.localhost`
- Custom backend app exists at `/workspace/development/frappe-bench/apps/gov_erp`
- App is installed and migrates successfully on `dev.localhost`
- Frontend shell exists at `/workspace/development/Erp_code/erp_frontend`
- Backend is far beyond the original Phase 1/2 scope and now covers tendering, BOQ, costing, procurement, stores, execution, HR, billing, and O&M

## What Is Already Implemented

### Platform / Safety

- [x] Business roles defined and seeded on install / migrate
- [x] Business APIs authenticated; only health check remains public
- [x] Guest DocType permissions removed from business DocTypes
- [x] Bench migration verified on `dev.localhost`

### Tendering

- [x] `GE Party`
- [x] `GE Tender`
- [x] `GE Tender Compliance Item`
- [x] `GE Tender Clarification`
- [x] `GE Tender Organization`
- [x] `GE EMD PBG Instrument`
- [x] Tender stats API
- [x] Tender -> Project conversion

### Survey / BOQ / Costing

- [x] `GE Survey`
- [x] `GE Survey Attachment`
- [x] `GE BOQ`
- [x] `GE BOQ Item`
- [x] Survey completion gate before BOQ approval
- [x] `GE Cost Sheet`
- [x] `GE Cost Sheet Item`
- [x] BOQ -> Cost Sheet linkage

### Procurement / Stores

- [x] `GE Vendor Comparison`
- [x] `GE Vendor Comparison Quote`
- [x] Built-in `Material Request` / `Request for Quotation` strategy
- [x] PO creation hook from approved comparison
- [x] `GE Dispatch Challan`
- [x] `GE Dispatch Challan Item`
- [x] Stock snapshot from built-in `Bin`
- [x] `Stock Entry` integration for dispatch
- [x] Serial number validation in dispatch workflow
- [x] `GE PO Payment Term` (child table for 6 payment term types + Custom)
- [x] `GE PO Extension` (companion 1:1 to Purchase Order for payment terms + accounts approval)
- [x] PO CRUD APIs: create, update, delete, submit, cancel
- [x] PO payment terms APIs: get, save, approve, reject
- [x] PO detail page frontend with payment terms management UI
- [x] PO list page enhanced with Create PO, row-level actions, and click-through to detail

### Execution / Dependency Engine

- [x] `GE Site`
- [x] `GE Milestone`
- [x] `GE Dependency Rule`
- [x] `GE Dependency Override`
- [x] `GE Project Team Member`
- [x] `GE DPR`
- [x] `GE DPR Item`
- [x] `GE DPR Photo`
- [x] Base dependency evaluation API
- [x] Runtime dependency evaluation test

### HR / Manpower

- [x] `GE Employee Onboarding`
- [x] `GE Employee Certification`
- [x] `GE Employee Document`
- [x] Employee sync into built-in `Employee`
- [x] Education sync into built-in `Employee Education`
- [x] Past employment sync into built-in `Employee External Work History`
- [x] `GE Attendance Log`
- [x] `GE Travel Log`
- [x] `GE Overtime Entry`
- [x] `GE Statutory Ledger`
- [x] `GE Technician Visit Log`
- [x] `GE Project Staffing Assignment` (20 fields, 7 APIs, ANDA Phase 1B)
- [x] Payroll / leave explicitly kept out of scope for the current stack

### Billing / Retention / Penalties / O&M

- [x] `GE Invoice`
- [x] `GE Invoice Line`
- [x] `GE Payment Receipt`
- [x] `GE Retention Ledger`
- [x] `GE Penalty Deduction`
- [x] `GE Ticket`
- [x] `GE Ticket Action`
- [x] `GE SLA Profile`
- [x] `GE SLA Timer`
- [x] `GE SLA Penalty Rule`
- [x] `GE SLA Penalty Record`
- [x] `GE RMA Tracker`
- [x] Dedicated `RMA Manager` business role
- [x] RMA flow enriched with dispatch, RCA, warranty, approval, PO, invoice, and return-tracking fields

### ANDA Compliance (Import Framework)

- [x] `GE Ticket` enhanced: `impact_level` + `due_date` + `source_issue_id` fields, `Procurement Manager` permission (Phase 1A)
- [x] `GE Import Log` DocType for import audit trail
- [x] ANDA import base framework: BaseImporter, ImportMode (dry_run/stage_only/commit), normalizers
- [x] 13 per-tab importers covering all applicable ANDA tabs
- [x] 3 whitelisted API endpoints: run_anda_import, get_anda_import_logs, get_anda_import_tabs
- [x] Duplicate detection, reference validation, idempotent reruns across all importers
- [x] Master data loaders: departments, designations, role mappings, projects, sites, vendors
- [x] Reference integrity checker with `ready_for_transactional_import` flag
- [x] Import orchestrator with dependency-ordered tab execution + master readiness gate
- [x] 4 additional API endpoints: load_anda_masters, check_anda_master_integrity, run_anda_orchestrated_import, get_anda_import_order

### ANDA Compliance (Workflow Fidelity)

- [x] 5 state machines: GE Ticket (6 states), GE RMA Tracker (10 states), GE Milestone (5 states), GE Site status (5 states), GE Site installation stage (8 ordered stages)
- [x] GE Ticket: escalation levels, closure types, days_to_resolve auto-compute, auto-timestamps
- [x] GE RMA Tracker: gating rules (APPROVED/REPLACED/CLOSED), CLOSED terminal state
- [x] GE Dispatch Challan: linked_purchase_order with item/qty validation against PO
- [x] GE Invoice + GE Payment Receipt: total_paid/outstanding auto-compute, overpayment guard, cascade refresh
- [x] GE Milestone→GE Site: milestone progress sync to site_progress_pct
- [x] GE Site: installation stage regression guard (8 stages, forward-only)
- [x] 2 new API endpoints: reconcile_invoice_payments, sync_site_milestone_progress
- [x] 4 enhanced API endpoints: close_ticket, escalate_ticket, close_rma, update_rma_status

## What Is Not Implemented Yet

- Frontend contract review against the secured backend APIs
- Deeper live coverage can still be added over time, but there is no immediate backend/db blocker left

## Verified Test Coverage

### Source-Level Logic Tests

- [x] `test_api.py`
- [x] `test_boq_logic.py`
- [x] `test_cost_sheet_logic.py`
- [x] `test_execution_logic.py`
- [x] `test_execution_runtime.py`
- [x] `test_hr_logic.py`
- [x] `test_hr_operations_logic.py`
- [x] `test_procurement_logic.py`
- [x] `test_store_logic.py`
- [x] `test_billing_logic.py`
- [x] `test_om_logic.py`
- [x] `test_phase7_structure.py`
- [x] `test_app_runtime.py` added as live bench workflow coverage

### Runtime Tests Verified

- [x] Dependency evaluation runtime test on `dev.localhost`
- [x] Tender CRUD and tender -> project conversion runtime flow
- [x] BOQ + cost sheet runtime flow
- [x] Procurement + stores runtime flow
- [x] HR runtime flow
- [x] Billing + O&M runtime flow
- [x] Role-gated runtime access flow

## Backend Work Breakdown

### Phase 0: Foundation ✅ DONE

- [x] Create custom app `gov_erp`
- [x] Install app on `dev.localhost`
- [x] Add API package
- [x] Add test package
- [x] Add requirement / handoff docs

### Phase 1: Safe Data Model Foundation ✅ DONE

- [x] Reuse ERPNext built-ins where possible
- [x] Define custom DocTypes only for missing domain entities
- [x] Avoid replacing core ERPNext masters and transactions

### Phase 2: Tendering Completion ✅ DONE

- [x] Tender core models and APIs
- [x] Tender organization flow
- [x] EMD / PBG tracking
- [x] Tender stats and project conversion

### Phase 3: Survey + BOQ + Costing ✅ DONE

- [x] Survey CRUD
- [x] BOQ workflow
- [x] Survey gate before BOQ approval
- [x] Cost sheet workflow
- [x] BOQ -> Cost Sheet linkage

### Phase 4: Procurement + Stores ✅ DONE

- [x] Vendor comparison workflow
- [x] RFQ / indent strategy
- [x] PO creation hook from approved comparison
- [x] Dispatch challan workflow
- [x] Stock entry posting and serial validation
- [x] PO payment terms with 6 term types (full advance, X days after delivery, PDC, partial advance variants, custom)
- [x] PO CRUD lifecycle (create, update, delete, submit, cancel)
- [x] PO payment terms accounts approval/rejection flow
- [x] PO detail page and list page CRUD frontend

### Phase 5: Execution + Dependency Engine ✅ DONE

- [x] Site / milestone / dependency rule / dependency override
- [x] Project team mapping
- [x] DPR models and APIs
- [x] Runtime dependency evaluation coverage
- [x] Built-in ERPNext `Task` retained instead of duplicating task master

### Phase 6: HR + Manpower ✅ DONE FOR CURRENT SCOPE

- [x] Onboarding and employee sync
- [x] Attendance / travel / overtime / statutory / technician visit tracking
- [x] Payroll / leave intentionally excluded for current stack

### Phase 7: Billing + O&M ✅ DONE

- [x] Invoice / payment / retention / penalty tracking
- [x] Ticketing / SLA / penalty rules / timers
- [x] RMA tracker

### Phase 8: ANDA Compliance (Phase 1+2) ✅ DONE

- [x] Phase 1A: Issue Log → GE Ticket formalization (impact_level, due_date, Procurement Manager perm)
- [x] Phase 1B: GE Project Staffing Assignment DocType (20 fields, 7 APIs)
- [x] Phase 2: ANDA import base framework (BaseImporter, ImportMode, normalizers, GE Import Log)
- [x] Phase 2: 13 per-tab importers for all applicable ANDA tabs
- [x] Phase 2: Whitelisted API endpoints for running imports

### Phase 9: ANDA Compliance (Phase 3+4) ✅ DONE

- [x] Phase 3: Master data loaders (departments, designations, role mappings, projects, sites, vendors)
- [x] Phase 3: Reference integrity checker with readiness flag
- [x] Phase 3: 2 whitelisted API endpoints (load_anda_masters, check_anda_master_integrity)
- [x] Phase 4: Import orchestrator with dependency-ordered tab execution
- [x] Phase 4: Master readiness gate (blocks COMMIT if masters aren't ready)
- [x] Phase 4: OrchestratorReport with per-tab summaries and audit logging
- [x] Phase 4: 2 whitelisted API endpoints (run_anda_orchestrated_import, get_anda_import_order)

### Phase 10: ANDA Compliance (Phase 5+6) ✅ DONE

- [x] Phase 5: Verified all 4 complex tab importers work via orchestrator (include_complex=True)
- [x] Phase 6: GE Ticket lifecycle — 6-state machine, escalation tracking, closure types, days_to_resolve auto-compute
- [x] Phase 6: GE RMA Tracker — full state machine enforcement, gating rules, CLOSED terminal state
- [x] Phase 6: GE Dispatch Challan — linked_purchase_order field with item/qty validation against PO
- [x] Phase 6: GE Invoice — total_paid and outstanding_amount auto-computed from GE Payment Receipts
- [x] Phase 6: GE Payment Receipt — overpayment validation, cascade refresh to linked invoice
- [x] Phase 6: GE Milestone — 5-state machine, milestone→site progress sync
- [x] Phase 6: GE Site — status state machine, installation stage regression guard
- [x] Phase 6: 2 new API endpoints (reconcile_invoice_payments, sync_site_milestone_progress)
- [x] Phase 6: 4 enhanced API endpoints (close_ticket, escalate_ticket, close_rma, update_rma_status)

### Phase 11: ANDA Compliance (Phase 7 — RBAC + UAT) ✅ DONE

- [x] Phase 7: DocType permission alignment — 13 JSONs updated for ANDA tab-role matrix
- [x] Phase 7: Programmatic `ensure_anda_role_permissions()` in role_utils.py, called on every migrate and covering all 13 target DocTypes
- [x] Phase 7: Bug fix — "Procurement Head" stale role name → "Procurement Manager" in GE Ticket
- [x] Phase 7: API guard audit — all 200+ endpoints confirmed guarded
- [x] Phase 7: Department-wise UAT — 57/57 minimum role-by-tab permission checks passed
- [x] Phase 7: Import log review — 21 logs, no unexpected failures
- [x] Phase 7: Parity checks — 337 records, 44/69 DocTypes populated, 18/19 user contexts

## Next Smallest Backend Steps

1. Review frontend endpoint contracts against the secured backend
2. Revisit master-data reuse only if `GE Party` duplication becomes painful in frontend or reporting
3. Keep extending live runtime coverage as new modules or regressions appear
