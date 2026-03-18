# Built-In vs Custom Refactor Map

Date: 2026-03-18

## Purpose

This document is the implementation correction guide for taking the ERP from broad POC coverage toward production-grade readiness while staying faithful to the actual source-of-truth requirements.

It answers four questions:

1. What should remain custom in `gov_erp`?
2. What should move closer to ERPNext / Frappe built-ins?
3. What are we currently hardcoding too much?
4. How should implementation decisions support both production readiness and favorable UX?

This is intended to be exhaustive enough for:

- backend decisions
- schema decisions
- dashboard decisions
- workflow decisions
- UX and interaction decisions
- refactor prioritization

## Source Of Truth

This document is grounded in the actual source documents, not only derived notes.

Primary sources:

- `/workspace/development/erp for technosys/docs/ERP SRS DOC.docx`
- `/workspace/development/erp for technosys/docs/frs and db schema fields.docx`

Supporting sources:

- `ANDA.xlsx`
- `anda acess.md`
- `backend_requirement_mapping.md`
- `backend_project_spine_model.md`
- `backend_org_mapping.md`
- `backend_role_matrix.md`
- `PRODUCTION_GRADE_READINESS.md`

## What The Actual SRS And FRS Clearly Say

### SRS emphasis

The SRS is management- and outcome-oriented. It emphasizes:

- centralized data management
- role-based dashboards
- KRA-specific visibility
- real-time dependency tracking
- automated alerts and escalation
- SLA and penalty calculation
- complete document management
- project visibility across departments
- financial and execution control

It also makes the following especially clear:

- `Project Head` is a major operating stakeholder
- the software is supposed to serve cross-department project control, not isolated modules
- dashboards must be meaningful to each designation, not generic
- HR & Manpower are part of the broader intended system

### FRS emphasis

The FRS is workflow- and schema-oriented. It emphasizes:

- Tender → Survey → BOQ → Costing → Approval → Procurement → Delivery → Installation → Commissioning → Billing → Payment tracking → Ticketing basics
- project-first role scoping in Phase 1
- audit, approval, DMS, and dependency engine as first-class requirements
- site-wise execution and project-level aggregation
- tasks, milestones, DPR, material dependencies, commissioning, and RMA as real business objects

### Combined conclusion

The correct implementation model is:

- pre-sales starts the commercial lifecycle
- once converted, the **Project Team** becomes the control center
- the **Project** is the management spine
- the **Site** is the execution unit
- the **Stage** is the workflow/lifecycle unit
- departments are not independent software silos
- departments are project-linked operational lenses

This validates the recent design choice:

- keeping project-side roles involved almost everywhere was the right decision

## Core Implementation Philosophy

The right philosophy is **not**:

- “make everything custom”

The right philosophy is also **not**:

- “force everything into ERPNext built-ins”

The right philosophy is:

- use ERPNext / Frappe built-ins for generic enterprise plumbing
- use custom Gov ERP models for project/site/stage-specific delivery control
- do not hardcode what should be configurable
- do not over-genericize what is clearly domain-specific in the SRS/FRS

## Guiding Rule For Future Decisions

For every new requirement, decide in this order:

1. Can ERPNext / Frappe already do this well enough?
2. If yes, can we extend the built-in with custom fields, hooks, workflow, or dashboard logic?
3. Only if no: create or expand a custom Gov ERP object.

This must become the default decision discipline.

## Organizational Truth

### Project Team centrality

The source docs and hierarchy work together to show that after tender conversion:

- the Project Team runs the show
- the Project Team owns cross-stage coordination
- the Project Head / Project Manager are not just another department
- Engineering, Procurement, Stores, Accounts, HR, and O&M are critical, but operationally auxiliary to the project command structure

So the implementation should reflect:

- `Director` = portfolio and deep drill-down authority
- `Project Head` = operational command over delivery
- `Project Manager` = project execution controller
- departments = controlled operational lanes

This means:

- keeping project-side roles visible across the ERP is correct
- departments should still have strong operational pages, but not “own the truth” independently of the project spine

## Architecture We Should Commit To

### Business object stack

