# SRS vs Code Readiness Matrix

Date: 2026-03-22

## Purpose

This document compares the current ERP codebase against the effective SRS and planning baseline so the team can close the remaining gaps in a disciplined way.

It is intended to answer one question clearly:

How ready is the current codebase versus the original Tender-to-Delivery ERP scope?

## Source Baseline Used

Primary SRS / scope baseline:

- `all mds/readme.md`

Current implementation and tracker references:

- `anda_exhaustive_compliance_list.md`
- `hr_hybrid_strategy_for_client_acceptance.md`
- `hr_uat_results_2026-03-22.md`
- `team_ownership_and_todo.md`
- `frontend_100_percent_closure_log.md` (latest frontend closure record)

Implementation surface reviewed:

- backend app: `backend/gov_erp/gov_erp`
- frontend app: `erp_frontend/src/app`

## Readiness Scale

- `Ready` = materially implemented and close to production intent
- `Mostly Ready` = strong implementation exists, but maturity/polish gaps remain
- `Partial` = meaningful implementation exists, but not yet enough to claim SRS-level closure
- `Weak` = early/stub-like or fragmented coverage only
- `Missing` = not materially implemented

## Overall Readiness

Current repo-wide readiness estimate:

- overall SRS-aligned readiness: `86-88%`
- backend/workflow readiness: `91-93%`
- frontend/workspace readiness: `82-85%`
- implementation-day/demo readiness: `78-82%`

Why this is the current estimate:

- `96` custom DocTypes exist under `backend/gov_erp/gov_erp/gov_erp/doctype`
- `540` whitelisted backend methods exist in `backend/gov_erp/gov_erp/api.py`
- `106` frontend pages exist under `erp_frontend/src/app`
- `168` frontend API routes exist under `erp_frontend/src/app`
- `15` backend test modules exist under `backend/gov_erp/gov_erp/tests`

This is no longer a scaffold or proof of concept. It is a real ERP codebase with a smaller set of maturity and integration gaps.

## Executive Verdict

The system already covers the full lifecycle intent of the original SRS:

Tender -> Survey -> BOQ -> Costing -> Procurement -> Stores -> Execution -> Commissioning -> Billing -> Payment -> Ticketing

The main remaining gaps are not broad missing modules.

The main remaining gaps are:

1. shared PM workspace maturity
2. final execution / commissioning polish
3. alerts / reminders / collaboration maturity
4. DMS rigor in project context and approval-style governance
5. final role-based walkthrough and browser-level acceptance hardening

## Module Matrix

