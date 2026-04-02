# Frontend Rebuild Strategy

## Purpose
This document defines the correct strategy for rebuilding the frontend without throwing away the working backend, business rules, and domain learning already captured in the app.

This is **not** a “scrap everything and start vibes-based again” plan.
This is a **controlled rewrite-in-place** plan.

The goal is:

- keep the backend and proven workflows
- stop patching random pages forever
- rebuild the frontend around one canonical context model
- remove old UI patterns as each area is replaced
- finish with a cleaner, production-grade frontend instead of a second messy frontend

---

## Core Decision
We will **not** rebuild the whole frontend from zero in one shot.

We will:

1. keep the backend, DocTypes, workflow logic, and APIs that already model the business well
2. define one canonical frontend contract
3. create a small set of shared page primitives
4. rebuild module clusters one by one in business priority order
5. delete old patterns immediately after each replacement is stable

This gives us the benefits of a rewrite without losing months of business understanding.

---

## The Canonical Spine
The frontend must be organized around this operational spine:

`Tender -> Project -> Site -> Stage -> Record`

This is the non-negotiable truth the UI should reflect.

### Meaning
- `Tender` is the pre-award or contract-origin object.
- `Project` is the operational parent after conversion / award.
- `Site` is the actual execution unit for most field operations.
- `Stage` is the lifecycle lane within the project/site.
- `Record` is the transaction or artifact inside that stage.

### Rule
No page should behave as if a record is floating independently when its real meaning depends on a site, project, or tender context.

---

## Canonical Context Resolution Rule
Every frontend screen must resolve context in this order:

`record -> linked_site -> linked_project -> linked_tender`

### Why
This prevents old tender-first behavior from breaking new project/site-driven flows.

### Implications
- Pages must stop guessing by `site_name` when a real `linked_site` exists.
- Pages must stop requiring `linked_tender` when the business action is actually site-driven.
- Pages must stop deriving project context differently in each screen.
- Upload, comments, accountability, and linked-record panels must all consume the same resolved context.

---

## What We Keep
We keep the parts that already represent real business knowledge.

### Keep
- backend APIs that already behave correctly
- DocTypes and data model improvements
- workflow rules that match real business flow
- role concepts and business ownership mapping
- stable detail pages that already reflect the spine
- DMS, accountability, alerts, and linked-record concepts

### Do Not Throw Away
- project head approval logic
- costing queue logic
- project/site execution model
- survey/BOQ/procurement chain logic
- PM/PH workflow understanding
- tender lifecycle learnings

If we throw these away, we are not simplifying. We are paying again for lessons already bought.

---

## What We Rebuild
We rebuild the frontend shells and interaction model.

### Rebuild Targets
- page structure
- navigation grouping
- list/register pages
- detail pages
- workspace pages
- create/edit flows
- modal and form behavior
- context propagation
- data-loading conventions
- empty states / error states / loading states

### Why
The current pain is less about missing modules and more about:

- inconsistent context handling
- old tender-first pages mixed with new site/project-first pages
- many one-off patterns
- too much ad hoc UI logic
- surfaces that teach the wrong mental model

---

## Non-Negotiable Frontend Rules

### 1. No record-local fantasy
If a workflow is site-owned, the UI must know the site.

### 2. No hidden required fields
If downstream logic needs a field, either:
- enforce it earlier, or
- make downstream logic robust without it

Never mark something “optional” and then silently depend on it later.

### 3. No free-text project or site entry where a constrained selector is possible
If the project determines the valid sites, the user must select from valid sites.

### 4. No page-specific context logic
Context resolution belongs in shared helpers and backend contracts, not per-page improvisation.

### 5. No mixed pattern systems
For each type of page, there should be one approved shape.

### 6. No fake links
Cards, tabs, and action surfaces must be real route transitions or explicit view-state changes.

### 7. No browser-dialog UX
No `alert`, `confirm`, or `prompt` style leftovers.

### 8. No silent scope assumptions
PM/PH/department scope must come from backend/session context, not ad hoc frontend filtering.

---

## The Rewrite Approach
This is a **strangler pattern** rebuild.

Meaning:
- we replace old screens with new ones slice by slice
- while keeping the rest of the app working
- and removing the old code once the new version is verified

### We Will Not
- create a totally separate second app
- duplicate every route under `/v2`
- keep old and new patterns alive for months

### We Will
- choose a module cluster
- rebuild it against the shared frontend foundation
- validate it
- remove or stop using the old pattern

