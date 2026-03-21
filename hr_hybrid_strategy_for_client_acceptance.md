# HR Hybrid Strategy For Client Acceptance

Last updated: 2026-03-21

## Purpose

This document tells Opus exactly how to approach the HR module now that ANDA alignment and DMS are in a stable state.

The goal is not to clone greytHR blindly.

The goal is to reduce client resistance by making the familiar HR surfaces feel close to greytHR, while preserving the original ERP strengths that are more operationally useful than a generic HR SaaS.

In simple terms:

- copy what users already expect from greytHR
- keep what already makes this ERP better for project and field operations
- do not destroy working custom flows just to mimic another product

## Strategic Rule

Use greytHR as the UX reference for `people administration`.

Keep the existing ERP as the system of differentiation for `project-linked operations`.

That means:

- employee admin should feel familiar
- leave and attendance should feel familiar
- approval inboxes should feel familiar
- reporting entry points should feel familiar
- project-linked manpower, travel, field visits, document control, and cross-module workflow should remain original

This is the best path to make the client comfortable without flattening the ERP into a commodity HR clone.

## Current Reality

The current HR module is real, but narrow.

The implemented surfaces in the repo today are centered around:

- onboarding workflow
- attendance logs
- travel logs
- overtime workflow
- statutory ledger tracking
- technician visit logs
- compact HR dashboard

Relevant source anchors:

- HR dashboard and workspace: `erp_frontend/src/app/hr/page.tsx`
- onboarding workspace: `erp_frontend/src/app/hr/onboarding/page.tsx`
- attendance workspace: `erp_frontend/src/app/hr/attendance/page.tsx`
- overtime workspace: `erp_frontend/src/app/hr/overtime/page.tsx`
- travel workspace: `erp_frontend/src/app/hr/travel-logs/page.tsx`
- technician visits: `erp_frontend/src/app/hr/technician-visits/page.tsx`
- backend HR model direction: `backend_hr_plan.md`

This means the ERP already has an HR operations core, but it does not yet have a greytHR-style employee administration layer.

## What To Borrow From greytHR

These are the areas where copying the structure and interaction pattern is a good idea because users already recognize them.

### 1. Employee Directory

Build a clean searchable employee list similar to greytHR.

Recommended features:

- active / inactive filters
- search by employee ID, name, phone, designation, location
- quick status chips
- quick open into profile
- payroll month or reporting period context only if it becomes meaningful later

Reason:

This is one of the first things HR users expect. If this feels familiar, trust rises immediately.

### 2. Employee Profile Tabs

Adopt a greytHR-like profile structure.

Recommended tabs:

- Personal
- Employment
- Bank / PF / ESI
- Family
- Education
- Experience
- Documents
- Contracts
- Separation

Reason:

This is where client expectation is strongest. They want to feel that employee data is organized the way they already think about it.

### 3. Onboarding Form Experience

Keep the current onboarding workflow engine, but reshape the UI to feel closer to greytHR.

Recommended improvements:

- sectioned form layout
- progress or checklist feel
- mandatory field clarity
- document checklist visibility
- clearer draft to review to approved movement

Reason:

The workflow logic already exists. The biggest win is familiarity and clarity, not a backend rewrite.

### 4. Leave And Attendance UX

Borrow greytHR’s entry-point structure for leave and attendance.

Recommended surfaces:

- Leave Calendar
- Who Is In
- Employee Leave Records
- Employee Swipes
- Attendance Muster
- Attendance Regularization queue
- Holiday List / Leave Policy admin

Reason:

Attendance alone is not enough. Users mentally group these features together.

### 5. Workflow Inbox Pattern

Adopt greytHR’s simple approval framing:

- Pending
- Completed
- filter by workflow type
- clear action owner and age

Use this pattern for:

- onboarding approval
- leave approval
- attendance regularization approval
- overtime approval
- travel approval where applicable

Reason:

Users complain less when approval work is easy to scan and familiar.

### 6. Reports Gallery Pattern

Borrow greytHR’s report-discovery model, not necessarily every report itself.

Recommended features:

- categorized HR reports gallery
- favorites
- export actions
- simple report metadata
- filter by state / location / business unit where relevant

Reason:

Users often judge “system maturity” by whether reporting feels discoverable and official.

## What Must Stay Original

These are the parts that should not be flattened into greytHR patterns because they are custom strengths tied to the actual business model.

### 1. Project-Linked HR

Keep:

- project staffing context
- site linkage
- project assignment history
- manpower views that align with execution stages

Do not reduce this to a generic employee-only HR system.

### 2. Technician Visit Tracking

Keep the current ERP-first concept of field technician movement and visit status.

This is not standard greytHR functionality and should remain a custom operational capability.

### 3. Travel Logs With Operational Context

Keep travel tied to operational reality, not just HR reimbursement logic.

Travel should continue to connect cleanly with projects, sites, field movement, and approvals.

### 4. Site-Linked Attendance

Do not lose the ability to capture attendance against sites or projects.

