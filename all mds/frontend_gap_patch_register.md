# Frontend Gap Patch Register

*Created 2026-04-03.*

## Purpose

This document is the tactical frontend gap map.

It exists to answer two questions clearly:

1. Where is the frontend still lacking?
2. What exact kind of patch is needed there?

This is **not** the rebuild philosophy document.
That already exists in `all mds/frontend_rebuild_strategy.md`.

This is the operational register that should be used when assigning frontend work.

---

## Ground Truth

The frontend must consistently reflect this spine:

`Tender -> Project -> Site -> Stage -> Record`

And every screen must resolve context in this order:

`record -> linked_site -> linked_project -> linked_tender`

Whenever the frontend violates that rule, one of these things happens:

- wrong role surface opens
- generic/global records leak into scoped views
- hidden optional fields become accidental blockers
- linked documents or accountability panels break
- pages feel random instead of operational

---

## Patch Types

Every frontend issue in this file should be solved by one or more of these patch types.

### A. Context patch

Use canonical context:

- `linked_site` first
- then `linked_project`
- then `linked_tender`

### B. Ownership patch

Fix route ownership so PM, PH, Director, and department users land in the correct shell.

### C. Shell patch

Replace placeholder pages or report shells with a real working surface:

- live data
- meaningful actions
- real drilldowns

### D. Contract patch

Align frontend assumptions with backend contract:

- no hidden required fields
- no wrong response-shape assumptions
- no stale prop names

### E. Selector patch

Replace free-text project/site/tender entry with constrained selectors driven by real scope.

### F. DMS patch

Make uploads, linked documents, dossier, expiry, and approvals work in context.

### G. UX patch

Fix runtime crashes, broken links, misleading validation, and inconsistent page behavior.

---

## Severity Scale

- `Critical` = blocks real workflow or opens wrong role surface
- `High` = route works but teaches wrong business model or breaks major context
- `Medium` = incomplete operational depth or weak action path
- `Low` = polish, consistency, or usability debt

---

## Section 1: Foundation And Shared Patterns

### 1.1 Context handling is still uneven

**Problem**

Different pages still derive project/site/tender context in different ways.

**Why this hurts**

- the same object behaves differently across pages
- PM and PH views drift
- survey/site flows become fragile

**Patch needed**

- create shared context resolution helper usage across all major detail pages
- remove page-local context guessing
- stop using `site_name` as the operational join key when `linked_site` exists

**Patch type**

`A`, `D`

**Severity**

`Critical`

---

### 1.2 Shared page shells are still inconsistent

**Problem**

List pages, detail pages, and workspaces still use multiple patterns for:

- loading
- empty states
- error states
- actions
- side panels

**Patch needed**

- standardize one list/register shell
- standardize one detail shell
- standardize one workspace shell
- standardize action placement and empty-state structure

**Patch type**

`C`, `G`

**Severity**

`High`

---

### 1.3 Route ownership still leaks

**Problem**

Some route links or menu items still point users into the wrong role workspace.

**Known symptom class**

- PM route opened from PH menu
- PH flow rendered in PM shell

**Patch needed**

- audit all sidebar/menu targets by role
- separate PM creation routes from PH review routes
- ensure detail pages route back to the correct owner surface

**Patch type**

`B`, `G`

**Severity**

`Critical`

---

## Section 2: Project Spine And Workspace

### 2.1 `/projects` is not yet a fully trustworthy command center

**Current weakness**

The route is better than before, but still needs to behave like project triage, not just an object list.

**Still needed**

- stronger project-level alerts/blockers
- clearer pending approvals surface
- clearer document readiness surface
- project-created objects must be traceable without leaving the cockpit mindset

**Patch type**

`C`, `G`

**Severity**

`High`

---

### 2.2 `/projects/[id]` tabs are still uneven in maturity

**Current weakness**

Some tabs are deep, others still feel like stitched-on module slices.

**Areas that commonly drift**

- activity
- dossier
- approvals
- files
- site board
- downstream linked objects

**Patch needed**

- every tab must answer:
  - what is blocked
  - what is pending
  - what document is missing
  - what site/object is affected
- remove tab-level runtime fragility
- ensure linked comments, documents, accountability, and action queues read from the same context chain

**Patch type**

`A`, `C`, `F`, `G`

**Severity**

`Critical`

---

### 2.3 Project workspace still does not fully dominate department-flat navigation

**Problem**

Too many module pages still behave like the primary operating surface even when project context should be primary.

**Patch needed**

- make module pages filtered operational views
- push users into project/site-owned detail paths for actual work
- keep `/projects/[id]` as the real operating cockpit

**Patch type**

`A`, `C`

**Severity**

`High`

---

## Section 3: Survey And Site-First Workflows

### 3.1 Survey pages were historically tender-first and still need normalization follow-through

**Problem**

Survey flows were built around tender and free-text site behavior, while the correct model is site-first.

**Still needed**

- both survey workspaces must remain site-scoped
- engineering survey view must not regress into global tender CRUD
- PM survey view must show allotted sites and survey status, not global records

**Patch type**

`A`, `C`, `E`

**Severity**

`Critical`

