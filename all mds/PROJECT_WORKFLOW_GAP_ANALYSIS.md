# Project Workflow Gap Analysis

## Implementation Update

Status as of 2026-03-17:

- Implementation has started.
- The flow is being built backend-first so future changes remain easy and conflict-safe.
- The main design direction is:
  - central workflow config
  - project-level stage state
  - project-level approval/handoff APIs
  - workflow history trail
  - Project UI wired only against verified backend APIs
- A special access rule is now part of the implementation direction:
  - `Director` always has full flow access
  - `Presales Tendering Head` always has full flow access

Implemented in the current pass:

- Central workflow config added for the Project lifecycle stages
- Project workflow state fields added to the native `Project` spine model
- Project workflow APIs added for:
  - workflow state fetch
  - submit stage
  - approve stage
  - reject stage
  - restart rejected stage
  - override stage
- Project workflow history trail added on the Project record
- Project UI updated with:
  - workflow control panel
  - readiness checklist
  - workflow history feed
  - stage action buttons
- `Presales Tendering Head` visibility/access extended into the Project workspace

Current implementation task focus:

- [x] Read existing permission model, spine model, and project prerequisites
- [x] Define the target project workflow gap clearly
- [x] Start workflow implementation planning in a future-safe structure
- [x] Add centralized workflow config and project-level workflow state fields
- [x] Add backend workflow APIs and stage history tracking
- [x] Align `Director` and `Presales Tendering Head` flow access in backend and frontend workspace visibility
- [x] Wire smooth workflow actions into the Project UI
- [x] Run frontend TypeScript sanity check
- [ ] Run backend runtime smoke checks in bench/site environment
- [ ] Update this note with final implemented behavior

## 1. Requested Business Flow

This is the workflow you described for the system:

1. A tender comes in and is handled by Director / Presales.
2. Presales prepares and submits the bid.
3. If the tender is won, it should convert into a project automatically or through a controlled conversion action.
4. That converted project should appear in the Project section.
5. Projects should also be creatable directly from the Project section without coming from a tender.
6. A Project Manager should manage the project after creation/conversion.
7. The Project Manager should be able to:
   - assign team members
   - assign assets
   - define the current state/stage of the project
   - send the project to the next department for work
8. Department teams should perform their work in their own stage/lane.
9. After department work is completed, Project Manager and Director should be able to approve it.
10. After approval, the project should move to the next stage/department.
11. This cycle should continue until the project is completed and closed.

In simple terms, the desired flow is:

`Tender -> Bid -> Won -> Project -> Department Work -> Approval -> Next Department -> Final Completion`

## 2. Current Implementation Status

## 2.1 What is already implemented well

### Tender to Project conversion

Implemented.

- Backend has `convert_tender_to_project` in `backend/gov_erp/gov_erp/api.py`.
- It only allows conversion when tender status is `WON`.
- It blocks duplicate conversion if `linked_project` already exists.

This means the basic `WON tender -> Project` bridge already exists.

### Direct project creation

Implemented.

- Native ERPNext `Project` is being used.
- Custom project CRUD APIs were added in `backend/gov_erp/gov_erp/api.py`.
- The frontend Project section is already wired to project CRUD.

This means projects can now come from either:

- tender conversion
- direct project creation

### Project management fields / spine fields

Partially implemented and important.

`spine_setup.py` already extends `Project` with fields such as:

- `linked_tender`
- `project_head`
- `project_manager_user`
- `current_project_stage`
- `total_sites`
- `spine_progress_pct`
- `spine_blocked`
- `blocker_summary`

So the data model already supports the idea that a project has:

- a source tender
- a PM / head
- a current stage
- high-level progress / blocking state

### Team member and asset assignment

Implemented.

- `GE Project Team Member` CRUD exists.
- `GE Project Asset` CRUD exists.
- These are already wired into the Project UI.

So PM-led allocation capability is present at basic CRUD level.

### Department/stage visibility foundation

Partially implemented.

Backend has a project spine model in `backend/gov_erp/gov_erp/api.py`:

- `SPINE_STAGES`
- `DEPARTMENT_STAGE_MAP`
- `get_project_spine_list`
- `get_project_spine_summary`
- `advance_site_stage`

Current stage backbone:

