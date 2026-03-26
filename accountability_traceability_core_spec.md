# Accountability And Traceability Core Spec

Date: 2026-03-24

## Purpose

This document defines the real backbone the ERP should enforce:

`every important movement from tender to project closure must be traceable to its root document, owner, receiver, due date, blocker, approval, and closure`

The business problem this solves is simple:

- departments redirect blame to each other
- ownership becomes verbal instead of written
- leadership cannot see where a delay actually started

So this ERP must become a system where accountability cannot be blurred.

## Core Rule

Every major business handoff must create a written record with:

- `root_reference`
- `stage`
- `submitted_by`
- `submitted_on`
- `current_owner`
- `assigned_to`
- `accepted_by`
- `accepted_on`
- `due_date`
- `status`
- `blocking_reason`
- `escalated_to`
- `approved_by`
- `closure_note`
- `closed_on`

If any one of these is missing, traceability is incomplete.

## Root Principle

The ERP should not be thought of mainly as:

- modules
- pages
- CRUD screens

It should be thought of as:

- handoffs
- accountability ownership
- audit trail
- exception control

## Accountability Objects

The system should treat these as first-class written objects:

- `Submission`
- `Assignment`
- `Acceptance`
- `Review`
- `Approval`
- `Escalation`
- `Blocker`
- `Closure`

Every department interaction should resolve into one or more of these.

## End-To-End Lifecycle

The lifecycle should be traceable across these stages:

1. Tender / Lead Intake
2. Bid Qualification
3. Bid Submission
4. Bid Win / LOI / Work Order
5. Project Conversion
6. Pre-Survey Planning
7. Survey Submission
8. Engineering Review
9. BOQ Preparation
10. Drawing / Technical Release
11. Procurement Request
12. Vendor Comparison / PO / Procurement Processing
13. Dispatch / GRN / Project Receiving
14. Project Inventory / Material Consumption
15. Execution / Installation / Commissioning
16. DPR / Issue / Escalation Control
17. Billing / Commercial / Financial Closure Inputs
18. Project Completion / Closure

## Golden Question

At any stage, leadership should be able to ask:

`Why is this delayed, who owns it right now, and where did the delay originate?`

The ERP must answer this without relying on verbal explanation.

## Roles In The Chain

## Director

Needs:

- root-cause visibility across departments
- delay origin visibility
- approval and escalation history
- accountability map by person and department

## Project Head

Needs:

- multi-project governance
- deadline control
- written inter-department accountability
- review of PM escalations
- approval of exceptions

## Project Manager

Needs:

- project-side coordination
- written submissions upward and sideways
- clarity on which department currently owns the next action
- ability to escalate with evidence

## Central Teams

### Engineering

Own:

- survey review
- BOQ preparation
- technical clarification
- drawings / deviations / engineering release

### Procurement

Own:

- vendor comparison
- sourcing
- PO processing
- delivery coordination

### Stores / Inventory

Own:

- central GRN
- stock truth
- warehouse movement

### Execution / I&C

Own:

- site execution
- installation readiness
- commissioning
- test reports / signoff evidence

### Finance / Accounts

Own:

- billing triggers
- customer statement / receipts
- petty cash approvals above threshold
- financial closure inputs

## Stage-Wise Accountability Spine

## Stage 1: Tender / Opportunity Intake

### Trigger

A tender, lead, or opportunity is identified.

### Root Document

- `Tender Record`

### Mandatory Written Fields

- opportunity / tender id
- source
- customer
- region / project area
- bid deadline
- captured by
- reviewed by
- qualification decision

### Ownership

- `Presales Executive` submits
- `Presales Tendering Head` reviews
- `Director / leadership` optionally approves go / no-go

### Traceability Goal

Leadership should always know:

- who picked the opportunity
- who qualified it
- why it was pursued or dropped

## Stage 2: Bid Qualification

### Root Document

- `Bid Qualification Note`

### Mandatory Fields

- tender reference
- qualification checklist
- risk note
- dependencies
- missing documents
- bid/no-bid recommendation
- decision owner

### Ownership

- Presales prepares
- leadership approves or rejects

### Accountability Rule

No bid should proceed without a written qualification decision.

## Stage 3: Bid Submission

### Root Document

- `Bid Submission Pack`

### Mandatory Fields

- tender reference
- bid version
- commercial owner
- technical owner
- submission timestamp
- final approval by
- deviations / assumptions

### Accountability Rule

System must show:

- who finalized the bid
- who approved the final submission
- what assumptions were submitted

## Stage 4: Bid Win / LOI / Work Order

### Root Document

