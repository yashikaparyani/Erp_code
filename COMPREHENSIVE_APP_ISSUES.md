# Comprehensive App Issues — Gov ERP

**Scan Date:** 2026-03-16  
**Methodology:** Full frontend route scan (47 pages), backend DocType audit (70 DocTypes), API endpoint testing (73 routes), sidebar link cross-reference, CRUD completeness check.

---

## Summary

| Priority | Category | Count |
|----------|----------|-------|
| **P1** | Missing / broken DocType fields (backend crashes) | 0 open, 1 fixed ✅ |
| **P2** | Backend jobs — API endpoints that error out | 0 open, 2 fixed ✅ (Full re-audit: 0 HTTP 500s across 155 GET endpoints) |
| **P3** | UI — Missing pages (backend exists, no frontend page) | 25 |
| **P3** | UI — Dead sidebar links (404 pages) | 6 |
| **P3** | UI — Pages missing CRUD (read-only, no create/edit/delete) | 14 |
| **P3** | UI — Stub/partial implementations | 3 |
| **P4** | Smoke & sanity QA (tests needed for all of the above) | 44 |

---

## PRIORITY 1 — Missing / Broken DocType Fields

These are backend crashes caused by schema mismatches — the code references columns that don't exist in the database.

| # | Issue | DocType | Error | Fix |
|---|-------|---------|-------|-----|
| 1.1 | **GRN `purchase_order` column missing** | `Purchase Receipt` (ERPNext) | `pymysql.err.OperationalError: (1054, "Unknown column 'purchase_order' in 'SELECT'")` | Fixed. `get_grns()` now resolves `purchase_order` through child table `Purchase Receipt Item.parent` and no longer selects `purchase_order` from parent `Purchase Receipt`. Verified with `GET /api/grns` and `GET /api/grns/stats` returning success. |

**Status:** Closed.

---

## PRIORITY 2 — Backend API Endpoints That Error Out

These are API endpoints that return 500 errors when called.

| # | Endpoint | HTTP Code | Error | Root Cause |
|---|----------|-----------|-------|------------|
| 2.1 | `GET /api/grns` | 500 | `Unknown column 'purchase_order' in 'SELECT'` | Fixed with P1 #1.1. Endpoint now returns `200 OK` with `success: true`. |
| 2.2 | 49 single-record GET endpoints such as `get_tender`, `get_grn`, `get_site`, `get_invoice`, `get_ticket`, `get_project_document`, `get_site_uptime_summary` | 500 | `TypeError: ... missing 1 required positional argument: 'name'/'site'` | Fixed. All detail getters now accept optional params and explicitly validate `name` / `site` with a controlled API error instead of crashing at Python call time. |

**Status:** Closed.

### P2 Smoke Audit — 2026-03-16 Full Re-run (155 GET endpoints)

**Methodology:** All 155 `get_*` / `health_check` whitelisted functions called directly against `http://127.0.0.1:8000/api/method/gov_erp.api.<fn>` with authenticated session cookie.

| Result | Count | Notes |
|--------|-------|-------|
| **PASS (200 + success:true)** | **106/155** | List endpoints, stat endpoints, dashboard endpoints |
| **Controlled client validation errors** | **49/155** | Single-record detail getters now return explicit validation failures when `name` / `site` is omitted. They no longer raise Python `TypeError` or emit HTTP 500. |
| **HTTP 500 errors** | **0** | None |

> **Conclusion:** Zero backend 500s remain. The 49 detail endpoints are now hardened and fail gracefully when required params are missing. P2 is fully clean.
>
> **Previously noted:** The `/api/ops` route returns 405 on GET — it is POST-only by design, not a bug.

---

## PRIORITY 3 — UI Gaps

### 3A. Missing Frontend Pages (Backend API exists, no UI page)

These backend modules are fully implemented in `api.py` (CRUD + workflow endpoints) and accessible via the `/api/ops` proxy, but have **zero** frontend pages. Users cannot interact with them.

