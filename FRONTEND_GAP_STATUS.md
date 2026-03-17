# Frontend Gap Status

## Status

This file is now a frontend audit/reference document, not the canonical active tracker.

Use [TODO.md](/workspace/development/Erp_code/TODO.md) as the master current task list.

Keep this file for detailed notes on what was built, what remains partial, and which gaps were blocked by missing backend support.

## What Was Done

This round focused on verifying the `3A Missing Frontend Pages` research against the actual repo, then creating first-pass frontend pages for backend-supported modules that were truly missing.

### 1. Research Validation

The original research was **mostly correct**, but not 100% correct.

#### Not fully correct

- `3A.16 Device Uptime Logs`
  - Frontend page already existed at `/execution/commissioning/devices`
  - Uptime tab/section was already present

- `3A.19 Tender Organizations`
  - No standalone page exists
  - But the feature is already used inside pre-sales tender detail flow

- `3A.21` to `3A.25` HR modules
  - These were not fully missing
  - `/hr` page already existed
  - Real gap was that the page was summary/read-only and lacked CRUD/workflow UI

- `3A.17 Budget Allocations`
  - Backend/API support not found

- `3A.18 PDC Instruments`
  - Backend/API support not found

### 2. Generic Reusable UI Added

A reusable workspace component was added to avoid building every missing module from scratch in a different pattern:

- [OpsWorkspace.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/components/ops/OpsWorkspace.tsx)

This component supports:

- list view
- stats cards
- create modal
- action buttons
- backend wiring through `/api/ops`

### 3. Backend Connector Wiring Extended

The frontend `/api/ops` allowlist was expanded so newly exposed pages can actually call backend methods:

- [route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/ops/route.ts)

### 4. New Frontend Pages Added

These pages were added because backend support exists and the UI route was genuinely missing:

#### Procurement / Inventory

- `/purchase-orders`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/purchase-orders/page.tsx)
- `/grns`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/grns/page.tsx)
- `/indents`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/indents/page.tsx)
- `/stock-position`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/stock-position/page.tsx)
- `/stock-aging`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/stock-aging/page.tsx)
- `/petty-cash`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/petty-cash/page.tsx)

#### Execution

- `/milestones`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/milestones/page.tsx)
- `/manpower`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/manpower/page.tsx)
- `/execution/comm-logs`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/execution/comm-logs/page.tsx)

#### Finance

- `/finance/payment-receipts`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/finance/payment-receipts/page.tsx)
- `/finance/retention`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/finance/retention/page.tsx)
- `/finance/penalties`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/finance/penalties/page.tsx)

#### Engineering

- `/engineering/drawings`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/engineering/drawings/page.tsx)
- `/engineering/change-requests`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/engineering/change-requests/page.tsx)

#### Pre-Sales Analytics

- `/pre-sales/analytics/competitors`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/analytics/competitors/page.tsx)

#### HR Workflow Pages

- `/hr/onboarding`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/hr/onboarding/page.tsx)
- `/hr/attendance`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/hr/attendance/page.tsx)
- `/hr/travel-logs`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/hr/travel-logs/page.tsx)
- `/hr/overtime`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/hr/overtime/page.tsx)
- `/hr/technician-visits`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/hr/technician-visits/page.tsx)

#### SLA

- `/sla`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/sla/page.tsx)

### 5. Sidebar and Role Access Updated

Navigation and route access were updated so the new pages can be discovered:

- [Sidebar.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/components/Sidebar.tsx)
- [RoleContext.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/context/RoleContext.tsx)

## What Is Still Missing

The following gaps still remain after this round:

## 3B Dead Sidebar Links Status

The `Pre-Sales -> Analytics` submenu was audited against the actual frontend routes.

### Verified Dead Links

These links were dead and have now been created:

