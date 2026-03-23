# SRS Gap Closure Execution Plan

Date: 2026-03-22

## Purpose

This document converts the readiness audit into a direct execution plan.

Use this after:

- `srs_vs_code_readiness_matrix.md`

This is the working order for closing the remaining high-value gaps without reopening broad scope.

## Core Rule

Do not rebuild modules that are already real.

Do not start new broad features unless they directly improve:

- workflow truth
- PM operating clarity
- implementation-day stability
- role-based acceptance confidence

## Current Position

The ERP is already broadly implemented.

The remaining work is mostly:

1. PM workspace maturity
2. execution / commissioning polish
3. alerts / reminders / collaboration maturity
4. DMS project-context rigor
5. final role-based walkthrough and acceptance hardening

## Execution Order

Execute in this order:

1. shared project workspace maturity
2. execution / commissioning polish
3. alerts / reminders / collaboration maturity
4. DMS project-context rigor
5. final acceptance hardening

## Phase 1: Shared Project Workspace Maturity

### Goal

Make `/projects/[id]` feel like the real PM operating cockpit instead of a good scaffold.

### Why this comes first

This is the highest-leverage surface left in the system.

Many already-implemented capabilities exist elsewhere, but they are still not fully converging into one confident PM-facing workspace.

### Main outcomes required

- a PM can understand project state from one workspace
- project, site, and stage filtering behave predictably
- execution, commissioning, documents, comments, and activity are visible in context
- the page feels operational, not only informational

### Work to do

- audit `/projects/[id]` against:
  - milestones
  - site status
  - DPRs
  - dependencies
  - commissioning state
  - linked documents
  - comments / collaboration
  - alerts / reminders
- tighten project/site/stage filtering so department users do not see noisy or irrelevant records
- improve workspace hierarchy so project summary, site summary, blockers, due work, and documents are visually clearer
- surface blocking reasons and actionable next steps directly in the workspace
- ensure PM-relevant cross-links into execution, DMS, commissioning, and collaboration are obvious

### Acceptance criteria

- `/projects/[id]` can be used as the main PM daily page
- a PM can identify blockers, upcoming work, document status, and site progress without hopping through multiple unrelated pages
- stage and site filters return believable scoped data

## Phase 2: Execution / Commissioning Polish

### Goal

Make execution and commissioning feel operationally sharp, especially for real site-delivery usage.

### Why this comes second

The backend capability is already strong here.
The remaining work is mostly operator UX and page coherence.

### Main outcomes required

- commissioning flow is easier to understand
- client signoff, test reports, and checklist state are clearer
- field-progress surfaces feel connected to project truth

### Work to do

- tighten `execution/*` and commissioning pages so they feel like one lane, not separate fragments
- improve visibility of:
  - commissioning checklist status
  - test report status
  - client signoff status
  - field progress and readiness blockers
- reduce page fragmentation where execution details are spread too thin
- make operator actions more explicit and lower-noise

### Acceptance criteria

- a project lead can explain site execution state and commissioning readiness from the UI without backend interpretation
- signoff and test-report workflow feels complete and understandable

## Phase 3: Alerts / Reminders / Collaboration Maturity

### Goal

Turn existing alert, reminder, and collaboration capabilities into a more unified and trustworthy experience.

### Why this comes third

This area exists already, but it currently feels less mature than the core ERP flows.

### Main outcomes required

- alerting feels useful, not noisy
- reminders are contextual and actionable
- collaboration is clearly attached to records and work

### Work to do

- unify alert and reminder presentation across tender, project, and operational contexts
- improve reminder usefulness:
  - due work
  - document expiry
  - tender deadline / commercial follow-up
  - project blockers
- tighten record-comment and mention surfacing so users can follow context more easily
- reduce ambiguity in where comments, reminders, and alerts should be used
- decide whether email-style notification work is required for go-live or can remain later-phase

### Acceptance criteria

- users can distinguish alerts, reminders, and comments clearly
- reminders are visibly connected to project/tender/work context
- collaboration feels attached to records instead of floating separately

## Phase 4: DMS Project-Context Rigor

Status: Completed on 2026-03-22 after audit + patch validation.

### Goal

Make DMS feel fully embedded in project operations, not only available as a standalone module.

### Why this comes fourth

The DMS itself is already strong.
The remaining work is about better context integration and governance clarity.

### Main outcomes required

- project-linked documents are easier to understand in workspace context
- versions and expiry matter in the places where work happens
- document governance rules are clear

### Work to do

- improve linked-document visibility inside project and execution contexts
- surface:
  - latest version
  - prior versions
  - expiry risk
  - category / linkage
- decide whether first-class document approval is required now
- if yes:
  - add explicit approval state and approval actions
- if no:
  - document that current governed versioning and delete/edit rules are the accepted go-live model

### Acceptance criteria

- users can see relevant project documents in context
- version and expiry signals are visible where decisions are made
- document governance approach is explicit, not ambiguous
- standalone DMS and project workspace use the same latest/version/expiry/site context model

## Phase 5: Final Acceptance Hardening

Status: Completed on 2026-03-22 after sanity check + role walkthrough + smoke tests.

### Goal

Close the gap between “implemented” and “safe for implementation/demo day.”

### Why this comes last

This phase should validate the system after the product-level maturity fixes above are complete.

### Main outcomes required

- core roles can walk the system end to end
- major routes behave correctly under RBAC
- seeded data supports a believable demo

### Work to do

- run one guided role-based walkthrough for:
  - presales
  - PM / execution
  - procurement / stores
  - finance / commercial
  - HR
  - O&M
- tighten route behavior where frontend experience still drifts from backend RBAC truth
- improve seeded demo data where workflows still feel too thin
- add browser-level smoke coverage for the core journey
- record final punch-list bugs and close only the ones that affect workflow truth or demo confidence

### Acceptance criteria

- a department-wise walkthrough can be completed without major confusion
- no major role sees broken access behavior
- demo data is good enough to tell the full lifecycle story

## What Must Not Be Reopened

Do not reopen these unless a real blocker appears:

- ANDA import architecture
- HR module broad redesign
- DMS binary upload/file-type support
- O&M state-machine redesign
- bookkeeping lane reinvention
- broad new analytics scope

## Working Rule For Opus

When fixing the remaining gaps:

- prefer integration over invention
- prefer sharper workspace composition over new pages
- prefer clearer cross-linking over duplicating data
- prefer role-truth over cosmetic polish
- prefer acceptance confidence over speculative expansion

## Recommended Immediate Next Step

Start with Phase 5:

- run the final role-based walkthrough
- close route/RBAC drift
- improve only the seeded/demo data that still weakens the lifecycle story

Do not open fresh feature scope unless Phase 5 exposes a real workflow blocker.
