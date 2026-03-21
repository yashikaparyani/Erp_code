# Department Iteration Project Workspace Model

Date: 2026-03-18

## Purpose

This document freezes the intended product architecture for the post-tender ERP UI so agents do not split the system into disconnected departmental products.

It answers these questions:

1. Are departments separate modules or filtered views of the same project truth?
2. How should the UI reconcile the approved multi-department Figma with the newer project-centric direction?
3. What should a `Director`, `Project Head`, `Project Manager`, and department users actually see?
4. Which parts should look RISE-like and which parts should remain ERP/Frappe-native?
5. Why is Inventory the main exception?

This file is intentionally detailed enough to prevent "funny ideas" during implementation.

## Source Of Truth

This model is grounded in:

- `/workspace/development/erp for technosys/docs/ERP SRS DOC.docx`
- `/workspace/development/erp for technosys/docs/frs and db schema fields.docx`
- `/workspace/development/erp for technosys/details for frs.xlsx`
- `Erp_code/backend_builtin_vs_custom_refactor_map.md`
- `Erp_code/backend_project_spine_model.md`
- `Erp_code/backend_org_mapping.md`
- `Erp_code/backend_role_matrix.md`
- `Erp_code/anda acess.md`
- `Erp_code/ANDA.xlsx`

## Final Design Decision

The correct architecture is:

- departments remain visible in navigation
- projects remain the shared business truth
- each department page is a department-wise iteration of the same project workspace
- the workspace is presented in a RISE-style PM-friendly shell
- visibility is filtered by role, department, project assignment, and lifecycle stage
- Inventory remains its own operational module and is not forced into the same workspace style

In plain language:

- the client Figma was right to show multiple departments
- the project-centric convergence was also right
- the synthesis is not "pick one"
- the synthesis is "shared project workspace, department-wise filtered iterations"

## One Sentence Model

After tender conversion, the ERP should behave as:

- `Project` = the command object
- `Site` = the execution object
- departments = filtered operational lenses over the same project and site truth

## Why This Solves The Figma vs Project-Centric Debate

### What the Figma got right

The approved Figma showing multiple departments was not wrong.

It correctly reflected:

- organizational mental model
- how users think about their work entry point
- how departments are recognized inside the company
- how client stakeholders expect to navigate the ERP

### What the project-spine model got right

The project-centric model was also not wrong.

It correctly reflected:

- delivery truth
- cross-department operational dependency
- shared project/site/stage state
- the fact that departments should not maintain separate realities

### Combined answer

Therefore:

- departments should stay as entry routes
- project/site/stage should stay as shared execution truth
- department tabs should not become separate software islands
- department tabs should open filtered views of the same project workspace model

## The UI Layer We Should Copy From RISE

We should copy the following from RISE at the UX layer:

- project-detail workspace shell
- tabbed detail layout
- strong list view
- board/kanban view
- visible action bar
- activity/timeline visibility
- project-level files/comments split
- PM-first operational clarity

We should not copy from RISE blindly at the business-model layer.

We should not import these mistakes:

- treating a project like just a task container
- ignoring site as the execution unit
- replacing ERP document/register truth with startup-style cards only
- flattening procurement, billing, execution, and SLA into generic task semantics

## Shared Workspace Rule

There must be one canonical project workspace pattern.

That pattern should be implemented under the project route family and reused conceptually across department views.

The canonical workspace should revolve around:

- project summary
- site list
- site board
- milestones / lifecycle progress
- files / DMS evidence
- activity / comments / audit
- blockers / exceptions

This workspace is the "engine room" of the ERP.

## Department Iteration Rule

Each department should see an iteration of the same workspace.

That means:

- same underlying project
- same underlying sites
- same underlying lifecycle
- same underlying documents
- different default filters
- different visible tabs
- different visible fields
- different available actions
- different KPIs

The point is not to clone separate products.

The point is to render different operational slices of the same project truth.

## Core Data Backbone

The shared workspace must remain anchored to:

- `Project`
- `GE Site`
- lifecycle stage
- assignment / team ownership
- dependencies
- milestones
- DMS/files
- activity and approvals

This is the canonical order of truth:

1. Tender creates commercial origin
2. Tender converts to Project
3. Project contains many Sites
4. Sites move through lifecycle stages
5. Departments operate on the site-level reality
6. Project-side roles aggregate and control

## Role Model

The role model should be understood like this:

- `Director` = superset visibility and portfolio drill-down
- `Project Head` = command/control visibility across delivery
- `Project Manager` = day-to-day project control visibility
- department heads = broad function-specific oversight
- department users = operational lane visibility

