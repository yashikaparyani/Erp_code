# Pre-Sales Bid Management Target Flow And Roadmap

> This document is the implementation base for rebuilding `Pre-Sales & Budgeting` in the current ERP.
> It is aligned to the current sidebar, current backend building blocks, and the latest user decisions.

## 0. Current implementation progress

This section tracks what has already been completed in code.

### Completed in current pass

- [x] Audited existing `Pre-Sales` sidebar structure
- [x] Audited existing tender-related backend APIs in [api.py](d:/erp%20final/Erp_code/backend/gov_erp/gov_erp/api.py)
- [x] Audited existing reusable DocTypes like `GE Tender`, `GE Tender Result`, `GE BOQ`, `GE Cost Sheet`, `GE Tender Checklist`, `GE Tender Reminder`, `GE EMD PBG Instrument`
- [x] Confirmed reuse-first approach instead of creating duplicate tender objects
- [x] Removed `Analytics > Tender Results` from [Sidebar.tsx](d:/erp%20final/Erp_code/erp_frontend/src/components/Sidebar.tsx)
- [x] Removed `Analytics > MIS Reports` from [Sidebar.tsx](d:/erp%20final/Erp_code/erp_frontend/src/components/Sidebar.tsx)
- [x] Removed `Pre-Sales > Document Management` from [Sidebar.tsx](d:/erp%20final/Erp_code/erp_frontend/src/components/Sidebar.tsx)
- [x] Added tender filter support in [boqs/route.ts](d:/erp%20final/Erp_code/erp_frontend/src/app/api/boqs/route.ts)
- [x] Added tender filter support in [cost-sheets/route.ts](d:/erp%20final/Erp_code/erp_frontend/src/app/api/cost-sheets/route.ts)
- [x] Added aggregate tender workspace API in [tender-workspace/[id]/route.ts](d:/erp%20final/Erp_code/erp_frontend/src/app/api/tender-workspace/[id]/route.ts)
- [x] Rebuilt [pre-sales/[id]/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/[id]/page.tsx) into a single-page tender workspace first pass
- [x] Updated [approvals/route.ts](d:/erp%20final/Erp_code/erp_frontend/src/app/api/approvals/route.ts) to support existing backend approval methods for finance requests, BOQ, and cost sheets
- [x] Updated [pre-sales/approvals/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/approvals/page.tsx) so these approval rows become actionable
- [x] Linked approval rows back to [pre-sales/[id]/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/[id]/page.tsx)
- [x] Added first-pass tender action buttons in [pre-sales/[id]/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/[id]/page.tsx) for status movement and `Convert To Project`
- [x] Aligned `Tender Task` bucket pages to use real live tender statuses instead of placeholder workflow labels
- [x] Kept `Tender Task` pages as filtered views over the same tender data and workspace links
- [x] Added standalone [pre-sales/tender-result/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/tender-result/page.tsx) as the actual result tracker page behind the sidebar
- [x] Linked tender results back to workspace and added first-pass tender status sync from result stages
- [x] Added controlled tender status transition API in [api.py](d:/erp%20final/Erp_code/backend/gov_erp/gov_erp/api.py) and [status/route.ts](d:/erp%20final/Erp_code/erp_frontend/src/app/api/tenders/[id]/status/route.ts)
- [x] Switched workspace, tender task, and tender result status updates to use controlled transition flow
- [x] Expanded [ge_tender.json](d:/erp%20final/Erp_code/backend/gov_erp/gov_erp/gov_erp/doctype/ge_tender/ge_tender.json) with workflow owner, go/no-go, readiness, approval, and submission fields
- [x] Added tender-specific approval trail DocType in [ge_tender_approval.json](d:/erp%20final/Erp_code/backend/gov_erp/gov_erp/gov_erp/doctype/ge_tender_approval/ge_tender_approval.json)
- [x] Added backend tender approval APIs in [api.py](d:/erp%20final/Erp_code/backend/gov_erp/gov_erp/api.py) for submit / approve / reject / history
- [x] Included tender-specific approval rows in the shared approvals inbox
- [x] Added tender approval submission and history to [pre-sales/[id]/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/[id]/page.tsx)
- [x] Stopped auto-converting projects on `WON`; conversion now stays explicit through `Convert To Project`
- [x] Made `My Tender` owner-based using `tender_owner` and current logged-in user context
- [x] Smoke type-check passed using [tsconfig.smoke.json](d:/erp%20final/Erp_code/erp_frontend/tsconfig.smoke.json)
- [x] Tender DocType JSON smoke parse passed
- [x] Integration-reference sanity checks passed for new tender workflow APIs and routes