1. `SURVEY`
2. `BOQ_DESIGN`
3. `COSTING`
4. `PROCUREMENT`
5. `STORES_DISPATCH`
6. `EXECUTION`
7. `BILLING_PAYMENT`
8. `OM_RMA`
9. `CLOSED`

This is useful because it already matches a large part of the department-driven project lifecycle.

### Department module workflows

Several operational workflows already exist as separate backend modules:

- Survey
- BOQ
- Cost Sheet
- Vendor Comparison / Procurement
- Dispatch Challan / Stores
- Invoice / Billing

Examples of implemented approval endpoints:

- `submit_boq_for_approval`
- `approve_boq`
- `submit_cost_sheet_for_approval`
- `approve_cost_sheet`
- `approve_dispatch_challan`
- `approve_invoice`

So the system already has multiple stage-specific approval concepts.

## 2.2 What is only partially implemented

### Project section as the single operating console

Partially implemented, not complete.

The current Project section supports:

- project CRUD
- team members
- assets
- overview and summary data

But it does not yet act as a true end-to-end workflow controller where PM can smoothly:

- move the project from one department to another
- see all pending approvals by stage
- approve completed stage work from one central project flow
- push the next actionable department automatically

### Current project stage as the true source of truth

Partially implemented, but not fully enforced.

`current_project_stage` exists on Project and `current_site_stage` exists on Site logic, but the overall flow is still fragmented across separate modules.

Right now:

- some progress lives in Survey
- some in BOQ
- some in Cost Sheet
- some in Procurement
- some in Stores
- some in Execution/Site

This means the project stage model exists, but it is not yet the single orchestrator for all module transitions.

### Department handoff after approval

Only partially implemented.

The pieces exist, but the unified behavior does not.

Example:

- BOQ can be approved
- Cost Sheet can be approved
- site stage can be advanced

But there is no clear unified engine that says:

- Survey approved -> project/site moves to BOQ_DESIGN
- BOQ approved -> move to COSTING
- Costing approved -> move to PROCUREMENT
- Procurement approved -> move to STORES_DISPATCH
- Stores completed -> move to EXECUTION
- Execution approved -> move to BILLING_PAYMENT
- Billing done -> move to CLOSED

That exact PM-driven routed workflow is not fully implemented yet.

### PM + Director approval from project workflow

Partially implemented.

Role-based access exists in many places, and Director now has improved Project doctype access, but the approval model is still module-specific rather than a single project workflow approval chain.

So approval exists, but not yet as one smooth project-stage approval experience.

## 2.3 What is missing or not implemented cleanly

### A single project workflow engine

This is the biggest missing piece.

Right now the project lifecycle is not handled by one explicit workflow engine that tracks:

- current owner department
- current stage
- pending approval
- approved by
- approved on
- next stage
- next responsible department

Without that, the flow feels disconnected even though many modules individually exist.

### Stage-to-department handoff action

Missing as a first-class feature.

The PM workflow you described needs an explicit action like:

- `Send to Engineering`
- `Mark Survey Ready for Approval`
- `Approve Survey`
- `Send to Procurement`
- `Approve Procurement Stage`
- `Move to Execution`

Current implementation has some approval APIs, but not a clean project-level handoff command set.

### Unified stage completion criteria

Missing / inconsistent.

For your desired flow, every stage should have rules like:

- Survey stage complete only when all required survey/site records are complete
- BOQ stage complete only when BOQ is approved
- Costing stage complete only when cost sheet is approved
- Procurement stage complete only when required procurement milestone is approved
- Execution stage complete only when required site execution/milestones are approved

At present this is fragmented.

### Project-level approval trail

Missing as a dedicated feature.

For smooth management, the project should carry a visible approval history:

- which stage was submitted
- who approved / rejected
- when
- remarks
- what moved next

This is not currently modeled as a central project workflow audit trail.

### Full PM/Director orchestration dashboard

Missing.

The current Project page is better than before, but it is still not a complete workflow cockpit for:

- pending department actions
- pending approvals
- blockers by stage
- next recommended action
- completion readiness

## 3. Important Reality Check from Current Backend

There is one especially important implementation gap:

### Survey gate exists conceptually, but project flow is not fully enforced centrally

`check_survey_complete` exists in API layer, and BOQ DocType logic also enforces survey gate during status transition to `PENDING_APPROVAL`.

That means the rule exists, but it is still operating at the BOQ document level, not as part of one unified project workflow orchestrator.