The Director is the reference model for maximum visibility, but not every derived role should inherit literally in code. The implementation should use curated subsets of visibility and action rights.

## Navigation Rule

### Left navigation

Keep department-oriented navigation for recognizability:

- Projects
- Engineering
- Procurement
- Inventory
- Execution / I&C
- Finance / Accounts
- HR / Manpower
- O&M / RMA
- Settings

### Who gets `Projects`

`Projects` is not for everybody.

It should primarily serve:

- Director
- Project Head
- Project Manager
- project coordinators or equivalent project-team roles

Other departments do not need a generic all-project workspace by default.

They should enter through their own departmental tabs and then drill into the same project shell in filtered form.

## Canonical Workspace Structure

The canonical project workspace should eventually standardize on these tabs:

- `Overview`
- `Sites`
- `Site Board`
- `Milestones`
- `Files`
- `Activity`

Optional later tabs:

- `Tasks`
- `Risks / Blockers`
- `Dependencies`
- `Commercial`
- `Manpower`

Do not start by building every optional tab.

The first six are enough to establish the model.

## Tab Semantics

### Overview

Must answer:

- what is this project?
- how many sites are there?
- how many are completed / blocked / active?
- what is the current lifecycle health?
- what is the next action?
- what does the latest activity look like?

This tab should combine:

- top-level project metadata
- site coverage stats
- stage distribution
- blocker summary
- team members
- activity feed

### Sites

This is the strongest operational tab.

It should show:

- site name / code
- current stage
- owner / assigned department
- deadline or target date
- status
- progress
- blocker state
- last updated

This is the true execution list, not a decorative summary.

### Site Board

This is the RISE-like board view adapted for ERP.

It should group by lifecycle stage, not generic PM status.

Suggested columns:

- Survey
- BOQ / Design
- Costing
- Procurement
- Stores / Dispatch
- Execution / I&C
- Billing / Payment
- O&M / RMA
- Closed

The board should initially be read-first.

Stage mutation must remain controlled by validations, dependencies, approvals, and not casual drag-and-drop everywhere.

### Milestones

This is not a fake PM milestone tab.

This should reflect the real lifecycle and stage completion logic:

- stage name
- sites currently in stage
- sites completed past stage
- blockers
- SLA or timeline pressure where relevant

### Files

This must be a serious DMS view.

It should expose:

- project-level documents
- site-linked documents
- version / category / expiry where relevant
- engineering, procurement, execution, billing, and compliance evidence

### Activity

This is one of the highest-value realism features.

It should show:

- who changed what
- when
- on which project or site
- what field/stage/status shifted
- comments / notes / approvals / exceptions

Without this, the app keeps feeling static even when it is not.

## Department-Wise Iterations

Below are the expected departmental iterations of the same project workspace.

### Director iteration

Purpose:

- portfolio command view
- deep drill-down when needed

Default emphasis:

- project health
- stage coverage
- blockers
- financial / SLA / penalty exposure
- cross-department lag

Visible scope:

- all projects
- all sites
- all stages
- all department slices

Likely visible tabs:

- Overview
- Sites
- Milestones
- Files
- Activity
- optional board

### Project Head iteration

Purpose:

- delivery command and cross-stage control

Default emphasis:

- active projects
- stage delays
- dependencies
- material readiness
- manpower readiness
- approval bottlenecks

Visible scope:

- all sites and stages for owned/visible projects
- all operational lanes

Likely visible tabs:

- Overview
- Sites
- Site Board
- Milestones
- Files
- Activity

### Project Manager iteration

Purpose:

- daily project operation

This is the closest match to the RISE-style inspiration.

Default emphasis:

- active sites
- blocked sites
- next due sites
- material / engineering / execution dependencies
- latest updates
- site-level workload and follow-up

Visible scope:

- assigned projects
- site-level detail
- deep execution visibility

Likely visible tabs:

- Overview
- Sites
- Site Board
- Milestones
- Files
- Activity

This should be the first role we optimize heavily for UX quality.

### Engineering iteration

Purpose:

- engineering-specific site readiness and document control

Default emphasis:

- survey completion
- drawing / BOQ / design status
- engineering blockers
- document register / submission status

Visible scope:

- only projects/sites relevant to engineering
- only engineering-relevant fields and actions

Likely visible tabs:

- Overview (engineering version)
- Sites (engineering fields)
- Site Board (stages up to engineering responsibility)
- Files
- Activity

