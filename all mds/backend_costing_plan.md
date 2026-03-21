# Backend Costing Plan

## Scope

This is the next backend slice after BOQ.

## Entities

### `GE Cost Sheet`

Fields:

- `linked_tender`
- `linked_project`
- `linked_boq`
- `version`
- `status`
- `margin_percent`
- `base_cost`
- `sell_value`
- `total_items`
- `created_by_user`
- `approved_by`
- `approved_at`
- `rejected_by`
- `rejection_reason`
- `notes`
- `items`

### `GE Cost Sheet Item`

Fields:

- `site_name`
- `item_link`
- `description`
- `cost_type`
- `qty`
- `unit`
- `base_rate`
- `base_amount`
- `remarks`

## Rules

- `base_amount = qty * base_rate`
- `base_cost = sum(base_amount)`
- `sell_value = base_cost + (base_cost * margin_percent / 100)`
- Valid status transitions:
  - `DRAFT -> PENDING_APPROVAL`
  - `PENDING_APPROVAL -> APPROVED | REJECTED | DRAFT`
  - `REJECTED -> DRAFT`
- Approved cost sheets cannot be deleted
- Optionally require linked BOQ before approval

## APIs Needed

- `get_cost_sheets`
- `get_cost_sheet`
- `create_cost_sheet`
- `update_cost_sheet`
- `delete_cost_sheet`
- `submit_cost_sheet_for_approval`
- `approve_cost_sheet`
- `reject_cost_sheet`
- `revise_cost_sheet`
- `get_cost_sheet_stats`

## Tests Needed

- amount calculation
- totals calculation
- margin calculation
- status transition validation
- reject / revise rules
