# Frontend Depth Closeout Plan

Date: 2026-03-26

## Purpose

This document defines the next frontend closeout effort for the ERP.

The core problem is no longer only missing pages.

The bigger issue is missing **depth**:

- first-click pages exist
- second-click detail pages are inconsistent
- third-click workflow surfaces are often missing
- many actions still mutate backend state directly from list pages

That creates a broad-but-shallow ERP:

- users can open many modules
- but they cannot consistently work through full record lifecycle from context-rich pages

This plan is the corrective roadmap.

## Core Rule

Every important business object should eventually support this frontend depth model:

1. list / inbox / queue page
2. detail page
3. decision / action surface
4. linked documents
5. accountability / audit trail
6. linked upstream and downstream records

If a module stops at step 1, or jumps from step 1 directly to backend mutation, it is still frontend-incomplete.

## Current Diagnosis

## What The App Is Good At

- broad route coverage
- many list pages
- initial dashboards
- backend action wiring
- shared project workspace shell
- document and accountability foundations

## What The App Is Weak At

- detail-page depth
- structured approval/rejection forms
- project/site-level drilldown consistency
- linked record navigation
- full document drilldown inside lifecycle pages
- true second-click and third-click operator workflow

## The Main Anti-Pattern

The common current frontend pattern is:

1. list page loads records
2. row action button appears
3. button triggers backend action
4. user gets toast / notification

instead of:

1. open record
2. review context
3. review documents
4. review accountability / remarks
5. take structured action
6. see downstream effects

That anti-pattern is what this plan is meant to eliminate.

## Frontend Vs Backend Audit

This section answers the more important question:

- is the page shallow because backend is missing too?
- or is the backend already richer and frontend is lagging behind it?

That distinction matters because mitigation strategy changes:

- `backend_ready_frontend_shallow` means build UI depth now
- `both_partial` means do not blame frontend alone

## Audit Matrix

### 1. Vendor Comparisons

Frontend status:

- list page exists
- detail page exists
- action modals exist for approve/reject
- still weak on linked docs, linked PO chain, and quote-depth context

Backend status:

- strong comparison methods exist:
  - `get_vendor_comparisons`
  - `get_vendor_comparison`
  - `create_vendor_comparison`
  - `approve_vendor_comparison`
  - `reject_vendor_comparison`
  - `revise_vendor_comparison`
- PO creation route is also wired from comparison

Verdict:

- `backend_ready_frontend_shallow`

Mitigation:

- improve detail-page richness instead of inventing new backend first

### 2. Indents

Frontend status:

- list page exists
- detail page exists
- accountability timeline exists
- still weak on stock context, document stack, and procurement downstream chain

Backend status:

- lifecycle is materially richer than the frontend:
  - `get_indents`
  - `get_indent`
  - `get_indent_stats`
  - `submit_indent`
  - `acknowledge_indent`
  - `accept_indent`
  - `reject_indent`
  - `return_indent`
  - `escalate_indent`

Verdict:

- `backend_ready_frontend_shallow`

Mitigation:

- deepen indent detail instead of relying on list-first action patterns

### 3. GRN

Frontend status:

- list page exists
- detail page exists
- useful receipt summary exists
- still weak on documents, accountability depth, and inventory impact explanation

Backend status:

- real GRN support exists:
  - `get_grns`
  - `get_grn`
  - `get_grn_stats`

Verdict:

- `backend_ready_frontend_shallow`

Mitigation:

- strengthen GRN detail and linked downstream inventory traceability

### 4. Project Inventory / Material Consumption

Frontend status:

- PM project inventory page exists
- receiving summary, consumption reports, and PM indent raise flow exist
- still not a full project inventory cockpit with detail pages and linked lifecycle drilldown

Backend status:

- substantial project-side backend support exists:
  - `get_project_inventory_records`
  - `record_project_inventory_receipt`
  - `get_material_consumption_reports`
  - `create_material_consumption_report`
  - `get_project_receiving_summary`
  - project-linked indent helpers

Verdict:

- `backend_ready_frontend_shallow`

Mitigation:

- create record-depth surfaces for project inventory, consumption, and receiving chain

### 5. DPR

Frontend status:

- PM DPR page exists
- list and creation flow exist
- still shallow on DPR detail, linked site context, linked blockers, and PH review trace

Backend status:

- strong DPR methods already exist:
  - `get_dprs`
  - `get_dpr`
  - `create_dpr`
  - `update_dpr`
  - `delete_dpr`
  - `get_dpr_stats`

Verdict:

- `backend_ready_frontend_shallow`

Mitigation:

- add DPR detail and review depth before expanding backend further

### 6. PM Requests / Issues / Staff / Petty Cash In Workspace

Frontend status:

- PM workspace tabs exist
- request, issue, petty cash, comms, central status, and staff surfaces exist
- still uneven in drilldown and cross-linking

Backend status:

- backend methods already exist for:
  - `get_pm_requests`
  - PM request transitions
  - `get_project_issues`
  - petty cash CRUD
  - staffing/project-side status support

Verdict:

- `backend_ready_frontend_shallow`

Mitigation:

- improve workspace tab depth and linked record/context rendering

### 7. Dossier / Record Documents / Progression Gates

Frontend status:

- project dossier and site dossier exist
- workspace now links into dossier and stage readiness better
- still not surfaced uniformly across all lifecycle object pages

Backend status:

- backend is richer than the average consuming page:
  - `get_record_documents`
  - `check_progression_gate`
  - stage completeness methods

Verdict:

- `backend_ready_frontend_shallow`

Mitigation:

- embed dossier and record-document panels into more transactional detail pages

### 8. Reports

