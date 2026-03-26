# Project Manager Workspace Spec

Date: 2026-03-24

## Purpose

This document no longer describes only the ideal target.

It now records:

1. the current database condition
2. the current backend code condition
3. the current frontend code condition
4. the current frontend runtime condition
5. the gap between current implementation and the intended PM/PH operating model

The main reason for this rewrite is that earlier versions overstated the PM workspace as if it already existed in a rich project-centric form.

That is not the current truth.

Also, this document now distinguishes between:

- what exists in code
- what is actually visible in the running app

Those are not the same right now.

## High-Level Reality

The current implementation has already moved away from giving `Project Manager` the same broad project surface as `Project Head`.

But it has not yet landed on the originally described rich PM project workspace either.

So the current state is:

- `Project Head` has a broad project / governance dashboard and wider cross-project visibility
- `Project Manager` has some narrowed project-scoped code paths on disk
- the shared rich project workspace still exists in the product, but it is not currently the primary PM experience

But runtime behavior is still inconsistent.

That distinction is critical.

## Target Operating Model

The business interpretation remains:

- `Project Head` = approval / governance / supervisory layer over multiple PMs
- `Project Manager` = project-level coordinator and operator
- central specialist teams = Engineering, Procurement, Finance, I&C, HR

PM should not own HQ specialist systems.

PM should own project-side coordination and submissions such as:

- survey submission to Engineering
- project-side receiving / GRN follow-through
- project inventory maintenance
- material consumption reporting
- DPR / progress reporting
- petty cash usage within thresholds
- formal requests to Project Head

## Current Condition Audit

## 1. Database Condition

## 1.1 PM-Specific Schema That Exists

The database model now includes PM-specific or PM-relevant DocTypes for the narrowed project-side flow:

- `GE Project Inventory`
- `GE Material Consumption Report`
- `GE PM Request`
- `GE Petty Cash`
- `GE DPR`
- `GE Project Issue`
- `GE Project Staffing Assignment`

These models are already present in the codebase under:

- [ge_project_inventory.json](/workspace/development/Erp_code/backend/gov_erp/gov_erp/gov_erp/doctype/ge_project_inventory/ge_project_inventory.json)
- [ge_material_consumption_report.json](/workspace/development/Erp_code/backend/gov_erp/gov_erp/gov_erp/doctype/ge_material_consumption_report/ge_material_consumption_report.json)
- [ge_pm_request.json](/workspace/development/Erp_code/backend/gov_erp/gov_erp/gov_erp/doctype/ge_pm_request/ge_pm_request.json)
- [ge_petty_cash.json](/workspace/development/Erp_code/backend/gov_erp/gov_erp/gov_erp/doctype/ge_petty_cash/ge_petty_cash.json)
- [ge_dpr.json](/workspace/development/Erp_code/backend/gov_erp/gov_erp/gov_erp/doctype/ge_dpr/ge_dpr.json)

## 1.2 What This Means

The schema already supports the narrower PM model better than the older broad shared-project model.

In particular:

- `GE Project Inventory` supports project-level stock truth
- `GE Material Consumption Report` supports project-level consumption reporting
- `GE DPR` supports PM-to-PH progress reporting
- `GE PM Request` supports PM-to-PH formal escalation / approval flows
- `GE Petty Cash` already exists as a project-linked operational record

## 1.3 Important Database Caveat

Live row-count validation from the shell was not fully available in this pass because the MariaDB host name used by the bench site was not resolvable from this execution context.

So this section is a schema-condition audit, not a fully live row-count audit.

That said, the important architectural truth is still clear:

- the database already contains PM-side supporting models
- but the database model is still mixed with older broad `Project Manager` permissions on many legacy DocTypes

## 1.4 Database Verdict

Database readiness is `partial but structurally supportive`.

The schema is not the main blocker anymore.
The bigger blockers are backend permission consistency and frontend workspace shape.

## 2. Backend Code Condition

## 2.1 PM Role Narrowing Exists

The backend now contains explicit PM project-scope helpers in:

- [api.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/api.py)

Key helpers:

- `_get_project_manager_assigned_projects()`
- `_apply_project_manager_project_filter(...)`
- `_ensure_project_manager_project_scope(...)`

These helpers are the current backbone for restricting PM activity to assigned projects only.

## 2.2 PM-Specific Working APIs Exist

The backend already exposes PM-side APIs for the narrowed coordination model:

- `get_project_inventory_records`
- `record_project_inventory_receipt`
- `get_material_consumption_reports`
- `create_material_consumption_report`
- `get_project_receiving_summary`
- `get_dprs`
- `get_dpr`
- `create_dpr`
- `update_dpr`
- `delete_dpr`
- `get_dpr_stats`
- petty cash CRUD with assigned-project enforcement
- PM request workflow methods for submit / approve / reject / withdraw

