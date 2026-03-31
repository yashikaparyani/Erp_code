# Final Patch Sequence

*Created 2026-03-31.*

This document is the strict execution order for the final product-hardening wave.

It exists to prevent sideways work.
It is not a brainstorming note.
It is the ordered build-and-verify sequence that should be followed.

Primary reference inputs:

- `srs_vs_code_readiness_matrix.md`
- `all mds/remaining_todo.md`
- `elephant in the room.md`

---

## Working Rule

Opus should not jump ahead.

Each phase must be completed in order.
Do not start the next phase until:

- code is implemented
- `npx tsc --noEmit` is green
- affected backend files compile cleanly
- the listed runtime/UAT checks for that phase are done

---

## Phase 1: Stabilize The Project Workspace

### Goal

Make `/projects` and `/projects/[id]` the real operating cockpit instead of a routing shell.

### Scope

1. tighten `/projects` so it behaves as project triage, not just a list
2. make `/projects/[id]` tabs consistently deep
3. ensure dossier and accountability are first-class tabs, not side utilities
4. ensure project activity, sites, files, approvals, and downstream objects are coherently linked
5. ensure PM live data is surfaced in the project workspace, not split awkwardly into disconnected department views

### Required outcomes

- project workspace becomes the default operating surface for Project Head and Project Manager
- every major project tab must answer:
  - what is blocked
  - what is pending approval
  - what is due next
  - what documents are missing
  - what site/object is affected

### Acceptance checks

- create/open project from `/projects`
- navigate all tabs in `/projects/[id]`
- verify site list, dossier, accountability, activity, and approvals are all wired
- verify links from project workspace lead to real object detail pages

---

## Phase 2: Finish The Project Head Business Model

### Goal

Implement the real Project Head workflow instead of the simplified placeholder model.

### Scope A: Completion / Closeout

Implement separate Project Head artifacts:

1. `Go Live Certificate`
2. `Letter of Completion`
3. `Exit Management / Knowledge Transfer`
4. `Letter of Handover of Operations`

### Business rules

- if tender is `I&C only`:
  - PH issues `Go Live Certificate`
  - PH issues `Letter of Completion`

- if tender is `I&C + O&M`:
  - PH issues `Go Live Certificate`
  - project enters `Exit Management / KT`
  - PH finally issues `Letter of Handover of Operations`

### Scope B: Approval Hub

Implement one PH-owned `Approval` hub with three sub-tabs:

1. `PO`
2. `RMA PO`
3. `Petty Cash Requests`

### Business rules

- purchase finalizes PO -> sends to PH
- RMA PO goes to PH
- PM petty cash request goes to PH
- after PH approval, a new costing-side queue item must appear

### Required outcomes

- no generic/ambiguous LOC flow remains
- no mixed approval logic remains across PO, RMA PO, and petty cash
- costing acts only after PH approval

### Acceptance checks

- test PH approval of one PO
- test PH approval of one RMA PO
- test PH approval of one petty cash request
- confirm costing queue entry appears after each approval
- test I&C-only project closeout path
- test I&C + O&M project closeout path

---

## Phase 3: Deepen The Shallow Shells

### Goal

Convert the remaining shell routes into actual work surfaces.

### Highest-priority shells

1. `/`
2. `/reports`
3. `/notifications`
4. `/procurement`
5. `/inventory`
6. `/finance`
7. `/hr`
8. `/pre-sales/dashboard`
9. `/pre-sales/tender`
10. `/pre-sales/bids`
11. `/execution/project-structure`
12. `/execution/comm-logs`

### Required treatment

Each route must have:

- real live data
- clear drilldowns
- working action paths
- links into project/site/object detail
- visible status / blockers / approvals where relevant

### Anti-pattern to avoid

Do not patch these by adding cosmetic cards only.
If a route still behaves like a report shell after the patch, it is not done.

### Acceptance checks

- each route must have at least one meaningful action path
- each route must link into real deeper records
- each route must surface project or object context where applicable