Frontend status:

- summary page exists
- live cards exist
- real reporting/export depth is missing

Backend status:

- several stats routes exist
- but the module is still stats-oriented, not report-definition-oriented

Verdict:

- `both_partial`

Mitigation:

- do not only polish UI
- define real report objects / export strategy and then build report drilldowns

### 9. HR Attendance Swipe Ingestion

Frontend status:

- attendance page is substantial
- swipe section is explicitly placeholder

Backend status:

- the route literally calls `get_swipe_ingestion_placeholder`

Verdict:

- `both_partial`

Mitigation:

- replace placeholder integration or remove the section from production-facing UI

### 10. PM Dashboard

Frontend status:

- still largely static
- acts as a role brochure plus quick links

Backend status:

- compared to other roles, there is no equivalent rich PM dashboard feed being consumed

Verdict:

- `both_partial`

Mitigation:

- define PM dashboard data contract first, then build live cards

## What This Audit Means

The major frontend closeout opportunity is not “invent more backend.”

It is:

- use the backend depth that already exists
- stop trapping users at list level
- stop treating actions as enough
- expose context, documents, accountability, and linked record chains in detail pages

In practical terms, the heaviest current mismatch is:

- procurement
- indent
- GRN
- PM inventory
- DPR
- dossier embedding

These should be treated as **frontend-depth debt on top of already-usable backend**.

## Depth Levels

For closeout purposes, frontend depth should be evaluated like this:

### Depth 0

- route missing

### Depth 1

- list page only
- cards/table only
- action buttons mutate backend directly

### Depth 2

- detail page exists
- some record context visible
- limited action support

### Depth 3

- detail page plus structured action surfaces
- linked docs
- linked approvals / remarks
- partial upstream/downstream navigation

### Depth 4

- operationally complete
- object can be worked end-to-end from frontend with traceability

## Current Module Assessment

## A. Procurement And Stores

### 1. Vendor Comparisons

Current depth: `1`

Current truth:

- list page exists at `procurement`
- create / submit / approve / reject / revise / create-PO actions exist
- no dedicated vendor comparison detail page
- rejection / exception reasons use browser `prompt()`

Main gaps:

- no `/vendor-comparisons/[id]` page
- no quote-level detail view
- no document bundle surface
- no accountability timeline surface
- no downstream chain view to PO / dispatch / GRN

Required closeout:

- add vendor comparison detail page
- replace list-page prompts with modal/form workflow
- show quotations, selected vendor logic, remarks, documents, approval trail
- show downstream PO creation / linkage

### 2. Purchase Orders

Current depth: `2`

Current truth:

- list page exists
- detail page exists
- submit / cancel / delete actions exist
- payment terms editing exists

Main gaps:

- creation from list still uses fake item payload
- some approval decisions still rely on `prompt()` / `confirm()`
- linked documents and accountability are not first-class in PO detail
- upstream vendor comparison and downstream GRN/receipt chain are not deeply surfaced

Required closeout:

- itemized PO creation UI
- structured approval/rejection modal
- linked comparison / dispatch / GRN / document panels
- accountability panel in PO detail

### 3. Indents

Current depth: `2`

Current truth:

- list page exists
- accountability logic is stronger now
- PM-side indent raise flow exists under PM inventory

Main gaps:

- no dedicated indent detail page
- justifications still use browser prompt
- documents / stock context / approval notes are not deeply surfaced in one page
- downstream procurement chain not rendered well

Required closeout:

- add indent detail page
- structured action modal for submit / reject / acknowledge / escalate
- show stock context, linked project inventory, linked comparisons, linked approvals

### 4. GRN / Inventory / Dispatch

Current depth: `1-2`

Current truth:

- GRN list page exists
- inventory list page exists
- PM project inventory page exists

Main gaps:

- inconsistent project-vs-central inventory UX
- weak detail-page structure
- no strong dispatch -> GRN -> inventory -> consumption chain page
- limited document and accountability drilldown

Required closeout:

- add GRN detail page
- add project inventory detail page
- add dispatch detail page if missing in practice
- show linked PO, site, warehouse, receipt docs, consumption impact, accountability chain

## B. Project / PM / PH Layer

### 1. Project Manager Dashboard

Current depth: `1`

Current truth:

- dashboard exists
- mostly static quick-link and role-description surface
- no live operational cards

Main gaps:

- no real assigned-project metrics
- no live pending items
- no quick RCA / alerts / missing-doc summary
- no “my current blockers / my pending approvals / my missing submissions”

Required closeout:

- live dashboard data
- project-specific pending actions
- missing document / overdue action / blocked site / pending request surfaces

### 2. Project Workspace

Current depth: `2-3`

Current truth:

- strong shared workspace shell exists
- dossier and accountability are now connected better
- several tabs exist

Main gaps:

- some tabs still feel generic rather than lifecycle-driven
- linked downstream object detail depth is inconsistent
- task / file / note / request / comms depth is uneven across roles

Required closeout:

- keep shell
- strengthen object drilldown inside shell
- use shell as the common second-click surface

### 3. Project Dossier / Site Dossier

Current depth: `3`

Current truth:

- real dossier routes exist
- stage readiness and requirement visibility now exist

Main gaps:

- dossier is not yet embedded everywhere it should be in day-to-day flows
- stage-specific object pages do not all deep-link back into dossier consistently

Required closeout:

- add dossier entry points from all major lifecycle pages
- add missing-required-doc callouts inside operational pages

## C. Engineering

### 1. Survey

Current depth: `4` — **DONE 2026-03-26**

Completed:

