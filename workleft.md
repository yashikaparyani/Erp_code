# Remaining Execution TODO

Date: 2026-03-19

## Current Readiness Snapshot

Based on the current codebase and recent verification passes:

- overall SRS-aligned application-code readiness: `~80%`
- backend readiness: `~86%`
- frontend readiness: `~75%`
- database / schema readiness: `~83%`

This means the ERP is already real, but not yet comfortably "done".
The remaining work is no longer broad invention.
It is mostly:

- workflow depth
- alerts / reminders / collaboration
- DMS and approval rigor
- sharper project / department workspace behavior
- commercial bookkeeping clarity

## Main Remaining Gap Areas

The biggest remaining gaps are:

1. commercial lane completeness
2. project workspace maturity
3. alerts / reminders / collaboration
4. DMS and approval rigor
5. execution / commissioning / field-operational depth
6. final demo / implementation discipline

## Must Reach Before April 1

These are the items that matter most for implementation confidence.

### Yashika - Must Reach

- [x] Make pre-sales analytics decision-useful, not just data-heavy
- [x] Tighten tender approval flow so state and action ownership are obvious
- [x] Make tender reminders meaningful for bid deadlines and commercial follow-up
- [x] Keep tender-to-project conversion payload stable and explicit
- [x] Finalize costing ownership and costing UX in the commercial lane
- [x] Finalize billing-side commercial visibility in the commercial lane
- [x] Define operational bookkeeping model clearly:
  - customer
  - estimate / quote
  - costing
  - invoice / proforma
  - statement
  - receivables / payment follow-up
- [x] Add customer statement / receivables view so quote-to-payment exposure is visible
- [x] Ensure live-backed competitor / compare-bidders / tender-result data and flows

### Akshat - Must Reach

- [ ] Make `/projects/[id]` feel like the real PM operating surface
- [ ] Keep department project iterations aligned with the shared workspace model
- [ ] Tighten project/site/stage filtering where department lists still feel too broad
- [ ] Implement RBAC-aware alerts / notifications for project-side events
- [ ] Implement private reminders in project/site/stage context
- [ ] Implement record-based collaboration through comments / mentions / audit-attached discussion
- [ ] Deepen DMS behavior in project context:
  - versioning
  - expiry visibility
  - linked docs in workspace context
- [ ] Sharpen execution / commissioning / field-progress surfaces so they feel operational
- [ ] Keep inventory separate in UX while preserving project/site linkage

### Shared - Must Reach

- [ ] Keep the tender-to-project handoff clean and stable
- [ ] Ensure no duplicated lifecycle ownership between commercial and execution lanes
- [ ] Keep role visibility and route behavior aligned with RBAC truth
- [ ] Do one guided role-based walkthrough end to end before implementation day

## Good To Reach If Time Allows

These matter, but they are not as critical as the must-reach set.

### Yashika - Good To Reach

- [x] Add transaction-level comments and customer-context document exchange to commercial records
- [x] Add better export / filtering behavior across pre-sales MIS and analytics
- [x] Refine commercial dashboards so they feel bookkeeping-oriented, not only funnel-oriented

### Akshat - Good To Reach

- [ ] Deepen SLA / penalty / O&M interactions
- [ ] Deepen RMA lifecycle beyond the current simplified path
- [ ] Improve project activity feed richness and contextual deep-linking
- [ ] Make approval and override actions feel more unified across workspaces

### Shared - Good To Reach

- [ ] Better seeded project/site/stage demo data
- [ ] Stronger browser-level smoke coverage for the core journey
- [ ] Cleaner tracker doc consolidation

## Can Wait Until After April 1

These are useful, but should not steal focus now.

- [ ] fully polished customer portal behavior
- [ ] advanced chat-like collaboration beyond record comments
- [ ] broad report/export beautification beyond key operational needs
- [ ] deep financial edge cases not needed for the current implementation window
- [ ] non-essential UI refinement outside the core workspaces

## Execution Order

If the team wants the highest leverage path, do this in order:

1. commercial lane clarity
2. shared project workspace maturity
3. alerts / reminders / collaboration
4. DMS + approvals tightening
5. execution / commissioning sharpening
6. role-based walkthrough and bug fixing

## Final Rule

From here, avoid new broad scope.

Only prioritize work that does one of these:

- removes confusion
- increases workflow truth
- makes ownership clearer
- improves project/site/stage execution confidence
- improves implementation-day stability

## Changes Performed Till Now

### Finance Simplification

- Simplified the finance navigation so the core workflow is easier to follow.
- Removed newly added extra finance tabs that were not needed in the final bookkeeping model.
- Kept older existing finance tabs where they were already part of the earlier system.
- Removed the newly added credit note and debit note slice from frontend and backend.
- Removed the finance `Project Workspace` entry from the finance sidebar.

### Operational Bookkeeping Model

- Aligned the commercial lane clearly around:
  - customer
  - estimate / quote
  - costing
  - invoice / proforma
  - statement
  - receivables / payment follow-up
- Added customer statement and receivable aging visibility for quote-to-payment exposure.
- Made billing customer-aware and collection-gap aware.
- Made costing ownership, approver visibility, and next-step blockers visible.

### Pre-Sales Analytics and Workflow Tightening

- Upgraded company profile analytics from passive reporting to action-focused decision cards.
- Improved compare-bidders analytics with competitor pressure, pricing pressure, and live-result coverage gaps.
- Tightened the tender approval inbox with action owner, action hint, and aging visibility.
- Enriched tender reminders with reminder kind, priority, due-in-days, and action hint.
- Made tender-to-project conversion return an explicit conversion payload snapshot.
- Improved tender workspace to show conversion summary, approval ownership, and smarter reminders.
- Tightened the tender-result flow so linked vs unlinked result rows are clearly visible.

### Commercial Collaboration and MIS Refinement

- Added transaction-level comment capture for commercial records using record-linked comments across estimate, proforma, invoice, and payment follow-up records.
- Added customer-context document exchange through a dedicated commercial document register linked back to customer and record context.
- Refined the commercial hub so it reads like a bookkeeping dashboard with collection gap, customer exposure, and aging-led visibility.
- Added CSV export behavior to pre-sales MIS pages for finance MIS and sales MIS.
- Added analytics filtering and CSV export on company profile, compare-bidders, and competitor analysis so review screens are easier to use during decision-making.

### Smoke Test and Sanity Checks

- Ran frontend TypeScript sanity check successfully.
- Ran production Next.js build successfully after the latest changes.
- Verified the touched pre-sales and finance routes compile and build correctly.
- Backend runtime execution could not be fully exercised in Python/Frappe because this environment does not provide `python` / `py`, so backend verification was done through integrated frontend build flow and code-path sanity checks.
