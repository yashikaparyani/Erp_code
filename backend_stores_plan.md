# Backend Stores Plan

## Goal

Start the stores slice by reusing ERPNext inventory masters and adding only the custom dispatch workflow that the project needs.

## Verified Built-ins Available In This Bench

- `Warehouse`
- `Bin`
- `Item`
- `Serial No`
- `Stock Entry`
- `Delivery Note`

## Backend Choice

### Reuse ERPNext Built-ins

- `Warehouse` as store master backbone
- `Bin` as stock snapshot source
- `Serial No` for serialized items later
- `Stock Entry` / `Delivery Note` for future movement integration

### Add Custom Gov ERP Layer

- `GE Dispatch Challan`
- `GE Dispatch Challan Item`

Reason:

- the project needs a dispatch approval and site-targeted logistics layer
- ERPNext inventory stays the stock source of truth
- we should not duplicate warehouse or stock ledger masters unless the built-ins become insufficient

## Implemented In This Slice

### `GE Dispatch Challan`

Fields:

- dispatch type
- dispatch date
- status
- linked project
- linked tender
- from warehouse
- to warehouse
- target site name
- vehicle number
- transporter name
- tracking reference
- created by
- approved by
- approved at
- total items
- total qty

### `GE Dispatch Challan Item`

Fields:

- item
- description
- qty
- uom
- serial numbers
- remarks

## Business Rules

- only valid status transitions are allowed
- source and destination warehouse cannot be the same
- either destination warehouse or target site name must be provided
- line quantity must be greater than zero
- marking a challan as `DISPATCHED` checks live stock in ERPNext `Bin`
- serialized items must provide valid serial numbers at dispatch time
- serial numbers must belong to the correct item and source warehouse
- negative stock is blocked at dispatch validation time
- `WAREHOUSE_TO_WAREHOUSE` creates ERPNext `Stock Entry` with `Material Transfer`
- `WAREHOUSE_TO_SITE` creates ERPNext `Stock Entry` with `Material Issue`
- `VENDOR_TO_SITE` skips internal stock posting

## API Surface

- `get_dispatch_challans`
- `get_dispatch_challan`
- `create_dispatch_challan`
- `update_dispatch_challan`
- `delete_dispatch_challan`
- `submit_dispatch_challan_for_approval`
- `approve_dispatch_challan`
- `reject_dispatch_challan`
- `mark_dispatch_challan_dispatched`
- `get_dispatch_challan_stats`
- `get_store_stock_snapshot`

## Roles

- `Store Manager` and `Stores Logistics Head`: create/edit/dispatch challans
- `Department Head`: approve/reject challans
- `Purchase` and `Procurement Manager`: read visibility
- `Accounts` and `Top Management`: read visibility

## Next Stores Steps

1. add runtime document tests for dispatch challans
2. extend stores dashboard with GRN queue and dispatch queue endpoints
3. add GRN-facing helpers on top of `Purchase Receipt`
4. add deeper serial-number lifecycle tracking if the project needs install/RMA state