- survey detail page (`/engineering/survey/[id]`) with status transitions (Pending → In Progress → Completed → Reopen)
- context card with site, tender, surveyed by, coordinates, dates
- summary/notes panel
- linked tender navigation card
- LinkedRecordsPanel: related BOQs + related drawings
- RecordDocumentsPanel: per-survey file attachments
- AccountabilityTimeline: full audit trail
- detail API route: GET / PUT / DELETE (`/api/surveys/[id]`)

### 2. BOQ / Drawings / Deviations / Change Requests

Current depth: `4` — **DONE 2026-03-26**

Completed:

**BOQ** (`/engineering/boq/[id]`):
- detail page with line items table (8 cols: site, desc, qty, unit, rate, amount, make/model)
- workflow: submit → approve / reject (with mandatory reason modal) → create revision
- RBAC-gated action buttons
- stats cards (line items, version, total value)
- approval info display with timestamp
- LinkedRecordsPanel: related drawings + vendor comparisons
- RecordDocumentsPanel + AccountabilityTimeline
- detail API: GET (`/api/boqs/[id]`), actions POST (`/api/boqs/[id]/actions`)

**Drawings** (`/engineering/drawings/[id]`):
- detail page with file viewer link, revision display, client approval status badge
- workflow: submit → approve; superseded state with link to successor
- context card: project, site, revision, dates
- LinkedRecordsPanel: related BOQs + technical deviations
- RecordDocumentsPanel + AccountabilityTimeline
- detail API: GET/PUT (`/api/engineering/drawings/[id]`), actions POST (`/api/engineering/drawings/[id]/actions`)
- list page name column now links to detail page

**Technical Deviations** (`/engineering/deviations/[id]`):
- detail page with impact badge (Low/Medium/High/Critical)
- workflow: approve / reject (with reason modal) → close
- description, root cause, proposed solution panels
- linked drawing + project navigation cards
- LinkedRecordsPanel: related drawings + change requests
- RecordDocumentsPanel + AccountabilityTimeline
- detail API: GET/PUT (`/api/engineering/technical-deviations/[id]`), actions POST
- list page ID column now links to detail page

**Change Requests** (`/engineering/change-requests/[id]`):
- detail page with submit → approve / reject (with reason modal)
- impact summary + description panels
- rejection reason display when rejected
- LinkedRecordsPanel: related drawings + deviations
- RecordDocumentsPanel + AccountabilityTimeline
- detail API: GET/PUT (`/api/engineering/change-requests/[id]`), actions POST
- list page CR column now links to detail page

## D. Execution / I&C / Commissioning

### 1. Execution Overview

Current depth: `1-2`

Current truth:

- list/dashboard-style views exist
- commissioning area exists

Main gaps:

- limited per-site execution detail
- incomplete dependency-to-site-to-report-to-commissioning chain
- actionability often sits in tables, not in record pages

Required closeout:

- site execution detail page
- commissioning detail page
- test report / signoff / blocker / accountability / document stack on one surface

### 2. DPR / Material Consumption / Site Status

Current depth: `2`

Current truth:

- PM DPR flow exists
- accountability and site alerts are stronger than before

Main gaps:

- no unified execution object chain page
- weak downstream billing/closure visibility
- reports are still separated more than they should be

Required closeout:

- execution record detail pages
- linked site dossier and accountability panels

## E. Finance

### 1. Commercial / Billing / Costing / Estimates / Proformas / Receipts

Current depth: `1-2`

Current truth:

- many finance pages exist
- some are live
- commercial still includes demo seeding

Main gaps:

- several pages are list-centric
- workflow depth and object detail depth are inconsistent
- demo/dev affordances still visible
- linked project/site/context docs not consistently surfaced

Required closeout:

- remove demo seeding controls from production UI
- strengthen detail pages around invoice / estimate / proforma / receipt records
- show linked approvals, docs, accountability, customer context, project context

### 2. Reports

Current depth: `1`

Current truth:

- cross-module summary page exists
- live metric cards exist

Main gaps:

- no proper report drilldown experience
- export/report packs not wired
- page is still an honest summary shell, not a real reports module

Required closeout:

- report detail pages
- downloadable outputs
- filterable report definitions

## F. HR / SLA / RMA / O&M

### 1. HR Attendance

Current depth: `2`

Current truth:

- attendance page is substantial
- leave, setup, calendar, regularization are present

Main gaps:

- swipe ingestion is explicitly still placeholder

Required closeout:

- replace placeholder integration with real bridge or remove the placeholder section from production UI

### 2. SLA / RMA / O&M

Current depth: `4` ✅ DONE

Completed:

- API routes: `api/tickets/[id]` GET, `api/tickets/[id]/actions` POST (assign/start/pause/resume/resolve/close/escalate/comment), `api/rma-trackers/[id]` GET, `api/rma-trackers/[id]/actions` POST (approve/reject/close/update_status), `api/sla-profiles/[id]` GET
- Detail pages: `om-helpdesk/[id]` (full ticket lifecycle with priority/status badges, assign/start/pause/resume/resolve/close/escalate/comment/convert-to-RMA actions, comments section, linked RMA records, documents, accountability trail), `rma/[id]` (RMA tracker with warranty/status badges, approve/reject/close/update-status actions, failure & RCA section, linked source ticket, documents, accountability trail), `sla-profiles/[id]` (read-only profile detail with response/resolution time KPI cards, working hours type, escalation setting, linked tickets using profile, documents, accountability trail)
- List page updates: `om-helpdesk/page.tsx` (ticket name → Link to detail), `rma/page.tsx` (RMA ID → Link to detail), `sla-profiles/page.tsx` (profile ID → Link to detail), `sla/page.tsx` (OpsWorkspace name column → Link to detail)