- `Tender` = commercial/pre-project object
- `Project` = management / command object
- `Site` = execution object
- `Stage` = lifecycle state object
- `Task` = work object
- `Document` = audit and evidence object
- `Approval` = controlled business decision object

### Control stack

- built-in ERP/Frappe = infrastructure and enterprise plumbing
- custom Gov ERP = domain logic and delivery tracking

### UX stack

- dashboards must be KRA-shaped
- lists and detail screens must be project/site aware
- actions must leave visible traces
- departments must see the same project through their own lane, not a disconnected silo

## What Must Stay Custom

These areas are domain-specific enough that keeping them custom is the right decision.

### 1. Tendering domain

Keep custom:

- `GE Tender`
- tender compliance structures
- tender clarifications
- tender result structures
- tender organization
- EMD/PBG tracking shell

Why:

- this is highly business-specific
- the lifecycle and document structure are not standard ERPNext sales
- the tender-to-project conversion logic is a real domain event

### 2. Project spine and site execution

Keep custom:

- `GE Site`
- project spine aggregation on ERPNext `Project`
- stage-based visibility logic
- site blockers / site progression / site-level ownership

Why:

- the source docs are extremely clear that the ERP is multi-site and project-aggregated
- ERPNext `Project` alone does not capture site-stage execution deeply enough

### 3. BOQ and costing shell

Keep custom:

- `GE BOQ`
- `GE Cost Sheet`

Why:

- site-wise BOQ aggregation, revisioning, costing approval, and margin-on-cost are domain-specific

### 4. Dependency engine

Keep custom:

- dependency rule / dependency override
- workflow restrictions based on survey, drawings, material, IP, etc.

Why:

- this is one of the strongest unique features of the ERP
- the FRS explicitly calls this out as a core feature

### 5. Dispatch workflow shell

Keep custom:

- `GE Dispatch Challan`

Why:

- dispatch is not only a stock transfer
- it is a project/site logistics workflow with business control value

### 6. Domain trackers from ANDA

Keep custom:

- `GE Project Communication Log`
- `GE Project Asset`
- `GE Petty Cash`
- `GE RMA Tracker`
- `GE Device Uptime Log`
- `GE Manpower Log`

Why:

- these map directly to the workbook structure
- they are client-shaped operational trackers
- they are not generic ERP objects

### 7. SLA and penalty shell

Keep custom:

- SLA profiles
- SLA timers
- SLA penalty records/rules
- penalty deduction overlays

Why:

- O&M, SLA, penalty, and project-linked deduction logic are too domain-specific for a pure built-in approach

## What Should Move Closer To ERPNext / Frappe Built-Ins

These are the areas where we are currently at risk of over-customizing generic enterprise mechanics.

### 1. Users, roles, departments, auth

Preferred base:

- `User`
- `Role`
- `Department`
- native auth/session

Decision:

- keep native
- avoid inventing a parallel auth system
- only add role-mapping and business semantics around native roles

### 2. Tasks

Preferred base:

- ERPNext `Task`

Implementation direction:

- keep custom project detail and project-site-stage shell
- but move underlying work objects toward `Task`
- add custom fields such as:
  - linked project
  - linked site
  - linked stage
  - assigned department
  - blocker flag
  - blocker reason
  - priority
  - planned / actual fields if needed beyond base

Reason:

- tasks are explicitly in the FRS
- we should not build a second independent task universe if `Task` can do most of the work

### 3. Approvals

Preferred base:

- Frappe `Workflow`
- `Workflow State`
- `Assignment`
- `ToDo`

Keep custom approval code only for:

- dependency-driven stage changes
- exceptional override logic
- very domain-specific transitions

Reason:

- we have grown many `approve_*`, `reject_*`, `submit_*` endpoints
- some are valid, but too much explicit endpoint sprawl becomes hardcoded workflow debt

### 4. Procurement transactions

Preferred base:

- `Material Request`
- `Supplier Quotation`
- `Purchase Order`
- `Purchase Receipt`
- `Stock Entry`

Custom overlays allowed for:

- vendor comparison
- project/site enrichment
- extra approval constraints
- dashboard and reconciliation logic

Reason:

- the FRS already fits these transactional primitives very well
- use them as the transactional truth
- keep custom layers as orchestration and domain interpretation

### 5. Billing and payment mechanics

