# PM Side Transfer Matrix

## Purpose

This document defines what should move into the **Project Manager (PM) side** of the ERP and what must remain with the **Project Head (PH)** or **central specialist teams**.

The goal is to avoid a wrong architecture where PM gets full ownership of procurement, BOQ, finance, or engineering processing. PM is the **project-level coordinator and field truth owner**, not the owner of every specialist workflow.

---

## Operating Model

- **PM side** = project coordination, field inputs, follow-up, visibility, escalation, requests
- **PH side** = governance, approvals, deadline control, exception handling across projects
- **Central teams** = specialist processing and transactional control

Central teams include:

- Engineering
- Procurement
- Finance / Accounts
- I&C / Execution specialists
- HR / Admin support

---

## What Must Transfer To PM Side

These are the capabilities and records PM should directly create, update, or manage.

### 1. Project Coordination Layer

- Project overview
- Project status updates
- Milestone progress updates
- Site-wise progress summary
- Blocker / issue tracking
- Client communication log
- Internal follow-up notes
- Reminder / action tracker
- Project activity feed

### 2. Field Input Submission Layer

- Survey submission pack
- Site readiness report
- Field observations
- Execution progress updates
- Snag / pending-point report
- Material requirement signal
- Dispatch urgency note
- Completion readiness note

### 3. PM-Controlled Resource Layer

- Staff / manpower visibility
- Staff assignment request
- Staff shortage escalation
- Petty cash request
- Petty cash utilization summary
- Local project files and evidence uploads

### 4. PM-to-PH Approval Layer

- Timeline extension request
- Milestone delay justification
- Deadline revision request
- Extra manpower request requiring PH intervention
- High-value petty cash / exception request
- Hold recommendation
- Escalation memo

---

## Documents PM Should Submit

These are the practical documents or structured records PM should be able to submit from the PM workspace.

| Document / Record | Submitted To | Purpose |
|---|---|---|
| Project initiation pack | PH / central team | Start project with baseline facts |
| Survey submission pack | Engineering / PH | Give field input for BOQ and design |
| Requirement clarification note | Engineering / PH | Resolve client-side ambiguity |
| Site readiness report | I&C / PH | Confirm site is ready or blocked |
| Issue / blocker report | PH / relevant team | Escalate dependency or risk |
| Milestone update note | PH | Report progress against plan |
| Timeline extension request | PH | Ask for revised deadline with written reason |
| Staffing request | HR / PH | Ask for manpower support |
| Petty cash request | PH / Finance | Request local execution cash |
| Petty cash utilization summary | PH / Finance | Report usage with support docs |
| Material requirement / dispatch follow-up | Procurement / I&C | Signal project demand and urgency |
| Client communication summary | PH / central team | Preserve commitments and decisions |
| Variation / change request note | PH / Engineering / Finance | Capture scope or field reality changes |
| Execution progress report | PH / I&C | Share field progress and blockers |
| Completion / signoff readiness note | PH / I&C | Trigger final stage actions |

---

## What PM Should See But Not Own

These items should be visible inside PM workspace as **status slices** or **read-only / limited-action views**, not as full operational modules.

### Engineering Slice

- Survey review status
- BOQ preparation status
- Drawing preparation status
- Latest approved drawing
- Design clarification status

### Procurement Slice

- Vendor comparison status
- Approval pending status
- PO issued / not issued
- Material dispatch status
- GRN status

### Finance Slice

- Billing milestone status
- Invoice status summary
- Client payment milestone status
- Collection follow-up status
- Petty cash approval status

### I&C / Execution Slice

- Site execution status
- Installation progress
- Commissioning readiness
- Test report status
- Signoff status

### HR / Admin Slice

- Assigned manpower summary
- Attendance / presence snapshot
- Replacement / shortage status

---

## What Must Stay With Central Teams

These should **not** be transferred to PM ownership.

### Engineering-Owned

- BOQ creation
- Design preparation
- Drawing authoring
- Technical design revisions

### Procurement-Owned

- Vendor comparison processing
- Supplier negotiation workflow
- Purchase Order creation
- GRN transaction ownership
- Store reconciliation logic

### Finance-Owned

- Invoice generation
- Receipt posting
- Customer statement control
- Receivable aging ownership
- Bookkeeping / accounting entries

### I&C Specialist-Owned

- Specialist commissioning records
- Final technical test logic
- Deep device / network technical control

### PH-Owned

- Deadline setting
- Timeline approval / rejection
- Cross-project governance
- Exception approvals
- Hold / cancel / completion governance

---

## What PH Must Approve

These actions should flow upward from PM to PH.

- Timeline extension
- Milestone deadline change
- Project delay justification acceptance
- High-value petty cash exception
- Non-standard manpower escalation
- Hold / pause recommendation
- Major project exception
- Final project closure recommendation where policy requires PH sign-off

---

## PM Workspace Should Contain

The PM-facing workspace should contain these sections or tabs.

- Overview
- Milestones
- Issues / Blockers
- Staff
- Petty Cash
- Files
- Communications
- Activity
- Central Team Status
- Requests / Approvals

Optional later additions:

- Timesheets
- Private notes
- Task list if team wants PM-level task coordination

---

## PM Workspace Should Not Become

The PM workspace should not become:

- a full procurement desk
- a full engineering desk
- a bookkeeping desk
- a store / GRN control room
- a duplicate of every department module

PM needs **coordination power**, not **full transactional ownership** of all specialist functions.

---

## Implementation Rule

When deciding whether something belongs on PM side, use this rule:

- If it is a **field input, status update, request, escalation, follow-up, or project coordination artifact**, it belongs on PM side.
- If it is a **specialist transactional process, technical preparation workflow, or accounting control function**, it stays with central teams.
- If it changes **deadline, exception policy, or project-level approval state**, it belongs to PH.

---

## Recommended Build Sequence

1. Build PM overview + issue + milestone + communications + activity layer
2. Add staff tab and petty cash tab to PM workspace
3. Add request flows for extension, staffing, and petty cash
4. Add status slices from engineering, procurement, finance, and I&C
5. Add PH approval integration on top of PM-submitted records

---

## Final Position

PM side should become the **project coordination cockpit**.

It should capture:

- field truth
- project follow-up
- escalation
- approvals requested upward
- status visibility from central teams

It should not replace the central specialist modules.
