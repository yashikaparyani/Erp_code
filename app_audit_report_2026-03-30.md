# ERP App-Wide Patch Audit Report
**Date:** March 30, 2026  
**Scope:** Full frontend ↔ backend contract audit — roles, DocPerms, API methods, type fields, navigation

---

## Summary

| Priority | Category | Issues Found | Status |
|---|---|---|---|
| **P0** | Runtime Breakage | 6 | ⬜ Pending |
| **P1** | Phantom Role Names | 34 occurrences / 21 files | ⬜ Pending |
| **P2** | DocPerm Expansion | ~30 role×DocType gaps | ⬜ Pending |
| **P3** | Navigation & Routing | 5 issues | ⬜ Pending |
| **P4** | Type Alignment (latent) | 4 issues | ⬜ Pending |

---

## P0 — Runtime Breakage (Active bugs, visible to users)

### P0.1 — Tender Funnel: Field Name + Missing Fields
**File:** `erp_frontend/src/components/presales/FunnelTenderTable.tsx`  
**Impact:** Entire presales funnel dashboard broken — wrong colors on all cards, 8 badge columns always blank

| Frontend expects | Backend returns | Fix |
|---|---|---|
| `funnel_color_key` | `computed_funnel_status` | Rename in serializer or remap in frontend |
| `latest_bid` (object) | Not fetched | Add to `get_tenders` fields |
| `bid_opening_date` | Not fetched | Add to `get_tenders` fields |
| `enquiry_pending` | Not fetched | Add to `get_tenders` fields |
| `pbg_percent` | Not fetched | Add to `get_tenders` fields |
| `pu_nzd_qualified` | Not fetched | Add to `get_tenders` fields |
| `latest_corrigendum_date` | Not fetched | Add to `get_tenders` fields |
| `consultant_name` | Not fetched | Add to `get_tenders` fields |
| `closure_letter_received` | Not fetched | Add to `get_tenders` fields |

---

### P0.2 — GRN Stats: Field Name Mismatch
**File:** `erp_frontend/src/app/grns/page.tsx`  
**Impact:** "Total Value" card on GRN dashboard always shows ₹0

| Frontend reads | Backend returns | Fix |
|---|---|---|
| `stats.total_amount` | `total_value` | Rename in frontend or backend to match |
| `stats.submitted` | `submitted` | Add `submitted` to `GRNStats` type |

---

### P0.3 — DocPerm: Presales + Procurement Roles Can't Read Their Own DocTypes
**File:** `frappe-bench/apps/gov_erp/gov_erp/role_utils.py` → `ANDA_ROLE_GRANTS`  
**Impact:** `frappe.get_all()` returns empty for these roles. Entire presales and procurement workflows broken.

| Role | DocType(s) Missing | Permission Needed |
|---|---|---|
| Presales Tendering Head | GE Tender, GE BOQ, GE Cost Sheet | read, write, create, delete |
| Presales Executive | GE Tender, GE BOQ, GE Cost Sheet | read, write, create |
| Procurement Manager | GE Vendor Comparison Sheet, Material Request, Purchase Order | read, write, create |
| Store Manager | Purchase Receipt (GRN) | read, write, create |
| Stores Logistics Head | Purchase Receipt (GRN), Project | read, write, create / read |

---

### P0.4 — DocPerm: Spine-Reader Roles Can't Read Project
**File:** `frappe-bench/apps/gov_erp/gov_erp/role_utils.py` → `ANDA_ROLE_GRANTS`  
**Impact:** All department staff see empty project lists when hitting spine APIs

| Role | Missing DocPerm | Permission Needed |
|---|---|---|
| Engineering Head | Project, GE Site | read, write |
| Engineer | Project, GE Site | read |
| Department Head | Project, GE Tender, GE BOQ, GE Cost Sheet | read, write |
| Accounts | Project, GE BOQ, GE Cost Sheet, Employee | read |
| HR Manager | Employee, Project | read, write |
| RMA Manager | Project, GE Ticket | read, write |
| Field Technician | Project | read |
| OM Operator | Project | read |

---

### P0.5 — Missing Backend Function: `get_dependency_rules`
**File:** `erp_frontend/src/app/api/execution/dependency-rules/route.ts:9`  
**Impact:** Any page loading execution dependency rules returns 404

- Function is in `CONNECTED_METHODS` whitelist (ops/route.ts)
- **Does not exist** anywhere in `gov_erp` Python package
- **Fix:** Either implement `get_dependency_rules` in `api.py` or remove it from the whitelist and the route

