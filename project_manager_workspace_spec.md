# Project Manager Workspace Spec

Date: 2026-03-23

## Goal

Define the target project page behavior for `Project Manager` versus `Project Head`.

The reference behavior is the client-side project page style described from the RISE PMS example.  
In our ERP:

- `Project Manager` should be the day-to-day project operator
- `Project Head` should be the approving / controlling authority

This means the project manager workspace should become the primary execution-facing project page, while the project head layer remains approval-heavy and governance-heavy.

## Role Split

## Project Manager = Client-Side Operational Role

Project Manager should see and actively use:

- project overview
- reminders
- private working notes
- task list
- task kanban
- milestones
- gantt/timeline
- files
- comments
- timesheets
- expenses
- project staff
- petty cash

Project Manager should be able to:

- create and manage tasks
- assign/collaborate with team members
- log time
- upload working files
- add private notes
- manage day-to-day project comments
- raise milestone / deadline extension requests
- raise staffing requests
- manage project petty cash usage within approved controls

Project Manager should **not** be the final approver for:

- milestone deadline changes
- project completion
- project cancel / hold
- milestone closure where governance approval is needed
- budget / petty cash limit changes
- major staffing approvals

## Project Head = Server-Side Approval / Governance Role

Project Head should control:

- project deadlines
- milestone deadlines
- project status changes
- extension approvals / rejections
- major staffing approvals
- project completion / hold / cancel actions
- approval of sensitive commercial or execution changes

Project Head should be able to:

- set initial project deadline
- set or revise milestone deadlines
- approve or reject timeline extension requests
- approve or reject sensitive petty cash escalation
- approve or reject staff changes where policy requires it
- review audit trail of PM requests with written reasons

## Core Workflow Rule

Project Head sets deadlines.  
Project Manager executes within those deadlines.

If Project Manager needs more time:

1. PM raises a `timeline extension request`
2. PM enters:
   - target project or milestone
   - requested new deadline
   - written reason
   - optional attachment/evidence
3. Request goes to Project Head
4. Project Head:
   - approves, or
   - rejects with remarks
5. On approval:
   - project/milestone deadline updates
   - activity log records who changed what
   - PM sees final decision in workspace activity / alerts

This same pattern should apply to:

- milestone extension
- project hold / reopen requests
- key staffing escalation

## Required PM Workspace Tabs

These are the target tabs/subsections the Project Manager project page should expose.

## 1. Overview

Should include:

- project title
- favourite/star
- project stats
- progress ring / progress summary
- start date
- deadline
- status
- total hours worked
- project description
- project members
- activity feed preview

PM actions:

- edit descriptive fields where allowed
- add/remove members where policy allows
- raise extension request
- start/stop timer

PH actions:

- approve changes requiring governance
- finalize project status changes

## 2. Tasks List

Should include:

- labels
- batch update
- add task
- add multiple tasks
- filters
- column toggle
- export / print
- search

Task fields should include:

- title
- description
- points
- milestone
- assign to
- collaborators
- status
- priority
- labels
- start date
- deadline
- upload file

PM owns:

- task creation
- assignment
- status updates
- collaboration

PH owns:

- approval only where business policy requires escalation

## 3. Tasks Kanban

Should include:

- To Do
- In Progress
- Done
- drag/drop state changes
- search
- filters
- refresh

PM owns this as the live execution board.

## 4. Milestones

Should include:

- due date
- title
- progress
- action menu

PM can:

- create milestone proposals or operational milestones if allowed
- update progress
- request date change

PH can:

- approve milestone creation where policy requires
- set/finalize due dates
- approve extension requests

## 5. Gantt / Timeline

Should include:

- group by milestone / team member
- assigned-to filter
- milestone filter
- status filter
- day/week/month views

This is primarily PM-facing for planning and execution visibility.

## 6. Notes (Private)

Private PM notes:

- title
- description / rich text
- files

Only visible to creator or policy-defined owner.

## 7. Files

Should include:

- file list
- category
- upload
- category management
- filters
- search

PM owns daily operational files.  
PH can review and govern sensitive project documents where needed.

## 8. Comments

Should include:

- project comment composer
- attachments
- threaded discussion

PM uses this for operational collaboration.

## 9. Timesheets

Should include:

- details
- summary
- chart
- log time
- task-linked time entries

PM owns day-to-day timesheet logging and tracking.  
PH reviews through management visibility, not by becoming the primary operator.

## 10. Expenses

Should include:

- expense list
- category
- title
- amount
- taxes
- file upload

This should align with project petty cash / expense controls.

## 11. Staff

A dedicated `Staff` tab should be added for Project Manager.

This tab should show:

- current assigned staff
- role / designation
- department
- allocation window
- status
- staffing notes

PM actions:

- request staff assignment
- request replacement / release
- view staffing history

PH actions:

- approve / reject staffing escalation where required

Recommended backend mapping:

- use existing project staffing / manpower assignment records where possible
- do not collapse daily manpower logs and staffing assignment history into one UI concept

## 12. Petty Cash

Petty cash should move to the `Project Manager` project workspace level conceptually.

That means:

- PM sees petty cash as a project operating tool
- not as a procurement-owned primary control surface

Procurement may still retain visibility for audit/support, but PM should own day-to-day project petty cash requests and entries.

Recommended behavior:

- petty cash tab or card inside PM workspace
- PM can create usage/request entries
- approval rules still depend on role thresholds
- PH or finance approves above threshold

## Approval Workflows To Add / Clarify

## A. Timeline Extension Request

Fields:

- project
- milestone optional
- current deadline
- requested deadline
- reason
- attachment optional
- request date
- requested by
- status
- approver remarks

States:

- Draft
- Submitted
- Approved
- Rejected
- Cancelled

Approver:

- Project Head

## B. Milestone Deadline Change Request

Same pattern as timeline extension, but milestone-specific.

## C. Staffing Request

Fields:

- project
- role/designation needed
- quantity
- required from date
- required till date
- reason
- urgency
- status

Approver:

- Project Head
- optionally HR depending on policy

## D. Petty Cash Escalation Approval

For cases where PM exceeds a threshold or requests exceptional usage.

Approver:

- Project Head and/or Accounts

## Current ERP Direction vs Target

Current direction:

- strong shared `WorkspaceShell`
- project / department workspaces already exist
- comments, files, activity, milestones, reminders, DMS, and staffing-related pieces already exist in fragments

Target change:

- make `Project Manager` workspace the main client-style operating page
- move `petty cash` from procurement-first framing to PM project-first framing
- add `Staff` tab to PM workspace
- introduce explicit approval requests instead of direct PM authority over deadline changes

## Implementation Direction

## Phase 1

Refactor PM project page tabs to include:

- overview
- tasks list
- kanban
- milestones
- gantt
- files
- comments
- timesheets
- expenses
- staff
- petty cash

## Phase 2

Move petty cash visibility and entry flow into PM workspace.

Procurement can still keep supporting visibility, but PM should see it in project context first.

## Phase 3

Add `Staff` tab using project staffing assignment history plus related manpower visibility.

## Phase 4

Add `timeline extension request` and `milestone extension request` approval workflow.

## Phase 5

Bind Project Head approvals into:

- alerts
- activity feed
- approval inbox
- audit trail

## Final Rule

The Project Manager page should feel like the client-facing operational cockpit.  
The Project Head page should feel like the approval and governance layer above it.

Project Manager executes.  
Project Head authorizes.