greytHR-style attendance familiarity is good, but site-linked attendance is important for actual operations.

### 5. DMS And HR Document Governance

Keep the DMS as a broader ERP capability.

HR documents can consume the same controlled document system, but HR should not become a separate siloed attachment world.

### 6. Cross-Module ERP Workflow

Keep the existing integrated ERP behavior where HR actions can relate to projects, execution, approvals, and compliance rather than living in a completely isolated HR island.

## Hybrid Model To Build

The target is a two-layer HR system:

### Layer A: Familiar HR Admin Layer

This should look and feel greytHR-like.

Scope:

- employee directory
- employee profile
- onboarding UI
- leave UI
- attendance admin UI
- approval inbox
- HR reports gallery

### Layer B: Operational ERP Layer

This should stay original.

Scope:

- technician visits
- travel logs
- site attendance
- project staffing
- statutory and compliance tie-ins
- DMS-backed employee documents
- project and execution integration

### Integration Rule

Layer A should feed Layer B, not replace it.

Examples:

- employee master feeds travel and overtime
- leave and attendance states inform project staffing visibility
- employee documents use the DMS backbone
- profile data is reusable by project manpower views

## Recommended Execution Order

This is the recommended implementation sequence for Opus.

## Phase 1: Employee Admin Foundation

Build the client-facing HR baseline first.

Implement:

- employee directory
- employee profile shell with tabs
- employee master CRUD alignment using built-in `Employee` where possible
- statutory fields on employee
- family, education, experience, bank, and document blocks

Done means:

- HR users can search, open, and maintain employee records in a familiar way

## Phase 2: Onboarding Upgrade

Do not rewrite the onboarding engine.

Implement:

- greytHR-like form layout
- document checklist
- clearer review states
- employee mapping visibility
- onboarding to employee sync hardening

Done means:

- current onboarding logic remains intact but feels enterprise-ready and familiar

## Phase 3: Leave And Attendance

This is likely the loudest client gap after employee master.

Implement:

- leave application
- leave balance and leave type setup
- holiday list
- leave calendar
- who is in
- attendance muster
- employee swipes ingestion or placeholder interface if device integration is pending
- attendance regularization flow

Done means:

- the ERP stops feeling “attendance-only” and starts feeling like a real HR platform

## Phase 4: Workflow Inbox

Unify HR approvals into one clean work queue.

Implement:

- pending and completed tabs
- filter by request type
- age tracking
- action owner visibility
- approval and rejection with remarks

Apply to:

- onboarding
- leave
- regularization
- overtime
- travel

Done means:

- managers can work approvals the way they expect from greytHR

## Phase 5: Reports Gallery

Do not attempt every report at once.

Start with high-value HR reports:

- employee master export
- PF / ESI summary
- leave balance report
- attendance muster export
- overtime summary
- travel summary
- onboarding status report

Format goals:

- PDF
- XLS / XLSX

Done means:

- HR reporting feels credible and usable in day-to-day operations

## Phase 6: Original ERP Strengthening

After the familiarity layer is in place, deepen the operational layer.

Implement or refine:

- project staffing views
- site-linked attendance analysis
- technician deployment visibility
- travel linked to project and site
- HR document governance through DMS
- compliance dashboards tied to operations

Done means:

- the ERP remains stronger than greytHR in field and execution workflows

## What Opus Must Not Do

- do not clone greytHR module for module without business reasoning
- do not remove project or site linkage from HR records
- do not replace technician visit tracking with generic attendance logic
- do not create duplicate document systems outside DMS
- do not force payroll-first architecture before employee and leave basics are stable
- do not redesign working backend workflows if a UI reshaping will achieve the user goal

## Acceptance Criteria

The hybrid HR strategy should be considered successful when all of the following are true:

1. HR users immediately recognize the employee and leave surfaces as familiar.
2. The client stops asking why basic greytHR-style HR functions are missing.
3. Project and site-linked HR operations remain intact.
4. Field workflows still work better than they would in a generic HR product.
5. DMS remains the system of record for employee document governance.
6. The approval experience becomes simpler and more obvious.
7. Reporting feels like a real product surface, not an afterthought.

## Client-Facing Narrative

If the client asks why the ERP does not exactly match greytHR, the internal answer should be:

- we adopted the greytHR patterns where they improve familiarity
- we kept the ERP-specific workflows where the business needs deeper operational control
- the result is a system that feels familiar for HR users but is better aligned to project execution

This is the narrative that reduces objections without weakening the product.

## Immediate Next Build Recommendation

If only one HR block is started next, start here:

1. Employee Directory
2. Employee Profile Tabs
3. Leave And Attendance module shell
4. HR Approval Inbox

This sequence will remove the biggest “this does not feel like HR software” complaints fastest.

## Suggested File Name For Follow-On Execution Tracker

If Opus starts implementation, create a companion tracker:

- `hr_hybrid_execution_tracker.md`

That tracker should convert this strategy into:

- concrete backend tasks
- frontend tasks
- DocTypes touched
- APIs touched
- test coverage needed
- UAT checklist

