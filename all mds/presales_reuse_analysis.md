# Pre-Sales Funnel Dashboard — Existing System Reuse Analysis

> **Date:** 20 March 2026  
> **Purpose:** Exact audit of what already exists, what can be reused as-is, what needs small changes, and what must be built fresh.

---

## Legend
- ✅ **REUSE AS-IS** — Zero change needed, works exactly as required
- 🔧 **REUSE WITH MINOR CHANGE** — Needs 1–3 small edits (field addition, filter tweak, etc.)
- 🟡 **EXTEND** — Core exists, but significant new logic/fields needed
- 🔴 **BUILD FRESH** — Does not exist at all, must be created from scratch

---

## 1. BACKEND — Frappe DocTypes (Data Models)

### What Already Exists in `gov_erp/gov_erp/doctype/`

| DocType | Status | Reason |
|---------|--------|--------|
| `GE Tender` | 🟡 **EXTEND** | Exists with 20+ fields. Missing: `bid_denied_by_presales`, `bid_denied_reason`, `tenure_years`, `tenure_end_date`, `closure_letter_received`, `presales_closure_date`, `presales_closure_by`, `pre_bid_query_submission_date`, `pre_bid_meeting_date`, `bid_opening_date`, `pbg_percent`, `latest_corrigendum_date`, `latest_corrigendum_desc`, `enquiry_pending`, `pu_nzd_qualified`, `consultant_name`, `consultant_contact` |
| `GE Tender Approval` | ✅ **REUSE AS-IS** | Full approval trail: `linked_tender`, `approval_type`, `status`, `requested_by`, `approver_role`, `approver_user`, `request_remarks`, `action_remarks`, `acted_on`. Already used in workspace. |
| `GE Tender Checklist` / `GE Tender Checklist Item` | ✅ **REUSE AS-IS** | Compliance checklist per tender. Already linked and shown in workspace. |
| `GE Tender Reminder` | ✅ **REUSE AS-IS** | Already linked and shown in workspace. |
| `GE Tender Result` | 🔧 **REUSE WITH MINOR CHANGE** | Exists: `result_stage`, `winner_company`, `winning_amount`, `publication_date`. **Need to add:** `bid` Link field when GE Bid is created. Currently uses manual status stages. |
| `GE EMD PBG Instrument` | 🟡 **EXTEND** | Exists for EMD/PBG tracking. Missing: `bid` link field, `refund_status`, `refund_date`, `refund_amount`, `refund_remarks` (for lost bid EMD tracking). |
| `GE BOQ` + `GE BOQ Item` | ✅ **REUSE AS-IS** | Used in workspace summary. No new fields needed for funnel. |
| `GE Cost Sheet` + `GE Cost Sheet Item` | ✅ **REUSE AS-IS** | Used in workspace. No new fields needed. |
| `GE Survey` | ✅ **REUSE AS-IS** | Used in workspace. No changes needed for funnel. |
| **`GE Bid`** | 🔴 **BUILD FRESH** | Does NOT exist. Core new entity for the Bid lifecycle (DRAFT/SUBMITTED/UNDER_EVALUATION/WON/LOST/CANCEL/RETENDER). |
| **`GE LOI Tracker`** | 🔴 **BUILD FRESH** | Does NOT exist. Created upon WON bid to track per-department LOI. |

---

## 2. BACKEND — API Methods in `api.py` (9,984 lines)

### Tender API Methods — Already Exist

