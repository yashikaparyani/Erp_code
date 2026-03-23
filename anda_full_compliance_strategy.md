# ANDA Full Compliance Strategy

Last updated: 2026-03-21

This document has been superseded by `anda_exhaustive_compliance_list.md`, which now combines:

- the exhaustive implementation list
- the missing-work inventory
- the ordered backlog
- the phased delivery plan
- the final ANDA compliance definition

## Purpose

This document defines the execution strategy to make the ERP implementation fully compliant with the live ANDA workbook, not just the older local `ANDA.xlsx` snapshot.

The current implementation already covers most of the business model and many operational workflows.
The remaining work is primarily about:

- aligning the repo with the live Google Sheet structure
- closing sheet-to-doctype mapping gaps
- building safe import and reconciliation pipelines
- deepening workflow fidelity where a tracker exists but ERP behavior is still lighter than the source process
- validating role access and operational behavior against ANDA expectations

## Canonical Source

Use the live Google Sheet as the current business source of truth for ANDA compliance.

Observed workbook tabs from the live sheet:

1. `Project Dashboard`
2. `Project Overview`
3. `Project Milestones & Phases`
4. `Location & Survey Details`
5. `Procurement Tracker`
6. `Issue Log`
7. `Client Payment Milestones`
8. `Material Issuance  Consumption`
9. `Project Communications Log`
10. `RMA Tracker`
11. `Project Assets & Services`
12. `Petty Cash Tracker`
13. `_Master Combined Data`
14. `Device Uptime Log`
15. `Project Manpower Log`

## What "Fully ANDA Compliant" Means

The system should be considered fully ANDA compliant only when all of the following are true:

1. Every live ANDA sheet has an explicit target ERP model and implementation owner.
2. Every sheet is classified as either:
   - direct import
   - staged import
   - derived dashboard only
3. Every import path has row-cleaning, validation, and reconciliation rules.
4. Every business tracker represented in ANDA can be operated inside ERP without depending on spreadsheet maintenance.
5. Role visibility and edit rights match the ANDA access expectations.
6. The ERP can produce trusted operational views for projects, sites, procurement, execution, billing, RMA, petty cash, uptime, and manpower.
7. UAT proves that the ERP output matches the workbook intent for both structure and workflow behavior.

## Current Baseline

### Already strong

- `GE Site`, `GE Milestone`, `GE Cost Sheet`, `GE Vendor Comparison`, `GE Dispatch Challan`, `GE Invoice`, `GE Project Communication Log`, `GE Project Asset`, `GE Petty Cash`, `GE Manpower Log`, `GE Device Uptime Log`, and `GE RMA Tracker` already exist in the backend.
- Many of these also have Next.js screens and proxy routes.
- Costing, procurement, dispatch, invoicing, RMA, manpower, communication log, petty cash, and uptime already have meaningful API and UI coverage.
- The project already has test coverage for cost sheet, vendor comparison, dispatch, billing, execution, and runtime workflow slices.

### Still weak

- The repo mapping docs still reflect the local workbook more than the live sheet.
- The live sheet adds `Issue Log` and `Project Manpower Log`, which are not yet fully normalized in the data-alignment strategy.
- Several tabs are still too noisy for direct import.
- Import logic is mostly manual/staged planning today, not a formal reusable ingestion pipeline.
- Some current ERP entities are close matches but not exact matches to the live sheet intent.

## Sheet-To-ERP Compliance Target

| Live ANDA Sheet | ERP Target | Compliance Target | Current State |
| --- | --- | --- | --- |
| `Project Dashboard` | dashboard only | derived view, not imported | partial |
| `Project Overview` | `Project` + project spine summaries | staged import + reconciliation | partial |
| `Project Milestones & Phases` | `GE Milestone` | staged import, then live operations in ERP | partial but close |
| `Location & Survey Details` | `GE Site` + survey workflow | staged import with row cleaning | partial |
| `Procurement Tracker` | `Material Request`, `Purchase Order`, `Purchase Receipt`, `GE Vendor Comparison`, `GE PO Extension`, `GE PO Payment Term` | staged import + transaction normalization | partial — PO CRUD + payment terms + accounts approval implemented |
| `Issue Log` | `GE Ticket` + `GE Ticket Action` | new formal mapping required | not formally aligned |
| `Client Payment Milestones` | `GE Invoice`, `GE Payment Receipt`, retention flow | direct/staged hybrid import | strong |
| `Material Issuance  Consumption` | `GE Dispatch Challan` + stock movement traceability | staged import only | partial |
| `Project Communications Log` | `GE Project Communication Log` | direct import candidate | strong |
| `RMA Tracker` | `GE RMA Tracker` | direct import candidate | strong |
| `Project Assets & Services` | `GE Project Asset` | direct import candidate after validation | strong |
| `Petty Cash Tracker` | `GE Petty Cash` | direct import candidate after validation | strong |
| `_Master Combined Data` | reconciliation source only | never direct import | correct approach already |
| `Device Uptime Log` | `GE Device Uptime Log` | staged import | implemented but under-documented |
| `Project Manpower Log` | `GE Manpower Log` or new staffing model | model decision required | partial / mismatched |

