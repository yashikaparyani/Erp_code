# Elephant In The Room

*Updated 2026-03-28.*

This file is for the bigger issues that should shape the final patch wave.

It is not the place for small route-by-route cleanup.
It is the place for the things that can make the app feel "almost done" while still being structurally unsafe, inconsistent, or incomplete.

For the concrete implementation shape of the PH approval/disbursement chain, see:

- `all mds/project_head_approval_hub_spec.md`

## Why This File Exists

- some modules were intentionally omitted from the recent depth push
- some issues are not local page bugs but system-shape problems
- the final closeout should solve these together, not as scattered patchlets

## The Big Issues

## 1. RBAC Model Is Still Not Fully Coherent

Two problems are especially important:

- `Project Manager` capability seeding suggests a mostly read-scoped role in engineering, procurement, and execution, but several DocType permission JSONs still give direct `create` / `write` / `delete`
- route RBAC is fail-open for any frontend route that is not added to `MODULE_ROUTE_MAP`

Why this matters:

- frontend restrictions can become misleading if backend/document permissions are broader
- a newly added route can silently ship without real gating
- final UAT can pass on happy paths while the authorization model is still internally inconsistent

Final patch expectation:

- align DocType permissions with intended capability model
- keep explicit Python-side business guards where needed
- make route gating fail-closed except for an explicit public/open allowlist
- audit all important routes against `MODULE_ROUTE_MAP`

## 2. Some Modules Still Exist As Shells, Not Operating Surfaces

The app now has strong breadth and many strong detail pages, but several areas still feel like wrappers, dashboards, or list shells instead of true work surfaces.

Examples:

- `/`
- `/reports`
- `/notifications`
- `/procurement`
- `/inventory`
- `/projects`
- `/engineering/letter-of-submission`
- `/execution/project-structure`
- `/execution/comm-logs`
- `/finance`
- `/finance/commercial`
- `/finance/customer-statement`
- `/finance/receivable-aging`
- `/hr`
- `/hr/attendance`
- `/hr/approvals`
- `/hr/reports`
- `/pre-sales/dashboard`
- `/pre-sales/tender`
- `/pre-sales/bids`

Why this matters:

- the app can look complete in navigation but still feel shallow in live use
- final patching should target lifecycle-complete work surfaces, not just route presence

## 3. Project-Scoped Truth Is Still Uneven

The ERP idea is now much clearer, but the project spine is still not uniformly enforced.

Symptoms:

- some pages are strongly project-linked while others still behave as flat department pages
- dossier and accountability are present, but not yet equally first-class everywhere
- project workspace depth is inconsistent across tabs and departments

Why this matters:

- users should be able to answer "what is happening on this project/site/object?" from one coherent chain
- without this, departments still feel partially siloed

Final patch expectation:

- tighten `project -> site -> object -> documents -> accountability -> downstream effects`
- make project pages true operating hubs, not routing shells

## 4. Workflow Depth Is Strong In Spots, But Not Uniform

A lot of important records now have detail pages and structured actions.
That is real progress.
But the app is not yet uniformly deep across all lifecycle objects.

Remaining weak patterns:

- list-first routes with thin second-click depth
- read-only detail where an operational workflow is expected
- report pages that do not lead into real drilldown and action context

Why this matters:

- users experience the app as uneven
- strong modules raise the standard, which makes shallow modules feel more broken than before

## 5. Project Head Completion Workflow Is Currently Modeled Too Crudely

Recent business clarification changes the expected post-delivery flow materially.

The app currently treats the Project Head flow as one generic `LOC` path.
That is no longer good enough.

### Actual business rule

- if tender is `I&C only`:
  - Project Head issues `Go Live Certificate`
  - Project Head also issues `Letter of Completion`
- if tender is `I&C + O&M`:
  - at I&C finish, Project Head issues only `Go Live Certificate`
  - project then enters `Exit Management / Knowledge Transfer`
  - at final O&M closure, Project Head issues `Letter of Handover of Operations`

### Important implications

- `Letter of Completion` is not the universal final artifact
- `Go Live Certificate` must be modeled as its own Project Head artifact
- `Exit Management / Knowledge Transfer` must exist as an explicit stage/work surface for mixed-scope tenders
- `Letter of Handover of Operations` must exist as the final Project Head artifact for tenders that include O&M
- artifact visibility and allowed actions must branch by tender scope, not just by a generic nearing-tenure rule

### What is wrong right now

- the current app still collapses this into one `LOC` request/submission cycle
- the current naming has already drifted between `Letter of Submission`, `LOC`, and `Letter of Completion`
- the current backend trigger logic still uses a simple LOC-window rule tied to tenure proximity
- the current Project Head surface does not distinguish:
  - I&C-only closeout
  - I&C go-live with downstream O&M
  - exit management / KT
  - final operational handover

### Final patch expectation

