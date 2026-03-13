# Backend Role Matrix

## Goal

Move the backend away from `System Manager`-only access and toward business roles that match the ERP requirements.

HR is also part of the domain, even though it is not part of the current tender-to-costing workflow. The source docs explicitly include `Human Resource` as a department and describe a later `HR & Manpower Module` covering project manpower allocation, attendance, travel log, overtime, ESIC/PF compliance, and technician visit tracking.

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