Preferred base:

- `Sales Invoice`
- `Payment Entry`

Custom overlays allowed for:

- retention tracking
- milestone-level finance visibility
- project billing dashboards
- penalty deduction overlays

Reason:

- billing/payment trace is generic enough to benefit from built-ins
- custom logic should stay around project control, not reinvent accounting primitives

### 6. Ticketing

Preferred base:

- ERPNext `Issue`

Custom overlays allowed for:

- SLA timer behavior
- RMA linkage
- project/site/device enrichment
- penalty logic

Reason:

- ticketing itself is generic enough
- SLA + RMA are the domain-specific layer

### 7. Comments, audit, assignment, activity

Preferred base:

- `Comment`
- `Communication`
- `Activity Log`
- `Assignment`
- `ToDo`

Reason:

- favorable UX depends on visible system traces
- Frappe already gives good primitives for this
- we should use them instead of building only silent status changes

## What We Are Hardcoding Too Much Right Now

These are the places where implementation is drifting toward hardcoded logic instead of configurable or built-in-supported behavior.

### 1. Role-to-page and stage visibility rules

Current issue:

- role-stage access is too code-driven
- nav and backend visibility are still tightly coupled to hardcoded maps

Better target:

- keep short-term code enforcement if needed
- move medium-term toward configurable role-stage matrix / permission profile

### 2. Approval endpoints

Current issue:

- too many explicit domain endpoints for every approval/rejection path

Better target:

- use Frappe workflow where approval semantics are generic
- keep custom endpoints only where the dependency engine makes it necessary

### 3. Project workspace richness

Current issue:

- project pages are growing as custom UI shells faster than native work objects are being integrated

Better target:

- keep project pages custom
- plug them into built-in Task / Assignment / Comment / Communication more aggressively

### 4. Dashboard logic

Current issue:

- some dashboards still risk feeling like bespoke summary pages rather than business-control surfaces

Better target:

- every dashboard metric should trace to:
  - project
  - site
  - stage
  - or transactional truth

### 5. DMS behavior

Current issue:

- DMS exists, but the FRS expects stronger versioning / expiry / audit discipline

Better target:

- lean more on `File` + metadata + controlled folder/document structures
- avoid inventing disconnected document UX without document truth

## Module-By-Module Decision Map

### Tender & Presales

Keep mostly custom:

- Tender
- compliance
- clarification
- EMD/PBG shell

Use built-in:

- `File`
- `Workflow` where possible
- `Comment` / audit primitives

Implementation note:

- tender remains a real custom business object
- do not force it into generic CRM/sales patterns

### Survey

Keep custom:

- survey records

Use built-in:

- `File`
- comments / audit

Implementation note:

- survey is operationally tied to site and project; keep it domain-specific

### BOQ & Costing

Keep custom:

- BOQ
- cost sheet
- site/project aggregation logic

Use built-in:

- item master
- workflows / comments / documents

Implementation note:

- do not over-normalize BOQ into generic quotation-like objects

### Procurement

Keep custom:

- vendor comparison shell
- project/site procurement dashboards

Use built-in heavily:

- Material Request
- Supplier Quotation
- Purchase Order
- Purchase Receipt

Implementation note:

- transactional truth should come from built-ins
- custom layer should coordinate, enrich, and control

### Stores & Logistics

Keep custom:

- dispatch shell
- project/site consumption views

Use built-in heavily:

- stock ledger
- stock entry
- purchase receipt
- item / warehouse / bin

Implementation note:

- do not make a second inventory engine

### Project Execution

Keep custom:

- site
- milestone shell
- dependency engine
- DPR
- project/site/stage aggregation

Use built-in:

- Task
- Assignment
- Comment

Implementation note:

- this is the heart of the ERP
- custom shell is justified
- but work objects should be less reinvented

### Engineering & Design

Keep custom:

- drawings
- technical deviations
- change requests
- commissioning artifacts where domain-specific

Use built-in:

- documents
- workflows
- tasking / assignments

Implementation note:

- engineering needs strong tracker depth, but not a separate generic work management universe

### Network & Commissioning

Keep custom:

- device register
- IP pools / allocations
- commissioning checklist shell
- test reports
- client signoff shell