Engineering should not see the whole project universe by default.

Engineering should see the engineering lane of the project truth.

### Procurement iteration

Purpose:

- procurement readiness and purchase execution

Default emphasis:

- site-wise item need
- indent / rate comparison / PO / vendor progress
- pending material dependencies

Visible scope:

- procurement-relevant projects and sites
- commercial sensitivity only where permitted

Likely visible tabs:

- Overview (procurement KPIs)
- Sites
- Milestones
- Files
- Activity

Optional later:

- procurement-specific board or supply-readiness view

### Execution / I&C iteration

Purpose:

- installation and commissioning control

Default emphasis:

- site installation readiness
- actual work done
- pending work
- commissioning readiness
- field issues and sign-offs

Visible scope:

- execution-stage and field-stage site slices

Likely visible tabs:

- Overview
- Sites
- Site Board
- Files
- Activity

Optional later:

- I&C report tab if needed

### Accounts / Finance iteration

Purpose:

- billing and receipt control against project progress

Default emphasis:

- billing milestones
- payment receipts
- pending invoices
- retention
- penalty exposure

Visible scope:

- finance-relevant project slices
- no unnecessary access to all operational documents unless required

Likely visible tabs:

- Overview (commercial variant)
- Milestones
- Files
- Activity

Accounts does not need a generic engineering-style site board by default.

### HR / Manpower iteration

Purpose:

- manpower support to projects

Default emphasis:

- onboarding
- technician assignment
- attendance/travel/overtime linked to project/site reality

Visible scope:

- people and movement related project slices

Likely visible tabs:

- Overview (people readiness)
- Sites
- Activity

Optional later:

- manpower-specific tab

### O&M / RMA iteration

Purpose:

- after-deployment service continuity

Default emphasis:

- tickets
- uptime
- SLA timers
- RMA
- closure quality

Visible scope:

- O&M stage projects/sites/assets

Likely visible tabs:

- Overview
- Sites
- Files
- Activity

Optional later:

- service board / uptime board

## Inventory Exception

Inventory is the main exception to the shared project-workspace presentation.

### Why Inventory is different

Inventory is not primarily interpretive project work.

It is primarily transactional stock truth.

Its center of gravity is:

- stock quantity
- serial/batch
- warehouse/bin
- inward/outward
- issue/receipt/transfer
- dispatch readiness

This makes it better suited to:

- ERPNext/Frappe built-ins
- native stock and warehouse UX
- project linkage through references and custom fields

### What Inventory should be

Inventory should be:

- its own module
- its own workflow
- deeply linked to projects and sites where needed
- not visually forced into the PM workspace shell

### What Inventory should still expose

Even though it remains distinct, it must still support:

- project linkage
- site linkage
- dispatch linkage
- serial-level traceability
- inward/outward visibility for project teams

The correct relationship is:

- Inventory owns material truth
- Project workspace consumes inventory truth

## Backend Implications

This model implies the backend should serve:

- shared project detail APIs
- department-filtered project detail APIs
- site rollup APIs
- lifecycle distribution APIs
- document/activity aggregation APIs
- role-aware action gating

The backend should not create completely separate data realities per department.

It should expose the same underlying project/site truth through filtered views.

## Frontend Implications

The frontend should implement:

- one strong project workspace pattern
- one reusable project layout
- role-aware tab visibility
- department-aware summaries
- field-level differences without route explosion

Do not implement:

- a separate mini-product per department
- unrelated card dashboards with no drill path
- multiple competing project detail paradigms

## UX Rules

### Rule 1

The user must always know:

- which project they are in
- which sites matter
- what stage those sites are in
- what is blocked
- what needs action next

### Rule 2

Department dashboards should not be dead-end summaries.

They should be launchpads into project/site detail.

### Rule 3

The PM/project-side view should be the reference implementation for interaction richness.

That is where the RISE-style inspiration should be strongest.

### Rule 4

Visibility must reduce clutter, not remove shared truth.

Department users should see less, but what they see must still be grounded in the same project and site reality.

### Rule 5

Activity must be visible.

Actions without visible consequences make the ERP feel fake.

## What Not To Do

Do not do these:

- build a completely separate UI architecture for every department
- make department dashboards disconnected from project/site detail
- treat project and department views as competing concepts
- force Inventory into the same PM-style shell
- rebuild the same project detail route differently in multiple places
- overuse generic SaaS task semantics where site/stage is the real business atom

## Recommended Implementation Order

### Phase 1

