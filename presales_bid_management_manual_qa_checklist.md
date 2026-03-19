# Pre-Sales Bid Management Manual QA Checklist

## Purpose

Use this checklist after deployment or major changes to confirm the pre-sales bid workflow is working end-to-end.

## 1. Sidebar and navigation

- Open `Pre-Sales & Budgeting` in sidebar.
- Confirm `Tender Result` is visible.
- Confirm `Approvals` is visible.
- Confirm `Analytics > Tender Results` is not visible.
- Confirm `Analytics > MIS Reports` is not visible.
- Confirm `Pre-Sales > Document Management` is not visible.

## 2. Tender workspace

- Open any tender from `Pre-Sales > Tender`.
- Confirm it opens [pre-sales/[id]/page.tsx](d:/erp%20final/Erp_code/erp_frontend/src/app/pre-sales/[id]/page.tsx).
- Confirm overview card shows tender number, title, status, value, and project link state.
- Confirm workspace sections render without crash:
  - `Bid Flow`
  - `Survey, BOQ, and Costing`
  - `Ownership and Approval State`
  - `Result Tracking`
  - `Checklist and Reminders`
  - `Finance Snapshot`
  - `Quick Links`
  - `Submission Signal`

## 3. Tender status movement

- In workspace, click `Mark Submitted` on a valid tender.
- Confirm status updates only if readiness conditions are satisfied.
- Try `Mark Submitted` on a tender without BOQ / cost sheet / required approvals.
- Confirm user sees blocking message instead of silent success.
- Click `Mark Under Evaluation` on a submitted tender.
- Confirm status changes correctly.
- Click `Mark Won` on an eligible tender.
- Confirm status changes to `WON`.
- Confirm project is **not** auto-created only by marking `WON`.
- Click `Convert To Project`.
- Confirm linked project gets created and tender status becomes `CONVERTED_TO_PROJECT`.

## 4. Tender approvals

- Open a tender workspace.
- Use approval buttons:
  - `Go / No-Go`
  - `Technical`
  - `Commercial`
  - `Finance`
  - `Submission`
- Confirm each request creates a pending approval.
- Open `Pre-Sales > Approvals`.
- Confirm new tender approval row is visible.
- Confirm tender ID link opens the same workspace.
- Approve a tender approval item.
- Confirm tender readiness fields update in workspace.
- Reject a tender approval item.
- Confirm rejection is reflected in workspace approval history.

## 5. Tender task buckets

- Open `My Tender`.
- Confirm only current owner tenders are shown.
- Open `In-Process Tender`.
- Confirm live preparation-stage tenders are shown.
- Open `Assigned To Team`.
- Confirm active shared-workflow tenders are shown.
- Open `Submitted Tender`.
- Confirm only submitted tenders are shown.
- Open `Dropped Tender`.
- Confirm only dropped tenders are shown.
- From every task page, click `Open`.
- Confirm it opens the same tender workspace page.

## 6. Tender result tracker

- Open `Pre-Sales > Tender Result`.
- Confirm page loads without error.
- Confirm result rows show:
  - linked tender
  - stage
  - winner
  - winning amount
  - publication date
- Click `Workspace` from a result row.
- Confirm it opens linked tender workspace.
- Use `Sync Evaluation` on an evaluation-stage row.
- Confirm linked tender moves to `UNDER_EVALUATION`.
- Use `Sync Won` on an award-stage row.
- Confirm linked tender moves to `WON`.

## 7. Finance and MIS

- Open `Finance MIS`.
- Confirm live records load from finance request/instrument data.
- Open `Sales MIS`.
- Confirm user-wise tender summary loads.
- Open `Login MIS`.
- Confirm login audit rows load.

## 8. Basic regression check

- Open `Approvals` page and confirm no table crash after filters are used.
- Open `Tender Task` pages and confirm status actions do not force full browser reload.
- Confirm sidebar navigation still opens all retained pre-sales pages.

## 9. Final sanity verdict

Mark build as ready only if:

- no page crashes
- workflow links open correctly
- tender approval flow works
- status transitions are blocked when data is incomplete
- explicit `Convert To Project` works