| Method | Status | Notes |
|--------|--------|-------|
| `get_tenders(filters, limit, offset)` | ✅ **REUSE AS-IS** | Returns list with `computed_funnel_status` already attached. Supports filter param. |
| `get_tender(name)` | ✅ **REUSE AS-IS** | Returns single tender with all fields + computed funnel status. |
| `create_tender(data)` | ✅ **REUSE AS-IS** | Creates tender, returns with funnel status computed. |
| `update_tender(name, data)` | ✅ **REUSE AS-IS** | Updates tender fields. Reusable for new fields too once added to DocType. |
| `delete_tender(name)` | ✅ **REUSE AS-IS** | Standard delete. |
| `transition_tender_status(name, target_status)` | ✅ **REUSE AS-IS** | Controlled status transition with readiness checks (`_get_tender_transition_readiness`). Already validates BOQ, Cost Sheet, approvals before allowing SUBMITTED. |
| `submit_tender_approval(name, approval_type, remarks)` | ✅ **REUSE AS-IS** | Creates GE Tender Approval row. Supports GO_NO_GO, TECHNICAL, COMMERCIAL, FINANCE, SUBMISSION. |
| `approve_tender_approval(name, remarks)` | ✅ **REUSE AS-IS** | Approves a specific approval row, updates tender readiness fields. |
| `reject_tender_approval(name, remarks)` | ✅ **REUSE AS-IS** | Rejects approval, updates tender fields. |
| `get_tender_approvals(tender, status)` | ✅ **REUSE AS-IS** | Returns approval trail for a tender. |
| `get_tender_workspace(name)` | ✅ **REUSE AS-IS** | Aggregate API — returns tender + BOQs + cost sheets + surveys + reminders + finance + approvals + results in one call. |
| `convert_tender_to_project(tender_name)` | ✅ **REUSE AS-IS** | Existing conversion flow. Will need guard update to check LOI complete. |
| `_derive_tender_funnel_status(values)` | 🔧 **REUSE WITH MINOR CHANGE** | Backend funnel derivation logic. Exists but derivation logic needs updating to match new 6-color flow (bid-aware, retender reset, etc.) |
| `_attach_computed_tender_funnel_status(tender_dict)` | 🔧 **REUSE WITH MINOR CHANGE** | Called on every tender fetch. Will auto-update once `_derive_tender_funnel_status` is updated. |

### Tender Approval Config — Already Exists

```python
TENDER_APPROVAL_TYPE_CONFIG = {
  "GO_NO_GO": {...},   # ✅ Exists
  "TECHNICAL": {...},  # ✅ Exists
  "COMMERCIAL": {...}, # ✅ Exists
  "FINANCE": {...},    # ✅ Exists
  "SUBMISSION": {...}, # ✅ Exists
}
```
GO/NO-GO approval flow with automatic `go_no_go_status` field update is **fully implemented already.**

### Tender Status Readiness Engine — Already Exists

```python
_get_tender_transition_readiness(doc, target_status)
```
Already validates:
- `go_no_go_status == "GO"` before SUBMITTED
- `technical_readiness == "APPROVED"` before SUBMITTED  
- `commercial_readiness == "APPROVED"` before SUBMITTED
- BOQ count > 0, Cost Sheet count > 0
- Finance readiness if EMD/PBG required

This is **exactly what we need.** ✅

### What Is Missing From Backend API

| Method | Status | What It Does |
|--------|--------|-------------|
| `get_funnel_dashboard_stats()` | 🔴 **BUILD** | Returns count + pipeline value per each of 6 funnel colors |
| `get_funnel_tenders(funnel_color, search, page)` | 🔴 **BUILD** | Returns tenders filtered by funnel color with all Excel-column fields |
| `create_bid(tender, bid_amount, bid_date)` | 🔴 **BUILD** | Creates `GE Bid` record |
| `get_bid(name)` / `get_bids(tender, status)` | 🔴 **BUILD** | CRUD for GE Bid |
| `submit_bid(name)` | 🔴 **BUILD** | DRAFT → SUBMITTED |
| `mark_bid_under_evaluation(name)` | 🔴 **BUILD** | SUBMITTED → UNDER_EVALUATION |
| `mark_bid_won(name, result_date, remarks)` | 🔴 **BUILD** | Sets WON, auto-creates LOI Tracker rows |
| `mark_bid_lost(name, result_date, remarks)` | 🔴 **BUILD** | Sets LOST, sets up EMD refund tracking |
| `mark_bid_cancelled(name, reason)` | 🔴 **BUILD** | CANCEL |
| `mark_bid_retender(name, reason)` | 🔴 **BUILD** | Resets tender go_no_go back to PENDING → Blue funnel |
| `update_emd_refund_status(instrument, ...)` | 🔴 **BUILD** | Updates refund fields on GE EMD PBG Instrument |
| `create_loi_tracker(bid, department, date)` | 🔴 **BUILD** | CRUD for GE LOI Tracker |
| `mark_loi_received(name, date, document)` | 🔴 **BUILD** | Marks LOI done for one dept |
| `get_loi_status(bid)` | 🔴 **BUILD** | Returns LOI summary: n expected vs n received |
| `record_om_completion_letter(tender, file)` | 🔴 **BUILD** | Records O&M letter for closure |
| `mark_tender_closure(tender, date, remarks)` | 🔴 **BUILD** | Final presales closure after tenure |