- stabilize the canonical `/projects/[id]` workspace shell
- make `Overview`, `Sites`, `Files`, and `Activity` strong

### Phase 2

- implement department-wise filtered iterations of the same workspace
- start with:
  - Engineering
  - Procurement
  - Execution / I&C

### Phase 3

- deepen finance, HR/manpower, and O&M iterations
- keep Inventory separate and integrate via references

### Phase 4

- add richer operational tabs:
  - Site Board
  - Risks / Blockers
  - Dependencies
  - optional project tasks if still needed

## Final Rule For Agents

When implementing any department screen, ask:

1. Is this a separate data reality?
2. Or is it a filtered iteration of the same project and site workspace?

The default answer should almost always be:

- filtered iteration of the same workspace

The major exception is:

- Inventory / stock operations

## Operational Summary

The final product should feel like:

- one ERP
- one project truth
- one site execution truth
- many controlled departmental lenses

Not:

- one shell with many unrelated department mini-apps

## Task List

Use this section as the running implementation checklist for agents working on this model.

Status markers:

- `[ ]` not started
- `[-]` in progress
- `[x]` completed

### Foundation

- [x] Confirm the current `/projects/[id]` route is treated as the canonical workspace shell and not as one of many competing detail patterns
- [x] Audit current department routes and identify which ones are dead-end dashboards versus true drill paths into project/site detail
- [x] Map current backend APIs to the shared workspace needs:
  - project summary
  - site list
  - site board / stage grouping
  - milestone rollup
  - files
  - activity
- [x] Document gaps between existing backend APIs and the canonical workspace model before adding new endpoints

### Canonical Workspace Shell

- [x] Make `Overview` a first-class tab in the canonical project workspace
- [x] Make `Sites` a first-class tab in the canonical project workspace
- [x] Make `Site Board` a first-class tab in the canonical project workspace
- [x] Make `Milestones` a first-class tab in the canonical project workspace
- [x] Make `Files` a first-class tab in the canonical project workspace
- [x] Make `Activity` a first-class tab in the canonical project workspace
- [x] Ensure all tabs are powered by real backend data, not decorative arrays
- [x] Ensure all tabs are project-aware and site-aware, not generic card collections

### Overview Tab

- [x] Show project metadata that matters operationally
- [x] Show site counts: total, active, blocked, completed
- [x] Show lifecycle/stage distribution
- [x] Show top blockers and next actions
- [x] Show project team members
- [x] Show latest activity feed with real timestamps and actors

### Sites Tab

- [x] Render a strong site table for the project
- [x] Include site name/code
- [x] Include current stage
- [x] Include owner / assigned role or department
- [x] Include deadline or target date where available
- [x] Include status
- [x] Include progress
- [x] Include blocker state
- [x] Include last updated information
- [x] Support useful search/filter behavior without breaking the project context

### Site Board Tab

- [x] Group sites by lifecycle stage, not generic PM status
- [x] Use stage columns aligned to the ERP lifecycle
- [x] Keep first version read-safe before making stage moves casually editable
- [~] If stage mutation is later added, gate it behind dependency/approval checks *(deferred — board is read-only by design; mutation requires dependency/approval workflow)*
- [x] Make cards show enough site information to be actionable

### Milestones Tab

- [x] Show the real lifecycle stages as milestone rows
- [x] Show sites currently in each stage
- [x] Show sites passed/completed through each stage
- [x] Show blockers or lag indicators per stage
- [x] Connect milestone status to project and site truth, not independent fake milestone records

### Files Tab

- [x] Aggregate project-level documents
- [x] Aggregate site-linked documents where relevant
- [x] Surface category/type clearly
- [x] Surface expiry/version/revision where relevant
- [x] Keep this aligned with DMS truth, not as a decorative attachment gallery

### Activity Tab

- [x] Aggregate project activity from real audit-capable sources
- [x] Include site changes, stage changes, comments, and meaningful actions
- [x] Show actor, timestamp, action type, and target clearly
- [x] Ensure the activity tab makes actions feel persistent and traceable

### Role-Based Visibility

- [~] Confirm `Director` sees the superset workspace *(deferred — requires RBAC infrastructure)*
- [~] Confirm `Project Head` sees command/control delivery visibility *(deferred — requires RBAC infrastructure)*
- [~] Confirm `Project Manager` gets the richest PM-first operational workspace *(deferred — requires RBAC infrastructure)*
- [~] Confirm department users see filtered iterations, not separate product islands *(deferred — requires RBAC infrastructure)*
- [~] Confirm tab visibility is role-aware *(deferred — requires RBAC infrastructure)*
- [~] Confirm field visibility is role-aware where sensitive *(deferred — requires RBAC infrastructure)*
- [~] Confirm action buttons are role-aware and not merely visually hidden *(deferred — requires RBAC infrastructure)*