- create one clean `Project Head` operating area for closeout artifacts
- model these as separate objects / actions:
  - `Go Live Certificate`
  - `Letter of Completion`
  - `Exit Management / KT`
  - `Letter of Handover of Operations`
- make tender scope decide which path is available:
  - `I&C only` -> `Go Live Certificate` + `Letter of Completion`
  - `I&C + O&M` -> `Go Live Certificate` -> `Exit Management / KT` -> `Letter of Handover of Operations`
- reflect these stages in navigation, dashboards, alerts, project workspace context, and final closure logic
- remove ambiguous terminology such as `Letter of Submission`
- ensure the final UI never implies that O&M-inclusive tenders close through the same document path as I&C-only tenders

## 6. “Compiler Green” Is Better, But Runtime Proof Is Still Incomplete

The recent TypeScript blocker batch is now clean, but compile success is not the same as operational confidence.

Still needed:

- focused smoke of the recently repaired API route batch
- end-to-end validation of the incomplete route families
- cross-role runtime verification on important approval/mutation flows

Why this matters:

- the final patch should not stop at code correctness
- it should prove behavior under real role and project context

## 7. Project Head Financial Control Chain Is Still Under-Modeled

Another important business clarification:

- RMA approval belongs to `Project Head`
- PO approval belongs to `Project Head`
- petty cash dispensation belongs to `Project Head`
- if a purchase PO or RMA-linked PO is raised, costing should release money only after Project Head approval

This should stay simple in the product model:

- purchase department finalizes a PO and sends it to PH for approval
- RMA flow raises its own PO-like approval item and sends it to PH
- Project Manager raises petty cash requests and sends them to PH
- after PH approval, a new costing / finance queue entry should appear for disbursement or release

### Actual control expectation

- operational demand may originate in purchase, RMA, project, or department flows
- approval responsibility still sits with `Project Head`
- `Costing` is the disbursement layer, not the primary sanctioning authority
- money movement should be downstream of PH approval, not parallel to it
- PH approval should create the downstream costing work item rather than expecting costing to poll or infer approval state

### Preferred frontend shape

- one `Approval` tab under `Project Head`
- three sub-tabs:
  - `PO`
  - `RMA PO`
  - `Petty Cash Requests`
- every item should show the same control chain:
  - raised by origin team
  - pending PH approval
  - approved / rejected by PH
  - costing queue entry created after approval
  - costing disbursement status

### What is wrong right now

- some screens still imply department-local approval or direct action without a visible Project Head checkpoint
- petty cash, PO, and RMA flows do not yet read as one common sanction-and-disbursement chain
- costing / finance linkage is present in places but not consistently modeled as post-approval release control
- there is no clear product pattern yet where PH approval generates a new costing-side actionable entry such as "PH approved PO-xxxx"

### Final patch expectation

- make one PH-owned approval inbox instead of scattered approval entry points
- use the three sub-tabs as the canonical approval surfaces:
  - `PO`
  - `RMA PO`
  - `Petty Cash Requests`
- make `Project Head` the visible sanctioning authority for all three
- make `Costing` / finance release conditional on PH-approved state
- create a costing-side inbox / queue entry when PH approves:
  - `PH approved PO ...`
  - `PH approved RMA PO ...`
  - `PH approved petty cash request ...`
- ensure PO, RMA, and petty cash detail pages link into the same PH approval chain
- reflect this same state in dashboards, alerts, and accountability timelines
- avoid mixed signals where one module shows PH approval but another implies direct department release

## 8. UAT Journey Closure Is Still Not Done

The real standard is still journey completion, not route completion.

Critical journeys still need full closure:

- survey -> BOQ -> drawing -> indent -> comparison -> PO -> dispatch -> GRN -> inventory
- project inventory -> consumption -> DPR -> approval
- SLA ticket -> RMA -> SLA penalty -> waive or approve
- HR leave application -> approve -> attendance reconciliation

Why this matters:

- this is where hidden handoff gaps show up
- this is the difference between demo-ready and operator-ready

## 9. Documentation And Repo Shape Are Cleaner, But Final Closure Still Needs One Truth

We already removed a lot of redundant docs.
That helped.
But the final patch wave should end with one honest closure state:

- one active strategic risk doc
- one active tactical todo doc
- one detailed audit source
- no stale "100% complete" language if major gaps still exist

## Final Patch Wave Principle

The final patch should not be:

- one more batch of disconnected route fixes
- one more shallow visual polish pass
- one more "almost done" commit

The final patch should be:

- security-consistent
- route-gating-consistent
- project-spine-consistent
- lifecycle-complete on omitted modules
- smoke-verified and UAT-backed

## Done Means

This file can be retired only when all of the following are true:

- no important role model contradiction remains between seeded capability intent and document/API permissions
- no new frontend route can ship ungated by accident
- omitted modules are brought up to the same depth standard as the strong modules
- project, dossier, and accountability views feel like one system instead of helpful sidecars
- core journeys are proven end-to-end from frontend
- remaining docs describe reality instead of optimism