### Still pending for next passes

- [x] Add true tender workflow fields / status engine where existing `GE Tender` fields are not enough
- [x] Add tender-specific approval trail for pre-sales workflow
- [x] Add action buttons inside workspace for status movement and submission flow
- [x] Align `Tender Task` pages to become pure filtered bucket views
- [x] Tighten result sync and `WON -> Project` operating flow
- [x] Add first-pass result tracker page and workspace linkage
- [x] Tighten result sync and `WON -> Project` operating flow further
- [ ] Review and prune MIS tabs only after workflow becomes stable

## 1. Final decisions ![1773892998470](image/presales_bid_management_target_roadmap/1773892998470.png)locked

These are now treated as final unless changed later:

- Keep top-level `Tender Result`
- Keep top-level `Approvals`
- `Approvals` will be used by `Presales Tendering Head` to approve required pre-sales actions
- Main tender working flow should happen on a **single tender workspace page**
- Avoid extra tabs unless truly needed
- Remove duplicate / low-value items from `Pre-Sales`
- `Document Management` should not stay inside `Pre-Sales`
- Global `Document Management` outside Pre-Sales can be reused if needed
- Global `Settings` outside Pre-Sales can be reused if needed
- `MIS` tabs can stay only if they remain useful and non-duplicate

## 2. Current sidebar vs target sidebar

Current `Pre-Sales` section in [Sidebar.tsx](d:/erp%20final/Erp_code/erp_frontend/src/components/Sidebar.tsx):

- `Tender`
- `Tender Result`
- `Analytics`
  - `Company Profile`
  - `Competitors`
  - `Tender Results`
  - `MIS Reports`
  - `Compare Bidders`
  - `Missed Opportunity`
- `Tender Task`
  - `My Tender`
  - `In-Process Tender`
  - `Assigned To Team`
  - `Submitted Tender`
  - `Dropped Tender`
- `Finance Management`
  - `New Request`
  - `Approve Request`
  - `Denied Request`
  - `Completed Request`
- `MIS`
  - `Finance MIS`
  - `Sales MIS`
  - `Login MIS`
- `Document Management`
  - `Document Brief Case`
  - `Folders`
- `Approval's`

## Target `Pre-Sales` sidebar

### Keep

- `Tender`
- `Tender Result`
- `Analytics`
  - `Company Profile`
  - `Competitors`
  - `Compare Bidders`
  - `Missed Opportunity`
- `Tender Task`
  - `My Tender`
  - `In-Process Tender`
  - `Assigned To Team`
  - `Submitted Tender`
  - `Dropped Tender`
- `Finance Management`
  - `New Request`
  - `Approve Request`
  - `Denied Request`
  - `Completed Request`
- `MIS`
  - `Finance MIS`
  - `Sales MIS`
  - `Login MIS`
- `Approvals`

### Remove from Pre-Sales

- `Analytics > Tender Results`
- `Analytics > MIS Reports`
- `Document Management`
  - `Document Brief Case`
  - `Folders`

### Reuse instead of rebuilding

- Global `Document Management`
- Global `Settings`

## 3. Main product idea

The system should behave like this:

`Tender list -> open tender workspace -> prepare bid -> raise finance -> get approvals -> submit bid -> track result -> if won, convert to project`

Most important change:

- Tender work should **not** be spread across too many separate pages
- Each tender should have **one main workspace**
- Subtabs in sidebar should mostly be bucket views or admin/reporting views
- Actual work should happen inside tender detail page

## 4. Simple business understanding

In tendering, the team does not just save a tender and click bid.

A real bid flow is:

1. tender identify karo
2. decide karo bid karna hai ya nahi
3. technical docs ready karo
4. survey / assumptions ready karo
5. BOQ and costing banao
6. finance requirement handle karo (`EMD`, `PBG`, etc.)
7. approval lo
8. final commercial and technical pack freeze karo
9. bid submit karo
10. result track karo
11. won ho to project banao

This means the tender workspace should be the true operating console.

## 5. Target page architecture

## 5.1 Tender list page

Purpose:

- all tenders listing
- filters
- quick create
- quick open workspace

Main actions:

- create tender
- filter tenders
- view status
- open tender workspace

This page already partly exists in:

- [pre-sales/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/page.tsx)
- [pre-sales/tender/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/tender/page.tsx)

We should later consolidate this so there is no confusing duplication.

## 5.2 Tender workspace page

This is the most important page.

Current route:

- [pre-sales/[id]/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/[id]/page.tsx)

This page should become the single-page workspace for one tender.

### Workspace sections on the same page

1. `Overview`
   - tender number
   - title
   - client
   - organization
   - deadline
   - estimated value
   - EMD amount
   - current status
   - current owner
   - linked project if any

2. `Go / No-Go Decision`
   - decision status
   - decision by
   - decision date
   - remarks
   - risk flags

3. `Checklist`
   - mandatory documents
   - internal preparation checklist
   - completion percent

4. `Survey & Scope`
   - linked survey records
   - site assumptions
   - scope notes
   - blockers

5. `BOQ / Technical`
   - BOQ version
   - compliance status
   - deviations
   - OEM/vendor notes

6. `Costing`
   - cost sheet version
   - margin
   - recommended bid value
   - internal approval readiness

7. `Finance Readiness`
   - EMD / PBG / SD requirement
   - finance request status
   - instrument details
   - expiry / bank / amount

8. `Approvals`
   - submitted for approval?
   - pending at whom?
   - approval history
   - rejection reason

9. `Submission`
   - submitted or not
   - submission date/time
   - submitted by
   - submission reference
   - file freeze state

10. `Result`
   - under evaluation / won / lost / cancelled / dropped
   - winner details
   - winning amount
   - result remarks
   - convert to project button if won

### Workspace action buttons

- `Save Draft`
- `Mark Go`
- `Mark No-Go`
- `Assign Owner`
- `Send For Technical Approval`
- `Send For Commercial Approval`
- `Raise Finance Request`
- `Mark Bid Ready`
- `Submit Bid`
- `Mark Under Evaluation`
- `Mark Won`
- `Mark Lost`
- `Mark Dropped`
- `Convert To Project`

## 5.3 Tender Result page

Purpose:

- result master page for all tenders
- post-bid outcome tracking
- winner / amount / stage updates
- direct link back to tender workspace

This page stays separate because user confirmed it should stay.

## 5.4 Tender Task pages

These pages should become filtered operational buckets, not separate business modules.

### My Tender

- tenders owned by current user

### In-Process Tender

- tenders currently being prepared

### Assigned To Team

- tenders currently active in shared team workflow

### Submitted Tender

- already submitted tenders

### Dropped Tender

- dropped / abandoned tenders

Important:

- These pages should only be filtered views over the same tender data
- They should not create parallel workflows

## 5.5 Finance Management pages

These stay separate because finance requests are operationally distinct.

Main use:

- create request
- review request
- approve / deny / complete request

These pages should be linked directly from tender workspace finance section.

## 5.6 Approvals page

This stays.

Purpose:

- approval inbox for `Presales Tendering Head`
- optional visibility to `Director`
- one place to review pending pre-sales approvals

### Approval items should include

- tender go / no-go
- technical bid approval
- commercial bid approval
- finance readiness approval
- submission approval
- result closure confirmation if needed

This page should be queue-based, not document-store based.

## 5.7 Analytics pages

### Keep

- `Company Profile`
- `Competitors`
- `Compare Bidders`
- `Missed Opportunity`

### Remove

- `Tender Results` analytics child
- `MIS Reports` analytics child

Reason:

- `Tender Result` already exists separately
- `MIS` already exists separately
- these are duplicate navigation branches

## 5.8 MIS pages

