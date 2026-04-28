# CRM / ERP / Insights Migration Audit

Date: 2026-04-27

## Summary

This codebase has grown a large custom surface area:

- `190` frontend pages
- `310` frontend API routes
- `113` custom doctypes
- `23` project workspace components

The app is now large enough that standardization will reduce maintenance cost, especially for:

- supplier master
- inventory and stock reporting
- dashboard and report pages
- generic CRM-style relationship tracking

The recommendation is not a rewrite.

The recommended split is:

- `Frappe CRM` for lead, deal, contact, organization, and pre-tender relationship management
- `ERPNext` for procurement, suppliers, inventory, warehouses, receipts, requests, and stock movement
- `Frappe Insights` for read-only dashboards and report galleries
- `Custom gov_erp app` for tendering, bid governance, EMD/PBG, project spine, accountability, and site-execution workflows

## Decision Rules

Use these buckets for each page or module:

- `Replace with standard`: standard product should become the primary UI and source of truth
- `Thin overlay`: keep a light custom UI, but rebase the data model and transactions on standard docs
- `Keep custom`: process is too domain-specific to fit standard CRM/ERP cleanly

## Product Fit

### Frappe CRM

Best fit:

- leads
- deals
- contacts
- organizations
- notes
- follow-ups
- calls / WhatsApp / activities

Use Frappe CRM before a real tender is created.

Do not try to force tender governance, technical qualification, EMD/PBG handling, or bid lifecycle into CRM.

### ERPNext

Best fit:

- suppliers
- items
- warehouses
- stock movement
- material requests
- purchase flows
- goods receipt / purchase receipt
- stock reports

ERPNext should become the source of truth for procurement and inventory records.

### Frappe Insights

Best fit:

- dashboards
- KPI boards
- exports
- report galleries
- cross-module analytics

If a page is mostly filters + tables + summary cards + export buttons, it is a strong Insights candidate.

## Audit By Area

### Pre-Sales

#### Keep Custom

These pages are specialized tender and bid workflows, not generic CRM:

- `erp_frontend/src/app/pre-sales/dashboard/page.tsx`
- `erp_frontend/src/app/pre-sales/tenders/page.tsx`
- `erp_frontend/src/app/pre-sales/[id]/page.tsx`
- `erp_frontend/src/app/pre-sales/approvals/page.tsx`
- `erp_frontend/src/app/pre-sales/bids/page.tsx`
- `erp_frontend/src/app/pre-sales/bids/[id]/page.tsx`
- `erp_frontend/src/app/pre-sales/won-bids/page.tsx`
- `erp_frontend/src/app/pre-sales/in-process-bid/page.tsx`
- `erp_frontend/src/app/pre-sales/cancel-bid/page.tsx`
- `erp_frontend/src/app/pre-sales/emd-tracking/page.tsx`
- `erp_frontend/src/app/pre-sales/emd-tracking/[id]/page.tsx`

Why keep custom:

- tender funnel and lifecycle
- go/no-go workflow
- technical qualification and rejection reasoning
- bid outcome management
- EMD/PBG tracking
- contract-to-project transition
- tender-linked document control

#### Thin Overlay

- `erp_frontend/src/app/pre-sales/reminders/page.tsx`
- `erp_frontend/src/app/pre-sales/competitors/page.tsx`
- `erp_frontend/src/app/pre-sales/documents/page.tsx`
- `erp_frontend/src/app/pre-sales/documents/briefcase/page.tsx`
- `erp_frontend/src/app/pre-sales/documents/folders/page.tsx`

Why thin overlay:

- reminders can lean on standard tasks / reminders
- competitors can remain small and custom without driving the whole presales architecture
- documents should move closer to standard document/versioning models

#### Replace With Standard

No current tender-stage page should be fully replaced by Frappe CRM.

Instead, add a new upstream CRM stage:

- lead
- organization
- contact
- opportunity / deal
- communication history

Only convert from CRM into your custom tender workflow when an actual tender opportunity is ready.

### Procurement

#### Replace With Standard

- `erp_frontend/src/app/procurement/suppliers/page.tsx`

Target:

- ERPNext `Supplier`

Why:

- supplier master data is standard ERP territory
- keeping a parallel supplier CRUD adds unnecessary maintenance

#### Thin Overlay

- `erp_frontend/src/app/procurement/page.tsx`
- `erp_frontend/src/app/procurement/projects/page.tsx`
- `erp_frontend/src/app/procurement/projects/[id]/page.tsx`

Target:

- ERPNext purchasing docs underneath
- custom project-aware comparison / approval overlay on top