| SRS Module | SRS Expectation | Current Evidence In Code | Status | Readiness | Main Gaps |
|---|---|---|---|---|---|
| Tender & Presales | Tender lifecycle, compliance, clarification, EMD/PBG, tender-to-project conversion | `ge_tender`, `ge_tender_compliance_item`, `ge_tender_clarification`, `ge_tender_organization`, `ge_emd_pbg_instrument`, `ge_tender_reminder`, `ge_tender_result`; frontend under `src/app/pre-sales/*`; conversion APIs in `api.py` | Implemented | `Ready` | reminder usefulness and some commercial follow-up polish still remain |
| Survey | Site survey capture with notes and attachments, gate before downstream workflow | `ge_survey`, `ge_survey_attachment`; survey pages under `src/app/survey` and `src/app/engineering/survey`; gate logic in backend | Implemented | `Ready` | mostly workflow polish only |
| BOQ & Costing | Site/project BOQ, revisioning, costing workflow, approval linkage | `ge_boq`, `ge_boq_item`, `ge_cost_sheet`, `ge_cost_sheet_item`; BOQ/costing pages under engineering and finance; revision APIs in backend | Implemented | `Mostly Ready` | costing ownership UX and commercial handoff clarity can still improve |
| Procurement & Vendor | vendor comparison, quotation discipline, PO flow, approval-linked procurement | `ge_vendor_comparison`, `ge_vendor_comparison_quote`, PO extension/payment terms, procurement pages, purchase order pages, vendor comparison APIs | Implemented | `Mostly Ready` | front-end coherence and commercial-to-procurement visibility can still sharpen |
| Stores & Logistics | GRN, dispatch, stock ledger discipline, project/site-linked stock movement, serial validation | GRN, stock snapshot, dispatch challan, stock entry integration, inventory pages, stock position/aging pages | Implemented | `Mostly Ready` | UX separation of inventory vs project context still needs refinement |
| Project Execution & Dependency Engine | project/site structure, milestones, DPR, dependency block/override, PM operating surface | `ge_site`, `ge_milestone`, `ge_dependency_rule`, `ge_dependency_override`, `ge_dpr*`, execution pages, project pages, dependency APIs | Implemented | `Partial to Mostly Ready` | `/projects/[id]` still needs to feel like the real PM operating surface; project/site/stage filtering still needs tightening |
| Engineering & Design | drawings, revisions, technical deviations, change requests, engineering deliverables | `ge_drawing`, `ge_technical_deviation`, change request APIs, pages under `src/app/drawings`, `src/app/engineering/*`, `src/app/change-requests` | Implemented | `Mostly Ready` | integrated deliverable-flow polish still remains |
| Network & Commissioning | device register, IP pool/allocation, commissioning checklist, test reports, client signoff | `ge_device_register`, IP pool/allocation APIs, `ge_commissioning_checklist`, `ge_client_signoff`, test-report pages and commissioning pages | Implemented | `Mostly Ready` | execution-grade polish and tighter end-user commissioning flow still needed |
| Billing & Accounts | invoices, payment receipts, retention, penalties, billing visibility | `ge_invoice`, `ge_payment_receipt`, `ge_retention_ledger`, `ge_penalty_deduction`; billing, retention, penalties pages | Implemented | `Ready` | billing-side UX and cross-lane visibility can still improve |
| Commercial / Bookkeeping Layer | quote/estimate, proforma, billing visibility, statement, follow-up, receivable exposure | finance pages for commercial, estimates, proformas, follow-ups, customer statement, receivable aging; strong backend APIs and demo seeding | Implemented | `Mostly Ready` | older docs lag behind code; flow exists but still needs final coherence and ownership clarity |
| O&M + Ticketing | tickets, SLA, penalties, RMA, site/project linkage | `ge_ticket`, `ge_ticket_action`, SLA DocTypes, RMA tracker, om-helpdesk, sla, rma pages, strong backend state machines | Implemented | `Ready` | deeper lifecycle refinement is optional, not a blocker |
| DMS / Files | governed documents, versioning, expiry, project linkage, file support | `ge_project_document`, `ge_document_folder`, DMS upload routes, version APIs, expiry support, DMS page and workspace integration | Implemented | `Mostly Ready` | explicit document approval workflow is not first-class; project-context polish remains |
| Alerts & Notifications | in-app + email alerts, due reminders, overdue alerts, dependency alerts, escalation | `ge_alert`, tender reminders, user reminders, alert routes, record comments, mention records, alert APIs | Implemented | `Partial to Mostly Ready` | in-app is real; email-style notification maturity is unclear; experience is less unified than core operations |
| HR / Manpower | onboarding, employee admin, attendance, leave/regularization, overtime, travel, statutory, field visits | HR pages, onboarding sync, employee admin, approvals inbox, attendance/leave/regularization, travel/overtime/statutory/technician visits; UAT doc exists | Implemented | `Mostly Ready` | biometric swipe bridge is deferred; final browser-auth UAT hardening still useful |
| ANDA Compliance / Migration | live-sheet alignment, import pipeline, parity, workflow fidelity, RBAC compliance | import framework, 13 importers, master loaders, orchestrator, workflow fidelity, RBAC alignment, parity/UAT docs | Implemented | `Ready` | mostly maintenance and future data-quality care only |

## Cross-Cutting Requirement Matrix

| Cross-Cutting Area | SRS Intent | Current Position | Status | Main Gap |
|---|---|---|---|---|
| RBAC | role-based access and approval discipline | strong role-gated backend, secured APIs, permission sync, ANDA permission matrix | `Ready` | final route-level walkthrough discipline still advisable |
| Auditability | log actions and preserve workflow truth | audit trails, comments, import logs, approval-linked actions, project activity feed | `Mostly Ready` | more consistent cross-workspace surfacing would help |
| Revisioning | version history for controlled records | BOQ/costing revisions, DMS versioning, project activity/version feeds | `Mostly Ready` | broader consistency in UI surfacing still needed |
| Workflow State Machines | safe transitions and guards | strong in ticket, RMA, milestone, site, leave, regularization, approvals | `Ready` | mostly ongoing regression protection |
| File Governance | support controlled file handling | strong DMS now supports core upload/version/expiry flow | `Mostly Ready` | formal approval and richer contextual embedding still remain |
| Notifications | timely reminders and alerts | alerts/reminders exist, tender reminders improved | `Partial to Mostly Ready` | email/multi-channel maturity and stronger unified UX still remain |
| Reports / Exports | dashboarding and operational reporting | many module pages, HR reports, finance/commercial views, dashboards exist | `Mostly Ready` | export/report beautification and browser-level validation still remain |
| End-to-End Demo Stability | implementation-day confidence | strong module surface, but some walkthrough polish still pending | `Partial to Mostly Ready` | final role-based browser walkthrough and seeded data discipline are still needed |