### Department Iterations

- [x] Engineering route behaves as the engineering iteration of the shared workspace
- [x] Procurement route behaves as the procurement iteration of the shared workspace
- [x] Execution / I&C route behaves as the execution iteration of the shared workspace
- [x] Finance / Accounts route behaves as the finance iteration of the shared workspace
- [x] HR / Manpower route behaves as the manpower iteration of the shared workspace
- [x] O&M / RMA route behaves as the service iteration of the shared workspace
- [x] Ensure each department route launches deeper into the same project/site truth
- [x] Ensure each department route changes KPIs, fields, and actions rather than inventing separate realities

### Inventory Exception

- [x] Keep Inventory as a distinct operational module *(verified — separate `/inventory/` route, own APIs)*
- [x] Use ERPNext/Frappe stock and warehouse built-ins wherever possible *(verified — uses dispatch-challans and stock-snapshot APIs)*
- [x] Preserve project linkage and site linkage in inventory records *(verified — project/site linkage preserved in records)*
- [x] Expose inventory truth back into the project workspace where needed *(verified — stats surfaced in workspace overview)*
- [x] Avoid redesigning inventory as a PM-style board unless there is a proven need *(verified — no PM-style board applied)*

### Backend Alignment

- [x] Validate that `Project` remains the management object *(verified — Project is the management container)*
- [x] Validate that `GE Site` remains the execution object *(verified — GE Site is the execution unit)*
- [x] Avoid creating a duplicate site reality unless a real business gap requires it *(verified — single GE Site doctype, no duplicates)*
- [x] Ensure stage/state data is consistent across project and site APIs *(verified — single SPINE_STAGES constant controls all stages)*
- [x] Ensure department-specific APIs are filtered views over shared project/site data *(verified — DEPARTMENT_STAGE_MAP filters over shared data)*
- [x] Prefer extending built-ins for generic mechanics instead of duplicating them *(verified — extends existing doctypes)*

### UX Integrity

- [x] Ensure department dashboards are launchpads, not dead-end summary pages
- [x] Ensure every major summary card has a clear drill path
- [x] Ensure users always know:
  - which project they are in
  - which sites matter
  - which stage those sites are in
  - what is blocked
  - what needs action next
- [x] Ensure the PM/project-side workspace feels like the operational center of the ERP
- [x] Ensure the UI reduces confusion rather than multiplying navigation concepts

### Documentation And Handoff

- [x] Update this checklist as implementation progresses
- [x] Record any intentional deviation from this model directly in this file *(see Deviations section below)*
- [ ] Link any major implementation PR/commit notes back to this file
- [x] Keep this file aligned with:
  - `backend_builtin_vs_custom_refactor_map.md`
  - `backend_project_spine_model.md`
  - `backend_execution_guide.md`

---

## Intentional Deviations & Deferred Items

### Role-Based Visibility (7 items — deferred)

All seven Role-Based Visibility checklist items are deferred. They require a full RBAC infrastructure layer that does not yet exist:

- **Tab visibility gating** — Needs a role-aware filter in `WorkspaceShell` that reads the logged-in user's role and hides/shows tabs accordingly. Currently tabs are configured per-department, not per-role.
- **Field-level sensitivity** — Requires field-level metadata (e.g. marking cost fields as `sensitive: true`) and a visibility resolver that checks user permissions before rendering. This is backend + frontend work.
- **Action button gating** — Action buttons must be gated by actual permission checks (not CSS `display:none`), meaning backend must expose permission flags per action per role.
- **Director / Project Head / PM role confirmation** — These are acceptance-test items that require deployed RBAC to validate.

**Why deferred:** RBAC is cross-cutting infrastructure work — it touches auth middleware, role definitions, permission APIs, and frontend route guards. Implementing it piecemeal would create inconsistent security boundaries. It should be done as a dedicated sprint.

### Site Board Stage Mutation (1 item — deferred)

The board is currently read-only by design. Adding drag-and-drop stage mutation requires:
- Dependency checks (e.g. can't move to EXECUTION without completing PROCUREMENT)
- Approval workflow integration
- Audit trail for stage changes

**Why deferred:** Casual stage mutation without dependency/approval validation would break data integrity. This needs backend workflow support first.
