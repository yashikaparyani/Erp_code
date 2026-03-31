# Remaining TODO

*Updated 2026-03-27.*

This is the current short-form patch list for the ERP app.

The detailed audit source is still `frontend_depth_closeout_plan.md`.
The cross-cutting blocker/risk list now lives in `elephant in the room.md`.

## Readiness Snapshot

- Core lifecycle detail depth is largely in place.
- Priority 1, Priority 2, and Priority 3 are done.
- Priority 4 is done for core lifecycle routes.
- The app is roughly in the `80-85% ready` range for serious internal use.
- The remaining work is now mostly consistency, shallow shells, and compiler cleanup rather than missing breadth.

## Immediate Patch Queue

### 1. Validate And Smoke The Newly Fixed API Route Batch

The TypeScript blocker batch is now clean.

- keep `npx tsc --noEmit` green after any new page/API work
- do a focused runtime smoke pass on the recently fixed routes:
  - `src/app/api/boqs/[id]/route.ts`
  - `src/app/api/engineering/change-requests/[id]/actions/route.ts`
  - `src/app/api/engineering/drawings/[id]/actions/route.ts`
  - `src/app/api/engineering/technical-deviations/[id]/actions/route.ts`
  - `src/app/api/estimates/[id]/actions/route.ts`
  - `src/app/api/finance/follow-ups/route.ts`
  - `src/app/api/overtime/[id]/route.ts`
  - `src/app/api/overtime/[id]/actions/route.ts`
  - `src/app/api/penalties/[id]/actions/route.ts`
  - `src/app/api/pm-requests/route.ts`
  - `src/app/api/pm-requests/[id]/route.ts`
  - `src/app/api/pm-requests/[id]/actions/route.ts`
  - `src/app/api/proformas/[id]/actions/route.ts`
  - `src/app/api/retention/[id]/route.ts`
  - `src/app/api/retention/[id]/actions/route.ts`
  - `src/app/api/technician-visits/[id]/route.ts`
  - `src/app/api/travel-logs/[id]/route.ts`
  - `src/app/api/travel-logs/[id]/actions/route.ts`
  - `src/app/pre-sales/bids/[id]/page.tsx`

## Product Gaps Still Open

### Cross-Module / Global

- `/` dashboard still needs live operational data instead of mostly static presentation
- `/reports` still needs real drilldowns and export/report packs
- `/documents` still needs stronger lifecycle embedding across more modules
- `/accountability` still needs more consistent deep linking from transactional pages
- `/notifications` still needs stronger object-level drilldown

### Procurement / Inventory

- `/procurement` is still list-heavy and not yet a strong project-first operating shell
- `/purchase-orders` top-level creation shell is still thin
- `/grns/[id]` is still read-only depth instead of fully workflow-complete
- `/inventory`, `/stock-position`, `/stock-aging` still need stronger operational drilldown
- `/project-manager/inventory` still needs to become a fuller project inventory cockpit

### Project / Workspace

- `/projects` still behaves more like routing than lifecycle triage
- `/projects/[id]` still has inconsistent depth across tabs
- `/projects/[id]/accountability` is useful but still not fully fed by all modules
- `/projects/[id]/dossier` is useful but not yet first-class everywhere it should be
- PM dashboard live data still remains open

### Engineering

- `/engineering/letter-of-submission` still needs full workflow depth
- `/engineering/projects` is still a shallow department project surface

### Execution

- `/execution/project-structure` still needs deeper third-click operational handling
- `/execution/comm-logs` is still shallow
- `/execution/projects/[id]` still needs stronger embedded object depth

### Finance

- `/finance` overview is still broad rather than deep
- `/finance/commercial` still needs cleanup and more object-depth consistency
- `/finance/customer-statement` is still report-style rather than workflow-deep
- `/finance/receivable-aging` is still list/report only
- `/finance/projects/[id]` still needs stronger embedded finance object depth

### HR

- `/hr` overview still needs stronger consistency
- `/hr/attendance` still has placeholder-backed swipe ingestion
- `/hr/approvals` is useful but still queue-first rather than journey-complete
- `/hr/operations` and `/hr/reports` remain broad shells
- `/hr/projects/[id]` still needs stronger HR object depth

### O&M / Pre-Sales / Admin

- `/om-helpdesk/projects/[id]` still needs deeper service object embedding
- pre-sales surfaces still need consistency:
  - `/pre-sales/dashboard`
  - `/pre-sales/tender`
  - `/pre-sales/bids`
- several settings/admin style routes are still shallow list/report pages:
  - `/master-data`
  - `/change-requests`
  - `/device-uptime`
  - `/manpower`
  - `/payment-receipts`
  - `/penalties`
  - `/retention`

## Final Validation Still Pending

### UAT Journey Audit

These journeys still need full user-level frontend validation:

- survey -> BOQ -> drawing -> indent -> comparison -> PO -> dispatch -> GRN -> inventory
- project inventory -> consumption -> DPR -> approval
- SLA ticket -> RMA -> SLA penalty -> waive or approve
- HR leave application -> approve -> attendance reconciliation

### Stability / Repo Hygiene

- keep `npx tsc --noEmit` clean after the next feature batch
- do a focused frontend smoke pass on the remaining shallow routes
- decide what to do with local repo-only clutter before any broad commit:
  - `.vscode/settings.json`
  - `scripts/`
- do not blindly commit the current deleted tender files without confirming intent

## File Decision

- `frontend_depth_closeout_plan.md` is still useful and should be kept
- there is no separate `frontend_depth.md` file in the repo right now