---

## 3. FRONTEND — API Proxy Routes in `erp_frontend/src/app/api/`

### Already Exist (Confirmed)

| Route | Status | Notes |
|-------|--------|-------|
| `GET/POST/PATCH/DELETE /api/tenders` | ✅ **REUSE AS-IS** | Full CRUD. GET supports `?status=` filter. |
| `GET/POST /api/tenders/[id]/status` | ✅ **REUSE AS-IS** | Controlled status transition (submit, won, lost, evaluation, dropped). |
| `GET /api/tender-workspace/[id]` | ✅ **REUSE AS-IS** | Aggregate data fetcher for workspace. |
| `GET/POST /api/tender-approvals` | ✅ **REUSE AS-IS** | Submit/approve/reject approval requests. |
| `POST /api/tender-convert` | ✅ **REUSE AS-IS** | Convert WON tender → Project. |
| `GET /api/tender-results` | ✅ **REUSE AS-IS** | Tender result list. |
| `GET /api/tender-checklists` | ✅ **REUSE AS-IS** | Compliance checklist data. |
| `GET /api/tender-reminders` | ✅ **REUSE AS-IS** | Reminder data. |
| `GET /api/emd-pbg` | ✅ **REUSE AS-IS** | EMD/PBG instruments list. |
| `GET /api/surveys` | ✅ **REUSE AS-IS** | Survey data. |
| `GET /api/boqs` | ✅ **REUSE AS-IS** | BOQ data, already supports `?tender=` filter. |
| `GET /api/cost-sheets` | ✅ **REUSE AS-IS** | Cost sheet data, already supports `?tender=` filter. |
| `GET /api/finance-requests` | ✅ **REUSE AS-IS** | Finance request data. |
| `GET /api/competitors` | ✅ **REUSE AS-IS** | Competitor data. |

### Missing Routes (Must Be Built)

| Route | Status | Purpose |
|-------|--------|---------|
| `GET /api/presales/funnel-stats` | 🔴 **BUILD** | 6-color funnel stats for dashboard tiles |
| `GET /api/presales/funnel-tenders` | 🔴 **BUILD** | Tenders with all Excel columns, filterable by color |
| `POST /api/bids` | 🔴 **BUILD** | Create bid |
| `GET /api/bids` | 🔴 **BUILD** | List bids |
| `GET /api/bids/[id]` | 🔴 **BUILD** | Single bid detail |
| `POST /api/bids/[id]/submit` | 🔴 **BUILD** | DRAFT → SUBMITTED |
| `POST /api/bids/[id]/under-evaluation` | 🔴 **BUILD** | SUBMITTED → EVALUATION |
| `POST /api/bids/[id]/won` | 🔴 **BUILD** | Mark bid WON |
| `POST /api/bids/[id]/lost` | 🔴 **BUILD** | Mark bid LOST |
| `POST /api/bids/[id]/cancel` | 🔴 **BUILD** | CANCEL bid |
| `POST /api/bids/[id]/retender` | 🔴 **BUILD** | Reset to retender |
| `GET/POST /api/loi-tracker` | 🔴 **BUILD** | LOI tracker list + create |
| `POST /api/loi-tracker/[id]/received` | 🔴 **BUILD** | Mark LOI received |
| `PATCH /api/emd-refund/[id]` | 🔴 **BUILD** | Update EMD refund status |
| `POST /api/tenders/[id]/closure` | 🔴 **BUILD** | Tender closure after tenure |

---

## 4. FRONTEND — Pages

### Already Exist

