# Manual Testing Guide

Date: 2026-03-20

This guide covers the implemented changes recorded in:

- [`workleft.md`](/d:/erp%20final/Erp_code/workleft.md)

Use this when you want to manually verify the current finance and pre-sales improvements end to end.

## 1. Before You Start

Make sure:

- frontend is running
- backend/Frappe APIs are reachable
- latest schema changes are migrated
- you have at least one usable login with finance and pre-sales access

Recommended baseline data:

- 2 to 3 customers / parties
- 3 to 5 tenders
- at least 1 tender with costing
- at least 1 approval pending
- at least 1 invoice
- at least 1 payment receipt
- at least 1 competitor
- at least 1 tender result

If demo data is thin, use the seed/demo actions already available in the app where applicable.

## 2. Smoke Check First

Before manual workflow testing, verify basic health:

1. Open the app and log in.
2. Visit `Finance`, `Pre-Sales`, and the analytics pages.
3. Confirm pages load without white screen, broken layout, or console crashes.
4. Confirm API-backed tables do not show obvious `500` or `Failed to fetch` issues.

Core pages to open:

- `/finance`
- `/finance/commercial`
- `/finance/costing`
- `/finance/billing`
- `/finance/customer-statement`
- `/finance/receivable-aging`
- `/finance/follow-ups`
- `/pre-sales/approvals`
- `/pre-sales/[id]`
- `/pre-sales/analytics/company-profile`
- `/pre-sales/analytics/compare-bidders`
- `/pre-sales/analytics/competitors`
- `/pre-sales/tender-result`
- `/pre-sales/mis/finance`
- `/pre-sales/mis/sales`

Expected result:

- all pages load
- buttons render correctly
- tables and cards show data or clean empty states

## 3. Finance Workflow Testing

Target flow:

`Customer -> Estimate / Quote -> Costing -> Invoice / Proforma -> Statement -> Receivables / Payment Follow-up`

### 3.1 Commercial Hub

Page:

- `/finance/commercial`

What to test:

1. Open the page and verify KPI cards:
   - Estimate Value
   - Proforma Value
   - Receivable
   - Collected
   - Open Follow-ups
2. Check `Recommended Finance Path` is visible.
3. Check `Bookkeeping Visibility` cards:
   - Invoices Raised
   - Collection Gap
   - Customers In Aging
4. Check `Top Exposure Accounts` section.
5. Click each finance shortcut card and confirm navigation works.

Expected result:

- page looks bookkeeping-oriented, not just link-heavy
- values are shown or zero-state is clean
- no broken sections

### 3.2 Transaction Comments

Page:

- `/finance/commercial`

What to test:

1. Enter a valid customer name in `Customer filter`.
2. Select a record type:
   - Estimate
   - Proforma
   - Invoice
   - Payment Follow Up
3. Enter a valid record ID in `Record ID`.
4. Add a comment in `Add a transaction comment`.
5. Click `Add Comment`.
6. Refresh the page or re-enter same customer filter.

Expected result:

- comment saves successfully
- new comment appears in the list
- linked doctype and record name are visible
- no duplicate save on single click

Negative check:

- leave `Record ID` or content blank and see whether backend handles invalid input gracefully

### 3.3 Customer Document Exchange

Page:

- `/finance/commercial`

What to test:

1. Enter customer name.
2. Select linked record type.
3. Enter valid record ID.
4. Enter document name.
5. Choose category.
6. Enter file URL or uploaded file path.
7. Optionally add remarks.
8. Click `Share Document`.

Expected result:

- document saves
- appears in `Customer Document Exchange`
- linked customer and record context are visible
- clicking URL opens the file/path if valid

Negative check:

- try invalid file URL and confirm page does not crash

### 3.4 Costing Ownership

Page:

- `/finance/costing`

What to test:

1. Open the costing page.
2. Verify rows show ownership-related fields such as owner / approver / blocker / next step.
3. Compare multiple costing rows if present.
4. Check if missing approval or incomplete costing is visually understandable.

Expected result:

- user can tell who owns costing
- next action is understandable
- blockers are visible without opening backend data manually

### 3.5 Billing Commercial Visibility

Page:

- `/finance/billing`

What to test:

1. Open billing page.
2. Verify customer is shown clearly in invoice rows.
3. Verify collected amount / receivable / gap style fields are visible.
4. Check if TDS or deduction-related visibility appears where expected.

Expected result:

- invoice rows feel commercial and collection-aware
- not just invoice register data dump

### 3.6 Customer Statement

Page:

- `/finance/customer-statement`

What to test:

1. Open statement page.
2. Filter or select a customer if the page supports it.
3. Verify running commercial visibility:
   - invoices
   - receipts
   - outstanding
4. Match one customer with billing and receipt entries manually.

Expected result:

- quote-to-payment exposure is visible
- statement data feels customer-centric

### 3.7 Receivable Aging

Page:

- `/finance/receivable-aging`

What to test:

1. Open aging page.
2. Check customer-wise aging buckets:
   - 0-30
   - 31-60
   - 61-90
   - 90+
3. Compare one or two customer totals with invoice/receipt data if possible.

Expected result:

- buckets render correctly
- no obviously wrong negative or empty totals unless data is actually empty

### 3.8 Payment Follow-Up

Page:

- `/finance/follow-ups`

What to test:

1. Open follow-up page.
2. Check open follow-up count or list.
3. Verify follow-ups look tied to receivable recovery, not random reminders.
4. If create/edit is supported, add one follow-up and confirm it appears.

Expected result:

