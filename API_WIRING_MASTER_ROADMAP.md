# API Wiring Master Roadmap

## Goal
api list.docx me documented 639 APIs ko frontend me correctly wire karna, jisme:
- jaha frontend feature already hai, waha wiring complete karni hai
- jaha frontend feature missing hai, waha UI + state + API integration create karna hai

Target outcome:
- 639 documented APIs me se 639 wired or intentionally retired with signed decision
- zero unknown gap
- every wired API has runtime validation and UI test coverage

## Current Baseline
Data sources:
- api list.docx
- unwired_apis.txt
- unwired_525_frontend_strict_match.json

Current numbers (baseline model):
- Total documented APIs: 639
- Already wired: 114
- Remaining unwired: 525

Remaining 525 ka execution split:
- Strong frontend exists, wiring missing: 240
- Weak frontend evidence, likely wiring missing: 260
- No frontend evidence, new frontend required: 25

Execution interpretation:
- Fast-track wiring bucket: 240
- Confirm-and-wire bucket: 260
- Build-new-feature bucket: 25

## Strategy Overview
Roadmap do parallel tracks me run hoga:

Track A: Wiring Completion (existing frontend)
- Existing screens/routes/components me API calls add/repair
- Payload mapping, error handling, loading states, permissions

Track B: Frontend Build + Wiring (missing frontend)
- New pages/components create
- Form/table/filter/export UX build
- API wiring with robust validation

Parallel governance track:
- Contract validation
- Regression protection
- Coverage dashboard

## Agent-Ready Operating Model
Is section ka purpose hai ki koi bhi additional coding agent bina verbal briefing ke kaam start kar sake.

### Work Unit Definition
Har API ko ek independent work unit treat karo:
- unit id: module.api_name
- work type: wire-existing, confirm-and-wire, build-new-frontend
- dependency tag: none, backend-contract, design, auth, data-seed
- risk tag: low, medium, high
- test depth: smoke, integration, e2e

### Mandatory Inputs For Any Agent
Kaam start karne se pehle agent ko yeh verify karna hoga:
1. API Contract Registry row exists
2. API Wiring Matrix row exists
3. backend response sample available hai
4. role/capability expected behavior documented hai
5. target frontend route decided hai

### Mandatory Outputs From Any Agent
Har completed API unit ke end me agent must deliver:
1. changed route/component list
2. API client method added or updated
3. payload mapping notes
4. error handling mapping notes
5. test cases added
6. matrix status set to verified

### Agent Handoff Protocol
Jab ek agent ka chunk complete ho:
1. "Done Scope" section: exact APIs completed
2. "Open Risks" section: unresolved items
3. "Next API Queue" section: next 10 APIs with order
4. "Evidence" section: test names and pass status

### Branch And PR Discipline
- branch naming: feat/api-wiring/<module>-<batch-id>
- max APIs per PR: 15 for mutation-heavy modules, 20 for read-heavy modules
- PR checklist must include:
	- contract checked
	- role gates checked
	- empty/loading/error UX checked
	- matrix updated

### Escalation Rules
If blocked beyond 30 minutes:
1. mark matrix status blocked
2. add blocker type: backend, schema, auth, data, ux
3. assign fallback API from same module
4. continue parallel progress

## Frontend Architecture Standards For Wiring

### API Client Layer Standard
Har endpoint direct page se call nahi hoga. Structure mandatory:
1. api client method
2. typed request model
3. typed response model
4. transformer for UI-safe shape
5. error normalizer

### State Handling Standard
Har screen me following 5 states explicit honi chahiye:
1. initial skeleton
2. loading
3. success with data
4. empty data
5. error with retry

### Mutation Safety Standard
Create/update/delete actions me mandatory:
1. confirmation for destructive actions
2. optimistic update only where rollback implemented
3. double-submit prevention
4. idempotent retry handling

### Capability Gate Standard
Role-based behavior 3 layers me enforce hoga:
1. route guard
2. action button visibility
3. backend error fallback messaging

## Non-Tech Friendly UI Specification (Mandatory)
Requirement:
UI aise design honi chahiye ki non-technical user bina training ke kaam kar sake.

### UX Principles
1. plain language first
- technical terms avoid karo
- example: "Submit BOQ for Approval" ke niche helper text: "Yeh action approval team ko bhejega"

2. one-primary-action pattern
- har screen par ek clear primary button
- secondary actions visually subdued

3. guided flow
- long forms ko steps me break karo
- step header + progress indicator show karo

4. safe interaction
- destructive actions ke liye warning copy + impact summary
- reversible actions ke liye undo/snackbar pattern

5. consistent layout
- list view: filter, table/cards, quick actions
- detail view: summary top, tabs middle, action footer

### Form Design Standards
1. label clarity
- label simple Hindi-English friendly terms me
- field hint mandatory for business-critical fields

