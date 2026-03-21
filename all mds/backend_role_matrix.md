# Backend Role Matrix

See also:

- `Erp_code/backend_org_mapping.md` for the client-facing org/dept/designation mapping

## Goal

Move the backend away from `System Manager`-only access and toward business roles that match the ERP requirements.

HR is also part of the domain, even though it is not part of the current tender-to-costing workflow. The source docs explicitly include `Human Resource` as a department and describe a later `HR & Manpower Module` covering project manpower allocation, attendance, travel log, overtime, ESIC/PF compliance, and technician visit tracking.

## Observed Org Hierarchy

Captured from the user-provided handwritten org chart image on 2026-03-14.

Top level:

- `Director`

Direct department heads under the Director:

- `Project Head`
- `Engineering Head`
- `Presales Head`
- `HR Head`
- `Accounts Head`

Operational layer shown in the chart:

- `PM1`
- `PM2`
- `PM3`
- `PM4`

Execution/support roles shown in the chart:

- `Network Engineer`
- `Operator`
- `Technical Executive`
- `MIS Executive`
- `Assistant Manager`
- `Floor Incharge`

Implementation note:

- The handwritten chart clearly establishes the top-level reporting heads.
- The lower reporting lines are partially ambiguous in the image, so backend permissions should preserve flexibility rather than hard-code every lower-level reporting edge yet.
- Current backend role mapping should treat `Project Manager` as the closest live equivalent of `PM1` to `PM4`.
- We will likely need future role aliases or child roles for `MIS Executive`, `Assistant Manager`, `Floor Incharge`, and `Operator` once their workflow ownership becomes explicit in the frontend or business process docs.

## Role Reconciliation

This section maps the observed hierarchy to the current live app roles.

### Clean Matches

These roles already exist in the app and align well with the org chart:

- `Director`
- `Engineering Head`
- `Project Manager`
- `Accounts`

### Near Matches / Alias Candidates

These current app roles are usable, but the org chart suggests they should eventually be renamed or aliased:

- `HR Manager` -> closer to `HR Head`
- `Presales Tendering Head` -> closer to `Presales Head`
- `Department Head` -> too generic when the org chart shows named functional heads

### Roles Missing From Live App

These appear in the org chart but do not yet exist as explicit backend roles:

- `Project Head`
- `Accounts Head`
- `Network Engineer`
- `Operator`
- `Technical Executive`
- `MIS Executive`
- `Assistant Manager`
- `Floor Incharge`

### Project Layer Interpretation

The org chart strongly suggests a 3-level project-side hierarchy:

1. `Project Head`
2. multiple `Project Manager` roles (`PM1` to `PM4`)
3. field / support execution roles

For backend purposes, the likely execution-side mapping is:

- `Project Head`:
  - portfolio-level project visibility
  - approval visibility across execution, stores, O&M, and RMA
  - escalation owner for project-side issues
- `Project Manager`:
  - day-to-day site/project ownership
  - milestone, task, dependency, dispatch, ticket, and RMA initiation visibility
- field execution roles:
  - `Network Engineer`
  - `Technical Executive`
  - `Operator`
  - `Field Technician`

### HR + Project Insight

Because the org chart includes project managers and execution staff under a formal reporting structure, HR should not stay isolated as a standalone admin module only.

The HR model should eventually support:

- employee-to-project assignment
- reporting manager / department head linkage
- designation-to-role mapping
- project manpower visibility
- technician / operator / engineer assignment history

That means the org chart strengthens the case for adding:

- `reports_to_employee` or equivalent manager mapping
- employee designation master aligned to operational roles
- employee current department + current project assignment

## Phase 1 Roles