## Priority Ladder

*Last updated: 2026-03-27 — reflects post-audit reality.*

## Priority 1: Missing Pages With Ready Backend (Depth 0 → 4) ✅ DONE

All four Depth-0 gaps now have list + `[id]` detail pages at Depth 4:

- ✅ `/dispatch-challans` — list page + `[id]` detail (submit/approve/reject/mark_dispatched). KPI cards, line items table, LinkedRecordsPanel, AccountabilityTimeline.
- ✅ `/sla-penalties` — list page + `[id]` detail (approve/reject/waive). Penalty amount KPI, linked ticket cross-link, waiver ActionModal.
- ✅ `/hr/leave/applications` — list page + `[id]` detail (submit/approve/reject/reopen). Leave balance context, date-range KPIs, rejection reason display.
- ✅ `/hr/regularizations` — list page + `[id]` detail (submit/approve/reject/reopen). Check-in/out time KPIs, linked attendance log, rejection reason display.

## Priority 2: List-Only Pages With Ready Backend (Depth 2 → 4) ✅ DONE

All list pages now have full detail + workflow surfaces.

- ✅ `/project-manager/dpr` — `[id]` detail page with site context, KPIs (date/manpower/equipment), activities + issues child tables, linked records
- ✅ `/project-manager/requests` — `[id]` detail page with submit/approve/reject/withdraw workflow, priority badge, KPIs, reject modal with remarks
- ✅ `/finance/follow-ups` — `[id]` detail page with close/escalate workflow, promised payment KPIs, action modals with remarks
- ✅ `/finance/retention` — `[id]` detail page with release workflow, amount KPIs, release progress bar, partial/full release modal
- ✅ `/hr/onboarding` — `[id]` detail page with submit/review/approve/reject/send-back/reopen/map-to-employee, education/experience/documents child tables, reject modal with reason

## Priority 3: Depth 3 Pages Needing Final Polish (Depth 3 → 4) ✅ DONE

All remaining polish gaps on the three strongest procurement detail pages are now closed.

- ✅ `/vendor-comparisons/[id]` — quote line item breakdown + downstream PO chain card added
- ✅ `/purchase-orders/[id]` — itemized order composition UI + upstream comparison link + downstream GRN card added
- ✅ `/indents/[id]` — stock-on-hand context card + downstream vendor comparison links added

## Priority 4: Document and RCA Depth ✅ CORE LIFECYCLE ROUTES DONE

Core lifecycle detail pages now expose traceability shortcuts into dossier and accountability surfaces:

- ✅ procurement: vendor comparisons, indents, purchase orders, GRNs
- ✅ engineering: BOQ, drawings, deviations, change requests
- ✅ execution: sites, test reports, checklists, client signoffs, devices
- ✅ finance: billing, costing, estimates, proformas, payment receipts, penalties
- ✅ O&M: tickets, RMA
- ✅ linked record document panels + accountability trails already present on those routes

## Phase Plan

*Updated 2026-03-27.*

## Phase 1 — Remove Thin Action UX ✅ DONE

All major approve/reject/escalate/return flows now use structured modal/form workflows. No `prompt()` / `confirm()` dependency remains in completed modules.

## Phase 2 — Build Missing Second-Click Pages ✅ LARGELY DONE

All critical transactional modules now have detail pages:

- ✅ Vendor comparisons, indents, GRNs, purchase orders
- ✅ Engineering (BOQ, drawings, deviations, change requests, surveys)
- ✅ Execution (sites, dependencies, test reports, checklists, signoffs, devices)
- ✅ Finance (billing, costing, estimates, proformas, payment receipts, penalties)
- ✅ HR (employees, overtime, travel logs, technician visits)
- ✅ O&M (tickets, RMA, SLA profiles)
- ✅ Pre-Sales (tenders, bids, EMD instruments)
- ✅ Settings/Admin (milestones, comm-logs, petty-cash)

✅ **Priority 1 complete**: dispatch-challans, sla-penalties, hr/leave/applications, hr/regularizations all at Depth 4.
✅ **Priority 2 complete**: DPR, PM requests, finance follow-ups, finance retention, HR onboarding all at Depth 4.

## Phase 3 — Add Third-Click Workflow Depth ✅ DONE

All detail pages now expose decision-taking with structured modal/form workflows. All Priority 1 and Priority 2 workflow gaps closed.

## Phase 4 — Close PM / Project Operational Depth ✅ LARGELY DONE

- ✅ PM petty-cash, comm-logs, milestones detail pages done
- ✅ PM requests `[id]` — submit/approve/reject/withdraw
- ✅ PM DPR `[id]` — detail with activities/issues child tables
- ⬜ PM dashboard live data

## Phase 5 — Close Reports / Dossier / RCA Embedding ✅ LARGELY DONE

- report drilldowns
- ✅ dossier shortcuts rolled into core lifecycle detail pages
- ✅ accountability panels already present on operational detail pages touched in Priority 4
- ⬜ remaining workspace/report shells can still link more directly into dossier drilldowns

## Phase 6 — UAT Depth Audit ⬜ PENDING

Test journeys:

- survey → BOQ → drawing → indent → comparison → PO → dispatch → GRN → inventory
- project inventory → consumption → DPR → approval
- SLA ticket → RMA → SLA penalty → waive/approve
- HR leave application → approve → attendance reconciliation

Done when:

- each journey can be completed from frontend with context-rich screens and no blind action jumps

## Non-Negotiable Rules

- no important approve/reject flow should rely on `prompt()`
- no critical record should stay list-only if it participates in lifecycle handoffs
- no document-heavy workflow should hide docs in a side utility only
- no accountability-heavy workflow should require backend logs to understand ownership
- no module should claim “project-style workflow” if it lacks project-scoped detail depth