So the backend has good business rules in places, but not yet one complete project life-cycle controller.

## 4. How much of your desired flow is implemented today

Approximate status:

- Tender handling by Presales: mostly implemented
- Tender won to Project conversion: implemented
- Direct Project creation: implemented
- Team member / asset allocation inside project: implemented
- Project manager field and stage field on Project: implemented
- Department-wise stage model: partially implemented
- Individual module approvals: partially to mostly implemented
- One smooth project-driven handoff + approval chain: not fully implemented
- One central Project section controlling full lifecycle: not fully implemented

Overall assessment:

The system has strong building blocks, but your exact workflow is only partially implemented end-to-end.

The data model and several operational modules already exist.
What is still missing is the orchestration layer that makes all those modules behave like one smooth project journey.

## 5. What changes would be needed to build your desired flow

No code changes are being done in this note. This is only the implementation plan/gap definition.

## 5.1 Backend changes needed

### 1. Define one authoritative project workflow map

Need one backend mapping such as:

- `SURVEY -> BOQ_DESIGN -> COSTING -> PROCUREMENT -> STORES_DISPATCH -> EXECUTION -> BILLING_PAYMENT -> CLOSED`

For each stage, define:

- owner department
- required records
- submit action
- approve action
- reject action
- next stage

### 2. Add project workflow transition APIs

Need explicit APIs such as:

- submit current stage
- approve current stage
- reject current stage
- send to next department
- get project workflow state
- get project approval history

These should be project-level APIs, not only document-level APIs.

### 3. Add central stage validation rules

Before stage advancement, backend should verify all required conditions.

Examples:

- Survey cannot complete unless required site surveys are completed
- BOQ stage cannot complete unless BOQ is approved
- Procurement cannot complete unless comparison / purchase process conditions are satisfied
- Execution cannot complete unless required site milestones are complete

### 4. Add workflow audit trail

Need a project-linked history model for:

- stage submitted
- actor
- action
- decision
- remarks
- timestamps

### 5. Normalize approval authority

Need a clear rule table for:

- who can work
- who can submit
- who can approve
- who can override

Especially for:

- Director
- Project Manager
- Project Head
- Department Head

## 5.2 Frontend changes needed

Once backend orchestration exists, Project section should be redesigned around workflow control.

### Project screen should become workflow-first

Useful sections would be:

1. Project overview
2. Current stage card
3. Current owner department
4. Pending approvals
5. Next action buttons
6. Stage history / approval trail
7. Team members
8. Assets
9. Site progress / blockers

### Buttons should be stage-aware

Examples:

- `Assign Team`
- `Assign Assets`
- `Send to Engineering`
- `Submit Survey for Approval`
- `Approve Survey`
- `Move to BOQ`
- `Send to Procurement`
- `Approve Procurement`
- `Mark Execution Complete`
- `Close Project`

### Unnecessary static or backend-less sections

Any Project UI blocks that do not have real backend support should either:

- be removed
- be hidden
- or be commented out until backend exists

That matches your instruction that fake/static sections should not stay in the UI.

## 6. Recommended Target Flow

This is the cleanest version of the flow you described:

### Entry paths

Path A:

`Tender -> WON -> Convert to Project`

Path B:

`Direct New Project -> Project Section`

### Common project lifecycle

1. Project created
2. PM assigned
3. Team members and assets assigned
4. Project starts at `SURVEY`
5. PM sends to owning department
6. Department completes work
7. PM / Director / authorized approver approves
8. Backend advances project/site to next stage
9. Repeat until final closure

### Closure

Final states should be explicit:

- execution completed
- billing/payment closed
- project closed

## 7. Final Conclusion

Your desired workflow is valid and it aligns well with the current project spine direction already present in backend.

But today the system is in this state:

- building blocks exist
- project CRUD exists
- tender conversion exists
- team/assets exist
- stage model exists
- many approval modules exist

However:

- one unified project orchestration workflow is still not fully built
- department handoff is not smooth enough yet
- PM/Director stage approval from the Project section is not yet complete
- Project section is not yet the single source of operational truth

So the right next step, when you decide to allow edits, would be:

1. finalize the exact stage-by-stage workflow contract
2. implement backend project workflow orchestration
3. then rebuild the Project section around that backend

That order will avoid frontend randomness and make the Project section actually smooth and reliable.