| # | Module | Backend Functions Available | Missing Page(s) | Impact |
|---|--------|---------------------------|-----------------|--------|
| 3A.1 | **Purchase Orders** | `get_purchase_orders`, `get_purchase_order`, `get_po_stats`, `create_po_from_comparison` | `/purchase-orders` — list, detail, create from vendor comparison | Cannot view or create POs. Procurement workflow broken. |
| 3A.2 | **GRNs (Goods Receipt)** | `get_grns`, `get_grn`, `create_grn`, `get_grn_stats` | `/grns` — list, create receipt, stats | Cannot receive goods against POs. |
| 3A.3 | **Indents (Material Requests)** | `get_indents`, `get_indent`, `create_indent`, `get_indent_stats` | `/indents` — list, create indent, stats | Cannot raise material indents from projects. |
| 3A.4 | **Stock Position** | `get_stock_position` | `/stock-position` — warehouse stock view | No stock visibility for stores. |
| 3A.5 | **Stock Aging** | `get_stock_aging` | `/stock-aging` — aging analysis | No aging/dead-stock visibility. |
| 3A.6 | **Milestones** | `get_milestones`, `get_milestone`, `create_milestone`, `update_milestone`, `delete_milestone` | `/milestones` — project milestone tracking | No milestone tracking UI. |
| 3A.7 | **Manpower Logs** | `get_manpower_logs`, `get_manpower_log`, `create_manpower_log`, `update_manpower_log`, `delete_manpower_log`, `get_manpower_summary` | `/manpower` — daily manpower log | No labour tracking. |
| 3A.8 | **Petty Cash** | `get_petty_cash_entries`, `get_petty_cash_entry`, `create_petty_cash_entry`, `update_petty_cash_entry`, `approve_petty_cash_entry`, `reject_petty_cash_entry`, `delete_petty_cash_entry` | `/petty-cash` — entry, approval workflow | No petty cash management. |
| 3A.9 | **Payment Receipts** | `get_payment_receipts`, `get_payment_receipt`, `create_payment_receipt`, `update_payment_receipt`, `delete_payment_receipt`, `get_payment_receipt_stats` | `/payment-receipts` or under `/finance/payments` | Cannot track client payments against invoices. |
| 3A.10 | **Retention Ledger** | `get_retention_ledgers`, `get_retention_ledger`, `create_retention_ledger`, `update_retention_ledger`, `delete_retention_ledger`, `release_retention`, `get_retention_stats` | `/retention` or under `/finance/retention` | No retention tracking / release workflow. |
| 3A.11 | **Penalty Deductions** | `get_penalty_deductions`, `get_penalty_deduction`, `create_penalty_deduction`, `update_penalty_deduction`, `delete_penalty_deduction`, `approve_penalty_deduction`, `apply_penalty_deduction`, `reverse_penalty_deduction`, `get_penalty_stats` | `/penalties` or under `/finance/penalties` | Cannot manage LD penalties. |
| 3A.12 | **SLA Profiles** | `get_sla_profiles`, `get_sla_profile`, CRUD + timers + penalty rules + penalty records + approve/reject/waive | `/sla` — profiles, timers, penalty management | Entire SLA module invisible in UI. |
| 3A.13 | **Drawings** | `get_drawings`, `get_drawing`, `create_drawing`, `update_drawing`, `delete_drawing`, `submit_drawing`, `approve_drawing`, `supersede_drawing` | `/drawings` or under `/engineering/drawings` | Engineering drawings not visible. |
| 3A.14 | **Change Requests** | `get_change_requests`, `get_change_request`, CRUD + submit/approve/reject | `/change-requests` or under `/engineering/change-requests` | Cannot manage scope change requests. |
| 3A.15 | **Communication Logs** | `get_comm_logs`, `get_comm_log`, `create_comm_log`, `update_comm_log`, `delete_comm_log` | `/comm-logs` or under `/execution/comm-logs` | Cannot track project communications. |
| 3A.16 | **Device Uptime Logs** | `get_device_uptime_logs`, CRUD + `get_site_uptime_summary` | Page exists at `/execution/commissioning/devices` but doesn't show uptime tab/section | Uptime data invisible. |
| 3A.17 | **Budget Allocations** | DocType `GE Budget Allocation` exists; no API functions found | Need both API + page | No budget tracking at all. |
| 3A.18 | **PDC Instruments** | DocType `GE PDC Instrument` exists; no API functions found | Need both API + page | No PDC (post-dated cheque) tracking. |
| 3A.19 | **Tender Organizations** | `get_tender_organizations`, `create_tender_organization`, `delete_tender_organization` | Already shown in `/pre-sales/[id]` detail but no standalone page | Low priority — may not need own page. |
| 3A.20 | **Competitors** | `get_competitors`, `get_competitor`, CRUD + `get_competitor_stats` | `/pre-sales/analytics/competitors` (dead link in sidebar) | Sidebar links to it but page doesn't exist. |
| 3A.21 | **Onboarding Workflow** | `submit_onboarding`, `review_onboarding`, `approve_onboarding`, `reject_onboarding`, `map_onboarding_to_employee` | `/hr` page is read-only; no workflow actions | HR onboarding is display-only. |
| 3A.22 | **Attendance Management** | `get_attendance_logs`, CRUD + `get_attendance_stats` | `/hr` page shows summary; no CRUD | Cannot create/edit attendance. |
| 3A.23 | **Travel Log Management** | `get_travel_logs`, CRUD + submit/approve/reject + stats | `/hr` page shows summary; no CRUD | Cannot manage travel requests. |
| 3A.24 | **Overtime Management** | `get_overtime_entries`, CRUD + submit/approve/reject + stats | `/hr` page shows summary; no CRUD | Cannot manage overtime entries. |
| 3A.25 | **Technician Visit Logs** | `get_technician_visit_logs`, CRUD + stats | No page | Cannot track field visits. |

