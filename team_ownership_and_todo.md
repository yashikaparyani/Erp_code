# Team Ownership And TODO

## Purpose

This file fixes delivery ownership so implementation does not drift.

The split is:

- `Yashika` owns the commercial lane
- `Akshat` owns the execution and operational-delivery lane

This is an execution split, not a business-boundary contradiction.
The same ERP still shares one project truth, but ownership is divided by lane.

## Ownership Split

## Yashika Tab

Yashika owns the commercial lane end-to-end.

This includes pre-sales, costing, billing visibility, and operational bookkeeping logic.

This includes:

- Tender intake
- Tender workspace
- Sales/customer bookkeeping surface
- Costing
- Billing-side commercial visibility
- Operational bookkeeping surface
- Tender reminders
- Tender result tracking
- Competitor analysis
- Compare bidders
- Company profile analysis
- Missed opportunity analysis
- Pre-sales approvals
- Pre-sales MIS
- Pre-sales finance requests linked to bid preparation
- Survey linkage where it is still part of tender preparation
- Conversion trigger from tender to project

### Commercial bookkeeping expectation

The commercial lane should not behave like a loose lead tracker only.

It should feel closer to a Zoho Books-style quote-to-cash bookkeeping layer for the commercial and bookkeeping side.

That means Yashika's area should eventually cover:

- customer / client master handling
- quotes / estimates
- sales orders or equivalent commercial intent records if needed
- costing records and commercial calculation trace
- invoices / proforma or bid-linked commercial documents where relevant
- credit note / adjustment thinking where applicable
- customer statements / receivables visibility
- payment follow-up visibility
- billing status visibility
- operational bookkeeping views over commercial records
- customer-facing portal or portal-like visibility later if in scope
- transaction comments / document exchange with customer context

The goal is not to clone Zoho Books fully.
The goal is to make the commercial bookkeeping feel disciplined, transparent, and account-statement-aware instead of just "tender pages".

### Yashika-owned frontend areas

- `/pre-sales`
- `/pre-sales/tender`
- `/pre-sales/[id]`
- `/pre-sales/tender-result`
- `/pre-sales/approvals`
- `/pre-sales/analytics/*`
- `/pre-sales/mis/*`
- `/pre-sales/finance/*`
- `/finance/costing`
- `/finance/billing`
- commercial bookkeeping / statement / receivables views when added

### Yashika-owned backend concerns

- Tender lifecycle APIs
- Tender approval flow
- Tender reminder flow
- Tender analytics / competitor / result APIs
- Tender-to-project conversion readiness rules
- Costing logic and costing-facing workflows
- Billing-facing commercial workflows
- Bookkeeping / receivables / commercial statement logic
- Bid-oriented dashboards and reports

### Yashika does not own

- Inventory / GRN / dispatch / stores
- DPR / commissioning / execution blockers
- execution / commissioning / field-delivery logic
- O&M / RMA operational workflows
- global RBAC engine except where commercial roles need mapping

## Akshat Tab

Akshat owns execution and operational-delivery implementation after the commercial lane hands off into project execution.

This includes:

- Project spine
- Site execution model
- Department-wise project iterations
- Engineering workspace
- Procurement workspace
- Inventory / stores workflow
- Execution / I&C workspace
- Retention / penalties where tied to execution-state enforcement
- HR / manpower in project context
- O&M / SLA / RMA
- DMS in project context
- shared project workspace
- RBAC pack model
- route / nav / tab / action enforcement
- audit and permission traceability
- alerts / reminders / collaboration in project context

### Akshat-owned frontend areas

- `/projects`
- `/projects/[id]`
- `/engineering/projects/*`
- `/procurement/projects/*`
- `/execution/projects/*`
- `/finance/projects/*`
- `/hr/projects/*`
- `/om-helpdesk/projects/*`
- `/inventory`
- `/settings/*` for RBAC, roles, permissions, user context, audit