Use built-in:

- files
- comments
- workflows

Implementation note:

- this area is highly domain-specific and should remain custom-rich

### Billing & Accounts

Keep custom:

- retention ledger
- project finance dashboards
- penalty overlays

Use built-in:

- invoice/payment primitives as much as possible

Implementation note:

- do not trap finance in a custom-only layer if ERPNext built-ins can carry real accounting structure

### O&M / SLA / RMA

Keep custom:

- SLA timer / penalty shell
- RMA
- device uptime

Use built-in:

- Issue
- comments / communications

Implementation note:

- SLA and RMA are domain-unique enough to justify the custom shell
- ticket lifecycle itself should not be over-reinvented

### HR & Manpower

Keep custom:

- manpower allocation overlays
- travel / overtime / technician visit logs if they are truly project-shaped

Use built-in where possible:

- Employee
- Department
- Designation
- attendance if ERPNext support fits

Implementation note:

- SRS puts HR/manpower in the wider system
- for production maturity, reduce unnecessary duplication of HR primitives

## What ANDA Workbook Adds To The Truth

The workbook confirms that the operational atom is the `Site`, not just the project.

Strong implications:

- a project must be breakable into sites everywhere that matters
- departments must be able to operate at site level
- trackers are real, not cosmetic

It also confirms the need for:

- richer `GE Site`
- richer `GE Milestone`
- project communication tracking
- petty cash
- project assets/services
- device uptime
- RMA traceability
- material issuance / consumption traceability

This means our project-site-stage model is directionally correct.

## Production-Grade Readiness Implications

To be production-grade, the refactor choices must improve:

- maintainability
- configurability
- auditability
- transactional truth
- user trust
- upgrade safety

### What helps production readiness

- using built-ins for transactional primitives
- keeping custom schema only where necessary
- reducing approval hardcode sprawl
- making role-stage logic more configurable
- using native comments/audit/assignment primitives
- keeping one project/site/stage truth

### What hurts production readiness

- duplicate custom transactional engines
- too many hardcoded approval functions
- role logic split across too many frontend/backend assumptions
- dashboards not tied to source-of-truth records
- custom UI without built-in audit traces behind it

## Favorable UX Implications

Production-grade UX here does **not** mean flashy design.

It means:

- project-side roles can understand the whole project immediately
- department users can see their lane clearly
- users always know:
  - what project they are in
  - what site they are acting on
  - what stage it is in
  - what is blocked
  - what requires action
- approvals, comments, assignments, and document traces are visible
- every important action gives confidence that the system actually recorded something real

### UX rules we should follow

1. Project pages stay custom and rich.
2. Built-in work objects power those pages underneath.
3. Department dashboards must be site-aware.
4. Actions must leave visible traces.
5. Documents must feel like evidence, not decoration.
6. Dashboards must show control signals, not only counts.

## Refactor Priorities

### Refactor now

- move tasking toward ERPNext `Task`
- reduce approval endpoint sprawl where workflow can help
- increase usage of `Assignment`, `ToDo`, `Comment`, `Communication`, `Activity Log`
- extend ERPNext procurement docs rather than wrapping too much parallel custom transaction logic
- improve `GE Site` and `GE Milestone` against FRS + ANDA

### Refactor soon, but not immediately

- role-stage matrix toward configuration
- billing/payment deeper built-in alignment
- ticketing toward `Issue` with custom SLA overlay

### Leave as-is for now

- tender custom shell
- BOQ/costing custom shell
- project/site/stage spine shell
- dispatch shell
- RMA / uptime / communication / petty cash / project asset trackers
- dependency engine

## Final Position

After reading the real SRS and FRS directly, the correct conclusion is:

- we were right to keep the Project Team involved almost everywhere
- we were right to center the ERP on `Project -> Site -> Stage`
- we are still over-hardcoding some generic mechanics
- we should push more generic enterprise plumbing into ERPNext/Frappe built-ins
- we should **not** flatten domain-specific project delivery control into generic ERP objects

So the implementation target is:

- **project-team-centered**
- **site-driven**
- **stage-aware**
- **built-in for enterprise plumbing**
- **custom for delivery-domain truth**

That is the best path toward production-grade readiness with favorable UX.