- follow-up entries align with collection activity
- page supports collections use case clearly

## 4. Pre-Sales Workflow Testing

### 4.1 Tender Approval Flow

Pages:

- `/pre-sales/approvals`
- `/pre-sales/[id]`

What to test:

1. Open approvals inbox.
2. Check pending approval rows for:
   - action owner
   - action hint
   - aging / age days
3. Open a tender workspace from the approval flow.
4. Confirm same tender shows approval context clearly.

Expected result:

- state and ownership are obvious
- user can tell who should act next

### 4.2 Tender Reminders

Page:

- `/pre-sales/[id]`

What to test:

1. Open a tender with reminders.
2. Inspect reminder cards/list.
3. Confirm reminder context feels meaningful:
   - bid deadline
   - commercial follow-up
   - due-in-days
   - priority
   - action hint

Expected result:

- reminder section helps decision-making
- not just raw reminder rows

### 4.3 Tender to Project Conversion Payload

Page:

- `/pre-sales/[id]`

What to test:

1. Open a tender eligible for conversion.
2. Trigger or inspect conversion action.
3. Verify conversion summary/payload shows clear snapshot fields such as:
   - client
   - organization
   - estimated value
   - costing snapshot
   - approval snapshot
4. Confirm the response is stable and understandable.

Expected result:

- conversion is explicit
- user can see what data is going into project creation

## 5. Pre-Sales Analytics Testing

### 5.1 Company Profile Analytics

Page:

- `/pre-sales/analytics/company-profile`

What to test:

1. Open page and verify top metrics render.
2. Use organization filter.
3. Use status filter.
4. Click `Export CSV`.
5. Verify exported file reflects filtered rows.
6. Check action cards:
   - urgent submission focus
   - costing still missing
   - approval queue affecting tenders

Expected result:

- analytics are decision-useful
- filters affect visible data
- CSV contains filtered data, not unrelated data

### 5.2 Compare Bidders

Page:

- `/pre-sales/analytics/compare-bidders`

What to test:

1. Open page.
2. Switch source filter:
   - All bidders
   - Our team only
   - Competitors only
3. Click `Export CSV`.
4. Verify exported rows match selected source filter.
5. Review signal cards:
   - who is beating us
   - pricing pressure
   - live result coverage gaps

Expected result:

- scoreboard changes with filter
- export respects current filtered set
- signals are readable and useful

### 5.3 Competitor Analysis

Page:

- `/pre-sales/analytics/competitors`

What to test:

1. Open page.
2. Use `Search competitors`.
3. Verify list filters in real time.
4. Click `Export CSV`.
5. Verify CSV matches filtered competitors.
6. Test add/edit/delete competitor if your environment allows it.

Expected result:

- search works
- export works
- CRUD still works after UI changes

### 5.4 Tender Result Flow

Page:

- `/pre-sales/tender-result`

What to test:

1. Open tender result page.
2. Check linked vs unlinked result rows.
3. Verify published results appear meaningful and not synthetic-only.
4. Confirm winner/company/result-stage data renders correctly.

Expected result:

- live-backed result data is visible
- result rows make sense relative to competitor tracking

## 6. MIS Testing

### 6.1 Finance MIS

Page:

- `/pre-sales/mis/finance`

What to test:

1. Open page.
2. Use filters:
   - tender id
   - requirement type
   - status
3. Click `Export CSV`.
4. Verify downloaded CSV reflects the filtered table.
5. Clear filters and confirm table resets.

Expected result:

- filters work
- export works
- no table/render breakage

### 6.2 Sales MIS

Page:

- `/pre-sales/mis/sales`

What to test:

1. Open page.
2. Set from-date and to-date.
3. Verify table refreshes.
4. Click `Export CSV`.
5. Clear filters and confirm reset.

Expected result:

- date filtering works
- export works
- totals still render cleanly

## 7. Regression Checks

Since we changed existing partial flows, do these quick regressions:

1. Finance sidebar still opens correct pages.
2. Existing billing and costing pages still load.
3. Existing tender workspace still opens without crash.
4. Approvals inbox still works.
5. Existing competitor CRUD still works.
6. Existing MIS pages still work with no filter selected.

Expected result:

- no previously working screen is broken by new changes

## 8. What to Capture During Testing

For each failed test, note:

- page URL
- test step number
- input used
- expected result
- actual result
- screenshot if visual issue
- browser console error if present
- network/API failure if visible

## 9. Quick Sign-Off Checklist

You can consider this batch manually validated if all below pass:

- [ ] commercial hub loads and shows bookkeeping-oriented visibility
- [ ] transaction comments can be added and reloaded
- [ ] customer-context document exchange can be added and viewed
- [ ] costing ownership is visible
- [ ] billing commercial visibility is clear
- [ ] customer statement works
- [ ] receivable aging works
- [ ] follow-up view works
- [ ] approval inbox shows owner/action clarity
- [ ] tender reminders are meaningful
- [ ] tender conversion summary is explicit
- [ ] company profile filters and CSV export work
- [ ] compare-bidders filters and CSV export work
- [ ] competitors search and CSV export work
- [ ] finance MIS export/filter works
- [ ] sales MIS export/filter works
- [ ] tender-result flow still looks correct
- [ ] no critical regression found on touched modules

## 10. Optional Technical Recheck

If you want to rerun the technical smoke checks I already used:

From `erp_frontend`:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build
```

Expected result:

- `tsc` should pass
- `next build` should pass
- you may still see dynamic-server warnings from some API routes, but build should complete successfully