Relevant backend source:

- [api.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/api.py)

## 2.3 PM Route Truth Has Been Tightened

The route-gating layer currently denies PM access to broad shared HQ-style surfaces in:

- [permission_engine.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/permission_engine.py)

The deny list for `Project Manager` explicitly includes:

- `/projects`
- `/procurement`
- `/inventory`
- `/grns`
- `/petty-cash`
- `/documents`
- `/reports`
- `/execution`
- `/engineering`
- `/milestones`
- `/manpower`
- `/purchase-orders`
- `/indents`

This is why the current PM design is no longer the broad shared project workspace.

## 2.4 RBAC Seed Still Shows Architectural Drift

The backend seed still grants PM broad module capabilities by module family in:

- [rbac_seed.py](/workspace/development/Erp_code/backend/gov_erp/gov_erp/rbac_seed.py)

Current PM mappings still include:

- `project_command`
- `engineering`
- `procurement`
- `inventory`
- `execution_ic`
- `dms`
- `reports`

all at `assigned_project` scope.

So the backend currently has two overlapping truths:

1. route truth is narrowed hard
2. module capability seed still carries older broad PM assumptions

That is one of the main reasons PM behavior feels inconsistent.

## 2.5 Legacy DocType Permission Drift Still Exists

Many DocType JSONs still include `Project Manager` in role permissions for broader records such as:

- milestones
- surveys
- dispatch challans
- project documents
- communication logs
- DPR
- petty cash
- project assets
- device uptime
- technical deviations
- change requests

This means:

- route-level PM experience has been tightened
- document-level role memberships are still not fully refactored to the new PM philosophy

## 2.6 Backend Verdict

Backend condition is `mixed`.

Good:

- PM assigned-project scoping exists
- PM-side APIs exist for DPR, project inventory, petty cash, and material consumption
- route gating already blocks many wrong global pages

Not good:

- RBAC seed and many DocType permissions still carry the older broader PM assumption
- backend truth is therefore not yet conceptually clean

## 3. Frontend Code Condition

## 3.1 PM Code Path No Longer Intends To Use Project Head Dashboard

The home route now renders a dedicated PM dashboard in:

- [page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/page.tsx)
- [ProjectManagerDashboard.tsx](/workspace/development/Erp_code/erp_frontend/src/components/dashboards/ProjectManagerDashboard.tsx)

This means the code on disk intends to show a PM-specific dashboard.

It does **not** prove that the running app is actually showing that dashboard.

## 3.2 Current PM Frontend Code Is a Narrow Coordination Mini-Suite

The PM dashboard and sidebar currently frame PM as a coordinator with four direct work lanes:

- `Survey Submission`
- `Project Inventory`
- `Project Petty Cash`
- `DPR & Progress`

Relevant frontend files:

- [ProjectManagerDashboard.tsx](/workspace/development/Erp_code/erp_frontend/src/components/dashboards/ProjectManagerDashboard.tsx)
- [Sidebar.tsx](/workspace/development/Erp_code/erp_frontend/src/components/Sidebar.tsx)
- [RoleContext.tsx](/workspace/development/Erp_code/erp_frontend/src/context/RoleContext.tsx)

Current PM frontend access list is:

- `/`
- `/notifications`
- `/survey`
- `/project-manager/dpr`
- `/project-manager/inventory`
- `/project-manager/petty-cash`

That is the frontend code truth right now.

## 3.3 PM-Specific Pages That Exist In Code

There are currently three PM-specific project-side pages:

- [project-manager/inventory/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/inventory/page.tsx)
- [project-manager/petty-cash/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/petty-cash/page.tsx)
- [project-manager/dpr/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/dpr/page.tsx)

These pages are all assigned-project-driven and avoid opening the broad HQ pages.

### PM Inventory Page

Current behavior:

- selects from assigned projects only
- reads project inventory records
- reads project receiving summary
- reads material consumption reports
- allows project-side receipt update
- allows material consumption report submission

This page is trying to combine:

- project inventory
- project GRN / receipt follow-through
- project consumption reporting

That is directionally correct, but still not the richer project-workspace shape described in the earlier markdown.

### PM Petty Cash Page

Current behavior:

- selects from assigned projects only
- loads petty cash only for selected assigned project
- allows creation of project-linked petty cash entry

This is aligned with the “petty cash should move to PM project context” idea.

### PM DPR Page

Current behavior:

- selects from assigned projects only
- loads DPRs for selected assigned project
- loads project sites
- allows new DPR submission

This page explicitly states that it replaces the shared execution command view for PM.

## 3.4 Shared Rich Project Workspace Still Exists In Code, But PM Is Not Using It As Primary Code Path

The rich shared project workspace still exists via:

- [WorkspaceShell.tsx](/workspace/development/Erp_code/erp_frontend/src/components/project-workspace/WorkspaceShell.tsx)
- [projects/[id]/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/projects/[id]/page.tsx)

Department project workspaces also still exist for:

- Engineering
- Procurement
- Execution
- HR
- Finance
- O&M

But PM is not currently implemented as a project-scoped version of that workspace.

That is the central frontend code truth.

## 3.5 Frontend Code Verdict

Frontend code condition is `coherent in narrow scope, but not aligned with the original PM workspace spec`.

What exists now is:

- a PM coordination dashboard
- three PM-specific operational pages

What does not exist now is:

- a rich assigned-project PM workspace with tabs such as overview, tasks, kanban, milestones, gantt, notes, files, comments, timesheets, expenses, staff, petty cash

## 4. Frontend Runtime Condition

## 4.1 What Was Actually Observed In The Running App

The live screenshot evidence shows:

- the logged-in user label says `Project Manager`
- the visible dashboard is still `Project Head Dashboard`
- the left navigation is still not reflecting the PM-specific mini-suite described in code

So the running app is still effectively showing PH-style behavior to PM.

## 4.2 What This Means

The runtime UI does **not** currently match the frontend code description above.

Possible reasons include:

- stale frontend bundle
- stale running process
- cached client assets
- incomplete deploy / restart
- route or role state not actually using the latest code path

I cannot prove which one from this document alone, so I am not going to pretend to know.

## 4.3 Runtime Verdict

Runtime frontend condition is `still broken for PM`.

The only safe statement is:

- PM is still seeing PH-style dashboard behavior in the running app

That is the effective truth until proven otherwise by a fresh runtime verification.

## Gap Against The Earlier Spec

The earlier version of this document described a much richer PM workspace than what is currently implemented.

That earlier spec implied:

- PM should live inside a primary project workspace
- PM should get a client-style cockpit similar to the RISE reference
- PM should have project tabs for tasks, milestones, timeline, notes, files, comments, timesheets, staff, and petty cash

Current implementation does not match that.

More importantly, current runtime does not even fully match the narrowed PM code path.

Instead, current code tries to give PM:

- one coordination dashboard
- one survey lane
- one project inventory / receiving lane
- one petty cash lane
- one DPR lane

But current runtime still shows a PH-style dashboard.

So the earlier document was too aspirational relative to both code reality and runtime reality.

## Corrected Interpretation

The right interpretation now is:

- PM should not have access to company-wide project lists or HQ-wide shared module pages
- PM should still eventually have a project-centric workspace
- but that workspace must be limited to assigned projects only

In other words:

- not `global /projects`
- but possibly `My Projects` or direct entry into assigned project(s)

Inside that PM-only project workspace, the eventual tabs should be project-linked only.

## What The Current Implementation Is Best Described As

The current PM implementation is best described as:

`an attempted interim PM coordination suite in code, but still runtime-broken in the served UI`

That is the most accurate summary of the code today.

## Recommended Correct Direction From Here

If the product is to align with the original business intention, the next architectural step should be:

1. restore a PM project-centric workspace
2. make it assigned-project-only
3. keep global HQ modules hidden
4. move the current PM mini-pages into tabs or sections inside that workspace

That means the final PM experience should probably become:

- `My Projects`
- open assigned project
- inside project:
  - overview
  - survey submission
  - project GRN / receipt follow-through
  - project inventory
  - material consumption
  - DPR
  - petty cash
  - staff
  - files
  - comments
  - requests to PH

This would preserve the business logic without reopening HQ-wide pages.

## Final Verdict

## Database

Supports the PM-side model better than before.

## Backend

Has the right PM-specific APIs and assigned-project guards, but still carries legacy role-permission drift.

## Frontend Code

Tries to deliver a narrowed PM coordination suite instead of the rich PM project workspace originally described.

## Frontend Runtime

Still confuses PM with PH in the running app, based on direct screenshot evidence.

## Final Rule

Current truth in code:

- PM is being refactored toward a narrow project-side coordinator
- PH is implemented as the broader governance layer

Current truth in runtime:

- PM is still seeing PH-style dashboard behavior

Target truth:

- PM should still become an assigned-project-only project workspace owner
- PH should remain the approval and governance layer above it

Project Manager executes in project context.  
Project Head authorizes across projects.