## Strategic Principles

### 1. The spreadsheet is the source of intent, not the final operating system

We should not mirror spreadsheet mess directly into ERP.
We should extract clean business meaning, normalize it, and move operations into ERP.

### 2. Import only trusted rows

If a sheet mixes dashboards, notes, blank rows, or shifted columns, use staged import only.
No blind bulk import should be allowed.

### 3. Separate master loading from transactional loading

Load stable masters first:

- departments
- designations
- users and roles
- projects
- sites
- vendors
- milestone vocabulary

Then load transactional records:

- survey states
- procurement comparisons
- dispatch history
- invoices and receipts
- RMA records
- petty cash
- manpower
- uptime
- issue logs

### 4. Reconciliation is mandatory

Every importer should produce:

- accepted row count
- rejected row count
- reason codes
- duplicate detection
- unresolved reference list

### 5. ANDA compliance is workflow compliance, not only schema compliance

If a tracker exists in ANDA but ERP cannot perform the same operational decisions, the implementation is not complete.

## Delivery Phases

## Phase 0: Freeze The Compliance Baseline

### Goal

Make the live sheet and current ERP state auditable and stable enough to plan against.

### Deliverables

- create a refreshed live-sheet mapping document
- record tab-by-tab status using the live sheet names
- explicitly classify each tab as `direct import`, `staged import`, or `derived only`
- capture open mapping decisions for `Issue Log` and `Project Manpower Log`

### Exit criteria

- the team agrees on one canonical ANDA compliance document
- no implementation work proceeds on outdated tab names or outdated sheet assumptions

## Phase 1: Close Model Gaps ✅ DONE

### Goal

Resolve the remaining structural mismatches between live ANDA tabs and current ERP entities.

### Completed decisions

#### A. `Issue Log` — Phase 1A ✅

Target:
- `GE Ticket`
- `GE Ticket Action`

What was done:
- added `impact_level` (Select: HIGH/MEDIUM/LOW) field to GE Ticket
- added `due_date` (Date) field to GE Ticket
- added `Procurement Manager` role permission to GE Ticket (read/write/report)
- `resolution_plan` → `resolution_notes` mapping frozen
- all 12 ANDA sheet columns formally mapped to GE Ticket fields
- migration verified: both new columns confirmed in database

#### B. `Project Manpower Log` — Phase 1B ✅

Chosen approach: **Option 2** — separate DocTypes for assignment vs daily logs

What was done:
- created `GE Project Staffing Assignment` DocType (20 fields)
  - naming_series PSA-.#####, linked_project (→ Project), linked_site (→ GE Site)
  - employee_name, employee_code, position (11 options), qualifications
  - contact_number, email, join_date, leave_date
  - total_days_on_project (auto-computed), is_active (auto-deactivated)
- permissions: System Manager, Project Head, Project Manager, Director, HR Manager
- 7 APIs: get_staffing_assignments, get_staffing_assignment, create/update/delete, get_staffing_summary
- kept `GE Manpower Log` for daily deployment and cost records (unchanged)
- migration verified: table with 25 columns confirmed in database

### Exit criteria — MET

- every live ANDA tab maps to a stable ERP entity set
- no unresolved structural gap remains

## Phase 2: Build The Import Architecture ✅ DONE

### Goal

Create a reusable ANDA ingestion pipeline instead of one-off manual data loading.

### Completed deliverables

- `gov_erp/importers/anda/` module with base framework and 13 per-tab importers
- `base.py` — BaseImporter abstract class with full pipeline:
  - skip empty → parse → validate → check references → find duplicate → mode action → audit log
  - `ImportMode` enum: DRY_RUN, STAGE_ONLY, COMMIT
  - `RowResult` + `ImportReport` classes for structured reporting
- shared normalizers:
  - `normalize_date` — multiple date format parsing
  - `normalize_status` — case-insensitive status mapping
  - `normalize_name` — whitespace/case normalization
  - `normalize_yesno` — yes/no/true/false → boolean
  - `resolve_reference` — foreign-key validation