| Role | Tender | Survey | BOQ | Costing | Project Conversion | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| System Manager | Full | Full | Full | Full | Full | Admin override |
| Presales Tendering Head | Full | Read | Full | Full | Request / trigger | Main owner of tendering |
| Presales Executive | Create/Edit | Read | Draft/Edit | Draft/Edit | No | Cannot approve |
| Engineering Head | Read | Full | Read | Read | No | Survey owner |
| Engineer | Read | Create/Edit | Read | No | No | Field execution support |
| Department Head | Read | Read | Approve/Reject | Approve/Reject | Approve | Cross-functional approver |
| Accounts | Read | No | Read | Read | No | Finance visibility only |
| HR Manager | No | No | No | No | No | Owns HR onboarding, attendance, travel, overtime, statutory compliance, technician visits |
| Procurement Manager | No | No | No | No | No | Owns vendor comparison and procurement workflow |
| Purchase | No | No | No | No | No | UI-facing procurement role alias |
| Project Manager | No | No | No | No | No | Owns sites, milestones, and execution dependencies |
| Store Manager | No | No | No | No | No | Backend stores role |
| Stores Logistics Head | No | No | No | No | No | UI-facing stores/logistics role alias |
| RMA Manager | No | No | No | No | No | Owns RMA dispatch, warranty split, quote approval tracking, repair return flow |
| Top Management | Read | Read | Read | Read | Read | Dashboard/read-only |

## API Direction

### Tender APIs

- Read: `Presales Tendering Head`, `Presales Executive`, `Department Head`, `Top Management`, `System Manager`
- Write: `Presales Tendering Head`, `Presales Executive`, `System Manager`
- Convert to project: `Presales Tendering Head`, `Department Head`, `System Manager`

### Survey APIs

- Read: tender stakeholders
- Write: `Engineering Head`, `Engineer`, `System Manager`

### BOQ APIs

- Draft/Edit: `Presales Tendering Head`, `Presales Executive`, `System Manager`
- Approve/Reject: `Department Head`, `System Manager`

### Costing APIs

- Draft/Edit: `Presales Tendering Head`, `Presales Executive`, `System Manager`
- Approve/Reject: `Department Head`, `System Manager`

### Procurement APIs

- Read: `Procurement Manager`, `Presales Tendering Head`, `Accounts`, `Department Head`, `Top Management`, `System Manager`
- Write: `Procurement Manager`, `Purchase`, `System Manager`
- Approve/Reject: `Department Head`, `System Manager`

### Stores APIs

- Read: `Store Manager`, `Stores Logistics Head`, `Purchase`, `Procurement Manager`, `Department Head`, `Top Management`, `System Manager`
- Write: `Store Manager`, `Stores Logistics Head`, `System Manager`
- Approve/Reject: `Department Head`, `System Manager`

### Execution APIs

- Read: `Project Manager`, `Engineering Head`, `Engineer`, `Department Head`, `Top Management`, `System Manager`
- Write: `Project Manager`, `Engineering Head`, `Engineer`, `System Manager`
- Dependency override approval: `Department Head`, `System Manager`

### RMA APIs

- Read: `RMA Manager`, `Project Manager`, `Engineering Head`, `Engineer`, `Department Head`, `Top Management`, `System Manager`
- Write: `RMA Manager`, `Project Manager`, `Engineering Head`, `Engineer`, `System Manager`
- Approve/Reject: `RMA Manager`, `Department Head`, `Top Management`, `System Manager`

## HR Direction

- Current backend impact: `HR Manager` is active in the backend, not just seeded
- Current module access: no tender/survey/BOQ/costing permissions by default
- Current ownership:
  - employee onboarding and HR profile data
  - attendance and travel log
  - overtime and technician visit tracking
  - ESIC/PF compliance bookkeeping
  - payroll/leave remain out of scope for the current stack

## Source Notes

- `bid management system.txt` lists `Human Resource` in settings department master
- `ERP SRS DOC.docx` includes a later `HR & Manpower Module`
- HR bookkeeping form contents are now confirmed from the user conversation and include personal identity, statutory IDs, education, certifications, past employment, and mandatory document uploads

## Implementation Sequence

1. Add role constants/helper in API layer
2. Replace `_require_system_manager()` with module-specific role checks
3. Update DocType JSON permissions to mirror the matrix
4. Add source-level permission tests
5. Reload DocTypes when bench DB is available
