# RBAC Permission Pack Model

Date: 2026-03-19

## Purpose

This document defines the recommended RBAC architecture for the ERP using:

- machine-readable permission truth
- human-readable permission packs
- role composition from packs
- scope-driven access
- phased implementation from database to frontend

It is intended to prevent two bad outcomes:

- raw permission soup with hundreds of confusing toggles
- pretty admin cards that do not match real backend access

This document starts from the database layer and then moves phase-wise toward the frontend, user management, and rollout.

## Core Principle

The system should behave like this:

- **Capabilities** are the smallest machine-readable permissions
- **Permission Packs** are grouped admin-friendly bundles of capabilities
- **Roles** are composed from packs plus scope
- **Scope** decides how far a permission reaches
- **User Management** assigns roles and exceptions to real users

Short version:

- backend truth = capabilities + scope
- admin UX = permission packs
- role behavior = pack composition

## Why This Model Fits This ERP

This ERP does not only need:

- can view
- can edit

It needs:

- which department iteration can be entered
- which project/site/stage is visible
- what actions are enabled
- whether cross-lifecycle visibility exists
- whether approvals / overrides / finance details are accessible

That means plain flat permission lists will become unmanageable very quickly.

Permission packs solve the readability problem.
Scope solves the ERP-specific visibility problem.

## Layered Architecture

### Layer 1: Capability

The smallest backend permission unit.

Examples:

- `project.workspace.access`
- `project.site.view`
- `project.site.update`
- `engineering.drawings.upload`
- `procurement.indent.create`
- `finance.invoice.create`
- `dms.file.delete`
- `approval.stage.approve`
- `workflow.dependency.override`

These are not shown raw to most admins unless needed.

### Layer 2: Scope

Scope defines how far the capability reaches.

Recommended scopes:

- `own`
- `assigned_project`
- `assigned_site`
- `department`
- `project_family`
- `all`
- `cross_stage_read`
- `cross_stage_write`

Also support mode:

- `read`
- `action`
- `approve`
- `override`

So in truth, a permission is not just:

- `project.site.view`

It is closer to:

- `project.site.view` with scope `assigned_project`

or:

- `finance.invoice.view` with scope `department` and mode `read`

### Layer 3: Permission Pack

This is the human-readable grouping shown in settings.

Examples:

- Project Command Pack
- Engineering Pack
- Procurement Pack
- Inventory Pack
- Execution / I&C Pack
- Finance Pack
- HR / Manpower Pack
- O&M / RMA Pack
- DMS Pack
- Approval Pack
- Settings & Role Admin Pack

### Layer 4: Role

Roles are curated combinations of packs.

Examples:

- Director
- Project Head
- Project Manager
- Engineering Head
- Engineer
- Procurement Manager
- Purchase
- Accounts
- HR Manager
- OM Operator
- RMA Manager

### Layer 5: User Assignment

A real user gets:

- one or more roles
- assigned project / site / department context
- optional exceptions

This is handled in user management.

## Database-First Design

The database model should be designed first, because frontend packs are only useful if backed by a stable permission truth.

## Database Tables / DocTypes

### 1. Permission Capability Master

Recommended object:

- `GE Permission Capability`

Fields:

- `capability_key`
- `capability_label`
- `description`
- `module_key`
- `department_key`
- `entity_type`
- `action_type`
- `supports_scope`
- `supports_mode`
- `is_sensitive`
- `is_active`

Examples:

- `project.workspace.access`
- `project.site.view`
- `project.site.update`
- `project.stage.submit`
- `project.stage.approve`
- `engineering.survey.update`
- `engineering.drawing.upload`
- `procurement.indent.create`
- `procurement.po.view`
- `inventory.grn.create`
- `execution.commissioning.update`
- `finance.invoice.create`
- `finance.receipt.record`
- `hr.manpower.assign`
- `om.ticket.manage`
- `rma.case.create`
- `dms.file.upload`
- `settings.role.manage`

### 2. Permission Pack Master

