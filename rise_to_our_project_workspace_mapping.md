# RISE To Our Project Workspace Mapping

Date: 2026-03-25

## Purpose

This document maps the `RISE` project page architecture to our current frontend so we can decide:

- what can be ported quickly
- what should be adapted, not copied
- what must stay custom because of our ERP lifecycle

Reference source:

- [RISE Projects Controller](/workspace/development/erp%20for%20technosys/rise-v3.5.3/app/Controllers/Projects.php)
- [RISE Project Details View](/workspace/development/erp%20for%20technosys/rise-v3.5.3/app/Views/projects/details_view.php)
- [RISE Project Overview](/workspace/development/erp%20for%20technosys/rise-v3.5.3/app/Views/projects/overview.php)
- [RISE Project Title Buttons](/workspace/development/erp%20for%20technosys/rise-v3.5.3/app/Views/projects/project_title_buttons.php)

Current frontend reference:

- [WorkspaceShell.tsx](/workspace/development/Erp_code/erp_frontend/src/components/project-workspace/WorkspaceShell.tsx)
- [projects/[id]/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/projects/[id]/page.tsx)
- [ProjectManagerDashboard.tsx](/workspace/development/Erp_code/erp_frontend/src/components/dashboards/ProjectManagerDashboard.tsx)
- [project-manager/inventory/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/inventory/page.tsx)
- [project-manager/petty-cash/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/petty-cash/page.tsx)
- [project-manager/dpr/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/dpr/page.tsx)

## Main Conclusion

RISE is strong as a `project workspace UX reference`.

It is weak as a direct business-lifecycle reference for our ERP.

So the right strategy is:

- borrow project-page structure and interaction patterns from RISE
- keep our own domain logic for survey, BOQ, indent, quotation, vendor comparison, PO, project inventory, I&C, and O&M/SLA

## What RISE Actually Gives Us

From its project page, RISE clearly provides:

- title header
- favorite / star
- reminders
- settings
- actions dropdown
- timer
- overview tab
- task list tab
- task kanban tab
- milestones tab
- gantt tab
- notes tab
- files tab
- comments tab
- timesheets tab
- expenses tab
- optional invoices / payments / contracts / tickets tabs

This is a very useful front-end interaction model for a `project-centric workspace`.

## What Our Current Frontend Gives Us

Our current project workspace is stronger in ERP-specific signals, but weaker in usability consistency.

Shared workspace currently has tabs like:

- `overview`
- `sites`
- `board`
- `milestones`
- `ops`
- `issues`
- `staff`
- `petty_cash`
- `comms`
- `central_status`
- `requests`
- `files`
- `activity`

Relevant route:

- [projects/[id]/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/projects/[id]/page.tsx)

So our app is already better than RISE in business-specific tabs like:

- issues
- staff
- petty cash
- central status
- PH request workflow

But it is worse than RISE in:

- project-centric coherence
- tab familiarity
- user mental model
- general PM usability

## Mapping Table

## 1. Header And Entry Layer

### RISE Feature

- project title
- star / favourite
- reminder button
- settings button
- actions dropdown
- timer

### Our Current State

- project title area exists in shared workspace
- no strong PM-oriented title-action cluster like RISE
- reminders exist elsewhere in the system but not cleanly integrated into the PM project page
- timer pattern does not exist as a project-first interaction in the current PM flow

### Recommendation

`Port fast`

These are mostly UX-shell features and do not require us to copy RISE business logic.

### What To Port

- header action cluster layout
- reminder affordance
- actions dropdown pattern
- title presentation
- favorite/star interaction

### What To Keep Custom

- actions inside dropdown must be controlled by our PM/PH approval model

## 2. Overview Tab

### RISE Feature

Overview includes:

- progress info
- task chart
- total hours
- project members
- project description
- activity panel

### Our Current State

Our `overview` tab in [WorkspaceShell.tsx](/workspace/development/Erp_code/erp_frontend/src/components/project-workspace/WorkspaceShell.tsx) already includes stronger ERP signals:

- DPR summary
- dependency summary
- document expiry
- milestone risk
- action items
- signal summary

### Recommendation

`Adapt, do not copy`

### Why

RISE overview is cleaner visually.
Our overview is better operationally.

### Correct Move

- keep our ERP signal cards
- borrow RISE’s layout hierarchy and readability
- make overview feel less like a debug cockpit and more like a project page

## 3. Tasks List

### RISE Feature

- proper task list
- add task
- batch update
- filters
- search
- labels
- export / print

### Our Current State

This does not exist as a proper PM project tab in our current project workspace.

### Recommendation

`Port fast`

### Why

This is one of the most reusable RISE patterns and aligns with the PM workspace spec.

### Condition

Tasks must remain project-linked and role-controlled.

## 4. Tasks Kanban

### RISE Feature

- task board with To Do / In Progress / Done
- search
- filter
- drag-drop

### Our Current State

We do not currently expose a proper PM kanban experience in the current project workspace.

### Recommendation

`Port fast`

### Why

Kanban is a UX feature more than a domain-model challenge.

This is one of the highest-value frontend lifts from RISE.

## 5. Milestones

### RISE Feature

- simple milestone table
- due date
- title
- progress
- add milestone

### Our Current State

We already have milestone support in [WorkspaceShell.tsx](/workspace/development/Erp_code/erp_frontend/src/components/project-workspace/WorkspaceShell.tsx), and our backend milestone model is more lifecycle-aware than RISE.