- `/pre-sales/analytics/company-profile`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/analytics/company-profile/page.tsx)
- `/pre-sales/analytics/tender-results`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/analytics/tender-results/page.tsx)
- `/pre-sales/analytics/mis-reports`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/analytics/mis-reports/page.tsx)
- `/pre-sales/analytics/compare-bidders`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/analytics/compare-bidders/page.tsx)
- `/pre-sales/analytics/missed-opportunity`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/analytics/missed-opportunity/page.tsx)

### Already Fixed Earlier

- `/pre-sales/analytics/competitors`
  - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/analytics/competitors/page.tsx)

### Outcome

The full `Pre-Sales -> Analytics` submenu is no longer dead. All six analytics links now resolve to working frontend pages.

## 3C Existing Pages Missing CRUD Status

This round focused on pages that already existed but were missing create/edit/delete/workflow actions.

### Implemented In This Round

- `/hr`
  - Added direct management shortcuts to:
    - `/hr/onboarding`
    - `/hr/attendance`
    - `/hr/travel-logs`
    - `/hr/overtime`
    - `/hr/technician-visits`
  - Result:
    - `/hr` is no longer only a dead-end summary page
    - It now acts as a dashboard + action gateway

- `/reports`
  - Added summary export button
  - Added drill-down links from report cards to operational pages

- `/documents`
  - Added create folder action
  - Added upload document modal using frontend POST proxy
  - Wired these through:
    - [documents/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/documents/route.ts)
    - [documents/folders/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/documents/folders/route.ts)

- `/pre-sales/tender`
  - Added `New Tender` button directly on the page
  - This makes tender creation available in both `/pre-sales` and `/pre-sales/tender`

- `/pre-sales/tender-result`
  - Added `New Result` modal
  - Added frontend POST/PATCH API support for tender result create/update

- `/pre-sales/approvals`
  - Added approve/reject buttons for wired approval types
  - Current direct workflow wiring is enabled for vendor comparison approvals

- `/pre-sales/documents/folders`
  - Replaced `console.log` folder creation stub with real create-folder call
  - Added rename folder action
  - Added delete folder action

- `/pre-sales/tender-task/*`
  - Added quick actions in shared board:
    - submit tender
    - drop tender
  - Wired through tender update API

- `/finance`
  - Added direct shortcuts to:
    - costing
    - billing
    - payment receipts

- `/execution`
  - Added `New DPR` modal
  - Added milestone shortcut from execution page

- `/rma`
  - Added workflow buttons:
    - approve
    - reject
    - mark in transit
    - close
  - Added frontend PATCH API support for RMA actions

- `/om-helpdesk`
  - Added ticket actions:
    - assign
    - escalate
    - comment
  - Added frontend PATCH API support for ticket workflow actions

- `/master-data`
  - Added party edit
  - Added party delete
  - Added organizations visibility/create in the same page
  - Added frontend PATCH/DELETE API support for parties

### Backend/API Proxies Added or Extended For 3C

- [tenders/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/tenders/route.ts)
  - added PATCH / DELETE
- [tender-results/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/tender-results/route.ts)
  - added POST / PATCH
- [documents/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/documents/route.ts)
  - added POST
- [documents/folders/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/documents/folders/route.ts)
  - added POST / PATCH / DELETE
- [parties/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/parties/route.ts)
  - added PATCH / DELETE
- [tickets/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/tickets/route.ts)
  - added workflow PATCH actions
- [rma-trackers/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/rma-trackers/route.ts)
  - added workflow PATCH actions
- [dprs/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/dprs/route.ts)
  - added PATCH / DELETE
- [approvals/route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/approvals/route.ts)
  - added PATCH for wired approval actions

### Still Partial / Not Fully Closed Yet

- `/hr`
  - Main page now links to CRUD pages, but inline CRUD for all 6 HR modules is still not embedded directly inside `/hr`

- `/pre-sales/approvals`
  - Vendor comparison approvals are wired
  - Other approval record types still need type-specific approve/reject wiring

