# Project Head Approval Hub Spec

*Drafted 2026-03-28 for the next implementation pass.*

This file turns the recent business clarification into a concrete build target.

It is intended to be executable by an implementation agent without needing to infer the flow from chat history.

## Core Principle

Keep the approval model simple:

- origin team raises the request
- `Project Head` is the approval gate
- after PH approval, a new costing-side queue item is created
- `Costing` / finance handles disbursement or release

This should be one coherent chain across:

- normal `PO`
- `RMA PO`
- `Petty Cash Requests`

## Canonical Flow

### 1. Purchase PO

- purchase team prepares and finalizes PO
- purchase submits PO
- submitted PO appears in `Project Head -> Approval -> PO`
- PH approves or rejects
- on approval:
  - create costing queue entry: `PH approved PO <id>`
  - costing sees it in costing queue
  - costing releases / disburses as applicable

### 2. RMA PO

- RMA team raises replacement / repair / purchase spend request
- once finalized, it is submitted as an `RMA PO` approval item
- submitted item appears in `Project Head -> Approval -> RMA PO`
- PH approves or rejects
- on approval:
  - create costing queue entry: `PH approved RMA PO <id>`
  - costing processes the release / spend

### 3. Petty Cash Request

- `Project Manager` raises `Make Request For Funds` from petty cash section
- submitted request appears in `Project Head -> Approval -> Petty Cash Requests`
- PH approves or rejects
- on approval:
  - create costing queue entry: `PH approved petty cash request <id>`
  - costing disburses funds

## Frontend Shape

## Project Head

Create a single `Approval` hub under `Project Head`.

### Top-level location

- `Project Head`
  - `Approval`

### Sub-tabs

- `PO`
- `RMA PO`
- `Petty Cash Requests`

### Required row signals in all three tabs

- request id
- originating module / team
- project
- raised by
- raised on
- amount
- current status
- linked record
- priority / blocker flag if relevant

### Required PH actions

- approve
- reject
- open linked record
- view supporting remarks / documents / accountability

### Required PH states

- `Draft`
- `Submitted to PH`
- `Approved by PH`
- `Rejected by PH`
- `Forwarded to Costing`
- `Disbursed / Released`

The exact persisted status names can differ in code, but the product meaning should match these states.

## Costing / Finance

Create a costing-side queue or inbox that is fed only after PH approval.

### Queue behavior

- queue entry is created on PH approval event
- costing should not have to poll multiple modules manually
- entry copy should be explicit:
  - `PH approved PO <id>`
  - `PH approved RMA PO <id>`
  - `PH approved petty cash request <id>`

### Required costing actions

- mark released / disbursed
- hold
- reject back with remarks if business rule requires
- open source record

### Required costing row signals

- source type (`PO`, `RMA PO`, `Petty Cash`)
- source id
- PH approver
- PH approval date
- amount
- project
- vendor / beneficiary
- disbursement status

## Module-Specific UI Changes

## Procurement

### Purchase Orders

- after purchase finalizes a PO, show `Submit to PH`
- once submitted, the PO should no longer look locally approvable by purchase
- PO detail page should show:
  - submission to PH
  - PH decision
  - costing release state

## RMA

- create or align an `RMA PO` approval path
- RMA item should be visibly distinct from standard purchase PO, but follow the same sanction chain
- RMA detail page should show:
  - sent to PH
  - PH decision
  - costing queue / release state

## Petty Cash

- under petty cash, add `Make Request For Funds`
- this creates a PH-bound petty cash request, not direct disbursement
- petty cash detail should show:
  - requested by PM
  - pending PH approval
  - PH decision
  - costing disbursement state

## Alerts And Accountability

## Alert creation

On submit to PH:

- create PH-facing alert:
  - `PO submitted for approval`
  - `RMA PO submitted for approval`
  - `Petty cash request submitted for approval`

On PH approval:

- create costing-facing alert:
  - `PH approved PO ...`
  - `PH approved RMA PO ...`
  - `PH approved petty cash request ...`

On PH rejection:

- create origin-team alert with rejection remarks

## Accountability trail

Every approval object should append events such as:

- raised
- submitted to PH
- approved by PH
- rejected by PH
- costing queue entry created
- funds released / disbursed

This should be visible from:

- source record detail page
- PH approval hub
- costing queue

## Backend Expectations

The implementation does not have to introduce one monolithic doctype if a lighter approach fits the existing codebase better.

But the backend must support these concepts consistently:

- source record can move into `Submitted to PH`
- PH decision is recorded with actor, timestamp, remarks
- PH approval creates a costing work item / queue entry
- costing decision is recorded with actor, timestamp, remarks
- source detail API can report the full approval chain

## Suggested Implementation Order

1. Add / align canonical state model for:
   - PO
   - RMA PO
   - petty cash fund request
2. Add PH approval hub with three sub-tabs
3. Add petty cash `Make Request For Funds`
4. Add PH approve / reject actions
5. Add costing queue creation on PH approval
6. Add costing queue UI and release actions
7. Add alerts + accountability events
8. Add record-detail linkage in all three modules

## Non-Goals For This Pass

- do not overcomplicate with deep workflow branching beyond this approval chain
- do not scatter separate approval inboxes across procurement, RMA, and petty cash once PH hub exists
- do not allow costing to act before PH approval
- do not keep ambiguous copy such as `department approval` if PH is the real sanction authority

## Acceptance Standard

This spec is implemented successfully only when:

- purchase can submit a finalized PO to PH
- RMA can submit an RMA PO to PH
- Project Manager can submit `Make Request For Funds`
- PH sees all three in one approval hub with clear sub-tabs
- PH approval creates a costing queue entry
- costing can act from its own queue
- source records show the full chain from raise -> PH -> costing
- alerts and accountability reflect the same truth
