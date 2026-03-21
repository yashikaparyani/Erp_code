# Backend Org Mapping

## Purpose

This file explains the real organization structure gathered from client-side artifacts and maps it to the current ERP roles, departments, and designations.

Use this when:

- an agent needs to understand who actually exists in the organization
- frontend collaborators need business labels that match client expectations
- backend permissions need to be aligned with real hierarchy instead of generic placeholders

## Source Inputs

This mapping is based on:

- `Erp_code/hiearchy.jpeg`
- `Erp_code/HR Organitional Chart.xlsx`
- `Erp_code/anda acess.md`
- `Erp_code/ANDA.xlsx`

## What Each Source Gives Us

### `hiearchy.jpeg`

Provides the reporting shape:

- `Director`
- `Project Head`
- `Engineering Head`
- `Presales Head`
- `HR Head`
- `Accounts Head`
- multiple project managers (`PM1` to `PM4`)
- execution / support roles such as `Network Engineer`, `Operator`, `Technical Executive`, `MIS Executive`, `Assistant Manager`, `Floor Incharge`

### `HR Organitional Chart.xlsx`

Provides real department names and actual designations in use:

- `HR & Legal Head`
- `Project Head`
- `Accounts Manager`
- `Sr. Accounts Executive`
- `Accounts Executive`
- `Presales Manager`
- `Sr. Presales Executive`
- `Presales Executive`
- `Asst. Manager (Network & Hardware)`
- `IT Engineer (Network & Hardware)`
- `Service Assurance Manager (Trainee)`
- `Asst. Projects Manager`
- `Project Coordinator`
- `Sr. Purchase Manager`
- `Asst. Purchase Manager`
- `HR Manager`
- `HR Executive`
- `Store Incharge`
- `Executive- Store Incharge`
- `AGM (Sales & Market)`

It also confirms these functional groups:

- `Accounts Department`
- `Presales Department`
- `Central Team`
- `Project Coordinator Department`
- `Purchase Department`
- `HR/Admin Department`
- `Store Department`
- `Sales Department`

### `anda acess.md`

Provides access expectations by business area:

- milestone and survey: `Project Manager`, `Project Head`, `Director`, `Engineering Head`
- procurement tracker and issue log: `Procurement Head`, `Project Head`, `Director`, `Engineering Head`
- client payment milestone: `Project Manager`, `Project Head`, `Director`
- material consumption: `Project Manager`, `Project Head`, `Purchase Head`, `Director`
- communication log: `Project Manager`, `Project Head`, `Director`, `Engineering Head`
- RMA tracker: `Project Head`, `RMA Head`, `Project Manager`, `Purchase Head`, `Director`
- project assets/services: `Project Head`, `Project Manager`
- petty cash: `Project Head`, `Project Manager`
- project manpower: `Project Head`, `Project Manager`, `Director`, `HR`

## Clean Org Picture

### Leadership Layer

- `Director`
- `HR & Legal Head`
- `Project Head`

### Functional Heads / Managers

- `Accounts Manager`
- `Presales Manager`
- `Sr. Purchase Manager`
- `HR Manager`
- `Store Incharge`
- `AGM (Sales & Market)`
- `Asst. Manager (Network & Hardware)`
- `Service Assurance Manager (Trainee)`
- `Asst. Projects Manager`

### Execution / Team Roles

- `Sr. Accounts Executive`
- `Accounts Executive`
- `Sr. Presales Executive`
- `Presales Executive`
- `IT Engineer (Network & Hardware)`
- `Project Coordinator`
- `Asst. Purchase Manager`
- `HR Executive`
- `Executive- Store Incharge`

## Recommended Separation

Do not treat all of the above as permission roles.

We need two layers:

1. `Designation / Department reality`
2. `System permission role`

That keeps HR masters faithful to the client org while keeping permissions manageable.

## Mapping: Real Designation -> System Role

