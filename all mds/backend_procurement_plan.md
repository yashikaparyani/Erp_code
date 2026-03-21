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
