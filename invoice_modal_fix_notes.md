# Invoice Modal Fix Notes

Date: 2026-03-20

## Why This Fix Was Done

The `Create Invoice` modal had a few mismatches between:

- the documented bookkeeping flow
- the actual `GE Invoice` schema
- the frontend validation and UX

The biggest issues were:

- free-text fields for linked records that should behave like linked selections
- manual `Amount` entry even though line billing already used `Qty` and `Rate`
- missing `Audit Note` field even though backend requires it for milestone invoices raised before completion
- invoice type labels and milestone logic not being cleanly aligned

## Changes Done

### Billing Page

Updated:

- [`erp_frontend/src/app/finance/billing/page.tsx`](/d:/erp%20final/Erp_code/erp_frontend/src/app/finance/billing/page.tsx)

### Functional Fixes

- Replaced free-text `Customer` entry with a customer selector backed by `/api/parties`.
- Replaced free-text `Linked Project` entry with a project selector backed by `get_project_spine_list`.
- Replaced free-text `Linked Site` entry with a site selector backed by `/api/sites?project=...`.
- Auto-filled customer from the selected project when project customer is available.
- Cleared linked site when project changes to avoid stale site references.

### Invoice Amount Logic

- Removed manual billing dependence on typed `Amount`.
- Amount is now auto-calculated from:
  - `Qty x Rate`
- Sent computed amount to backend as:
  - invoice header `amount`
  - line item `amount`

### Validation Fixes

- Kept required validation for:
  - Customer
  - Linked Project
  - Invoice Date
  - Line Description
- Added validation for:
  - Qty must be greater than `0`
  - Rate cannot be negative
- Added frontend validation for milestone invoice rule:
  - if `Invoice Type = MILESTONE`
  - and `Milestone Complete = false`
  - then `Audit Note` becomes mandatory

### UX / Schema Alignment

- Showed user-friendly invoice type labels:
  - `Milestone`
  - `RA`
  - `O&M`
- Kept backend values unchanged:
  - `MILESTONE`
  - `RA`
  - `O_AND_M`
- Made `Milestone Complete` visible only for milestone invoices.
- Added `Audit Note` field only when needed.
- Added helper text for:
  - auto-calculated amount
  - project-linked customer
  - milestone audit-note requirement

## Result

The invoice modal now aligns much better with:

- `GE Invoice`
- `GE Invoice Line`
- bookkeeping flow docs
- billing workflow expectations

It should now behave like a linked commercial record creator instead of a loose free-text popup.
