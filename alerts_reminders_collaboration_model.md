# Alerts, Reminders, And Collaboration Model

## Purpose

This note captures three related decisions for the Technosys ERP:

- alerts / notifications
- reminders
- record-based collaboration

These are meant to support the shared project spine, department-wise workspace iteration, and RBAC-driven visibility.

## Topic 1: Alerts / Notifications

### Core rule

Alerts are:

- system-generated
- event-driven
- shared with relevant users
- filtered by RBAC before delivery

They are not private notes and they are not generic chat.

### What should trigger alerts

Examples:

- project created
- project stage submitted
- project stage approved / rejected / overridden
- dependency override raised or acted upon
- site stage changed
- site blocked / unblocked
- milestone overdue
- document uploaded / replaced / expiring
- approval assigned / acted on
- dispatch, GRN, invoice, retention, penalty, RMA, ticket escalation events

### Recipient rule

A user should receive an alert only if both are true:

- the user is operationally relevant to the event
- the user is allowed to see that project / site / stage / lane under RBAC

This means:

- project team gets broad project alerts
- department users get their lane-specific alerts
- approval events go to approvers
- finance-only events do not go to unrelated field roles

### Delivery model

- backend creates notification records
- backend pushes realtime events
- frontend bell reads and renders the current user feed

Polling should be avoided. Realtime should be used.

### UX model

Bell dropdown should show:

- unread count
- recent alerts
- actor
- action summary
- project / site / doc context
- timestamp
- mark as read / mark all read

Alerts should deep-link into the correct workspace route for the current user.

## Topic 2: Reminders

### Core rule

Reminders are:

- user-created
- private by default
- contextual to project / site / stage / document
- not broadcast to the team

They are personal nudges, not workflow notifications.

### Best use cases

- remind me before a procurement deadline
- remind me if a blocked site is still pending tomorrow
- remind me to review a milestone
- remind me to revisit a project document or dependency

### Data model

Recommended custom doctype:

- `GE User Reminder`

Suggested fields:

- title
- reminder datetime
- repeat rule
- linked project
- linked site
- linked stage
- linked doctype
- linked docname
- user
- status
- is_sent
- sent_at

### Visibility rule

- creator sees their own reminders
- admin visibility only if explicitly needed for support / audit
- reminders are not part of the shared team feed

### Delivery model

- scheduler checks due reminders
- backend pushes realtime reminder alert
- frontend shows toast / browser notification / reminder drawer update

### UX model

The reminder entry point should live inside the project workspace, not as a detached global utility.

Recommended UX:

- reminder button in workspace header
- right drawer or side panel
- create reminder for project / site / stage
- list my reminders for this project
- dismiss / snooze / delete

## Topic 3: Record-Based Collaboration

### Core rule

For this ERP, collaboration should be attached to records, not built first as a generic chat product.

The collaboration unit should be:

- project
- site
- milestone
- dependency override
- approval item
- document
- ticket / RMA item

This keeps every discussion tied to:

- exact operational context
- exact audit trail
- exact project / site / stage

### Best Frappe primitives

Use built-ins where possible:

- `Comment`
- `Version`
- `Communication`
- mentions / notifications
- `ToDo` / assignments

### Where to use what

Use `Comment` for:

- site discussion
- blocker clarification
- dependency justification
- milestone remarks
- approval remarks
- project updates

Use `Communication` for:

- more formal thread-like exchanges
- email-style conversation
- externalized or documented communication

Use `ToDo` / assignment for:

- converting discussion into accountable action
- follow-up ownership
- nudges that require execution

Use `Version` for:

- passive audit of what changed
- field-level historical trace

### Why this is better than generic chat

- discussion stays attached to the real record
- audit is naturally stronger
- less context loss
- better for blockers, approvals, and delivery tracking
- fits ERP behavior better than building a Slack clone

## RBAC Linkage

All three topics must respect RBAC:

- alerts are delivered only to relevant permitted users
- reminders are private unless explicitly elevated
- collaboration visibility follows record visibility

This means:

- if a user cannot see a record, they should not see its discussion or alerts
- pack and scope truth must drive delivery and rendering
- department iteration must stay aligned with the same project truth

## Final Doctrine

The right combined model is:

- alerts = shared operational events filtered by RBAC
- reminders = private user alarms tied to project context
- collaboration = comments and discussion attached to real records

This keeps the ERP:

- project-centric
- site-aware
- role-filtered
- auditable
- useful at PM and department level

## Implementation Phases

## Phase 1: Database

Goal:

- create clean persistence for alerts, reminders, and contextual collaboration

### Alerts

Use either:

- Frappe built-in notification storage where appropriate

or, if custom tracking is needed:

- a dedicated alert/event doctype for richer ERP-specific context

Minimum alert data must support:

- event type
- actor
- recipient user
- linked project
- linked site
- linked stage
- linked doctype
- linked docname
- summary
- read status
- created at

### Reminders

Create:

- `GE User Reminder`

Minimum fields:

- title
- reminder datetime
- repeat rule
- linked project
- linked site
- linked stage
- linked doctype
- linked docname
- user
- is_sent
- sent_at
- status

### Collaboration

Do not invent a generic chat table first.

Persist collaboration primarily through:

- `Comment`
- `Communication`
- `Version`
- assignment / `ToDo` where action is needed

## Phase 2: Backend

Goal:

- make delivery, recipient resolution, and record linkage correct

### Alerts backend

Backend must:

- emit events on meaningful record actions
- resolve recipients through project relevance + RBAC
- avoid sending alerts to users who cannot see the record
- push realtime events
- support mark-read / mark-all-read behavior

Recommended event sources:

- project workflow actions
- site stage changes
- blockers / dependency overrides
- approvals
- DMS events
- execution / ticket / RMA escalation points

### Reminders backend

Backend must:

- create/update/delete reminder records
- schedule due reminder checks
- publish realtime reminder alerts
- mark reminders as sent when delivered

### Collaboration backend

Backend must:

- keep comments attached to real records
- support mentions and notifications
- preserve audit trail through versions/comments
- convert discussion to action where needed using assignments / ToDo

## Phase 3: Frontend

Goal:

- surface alerts, reminders, and collaboration in the actual ERP workspace

### Alerts frontend

Build:

- bell icon
- unread badge
- recent alerts dropdown / panel
- mark as read actions
- deep links to the correct route by role and context

### Reminders frontend

Build:

- reminder button inside workspace header
- private reminder drawer / side panel
- create / snooze / dismiss / delete flows
- project/site/stage contextual reminder UX

### Collaboration frontend

Build:

- record comment threads where operationally needed
- visible mentions and discussion context
- action-oriented comments on blockers, approvals, dependencies, milestones, and documents

Do not build generic chat first.

## Phase 4: Sanity Of 1 + 2 + 3

Goal:

- confirm the DB model, backend logic, and frontend UX are telling the same truth

Sanity checklist:

- a user only receives alerts for records they are allowed to see
- a user can deep-link from an alert into the correct workspace
- reminders are private and do not leak to other users
- comments stay attached to the exact project/site/doc/blocker context
- mentions create notifications correctly
- mark-read state behaves correctly
- realtime updates work without polling
- alert/reminder/collaboration behavior respects the shared project truth
- no decorative frontend exists without backend truth

### Final sanity question

For every implemented piece, ask:

- is it stored correctly?
- is it delivered correctly?
- is it shown correctly?
- is it RBAC-correct?
- is it tied to the right project/site/stage record?

If any answer is no, the feature is not ready.