---

## Shared Frontend Foundation We Need First
Before rewriting module clusters, we need a stable small foundation.

### 1. Context utilities
Shared helpers for:
- resolving route context
- normalizing `linked_site`, `linked_project`, `linked_tender`
- deriving labels from canonical context
- handling “needs relink” legacy records

### 2. Shared page shells
We need standard layouts for:
- module list/register page
- object detail page
- project workspace page
- project/site action workspace page

### 3. Shared data-state conventions
Every page should use the same behavior for:
- loading
- empty
- error
- retry
- relink warning

### 4. Shared form conventions
Every create/edit surface should use:
- explicit required fields
- controlled selectors for project/site context
- consistent action button placement
- consistent success/error feedback

### 5. Shared side panels / linked content
Shared behavior for:
- record documents
- accountability timeline
- linked records
- comments / collaboration

---

## Rewrite Order
This order matters.
Do not jump around randomly.

### Phase 1. Foundation
Build the shared frontend primitives first.

Deliverables:
- context resolution helpers
- standard list page shell
- standard detail page shell
- standard workspace shell
- standard modal/form shell
- standard data-state components

Definition of done:
- at least one existing route is successfully refactored to each new primitive

---

### Phase 2. Projects and Project Workspace
This is the real cockpit of the app and must become the canonical operating center.

Rewrite:
- `/projects`
- `/projects/[id]`
- tabs under the project workspace
- project dossier / files / activity / ops / site board entry points

What this phase must achieve:
- every major department can be understood through project context
- project -> site -> stage visibility is obvious
- actions from the project workspace navigate correctly

Definition of done:
- project workspace teaches the correct app model even to a new user

---

### Phase 3. Survey and Site-Driven Engineering Entry
Survey is where the spine kept breaking, so it must be normalized early.

Rewrite:
- `/survey`
- `/survey/[id]`
- `/engineering/survey`
- `/engineering/survey/[id]`

What this phase must achieve:
- survey creation is site-first
- survey detail consumes canonical context
- engineering survey workspace is site/project operational, not tender-first CRUD
- documents and accountability panels work from resolved site/project context

Definition of done:
- a survey can be created and opened for a site with or without direct tender linkage
- no page depends on `site_name` text matching as the primary join mechanism

---

### Phase 4. PM Operating Surfaces
PM pages must all teach the same pattern:

`select project -> select site -> act`

Rewrite:
- PM dashboard
- PM requests
- PM petty cash
- PM inventory
- DPR/progress
- client communication

What this phase must achieve:
- no free-text site entry where site is known
- all PM create actions are constrained to assigned projects/sites
- PM dashboard shows actual allotted sites and work, not generic junk

Definition of done:
- PM can work entirely within the site/project spine without hidden assumptions

---

### Phase 5. Project Head Governance Layer
This is the approval and control layer above PM and departmental actions.

Rewrite:
- Project Head dashboard/workspace
- Approval hub
- communication visibility
- closeout / completion / handover flows

This phase must reflect true business flow:
- PO approval
- RMA PO approval
- petty cash request approval
- costing handoff after PH approval
- project closeout branching by tender scope

Definition of done:
- PH pages feel like governance surfaces, not recycled module views

---

### Phase 6. Procurement and Inventory Chain
This phase stabilizes the operational supply flow.

Rewrite:
- indents
- vendor comparisons
- purchase orders
- dispatch challans
- GRNs
- stock position
- stock aging

This phase must clearly reflect:

`site need -> indent -> comparison -> PO -> dispatch -> GRN -> stock -> issue/consumption`

Definition of done:
- no major supply-chain page behaves like an isolated ledger page

---

### Phase 7. Finance and Costing Surfaces
After PH and operational flows are stable, finance should consume approved, contextual actions cleanly.

Rewrite:
- costing queue
- billing
- receipts
- follow-ups
- retention
- penalties
- project financial visibility

Definition of done:
- finance pages show why money is moving, not just that money is moving

---

### Phase 8. O&M and Closeout
This phase makes the end-state lifecycle coherent.

Rewrite:
- helpdesk/project O&M views
- SLA dashboards
- RMA lifecycle surfaces
- go-live / completion / exit management / handover surfaces

Definition of done:
- app supports the full lifecycle beyond installation and billing

---

## Page Templates We Must Standardize

### A. Register Page
Use for:
- module lists
- operational registers
- filtered transaction pages

