# ERP End-to-End Beginner Flow Guide

Date: 2026-03-24

## Purpose

This document explains the full ERP in very simple language.

It answers:

- what this ERP does from start to end
- which role does what
- who can see which tab
- who sends requests to whom
- who approves what
- how Pre-Sales, Projects, Engineering, Procurement, Stores, Finance, HR, O&M, and RMA connect together

This guide is written for beginners.

## Sources Used

This flow is built by reading the current project material, including:

- markdown documents in `Erp_code/all mds`
- project planning notes in `Erp_code`
- spreadsheet tab structures from:
  - `ANDA.xlsx`
  - `Master funnel Tracker 20-Mar-2026.xlsx`
  - `RMA Department & Help Desk.xlsx`
  - `HR Organitional Chart.xlsx`
- org / handwritten flow images:
  - `hiearchy.jpeg`
  - `image.png`
  - `WhatsApp Image 2026-03-14 at 6.45.20 PM.jpeg`
- current frontend navigation and role access rules from:
  - `erp_frontend/src/components/Sidebar.tsx`
  - `erp_frontend/src/context/RoleContext.tsx`

## One-Line Understanding

This ERP is for handling the full business journey:

`Tender -> Bid Decision -> Survey -> BOQ -> Costing -> Approval -> Procurement -> Stores -> Site Execution -> Billing -> Payment -> O&M Helpdesk -> RMA -> Closure`

## Big Picture

Think of the ERP in 3 layers:

1. `Pre-Sales` brings business in.
2. `Project + Department Workspaces` deliver the work.
3. `O&M / Helpdesk / RMA` supports the project after delivery.

## Organization Structure

The organization shape seen in the documents is:

1. `Director`
2. `Project Head`
3. `Engineering Head`
4. `Presales Head`
5. `HR Head`
6. `Accounts Head`
7. `Project Managers`
8. execution and support roles such as:
   - `Engineer`
   - `Field Technician`
   - `Operator`
   - `MIS Executive`
   - `Assistant Manager`
   - `Floor Incharge`

In the current live app, the main working roles are:

- `Director`
- `Department Head`
- `Project Head`
- `HR Manager`
- `Presales Tendering Head`
- `Presales Executive`
- `Engineering Head`
- `Engineer`
- `Procurement Manager`
- `Purchase`
- `Store Manager`
- `Stores Logistics Head`
- `Project Manager`
- `Accounts`
- `Field Technician`
- `OM Operator`
- `RMA Manager`

## Simple Meaning Of Each Role

### 1. Director

- sees almost everything
- checks portfolio health
- can review major approvals and escalations
- acts as top-level control

### 2. Department Head

- cross-functional approver
- approves sensitive workflow actions
- can override dependency blocks with justification

### 3. Project Head

- controls deadlines, approvals, and project governance
- approves PM-side escalation requests
- sees cross-department delivery status

### 4. Project Manager

- owns day-to-day project coordination
- follows site progress
- raises requests
- sends work forward to the next team
- collects field truth

### 5. Presales Tendering Head

- owns tendering strategy
- drives bid decision
- controls tender submission and project conversion

### 6. Presales Executive

- prepares tender data
- updates bid records
- helps with BOQ / costing drafts and documentation

### 7. Engineering Head

- owns survey, design review, drawings, deviations, and technical control

### 8. Engineer

- performs survey and technical execution support
- updates engineering records

### 9. Procurement Manager / Purchase

- handles indents, vendor comparison, quotations, POs, and procurement processing

### 10. Store Manager / Stores Logistics Head

- handles GRN, inventory movements, stock position, dispatch, and material traceability

### 11. Accounts

- handles billing, payment receipts, retention, penalties, and finance visibility

### 12. HR Manager

- handles onboarding, attendance, travel logs, overtime, technician visits, and manpower tracking

### 13. Field Technician

- performs field work, updates execution activity, and supports installation / commissioning

### 14. OM Operator

- handles operational tickets after project handover
- tracks SLA and issue resolution

### 15. RMA Manager

- handles faulty device return / repair / replacement flow

## Which Role Uses Which Main Area

This is the simplest practical view.