- `/pre-sales/mis/*`
  - This round did not yet add full date-range filter controls + export UX directly inside MIS pages

- `/execution`
  - DPR create is added
  - DPR edit/delete inline UI is still not surfaced on the main execution page

- `/rma`
  - Some deeper lifecycle transitions are still simplified

- `/om-helpdesk`
  - Assign/escalate/comment are now available
  - Full ticket action spectrum is still broader in backend than current UI surface

- `/master-data`
  - Party edit/delete is wired
  - Organization create is visible
  - Organization edit/delete is still blocked because backend methods for those were not found

## 3D Stub / Partial Implementation Status

This round focused on the remaining routes that existed only as stubs or thin aliases.

### Implemented In This Round

- `/pre-sales/documents/folders`
  - Confirmed the old `console.log` create-folder stub is gone
  - Folder create now calls the real backend POST endpoint
  - Rename and delete actions are also available on the same page
  - Wiring lives in:
    - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/documents/folders/page.tsx)
    - [route.ts](/d:/erp%20final/Erp_code/erp_frontend/src/app/api/documents/folders/route.ts)

- `/engineering/boq`
  - Replaced the alias page that only re-rendered the broader engineering screen
  - Added an independent BOQ workspace with:
    - BOQ-specific header
    - approval queue
    - draft backlog
    - latest approved snapshot
    - full BOQ register with workflow actions
  - New implementation:
    - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/engineering/boq/page.tsx)

- `/engineering/survey`
  - Replaced the alias page that only re-rendered the generic survey module
  - Added an independent engineering survey workspace with:
    - engineering-specific framing
    - survey scheduling form
    - tender completion checker
    - pending attention list
    - filtered survey register with quick updates
  - New implementation:
    - [page.tsx](/d:/erp%20final/Erp_code/erp_frontend/src/app/engineering/survey/page.tsx)

### Outcome

- `3D.1` is closed
- `3D.2` is closed
- `3D.3` is closed

### A. Missing Because Backend/API Is Not Available

These cannot be completed properly from frontend alone:

- `3A.17 Budget Allocations`
  - DocType may exist, but backend API support was not found
  - Needs backend + frontend

- `3A.18 PDC Instruments`
  - DocType may exist, but backend API support was not found
  - Needs backend + frontend

### B. Present But Still First-Pass / Not Fully Rich Yet

These pages now exist and are wired, but they are still basic operational UIs and may need richer workflows:

- `Purchase Orders`
  - List page exists
  - `create_po_from_comparison` backend exists
  - Dedicated guided UI for “create PO from vendor comparison” is still minimal / not fully modeled

- `SLA`
  - Profile visibility exists
  - Full timer management, penalty-rule management, penalty record management, approve/reject/waive screens are not yet fully surfaced in a richer UI

- HR submodules
  - CRUD/workflow routes now exist
  - But `/hr` summary page itself is still separate from these deeper action pages
  - Additional in-page linking or cross-navigation can still be improved

### C. Not Missing, But Still Worth Improving

- `Tender Organizations`
  - Standalone page still does not exist
  - But feature is already embedded, so this is low priority

- `Device Uptime Logs`
  - Not missing
  - But if needed, its UX can still be refined

## Current Status By Category

### Verified as implemented now

- Purchase Orders
- GRNs
- Indents
- Stock Position
- Stock Aging
- Milestones
- Manpower Logs
- Petty Cash
- Payment Receipts
- Retention Ledger
- Penalty Deductions
- SLA Profiles basic page
- Drawings
- Change Requests
- Communication Logs
- Competitors page
- HR onboarding workflow page
- HR attendance page
- HR travel log page
- HR overtime page
- HR technician visit page

### Still blocked or partial

- Budget Allocations
- PDC Instruments
- Rich SLA full workflow UX
- Rich guided Purchase Order creation flow

## Validation

Type-check passed after these changes:

- `npx.cmd tsc --noEmit`