## Opus / Codex Split

Recommended working model:

### Opus builds

- missing detail pages
- modal action flows
- project/workspace embedding
- linked panels and UX depth

### Codex validates

- whether the page is truly second-click or still thin
- whether backend actions are fully surfaced
- whether documents and accountability are genuinely visible
- whether build/tests stay clean
- whether the UX still hides lifecycle truth

## First Execution Slice

The best first execution slice is:

1. vendor comparison detail page
2. indent detail page
3. replace procurement and indent prompts with proper modal workflow
4. strengthen PO detail with linked records, docs, and accountability

Reason:

- this is the most obvious shallow zone
- it directly affects procurement traceability
- it closes one complete transactional chain instead of scattering work

## Final Statement

The app’s current frontend problem is not mainly missing routes.

It is missing **workflow depth**.

This closeout effort should therefore be measured by:

- how many real second-click pages exist
- how many real third-click workflow surfaces exist
- how many business objects can be fully understood and acted on from frontend

Breadth is already present in many places.

Now the ERP needs depth.

## Appendix: Current Incomplete Page Inventory

This appendix lists the pages that are currently incomplete, shallow, or still dependent on thin workflow UX.

Interpretation:

- `Depth 1` = list or dashboard only
- `Depth 2` = detail exists but workflow depth is still thin
- `Depth 3` = usable but still not fully lifecycle-complete

This is a current-route audit, not a final product certification.

Pages not listed here are usually one of these:

- redirects
- wrappers around shared infrastructure
- admin/settings utilities
- pages not yet identified as major depth blockers in the current audit

## A. Cross-Module / Global

- `/` — `Depth 1` — `Project Manager` dashboard is still mostly static and not a live operational cockpit.
- `/reports` — `Depth 1` — live summary cards exist, but real report drilldowns and export/report packs are still incomplete.
- `/documents` — `Depth 3` — document management is real, but lifecycle embedding into all operational modules is still partial.
- `/accountability` — `Depth 3` — RCA dashboard exists, but not every transactional module exposes equally deep linked drilldown from object pages.
- `/notifications` — `Depth 2` — useful inbox view exists, but many objects still do not drive users into strong second-click/third-click action pages.

## B. Procurement / Stores / Inventory

- `/procurement` — `Depth 1` — still list-heavy and action-heavy; vendor comparison workflow is not anchored around a project-first operating surface.
- `/vendor-comparisons/[id]` — `Depth 4` ✅ — detail page with approve/reject/revise workflow, exception reason modal, approved-by display, quote line item breakdown, downstream PO chain card, RecordDocumentsPanel, AccountabilityTimeline.
- `/purchase-orders` — `Depth 1` — list page is usable, but creation is still thin and not a strong workflow shell.
- `/purchase-orders/[id]` — `Depth 4` ✅ — PO detail with itemized order composition UI, source indent links, submit/cancel actions, payment terms with approve/reject, upstream vendor comparison link, downstream GRN card, RecordDocumentsPanel, AccountabilityTimeline.
- `/dispatch-challans` — `Depth 4` ✅ — list page with status filter, KPI cards (total/draft/pending/dispatched), 9-column table. Detail page with submit/approve/reject/mark-dispatched workflow, line items table, LinkedRecordsPanel, RecordDocumentsPanel, AccountabilityTimeline, reject ActionModal.
- `/indents` — `Depth 2` — list page links to detail.
- `/indents/[id]` — `Depth 4` ✅ — detail page with submit/acknowledge/accept/reject/return/escalate workflow, stock-on-hand context card, downstream vendor comparison links, RecordDocumentsPanel, AccountabilityTimeline.
- `/grns` — `Depth 2` — list page links to detail.
- `/grns/[id]` — `Depth 3` — detail page with receipt items table, total/rejected qty summary, LinkedRecordsPanel, RecordDocumentsPanel, AccountabilityTimeline. Read-only (no workflow actions on GRN itself).
- `/inventory` — `Depth 1-2` — central inventory is functional, but project-vs-central inventory UX and linked transactional drilldown are still weak.
- `/stock-position` — `Depth 1` — reporting/list surface only.
- `/stock-aging` — `Depth 1` — reporting/list surface only.
- `/project-manager/inventory` — `Depth 2` — good PM-side direction, but still not a fully complete project inventory / GRN / dispatch / consumption cockpit.

## C. Project Manager / Project / Workspace

- `/project-manager/dpr` — `Depth 4` ✅ — list page + `[id]` detail page with KPI cards (date/manpower/equipment/site), detail card (project/site/submitted_by/weather/safety), summary/work-activities/issues-delays/material-received sections, LinkedRecordsPanel, RecordDocumentsPanel, AccountabilityTimeline.
- `/project-manager/petty-cash` — `Depth 2` — project-scoped list. Note: standalone `/petty-cash/[id]` detail page now exists (Depth 4 ✅). PM workspace tab can deep-link into it.
- `/project-manager/requests` — `Depth 4` ✅ — list page + `[id]` detail page with submit/approve/reject/withdraw workflow, StatusBadge + PriorityBadge, KPI cards (type/amount/delay-days/positions/requested-date), detail card with all fields, subject/description/justification text blocks, reject ActionModal with remarks, LinkedRecordsPanel, RecordDocumentsPanel, AccountabilityTimeline.
- `/projects` — `Depth 1` — project list exists, but still acts mostly as entry routing rather than rich lifecycle triage.
- `/projects/[id]` — `Depth 3` — strong shared workspace exists, but object-level drilldown depth is still inconsistent across tabs.
- `/projects/[id]/accountability` — `Depth 3` — good RCA view, but still depends on wider module adoption for full usefulness.
- `/projects/[id]/dossier` — `Depth 3` — real and useful, but still not fully embedded into every operational page where it should be first-class.