| Page | Path | Status | Reuse Notes |
|------|------|--------|------------|
| Tender List | `/pre-sales/page.tsx` | 🔧 **MINOR CHANGE** | 325 lines. Has stats, table, create modal, funnel badge. **Change needed:** Make this the pre-sales home OR redirect to new `/pre-sales/dashboard`. The table itself works fine. |
| Tender Workspace | `/pre-sales/[id]/page.tsx` | 🟡 **EXTEND** | 842 lines. Strong workspace page — header, bid flow check, survey/BOQ/costing, approvals, result, finance, reminders, quick links. **Extend:** Add "Bid" section, "Tenure & Closure" section. |
| Tender Result | `/pre-sales/tender-result/page.tsx` | ✅ **REUSE AS-IS** | 285 lines. Full result page with status sync buttons. Works as designed. |
| Approvals | `/pre-sales/approvals/page.tsx` | ✅ **REUSE AS-IS** | Approval inbox for presales head. Already connected to approval API. |
| In-Process Tender | `/pre-sales/tender-task/in-process/page.tsx` | 🔧 **MINOR CHANGE** | 17 lines. Change `statusFilter` to point to new dashboard OR expand colors. |
| My Tender | `/pre-sales/tender-task/my-tender/page.tsx` | ✅ **REUSE AS-IS** | Owner-based filter view. Works. |
| Submitted Tender | `/pre-sales/tender-task/submitted/page.tsx` | ✅ **REUSE AS-IS** | Status-filtered view. Works. |
| Assigned To Team | `/pre-sales/tender-task/assigned-to-team/page.tsx` | ✅ **REUSE AS-IS** | Works. |
| Dropped Tender | `/pre-sales/tender-task/dropped/page.tsx` | ✅ **REUSE AS-IS** | Works. |

### Missing Pages (Must Be Built)

| Page | Path | Status | Purpose |
|------|------|--------|---------|
| **Funnel Dashboard** | `/pre-sales/dashboard/page.tsx` | 🔴 **BUILD** | Main color-coded Excel-style dashboard. The centerpiece. |
| **Bids List** | `/pre-sales/bids/page.tsx` | 🔴 **BUILD** | All bids across tenders. |
| **Won Bids + LOI** | `/pre-sales/won-bids/page.tsx` | 🔴 **BUILD** | LOI tracking per department, tenure dates. |

---

## 5. FRONTEND — Components

### Already Exist

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| `tenderFunnel.ts` | `src/components/tenderFunnel.ts` | 🔧 **MINOR CHANGE** | 119 lines. Color derivation + metadata. **Update derivation** to be bid-aware (retender → Blue, etc.) |
| `TenderTaskBoard.tsx` | `src/components/tender-task/TenderTaskBoard.tsx` | 🔧 **MINOR CHANGE** | 401 lines. Reusable for any filtered tender view. **Add `funnel_color` filter support.** |
| `CreateTenderModal` | (used in pre-sales/page.tsx) | ✅ **REUSE AS-IS** | Create tender form already works. |
| `RouteHubPage` | `src/components/navigation/RouteHubPage.tsx` | ✅ **REUSE AS-IS** | Navigation hub. No changes. |
| `SectionCard` | Inside `[id]/page.tsx` | ✅ **REUSE AS-IS** | Section wrapper in workspace. Can be extracted if needed. |

### Missing Components (Must Be Built)

| Component | Path | Status | Purpose |
|-----------|------|--------|---------|
| `FunnelColorCard` | `src/components/presales/FunnelColorCard.tsx` | 🔴 **BUILD** | Single colored stat tile (count + value + label) |
| `FunnelTenderTable` | `src/components/presales/FunnelTenderTable.tsx` | 🔴 **BUILD** | Excel-style color-tinted table with all funnel columns |
| `BidCreateModal` | `src/components/presales/BidCreateModal.tsx` | 🔴 **BUILD** | Create bid on a GREEN tender |
| `BidStatusPanel` | `src/components/presales/BidStatusPanel.tsx` | 🔴 **BUILD** | Bid lifecycle actions inside workspace |
| `LoiTrackerPanel` | `src/components/presales/LoiTrackerPanel.tsx` | 🔴 **BUILD** | Per-dept LOI status inside workspace |
| `EmdRefundPanel` | `src/components/presales/EmdRefundPanel.tsx` | 🔴 **BUILD** | EMD refund tracking for lost bids |
| `TenureClosureModal` | `src/components/presales/TenureClosureModal.tsx` | 🔴 **BUILD** | Tenure closure after O&M letter |

