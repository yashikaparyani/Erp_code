# Backend Architecture Note

## Core Idea

This ERP is best understood as:

- `Project as the spine`
- `Departments as operational lenses`
- `Hierarchy as access altitude`

It is not a generic horizontal ERP first.
It is a project-execution ERP where every major workflow is ultimately tied back to a project, site, milestone, asset, ticket, payment event, or manpower assignment.

## Project As The Spine

The central business object is not only the tender or only the department.
It is the project lifecycle:

`Tender -> Survey -> BOQ -> Costing -> Procurement -> Stores -> Execution -> Billing -> O&M / RMA`

Everything important hangs off that spine:

- sites and locations
- milestones and phases
- survey details
- material movement
- payment milestones
- uptime / ticket / RMA events
- project manpower

## Departments As Lenses

Departments are not isolated software silos.
They are different views of the same project.

Examples:

- `Presales` sees tender, compliance, reminders, EMD/PBG, costing initiation
- `Engineering` sees survey, BOQ, milestones, DPR, technical deliverables
- `Procurement / Purchase` sees comparison, vendor, PO readiness, delivery status
- `Stores` sees stock, dispatch, receipt, material movement
- `Projects` sees site progress, dependencies, manpower, issue closure
- `Accounts` sees billing, receipts, retention, penalties
- `HR` sees manpower, attendance, travel, overtime, technician/admin staffing
- `O&M / RMA` sees uptime, tickets, SLA, replacements, service follow-up

So the system should not be built as disconnected modules.
It should behave like one project system viewed from different departmental angles.

## Hierarchy As Access Altitude

The cleanest mental model is zoom altitude.

### High Altitude

- `Director`
  - portfolio / cross-project visibility
  - can zoom from site-level detail to organization-wide view
  - should see aggregated dashboards plus drill-down

### Upper Functional Altitude

- `Project Head`
- `Engineering Head`
- `Presales Head`
- `HR Head`
- `Accounts Head`
- `Procurement Head`
- `RMA Head`

These roles should see beyond a single record owner and usually beyond a single site.
They are functional or project-wide controllers.

### Mid Altitude

- `Project Manager`
- `Store Manager`
- `Accounts Manager`
- `HR Manager`
- `Presales Manager`

These roles operate at project, department, or execution-band level.
They should usually own workflows, updates, and approvals inside their lane.

### Ground Altitude

- executives
- engineers
- technicians
- operators
- coordinators

These users should mostly work on assigned items, sites, tasks, tickets, or transactions.

## Practical System Rule

Every screen and API should answer:

1. what project object is this tied to?
2. which department lens is acting on it?
3. what hierarchy altitude is allowed to view, edit, approve, or override it?

If a feature cannot answer those 3 questions, it is probably drifting away from the actual ERP spirit.

## Role Interpretation Notes

### Director

Your current understanding is directionally correct:

- the `Director` should be able to zoom from site level to the widest aggregate view
- in ERP terms this means:
  - portfolio
  - project
  - site
  - transaction / tracker drill-down

### Project Head

`Project Head` should not be treated as just an `I&C Head` unless the client explicitly says so.

From the available docs, `Project Head` looks more like:

- cross-project execution owner
- project-side approval authority
- escalation point between execution, procurement, material movement, payment milestones, RMA, and manpower

So the safer interpretation is:

- `Project Head` = program / delivery head for projects
- not only one technical sub-function

If later docs explicitly state that `Project Head` is actually an I&C-specific head, then we should narrow it.
Right now the evidence points to a broader execution-governance role.

## What The ERP Is Really Trying To Do

This system is trying to aggregate:

- all project facts
- all departmental actions
- and all approval/reporting levels

into one operational control plane.

That is why it feels simpler than a classic giant ERP:

- fewer abstract enterprise processes
- more project-grounded trackers
- more role/hierarchy-driven visibility

## Use This As A Design Filter

When building or reviewing any module, ask:

- does it attach to the project spine?
- does it reflect a department lens?
- does it respect hierarchy altitude?

If yes, it is aligned with the intended ERP spirit.