---

### P0.6 — Misrouted Backend Function: `get_workspace_permissions`
**File:** `erp_frontend/src/context/WorkspacePermissionContext.tsx:90`  
**Impact:** WorkspacePermissionContext fails on every page load that uses it

- Frontend calls `gov_erp.api.get_workspace_permissions`
- Function actually lives in `gov_erp.rbac_api` (wrong module)
- **Fix:** Add a forwarding stub in `api.py` that calls `rbac_api.get_workspace_permissions`

---

## P1 — Phantom Role Names (34 occurrences, 21 files)

Every phantom role causes `canEdit` / `canApprove` / `canDelete` to always return `false` for users with the correct canonical role.

### P1.1 — `"HR User"` → `"HR Manager"` (7 occurrences, 5 files)
| File | Lines |
|---|---|
| `app/hr/onboarding/[id]/page.tsx` | 76 |
| `app/hr/travel-logs/[id]/page.tsx` | 69 |
| `app/hr/leave/applications/[id]/page.tsx` | 68, 70 |
| `app/hr/regularizations/[id]/page.tsx` | 75, 77 |
| `app/hr/overtime/[id]/page.tsx` | 67 |

### P1.2 — `"O&M Manager"` → `"OM Operator"` (4 occurrences)
| File | Lines |
|---|---|
| `app/rma/[id]/page.tsx` | 90 |
| `app/om-helpdesk/[id]/page.tsx` | 93 |
| `app/milestones/[id]/page.tsx` | 59 |
| `app/sla-penalties/[id]/page.tsx` | 70 |

### P1.3 — `"I&C Manager"` → `"Engineering Head"` / `"Project Manager"` (4 occurrences)
| File | Lines |
|---|---|
| `app/execution/commissioning/checklists/[id]/page.tsx` | 59 |
| `app/execution/commissioning/test-reports/[id]/page.tsx` | 63 |
| `app/execution/commissioning/devices/[id]/page.tsx` | 70 |
| `app/execution/commissioning/client-signoffs/[id]/page.tsx` | 60 |

### P1.4 — `"Engineering Executive"` → `"Engineer"` (3 occurrences)
| File | Lines |
|---|---|
| `app/engineering/drawings/[id]/page.tsx` | 82 |
| `app/engineering/change-requests/[id]/page.tsx` | 81 |
| `app/engineering/deviations/[id]/page.tsx` | 104 |

### P1.5 — `"Finance Manager"` / `"Billing Manager"` → `"Accounts"` (5 occurrences)
| File | Phantom Role | Lines |
|---|---|---|
| `app/petty-cash/[id]/page.tsx` | Finance Manager, Accounts Manager | 66 |
| `app/finance/retention/[id]/page.tsx` | Finance Manager, Billing Manager | 68 |
| `app/finance/follow-ups/[id]/page.tsx` | Finance Manager, Finance User, Billing Manager | 74 |

### P1.6 — `"Store Approver"` / `"Store Keeper"` → `"Stores Logistics Head"` / `"Store Manager"` (3 occurrences)
| File | Phantom Role | Lines |
|---|---|---|
| `app/dispatch-challans/[id]/page.tsx` | Store Approver | 80 |
| `app/dispatch-challans/[id]/page.tsx` | Store Keeper, Store Approver | 81 |

### P1.7 — `"Accounts Manager"` / `"Finance User"` → `"Accounts"` (2 occurrences)
Already captured in P1.5 files.

### P1.8 — Miscellaneous Phantom Roles
| Phantom Role | Correct Role | File |
|---|---|---|
| `"O&M Head"` | `"RMA Manager"` / `"OM Operator"` | `app/sla-penalties/[id]/page.tsx:70` |
| `"Helpdesk Agent"` | `"OM Operator"` | `app/om-helpdesk/[id]/page.tsx:93` |
| `"QA Manager"` | Needs decision — no canonical equivalent | `app/execution/commissioning/test-reports/[id]/page.tsx:63` |
| `"Network Engineer"` | `"Engineer"` | `app/execution/commissioning/devices/[id]/page.tsx:70` |
| `"Site Engineer"` | `"Engineer"` / `"Field Technician"` | `app/execution/commissioning/checklists/[id]/page.tsx:59` |
| `"Execution User"` | Replace with actual canonical role | `app/execution/page.tsx:165` |

---

## P2 — DocPerm Expansion (Secondary gaps)

These are additional role×DocType gaps beyond the P0.3/P0.4 fixes.