Must include:
- page title + short purpose
- contextual filter bar
- project/site filters if applicable
- stats row only if meaningful
- main table/register
- actions that are actually allowed from this scope

Must not include:
- random hero banners without operational value
- fake “dashboard” cards that don’t drive work

---

### B. Detail Page
Use for:
- one survey
- one PO
- one dispatch
- one request

Must include:
- breadcrumb/back link
- core identity block
- status and allowed actions
- context card
- summary/notes
- linked records
- documents
- accountability

Must not include:
- context guessing inside the page
- duplicate metadata scattered across cards

---

### C. Workspace Page
Use for:
- project workspace
- PH approval workspace
- PM operating workspace

Must include:
- who this workspace is for
- what actions are expected here
- direct visibility into the controlled context
- clear tab structure

Must not include:
- decorative cards that don’t lead to action
- module-level junk copied in without context

---

## How To Migrate Each Screen
Every screen migration must follow the same sequence.

### Step 1. Identify the true owner object
Ask:
- is this page really about a tender?
- or a project?
- or a site?
- or a stage-specific record?

### Step 2. Identify required context
List the minimum required context:
- linked_site?
- linked_project?
- linked_tender?
- stage?

### Step 3. Make backend contract authoritative
If the page is guessing context, fix backend or route contract first.

### Step 4. Rebuild page using approved shell
Do not patch the old page into a new shape one corner at a time if the structure is fundamentally wrong.

### Step 5. Smoke test the page in real workflow
Not just `tsc`.
Actually test the business flow.

### Step 6. Remove old pattern hooks
Delete stale fallback logic that keeps the wrong model alive.

---

## What Opus Must Not Do
This section exists because the implementation has repeatedly gone sideways.

### Prohibited behavior
- do not add new module surfaces before the current spine is coherent
- do not patch one page with ad hoc logic and call the workflow fixed
- do not use `site_name` text as the primary operational join key
- do not create new hidden required fields through downstream assumptions
- do not leave both tender-first and site-first versions of the same flow active
- do not solve scope issues only in frontend if backend owns the truth
- do not invent one-off widgets when a shared primitive should be used
- do not add CRUD buttons before context and permissions are correct

---

## Acceptance Criteria Per Slice
No slice is “done” unless all of these are true.

### Functional
- user can complete the workflow without hidden dependency bugs
- context is resolved correctly
- valid project/site choices are constrained
- records show correct upstream/downstream links

### UX
- no misleading validation messages
- no focus bugs
- no overlapping layout
- no fake actions
- no browser-dialog leftovers

### Technical
- `tsc` clean
- relevant backend file compiles clean
- migrate succeeds if schema changed
- no page relies on legacy fuzzy joins unless explicitly marked

### Business
- page reflects real role ownership
- page reflects real document flow
- page reflects real sanction / action / follow-through chain

---

## Legacy Data Policy
We will have legacy records during the rewrite.

### Rule
Do not silently guess if context cannot be resolved safely.

### Allowed behavior
- show `needs relink`
- show contextual warning
- allow manual correction path later

### Not allowed
- attaching a record to the wrong site/project just to hide the warning

---

## Testing Strategy For Rewrite
Every rewrite phase must be tested at three levels.

### 1. Contract test
- does API return the required canonical context?

### 2. Page test
- does the page render and act correctly from that context?

### 3. Workflow test
- can the user actually finish the real business action?

### Mandatory journeys
- create project -> add sites
- create survey from allotted site
- open survey detail -> documents -> accountability
- PM request with linked site
- petty cash fund request with linked site
- project inventory receipt / consumption / indent with linked site
- PH approval -> costing queue handoff

---

## What “Done” Looks Like At The End
The frontend is considered rebuilt enough when:

- project workspace is the true operational cockpit
- PM and PH flows are coherent and role-correct
- survey and engineering flows are fully site-first
- procurement/inventory/finance/O&M all respect the same spine
- documents and accountability work with canonical context
- old tender-first leakage is gone from operational flows
- pages look like one product, not ten stitched demos

---

## Immediate Next Action
Start with the foundation and then the first four rebuild slices only:

1. shared context + shared shells
2. `/projects` and `/projects/[id]`
3. survey module
4. PM operating surfaces

Do not jump to broad visual cleanup across the entire app before these are structurally correct.

---

## One-Sentence Rule For The Whole Rebuild
**Do not build pages around records in isolation; build pages around the project/site spine and let records live inside that truth.**