## D. Engineering

- `/survey` — `Depth 4` — ✅ full detail page with status transitions, linked BOQs/drawings, documents, accountability trail.
- `/engineering` — `Depth 1-2` — overview route exists, acts as a broad operating page.
- `/engineering/survey` — `Depth 4` — ✅ list + detail page with full lifecycle depth and downstream BOQ/drawing linkage.
- `/engineering/survey/[id]` — `Depth 4` — ✅ survey detail with context, linked records, documents, accountability.
- `/engineering/boq` — `Depth 4` — ✅ list + detail page with line items table, version/approval workflow, linked records.
- `/engineering/boq/[id]` — `Depth 4` — ✅ BOQ detail with items table, submit/approve/reject/revise, accountability.
- `/engineering/drawings` — `Depth 4` — ✅ list links to detail page; detail has file viewer, revision, approval lifecycle.
- `/engineering/drawings/[id]` — `Depth 4` — ✅ drawing detail with file link, supersede chain, linked deviations/BOQs.
- `/engineering/change-requests` — `Depth 4` — ✅ list links to detail; detail has submit/approve/reject workflow.
- `/engineering/change-requests/[id]` — `Depth 4` — ✅ CR detail with impact/description, reject modal, accountability.
- `/engineering/deviations` — `Depth 4` — ✅ list ID links to detail; detail has approve/reject/close workflow.
- `/engineering/deviations/[id]` — `Depth 4` — ✅ deviation detail with impact badge, root cause, linked drawing.
- `/engineering/letter-of-submission` — `Depth 1-2` — operationally present, but still not a full linked workflow page.
- `/engineering/projects` — `Depth 1` — department project list only.
- `/engineering/projects/[id]` — `Depth 3` — workspace exists, engineering objects now have deep detail pages.

## E. Execution / I&C / Commissioning

- `/execution` — `Depth 4` — dashboard/list surface with Link to site detail page; sites table links to `execution/sites/[id]`.
- `/execution/sites/[id]` — `Depth 4` — full site detail with location/contact info, linked test reports + checklists + client signoffs + devices, documents, accountability trail.
- `/execution/dependencies` — `Depth 4` — dependency rules table with Link to detail; detail page (`dependencies/[id]`) with task/prerequisite info, hard/soft block indicator, linked override requests, documents, accountability trail.
- `/execution/dependencies/[id]` — `Depth 4` — full dependency rule detail with active/inactive badge and linked overrides.
- `/execution/project-structure` — `Depth 2` — useful surface, but still not a complete third-click operational space.
- `/execution/commissioning` — `Depth 4` — site readiness table with Link to site detail; commissioning stats with navigation to test-reports and devices.
- `/execution/commissioning/test-reports` — `Depth 4` — three-tab page (Test Reports / Checklists / Client Signoffs) with Link columns; test report names link to `test-reports/[id]`, checklist IDs link to `checklists/[id]`, signoff IDs link to `client-signoffs/[id]`.
- `/execution/commissioning/test-reports/[id]` — `Depth 4` — full test report detail with approve/reject/resubmit workflow, test type/date/tester info, file link, rejection reason banner, documents, accountability trail.
- `/execution/commissioning/checklists/[id]` — `Depth 4` — full checklist detail with start/complete workflow, progress bar, checklist items with done/pending states, documents, accountability trail.
- `/execution/commissioning/client-signoffs/[id]` — `Depth 4` — full signoff detail with sign/approve workflow, attachment link, client signatory capture modal, documents, accountability trail.
- `/execution/commissioning/devices` — `Depth 4` — four-tab page (Devices / IP Pools / IP Allocations / Uptime Logs) with device names linked to `devices/[id]`.
- `/execution/commissioning/devices/[id]` — `Depth 4` — full device detail with commission/mark-faulty/decommission workflow, serial/MAC/IP info, warranty date, linked uptime logs + IP allocations, documents, accountability trail.
- `/execution/comm-logs` — `Depth 1` — generic workspace wrapper and still shallow.
- `/execution/projects` — `Depth 1` — department project list only.
- `/execution/projects/[id]` — `Depth 3` — workspace exists, but execution object-depth remains incomplete.

## F. Finance / Commercial