- `Bid Outcome Record`

### Mandatory Fields

- tender reference
- won / lost / cancelled
- reason
- LOI / WO attachment
- transition owner

### Accountability Rule

If won, the ERP must create the bridge into project conversion.

## Stage 5: Project Conversion

### Root Document

- `Project Conversion Record`

### Mandatory Fields

- originating tender / bid
- work order number
- project code
- client
- project head
- project manager
- initial start date
- initial target completion
- initial department owners

### Accountability Rule

Project conversion must create the first written chain of:

- who governs
- who coordinates
- which department owns which first action

## Stage 6: Pre-Survey Planning

### Root Document

- `Survey Planning Request`

### Mandatory Fields

- project
- sites in scope
- survey deadline
- PM
- engineering contact
- dependencies before survey

### Ownership

- PM raises
- Engineering accepts

### Accountability Rule

The system must record when Engineering accepted survey responsibility.

## Stage 7: Survey Submission

### Root Document

- `Survey Submission Pack`

### Mandatory Fields

- project
- site
- survey date
- survey submitted by
- site readiness observations
- photos / attachments
- constraints
- assumptions
- PM remarks

### Ownership

- PM submits
- Engineering receives and accepts or rejects

### Accountability Rule

The system must distinguish:

- survey submitted
- survey accepted
- survey rejected / incomplete

This is where a lot of blame-shifting starts, so acceptance must be explicit.

## Stage 8: Engineering Review

### Root Document

- `Engineering Review Note`

### Mandatory Fields

- survey reference
- accepted / rejected
- engineering reviewer
- clarification required
- due date for resubmission if rejected

### Accountability Rule

Every survey must show:

- whether Engineering accepted it
- when they accepted it
- whether delay is now on PM side or Engineering side

## Stage 9: BOQ Preparation

### Root Document

- `BOQ Preparation Assignment`
- `BOQ Release Note`

### Mandatory Fields

- project
- site / package
- engineer owner
- assigned on
- due date
- boq version
- assumptions
- revision count
- release note

### Ownership

- Engineering Head / assigned engineer owns
- PM reviews assumptions affecting execution reality

### Accountability Rule

Leadership must see:

- who owns BOQ right now
- when it became due
- whether BOQ delay originates in late survey, engineering delay, or clarification delay

## Stage 10: Drawing / Technical Release

### Root Document

- `Drawing Release Note`
- `Technical Clarification Record`
- `Deviation Record`

### Mandatory Fields

- drawing / technical pack reference
- version
- prepared by
- reviewed by
- released on
- applicable sites / packages
- dependency on BOQ or survey

### Accountability Rule

Execution and Procurement should not proceed on verbal technical readiness.

The ERP must show the released version and its owner.

## Stage 11: Procurement Request

### Root Document

- `Procurement Action Request`

### Mandatory Fields

- project
- boq reference
- material package
- required by date
- requested by
- procurement owner
- urgency
- notes

### Ownership

- PM or Engineering raises the request as per policy
- Procurement accepts ownership

### Accountability Rule

Procurement delay must be traceable to:

- late request
- incomplete BOQ
- sourcing delay
- approval delay

## Stage 12: Vendor Comparison / PO / Procurement Processing

### Root Documents

- `Vendor Comparison`
- `Procurement Recommendation`
- `PO Record`

### Mandatory Fields

- request reference
- procurement owner
- comparison completed on
- recommendation note
- approval owner
- PO issued on
- supplier commitment date

### Accountability Rule

The ERP must show whether the bottleneck is:

- no vendor comparison yet
- comparison pending approval
- PO not issued
- supplier delayed

## Stage 13: Dispatch / Central GRN / Project Receiving

This stage must be split into two truths.

### 13A. Central GRN

Root document:

- `Central GRN / Purchase Receipt`

Ownership:

- Stores / Procurement / HQ inventory

Purpose:

- central stock truth
- warehouse receipt truth

### 13B. Project Receiving Confirmation

Root document:

- `Project Receiving Confirmation`

Ownership:

- Project Manager

Purpose:

- confirm material actually reached project / site
- record shortages / damages / mismatch
- feed project inventory

### Mandatory Fields For Project Receiving

- project
- site
- linked dispatch / GRN
- received by
- received on
- qty expected
- qty received
- shortage / damage note
- receipt evidence

### Accountability Rule

This is one of the most important distinctions in the whole ERP:

- `central inventory truth` is not the same as
- `project-side material truth`

## Stage 14: Project Inventory / Material Consumption

### Root Documents

- `Project Inventory Record`
- `Material Consumption Report`