2. validation behavior
- inline validation on blur
- submit par top error summary + field focus jump

3. default values
- sensible defaults where possible
- date/time and common dropdown prefill

4. mandatory fields
- required markers clear and consistent
- save draft allowed where business permits

### Table And Data Visualization Standards
1. non-tech readability
- status chips with color + text both
- relative dates plus exact timestamps

2. discoverability
- global search + smart filters
- last-used filters memory

3. action clarity
- row actions max 3 visible
- overflow menu for rare actions

4. export and print
- finance, hr, project reports me CSV/PDF actions

### Feedback And Messaging Standards
1. success message format
- what happened + next suggestion
- example: "Invoice approved. Ab aap payment receipt add kar sakte hain."

2. error message format
- plain language + fix instruction
- avoid raw backend trace text

3. empty states
- contextual guidance + call-to-action button

4. loading feedback
- skeletons for lists, spinner only for short actions

### Accessibility And Comfort Standards
1. minimum contrast and readable typography
2. keyboard navigation for all forms and tables
3. focus states clear
4. icon-only buttons must have labels
5. mobile-first touch target sizing

### Performance Standards
1. first meaningful data under 2.5s on average office network
2. pagination default for heavy lists
3. lazy load non-critical widgets
4. debounce for search and filter calls

## Module-Wise UX Packs For New Frontend Builds
Jin 25 APIs ke liye frontend missing hai, unke liye module pack approach follow karo.

### Pack Template
Har pack me:
1. page map
2. user tasks
3. api mapping
4. validation rules
5. error catalog
6. acceptance tests

### Mandatory Pack Approval
Before implementation start:
1. product sign-off on page map
2. backend sign-off on payload contracts
3. qa sign-off on acceptance scenarios

## Verification Framework (Agent-Independent)

### Contract Verification
1. schema snapshot test
2. required field mismatch check
3. enum compatibility check

### Runtime Verification
1. happy path call
2. empty path call
3. invalid payload call
4. permission denied path
5. network retry path

### UX Verification
1. non-tech usability pass (scripted)
2. copy clarity pass
3. keyboard-only pass
4. mobile viewport pass

## Delivery Artifacts Required In Repo
Har sprint ke end tak yeh artifacts update honi chahiye:
1. API Wiring Matrix (current status)
2. Module gap report (remaining count)
3. test execution summary
4. UX audit notes for new screens
5. known limitations list

## Detailed Phase Exit Criteria (Upgraded)

### Phase 1 Exit
- 240 strong APIs wired
- no high-severity UX regressions
- all touched screens have empty/error states

### Phase 2 Exit
- 260 weak APIs reclassified or wired
- unresolved mapping = 0
- role mismatch defects = 0 critical

### Phase 3 Exit
- all 25 missing-frontend APIs have usable screens
- non-tech usability score >= 8/10 in scripted walkthrough

### Phase 4 Exit
- p95 API interaction latency within module budget
- E2E reliability >= 97 percent for critical flows

### Phase 5 Exit
- documented 639 vs wired 639 evidence report
- CI guard active and enforced

## Program Structure

### Phase 0: Control Plane Setup (Week 1)
Objective:
single source of truth aur measurable tracking setup

Deliverables:
1. API Contract Registry
- backend function name
- expected method (GET/POST)
- request schema
- response schema
- auth role/capability
- idempotency notes

2. API Wiring Matrix
columns:
- API name
- module
- frontend route
- component owner
- status: not-started, in-progress, wired, verified, blocked
- test id
- rollback flag

3. Verification scripts
- script A: backend whitelisted APIs extract
- script B: frontend invoked APIs extract
- script C: diff + status report

4. Release gates
- no merge without wiring matrix row update
- no done without runtime proof

Exit criteria:
- daily auto-generated gap report
- owner assigned for all 525 APIs

### Phase 1: Quick Wins (Weeks 2-3)
Objective:
existing frontend me high-confidence missing wiring complete karna

Scope:
- 240 strong frontend exists APIs

Execution method:
1. module-wise batching
2. each batch max 20 APIs
3. add API client wrappers and typed request/response models
4. unify toast and error boundary behavior

Priority order:
1. Dashboards and MIS missing APIs
2. Alerts and reminders missing APIs
3. Admin masters missing APIs
4. Procurement and project small gaps

Expected output:
- 240 APIs wired and verified

Exit criteria:
- strict bucket 240 complete
- smoke test pass for all touched flows

### Phase 2: Confirm-and-Wire (Weeks 4-7)
Objective:
260 weak-evidence APIs ka feature mapping validate karke wiring complete karna

Scope:
- 260 APIs

Workstream per API:
1. feature mapping confirmation
- identify existing screen or internal utility path
- if screen exists, mark Track A
- if not, move to Track B

2. integration completion
- wire API call
- map server validation errors to field-level errors
- add pagination, sorting, filtering where needed

3. security and role gating
- hide action controls by capability
- protect direct route access

