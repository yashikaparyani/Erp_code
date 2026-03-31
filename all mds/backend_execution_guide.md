# Backend Execution Guide

## Purpose

This file is the pickup guide for any agent working on the backend.
Read this first after a context reset.

## Canonical Docs

Read these in this order:

1. `Erp_code/backend_execution_guide.md`
2. `Erp_code/all mds/remaining_todo.md`
3. `Erp_code/backend_role_matrix.md`
4. `Erp_code/backend_org_mapping.md`
5. `Erp_code/backend_architecture_note.md`
6. `Erp_code/backend_project_spine_model.md`
7. `Erp_code/dept_iteration_project_workspace_model.md`
8. `Erp_code/backend_requirement_mapping.md`
9. `Erp_code/backend_procurement_plan.md`
10. `Erp_code/backend_stores_plan.md`
11. `Erp_code/backend_dependency_plan.md`
12. `Erp_code/backend_hr_plan.md`
13. `Erp_code/backend_costing_plan.md`
14. `Erp_code/ERP_Project_Analysis.md`

Docs removed as stale or redundant:

- `Erp_code/plan.md`
- `Erp_code/COMPLETE_WORKFLOW_GUIDE.md`

## Current Backend State

- Custom Frappe app: `gov_erp`
- Site: `dev.localhost`
- Installed apps include `gov_erp`
- Source-level hardening completed:
  - business APIs are no longer guest-accessible
  - guest DocType permissions removed from business DocTypes
  - business roles are defined in shared role utilities and seeded on install / migrate
  - BOQ rules have source-level regression tests
- Bench migration access confirmed:
  - `bench --site dev.localhost migrate` completed successfully
  - `GE Cost Sheet` and `GE Cost Sheet Item` are present in the site database
  - business roles verified in site: `Presales Tendering Head`, `Presales Executive`, `Engineering Head`, `Engineer`, `Department Head`, `Accounts`, `HR Manager`, `Project Manager`, `Top Management`
  - Phase 5 execution DocTypes verified in site: `GE Site`, `GE Milestone`, `GE Dependency Rule`, `GE Dependency Override`
  - HR operations DocTypes verified in site: `GE Attendance Log`, `GE Travel Log`, `GE Overtime Entry`, `GE Statutory Ledger`, `GE Technician Visit Log`

## Implemented Modules

### Done

- Tendering foundation
  - `GE Party`
  - `GE Tender`
  - `GE Tender Compliance Item`
  - `GE Tender Clarification`
  - `GE Tender Organization`
  - `GE EMD PBG Instrument`
- Survey
  - `GE Survey`
  - `GE Survey Attachment`
- BOQ
  - `GE BOQ`
  - `GE BOQ Item`
  - survey gate for BOQ approval
  - BOQ status transition validation
- Costing
  - `GE Cost Sheet`
  - `GE Cost Sheet Item`
  - BOQ -> Cost Sheet linkage
- Procurement / Stores
  - `GE Vendor Comparison`
  - `GE Vendor Comparison Quote`
  - PO creation hook from approved comparison
  - `GE Dispatch Challan`
  - `GE Dispatch Challan Item`
  - dispatch -> `Stock Entry` integration
  - serial number validation
- Execution / Dependency
  - `GE Site`
  - `GE Milestone`
  - `GE Dependency Rule`
  - `GE Dependency Override`
  - `GE Project Team Member`
  - `GE DPR`
  - `GE DPR Item`
  - `GE DPR Photo`
- HR / Manpower
  - `GE Employee Onboarding`
  - `GE Employee Certification`
  - `GE Employee Document`
  - sync into `Employee`, `Employee Education`, `Employee External Work History`
  - `GE Attendance Log`
  - `GE Travel Log`
  - `GE Overtime Entry`
  - `GE Statutory Ledger`
  - `GE Technician Visit Log`
  - payroll / leave intentionally out of scope for current stack
- Billing / O&M
  - `GE Invoice`
  - `GE Invoice Line`
  - `GE Payment Receipt`
  - `GE Retention Ledger`
  - `GE Penalty Deduction`
  - `GE Ticket`
  - `GE Ticket Action`
  - `GE SLA Profile`
  - `GE SLA Timer`
  - `GE SLA Penalty Rule`
  - `GE SLA Penalty Record`
  - `GE RMA Tracker`

## Verified Source Tests

- `apps/gov_erp/gov_erp/tests/test_api.py`
- `apps/gov_erp/gov_erp/tests/test_boq_logic.py`
- `apps/gov_erp/gov_erp/tests/test_cost_sheet_logic.py`
- `apps/gov_erp/gov_erp/tests/test_execution_logic.py`
- `apps/gov_erp/gov_erp/tests/test_hr_logic.py`
- `apps/gov_erp/gov_erp/tests/test_hr_operations_logic.py`

These are pure-Python source tests and do not require a live DB connection.

## Verified Runtime Tests

- `apps/gov_erp/gov_erp/tests/test_execution_runtime.py`
  - blocks task start when referenced survey is still pending
  - allows task start after dependency override approval
- `apps/gov_erp/gov_erp/tests/test_app_runtime.py`
  - tender CRUD and project conversion
  - BOQ and cost sheet workflow
  - procurement and stores workflow
  - HR onboarding to employee mapping
  - billing and O&M workflow
  - role-gated runtime access

## Immediate Next Steps

1. Review frontend endpoint contracts against the secured backend
2. Decide whether `Task` custom-field linkage is still worth doing or whether external milestone/dependency linkage is enough
3. Build GRN-facing helpers or endpoints on top of `Purchase Receipt` if stores scope expands

## Bench Commands To Retry Later

Useful bench commands:

```bash
bench --site dev.localhost reload-doctype "GE Tender"
bench --site dev.localhost reload-doctype "GE Party"
bench --site dev.localhost reload-doctype "GE Survey"
bench --site dev.localhost reload-doctype "GE Tender Organization"
bench --site dev.localhost reload-doctype "GE EMD PBG Instrument"
bench --site dev.localhost reload-doctype "GE BOQ"
bench --site dev.localhost reload-doctype "GE Cost Sheet"
bench --site dev.localhost reload-doctype "GE Cost Sheet Item"
bench --site dev.localhost migrate
```

## Design Rules

- Prefer extending ERPNext built-ins over replacing them
- Keep health check public, keep business APIs authenticated
- Avoid `ignore_permissions=True` in business CRUD
- Add source-level tests for logic that can be isolated from the DB
- If bench DB becomes unavailable again, do source-safe work first: docs, pure logic, tests, scaffolds