- `/finance` — `Depth 1-2` — finance overview exists, but still broad rather than deep.
- `/finance/commercial` — `Depth 1-2` — useful live page, but still includes demo-seeding affordance and lacks full object-depth consistency.
- `/finance/billing` — `Depth 4` — list page with link to detail; detail page (`billing/[id]`) with full invoice lifecycle (submit/approve/reject/mark_paid/cancel), line items table, financial summary (gross/GST/TDS/retention/net/balance), RBAC-gated actions, linked payment receipts + penalties, documents panel, accountability trail.
- `/finance/billing/[id]` — `Depth 4` — full invoice detail page with context card, workflow buttons, reject modal, linked records, documents, accountability.
- `/finance/costing` — `Depth 4` — list page with link to detail; detail page (`costing/[id]`) with submit/approve/reject/revise workflow, cost summary cards (base/sell/margin), line items, linked invoices + estimates, documents, accountability.
- `/finance/costing/[id]` — `Depth 4` — full cost sheet detail with version tracking, rejection reason banner, approval badge, RBAC actions.
- `/finance/estimates` — `Depth 4` — list page with link to detail; detail page (`estimates/[id]`) with send/approve/reject/convert-to-proforma workflow, financial summary (gross/GST/TDS/retention/net), line items, linked proformas + invoices, documents, accountability.
- `/finance/estimates/[id]` — `Depth 4` — full estimate detail with all financial breakdowns and conversion action.
- `/finance/proformas` — `Depth 4` — list page with link to detail; detail page (`proformas/[id]`) with send/approve/cancel/convert-to-invoice workflow, due-date countdown, financial summary, line items, linked estimate + invoices, documents, accountability.
- `/finance/proformas/[id]` — `Depth 4` — full proforma detail with overdue indicator and conversion lifecycle.
- `/finance/payment-receipts` — `Depth 4` — list page with link to detail; detail page (`payment-receipts/[id]`) with type badge, amount summary (received/adjusted/TDS/unadjusted), payment mode/reference/bank details, linked invoice, documents, accountability.
- `/finance/payment-receipts/[id]` — `Depth 4` — read-only receipt detail with full payment breakdown.
- `/finance/follow-ups` — `Depth 4` ✅ — list page + `[id]` detail page with close/escalate workflow, StatusBadge (OPEN/PROMISED/ESCALATED/CLOSED), KPI cards (promised-amount/promised-date/next-follow-up/escalation-level), detail card (customer/invoice/project/mode/contact/assigned-to/summary), close + escalate ActionModals with optional remarks, LinkedRecordsPanel, RecordDocumentsPanel, AccountabilityTimeline.
- `/finance/penalties` — `Depth 4` — list page with link to detail; detail page (`penalties/[id]`) with approve/apply-to-invoice/reverse workflow, source badge (LD/SLA/Client), penalty amount card, apply modal with invoice prompt, reverse modal with reason, linked invoice, documents, accountability.
- `/finance/penalties/[id]` — `Depth 4` — full penalty detail with apply + reverse modals.
- `/finance/retention` — `Depth 4` ✅ — list page + `[id]` detail page with release workflow, StatusBadge (RETAINED/PARTIALLY_RELEASED/RELEASED), KPI cards (retained/released/remaining/percent), release progress bar, release ActionModal with amount field, linked project + invoice, RecordDocumentsPanel, AccountabilityTimeline.
- `/finance/customer-statement` — `Depth 1-2` — useful report-style page, but not a fully deep workflow surface.
- `/finance/receivable-aging` — `Depth 1` — report/list page only.
- `/finance/projects` — `Depth 1` — department project list only.
- `/finance/projects/[id]` — `Depth 3` — workspace exists, but finance object-depth inside it is still incomplete.

## G. HR

- `/hr` — `Depth 1-2` — broad overview exists, but still not uniformly deep across all HR objects.
- `/hr/employees` — `Depth 4` — full employee directory with row-click to detail page.
- `/hr/employees/[id]` — `Depth 4` — full employee profile with tabbed sections (Personal, Employment, Bank/PF/ESI, Family, Education, Experience, Contracts, Documents, Separation), inline editing.
- `/hr/attendance` — `Depth 2` — substantial page, but swipe ingestion is still explicitly placeholder-backed.
- `/hr/approvals` — `Depth 2` — useful queue page. Now backed by standalone list + detail pages for both leave applications and regularizations.
- `/hr/onboarding` — `Depth 4` ✅ — list page + `[id]` detail page with submit/review/approve/reject/send-back/reopen/map-to-employee workflow, education/experience/documents child tables, KPI cards (DOJ/location/form-source/employee-ref), reject ActionModal with required reason, LinkedRecordsPanel (employee), RecordDocumentsPanel, AccountabilityTimeline.
- `/hr/leave/applications` — `Depth 4` ✅ — list page with status filter, KPI cards (total/draft/submitted/approved), 7-column table. Detail page with submit/approve/reject/reopen workflow, date-range KPIs, leave type card, employee/project links, rejection reason banner, LinkedRecordsPanel, RecordDocumentsPanel, AccountabilityTimeline, reject ActionModal.
- `/hr/leave/applications/[id]` — `Depth 4` ✅ — full leave application detail with RBAC-gated workflow actions.
- `/hr/regularizations` — `Depth 4` ✅ — list page with status filter, KPI cards, 7-column table with check-in/out times. Detail page with submit/approve/reject/reopen workflow, time KPIs, linked attendance log, rejection reason banner, LinkedRecordsPanel, RecordDocumentsPanel, AccountabilityTimeline, reject ActionModal.
- `/hr/regularizations/[id]` — `Depth 4` ✅ — full regularization detail with RBAC-gated workflow actions.
- `/hr/operations` — `Depth 1-2` — operational visibility exists, but still broad and shallow in parts.
- `/hr/reports` — `Depth 1-2` — useful surface, but still more dashboard/report shell than fully drillable reporting suite.
- `/hr/overtime` — `Depth 4` — list page with link to detail; detail page (`overtime/[id]`) with submit/approve/reject workflow, hours/rate/amount summary cards, rejection reason banner, approval badge, linked employee profile, documents, accountability trail.
- `/hr/overtime/[id]` — `Depth 4` — full overtime entry detail with RBAC-gated workflow actions and reject modal.
- `/hr/travel-logs` — `Depth 4` — list page with link to detail; detail page (`travel-logs/[id]`) with submit/approve/reject workflow, route visualization (from→to with distance), expense amount, linked employee profile, documents, accountability trail.
- `/hr/travel-logs/[id]` — `Depth 4` — full travel log detail with route card and expense breakdown.
- `/hr/technician-visits` — `Depth 4` — list page with link to detail; detail page (`technician-visits/[id]`) with visit status badge, site/location card, duration, work done section, linked employee profile, documents, accountability trail.
- `/hr/technician-visits/[id]` — `Depth 4` — full technician visit detail with on-site duration and work done.
- `/hr/projects` — `Depth 1` — department project list only.
- `/hr/projects/[id]` — `Depth 3` — workspace exists, but HR object-depth inside it is still incomplete.

