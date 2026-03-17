# Backend Project Spine Model

## Purpose

This note defines the intended operating model for the ERP after a tender is converted into a project.

Use this as the design anchor for:

- dashboards
- access control
- stage visibility
- project summary logic
- site rollups

## Core Rule

After tender conversion, the ERP should behave as a:

- `Project -> Site -> Stage` system

Everything operational should hang off that spine.

## Explicit Presales Exclusion

`Presales` is excluded from the project operating model after tender conversion.

Presales is only relevant for:

- tender creation
- tender qualification / compliance
- tender submission / reminders / result
- marking a tender as won
- converting the won tender into a project

After conversion:

- presales should not drive project dashboards
- presales should not own project-stage visibility
- presales should not be treated as a project operations department

The project operating model begins after the tender becomes a project.

## Backbone

### Project

`Project` is the management unit.

It should answer:

- what client/project is this?
- what stage is the project in overall?
- how many sites belong to it?
- who owns delivery?
- how much of the total site scope is covered?

Suggested core fields:

- linked tender
- client / organization
- project head
- project manager
- total sites
- current project stage
- overall progress %
- blocked yes/no
- blocker summary

### Site

`Site` is the execution unit.

Departments mostly work at site level, not only at project level.

It should answer:

- where is work actually happening?
- what stage is this site in?
- what is blocked at this site?
- which department currently owns the next action?

Suggested core fields:

- linked project
- site code
- location
- current site stage
- site progress %
- blocked yes/no
- current owner role
- current owner user

### Stage

`Stage` is the lifecycle and visibility unit.

Projects and sites should both carry stage awareness.

Suggested stage flow:

1. `SURVEY`
2. `BOQ_DESIGN`
3. `COSTING`
4. `PROCUREMENT`
5. `STORES_DISPATCH`
6. `EXECUTION`
7. `BILLING_PAYMENT`
8. `OM_RMA`
9. `CLOSED`

This can be adjusted, but the principle should remain:

- project moves through stages
- site also moves through stages
- visibility and actionability depend on stage

## Visibility Model

Visibility should depend on 3 things together:

1. `role/designation altitude`
2. `project/site relevance`
3. `current stage`

### Always Full Picture

- `Director`
- `Project Head`

These roles should always retain:

- full project summary
- full site rollup
- cross-stage visibility
- drill-down into blockers and department status

### Functional Full View In Their Lane

- `Engineering Head`
- `Accounts Head`
- `HR Head`
- `Procurement Head`
- `Store Head`
- `RMA Head`

These roles should see:

- all relevant projects in their lane
- all relevant sites in their lane
- only the stages that belong to their function in detail
- project summary context for decision-making

### Operational View

- `Project Manager`
- engineers
- coordinators
- purchase/store executives
- field technicians
- operators

These users should mainly see:

- assigned projects
- assigned sites
- current actionable stage
- blockers and pending actions

## Dashboard Logic

Every department dashboard should show 3 layers:

### 1. Project Summary

Example for engineering:

- project name
- total sites
- surveyed sites
- BOQ-ready sites
- blocked sites
- engineering coverage %

### 2. Site Coverage

Inside each project, show site-level coverage:

- surveyed
- pending
- blocked
- completed

### 3. Action Queue

What needs work now:

- sites pending action
- blocked sites
- overdue tasks
- approvals pending

## Department Interpretation

Departments should not behave as isolated modules.

They are different views of the same project-site structure.

### Engineering

Should see:

- projects being worked on
- site coverage within each project
- survey / BOQ / design readiness
- engineering blockers

### Procurement

Should see:

- project-wise procurement progress
- site-wise material readiness where relevant
- vendor comparison / PO / delivery state

### Stores

Should see:

- project-wise dispatch coverage
- site-wise material issued / received / pending

### Execution

Should see:

- site progress
- installation stage
- dependencies / blockers
- DPR / signoff readiness

### Accounts

Should see:

- project-wise billing status
- milestone payment coverage
- pending receipts / retention / deductions

### HR

Should see:

- project manpower allocation
- staffing by project / site
- attendance / travel / overtime relevance where tied to projects

### O&M / RMA

Should see:

- project-wise live support status
- site uptime
- tickets
- RMA replacements

## Summary Rule

The ERP should be read like this:

- `Project` = management summary
- `Site` = execution truth
- `Stage` = visibility and workflow gate
- `Role` = access altitude

That is the cleanest production model for the current ERP.
