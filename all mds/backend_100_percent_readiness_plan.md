# Backend 100 Percent Readiness Plan

*Created 2026-04-03.*

This document is the strict execution plan for pushing the backend from "advanced beta" to production-grade.

It is not a backlog dump.
It is not a brainstorming note.
It is the ordered hardening sequence that should be followed until the backend is operationally trustworthy.

Primary reference inputs:

- `all mds/final_patch_sequence.md`
- `all mds/frontend_rebuild_strategy.md`
- `all mds/remaining_todo.md`
- backend audit findings from 2026-04-03

---

## Working Rule

Do not jump phases.

Each phase must be completed in order.
Do not start the next phase until:

- affected backend files compile cleanly
- required migrations run cleanly
- the listed tests for that phase pass
- runtime verification for that phase is completed
- new drift is documented before moving on

If a phase is partially done, it is not done.

---

## Definition Of 100 Percent Backend Readiness

The backend is only considered complete when all of the following are true:

- scheduler hooks point to valid callable methods
- migrations run without known warning drift
- RBAC is fail-closed for governed routes
- there is only one source of truth for permission resolution
- site/project/tender contracts are internally consistent
- DocType validation matches API behavior
- critical workflows are enforced server-side, not just in frontend behavior
- smoke tests and runtime tests are runnable and trustworthy
- no critical business flow depends on silent fallback or guesswork

---

## Phase 1: Repair Runtime Wiring

### Goal

Eliminate backend wiring mistakes that make the system look healthy while important background behavior is actually broken.

### Scope

1. fix all invalid scheduler hook paths
2. confirm all `after_install`, `after_migrate`, and scheduled jobs reference real callables
3. verify the reminder/document-expiry jobs execute from the live hook configuration
4. reconcile migrate-time warnings into either real fixes or documented intentional exceptions

### Known issues to close

- `hooks.py` currently points scheduler to `gov_erp.gov_erp.api.generate_system_reminders`
- migrate/runtime has already shown warning drift around reminder execution

### Required outcomes

- `bench migrate` completes without known invalid-method warnings
- all scheduled jobs referenced in hooks are importable and callable
- daily operational reminders and expiring-document reminders are actually active

### Acceptance checks

- run `bench --site <site> migrate`
- run a hook integrity script that imports every configured hook target
- execute the reminder methods manually once on a test site
- confirm resulting records/logs are created where expected

---

## Phase 2: Make RBAC Production-Safe

### Goal

Remove silent authorization gaps and make backend access control trustworthy.

### Scope

1. convert governed route resolution from fail-open to fail-closed
2. create an explicit allowlist for public or globally safe routes
3. reconcile duplicate permission-engine implementations into one source of truth
4. ensure all backend entrypoints use the active permission engine consistently
5. align PM/PH/project-scoped access with business intent rather than historical drift

### Known issues to close

- unmapped routes are currently allowed by default
- there are two different `permission_engine.py` files in the app tree
- PM access still relies on mixed sources:
  - user-context CSV assignments
  - project-manager field fallback
  - page-level behavior assumptions

### Required outcomes

- no governed route is accessible unless explicitly mapped and allowed
- there is one canonical permission engine file
- PM, PH, Director, and department flows resolve scope from one consistent backend contract

### Acceptance checks

- add a temporary fake route and confirm it is denied unless mapped
- compare all imports of `PermissionEngine` and verify they point to the single canonical module
- test route access with:
  - Project Manager
  - Project Head
  - Director
  - Department Head
- verify PM-scoped routes only expose assigned project/site data

---

## Phase 3: Finish Context Normalization

### Goal

Make `tender -> project -> site -> stages` the real backend contract, not just the preferred direction.

### Scope

1. make `GE Site` the canonical operational parent where intended
2. finish survey normalization around `linked_site`
3. ensure `linked_project` is derived or validated consistently
4. keep `linked_tender` as metadata where it is optional, not as a hidden dependency
5. remove cases where denormalized display fields still act like authoritative linkage