---

## 6. FRONTEND — Sidebar Navigation

| Item | Status | Change |
|------|--------|--------|
| Existing Pre-Sales nav structure | 🔧 **MINOR CHANGE** | Add 3 new links: `Dashboard`, `Bids`, `Won Bids & LOI` |
| All other nav items | ✅ **REUSE AS-IS** | No changes to existing items |

---

## 7. COMPLETE REUSE SUMMARY TABLE

| Category | Total Items | ✅ REUSE AS-IS | 🔧 MINOR CHANGE | 🟡 EXTEND | 🔴 BUILD FRESH |
|----------|-------------|----------------|-----------------|-----------|----------------|
| DocTypes (Backend) | 11 | 7 | 1 | 1 | 2 |
| API Methods (Backend) | 30 | 13 | 2 | 0 | 16 |
| API Routes (Frontend) | 29 | 14 | 0 | 0 | 15 |
| Pages (Frontend) | 12 | 8 | 2 | 1 | 3 |
| Components (Frontend) | 12 | 5 | 3 | 0 | 7 |
| **TOTAL** | **94** | **47 (50%)** | **8 (9%)** | **2 (2%)** | **43 (46%)** |

---

## 8. What Exactly Needs To Be Built (The 46%)

### 8.1 Backend New DocTypes (2 items)

#### `GE Bid` — ~10 fields
```
bid_number, tender (Link→GE Tender), bid_date, bid_amount,
status (DRAFT/SUBMITTED/UNDER_EVALUATION/WON/LOST/CANCEL/RETENDER),
result_date, result_remarks, is_latest, created_by, created_at
```

#### `GE LOI Tracker` — ~8 fields
```
bid (Link→GE Bid), tender (Link→GE Tender), department (Link),
loi_expected_by (Date), loi_received (Check),
loi_received_date (Date), loi_document (Attach), remarks (Text)
```

### 8.2 Backend New Fields on Existing DocTypes

#### `GE Tender` — ~17 new fields to add
```
bid_denied_by_presales (Check),  bid_denied_reason (Text),
tenure_years (Int),  tenure_end_date (Date),
closure_letter_received (Check),  presales_closure_date (Date),
presales_closure_by (Link→User),
pre_bid_query_submission_date (Datetime),
pre_bid_meeting_date (Datetime),  bid_opening_date (Datetime),
pbg_percent (Float),
latest_corrigendum_date (Date),  latest_corrigendum_desc (Text),
enquiry_pending (Check),  pu_nzd_qualified (Check),
consultant_name (Data),  consultant_contact (Data)
```

#### `GE EMD PBG Instrument` — ~5 new fields
```
bid (Link→GE Bid),
refund_status (Select: PENDING/IN_PROCESS/RECEIVED/FORFEITED),
refund_date (Date),  refund_amount (Currency),  refund_remarks (Text)
```

### 8.3 Backend New API Methods (~16 methods, ~400 lines in api.py)

1. `get_funnel_dashboard_stats()` — counts + pipeline value per color
2. `get_funnel_tenders(funnel_color, search, page)` — dashboard table data
3. `create_bid(tender, bid_amount, bid_date)`
4. `get_bid(name)` / `get_bids(tender, status)`
5. `update_bid(name, data)` / `delete_bid(name)`
6. `submit_bid(name)` — DRAFT → SUBMITTED
7. `mark_bid_under_evaluation(name)`
8. `mark_bid_won(name, result_date, remarks)` — auto creates LOI rows
9. `mark_bid_lost(name, result_date, remarks)` — EMD refund setup
10. `mark_bid_cancelled(name, reason)`
11. `mark_bid_retender(name, reason)` — resets tender to PENDING (Blue)
12. `update_emd_refund_status(instrument, status, date, amount)`
13. `create_loi_tracker(bid, department, date)` / `get_loi_status(bid)`
14. `mark_loi_received(name, date, document)`
15. `record_om_completion_letter(tender, file, date)`
16. `mark_tender_closure(tender, date, remarks)`