---

### 3.2 Survey detail pages must always resolve upstream context from the site

**Problem**

Survey detail pages historically assumed the survey record itself already carried enough upstream context.

**Patch needed**

- derive project from `linked_site`
- derive tender secondarily when available
- linked documents, accountability, comments, and linked-record panels must work with site/project context even if tender is absent

**Patch type**

`A`, `D`, `F`

**Severity**

`Critical`

---

### 3.3 Validation messaging and hidden-field behavior are still a risk area

**Problem**

The frontend has already shown patterns where:

- site was selected
- hidden tender/project assumptions still blocked submit
- the error message blamed the wrong field

**Patch needed**

- audit all create/edit forms for hidden blockers
- make validation messages name the real missing field
- if a field is optional upstream, downstream UI must not behave like it is secretly required

**Patch type**

`D`, `G`

**Severity**

`High`

---

## Section 4: PM And PH Operational Surfaces

### 4.1 PM surfaces are still not fully aligned around `select project -> select site -> act`

**Problem**

PM pages still risk mixing project-only, site-free, and free-text flows.

**Scope**

- PM Requests
- Project Inventory
- Project Petty Cash
- DPR / Progress
- Survey Submission
- Client Communication

**Patch needed**

- every PM action surface should start from valid allotted project/site scope
- no orphan site values
- no project-only submit when site materially matters

**Patch type**

`A`, `E`

**Severity**

`Critical`

---

### 4.2 PH business model is still only partially represented in frontend shells

**Problem**

The Project Head role now has real governance logic, but the frontend still needs clearer separation between:

- requests from PM
- approval hub
- communication visibility
- go-live / completion / handover artifacts

**Patch needed**

- distinct PH review surfaces
- no reuse of PM creation pages for PH review
- route naming and labels must reflect actual business ownership

**Patch type**

`B`, `C`

**Severity**

`High`

---

### 4.3 PM and PH dashboards still need stronger live operational truth

**Problem**

Dashboard tiles and worklists can still drift from the allotted project/site truth.

**Patch needed**

- use the same backend scope source everywhere
- derive dashboard records from allotted project/site context
- remove any remaining generic/hardcoded data tiles

**Patch type**

`A`, `D`

**Severity**

`High`

---

## Section 5: DMS, Dossier, Accountability, Collaboration

### 5.1 DMS context use is still uneven across embedded panels

**Problem**

`RecordDocumentsPanel` exists widely, but not every embedding passes robust site/project context.

**Patch needed**

- every detail page using documents must pass canonical context
- uploads must succeed even when only site context is known
- avoid page-specific DMS hacks

**Patch type**

`A`, `F`

**Severity**

`Critical`

---

### 5.2 Dossier and Files surfaces still need stronger operational actions

**Problem**

The DMS foundation is good, but some views still act like passive registers.

**Still needed**

- required-vs-uploaded visibility in more places
- document status transitions in context
- reviewer/approver actions where the user is already working
- expiry items with real action buttons

**Patch type**

`C`, `F`

**Severity**

`High`

---

### 5.3 Activity / comments / collaboration must stop crashing on imperfect data

**Problem**

Collaboration views are vulnerable when comment owner/display fields are incomplete.

**Patch needed**

- defensive display fallbacks
- no runtime crash on missing owner/email/avatar fields
- activity surfaces must degrade gracefully

**Patch type**

`D`, `G`

**Severity**

`Medium`

---

### 5.4 Accountability should feel native, not bolted on

**Problem**

Accountability exists conceptually across the app, but some screens still treat it as a side panel instead of an operational truth source.

**Patch needed**

- accountability summary visible on major lifecycle detail pages
- direct drilldown into who submitted, approved, rejected, delayed
- use accountability context inside project workspace, DMS, approval hub, and survey chain

**Patch type**

`C`, `F`

**Severity**

`High`

---

## Section 6: Module Shells Still Requiring Depth

### 6.1 Pre-Sales shells remain uneven

**Routes needing attention**

- `/pre-sales/dashboard`
- `/pre-sales/tender`
- `/pre-sales/tenders`
- `/pre-sales/bids`

**Current weakness**

Pre-sales funnel improvements exist, but shell consistency, drilldowns, and contract-origin continuity still need tightening.

**Patch needed**

- make funnel screens act like real operational queues
- keep tender lifecycle fields visible and usable
- ensure award conversion into project is always obvious and traceable

**Patch type**

`C`, `D`

**Severity**

`Medium`

---

### 6.2 Procurement chain still needs cleaner end-to-end ergonomics

**Routes needing attention**

- `/procurement`
- `/indents`
- `/vendor-comparisons`
- `/purchase-orders`

**Current weakness**

The business chain exists, but module-level surfaces are still inconsistent in list depth, action visibility, and project/site context.

**Patch needed**

- keep project linkage visible
- make each list page a meaningful queue
- ensure downstream effects are obvious:
  - indent -> comparison
  - comparison -> PO
  - PO -> dispatch / costing / approval

**Patch type**

`A`, `C`

**Severity**

`High`

---

### 6.3 Inventory views still need operational, not report-style, behavior

**Routes needing attention**