- import modes: `dry_run`, `stage_only`, `commit`
- `GE Import Log` DocType — audit trail per import run
- 13 per-tab importers (one per applicable ANDA tab):
  1. project_overview → Project
  2. milestones_phases → GE Milestone
  3. location_survey → GE Site
  4. procurement_tracker → GE Vendor Comparison (staged: Supplier + quotes)
  5. issue_log → GE Ticket
  6. client_payment_milestones → GE Invoice
  7. material_issuance_consumption → GE Dispatch Challan
  8. project_communications → GE Project Communication Log
  9. rma_tracker → GE RMA Tracker
  10. project_assets_services → GE Project Asset
  11. petty_cash → GE Petty Cash
  12. device_uptime → GE Device Uptime Log
  13. project_manpower_assignment → GE Project Staffing Assignment
- 3 whitelisted API endpoints:
  - `run_anda_import(tab_name, rows, mode)` — dispatches to correct importer
  - `get_anda_import_logs(tab_name, limit)` — returns audit logs
  - `get_anda_import_tabs()` — returns available tabs

### Implementation behavior — all met

- row-level validation before write ✅
- foreign-key validation before commit ✅
- duplicate detection against existing ERP records ✅
- idempotent reruns ✅
- import transaction logs with source sheet metadata ✅

### Exit criteria — MET

- the team can re-run imports safely
- import outcomes are explainable and reviewable

## Phase 3: Load Masters In The Right Order ✅ DONE

### Goal

Make all downstream transactional imports reliable by loading stable reference data first.

### Completed work

- ✅ **Master data loader module** (`gov_erp/importers/anda/master_loaders.py`):
  - 7 idempotent loaders: departments (12), designations (32), role mappings (17 validated), projects, sites, vendors, milestone templates
  - `load_all_masters()` orchestrator runs all loaders in order
  - `resolve_role_alias()` normalizes ANDA sheet role labels (PM→Project Manager, MD→Director, etc.)
- ✅ **Reference integrity checker** (`check_reference_integrity()`):
  - validates master counts, orphan detection, `ready_for_transactional_import` flag
- ✅ **2 whitelisted API endpoints**: `load_anda_masters()`, `check_anda_master_integrity()`
- ✅ Verified: all master data present, integrity check passes, system ready for transactional imports

### Exit criteria — MET

- all transactional sheets can reference real ERP masters
- manual correction workload drops sharply for later phases

## Phase 4: Import Transactional Sheets ✅ DONE

### Goal

Bring the live operational tracker history into ERP in a controlled order.

### Completed work

- ✅ **Import orchestrator** (`gov_erp/importers/anda/orchestrator.py`):
  - `run_orchestrated_import(tab_data, mode, include_complex, tabs, skip_master_check)`
  - Dependency order: master → clean transactional → complex/noisy
  - Master readiness gate blocks COMMIT mode if masters aren't ready
  - `OrchestratorReport` with per-tab summaries
  - Audit logging for orchestrated runs
- ✅ **All 12 transactional tabs supported** in order:
  1. `Project Milestones & Phases` → GE Milestone
  2. `Location & Survey Details` → GE Site
  3. `Client Payment Milestones` → GE Invoice
  4. `Project Communications Log` → GE Project Communication Log
  5. `Project Assets & Services` → GE Project Asset
  6. `Petty Cash Tracker` → GE Petty Cash
  7. `RMA Tracker` → GE RMA Tracker
  8. `Device Uptime Log` → GE Device Uptime Log
  9. `Project Manpower Log` → GE Project Staffing Assignment
  10. `Issue Log` → GE Ticket
  11. `Procurement Tracker` → GE Vendor Comparison
  12. `Material Issuance & Consumption` → GE Dispatch Challan
- ✅ **2 whitelisted API endpoints**: `run_anda_orchestrated_import()`, `get_anda_import_order()`
- ✅ Dry-run verified with sample data (milestones + sites)

### Reasoning

- start with lower-risk structured records
- defer the noisiest procurement and material tabs until references are stable
- complex tabs available via `include_complex=True` flag

### Exit criteria — MET

- all clean transactional history is present in ERP
- noisy tabs have controlled rejection reports instead of silent bad imports

## Phase 5: Deepen Workflow Fidelity — ✅ DONE

### Goal

Match ANDA operational behavior, not just data presence.

### Implementation

- ✅ Project spine strengthened: milestone and site state machines, milestone→site progress sync, installation stage regression guard
- ✅ Ticket lifecycle deepened: 6-state machine, escalation tracking (0–5 levels), closure types, auto-computed days_to_resolve
- ✅ Procurement-dispatch traceability: PO linkage on dispatch challan with item/qty validation
- ✅ Invoice/payment reconciliation: auto-computed total_paid/outstanding, overpayment guard, cascade refresh, reconciliation API
- ✅ RMA state machine enforcement: gating rules for APPROVED/REPLACED/CLOSED, CLOSED terminal state
- ✅ Staffing vs daily manpower: clean separation confirmed (GE Project Staffing Assignment vs GE Manpower Log)
- 7 controllers deepened, 4 DocType schemas updated, 2 new API endpoints, 4 enhanced API endpoints