## H. O&M / SLA / RMA

- `/om-helpdesk` — `Depth 4` — list page with Link to detail; detail page (`om-helpdesk/[id]`) with full ticket lifecycle (assign/start/pause/resume/resolve/close/escalate/comment/convert-to-RMA), priority & status badges, comments thread, linked RMA records, documents, accountability trail.
- `/om-helpdesk/[id]` — `Depth 4` — full ticket detail with workflow actions and linked records.
- `/om-helpdesk/projects` — `Depth 1` — department project list only.
- `/om-helpdesk/projects/[id]` — `Depth 3` — workspace exists, but service/ticket/SLA object depth still needs strengthening.
- `/sla` — `Depth 4` — OpsWorkspace wrapper with Link column to sla-profiles detail page.
- `/sla-profiles` — `Depth 4` — list page with Link to detail; detail page (`sla-profiles/[id]`) with response/resolution time KPIs, working hours type, escalation settings, linked tickets, documents, accountability trail.
- `/sla-profiles/[id]` — `Depth 4` — read-only SLA profile detail with KPI cards and linked tickets.
- `/sla-penalties` — `Depth 4` ✅ — list page with status filter, KPI cards (total/pending/approved/penalty-amount), 8-column table with ticket cross-link. Detail page with approve/reject/waive workflow, penalty amount KPI, breach type, linked ticket, penalty rule, waiver/rejection reason display, LinkedRecordsPanel, RecordDocumentsPanel, AccountabilityTimeline, reject + waive ActionModals.
- `/sla-penalties/[id]` — `Depth 4` ✅ — full SLA penalty detail with RBAC-gated workflow actions.
- `/rma` — `Depth 4` — list page with Link to detail; detail page (`rma/[id]`) with approve/reject/close/update-status workflow, warranty & RMA status badges, failure/RCA section, linked source ticket, documents, accountability trail.
- `/rma/[id]` — `Depth 4` — full RMA tracker detail with workflow actions and linked records.

## I. Pre-Sales

- `/pre-sales/dashboard` — `Depth 2` — usable, but still not the end state of full tender-workspace depth.
- `/pre-sales/tender` — `Depth 1-2` — list and funnel are strong, but workflow depth remains uneven.
- `/pre-sales/bids` — `Depth 1-2` — list-first surface, still shallow in places.
- `/pre-sales/bids/[id]` — `Depth 4` ✅ — enhanced with LinkedRecordsPanel (EMD instruments), RecordDocumentsPanel, AccountabilityTimeline.
- `/pre-sales/[id]` — `Depth 4` ✅ — enhanced with LinkedRecordsPanel (bids), RecordDocumentsPanel, AccountabilityTimeline.
- `/pre-sales/approvals` — `Depth 2` — useful queue, but linked action context can still improve.
- `/pre-sales/emd-tracking` — `Depth 3` ✅ — tracking list now links to individual instrument detail pages; instrument_name exposed in API.
- `/pre-sales/emd-tracking/[id]` — `Depth 4` ✅ — new instrument detail page with KPI cards (amount/issue/expiry), expiry warning, linked tender link, RecordDocumentsPanel, AccountabilityTimeline. API route: `api/emd-pbg/[id]` (GET via frappe.client.get).
- `/pre-sales/in-process-bid` — `Depth 1` — thin list surface.
- `/pre-sales/won-bids` — `Depth 1` — thin list surface.
- `/pre-sales/cancel-bid` — `Depth 1` — thin list surface.
- `/pre-sales/documents` — `Depth 1` — thin entry surface compared with broader DMS functionality.

## J. Settings / Admin / Utilities With Remaining Shallow Areas

- `/master-data` — `Depth 1-2` — broad admin surface, but still not consistently deep for each master object.
- `/milestones` — `Depth 4` ✅ — list page linked to detail; detail page (`milestones/[id]`) with start/complete/cancel workflow, overdue detection, completion notes modal, RecordDocumentsPanel, AccountabilityTimeline. API routes: `milestones/[id]` GET + PATCH.
- `/comm-logs` — `Depth 4` ✅ — list page linked to detail; detail page (`comm-logs/[id]`) with direction/type badges, follow-up overdue warning, summary & notes section, RecordDocumentsPanel, AccountabilityTimeline. API routes: `comm-logs/[id]` GET + PATCH.
- `/petty-cash` — `Depth 4` ✅ — list page linked to detail; detail page (`petty-cash/[id]`) with approve/reject workflow, rejection reason modal, amount KPI card, RecordDocumentsPanel, AccountabilityTimeline. API routes: `petty-cash/[id]` GET + POST (approve/reject).
- `/change-requests` — `Depth 1` — list surface only.
- `/device-uptime` — `Depth 1` — list/report style surface only.
- `/manpower` — `Depth 1` — list-heavy and still shallow.
- `/payment-receipts` — `Depth 1-2` — workable page, but still not rich in linked object context.
- `/penalties` — `Depth 1-2` — workable page, but still shallow.
- `/retention` — `Depth 1-2` — workable page, but still shallow.

## Summary Of The Current Frontend Reality

The incomplete pages are not incomplete in the old sense of:

- route missing

They are incomplete in the newer and more dangerous sense of:

- route exists
- list exists
- action exists
- but lifecycle depth does not exist yet

That is why the next closeout effort should focus on **depth**, not just route count.
