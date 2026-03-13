# Backend Requirement Mapping

## Purpose

Map each requirement to the right backend implementation choice:

- Use ERPNext built-in
- Add custom fields to ERPNext built-in
- Create new custom DocType in `gov_erp`

## Foundation

| Requirement | Backend Choice | Notes |
| --- | --- | --- |
| Company | ERPNext built-in `Company` | Do not recreate in custom app |
| Department | ERPNext built-in `Department` | Extend only if required |
| Users | Frappe built-in `User` | Keep auth native |
| Roles | Frappe built-in `Role` | Avoid boolean permission table |
| File storage | Frappe built-in `File` | Reuse attachments and DMS links |

## Tendering

| Requirement | Backend Choice | Notes |
| --- | --- | --- |
| Client / authority master | Keep custom `GE Party` for now | Tendering uses a lightweight client/authority master that is not yet a full ERPNext `Customer` |
| Tender Organization | Custom DocType | Needed for authority master |
| Tender | Custom DocType | Main pre-sales entity |
| Tender documents | Custom child table + `File` | Link uploaded files |
| Tender compliance | Custom child tables | Tender-specific checklist state |
| EMD/PBG tracking | Custom DocTypes | Keep separate from ERPNext accounting for now |

## Survey + BOQ

| Requirement | Backend Choice | Notes |
| --- | --- | --- |
| Survey | Custom DocType | Site/tender survey records |
| Survey attachments | Custom child table + `File` | Reuse file model |
| BOQ | Custom DocType | Tender/project specific versioned BOQ |
| BOQ items | Custom child table | Site-wise support required |

## Procurement + Stores

| Requirement | Backend Choice | Notes |
| --- | --- | --- |
| Supplier | ERPNext built-in `Supplier` | Do not create custom dealer table unless required |
| Customer | ERPNext built-in `Customer` later if sales-ledger integration becomes deeper | Current tendering/client flow stays on custom `GE Party` |
| Item master | ERPNext built-in `Item` | Extend for serialized/network fields if needed |
| Indent | ERPNext built-in `Material Request` | Use custom layer only if project/site approval flow outgrows base doctype |
| RFQ | ERPNext built-in `Request for Quotation` | Reuse outbound quotation request flow |
| Vendor quotation | ERPNext built-in `Supplier Quotation` | Feed custom comparison workflow from this data |
| Purchase Order | ERPNext built-in `Purchase Order` | Add custom fields or hooks |
| Goods Receipt | ERPNext built-in `Purchase Receipt` | Prefer extension over replacement |
| Warehouse | ERPNext built-in `Warehouse` | Reuse stock structure |
| Dispatch challan | Custom DocType | Project/site logistics workflow not covered cleanly by base ERPNext |
| Stock snapshot | ERPNext built-in `Bin` | Use as live stock availability source |
| Stock movement posting | ERPNext built-in `Stock Entry` / `Delivery Note` | `GE Dispatch Challan` now posts via `Stock Entry` on dispatch |
| Vendor comparison | Custom DocType | Domain-specific approval flow |

## Execution

| Requirement | Backend Choice | Notes |
| --- | --- | --- |
| Project | ERPNext built-in `Project` | Extend instead of replacing |
| Site | Custom DocType | Required for multi-site delivery |
| Milestone | Custom DocType | Project/site-linked |
| Task | ERPNext built-in `Task` plus custom fields or custom DocType | Decide after first iteration |
| DPR | Custom DocType | Daily site reporting |
| Dependency override | Custom DocType | Audit-heavy custom logic |

## Finance + O&M

| Requirement | Backend Choice | Notes |
| --- | --- | --- |
| Invoice tracking | ERPNext built-in `Sales Invoice` with custom fields | Phase 1 tracking focus |
| Payment receipts | ERPNext built-in `Payment Entry` plus custom linkage | Extend carefully |
| Retention ledger | Custom DocType | Project-specific logic |
| Ticketing | ERPNext built-in `Issue` or custom DocType | Needs deeper decision |
| SLA timer | Custom DocType/service | Not covered enough by base ERPNext |