Keep for now, but treat them as reporting pages only.

### Finance MIS

- finance request reporting

### Sales MIS

- tender ownership / status movement reporting

### Login MIS

- user login audit

If later any of these feel low-value or duplicate, we can remove them after usage validation.

## 6. Target lifecycle states

These should become the authoritative tender statuses.

### Main lifecycle

- `DRAFT`
- `GO_NO_GO_PENDING`
- `NO_GO`
- `QUALIFIED`
- `SURVEY_IN_PROGRESS`
- `TECHNICAL_IN_PROGRESS`
- `COSTING_IN_PROGRESS`
- `FINANCE_PENDING`
- `APPROVAL_PENDING`
- `BID_READY`
- `SUBMITTED`
- `UNDER_EVALUATION`
- `WON`
- `LOST`
- `DROPPED`
- `CANCELLED`
- `CONVERTED_TO_PROJECT`

### Why this set

- simple enough
- maps to real bid cycle
- avoids fake granularity
- still enough for MIS and approvals

## 7. Role-wise operating model

## Presales Executive

- create tender
- update tender basics
- manage checklist
- coordinate survey / BOQ / costing links
- raise finance request
- prepare submission
- update tender status up to approval stages

## Presales Tendering Head

- approve go / no-go
- approve technical readiness
- approve commercial readiness
- approve final bid submission readiness
- view approval queue
- reject back with remarks

## Director

- override where needed
- optional final commercial control
- approve exceptional cases
- convert won tender to project if required

## Finance

- manage EMD / PBG / request completion

## Engineering / Supporting teams

- feed survey / BOQ / costing support into tender workspace

## 8. Backend implementation target

Backend should be orchestrator-first, not page-first.

## 8.0 Reuse-first implementation rule

Before creating anything new, we must audit what already exists.

### Mandatory rule

- first check existing API
- first check existing DocType
- first check existing fields on current DocTypes
- first check if an existing page can be repurposed
- only create new API / DocType / field when there is a real gap

### Why this rule matters

- avoids duplicate business objects
- avoids parallel workflows
- avoids rewriting logic already present in backend
- keeps frontend aligned with real backend capabilities
- reduces migration and permission complexity

### Audit order before implementation

1. existing DocTypes
2. existing backend methods
3. existing route/API wrappers in frontend
4. existing pages/components
5. only then define missing pieces

### Current likely reuse candidates

- `GE Tender`
- `GE Tender Result`
- `GE Tender Checklist`
- `GE Tender Reminder`
- `GE Competitor`
- `GE EMD PBG Instrument`
- existing survey records
- existing BOQ records
- existing cost sheet records
- existing finance request flows
- existing `convert_tender_to_project`

## 8.1 Reuse current backend building blocks

Already present or partially present in:

- [api.py](d:/erp%20final/Erp_code/backend/gov_erp/gov_erp/api.py)

Relevant existing building blocks:

- tender CRUD
- tender stats
- tender result CRUD
- tender checklist
- tender reminders
- competitors
- survey
- BOQ
- cost sheet
- EMD/PBG instrument
- finance request / MIS
- convert tender to project

### Implementation note

Phase 2 must start with a proper inventory table:

- object name
- current purpose
- current API methods
- whether reusable as-is
- whether reusable with extension
- whether new object is required

## 8.2 New backend pieces needed

### 1. Tender workspace state model

Need one consolidated tender workflow state:

- owner
- current_status
- go_no_go_status
- technical_readiness
- commercial_readiness
- finance_readiness
- submission_status
- approval_status
- linked result
- linked project

### 2. Tender approval trail model

Need dedicated approval records:

- linked_tender
- approval_type
- submitted_by
- approver_role
- approver_user
- status
- remarks
- acted_on

### 3. Tender action APIs

Need explicit methods like:

- update tender workspace section
- assign owner
- submit for approval
- approve step
- reject step
- mark bid ready
- submit bid
- mark under evaluation
- mark won / lost / dropped
- fetch approval queue

### 4. Tender detail aggregate API

Need one API to hydrate the single workspace page with:

- tender core data
- checklist
- reminders
- survey summary
- BOQ summary
- cost summary
- finance summary
- approvals
- result summary