| Role | Main Working Areas |
| --- | --- |
| Director | Dashboard, Projects, Pre-Sales, Engineering, Procurement, Inventory, Execution, Finance, HR, O&M, RMA, Reports, Documents, Settings |
| Department Head | All major departments except direct PM-only project control, mainly for approvals and oversight |
| Project Head | Projects, Milestones, Procurement visibility, Engineering visibility, Finance visibility, Documents, Reports |
| Project Manager | Projects, Milestones, Manpower, Survey visibility, Procurement visibility, Execution, Finance visibility, Petty Cash, Communication Logs, Documents |
| Presales Tendering Head | Pre-Sales, Survey visibility, Documents, Reports |
| Presales Executive | Pre-Sales, Survey visibility, Documents |
| Engineering Head | Survey, Engineering, Execution, Drawings, Change Requests, Documents, Communication Logs |
| Engineer | Survey, Engineering, Execution, Drawings, Change Requests, Documents |
| Procurement Manager | Procurement, Indents, Purchase Orders, Inventory, GRN visibility, Stock reports, Documents |
| Purchase | Procurement, Indents, Purchase Orders, Inventory, Documents |
| Store Manager | Inventory, GRNs, Stock Position, Stock Aging, Procurement linkage, Documents |
| Stores Logistics Head | Inventory, GRNs, Stock Position, Stock Aging, Procurement linkage, Documents |
| Accounts | Finance, Billing, Payment receipts, Retention, Penalties, Reports, Documents |
| HR Manager | HR, Reports, Documents |
| Field Technician | limited execution-side updates and field activity |
| OM Operator | O&M Helpdesk, Tickets, Device Uptime, SLA context, Documents |
| RMA Manager | RMA, related documents, repair / replacement tracking |

## Main Tabs In The Current ERP

The current app is organized around these top-level areas:

1. `Dashboard`
2. `Pre-Sales`
3. `Projects`
4. `Engineering`
5. `Procurement`
6. `Inventory`
7. `Execution`
8. `Finance`
9. `HR`
10. `RMA`
11. `O&M Helpdesk`
12. `SLA Profiles`
13. `Reports`
14. `Document Management`
15. `Master Data`
16. `Settings`

## The Full Start-To-End Business Flow

## Stage 1: Tender Comes In

### Main owner

- `Presales Tendering Head`
- supported by `Presales Executive`

### What happens

1. a tender is identified
2. tender details are entered
3. client, submission date, value, scope, and tender documents are attached
4. compliance items are reviewed
5. EMD / PBG need is tracked
6. clarification points are tracked

### Main tabs used

- `Pre-Sales > Dashboard`
- `Pre-Sales > Bids`
- `Pre-Sales > In Process Bid`
- `Pre-Sales > EMD Tracking`
- `Documents`

### Decision point

The team decides:

- `Go`
- `No Go`
- `Need Clarification`

The handwritten funnel image shows this idea clearly:

- Blue Funnel = tender entered
- then go / no-go filtering
- then qualification and technical progression

## Stage 2: Bid Qualification And Tender Funnel

### Main owner

- `Presales Tendering Head`

### Supporting roles

- `Presales Executive`
- `Engineering Head` when technical input is needed
- `Accounts` when EMD / PBG or finance support is needed
- `Director` for major decision visibility

### What happens

1. presales checks if the tender is suitable
2. if not suitable, it moves to no-go / dropped / cancelled path
3. if suitable, it becomes active bidding work
4. pre-bid queries and clarifications are recorded
5. deadlines and readiness are tracked

### Output

- qualified tender
- non-qualified tender
- dropped tender
- cancelled tender

## Stage 3: Survey

### Main owner

- `Engineering Head`
- `Engineer`

### Who can see it

- `Project Manager`
- `Project Head`
- `Director`
- `Engineering Head`
- `Presales` as needed

### What happens

1. site survey is planned
2. site observations are recorded
3. photos and notes are uploaded
4. readiness and constraints are captured
5. survey must be complete before BOQ approval

### Practical meaning

Survey gives the ground truth.
Without survey, wrong BOQ, wrong costing, and wrong execution planning can happen.

### Request flow