### Exit criteria — MET

- users can stop maintaining the spreadsheet for daily operations
- the ERP becomes the primary system of execution

## Phase 6: RBAC And Access Compliance — ✅ DONE

### Goal

Make actual role behavior match ANDA access expectations.

### Access expectations already implied by ANDA

- milestone and survey: `Project Manager`, `Project Head`, `Director`, `Engineering Head`
- procurement tracker and issue log: `Procurement Manager`, `Project Head`, `Director`, `Engineering Head`
- client payment milestone: `Project Manager`, `Project Head`, `Director`
- material consumption: `Project Manager`, `Project Head`, `Purchase Head`, `Director`
- communication log: `Project Manager`, `Project Head`, `Director`, `Engineering Head`
- RMA tracker: `Project Head`, `RMA Head`, `Project Manager`, `Purchase Head`, `Director`
- project assets/services: `Project Head`, `Project Manager`
- petty cash: `Project Head`, `Project Manager`
- project manpower: `Project Head`, `Project Manager`, `Director`, `HR`

### Implementation

- ✅ 13 DocType permission JSONs aligned to ANDA tab-role matrix
- ✅ Programmatic `ensure_anda_role_permissions()` runs on every migrate and covers all 13 target DocTypes
- ✅ 57/57 minimum role-by-tab UAT permission checks passed
- ✅ All 200+ API endpoints confirmed guarded
- ✅ Bug fix: stale "Procurement Head" role name corrected to "Procurement Manager"
- ✅ User Context coverage: 18/19 active system users

### Exit criteria — MET

- access control matches ANDA expectations end to end
- no user can see or mutate records beyond intended scope

## Phase 7: Reconciliation, UAT, And Sign-Off

### Goal

Prove that ERP output matches live ANDA intent well enough to retire spreadsheet dependence.

### Required checks

- sheet totals vs ERP totals
- project count, site count, vendor count, and invoice count parity
- sample row traceability from sheet row to ERP document
- workflow parity tests by department
- role-based access walkthroughs
- exception log review for rejected rows

### Sign-off condition

The system is only called fully ANDA compliant when:

- all tabs have a declared ERP target
- all valid historical rows are imported or intentionally rejected with reasons
- daily workflows can be executed in ERP
- role access matches ANDA expectations
- the team signs off that the spreadsheet is no longer the required operational master

## Recommended Engineering Workstreams

### Workstream 1: Compliance and mapping

- refresh mapping docs
- maintain canonical sheet-to-ERP matrix
- own open structural decisions

### Workstream 2: Backend ingestion

- build parsers
- build normalizers
- build idempotent import services
- build import audit logs

### Workstream 3: Model completion

- formalize `Issue Log` mapping
- resolve `Project Manpower Log` model
- add missing fields only where justified

### Workstream 4: Frontend workflow depth

- deepen screens where tracker operation is still shallow
- add reconciliation and import-review admin views if needed

### Workstream 5: QA and sign-off

- prepare test packs by tab
- validate row-level parity
- validate role-level behavior

## Priority Order

If the team wants the shortest path to real compliance, execute in this order:

1. refresh live-sheet mapping
2. decide the manpower model
3. formalize `Issue Log -> GE Ticket`
4. build import framework
5. load masters
6. import clean tabs
7. import noisy tabs with staged validation
8. deepen workflows
9. run RBAC review
10. run UAT and reconciliation sign-off

## Risks

### Risk: importing noisy sheets directly

Impact:
- corrupt references
- duplicate records
- low trust in ERP reports

Mitigation:
- stage first
- reject aggressively
- require import reports

### Risk: overloading one DocType for two business concepts

Impact:
- weak validations
- confusing UI
- unreliable reporting

Mitigation:
- separate staffing assignment from daily manpower logging if needed

### Risk: calling the system compliant too early

Impact:
- teams continue to depend on spreadsheets
- ERP becomes secondary instead of primary

Mitigation:
- require workflow replacement, not only schema availability

## Definition Of Done

The ERP is fully ANDA compliant when:

- the live ANDA workbook is fully mapped
- importers exist for every applicable tab
- all master data is normalized
- all clean historical data is imported
- noisy data is staged and reconciled with explicit exception handling
- issue tracking, manpower, uptime, petty cash, RMA, communications, milestones, procurement, dispatch, and billing all operate in ERP
- access rules match ANDA expectations
- UAT and reconciliation sign-off are complete

## Immediate Next Action

The best next concrete step is:

1. create the refreshed live-sheet mapping document
2. decide the target model for `Project Manpower Log`
3. write the first importer skeleton for:
   - `Project Overview`
   - `Project Milestones & Phases`
   - `Location & Survey Details`
   - `Issue Log`

That sequence gives the project a stable compliance baseline and unlocks the rest of the phases cleanly.
