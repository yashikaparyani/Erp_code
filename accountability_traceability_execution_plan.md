# Accountability And Traceability Execution Plan

Date: 2026-03-26

## Purpose

This document converts the accountability idea into an implementation plan that can be executed in phases.

It is designed for two-agent delivery:

- `Opus` drives implementation
- `Codex` validates, audits, and patches gaps after each phase

The target outcome is:

`every critical action from tender to project closure must produce a written, queryable, role-aware accountability trail`

This is not only about notifications.

The real requirement is:

- who did what
- who owns it now
- who accepted it
- who rejected it
- why it was blocked
- why it was delayed
- who approved the exception
- where the failure originated

## Primary Problem To Solve

The business pain is not lack of pages.

The business pain is:

- accountability is verbal
- ownership shifts informally
- approvals are not consistently justified
- rejections do not always carry written reasons
- leadership cannot do RCA without asking people verbally

So the ERP must become:

- a handoff system
- an acceptance system
- a justification system
- an escalation system
- an RCA system

## Target Architecture

## 1. Core Ledger Objects

The ERP should gain two generic DocTypes.

### A. `GE Accountability Record`

One live ownership record per tracked business object.

Suggested fields:

- `root_doctype`
- `root_name`
- `subject_doctype`
- `subject_name`
- `linked_project`
- `linked_site`
- `linked_stage`
- `current_status`
- `current_owner_role`
- `current_owner_user`
- `current_owner_department`
- `assigned_to_role`
- `assigned_to_user`
- `accepted_by`
- `accepted_on`
- `submitted_by`
- `submitted_on`
- `due_date`
- `is_blocked`
- `blocking_reason`
- `escalated_to_role`
- `escalated_to_user`
- `approved_by`
- `approved_on`
- `closed_by`
- `closed_on`
- `latest_event_type`
- `source_route`

### B. `GE Accountability Event`

One immutable row per action.

Suggested fields:

- `accountability_record`
- `event_type`
- `actor`
- `actor_role`
- `actor_department`
- `from_status`
- `to_status`
- `from_owner_user`
- `to_owner_user`
- `from_owner_role`
- `to_owner_role`
- `remarks`
- `reason_code`
- `linked_project`
- `linked_site`
- `linked_stage`
- `reference_doctype`
- `reference_name`
- `event_time`
- `metadata_json`

## 2. Global Event Vocabulary

Every tracked workflow should use a controlled event set.

Mandatory event types:

- `CREATED`
- `SUBMITTED`
- `ASSIGNED`
- `ACKNOWLEDGED`
- `ACCEPTED`
- `RETURNED`
- `APPROVED`
- `REJECTED`
- `BLOCKED`
- `UNBLOCKED`
- `ESCALATED`
- `DUE_DATE_CHANGED`
- `REOPENED`
- `COMPLETED`
- `CANCELLED`
- `OVERRIDDEN`

## 3. Mandatory Reason Rules

These actions must require written remarks:

- `REJECTED`
- `RETURNED`
- `BLOCKED`
- `ESCALATED`
- `OVERRIDDEN`
- `CANCELLED`
- `DUE_DATE_CHANGED`

If reason is missing, save must fail.

## 4. Golden Execution Rule

For any important business action:

1. validate the action
2. update the business document
3. append a `GE Accountability Event`
4. refresh the `GE Accountability Record`
5. emit notifications / alerts
6. expose the event in activity / RCA views

Notifications are delivery.

The accountability event ledger is the truth.

## Rollout Strategy

Build the generic spine first.

Then wire high-risk workflows one by one.

Do not try to solve accountability separately inside each page.

## Phase 1: Core Ledger Foundation

### Goal

Create the generic accountability engine once.

### Opus Implementation Scope

- create `GE Accountability Record`
- create `GE Accountability Event`
- add backend helper functions:
  - `log_accountability_event(...)`
  - `upsert_accountability_record(...)`
  - `get_accountability_timeline(...)`
  - `get_open_accountability_items(...)`
- add reason validation rules for mandatory event types
- add route/API surface for querying record + event timeline
- add event-type constants in one place

### Required Backend Shape

- append-only event model
- current-state snapshot model
- query by:
  - project
  - site
  - doctype/name
  - owner
  - pending owner
  - blocked state
  - escalated state

