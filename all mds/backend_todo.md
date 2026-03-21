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

## Next Smallest Backend Steps

1. Review frontend endpoint contracts against the secured backend
2. Revisit master-data reuse only if `GE Party` duplication becomes painful in frontend or reporting
3. Keep extending live runtime coverage as new modules or regressions appear