---

## Phase 4: Enforce Project-Scoped Truth Everywhere

### Goal

Make the app consistently project-first instead of department-flat.

### Scope

1. audit important pages for project linkage
2. enforce `project -> site -> object -> documents -> accountability -> downstream effect`
3. remove department-only views where project/site context should be primary
4. ensure dossier and accountability are reachable from major lifecycle objects

### Required outcomes

- users can answer "what is happening on this project/site/object?" from one consistent chain
- project context is visible on procurement, execution, finance, HR, O&M, and DMS flows

### Acceptance checks

- from one project, trace into:
  - site
  - PO
  - GRN
  - dispatch
  - document
  - accountability record
  - approval item
- confirm the chain is navigable both forward and backward

---

## Phase 5: Alerts, Reminders, And Collaboration Maturity

### Goal

Make alerting feel operational, not incidental.

### Scope

1. unify in-app notification experience
2. improve overdue/due-soon reminder usefulness
3. surface project-context collaboration more clearly
4. make object-level drilldown from notifications reliable
5. ensure mentions/comments/reminders feed activity and accountability appropriately

### Required outcomes

- notifications are actionable
- reminders are tied to real due records
- collaboration is visible in project context

### Acceptance checks

- generate overdue reminder
- generate approval notification
- generate document-expiry or lifecycle notification
- open each notification into the correct object

---

## Phase 6: DMS Governance In Context

### Goal

Make DMS fully SRS-faithful in project and workflow context.

### Scope

1. strengthen document linkage in project/site/object pages
2. surface expiry, versions, and required-vs-uploaded state consistently
3. decide whether formal document approval is needed now
4. ensure PH / PM / department leads can use DMS in live workflows without leaving context

### Required outcomes

- DMS is not a separate island
- users can understand controlled documents from within project and object workflows

### Acceptance checks

- upload versioned doc in project context
- view dossier effect
- view expiry signal
- open related object from document context

---

## Phase 7: UAT Journey Closure

### Goal

Prove the app works as end-to-end journeys, not just route collections.

### Mandatory journeys

1. survey -> BOQ -> drawing -> indent -> comparison -> PO -> dispatch -> GRN -> inventory
2. project inventory -> consumption -> DPR -> approval
3. SLA ticket -> RMA -> SLA penalty -> waive or approve
4. HR leave application -> approve -> attendance reconciliation
5. PH approval chain:
   - PO -> PH approval -> costing queue
   - RMA PO -> PH approval -> costing queue
   - petty cash -> PH approval -> costing queue
6. PH closeout chain:
   - I&C-only path
   - I&C + O&M path

### Required outputs

- one pass/fail note per journey
- exact breakpoints if any fail
- no vague "mostly works" closure

---

## Phase 8: Final Hardening Before Production-Like Use

### Goal

Close the gap between "feature complete" and "safe to demo or pilot".

### Scope

1. keep `npx tsc --noEmit` green
2. keep backend imports/runtime clean
3. verify role-based walkthroughs in browser
4. verify no new route ships without RBAC mapping
5. verify no important workflow is frontend-only enforced
6. ensure app start/migrate flow is repeatable

### Required outcomes

- compile green
- login works for POC roles
- no route-level silent auth gap
- no major happy-path-only workflow

---

## Do Not Get Distracted By

- cosmetic redesigns that do not change workflow depth
- one-off page polish while shell routes remain shallow
- adding new modules before the listed phases are closed
- doc churn without implementation
- partial fixes to PH workflows that keep ambiguous naming

---

## Definition Of Done

This final wave is done only when:

1. Project workspace is the real operating cockpit
2. Project Head closeout and approval workflows match business reality
3. shallow shell pages are converted into real work surfaces
4. project-scoped traceability is consistent
5. alerts and DMS behave as part of workflows
6. mandatory UAT journeys are passed end-to-end
7. runtime, compile, and role-based validation are green

If one of the above is missing, the final patch wave is not done.