### Done Criteria

- core DocTypes exist
- generic helpers exist
- one API can return full timeline for a tracked object
- reason-required event types fail without remarks

### Codex Validation

- schema audit
- verify append-only event behavior
- verify snapshot updates correctly after multiple events
- verify mandatory-reason validation
- verify query APIs return deterministic output

## Phase 2: Pilot Workflow - Indent Accountability

### Why Indent First

Indent is a perfect pilot because it is a real cross-department handoff:

- PM / site side raises need
- PH reviews / acknowledges / rejects
- procurement receives
- purchase processes
- stores / GRN continues downstream

### Goal

Turn indent from CRUD into accountable handoff.

### Opus Implementation Scope

- create indent action layer on top of `Material Request`
- add explicit actions:
  - `submit_indent`
  - `acknowledge_indent`
  - `accept_indent`
  - `reject_indent`
  - `return_indent`
  - `escalate_indent`
- require rejection / return / escalation remarks
- create accountability record on indent creation
- append events on every action
- emit alerts to:
  - requester
  - current owner
  - PH
  - procurement owner
  - higher authority where relevant
- include indent in approval / action inboxes

### Required Data Fields

At minimum indent submission must capture:

- linked project
- linked site if applicable
- requested by
- required by date
- item lines
- request justification
- current owner
- current status
- rejection remark if rejected
- acknowledgment timestamp if acknowledged

### Done Criteria

- PM can submit indent
- PH can acknowledge / reject with mandatory reason
- procurement can accept after PH flow
- all actions generate ledger events
- all actions generate visible alerts

### Codex Validation

- verify missing reject reason fails
- verify PH acknowledgment creates event + alert
- verify rejection creates event + alert + stored remark
- verify higher authority can see rejected/blocked items
- verify timeline shows actor, timestamp, old status, new status, remarks

## Phase 3: PM Request + Project Governance Layer

### Goal

Standardize PM-to-PH accountability flows.

### Workflows

- timeline extension
- staffing request
- petty cash exception
- hold recommendation
- escalation memo

### Opus Implementation Scope

- wire `GE PM Request` into accountability ledger
- every request action writes event trail
- PH approval / rejection requires remarks where applicable
- director / higher authority can view the full request history

### Done Criteria

- PM request timeline is no longer only document status
- request becomes a fully queryable accountability object

### Codex Validation

- verify request creation, submit, approve, reject, withdraw events
- verify higher authority visibility
- verify event order is correct

## Phase 4: Site Lifecycle + Execution Control

### Goal

Make site-level execution accountable, not just visible.

### Scope

- site status
- current site stage
- installation stage
- site blocked / unblocked
- milestone approval / rejection
- dependency override approval / rejection
- DPR submission and closure-related events

### Opus Implementation Scope

- wire `GE Site` changes into ledger
- write events for:
  - status change
  - stage change
  - blocker
  - unblock
  - execution acceptance
  - commissioning readiness
- connect site blockers to current owner and escalation path

### Done Criteria

- every major site progression is a recorded event
- blocked sites always show blocker owner and blocker reason
- RCA can identify where execution stalled

### Codex Validation

- verify stage and status changes create ledger events
- verify blocker events require reason
- verify director can query blocked sites by project / owner / age

## Phase 5: Engineering Accountability Chain

### Goal

Trace survey-to-BOQ-to-drawing handoffs.

### Scope

- survey submission
- survey review
- BOQ submission
- BOQ approval / rejection
- drawing release
- technical deviation
- change request

### Opus Implementation Scope

- make each engineering handoff create or update accountability record
- enforce written review / rejection reasons
- expose pending owner and due date at each step

### Done Criteria

- leadership can see whether failure originated at survey, BOQ, or drawing stage

### Codex Validation

- verify chain continuity from survey to BOQ to drawing release
- verify rejection reasons persist
- verify downstream stage cannot proceed if upstream accountability object is unresolved where policy requires it

## Phase 6: Procurement + Stores + Receiving Chain

### Goal

Trace procurement request to material arrival and receipt.

### Scope

- indent
- vendor comparison
- PO
- dispatch
- GRN
- project receiving
- project inventory receipt
- material consumption reporting

### Opus Implementation Scope