### 8.4 Frontend New Proxy Routes (~15 route files)

All under `/api/bids/`, `/api/loi-tracker/`, `/api/emd-refund/`, `/api/presales/`, `/api/tenders/[id]/closure`

### 8.5 Frontend New Pages (3 pages)

1. `/pre-sales/dashboard/page.tsx` — Funnel Dashboard (most important)
2. `/pre-sales/bids/page.tsx` — Bids list
3. `/pre-sales/won-bids/page.tsx` — Won bids + LOI tracker

### 8.6 Frontend New Components (7 components)

1. `FunnelColorCard.tsx`
2. `FunnelTenderTable.tsx`
3. `BidCreateModal.tsx`
4. `BidStatusPanel.tsx`
5. `LoiTrackerPanel.tsx`
6. `EmdRefundPanel.tsx`
7. `TenureClosureModal.tsx`

---

## 9. Minor Changes To Existing (The 9%)

| File | Change Needed | Effort |
|------|--------------|--------|
| `tenderFunnel.ts` | Update `deriveTenderFunnelStatus()` to be bid-aware (retender → Blue, lost → Pink) | ~20 lines |
| `api.py` → `_derive_tender_funnel_status()` | Same update for backend derivation (lines 101–130) | ~20 lines |
| `/pre-sales/page.tsx` | Make it redirect to `/pre-sales/dashboard` OR keep as "all tenders" list | 1 line |
| `/pre-sales/[id]/page.tsx` | Add "Bid" section (BidStatusPanel) + "Tenure & Closure" section | ~80–100 lines added |
| `TenderTaskBoard.tsx` | Add `funnelColorFilter` prop support | ~15 lines |
| `Sidebar.tsx` | Add 3 new links | ~12 lines |
| `in-process/page.tsx` | Update `statusFilter` or redirect | ~5 lines |
| `emd-pbg/route.ts` | Support `?bid_id=` filter for refund tracking | ~5 lines |

---

## 10. Execution Order — Safest Build Sequence

```
Step 1 (Safest): Add new fields to GE Tender → bench migrate
Step 2: Create GE Bid DocType → bench migrate
Step 3: Create GE LOI Tracker DocType → bench migrate
Step 4: Add refund fields to GE EMD PBG Instrument → bench migrate
Step 5: Add 16 new BACKEND API methods to api.py
Step 6: Update _derive_tender_funnel_status() in api.py AND tenderFunnel.ts
Step 7: Create 15 new frontend proxy routes
Step 8: Build FunnelColorCard + FunnelTenderTable components
Step 9: Build /pre-sales/dashboard page (main deliverable)
Step 10: Build BidStatusPanel + BidCreateModal components
Step 11: Extend /pre-sales/[id] workspace with Bid section
Step 12: Build LoiTrackerPanel + EmdRefundPanel + TenureClosureModal
Step 13: Extend /pre-sales/[id] workspace with Tenure & Closure section
Step 14: Build /pre-sales/bids and /pre-sales/won-bids pages
Step 15: Update Sidebar.tsx + in-process page redirect
Step 16: QA all flows
```

---

## 11. Key Insight — What Makes This Feasible

The original build **already got half the job done correctly.** The most complex parts are already working:

- ✅ GO/NO-GO approval flow (submit → approve → GO) — **fully working**
- ✅ Technical/Commercial/Finance/Submission approvals — **fully working**
- ✅ Tender readiness engine (blocks SUBMITTED if BOQ/approvals missing) — **fully working**
- ✅ Funnel color derivation on every API call — **fully working**
- ✅ Tender workspace aggregate fetch — **fully working**
- ✅ Convert tender → project — **fully working**
- ✅ Tender result sync buttons — **fully working**

**What's truly missing** is: the Bid entity (GE Bid), the LOI Tracker, the dashboard page, and some new fields on GE Tender. Everything else is an extension or a small tweak on a solid foundation.