### Akshat-owned backend concerns

- Project, site, stage and workspace APIs
- Department spine views
- Dependency engine
- Workflow controls and approvals after conversion
- Inventory/store integration
- Project-side DMS and audit
- Permission engine / pack model / user context / audit log
- Alerts / reminders / comments model for project-side collaboration

### Akshat does not own

- Tender analytics ideation
- Competitor intelligence UX
- Bid-funnel visualization
- costing/billing/bookkeeping ownership
- commercial statement and receivables UX

## Interface Between Yashika And Akshat

The handoff boundary is not "all of finance" vs "all of projects".
It is:

- commercial lane to execution lane
- tender conversion and post-conversion project activation
- costing / billing truth stays commercially owned, but execution uses it

At that point:

- Yashika hands over clean project-conversion payload and commercial context
- Akshat owns project creation, site structure, stage progression, and downstream departmental execution

### Required handoff data

The handoff should include:

- tender id / tender number
- client / organization
- project name
- project type
- expected value / commercial context
- costing context
- billing / commercial milestone context if available
- total sites / site seed information if known
- key dates
- key documents
- project head / PM assignment if known

## Do Not Blur These Boundaries

Avoid these mistakes:

- do not rebuild project execution logic inside pre-sales pages
- do not pull tender analytics into project workspace unnecessarily
- do not make project-side departments depend on pre-sales UI state
- do not split costing / billing truth across two owners
- do not let both people edit the same lifecycle ownership area casually

## TODO

## Yashika TODO

- [ ] Finalize pre-sales analytics pages so they are client-useful, not just visually dense
- [ ] Tighten tender approval flow and approval-state clarity
- [ ] Make tender reminders meaningful and correctly tied to bid deadlines
- [ ] Ensure competitor, compare-bidders, and result pages use live-backed data only
- [ ] Keep conversion-to-project handoff payload explicit and stable
- [ ] Keep costing and billing ownership commercially coherent even after project conversion
- [ ] Verify presales roles: `Presales Tendering Head`, `Presales Executive`, and Director visibility in bid workflow
- [ ] Define the sales bookkeeping model in a Zoho Books-style direction: customer master, quote/estimate, invoice/proforma, statement, payment follow-up
- [ ] Decide which commercial records stay with Yashika after conversion: costing, billing, statements, receivables, bookkeeping
- [ ] Build a customer statement / receivables view so sales can see quote-to-payment exposure clearly
- [ ] Add transaction-level comments and document exchange in customer/commercial records where relevant
- [ ] Keep sales bookkeeping transparent and ledger-like in UX, not just dashboard-card driven
- [ ] Own costing UX, billing visibility, and operational bookkeeping flows as one commercial lane

## Akshat TODO

- [ ] Strengthen project workspace into the primary PM operating surface
- [ ] Keep department project iterations aligned to the shared workspace model
- [ ] Tighten project/site/stage behavior where department lists still feel too broad
- [ ] Implement alerts / notifications with RBAC-aware delivery
- [ ] Implement private reminders tied to project / site / stage context
- [ ] Implement record-based collaboration using comments / mentions / audit trails
- [ ] Deepen DMS behavior in project context
- [ ] Keep inventory separate in UX but properly linked to projects and sites
- [ ] Continue hardening RBAC packs, user context, route enforcement, and audit

## Shared TODO

- [ ] Keep conversion boundary clean: pre-sales ends, project execution begins
- [ ] Keep naming, statuses, and IDs stable across the handoff
- [ ] Avoid duplicate implementation of the same lifecycle step in two places
- [ ] Review April 1 demo / implementation path against this ownership split before new work is started

## Final Rule

If a feature belongs to:

- commercial preparation, costing, billing, bookkeeping, receivables, tender-side intelligence -> `Yashika`
- project execution, site progress, departments-in-delivery, inventory, field operations, O&M execution -> `Akshat`

That is the working rule until explicitly changed.