- `Presales` asks `Engineering` for survey support
- `Engineer` submits survey findings
- `Engineering Head` reviews survey quality
- survey becomes input for BOQ and design

## Stage 4: BOQ And Technical Design

### Main owner

- operationally prepared by `Presales` and `Engineering` depending on final process split
- technically governed by `Engineering Head`
- approval by `Department Head` or designated approver

### What happens

1. BOQ lines are prepared
2. site-wise and project-wise aggregation is made
3. drawings and design logic are prepared where needed
4. technical deviations are tracked
5. change requests and assumptions are recorded

### Main tabs used

- `Engineering > BOQ`
- `Engineering > Drawings`
- `Engineering > Change Requests`
- `Engineering > Technical Deviations`

### Request flow

- `Presales` sends requirement / tender scope to `Engineering`
- `Engineering` returns survey-backed BOQ / design input
- if any deviation is needed, `Engineering` logs it
- approver reviews BOQ readiness

## Stage 5: Costing And Bid Pricing

### Main owner

- `Presales Tendering Head`
- finance/commercial support where needed

### What happens

1. cost sheet is prepared
2. margin is applied
3. commercial viability is checked
4. finance needs such as EMD / PBG / tender fees are tracked
5. approval is taken before final bid submission

### Request flow

- `Presales Executive` drafts costing data
- `Presales Tendering Head` reviews
- finance-related request goes to approver chain
- `Department Head` or authorized approver approves / rejects

## Stage 6: Tender Approval And Submission

### Main owner

- `Presales Tendering Head`

### Supporting visibility

- `Director`
- `Department Head`

### What happens

1. final technical and commercial pack is frozen
2. tender is submitted for approval
3. remarks are recorded
4. on approval, bid is submitted
5. result tracking begins

### Main tabs used

- `Pre-Sales > Approvals`
- `Pre-Sales > Tender Result`

### Output

- submitted
- under clarification
- won
- lost
- cancelled
- refunded / closed as applicable

## Stage 7: Tender Result

### If lost

- record loss reason
- analyze competitor / pricing / issue
- move to archive / loss analytics

### If won

This is the most important handoff.

The flow becomes:

`Tender -> Won -> Convert To Project`

### Main owner of conversion

- `Presales Tendering Head`
- with `Department Head` / `Director` visibility

## Stage 8: Project Creation

Projects can come from 2 ways:

1. `Won Tender -> Project conversion`
2. `Direct project creation`

### After project creation

The project becomes the central command record.

The rule from the documents is:

- `Project` = command object
- `Site` = execution object
- departments = filtered views of the same truth

This means every department should work on the same project truth, not on separate disconnected records.

## Stage 9: Project Workspace

### Main owners

- `Project Manager`
- `Project Head`

### Main idea

The project workspace is the coordination cockpit.

It should show:

- overview
- sites
- milestones
- files
- activity
- blockers
- reminders
- requests / approvals
- department status slices

### PM vs PH split

`Project Manager` does:

- daily coordination
- site progress updates
- issue logging
- manpower follow-up
- petty cash request
- extension request
- communication logging
- completion readiness note

`Project Head` does:

- deadline control
- approval or rejection of PM requests
- milestone deadline governance
- exception handling
- hold / cancel / closure governance

## Stage 10: Department Handoff Model Inside Projects

The intended project lifecycle is:

1. `Survey`
2. `BOQ / Design`
3. `Costing`
4. `Procurement`
5. `Stores / Dispatch`
6. `Execution`
7. `Billing / Payment`
8. `O&M / RMA`
9. `Closed`

### Easy understanding

One department finishes its work.
Then the next department starts.
But everyone still sees the same project.

## Stage 11: Procurement

### Main owner

- `Procurement Manager`
- `Purchase`

### What happens

1. project need is received
2. indent is raised
3. vendor quotations are collected
4. comparison is made
5. PO is created
6. dispatch expectation is planned

### Main tabs used

- `Procurement > Vendor Comparisons`
- `Procurement > Indents`
- `Procurement > Purchase Orders`
- `Procurement > Petty Cash`

### Request flow

- `Project Manager` or project-side team raises material requirement signal
- `Procurement` converts need into indent / quote / PO flow
- approvals happen where policy needs
- project side gets status visibility, not full procurement ownership