| Real Designation / Position | Department | Recommended System Role | Notes |
| --- | --- | --- | --- |
| Director | Leadership | `Director` | Keep as top-level override role |
| HR & Legal Head | HR / Legal | `HR Head` | New alias/role recommended |
| Project Head | Projects | `Project Head` | Missing today, should be added |
| Accounts Manager | Accounts | `Accounts Head` or `Accounts` | Prefer explicit `Accounts Head` |
| Sr. Accounts Executive | Accounts | `Accounts` | Operational finance user |
| Accounts Executive | Accounts | `Accounts` | Operational finance user |
| Presales Manager | Presales | `Presales Head` | Current closest role is `Presales Tendering Head` |
| Sr. Presales Executive | Presales | `Presales Executive` | Keep as execution-level tender role |
| Presales Executive | Presales | `Presales Executive` | Keep |
| Asst. Manager (Network & Hardware) | Central Team | `Engineering Head` or `Central Team Lead` | Current closest is `Engineering Head`; likely needs later split |
| IT Engineer (Network & Hardware) | Central Team | `Engineer` or `Network Engineer` | `Network Engineer` should be added later |
| Service Assurance Manager (Trainee) | Project Coordinator | `Project Manager` or `Service Assurance` | Current closest is `Project Manager`, but not ideal |
| Asst. Projects Manager | Project Coordinator | `Project Manager` | Good operational fit |
| Project Coordinator | Project Coordinator | `Project Coordinator` | New role recommended |
| Sr. Purchase Manager | Purchase | `Procurement Manager` | Best current match |
| Asst. Purchase Manager | Purchase | `Purchase` | Best current match |
| HR Manager | HR/Admin | `HR Manager` | Already exists and fits well |
| HR Executive | HR/Admin | `HR Executive` | New lower-level HR role optional; current system can keep under `HR Manager` for now |
| Store Incharge | Store | `Store Manager` | Good current match |
| Executive- Store Incharge | Store | `Stores Logistics Head` or `Store Executive` | Current closest is `Stores Logistics Head` |
| AGM (Sales & Market) | Sales | `Sales Head` or `Director Read` | Currently unmapped in backend |
| PM1 / PM2 / PM3 / PM4 | Projects | `Project Manager` | Keep as same permission role, separate by employee/designation |
| Operator | Operations | `Operator` | Missing today |
| Technical Executive | Operations | `Technical Executive` | Missing today |
| MIS Executive | MIS | `MIS Executive` | Missing today |
| Assistant Manager | Multi-function | Context-specific | Avoid generic permission role if possible |
| Floor Incharge | Operations | `Floor Incharge` | Missing today |
| RMA Head | RMA | `RMA Manager` | Current closest role |
| Purchase Head | Purchase | `Procurement Manager` | Current closest role |

## Mapping: Client Access Labels -> Current App Roles

| Client Label | Current Closest App Role | Gap |
| --- | --- | --- |
| `Project Head` | `Department Head` | Too generic; should be replaced with explicit `Project Head` |
| `Presales Head` | `Presales Tendering Head` | Naming mismatch only |
| `HR Head` / `HR & Legal Head` | `HR Manager` | Slight seniority mismatch |
| `Accounts Head` | `Accounts` | Seniority mismatch |
| `Procurement Head` | `Procurement Manager` | Close enough for now |
| `Purchase Head` | `Procurement Manager` | Close but not exact |
| `RMA Head` | `RMA Manager` | Close enough for now |
| `PM1..PM4` | `Project Manager` | Good permission-level grouping |

## Department Master Recommendation

The department master should reflect the HR workbook, not generic ERP assumptions.

Recommended department labels:

- `Leadership`
- `Projects`
- `Accounts Department`
- `Presales Department`
- `Central Team`
- `Project Coordinator Department`
- `Purchase Department`
- `HR/Admin Department`
- `Store Department`
- `Sales Department`
- `RMA`
- `O&M`

## Designation Master Recommendation

These should be stored almost exactly as client-facing HR designations:

- `Director`
- `HR & Legal Head`
- `Project Head`
- `Accounts Manager`
- `Sr. Accounts Executive`
- `Accounts Executive`
- `Presales Manager`
- `Sr. Presales Executive`
- `Presales Executive`
- `Asst. Manager (Network & Hardware)`
- `IT Engineer (Network & Hardware)`
- `Service Assurance Manager (Trainee)`
- `Asst. Projects Manager`
- `Project Coordinator`
- `Sr. Purchase Manager`
- `Asst. Purchase Manager`
- `HR Manager`
- `HR Executive`
- `Store Incharge`
- `Executive- Store Incharge`
- `AGM (Sales & Market)`
- `Network Engineer`
- `Operator`
- `Technical Executive`
- `MIS Executive`
- `Floor Incharge`

## Permission Guidance

For now, keep permission roles fewer than designations.

Recommended business permission roles:

- `Director`
- `Project Head`
- `Engineering Head`
- `Presales Head`
- `HR Head`
- `Accounts Head`
- `Project Manager`
- `Presales Executive`
- `Engineer`
- `Procurement Manager`
- `Purchase`
- `Store Manager`
- `RMA Manager`
- `HR Manager`
- `Accounts`
- `Field Technician`
- `OM Operator`

Optional later roles:

- `Project Coordinator`
- `Network Engineer`
- `MIS Executive`
- `Technical Executive`
- `Operator`
- `Store Executive`

## Current Practical Rule For Agents

Until the role model is refactored:

- use HR-sheet titles for employee/designation masters
- use current business roles for permissions
- treat `Department Head` as a temporary stand-in, mainly for `Project Head`
- do not invent new generic heads if the HR chart already gives a concrete title

## Immediate Follow-Up Recommendation

If backend role refactor work starts, do it in this order:

1. add `Project Head`
2. alias `Presales Tendering Head` -> `Presales Head`
3. alias `HR Manager` -> `HR Head` only where business approval authority is intended
4. introduce `Accounts Head` separate from `Accounts`
5. keep PM-level users under `Project Manager`