### Known issues to close

- `GE Survey.site_name` is still required even though `linked_site` is canonical
- survey list/stats/gate behavior still partly depends on stored project/tender linkage
- legacy surveys still need explicit cleanup tracking instead of silent ambiguity

### Required outcomes

- survey creation, reads, stats, gates, and downstream usage are site-first
- denormalized fields are display-only, not core join keys
- unresolved legacy rows are explicitly marked for relink rather than silently guessed

### Acceptance checks

- create surveys with:
  - site only
  - site plus project
  - site plus project plus tender
- verify stats/gates work for all three cases
- verify one legacy unresolved survey is surfaced as "needs relink"
- verify no operational read path depends only on free-text `site_name`

---

## Phase 4: Align DocType Validation With API Contracts

### Goal

Remove backend contradictions where APIs support a business flow but the underlying DocType validation still rejects it or expects a different shape.

### Scope

1. audit all site-first and project-first doctypes touched by the new spine
2. ensure each doctype validates and derives upstream linkage consistently
3. remove hidden required-field behavior that frontend cannot reasonably satisfy
4. push derivation into backend models where possible instead of forcing callers to pre-resolve everything

### Highest-priority doctypes

- `GE Survey`
- `GE Project Document`
- `GE PM Request`
- `GE Petty Cash`
- `GE PH Approval Item`
- `GE Costing Queue`
- any workflow object that mixes `project` and `linked_project`

### Required outcomes

- create/update API behavior and doctype validation agree
- site-first upload flows do not fail because project derivation is deferred to callers
- PM and PH flows preserve site/project context into approvals and costing

### Acceptance checks

- DMS upload with only `linked_site`
- PM request create/update/submit with linked site
- petty cash to PH handoff preserves site linkage
- PH approval to costing queue preserves project/site lineage
- no doctype throws a contradictory "linked project is required" if backend can derive it safely

---

## Phase 5: Break Up The API Monolith Safely

### Goal

Reduce backend fragility caused by one giant API file without destabilizing working behavior.

### Why this matters

`gov_erp/api.py` is extremely large and currently acts as a dumping ground for many domains.
That makes ownership, testing, import safety, and reasoning much harder than it should be.

### Scope

1. identify domain seams inside `api.py`
2. extract by stable domain, not by arbitrary file size
3. keep public whitelisted names stable during the refactor
4. eliminate circular-import risk while preserving call signatures

### Suggested module split

- `project_api.py`
- `survey_api.py`
- `procurement_api.py`
- `inventory_api.py`
- `finance_api.py`
- `hr_api.py`
- `om_api.py`
- `dms_api.py`
- `approval_api.py`
- `reporting_api.py`

### Required outcomes

- the main `api.py` becomes a thin compatibility/export layer or dispatch surface
- domain logic is no longer buried in one 18k+ line file
- imports become predictable and reviewable

### Acceptance checks

- no public API route breaks after extraction
- `py_compile` passes on all extracted modules
- at least one domain suite test passes against the extracted module path

---

## Phase 6: Make Tests A Trustworthy Release Gate

### Goal

Convert the current test collection from mixed structural/runtime signals into something we can actually trust before release.

### Scope

1. separate structural tests from true runtime tests
2. make runtime tests boot with proper Frappe/ERPNext test context
3. fix outdated tests that still assert historical implementation details
4. define a minimum passing gate for every release candidate

### Known issues to close

- `test_api.py` currently fails on outdated install-hook expectations
- runtime tests can fail during collection due to incomplete test bootstrapping
- current test presence overstates confidence

### Required test layers

1. structural smoke:
   - hooks present
   - doctypes exist
   - key methods exist

2. service smoke:
   - hook import integrity
   - permission engine import integrity
   - migration smoke

3. workflow runtime:
   - project CRUD
   - stage workflow
   - survey create/read/update
   - PM request lifecycle
   - PH approval lifecycle
   - DMS upload with site-first linkage

### Required outcomes