### Important rule

PM can follow procurement status.
PM should not become the procurement desk.

## Stage 12: Inventory / Stores / Dispatch

### Main owner

- `Store Manager`
- `Stores Logistics Head`

### What happens

1. GRN records incoming material
2. accepted / rejected quantity is tracked
3. serial numbers are stored for important devices
4. stock position is visible
5. dispatch is planned:
   - HO to Project Store
   - Project Store to Site
   - Vendor direct to Site

### Main tabs used

- `Inventory > Overview`
- `Inventory > GRNs`
- `Inventory > Stock Position`
- `Inventory > Stock Aging`

### Request flow

- `Procurement` triggers material supply
- `Stores` receives and records stock
- `Project Manager` follows dispatch urgency and material arrival
- `Stores` updates movement and proof

## Stage 13: Execution / Installation / Commissioning

### Main owner

- `Project Manager`
- `Engineering / Execution team`
- `Field Technician`

### What happens

1. materials reach site
2. installation work starts
3. milestones are updated
4. dependencies are tracked
5. manpower logs are maintained
6. device and IP details are maintained
7. test reports and signoffs are collected

### Main tabs used

- `Execution > Project Workspace`
- `Execution > Dependencies`
- `Execution > Project Structure`
- `Execution > Commissioning > Devices & IP`
- `Execution > Commissioning > Test Reports & Signoffs`
- `Milestones`
- `Manpower Logs`
- `Communication Logs`

### Dependency rule

If a prerequisite is not complete:

- progress should block
- reason should be shown
- override should need proper justification

### Request flow

- `Project Manager` raises blocker / issue / urgency
- `Engineering` or related central team acts
- `Department Head` can override dependency when allowed
- execution status moves after approval / readiness

## Stage 14: Finance / Billing / Receipts

### Main owner

- `Accounts`

### What happens

1. billing milestones are tracked
2. invoice or billing action is recorded
3. payment receipts are tracked
4. retention is tracked
5. penalties are tracked
6. follow-ups are maintained

### Main tabs used

- `Finance > Commercial Hub`
- `Finance > Costing`
- `Finance > Billing`
- `Finance > Payment Receipts`
- `Finance > Follow Ups`
- `Finance > Customer Statement`
- `Finance > Receivable Aging`
- `Finance > Retention Ledger`
- `Finance > Penalty Deductions`

### Request flow

- `Project Manager` shares milestone completion / client readiness / support docs
- `Accounts` handles billing record
- payment updates are tracked
- `Director` / `Project Head` can monitor collections and exposure

## Stage 15: HR / Manpower

### Main owner

- `HR Manager`

### What happens

1. employees are onboarded
2. attendance is tracked
3. travel logs are maintained
4. overtime is maintained
5. technician visits are tracked
6. project manpower support is monitored

### Main tabs used

- `HR > Overview`
- `HR > Onboarding`
- `HR > Attendance`
- `HR > Travel Logs`
- `HR > Overtime`
- `HR > Technician Visits`

### Request flow

- `Project Manager` raises staffing request or shortage escalation
- `HR` reviews manpower availability
- `Project Head` approves when policy requires

## Stage 16: O&M Helpdesk

### Main owner

- `OM Operator`

### What happens

1. project goes live
2. support tickets are raised
3. issue, device, site, and SLA are tracked
4. uptime and service performance are monitored

### Main tabs used

- `O&M Helpdesk > Tickets`
- `O&M Helpdesk > Device Uptime`
- `SLA Profiles`

### Request flow

- user / support side raises ticket
- `OM Operator` works on issue
- if device fault needs return / repair, case can become `RMA`

## Stage 17: RMA

### Main owner

- `RMA Manager`

### The RMA image shows this simple flow

1. device becomes faulty
2. fault details are captured
3. dispatch / movement is tracked
4. item may go to:
   - OEM
   - Head Office
   - third-party repair
5. status is updated
6. item is classified:
   - repairable
   - non-repairable / scrap
7. if under warranty:
   - no-cost repair
8. if not under warranty:
   - repair quotation
   - approval
   - RMA PO if needed
   - delivery timeline tracking