Without this, frontend will stay fragmented.

## 8.3 Status transition rules

Must be enforced in backend.

Examples:

- cannot mark `BID_READY` if checklist incomplete
- cannot mark `SUBMITTED` until required approvals complete
- cannot convert to project unless status is `WON`
- cannot mark finance ready if required EMD/PBG missing

## 9. Frontend implementation target

## 9.1 Keep and simplify

Frontend should be reorganized around:

- one clean tender listing page
- one strong tender workspace page
- filtered task views
- standalone result page
- standalone approvals page
- linked finance pages

## 9.2 Frontend pages to remove or de-emphasize

- remove pre-sales document pages from sidebar
- remove duplicate analytics items
- avoid multiple different pages doing the same tender listing job

## 9.3 Tender workspace UI rules

- must be single-page
- section cards, not many nested routes
- each section shows:
  - status
  - key data
  - missing items
  - next action
- right side or top action bar should show current allowed actions

## 10. Implementation roadmap

## Phase 1: Navigation cleanup

Goal:

- make sidebar match final business shape

Tasks:

- [x] remove `Analytics > Tender Results`
- [x] remove `Analytics > MIS Reports`
- [x] remove `Pre-Sales > Document Management`
- [x] keep `Tender Result`
- [x] keep `Approvals`

Output:

- clean non-duplicate `Pre-Sales` sidebar

## Phase 2: Backend workflow foundation

Goal:

- create one tender workflow layer

Tasks:

- [x] audit existing APIs first
- [x] audit existing DocTypes first
- [x] map reuse vs gap
- [x] define final statuses in real backend workflow layer
- [x] add tender workspace state fields if missing
- [x] add approval trail model
- [x] add aggregate workspace API
- [x] add first-pass action APIs for controlled tender status transitions
- [x] add status transition validation

Output:

- backend becomes source of truth

## Phase 3: Tender workspace rebuild

Goal:

- convert current tender detail page into real working console

Tasks:

- [x] rebuild [pre-sales/[id]/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/[id]/page.tsx)
- [x] add all major sections on one page
- [x] wire first-pass action buttons to backend using existing tender update and convert APIs
- [x] show readiness and blockers clearly

Output:

- single tender workspace page usable for daily work

## Phase 4: Task bucket alignment

Goal:

- make `Tender Task` pages pure filtered views

Tasks:

- [x] map each page to backend status filters
- [x] remove fake/disconnected logic
- [x] ensure clicking any row opens same tender workspace

Output:

- one workflow, many filtered views

## Phase 5: Approvals page

Goal:

- create real approval inbox for Presales Head

Tasks:

- [x] build pending approvals list
- [x] show approval type, tender, owner, blockers, remarks
- [x] add approve / reject actions for reusable existing approval objects
- [x] link back to workspace

Output:

- true approval queue

## Phase 6: Result and conversion polish

Goal:

- complete post-submission side

Tasks:

- [x] align `Tender Result` page with tender workspace
- [x] sync evaluation / won state updates in first-pass flow
- [x] add convert-to-project action using existing backend bridge

Output:

- tender lifecycle completed end-to-end

## Phase 7: Optional MIS validation

Goal:

- keep only useful reporting

Tasks:

- review `Finance MIS`, `Sales MIS`, `Login MIS`
- keep if useful
- remove if duplicate / unused

Output:

- only practical reports stay

## 11. Non-goals for this pass

These should not be expanded unless truly needed:

- rebuilding separate pre-sales document repository
- adding too many analytics charts without backend value
- multiple alternative tender detail flows
- heavy settings inside pre-sales if global settings already exist

## 12. Recommended build order

The safest execution order is:

1. sidebar cleanup
2. backend workflow model
3. tender workspace
4. approvals queue
5. task view alignment
6. result integration
7. MIS pruning

This order keeps frontend from becoming fake while backend is still incomplete.

## 13. Final implementation principle

The system should feel like this:

- one tender record
- one main workspace
- one approval chain
- one finance linkage
- one result flow
- one project conversion path

Everything else should be filters, reports, or supporting pages.