## SRS Area-by-Area Commentary

### 1. Tender To Project Handoff

This is strong.

Tender conversion is not only present but structurally important in the backend and frontend. The codebase already behaves like a real presales-to-project system, not a disconnected tender tracker.

Assessment: `Ready`

### 2. Operations Depth

Execution, commissioning, O&M, HR operations, DMS, and ANDA alignment all show real operational thinking. This is one of the strongest qualities of the codebase.

Assessment: `Mostly Ready`

Main remaining issue:

- the shared project workspace still needs to feel more like the single operational cockpit

### 3. Commercial / Bookkeeping

This area is better than some tracker docs imply.

The quote-to-cash style surface now exists materially:

- estimate / quote
- proforma
- invoice
- payment receipt
- statement
- receivable aging
- payment follow-up

Assessment: `Mostly Ready`

Main remaining issue:

- polish flow coherence and ownership clarity instead of rebuilding the lane

### 4. DMS

DMS is no longer a weak placeholder. It is real.

It now supports controlled upload, file validation, versioning, expiry, and project linkage.

Assessment: `Mostly Ready`

Main remaining issue:

- project-context experience and explicit document approval-style workflow are still weaker than the original SRS ideal

### 5. Alerts / Collaboration

This area exists, but it does not feel as mature as tendering, billing, O&M, ANDA, or HR.

Assessment: `Partial to Mostly Ready`

Main remaining issues:

- unified UX
- implementation-day clarity
- unclear email-notification maturity from current code audit

## Biggest Remaining Gaps

These are the smallest remaining gaps with the highest leverage.

### Gap 1: PM Workspace Maturity

The system has project pages, execution pages, dependencies, DPRs, documents, and activity signals, but the shared project workspace still appears to be the biggest product-level maturity gap.

Fix intent:

- make `/projects/[id]` the true operating surface
- improve filtering by project/site/stage
- connect execution, commissioning, DMS, and comments more tightly there

### Gap 2: Execution / Commissioning Polish

The models and APIs exist, but the final operator UX still needs tightening.

Fix intent:

- make commissioning, signoff, and field-progress behavior clearer
- reduce fragmentation between execution pages

### Gap 3: Alerts / Reminders / Collaboration Maturity

This area is implemented, but still less convincing than the rest of the stack.

Fix intent:

- unify in-app alert experience
- improve reminder usefulness
- tighten project-context and tender-context collaboration surfaces

### Gap 4: DMS Governance In Context

DMS works, but can be made more SRS-faithful.

Fix intent:

- strengthen project-context linked docs
- surface expiry and versions more consistently
- decide whether formal document approval workflow is needed now

### Gap 5: Final Acceptance Hardening

This is the gap between “implemented” and “safe for implementation day”.

Fix intent:

- do one full role-based walkthrough
- tighten browser-level smoke coverage
- use stable demo data across the core journey

## Recommended Fix Order

Do these next, in order:

1. project workspace maturity
2. execution / commissioning polish
3. alerts / reminders / collaboration maturity
4. DMS project-context rigor and approval decision
5. full role-based walkthrough and bug sweep

## What Does Not Need Reinvention

These areas are already real enough that they should be refined, not redesigned:

- tendering and presales
- survey / BOQ / costing base workflows
- procurement and stores backend logic
- billing / retention / penalties
- commercial bookkeeping flow
- O&M / SLA / RMA
- HR hybrid layer
- ANDA import and compliance framework

## Bottom Line

The codebase is already much closer to closure than to invention.

It is not accurate to describe the system as incomplete at the module level.
It is more accurate to say:

- the lifecycle is broadly implemented
- the backend is strong
- the frontend has depth
- the remaining work is mostly maturity, coherence, and acceptance hardening

Current best readiness call:

- `module coverage`: high
- `workflow truth`: high
- `workspace maturity`: medium-high
- `acceptance confidence`: medium-high

Final call:

The ERP is already good enough to fix forward from here. The remaining work should be focused, not broad.