### Who can see RMA

Documents indicate RMA visibility for:

- `Project Head`
- `RMA Manager`
- `Project Manager`
- `Purchase Head / Procurement side`
- `Director`

### Main tab used

- `RMA`

## Stage 18: Documents

### Main idea

Documents are shared support records across all modules.

They should store:

- tender files
- survey photos
- BOQ files
- drawings
- approvals
- vendor quotations
- PO copies
- GRN proof
- execution evidence
- signoff documents
- invoices
- HR support documents
- RMA proof

### Main tab used

- `Document Management`

### Rule

Document visibility should follow role permission and record access.

## Stage 19: Alerts, Reminders, And Collaboration

### Alerts

Alerts are:

- system-generated
- event-driven
- sent only to relevant users

Examples:

- project created
- approval assigned
- stage approved
- stage rejected
- milestone overdue
- document expiry
- dispatch event
- invoice event
- ticket escalation
- RMA movement

### Reminders

Reminders are:

- user-created
- private by default
- used to remind yourself about work

Example:

- PM sets reminder to revisit blocked site tomorrow

### Collaboration

Discussion should stay attached to records such as:

- project
- site
- milestone
- approval
- document
- ticket
- RMA

## Most Important Request And Approval Flows

This is the easiest section for beginners.

## 1. Tender Approval Flow

- `Presales Executive` prepares tender record
- `Presales Tendering Head` reviews and submits
- `Department Head` or authorized approver approves / rejects
- `Director` monitors major cases

## 2. Survey To BOQ Flow

- `Presales` requests technical support
- `Engineer` performs survey
- `Engineering Head` validates
- BOQ and design work starts

## 3. BOQ / Costing Approval Flow

- draft prepared by operational team
- submitted to approver
- approver checks readiness
- approved item moves to next stage
- rejected item goes back for correction

## 4. Project Stage Handoff Flow

- current department finishes work
- department submits stage completion
- `Project Manager` tracks handoff
- `Project Head` / approver reviews
- next department receives action

## 5. Material Requirement Flow

- `Project Manager` raises need or urgency note
- `Procurement` processes indent / quotations / PO
- `Stores` receives stock and dispatches
- `Project Manager` confirms site need and follow-up

## 6. Blocker / Dependency Override Flow

- project or site is blocked
- blocker reason is logged
- relevant team is informed
- if exception is needed, `Department Head` gives override with reason

## 7. Timeline Extension Flow

- `Project Manager` raises extension request
- request goes to `Project Head`
- `Project Head` approves or rejects
- system updates project or milestone deadline if approved

## 8. Staffing Request Flow

- `Project Manager` raises manpower shortage / staffing request
- request goes to `HR`
- if needed, `Project Head` approves escalation
- staff assignment is updated

## 9. Petty Cash Flow

- `Project Manager` raises petty cash request
- `Project Head` and/or finance control reviews
- on approval, funds / limit is tracked
- PM later submits utilization summary

## 10. Billing Support Flow

- execution milestone is achieved
- `Project Manager` shares completion readiness / signoff support
- `Accounts` creates billing action
- payment receipt is tracked
- retention / penalty also tracked

## 11. Ticket To RMA Flow

- support ticket is raised in O&M
- `OM Operator` works on issue
- if physical device fault is confirmed, case is converted to `RMA`
- `RMA Manager` handles return / repair / replacement cycle

## Who Sends What To Whom

| Sender | Sends / Raises | Receiver |
| --- | --- | --- |
| Presales Executive | tender draft, compliance data, costing draft | Presales Tendering Head |
| Presales Tendering Head | tender approval request | Department Head / Director as per policy |
| Presales | survey requirement | Engineering |
| Engineer | survey findings | Engineering Head / Presales |
| Engineering | BOQ / drawings / deviations | approver + downstream teams |
| Project Manager | material requirement / dispatch follow-up | Procurement / Stores |
| Project Manager | blocker report | Project Head / relevant department |
| Project Manager | timeline extension request | Project Head |
| Project Manager | staffing request | HR / Project Head |
| Project Manager | petty cash request | Project Head / Finance |
| Project Manager | completion readiness note | Project Head / I&C / Accounts |
| Procurement | PO / supply status | Project side + Stores |
| Stores | dispatch / GRN / stock movement update | Project side + Procurement |
| Accounts | billing / receipt status update | Project Head / Director / project stakeholders |
| OM Operator | ticket escalation | RMA Manager or higher support chain |
| RMA Manager | repair approval / quotation need | approver / procurement / management |