- link these objects by accountability chain ids / root reference
- write ownership change events at each handoff
- expose “who is sitting on this” at every stage

### Done Criteria

- material shortage RCA can identify whether failure started at indent, comparison, PO, dispatch, GRN, or site receiving

### Codex Validation

- trace one sample chain end-to-end
- verify owner and timestamps change correctly
- verify no step can silently skip audit event creation

## Phase 7: Finance / Commercial / Closure Chain

### Goal

Trace closure-critical financial decisions.

### Scope

- petty cash exceptions
- billing trigger approvals
- invoice review
- retention / penalty decisions
- closure note / project closure

### Opus Implementation Scope

- wire financial exception flows into accountability ledger
- make milestone-exception billing require written audit note
- make closure produce final accountability closure event

### Done Criteria

- delayed billing and closure can be root-caused to the responsible stage / owner

### Codex Validation

- verify every exception path records reason
- verify closure event captures final actor and final remarks

## Phase 8: Director And RCA Views

### Goal

Make the ledger usable for leadership.

### Opus Implementation Scope

- build accountability dashboard / report views for:
  - blocked items
  - rejected items
  - overdue ownership
  - items with no acknowledgment
  - escalation heatmap by department
  - RCA timeline view by project
- add filters:
  - project
  - site
  - department
  - owner
  - status
  - age
  - blocker

### Done Criteria

- director can answer:
  - where did delay start
  - who owns it now
  - who rejected it and why
  - how long each owner held it

### Codex Validation

- verify one RCA story can be reconstructed without verbal explanation
- verify views only read from ledger truth, not fragile UI-only assumptions

## Phase 9: Enforcement And Migration

### Goal

Make the system operationally reliable.

### Opus Implementation Scope

- backfill accountability records for key open objects where feasible
- add tests around event creation
- add developer helpers / wrappers so new actions must use the ledger
- update docs for “every new workflow action must log accountability event”

### Done Criteria

- new workflow code has a standard accountability integration pattern
- open critical modules are covered

### Codex Validation

- audit for bypass paths
- identify mutation endpoints that still update docs without accountability logging
- classify remaining uncovered modules

## Validation Framework For Every Phase

After each phase, Codex should validate with this checklist.

### 1. Data Model Validation

- Do the new DocTypes exist?
- Are required fields present?
- Are mandatory-reason events enforced?

### 2. Workflow Validation

- Does the business action create exactly one new event?
- Does current ownership update correctly?
- Does rejection preserve reason?
- Does approval preserve actor and timestamp?

### 3. Visibility Validation

- Can requester see the trail?
- Can current owner see the trail?
- Can PH see the trail?
- Can authority above PH see the trail?
- Are unrelated roles blocked?

### 4. Notification Validation

- Is alert emitted?
- Is recipient set correct?
- Does alert deep-link to the right object?

### 5. RCA Validation

- Can the timeline answer:
  - who created it
  - who accepted it
  - who delayed it
  - who rejected it
  - why it failed

## Division Of Work

## Opus Owns

- DocTypes
- backend helper functions
- workflow action methods
- route/API plumbing
- first-pass frontend timeline / action UI
- source-level tests for the implemented phase

## Codex Owns

- independent audit of claims
- build/test validation
- workflow gap detection
- policy mismatch detection
- alert and RBAC verification
- patching unsafe or incomplete behavior
- updating execution notes when claims overstate reality

## Non-Negotiable Rules

- no rejection without written reason
- no ownership transfer without event
- no approval without actor + timestamp
- no escalation without target owner
- no blocker without blocker reason
- no closure without closure note
- no major workflow action should update business state silently

## Recommended Build Order

If time is tight, the highest-value order is:

1. Phase 1 - Core Ledger Foundation
2. Phase 2 - Indent Accountability
3. Phase 3 - PM Request Accountability
4. Phase 4 - Site Lifecycle Accountability
5. Phase 6 - Procurement + Stores + Receiving Chain
6. Phase 8 - Director RCA Views

This order delivers leadership value fastest.

## Final Rule

The ERP should stop behaving like a collection of pages.

It should behave like a written accountability machine.

Every critical handoff must leave a trace.
Every rejection must leave a reason.
Every delay must leave an origin.
Every owner change must be queryable.

That is what will make delegation, accountability, and RCA real.