Expected output:
- 260 APIs either wired or reclassified to new-frontend queue

Exit criteria:
- unresolved mapping count zero
- every API has explicit status

### Phase 3: Build Missing Frontend (Weeks 8-11)
Objective:
jinke liye frontend evidence nahi hai un APIs ke liye full UX + wiring build

Baseline scope:
- 25 no-evidence APIs

Design standards:
- common page shell
- list + detail + create/edit flow
- audit trail panel where applicable
- retry-safe mutation actions

Minimum implementation checklist:
1. route/page
2. data hooks
3. form validation
4. loading/empty/error states
5. role-aware controls
6. integration tests

Exit criteria:
- all no-evidence APIs moved to wired and verified

### Phase 4: High-Risk Modules Hardening (Weeks 12-14)
Objective:
complex modules me reliability and compliance hardening

Focus modules:
- Execution and Commissioning
- Finance and Commercial
- HR
- Operations and Maintenance
- DMS and Dossier

Hardening checklist:
1. concurrency safety checks
2. optimistic update rollback
3. stale data invalidation
4. audit event visibility
5. long-list performance tuning
6. bulk action safety guards

Exit criteria:
- zero P1 wiring defects
- role/permission mismatch defects zero in UAT

### Phase 5: Closure and Freeze (Week 15)
Objective:
639/639 target sign-off and sustainable guardrails

Deliverables:
1. Final coverage report
- documented APIs: 639
- wired APIs: 639
- intentional retires: 0 or signed list

2. Regression guard CI job
- fail pipeline if new backend API appears without wiring matrix row
- fail pipeline if wired API removed from frontend unexpectedly

3. Hand-off docs
- API wiring playbook
- module ownership map
- incident response guide

Exit criteria:
- production readiness sign-off
- change control activated

## Module Execution Priority

Tier 1 business critical:
1. Finance and Commercial
2. Execution and Commissioning
3. HR
4. DMS and Dossier

Tier 2 operational critical:
5. Stores and Inventory
6. Procurement
7. Project Spine and Workspace
8. Operations and Maintenance

Tier 3 support and analytics:
9. Dashboards and MIS
10. Alerts and Reminders
11. Accountability and Audit
12. Admin masters
13. ANDA import

## Team Model
Recommended squad setup:
- Squad A: Finance + Procurement + Inventory
- Squad B: Execution + Project + DMS
- Squad C: HR + OM + Dashboards
- Platform squad: API client layer, test automation, CI gates

Ownership per API:
- Product owner sign-off
- Frontend owner
- Backend owner
- QA owner

## Quality Gates

Definition of Done per API:
1. API call integrated in frontend flow
2. request payload validated
3. success state visible in UI
4. all error classes handled
5. role/capability behavior verified
6. unit test + integration test pass
7. matrix row updated to verified

Testing pyramid:
- Unit tests for transformers and hooks
- Integration tests for page workflows
- E2E for critical business journeys

Minimum regression pack:
- auth/session
- tender to project flow
- boq to costing to procurement flow
- indent to po to grn flow
- invoice to payment lifecycle
- ticket to rma lifecycle

## Risk Register
Top risks and mitigation:

1. API contract drift
- mitigation: versioned contract snapshot in repo

2. role mismatch
- mitigation: capability matrix tests for every mutation endpoint

3. hidden frontend dependencies
- mitigation: feature mapping workshop before each sprint

4. flaky integration tests
- mitigation: deterministic fixtures and seeded datasets

5. parallel squad collisions
- mitigation: module ownership boundaries and API client lock-step review

## KPI Dashboard
Track weekly:
1. APIs wired this week
2. APIs verified this week
3. unresolved mapping count
4. defect leakage to UAT
5. permission-related bug count
6. rollback events

Success thresholds:
- weekly burn >= 45 APIs in Weeks 2-7
- defect escape < 3 percent
- zero critical auth or data-integrity defects

## 15-Week Delivery Plan
Week 1:
- control plane, matrix, scripts, owners

Weeks 2-3:
- 240 strong-evidence APIs complete

Weeks 4-7:
- 260 confirm-and-wire APIs complete or reclassify

Weeks 8-11:
- 25 missing-frontend APIs build + wire

Weeks 12-14:
- hardening, scale, reliability

Week 15:
- closure, sign-off, freeze guardrails

## Immediate Next 7 Days Plan
Day 1:
- finalize API registry and matrix

Day 2:
- lock module owners and sprint board

Day 3-5:
- complete Dashboards, Alerts, Admin missing wiring

Day 6:
- QA verification and defect burn

Day 7:
- publish week-1 closure report with actual counts

## Acceptance Statement
Roadmap complete tab mana jayega jab:
- api list.docx ka har API frontend me wired ya formally retired ho
- production workflows me end-to-end test evidence ho
- CI guard future API gaps ko automatically block kare