## Module-Wise Simple Beginner Explanation

## Pre-Sales

Use this when business has not yet become a project.

It covers:

- tenders
- bid tracking
- EMD tracking
- tender approvals
- tender result

## Projects

Use this after a project exists.

It is the command center for:

- project overview
- milestones
- team
- files
- requests
- project-level follow-up

## Engineering

Use this for:

- survey
- BOQ
- drawings
- deviations
- technical changes

## Procurement

Use this for:

- vendor comparison
- indents
- purchase orders
- procurement follow-up

## Inventory

Use this for:

- GRN
- stock
- dispatch traceability
- inventory control

## Execution

Use this for:

- site progress
- dependencies
- commissioning
- devices and IP
- signoff evidence

## Finance

Use this for:

- costing
- billing
- receipts
- retention
- penalties

## HR

Use this for:

- onboarding
- attendance
- travel
- overtime
- technician visits
- manpower support visibility

## O&M Helpdesk

Use this after go-live support starts.

It covers:

- tickets
- uptime
- SLA-linked support

## RMA

Use this when equipment is faulty and must be repaired, replaced, or scrapped.

## Reports

Use this for summary and management tracking.

## Documents

Use this for record evidence across all modules.

## Settings And Master Data

Use this for:

- department
- designation
- role
- permission
- user management
- checklists
- audit rules

## Three Example Flows For Easy Understanding

## Example 1: Tender Won To Project Delivery

1. `Presales` enters tender
2. `Presales` checks go / no-go
3. `Engineering` performs survey
4. `BOQ` and `Costing` are prepared
5. approval is taken
6. bid is submitted
7. bid is won
8. tender is converted to project
9. `Project Manager` starts project coordination
10. `Procurement` buys materials
11. `Stores` dispatches materials
12. `Execution` installs and commissions
13. `Accounts` bills the client
14. payment is tracked
15. project moves to support / closure

## Example 2: Site Blocked During Execution

1. material or readiness issue blocks site
2. `Project Manager` logs blocker
3. relevant department is notified
4. if exception is needed, approval is requested
5. `Department Head` can override with written reason
6. after resolution, site moves forward

## Example 3: Device Fault After Go-Live

1. ticket is raised in `O&M Helpdesk`
2. `OM Operator` checks issue
3. device is found faulty
4. case is converted to `RMA`
5. `RMA Manager` checks warranty
6. item goes for OEM / HO / repair partner handling
7. repair or replacement status is tracked
8. item returns or is scrapped
9. closure is recorded

## Important Business Rules To Remember

1. departments are separate entry points, but they should work on the same project truth
2. `Project Manager` is coordinator, not owner of every specialist transaction
3. `Project Head` controls deadline and governance approvals
4. `Director` sees the broadest view
5. `Inventory` is a real operational control area, not just a view
6. `Documents`, `Alerts`, `Approvals`, and `Activity` support every department
7. `RMA` starts after a fault, often from helpdesk or project-side issue history

## Short Beginner Cheat Sheet

If you are totally new, remember only this:

- `Pre-Sales` wins business
- `Projects` coordinates delivery
- `Engineering` defines technical truth
- `Procurement` buys
- `Stores` receives and dispatches
- `Execution` installs and commissions
- `Finance` bills and tracks money
- `HR` supports manpower
- `O&M` supports live systems
- `RMA` handles faulty equipment

## Final Simple Summary

This ERP is not many separate apps.

It is one connected operating system for the company:

- first business is captured in `Pre-Sales`
- then it becomes a `Project`
- then departments work in sequence and in coordination
- then billing and payment are tracked
- then support continues through `O&M` and `RMA`

The most important control points are:

- request
- approval
- handoff
- visibility
- audit trail

That is the full business flow in simple form.