### Recommendation

`Adapt, do not copy`

### Why

We should keep our milestone data model and status logic, but make the UI feel simpler and more readable like RISE.

## 6. Gantt

### RISE Feature

- project gantt
- grouped timeline
- filters

### Our Current State

No clean PM gantt page currently exposed as part of the PM workspace runtime.

### Recommendation

`Port later if time allows`

### Why

Useful, but not a day-1 production blocker for traceability/accountability.

If time is limited, this should not be one of the first ports.

## 7. Notes

### RISE Feature

- private notes tab

### Our Current State

No dedicated PM notes tab in the current shared project workspace.

### Recommendation

`Port fast`

### Why

Private notes are simple and very useful for PM.
They also do not interfere with central-team workflow.

## 8. Files

### RISE Feature

- project files tab
- category management
- file listing

### Our Current State

We already have stronger DMS and project-file capability in [WorkspaceShell.tsx](/workspace/development/Erp_code/erp_frontend/src/components/project-workspace/WorkspaceShell.tsx).

### Recommendation

`Adapt, do not copy`

### Why

Our backend file model is more serious than RISE.
But RISE’s file-tab presentation is simpler and more PM-friendly.

### Correct Move

- keep our DMS backend
- borrow RISE’s simpler project-files tab experience

## 9. Comments / Activity

### RISE Feature

- comments tab
- overview-side activity panel

### Our Current State

We already have:

- `activity`
- `comms`
- comments-like history patterns

But these feel fragmented.

### Recommendation

`Adapt`

### Why

RISE’s distinction between:

- comments
- activity

is simple and intuitive.

We should restructure ours to feel that clean, while preserving ERP traceability.

## 10. Timesheets

### RISE Feature

- timesheets tab
- total hours worked widget

### Our Current State

No clean PM project timesheets tab currently exposed in the live PM runtime flow.

### Recommendation

`Port fast if PM needs it now, otherwise defer`

### Why

RISE gives a strong ready-made mental model here.

## 11. Expenses

### RISE Feature

- expense list
- add expense
- attachments

### Our Current State

We currently have `petty cash` more explicitly than a broad PM `expenses` tab.

### Recommendation

`Adapt`

### Why

In our business, PM-side spending should probably be represented as:

- petty cash
- project-side expense / utilization

not a generic free-form expense module copied straight from RISE.

## 12. Project Members / Staff

### RISE Feature

- project members area in overview

### Our Current State

We already have:

- `staff` tab
- project staffing assignment concepts

### Recommendation

`Adapt, do not copy`

### Why

Our staffing problem is more serious and structured than generic RISE project members.

We should keep our staffing model but borrow the presentation pattern.

## 13. Requests / Approvals

### RISE Feature

RISE does not appear to natively model our PM -> PH accountability workflow in the way we need it.

### Our Current State

We already have:

- `requests` tab in shared workspace
- `GE PM Request`
- approval workflow logic

### Recommendation

`Keep custom`

### Why

This is one of the most business-critical custom flows in our ERP.
Do not replace it with RISE behavior.

## 14. Survey / BOQ / Procurement / Project Inventory / DPR

### RISE Feature

Not clearly present as our domain-specific lifecycle.

### Our Current State

These are core custom ERP features for us:

- survey
- BOQ
- indent
- quotation / vendor comparison
- PO
- project inventory
- material consumption
- DPR
- I&C
- O&M / SLA

### Recommendation

`Keep custom`

### Why

These represent our real business lifecycle and must stay grounded in our SRS, not in RISE’s generic project system.

## Fast-Port Bucket

These are the features we can borrow quickly from RISE without damaging business fidelity:

- project page header structure
- favorite / star
- reminders button pattern
- settings button pattern
- actions dropdown pattern
- tasks list
- tasks kanban
- private notes tab
- timesheets tab shell
- general tab hierarchy and project-page pacing

## Adapt Bucket

These should borrow RISE UX but keep our own backend/domain model:

- overview
- milestones
- files
- comments vs activity separation
- project members / staff
- expenses as petty cash / project utilization

## Keep-Custom Bucket

These should stay based on our SRS and backend, not on RISE:

- survey submission
- BOQ / BOM lifecycle
- indent flow
- quotation / 3-vendor comparison
- PO flow
- central GRN vs project receiving separation
- project inventory
- material consumption
- DPR
- PM -> PH request / approval workflow
- I&C lifecycle
- O&M / SLA lifecycle

## Best Use Of RISE

RISE should be used as:

- `frontend project-workspace reference`

It should not be used as:

- `our business-lifecycle source of truth`

## Correct Build Strategy

1. Keep our backend lifecycle models.
2. Rebuild the PM project page using RISE-like project-page ergonomics.
3. Add missing generic PM tabs from RISE:
   - tasks list
   - kanban
   - notes
   - timesheets
4. Restyle our existing custom tabs into the same project-page system:
   - survey
   - project inventory / GRN follow-through
   - petty cash
   - DPR
   - staff
   - requests

## Final Verdict

RISE is good for:

- project page layout
- tab structure
- PM usability
- action/button ergonomics

RISE is not enough for:

- our accountability spine
- our department handoff logic
- our procurement / inventory split
- our I&C / O&M lifecycle

So the right move is:

`copy the shell, not the soul`