- test failures represent real regressions, not stale expectations
- runtime tests can run in the bench environment intentionally
- backend release signoff includes a passing test gate

### Acceptance checks

- `pytest` structural subset passes
- at least one runtime subset for each major domain passes
- test runner bootstrap is documented and reproducible

---

## Phase 7: Harden Workflow Invariants

### Goal

Ensure critical business transitions are enforced server-side and cannot be bypassed by alternate mutation paths.

### Scope

1. identify all financially or operationally significant state transitions
2. enforce required preconditions in backend methods and/or model validation
3. ensure alternate mutation paths cannot bypass the approval chain
4. make accountability logging mandatory for critical actions

### Highest-priority workflows

- project stage submit / approve / reject / override
- survey completion gating to BOQ
- PO / RMA PO / petty cash to PH
- PH approval to costing queue
- invoice / payment / retention / penalty actions
- document status transitions

### Required outcomes

- no critical workflow depends only on frontend gating
- every approve/reject/submit action leaves an accountability trail
- alternate backend mutation paths respect the same invariants

### Acceptance checks

- try to mutate key state using a direct API path that skips frontend flow
- confirm backend refuses illegal transitions
- confirm accountability records exist for allowed transitions

---

## Phase 8: Data Migration And Legacy Cleanup

### Goal

Make legacy rows and historical imports safe under the normalized backend model.

### Scope

1. backfill survey/project/site/tender context safely
2. log unresolved records for manual relink
3. verify historical bootstrap/import code matches current schema names
4. make import scripts idempotent and traceable

### Required outcomes

- no important legacy record becomes invisible because the new contract expects richer linkage
- unresolved data is visible as cleanup work, not buried as silent runtime weirdness
- import scripts can be dry-run and commit-run with predictable outcomes

### Acceptance checks

- dry-run backfill report
- commit backfill on test data
- unresolved list exported for manual cleanup
- one historical import dry-run and one commit-run verified

---

## Phase 9: Operational Readiness

### Goal

Prove the backend is supportable in day-to-day use, not just theoretically correct.

### Scope

1. standardize health checks
2. verify background jobs and failure logging
3. make bench startup/migrate/recover steps reproducible
4. ensure demo/seed helpers do not bleed into production assumptions
5. document a release checklist and rollback checklist

### Required outcomes

- operators know what to run before release
- operators know how to detect failures
- operators know how to recover from bad migrations or broken jobs

### Acceptance checks

- release checklist document exists and is followed once
- rollback checklist document exists and is followed once in a dry run
- health endpoint plus scheduler sanity checks are documented

---

## Hard No List

Do not claim the backend is 100 percent because:

- `py_compile` passes
- most APIs exist
- frontend appears to work
- structural tests exist
- only Administrator was tested

It is not 100 percent until:

- the wiring is correct
- the contracts are consistent
- the authorization model is safe
- the runtime tests are trustworthy

---

## Final Signoff Checklist

Backend is complete only when all answers are "yes":

- Do migrations run without known warning drift?
- Do scheduler hooks point only to valid methods?
- Is route RBAC fail-closed for governed routes?
- Is there only one permission engine source of truth?
- Do survey, DMS, PM, PH, and costing contracts agree on site/project lineage?
- Do doctype validators agree with API behavior?
- Do structural tests pass?
- Do runtime tests pass?
- Can one project be taken through the core backend workflow chain without manual data surgery?

If any answer is "no", backend is not yet 100 percent.

---

## Recommended Execution Order

If Opus works this document, the exact order should be:

1. Phase 1: runtime wiring
2. Phase 2: RBAC safety
3. Phase 4: doctype/API contract alignment
4. Phase 3: context normalization closeout
5. Phase 6: trustworthy test gate
6. Phase 7: workflow invariants
7. Phase 8: legacy cleanup
8. Phase 5: API modularization
9. Phase 9: operational readiness

This order is intentional.
Do not start by splitting `api.py` while the scheduler, RBAC, and contracts are still drifting.
