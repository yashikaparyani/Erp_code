# Remaining Execution TODO

Date: 2026-03-20

## Current Readiness Snapshot

Based on the current codebase, Opus's recent committed changes through `75ce8fc`,
and the latest verification passes:

- overall SRS-aligned application-code readiness: `~83%`
- backend readiness: `~89%`
- frontend readiness: `~79%`
- database / schema readiness: `~86%`

This means the ERP is already real, but not yet comfortably “done”.
The remaining work is no longer broad invention.
It is mostly:

- final workflow depth
- alerts / reminders / collaboration
- DMS and approval rigor
- sharper PM / department workspace behavior
- commercial bookkeeping clarity
- runtime stability and final walkthrough discipline

## Main Remaining Gap Areas

The biggest remaining gaps are:

1. project workspace maturity
2. commercial lane completeness
3. alerts / reminders / collaboration
4. DMS and approval rigor
5. execution / commissioning / field-operational depth
6. final demo / implementation discipline

## Must Reach Before April 1

These are the items that matter most for implementation confidence.

### Yashika — Must Reach

- [x] Make pre-sales analytics materially more decision-useful than the earlier stub state
- [x] Tighten tender approval flow so state and action ownership are much clearer
- [ ] Make tender reminders meaningful for bid deadlines and commercial follow-up
- [x] Keep tender-to-project conversion payload stable and explicit
- [ ] Finalize costing ownership and costing UX in the commercial lane
- [ ] Finalize billing-side commercial visibility in the commercial lane
- [ ] Define operational bookkeeping model clearly:
  - customer
  - estimate / quote
  - costing
  - invoice / proforma
  - statement
  - receivables / payment follow-up
- [ ] Add customer statement / receivables view so quote-to-payment exposure is visible
- [x] Ensure live-backed competitor / compare-bidders / tender-result data and flows

### Akshat — Must Reach

- [ ] Make `/projects/[id]` feel like the real PM operating surface instead of just a strong scaffold
- [x] Establish department project iterations on top of the shared workspace model
- [ ] Tighten project/site/stage filtering where department lists still feel broader than intended
- [x] Implement RBAC-aware alerts / notifications for project-side events
- [x] Implement private reminders in project/site/stage context
- [x] Implement record-based collaboration through comments / mentions / audit-attached discussion
- [ ] Deepen DMS behavior in project context:
  - versioning
  - expiry visibility
  - linked docs in workspace context
- [ ] Sharpen execution / commissioning / field-progress surfaces so they feel operational
- [ ] Keep inventory separate in UX while preserving project/site linkage

### Shared — Must Reach

- [x] Keep the tender-to-project handoff materially cleaner and more stable than the earlier state
- [ ] Ensure no duplicated lifecycle ownership between commercial and execution lanes
- [ ] Keep role visibility and route behavior aligned with RBAC truth
- [ ] Do one guided role-based walkthrough end to end before implementation day

## Good To Reach If Time Allows

These matter, but they are not as critical as the must-reach set.

### Yashika — Good To Reach

- [ ] Add transaction-level comments and customer-context document exchange to commercial records
- [ ] Add better export / filtering behavior across pre-sales MIS and analytics
- [ ] Refine commercial dashboards so they feel bookkeeping-oriented, not only tender-funnel-oriented

### Akshat — Good To Reach

- [ ] Deepen SLA / penalty / O&M interactions
- [ ] Deepen RMA lifecycle beyond the current simplified path
- [x] Improve project activity feed richness and contextual deep-linking
- [ ] Make approval and override actions feel more unified across workspaces

### Shared — Good To Reach

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

1. shared project workspace maturity
2. commercial lane clarity
3. alerts / reminders / collaboration
4. DMS + approvals tightening
5. execution / commissioning sharpening
6. role-based walkthrough and bug fixing

## Reality Check After Opus Changes

The recent committed work materially improved these areas:

- pre-sales bid-management depth
- tender analytics and comparison pages
- tender approvals and tender workspace APIs
- RBAC pack architecture and settings surfaces
- department-wise project workspace scaffolding

The recent committed work did **not** fully finish these areas:

- PM-grade project workspace polish
- stable end-to-end alerts/reminders UX in the header/workspace
- bookkeeping-facing commercial lane
- truly mature DMS behavior
- final execution/I&C operational sharpness

## Final Rule

From here, avoid new broad scope.

Only prioritize work that does one of these:

- removes confusion
- increases workflow truth
- makes ownership clearer
- improves project/site/stage execution confidence
- improves implementation-day stability