### 3B. Dead Sidebar Links (User Clicks → 404)

These links appear in the sidebar navigation but lead to non-existent pages.

| # | Sidebar Path | Label | Parent Menu |
|---|-------------|-------|-------------|
| 3B.1 | `/pre-sales/analytics/company-profile` | Company Profile | Pre-Sales → Analytics |
| 3B.2 | `/pre-sales/analytics/competitors` | Competitors | Pre-Sales → Analytics |
| 3B.3 | `/pre-sales/analytics/tender-results` | Tender Results | Pre-Sales → Analytics |
| 3B.4 | `/pre-sales/analytics/mis-reports` | MIS Reports | Pre-Sales → Analytics |
| 3B.5 | `/pre-sales/analytics/compare-bidders` | Compare Bidders | Pre-Sales → Analytics |
| 3B.6 | `/pre-sales/analytics/missed-opportunity` | Missed Opportunity | Pre-Sales → Analytics |

> The entire **Pre-Sales → Analytics** submenu (6 pages) is dead. All links 404.

### 3C. Pages That Exist But Are Missing CRUD Operations

These pages fetch and display data but don't let users create, edit, or delete records.

| # | Page | Current State | Missing Operations |
|---|------|--------------|-------------------|
| 3C.1 | `/hr` | Read-only dashboard showing onboarding, attendance, travel, overtime, statutory, visits | **Create, Update, Delete** for all 6 HR sub-modules. No action buttons, no forms. |
| 3C.2 | `/reports` | Read-only aggregate stats across all modules | Missing: export/download, drill-down links to actual records |
| 3C.3 | `/documents` | Read-only document/folder browser | Missing: **upload document**, create folder (backend supports both) |
| 3C.4 | `/pre-sales/tender` | Read-only tender listing with tabs | Missing: **create tender** button (it's on `/pre-sales` page instead — inconsistent UX) |
| 3C.5 | `/pre-sales/tender-result` | Read-only listing | Missing: **create/edit** tender result |
| 3C.6 | `/pre-sales/approvals` | Read-only approval list | Missing: **approve/reject** action buttons |
| 3C.7 | `/pre-sales/documents/folders` | Read-only folder tree | Missing: **create folder** (handler is `console.log` stub) |
| 3C.8 | `/pre-sales/tender-task/*` (5 pages) | Read-only filtered tender lists | Missing: status transition actions, edit inline |
| 3C.9 | `/finance` | Read-only invoice overview | Missing: links to billing/costing children, create invoice shortcut |
| 3C.10 | `/pre-sales/mis/*` (3 pages) | Read-only MIS reports | Missing: date-range filter interactions, export buttons |
| 3C.11 | `/execution` | Shows sites + DPRs; can create site | Missing: **DPR create/edit** form (only lists DPRs), milestone management |
| 3C.12 | `/rma` | Can create RMA | Missing: **approve/reject/close** workflow actions on RMA records |
| 3C.13 | `/om-helpdesk` | Can create/update ticket status | Missing: **assign, escalate, add comment** actions |
| 3C.14 | `/master-data` | Can create party | Missing: **edit/delete** party, **create/edit/delete organization** |

### 3D. Stub / Partial Implementations

| # | Page | Issue |
|---|------|-------|
| 3D.1 | `/pre-sales/documents/folders` | Create folder handler is `console.log("Create folder:", values)` — does nothing |
| 3D.2 | `/engineering/boq` | Alias — just re-renders `<EngineeringPage />`, no independent BOQ detail view |
| 3D.3 | `/engineering/survey` | Alias — just re-renders `<SurveyPage />`, no independent value |

---

## PRIORITY 4 — Smoke & Sanity QA Plan

Tests needed to verify each of the above issues once fixed. Organized by module.

### 4A. Backend API Tests

| # | Test | Validates |
|---|------|-----------|
| 4A.1 | `GET /api/grns` returns 200 with valid data | P1 #1.1, P2 #2.1 |
| 4A.2 | `POST /api/ops` with `create_grn` succeeds | GRN creation flow |
| 4A.3 | `POST /api/ops` with `create_indent` succeeds | Indent creation flow |
| 4A.4 | `GET /api/purchase-orders` returns PO data | PO listing |
| 4A.5 | `POST /api/purchase-orders/create-from-comparison` creates PO from approved vendor comparison | PO creation workflow |
| 4A.6 | All 8 dashboard endpoints return structured JSON with expected sections | Dashboard completeness |

### 4B. Frontend Page Tests (per missing page)

| # | Test | Page | Validates |
|---|------|------|-----------|
| 4B.1 | Navigate to `/purchase-orders` → renders list, create button works | 3A.1 |
| 4B.2 | Navigate to `/grns` → renders list, stats, create form | 3A.2 |
| 4B.3 | Navigate to `/indents` → renders list, stats, create indent form | 3A.3 |
| 4B.4 | Navigate to `/stock-position` → renders warehouse stock grid | 3A.4 |
| 4B.5 | Navigate to `/stock-aging` → renders aging buckets | 3A.5 |
| 4B.6 | Navigate to `/milestones` → renders milestone list, create form | 3A.6 |
| 4B.7 | Navigate to `/manpower` → renders log list, create entry | 3A.7 |
| 4B.8 | Navigate to `/petty-cash` → renders entries, approve/reject flow | 3A.8 |
| 4B.9 | Navigate to `/finance/payments` → renders receipts, create form | 3A.9 |
| 4B.10 | Navigate to `/finance/retention` → renders ledger, release action | 3A.10 |
| 4B.11 | Navigate to `/finance/penalties` → renders deductions, approve flow | 3A.11 |
| 4B.12 | Navigate to `/sla` (or `/om-helpdesk/sla`) → renders profiles + rules | 3A.12 |
| 4B.13 | Navigate to `/engineering/drawings` → renders list, create + approve flow | 3A.13 |
| 4B.14 | Navigate to `/engineering/change-requests` → renders list, submit/approve flow | 3A.14 |
| 4B.15 | Navigate to `/execution/comm-logs` → renders log list, create entry | 3A.15 |
| 4B.16 | Uptime tab/section on `/execution/commissioning/devices` shows uptime data | 3A.16 |

### 4C. Dead Link Tests

| # | Test | Validates |
|---|------|-----------|
| 4C.1 | Navigate to `/pre-sales/analytics/company-profile` → renders real page (not 404) | 3B.1 |
| 4C.2 | Navigate to `/pre-sales/analytics/competitors` → renders competitor list with CRUD | 3B.2 |
| 4C.3 | Navigate to `/pre-sales/analytics/tender-results` → renders analysis page | 3B.3 |
| 4C.4 | Navigate to `/pre-sales/analytics/mis-reports` → renders report dashboard | 3B.4 |
| 4C.5 | Navigate to `/pre-sales/analytics/compare-bidders` → renders comparison tool | 3B.5 |
| 4C.6 | Navigate to `/pre-sales/analytics/missed-opportunity` → renders missed tender analysis | 3B.6 |

### 4D. CRUD Completeness Tests

| # | Test | Validates |
|---|------|-----------|
| 4D.1 | `/hr` → Create attendance log, travel request, overtime entry (forms + submit) | 3C.1 |
| 4D.2 | `/documents` → Upload document, create folder | 3C.3 |
| 4D.3 | `/pre-sales/approvals` → Approve/reject a pending item | 3C.6 |
| 4D.4 | `/pre-sales/documents/folders` → Create folder actually calls API | 3D.1 |
| 4D.5 | `/pre-sales/tender-result` → Create/edit tender result | 3C.5 |
| 4D.6 | `/rma` → Approve, reject, close RMA from UI | 3C.12 |
| 4D.7 | `/om-helpdesk` → Assign ticket, escalate, add comment | 3C.13 |
| 4D.8 | `/master-data` → Edit party, delete party, create/edit org | 3C.14 |
| 4D.9 | `/execution` → Create DPR from UI | 3C.11 |
| 4D.10 | `/reports` → Export/download a report | 3C.2 |
| 4D.11 | `/finance` → Drill-down from stat cards to child pages | 3C.9 |
| 4D.12 | `/pre-sales/mis/*` → Date filter + export | 3C.10 |

### 4E. End-to-End Workflow Tests

| # | Test | Flow |
|---|------|------|
| 4E.1 | **Tender → Project** | Create tender → Fill details → Submit → Convert to project |
| 4E.2 | **Survey → BOQ → Cost Sheet** | Create survey → Create BOQ → Submit → Approve → Create cost sheet from BOQ |
| 4E.3 | **Indent → PO → GRN → Dispatch** | Create indent → Vendor comparison → Create PO → GRN receipt → Dispatch challan |
| 4E.4 | **Invoice → Payment → Retention** | Create invoice → Submit → Approve → Mark paid → Track retention → Release |
| 4E.5 | **Ticket → SLA → RMA** | Create ticket → SLA timer starts → Escalate → Convert to RMA → Approve → Close |
| 4E.6 | **Onboarding → Employee** | Create onboarding → Submit → Review → Approve → Map to employee |

---

## Work Estimation Matrix

| Priority | Items | Complexity | Suggested Order |
|----------|-------|------------|----------------|
| **P1** (DB fix) | 1 | Low — fix column name in `get_grns()` + migrate | Do first |
| **P2** (API fix) | 1 | Same as P1 — fixing P1 fixes P2 | Same as P1 |
| **P3A** (New pages) | 25 | Medium-High — each page needs layout, data fetching, forms, actions | Group by module, do procurement first (PO/GRN/Indent) |
| **P3B** (Dead links) | 6 | Medium — 6 analytics pages under pre-sales | Can stub or build as a batch |
| **P3C** (CRUD gaps) | 14 | Low-Medium — forms + action buttons on existing pages | Quick wins — add create/edit modals |
| **P3D** (Stubs) | 3 | Low — wire up console.log stubs, add real views | Quick fixes |
| **P4** (QA) | 44 | Medium — write test scripts after each module is complete | Run after each P3 batch |

---

## Recommended Execution Order

1. **P1 + P2** — Completed: GRN `purchase_order` column error fixed and verified
2. **P3A** — Build missing pages in this order:
   - **Procurement flow**: Purchase Orders → GRNs → Indents (depends on P1 fix)
   - **Finance flow**: Payment Receipts → Retention → Penalties → Petty Cash
   - **Execution flow**: Milestones → Manpower → Communication Logs → Device Uptime
   - **Engineering flow**: Drawings → Change Requests
   - **HR flow**: Attendance/Travel/Overtime CRUD → Technician Visits → Onboarding workflow
   - **SLA module**: SLA Profiles → Timers → Penalty management
   - **Analytics**: 6 pre-sales analytics pages
   - **Master data**: Budget Allocations → PDC Instruments
3. **P3B** — Fix dead sidebar links (either create pages or remove links)
4. **P3C** — Add CRUD operations to existing read-only pages
5. **P3D** — Fix stubs
6. **P4** — Run QA suite after each batch