Recommended object:

- `GE Permission Pack`

Fields:

- `pack_key`
- `pack_label`
- `description`
- `module_family`
- `is_system_pack`
- `is_active`
- `sort_order`
- `ui_color`
- `ui_icon`

### 3. Permission Pack Item

Child table under `GE Permission Pack`.

Fields:

- `capability`
- `default_scope`
- `default_mode`
- `required_for_pack`
- `display_order`
- `notes`

This is where each pack is made from capabilities.

### 4. Role Pack Mapping

Recommended object:

- `GE Role Pack Mapping`

Fields:

- `role`
- `permission_pack`
- `scope`
- `mode`
- `is_enabled`
- `is_system_default`

This allows a role to inherit packs cleanly.

### 5. User Pack Override

Recommended object:

- `GE User Pack Override`

Fields:

- `user`
- `permission_pack`
- `scope`
- `mode`
- `grant_or_revoke`
- `remarks`
- `valid_from`
- `valid_to`
- `granted_by`

This is for rare exceptions and temporary overrides.

### 6. User Context Assignment

Recommended object:

- extend existing employee/user mapping or create `GE User Context`

Fields:

- `user`
- `department`
- `designation`
- `primary_role`
- `secondary_roles`
- `assigned_projects`
- `assigned_sites`
- `region`
- `is_active`

This is essential because role alone is not enough in this ERP.

## Database Truth Rules

### Rule 1

Never rely on frontend-only visibility as the real permission truth.

### Rule 2

Every frontend permission card must map back to actual stored capabilities/packs.

### Rule 3

A role must not store hundreds of raw booleans when pack membership can express the same thing more cleanly.

### Rule 4

User exceptions must be explicit and auditable.

## Recommended Permission Packs

Below are the recommended first system packs.

### 1. Project Command Pack

Purpose:

- command visibility over projects
- cross-stage coordination
- site-level delivery control

Capabilities:

- access project workspace
- view all project summary
- view all sites
- view site board
- view milestones
- view blockers
- view activity
- manage project members
- submit project stage
- approve project stage
- reject project stage
- override project stage
- override dependency

### 2. Engineering Pack

Purpose:

- engineering-stage project iteration

Capabilities:

- access engineering iteration
- view engineering-relevant projects
- view engineering sites
- update survey/design status
- upload drawings
- raise technical deviation
- view dependencies
- submit engineering-ready output
- view engineering files

### 3. Procurement Pack

Purpose:

- procurement-side project execution

Capabilities:

- access procurement iteration
- view procurement-relevant projects
- view procurement sites
- create indent
- edit indent
- view vendor comparison
- create vendor comparison
- view purchase orders
- update procurement readiness
- view procurement files

### 4. Inventory Pack

Purpose:

- stock and warehouse truth

Capabilities:

- access inventory module
- view stock position
- view stock aging
- create GRN
- create stock movement
- link stock to project/site
- manage serial/batch traceability
- view dispatch-linked inventory

Inventory is not a PM workspace pack. It remains stock-native.

### 5. Execution / I&C Pack

Purpose:

- field execution and commissioning control

Capabilities:

- access execution iteration
- view execution sites
- update installation status
- update commissioning status
- upload field evidence
- manage device/IP allocation
- manage test reports
- raise field blocker
- view execution files

### 6. Finance Pack

Purpose:

- project-linked billing and payment control

Capabilities:

- access finance iteration
- view billing milestones
- create invoice
- update invoice
- record payment receipt
- view retention
- view penalty
- view commercial exposure
- approve finance-relevant actions where allowed

### 7. HR / Manpower Pack

Purpose:

- project manpower support

Capabilities:

- access manpower iteration
- view staffing by project/site
- manage onboarding linkage
- view attendance
- view travel/overtime
- assign manpower
- view people readiness

### 8. O&M / RMA Pack

Purpose:

- post-go-live service support

Capabilities:

- access O&M iteration
- access RMA iteration
- manage tickets
- manage SLA timers
- manage RMA records
- view uptime
- close service issues

### 9. DMS Pack

Purpose:

- file and evidence management

Capabilities:

- access documents
- view files
- upload files
- replace version
- delete file
- manage expiry metadata

### 10. Approval Pack

Purpose:

- centralized approval participation

Capabilities:

- access approval inbox
- approve
- reject
- request revision
- comment on approval
- override with reason where allowed

### 11. Settings & Role Admin Pack

Purpose:

- system administration

Capabilities:

- manage departments
- manage designations
- manage roles
- manage permission packs
- manage user-role assignment
- manage stage visibility policy
- manage settings

## Recommended Role Composition

This is the suggested role-to-pack starting model.

### Director

Packs:

- Project Command Pack
- Engineering Pack
- Procurement Pack
- Inventory Pack
- Finance Pack
- HR / Manpower Pack
- O&M / RMA Pack
- DMS Pack
- Approval Pack
- Settings & Role Admin Pack

Scope:

- `all`

### Project Head

Packs:

- Project Command Pack
- Engineering Pack
- Procurement Pack
- Execution / I&C Pack
- Finance Pack
- DMS Pack
- Approval Pack

Scope:

- `all delivery projects`

### Project Manager

Packs:

- Project Command Pack
- Engineering Pack
- Procurement Pack
- Execution / I&C Pack
- DMS Pack
- Approval Pack

Scope:

- `assigned_project`

### Engineering Head

Packs:

- Engineering Pack
- DMS Pack
- Approval Pack

Scope:

- `department`

### Engineer

Packs:

- Engineering Pack
- DMS Pack

Scope:

- `assigned_project` / `assigned_site`

### Procurement Manager

Packs:

- Procurement Pack
- Inventory Pack (read-heavy)
- DMS Pack
- Approval Pack

Scope:

- `department`

### Purchase

Packs:

- Procurement Pack
- limited DMS Pack

Scope:

- `assigned_project`

### Store Manager / Stores Logistics Head

Packs:

- Inventory Pack
- limited Procurement Pack

Scope:

- stock + linked project references

### Accounts

Packs:

- Finance Pack
- Approval Pack
- DMS Pack

Scope:

- `department`

### HR Manager

Packs:

- HR / Manpower Pack
- limited DMS Pack

Scope:

- `department`

### OM Operator

Packs:

- O&M / RMA Pack
- limited DMS Pack

Scope:

- `assigned_project` / service stage

### RMA Manager

Packs:

- O&M / RMA Pack
- Approval Pack
- DMS Pack

Scope:

- `department`

## User Management Model

User management must be first-class in this design.

It is not enough to say:

- assign role and finish

For this ERP, user management must control:

- identity
- role
- department
- designation
- project assignment
- site assignment
- special access
- exception/override

## User Management Data Requirements

Each active business user should have:

- linked system user
- employee / profile identity
- department
- designation
- primary role
- secondary roles if allowed
- assigned projects
- assigned sites
- reporting manager if needed later
- active/inactive state

## User Management Actions

The user-management UI should support:

- create user
- activate/deactivate user
- assign primary role
- assign extra role packs
- assign projects
- assign sites
- assign department/designation
- view effective permissions
- add temporary override
- remove override
- audit who changed access

## Most Important User-Management Rule

The UI must show:

- **Role**
- **Packs**
- **Scope**
- **Projects**
- **Sites**

in one coherent place.

Otherwise the admin will never understand why the user can or cannot see something.

## Phase-Wise Implementation

Below is the recommended execution order.

## Phase 1: Database Truth

Goal:

- establish stable RBAC backend truth

Tasks:

- create capability master
- create permission pack master
- create pack-item child table
- create role-pack mapping
- create user-pack override
- extend or create user context assignment model
- seed system packs
- seed default role mappings

Deliverable:

- backend can calculate effective permissions for any user

## Phase 2: Backend Permission Engine

Goal:

- centralize permission resolution

Tasks:

- create helper that resolves effective permissions from:
  - role packs
  - user overrides
  - scope context
- add helper for route/module checks
- add helper for project/site/stage checks
- add helper for approval/override checks
- replace hardcoded special-case logic where feasible with pack-aware checks

Deliverable:

- one consistent permission engine instead of scattered conditionals

## Phase 3: API Contract Layer

Goal:

- expose RBAC truth to the frontend in a structured way

Recommended APIs:

- `get_permission_packs`
- `get_role_pack_matrix`
- `get_user_effective_permissions`
- `assign_role_packs`
- `assign_user_override`
- `get_user_context`
- `update_user_context`

Deliverable:

- frontend admin screens can render real permission data

## Phase 4: Settings Frontend

Goal:

- replace confusing settings screens with pack-driven admin UX

Settings should have:

- Permission Packs
- Roles
- Stage Visibility
- User Management

### Permission Packs page

Should show card-style packs similar to the visual you shared.

Each card should show:

- pack name
- description
- capability count
- required/default items
- expand/edit action

Inside each pack card:

- access module
- view
- create
- edit
- approve
- override
- scope controls

### Roles page

Should show:

- role name
- attached packs
- scope defaults
- inherited department relevance

This page should compose roles from packs, not manually rebuild the entire matrix each time.

### Stage Visibility page

Should not be fake documentation.

It should reflect:

- which pack grants which stage visibility
- whether it is read-only or action-enabled
- whether cross-stage read is allowed

### User Management page

This is where everything comes together.

Each user profile should show:

- user identity
- department
- designation
- primary role
- additional packs
- assigned projects
- assigned sites
- effective visibility
- exceptions / overrides

## Phase 5: Route And Navigation Enforcement

Goal:

- ensure UI visibility matches backend truth

Tasks:

- drive route visibility from effective permissions
- drive sidebar visibility from role packs
- drive action buttons from capabilities and scope
- drive tab visibility from pack + stage visibility

Deliverable:

- the admin UI and actual ERP behavior stop diverging

## Phase 6: Project Workspace Integration

Goal:

- connect pack model to the shared project workspace

Tasks:

- `Project Command Pack` drives top-level projects workspace
- department packs drive department-wise project iterations
- Inventory pack remains separate
- DMS pack controls files tab rights
- Approval pack controls approval actions

Deliverable:

- one project truth
- many controlled departmental lenses

## Phase 7: Audit And Reporting

Goal:

- make access changes traceable

Tasks:

- log role changes
- log pack changes
- log user overrides
- show who changed what and when
- show effective permissions snapshot per user

Deliverable:

- no access confusion without audit trail

## Frontend UX Rules

### Rule 1

Permission packs must be understandable in 5 seconds.

### Rule 2

Role pages should not show a giant unreadable checkbox matrix first.

### Rule 3

User management must explain *why* a user has access, not just *that* they have access.

### Rule 4

Scope must be visible in the UI, not hidden in backend only.

### Rule 5

Sensitive packs like Finance, Approvals, Settings, and Overrides must be visually distinguished.

## What Not To Do

Do not do these:

- store all permissions as random frontend-only constants forever
- build nice pack cards that are not backed by backend truth
- let roles mutate into ad-hoc snowflakes with no pack discipline
- hide scope from admins
- make user management separate from project/site assignment
- treat Inventory as just another PM-style pack visually

## Implementation Recommendation

If time is tight, use this priority:

1. database truth
2. backend permission resolution
3. user management context
4. frontend pack UI
5. route/tab/button enforcement

If the order is reversed and frontend cards come first, the system will look smart but behave inconsistently.

## Final Summary

The right model is:

- capabilities are the backend truth
- packs are the admin-readable abstraction
- roles are composed from packs
- scope makes the ERP context-aware
- user management binds all of this to real project/site visibility

This is the best path if the ERP is meant to become:

- production-ready
- understandable to admins
- faithful to department-wise project iteration
- strict enough for real RBAC