- `/inventory`
- `/stock-position`
- `/stock-aging`
- `/dispatch-challans`
- `/grns`

**Current weakness**

Some pages still behave like shallow reports or assume one response shape too rigidly.

**Patch needed**

- normalize API consumption
- keep project/site/object linkage visible
- turn summary pages into actionable inventory surfaces

**Patch type**

`A`, `D`, `C`

**Severity**

`High`

---

### 6.4 Execution shells are still mixed between strong object pages and weak wrappers

**Routes needing attention**

- `/execution/project-structure`
- `/execution/comm-logs`
- `/execution/sites/[id]`
- commissioning cluster pages

**Current weakness**

Object pages are stronger than the wrapper shells around them.

**Patch needed**

- make execution module pages project/site-driven
- ensure project structure is not a placeholder shell
- keep commissioning, dependencies, and site-level truth linked together

**Patch type**

`A`, `C`

**Severity**

`High`

---

### 6.5 Finance and HR top-level pages remain mixed-depth

**Routes needing attention**

- `/finance`
- `/hr`
- selected summaries/reports under both modules

**Current weakness**

Many underlying object pages exist, but top-level shells still need clearer work queues and stronger drill paths.

**Patch needed**

- make top-level pages useful operational launchpads
- surface what is pending approval, payment, action, or follow-up
- tie everything back to project/site context where applicable

**Patch type**

`C`

**Severity**

`Medium`

---

## Section 7: Navigation, Labels, And Business Ownership

### 7.1 Some labels still do not reflect business truth

**Problem**

The app has already shown naming drift such as:

- wrong ownership grouping
- ambiguous completion/closure terms
- route names not matching user expectation

**Patch needed**

- audit sidebar labels and page titles for business-truth accuracy
- keep route ownership and naming aligned with real role responsibility

**Patch type**

`B`, `G`

**Severity**

`High`

---

### 7.2 Cards, shortcuts, and tabs must all be real navigation or explicit view-state

**Problem**

The frontend historically had fake or ambiguous shortcuts.

**Patch needed**

- every action card must go to a real route or a clearly managed view state
- no “looks clickable but is only local state confusion”

**Patch type**

`G`

**Severity**

`Medium`

---

## Section 8: UX Debt Still Worth Systematic Cleanup

### 8.1 Runtime crash resistance still needs strengthening

**Problem**

Several bugs found recently were not business-logic failures but brittle rendering assumptions.

**Patch needed**

- null-safe rendering
- response-shape normalization
- fallback labels
- no hook-order mistakes
- no direct `split`, `filter`, or map-on-unknown assumptions without guardrails

**Patch type**

`D`, `G`

**Severity**

`High`

---

### 8.2 Old browser-dialog and ad hoc feedback patterns must be fully eliminated

**Problem**

The app has had stray `alert`-style behavior and misleading inline messages.

**Patch needed**

- replace all browser-dialog leftovers
- use consistent inline banners/toasts/modals
- ensure error feedback names the real problem

**Patch type**

`G`

**Severity**

`Medium`

---

### 8.3 Form ergonomics still need cleanup

**Problem**

We have already seen:

- focus jumping to close buttons
- overlapping text/icon layouts
- missing fields in creation modals
- misleading optionality

**Patch needed**

- audit create/edit modals
- standardize focus behavior
- standardize header/action layout
- ensure forms expose all materially required business fields

**Patch type**

`G`, `D`

**Severity**

`Medium`

---

## Section 9: Immediate Priority Patch Order

If frontend work needs to be assigned now, the order should be:

1. **Context normalization follow-through**
   - survey
   - survey detail
   - DMS embeds
   - project activity / collaboration

2. **Role ownership cleanup**
   - PM vs PH route separation
   - role-correct sidebars
   - correct dashboard/workspace shells

3. **Project workspace hardening**
   - activity
   - dossier
   - approvals
   - files
   - site/object drilldown integrity

4. **PM operational surfaces**
   - requests
   - petty cash
   - inventory
   - survey submission
   - DPR / communication

5. **Module shell deepening**
   - procurement
   - inventory
   - execution wrappers
   - finance/hr top-level shells

6. **UX crash-proofing and consistency**
   - null guards
   - response normalization
   - consistent validation and action feedback

---

## Section 10: Definition Of Done For A Frontend Patch

A frontend patch is **not done** when:

- `npx tsc --noEmit` is green but the page still teaches the wrong business model
- the route renders but uses wrong role ownership
- the page works only when hidden upstream fields happen to be filled
- linked documents or accountability still require page-specific hacks
- a module page is still just a pretty report shell

A frontend patch **is done** only when:

- route ownership is correct
- page context follows the canonical spine
- actions are real and scoped
- DMS/accountability/collaboration work in context
- the user can trace project -> site -> stage -> record without guesswork
- the page survives imperfect data without crashing

---

## Short Instruction For Execution

When assigning frontend work, do **not** say:

- “clean this page up”
- “make this better”
- “polish survey”

Instead assign from this register in this format:

1. route or component
2. gap category
3. patch type
4. expected business truth after patch
5. acceptance check

That is how sideways work is prevented.
