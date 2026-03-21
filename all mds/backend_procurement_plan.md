# Backend Procurement Plan

## Goal

Implement Phase 4 by reusing ERPNext procurement transaction DocTypes where they already exist, and adding only the custom comparison layer needed for Technosys workflow rules.

## Verified Built-ins Available In This Bench

- `Material Request`
- `Request for Quotation`
- `Supplier Quotation`
- `Supplier`
- `Item`
- `Purchase Order`
- `Purchase Receipt`

## Backend Choice

### Reuse ERPNext Built-ins

- `Material Request` as indent
- `Request for Quotation` for RFQ dispatch
- `Supplier Quotation` for vendor quote capture
- `Purchase Order` for PO
- `Purchase Receipt` for GRN

### Add Custom Gov ERP Layer

- `GE Vendor Comparison`
- `GE Vendor Comparison Quote`

Reason:

- ERPNext gives the transaction backbone
- the project-specific 3-quote compliance, exception approval, and recommendation workflow are custom business rules

## Implemented In This Slice

### `GE Vendor Comparison`

Fields:

- linked material request
- linked RFQ
- linked project
- linked tender
- linked BOQ
- prepared by
- recommended supplier
- status
- quote count
- distinct supplier count
- lowest supplier total
- selected total amount
- exception approver
- exception reason

### `GE Vendor Comparison Quote`

Fields:

- supplier
- supplier quotation
- item
- description
- qty
- unit
- rate
- amount
- lead time days
- selected flag

## Business Rules

- only valid status transitions are allowed
- approval requires at least one selected quote
- approval requires at least 3 distinct suppliers unless exception approver + reason are recorded
- recommended supplier must appear in the quoted supplier list
- quote line amount = qty * rate

## API Surface

- `get_vendor_comparisons`
- `get_vendor_comparison`
- `create_vendor_comparison`
- `update_vendor_comparison`
- `delete_vendor_comparison`
- `submit_vendor_comparison_for_approval`
- `approve_vendor_comparison`
- `reject_vendor_comparison`
- `revise_vendor_comparison`
- `get_vendor_comparison_stats`

## Roles

- `Procurement Manager`: create/edit/delete/submit comparison sheets
- `Department Head`: approve/reject comparison sheets
- `Accounts`, `Presales Tendering Head`, `Top Management`: read visibility
- `Store Manager`: reserved for later stores/inventory slice

## Next Procurement Steps

1. add runtime document tests for vendor comparison APIs
2. wire comparison approval to PO creation readiness
3. decide whether to expose ERPNext `Supplier Quotation` directly or add helper APIs
4. start stores slice with custom stock / dispatch extensions only where ERPNext is insufficient

## PO Payment Terms & CRUD (Implemented)

### Problem

ERPNext's built-in `Purchase Order` has a generic `payment_schedule` child table, but it does not support the 6 domain-specific payment term types required by Technosys workflow, nor does it support document-mapped accounts approval.

### Solution

Added a companion layer on top of ERPNext's `Purchase Order` rather than modifying ERPNext schema directly.

### New DocTypes

#### `GE PO Payment Term` (child table, `istable = 1`)

Fields:

- `term_type` — Select with 7 options:
  1. Full Advance Before Dispatch
  2. Within X Days After Delivery
  3. Post Dated Cheque Within X Days
  4. Percentage Advance Against PO Balance Before Dispatch
  5. Percentage Advance Against PO Balance After Delivery X Days
  6. Custom
- `percentage` — Percent, required
- `amount` — Currency, read-only (computed as percentage × PO grand_total)
- `days` — Int (the "X" in term types 2, 3, 5)
- `due_date` — Date, read-only
- `status` — Select: Pending / Approved / Paid / Overdue
- `approval_document` — Attach
- `approval_document_name` — Data
- `remarks` — Small Text

#### `GE PO Extension` (parent, `autoname = field:purchase_order`)

Fields:

- `purchase_order` — Link to Purchase Order, unique, required
- `payment_terms` — Table of `GE PO Payment Term`
- `payment_terms_note` — Small Text
- `total_payment_terms_pct` — Percent, read-only (sum of all term percentages)
- `accounts_approval_status` — Select: Pending / Approved / Rejected

### Backend APIs Added (api.py)

- `create_purchase_order(data)` — creates ERPNext PO + optional payment terms
- `update_purchase_order(data)` — edits draft PO fields/items + updates payment terms
- `delete_purchase_order(name)` — deletes draft PO + linked extension
- `submit_purchase_order(name)` — submits draft PO
- `cancel_purchase_order(name)` — cancels submitted PO
- `_save_po_payment_terms(po_name, terms_list, note)` — internal helper
- `get_po_payment_terms(purchase_order)` — returns payment terms data
- `save_po_payment_terms(data)` — saves/replaces payment terms
- `approve_po_payment_terms(purchase_order)` — accounts approval
- `reject_po_payment_terms(purchase_order, reason)` — accounts rejection with reason

### Frontend API Routes

- `POST /api/purchase-orders` — create PO
- `PUT /api/purchase-orders` — update PO
- `DELETE /api/purchase-orders` — delete PO
- `GET /api/purchase-orders/detail` — get single PO with items
- `POST /api/purchase-orders/submit` — submit PO
- `POST /api/purchase-orders/cancel` — cancel PO
- `GET /api/purchase-orders/payment-terms` — get payment terms
- `POST /api/purchase-orders/payment-terms` — save payment terms
- `POST /api/purchase-orders/payment-terms/approve` — approve payment terms
- `POST /api/purchase-orders/payment-terms/reject` — reject payment terms

### Frontend Pages

- `/purchase-orders` — list page enhanced with Create PO button, clickable rows, row-level Submit/Delete/Cancel actions
- `/purchase-orders/[id]` — detail page with:
  - PO header with status badge and lifecycle actions (submit, delete, cancel)
  - Order details card (supplier, company, project, warehouse, dates, totals, % received/billed)
  - Line items table
  - Payment terms section with edit mode (add/remove terms, select from 6 types, set percentage/days/doc ref/remarks)
  - Total percentage validation (warns if not 100%)
  - Accounts approval actions (approve/reject with reason)
  - Approval status badge (Pending/Approved/Rejected)