Why:

- vendor comparison is still useful as a custom decision layer
- but supplier master, purchasing transactions, and downstream inventory links should be standard
- project workspace views are still valuable as contextual overlays

### Inventory / Logistics

#### Replace With Standard

- `erp_frontend/src/app/stock-position/page.tsx`
- `erp_frontend/src/app/stock-aging/page.tsx`

Target:

- ERPNext stock reports
- or Frappe Insights dashboards built on ERPNext inventory data

Why:

- these are classic reporting surfaces
- custom maintenance here is usually not worth it

#### Thin Overlay

- `erp_frontend/src/app/indents/page.tsx`
- `erp_frontend/src/app/indents/[id]/page.tsx`
- `erp_frontend/src/app/grns/page.tsx`
- `erp_frontend/src/app/grns/[id]/page.tsx`
- `erp_frontend/src/app/dispatch-challans/page.tsx`
- `erp_frontend/src/app/dispatch-challans/[id]/page.tsx`
- `erp_frontend/src/app/inventory/page.tsx`
- `erp_frontend/src/app/inventory/[id]/page.tsx`
- `erp_frontend/src/app/project-manager/inventory/page.tsx`

Target:

- ERPNext `Material Request`
- ERPNext stock movement docs
- ERPNext `Purchase Receipt` / stock receipt flows
- custom project/site handoff logic only where needed

Why:

- the operational process is real
- but the source transaction docs should be standard
- keep only the project/site-specific closure and audit layer custom

### Reporting / Dashboards

#### Replace With Standard

- `erp_frontend/src/app/reports/page.tsx`
- `erp_frontend/src/app/hr/reports/page.tsx`
- dashboard-style API surfaces under `src/app/api/dashboards`
- director performance reporting under `src/app/api/director`
- summary dashboards that are mostly read-only

Target:

- Frappe Insights

Why:

- these pages are mostly filters, cards, tables, and exports
- that is exactly what Insights is good at
- reporting should not continue expanding as custom frontend pages unless it drives workflow actions

#### Keep Custom

Keep any page that is both a dashboard and an action surface.

Example rule:

- if users only view/analyze data: move to Insights
- if users approve, reject, submit, revise, or progress workflow: keep in app UI

## Recommended End-State Architecture

### Layer 1: Frappe CRM

Use for:

- prospecting
- account tracking
- contact management
- communications
- early-stage opportunity management

Handoff point:

- when an opportunity turns into a governed tender

### Layer 2: Custom Tendering App

Use for:

- tender registration
- funnel management
- go/no-go decisions
- technical/commercial qualification
- bid management
- EMD/PBG
- approval lifecycle
- tender-to-project conversion

### Layer 3: ERPNext Procurement + Inventory

Use for:

- supplier master
- item master
- warehouses
- indents / material requests
- receipts
- stock transfers and dispatch-related inventory records
- stock valuation and standard inventory reports

### Layer 4: Project Spine / Execution Custom App

Use for:

- project workspaces
- site-stage workflows
- department-lane visibility
- accountability and closeout
- site-linked operational overlays

### Layer 5: Insights

Use for:

- leadership dashboards
- HR reports
- stock analytics
- presales summaries
- procurement summaries
- cross-functional KPIs

## Priority Order

### Phase 1

- replace supplier master with ERPNext `Supplier`
- move stock position and stock aging out of custom UI
- stop adding new custom reporting pages where Insights can handle them

### Phase 2

- map indents to ERPNext `Material Request`
- map GRN flows to ERPNext receipt docs
- rebase dispatch / logistics screens onto ERPNext stock transactions while keeping project/site-specific closure custom

### Phase 3

- introduce Frappe CRM for lead / deal / contact
- define a formal conversion path from CRM opportunity to custom tender record

### Phase 4

- reduce reporting APIs by moving KPI and tabular surfaces into Insights
- keep only action-heavy operational pages in the custom frontend

## Practical Rules For Future Development

- Do not create a custom CRUD page if ERPNext or CRM already provides the record lifecycle cleanly.
- Do not create a custom dashboard page if the page is mainly read-only and export-driven.
- Keep custom UI only when the workflow itself is unique, regulated, or deeply tied to your project-spine model.
- Prefer a project-aware overlay over a parallel custom data model.

## Final Recommendation

Adopt a hybrid model:

- `Frappe CRM` for pre-tender relationship management
- `ERPNext` for procurement and inventory truth
- `Frappe Insights` for analytics
- keep tendering and project-spine workflows custom

This gives you standardization where the process is generic, while preserving the parts of the product that are actually your operational differentiator.