| Role | DocType | Permission Needed |
|---|---|---|
| Project Head | GE Tender | read |
| Project Head | GE BOQ, GE Cost Sheet | read, write |
| Project Head | Material Request, Purchase Order | read, write |
| Project Head | Employee | read, write |
| Project Head | GE Project Inventory | read, write, create |
| Project Manager | GE Project Inventory | read, write, create |
| RMA Manager | GE Ticket | read, write |
| Store Manager | GE Vendor Comparison Sheet | read |

---

## P3 — Navigation & Routing Issues

### P3.1 — 6 Built HR Pages Not in Sidebar
All functional, all unreachable from the nav:

| Missing Link | Route |
|---|---|
| HR Approvals | `/hr/approvals` |
| HR Employees | `/hr/employees` |
| Leave Applications | `/hr/leave/applications` |
| HR Operations | `/hr/operations` |
| Attendance Regularizations | `/hr/regularizations` |
| HR Reports | `/hr/reports` |

### P3.2 — Orphan Pages (no sidebar link)
| Route | Notes |
|---|---|
| `/dispatch-challans` | Fully built page, zero nav references |
| `/sla-penalties` | Fully built page, zero nav references |

### P3.3 — SLA Profiles Label → Wrong Route
- Sidebar item "SLA Profiles" → `/sla`
- Actual SLA Profiles page is at `/sla-profiles`
- **Fix:** Change sidebar href to `/sla-profiles`

### P3.4 — 4 Duplicate Parent/Child hrefs
Sidebar parent `href` === first child `href` — clicking parent does the same as clicking the child, wasting the expand interaction:

| Parent | Duplicate Child |
|---|---|
| Procurement → `/procurement` | "Vendor Comparisons" → `/procurement` |
| Inventory → `/inventory` | "Overview" → `/inventory` |
| O&M & Helpdesk → `/om-helpdesk` | "Tickets" → `/om-helpdesk` |
| Document Management → `/documents` | "Document Register" → `/documents` |

### P3.5 — `roleAccess` Map Points to Stale Top-Level Routes
In `RoleContext.tsx`, `roleAccess` grants access to top-level paths that the sidebar no longer uses (nested equivalents added later):

| `roleAccess` path | Correct sidebar path |
|---|---|
| `/sla-profiles` | `/sla` |
| `/technician-visits` | `/hr/technician-visits` |
| `/drawings` | `/engineering/drawings` |
| `/change-requests` | `/engineering/change-requests` |
| `/payment-receipts` | `/finance/payment-receipts` |
| `/retention` | `/finance/retention` |
| `/penalties` | `/finance/penalties` |

---

## P4 — Type Alignment (Latent mismatches)

Low priority — no active display bugs, but will fail silently if fields are wired to UI:

### P4.1 — Tender Detail Type Incomplete
**File:** `app/pre-sales/[id]/page.tsx` (or equivalent tender detail page)  
Fields returned by backend `get_tender` but missing from `Tender` TypeScript type:
`emd_amount`, `emd_required`, `pbg_required`, `pbg_amount`, `tender_owner`, `submission_status`, `finance_readiness`

### P4.2 — Indents: `accountability_submitted_by` Untyped
**File:** `app/indents/page.tsx`  
Backend `_attach_indent_accountability_summary` returns `accountability_submitted_by` but it's not in the `Indent` interface.

### P4.3 — GRN List: `submitted` Not in `GRNStats` Type
**File:** `app/grns/page.tsx`  
Backend returns `submitted` count in stats but frontend type doesn't include it (missing stat card).

### P4.4 — Tickets: Several Fields Returned but Untyped
**File:** `app/om-helpdesk/page.tsx`  
Fields returned but not in `Ticket` type: `due_date`, `impact_level`, `source_issue_id`, `closed_on`

---

## Recommended Fix Order

```
P0.3 + P0.4  →  DocPerm grants         (single backend call, highest blast radius)
P0.1         →  Tender funnel fields   (backend serializer + frontend type)
P0.2         →  GRN stats rename       (one-line fix)
P0.5         →  Implement get_dependency_rules or remove it
P0.6         →  Forward get_workspace_permissions in api.py
P1.1–P1.8   →  Phantom role strings   (34 find-and-replace, 21 files)
P2.1–P2.8   →  Expand ANDA_ROLE_GRANTS
P3.1–P3.5   →  Sidebar wiring
P4.1–P4.4   →  Type completeness
```

---

*Generated by automated audit — March 30, 2026*