### Ownership

- PM owns project-side inventory truth
- PM reports consumption upward
- HQ inventory remains separate

### Mandatory Fields

#### Project Inventory

- project
- site optional
- item
- received qty
- consumed qty
- balance qty
- last receipt reference

#### Material Consumption Report

- project
- site
- report date
- item
- consumed qty
- reason / usage context
- submitted by
- submitted to

### Accountability Rule

Leadership must be able to see:

- what was received centrally
- what was received on project
- what remains on project
- what was consumed
- who reported consumption

## Stage 15: Execution / Installation / Commissioning

### Root Documents

- `Execution Readiness Note`
- `Installation Progress Record`
- `Commissioning Checklist`
- `Test Report`
- `Client Signoff`

### Ownership

- PM coordinates
- Execution / I&C performs functional execution actions
- PH reviews exceptions

### Mandatory Fields

- project
- site
- milestone / package
- execution owner
- dependencies satisfied or not
- blockers
- readiness decision
- evidence attachments

### Accountability Rule

Execution cannot remain a vague status.

The ERP must show:

- who said site was ready
- who said it was blocked
- what blocked it
- since when

## Stage 16: DPR / Issue / Escalation Control

### Root Documents

- `DPR`
- `Issue Log`
- `Escalation Memo`
- `Extension Request`

### Ownership

- PM submits
- PH reviews
- concerned department responds

### Mandatory Fields

- project
- site
- report / issue date
- owner at time of issue
- blocker reason
- next action expected from
- due date
- escalated to
- decision

### Accountability Rule

This is where root-cause tracking must become obvious.

For every delay, the ERP should show:

- original due date
- first missed owner
- subsequent escalations
- final approving authority

## Stage 17: Billing / Commercial / Financial Closure Inputs

### Root Documents

- `Billing Trigger Note`
- `Client Payment Milestone Record`
- `Receipt / Follow-up Record`
- `Retention / Penalty Record`

### Ownership

- Finance / Accounts owns the financial truth
- PM supplies project-side billing trigger confirmations where required
- PH reviews major exceptions

### Accountability Rule

Commercial delay must be traceable to:

- execution not complete
- signoff not received
- billing not triggered
- collection pending

## Stage 18: Project Completion / Closure

### Root Documents

- `Project Closure Checklist`
- `Completion Recommendation`
- `Closure Approval`

### Mandatory Fields

- project
- completion status
- pending snags
- material reconciliation
- financial closure status
- final documents delivered
- recommended by
- approved by
- closed on

### Accountability Rule

Project closure must not be a verbal declaration.

The ERP must show:

- who recommended closure
- who approved closure
- what remained open at closure

## Root Traceability Matrix

Every record in the chain should be able to trace backward to its root.

Example chain:

`Tender -> Bid Qualification -> Bid Submission -> LOI/WO -> Project Conversion -> Survey Submission -> Engineering Review -> BOQ Release -> Procurement Request -> PO / Dispatch -> Project Receiving -> Project Inventory -> Consumption / DPR -> Execution / Commissioning -> Billing Trigger -> Closure`

If the system cannot walk this chain backward, it has failed the traceability requirement.

## Mandatory Cross-Cutting Fields

These fields should exist directly or derivably across the chain:

- `root_tender`
- `root_bid`
- `root_project`
- `linked_site`
- `source_document_type`
- `source_document_name`
- `owner_role`
- `owner_user`
- `receiver_role`
- `receiver_user`
- `accepted_on`
- `due_date`
- `status`
- `delay_reason`
- `escalation_level`
- `final_decision_by`

## Accountability Dashboard Requirements

Leadership dashboards should not just show counts.

They should show:

- items overdue by department
- items overdue by owner
- oldest unaccepted handoffs
- oldest blocked submissions
- projects with repeated extension requests
- which stage causes most slippage
- root-stage origin of current delays

## What Must Become Impossible

The ERP should make these excuses impossible:

- `I thought they were handling it`
- `it was already sent verbally`
- `we were waiting on another team`
- `nobody assigned it to me`
- `I did not accept this work`
- `the delay started before it came to us`

All of those should be provable or disprovable in the system.

## Final Product Rule

The frontend, backend, and data model should all obey this rule:

`No important cross-department movement should happen without a written owner-to-owner handoff and traceable audit trail.`

## Final Verdict

This ERP should be redesigned around:

- written accountability
- root-cause traceability
- explicit ownership transitions
- inter-department handoff records

not merely around:

- module screens
- dashboards
- CRUD pages

The real product is not the page.

The real product is the accountability trail.
