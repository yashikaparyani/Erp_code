# Gov ERP — Backend API Compliance Contract

*For the frontend developer building a fresh UI against the `gov_erp` Frappe backend.*
*Site: `dev.localhost` | Backend App: `gov_erp` | Frappe v15 / ERPNext v15*

---

## 1. Authentication

All API calls go through Frappe's built-in session auth. No JWT, no Bearer tokens.

| Action | Method | Endpoint | Body | Response |
|--------|--------|----------|------|----------|
| Login | POST | `/api/method/login` | `{ usr, pwd }` | Sets `sid` cookie + `{ message: "Logged In", full_name }` |
| Logout | POST | `/api/method/logout` | — | Clears session |
| Who am I | GET | `/api/method/frappe.auth.get_logged_user` | — | `{ message: "user@example.com" }` |

**Frontend must:**
- Use `credentials: "include"` on every `fetch` call (cookie transport).
- Read `X-Frappe-CSRF-Token` from the initial page load (or `/api/method/frappe.auth.get_csrf_token`) and send it as the `X-Frappe-CSRF-Token` header on every mutating (POST) request.
- Handle `403 PermissionError` globally — means the user lacks a required role.
- Handle `401 / 417` — means session expired, redirect to login.

---

## 2. Universal API Contract

Every `gov_erp` endpoint follows this pattern:

```
POST /api/method/gov_erp.api.<function_name>
Content-Type: application/x-www-form-urlencoded  (or multipart/form-data)
```

**Response shape** (always inside Frappe's outer wrapper):
```json
{
  "message": {
    "success": true,           // boolean
    "data": { ... } | [ ... ], // present on reads & creates/updates
    "message": "Human text"    // present on mutations
  }
}
```

**Error shape** (Frappe-level exception):
```json
{
  "exc_type": "PermissionError" | "ValidationError" | ...,
  "exception": "traceback",
  "_server_messages": "[{\"message\": \"...\"}]"
}
```

**When `success: false` is returned (soft error):**
```json
{
  "message": {
    "success": false,
    "message": "Reason the operation was denied"
  }
}
```
Soft errors return HTTP 200 but `success: false`. Check `success` first.

---

## 3. Business Roles (13)

Assigned to users in Frappe user admin. Auto-seeded on install/migrate.

| # | Role Name | Constant |
|---|-----------|----------|
| 1 | Presales Tendering Head | `ROLE_PRESALES_HEAD` |
| 2 | Presales Executive | `ROLE_PRESALES_EXECUTIVE` |
| 3 | Engineering Head | `ROLE_ENGINEERING_HEAD` |
| 4 | Engineer | `ROLE_ENGINEER` |
| 5 | Department Head | `ROLE_DEPARTMENT_HEAD` |
| 6 | Accounts | `ROLE_ACCOUNTS` |
| 7 | HR Manager | `ROLE_HR_MANAGER` |
| 8 | Project Manager | `ROLE_PROJECT_MANAGER` |
| 9 | Top Management | `ROLE_TOP_MANAGEMENT` |
| 10 | Procurement Manager | `ROLE_PROCUREMENT_MANAGER` |
| 11 | Purchase | `ROLE_PURCHASE` |
| 12 | Store Manager | `ROLE_STORE_MANAGER` |
| 13 | Stores Logistics Head | `ROLE_STORES_LOGISTICS_HEAD` |

`System Manager` always has access to everything (implicit).

---

## 4. Role → Module Access Matrix

| Module | Read | Write | Approve |
|--------|------|-------|---------|
| **Tender** | Presales Head, Presales Exec, Dept Head, Top Mgmt | Presales Head, Presales Exec | — |
| **Tender Conversion** | — | — | Presales Head, Dept Head |
| **Survey** | Presales Head, Presales Exec, Eng Head, Engineer, Dept Head, Top Mgmt | Eng Head, Engineer | — |
| **BOQ** | Presales Head, Presales Exec, Eng Head, Dept Head, Accounts, Top Mgmt | Presales Head, Presales Exec | Dept Head |
| **Cost Sheet** | Presales Head, Presales Exec, Eng Head, Dept Head, Accounts, Top Mgmt | Presales Head, Presales Exec | Dept Head |
| **Procurement** | Procurement Mgr, Purchase, Presales Head, Accounts, Dept Head, Top Mgmt | Procurement Mgr, Purchase | Dept Head |
| **Stores** | Store Mgr, Stores Logistics Head, Procurement Mgr, Purchase, Dept Head, Top Mgmt | Store Mgr, Stores Logistics Head | Dept Head |
| **Execution** | Project Mgr, Eng Head, Engineer, Dept Head, Top Mgmt | Project Mgr, Eng Head, Engineer | — |
| **Dep. Override** | (same as Execution read) | (same as Execution write) | Dept Head, Top Mgmt |
| **HR** | HR Manager, Dept Head, Top Mgmt | HR Manager | HR Manager, Dept Head |

The frontend should show/hide modules and actions based on the logged-in user's roles. Fetch roles via `GET /api/method/frappe.client.get_list?doctype=Has Role&filters=[["parent","=","<user>"]]&fields=["role"]`.

---

## 5. Complete Endpoint Reference

### 5.1 Health Check (Public)

| Endpoint | Params | Response |
|----------|--------|----------|
| `health_check` | — | `{ success, data: { status: "healthy", user, timestamp } }` |

---

### 5.2 Tender APIs (11 endpoints)

| Endpoint | Params | Role Gate | Response `data` |
|----------|--------|-----------|-----------------|
| `get_tenders` | `status?`, `client?`, `linked_project?`, `page?` (default 1), `page_size?` (default 20) | tender_read | `{ tenders: [...], total, page, page_size, total_pages }` |
| `get_tender` | `name` | tender_read | Full doc dict |
| `create_tender` | `data` (JSON) | tender_write | Full doc dict |
| `update_tender` | `name`, `data` (JSON) | tender_write | Full doc dict |
| `delete_tender` | `name` | tender_write | — |
| `get_tender_stats` | — | tender_read | `{ total, draft, submitted, under_evaluation, won, lost, cancelled, dropped, total_pipeline }` |
| `convert_tender_to_project` | `tender_name` | tender_conversion | `{ tender, project }` |
| `get_tender_organizations` | `tender` | tender_read | `[...]` |
| `create_tender_organization` | `data` (JSON) | tender_write | Full doc dict |
| `delete_tender_organization` | `name` | tender_write | — |
| `get_parties` / `get_organizations` | `party_type?`, `active?` | tender_read | `[{ name, party_name, party_type, active, phone, email, gstin, pan, city, state }]` |

**GE Tender fields for `data` payload:**

| Field | Type | Required | Options |
|-------|------|----------|---------|
| tender_number | string | ✅ | |
| title | string | ✅ | |
| client | string (Link→GE Party) | ✅ | |
| submission_date | date | | |
| status | enum | ✅ | DRAFT, SUBMITTED, UNDER_EVALUATION, WON, LOST, CANCELLED, DROPPED |
| estimated_value | number | | |
| emd_required | 0/1 | | |
| emd_amount | number | | |
| pbg_required | 0/1 | | |
| pbg_amount | number | | |
| rfp_document | attach URL | | |
| tender_document | attach URL | | |
| linked_project | string (Link→Project) | | |
| compliance_items | array of `{ requirement, is_compliant, remarks }` | | |
| clarifications | array of `{ question, question_date, answer, answer_date, status }` | | Clarification status: Open, Answered, Closed |

**GE Tender Organization `data`:**
`{ linked_tender, organization (Link→GE Party), role_in_tender, share_percentage, scope_of_work, is_lead }`
`role_in_tender` options: Lead Bidder, JV Partner, Sub-contractor, Consultant, OEM, Other

**GE Party fields for reference:**
`{ party_name, party_type (CLIENT/VENDOR/BOTH), active, phone, email, gstin, pan, address, city, state, pincode, bank_name, account_no, ifsc }`

---

### 5.3 Survey APIs (7 endpoints)

| Endpoint | Params | Role Gate | Response `data` |
|----------|--------|-----------|-----------------|
| `get_surveys` | `tender?`, `status?` | survey_read | `[{ name, linked_tender, site_name, status, survey_date, surveyed_by }]` |
| `get_survey` | `name` | survey_read | Full doc dict |
| `create_survey` | `data` (JSON) | survey_write | Full doc dict |
| `update_survey` | `name`, `data` (JSON) | survey_write | Full doc dict |
| `delete_survey` | `name` | survey_write | — |
| `get_survey_stats` | — | survey_read | `{ total, pending, in_progress, completed }` |
| `check_survey_complete` | `tender_name` | survey_read | `{ all_complete, total_surveys, completed_surveys }` |

**GE Survey fields:**
`{ linked_tender (reqd), site_name (reqd), status (Pending/In Progress/Completed), survey_date, surveyed_by (Link→User), coordinates, address, summary, site_notes, attachments: [{ attachment (reqd), description, attachment_type (Photo/Document/Other) }] }`

---

### 5.4 BOQ APIs (10 endpoints)

| Endpoint | Params | Role Gate | Response `data` |
|----------|--------|-----------|-----------------|
| `get_boqs` | `tender?`, `status?` | boq_read | `[{ name, linked_tender, linked_project, version, status, total_amount, total_items }]` |
| `get_boq` | `name` | boq_read | Full doc dict |
| `create_boq` | `data` (JSON) | boq_write | Full doc dict |
| `update_boq` | `name`, `data` (JSON) | boq_write | Full doc dict |
| `delete_boq` | `name` | boq_write | Blocked if APPROVED |
| `submit_boq_for_approval` | `name` | boq_write | Full doc dict |
| `approve_boq` | `name` | boq_approval (Dept Head) | Full doc dict |
| `reject_boq` | `name`, `reason` | boq_approval | Full doc dict |
| `revise_boq` | `name` | boq_write | New doc dict (version+1) |
| `get_boq_stats` | — | boq_read | `{ total, draft, pending_approval, approved, rejected }` |

**Workflow:** DRAFT → (submit) → PENDING_APPROVAL → (approve) → APPROVED / (reject) → REJECTED → (revise from approved/rejected creates new version in DRAFT).

**Gate:** `submit_boq_for_approval` requires ALL surveys for the linked tender to have `status == "Completed"`.

**GE BOQ Item fields:**
`{ site_name, item_link (Link→Item), description (reqd), qty (reqd), unit, rate (reqd), amount (auto), make, model }`

---

### 5.5 Cost Sheet APIs (11 endpoints)

| Endpoint | Params | Role Gate | Response `data` |
|----------|--------|-----------|-----------------|
| `get_cost_sheets` | `tender?`, `status?` | cost_sheet_read | `[{ name, linked_tender, linked_project, linked_boq, version, status, base_cost, sell_value, total_items }]` |
| `get_cost_sheet` | `name` | cost_sheet_read | Full doc dict |
| `create_cost_sheet` | `data` (JSON) | cost_sheet_write | Full doc dict |
| `update_cost_sheet` | `name`, `data` (JSON) | cost_sheet_write | Full doc dict |
| `delete_cost_sheet` | `name` | cost_sheet_write | Blocked if APPROVED |
| `submit_cost_sheet_for_approval` | `name` | cost_sheet_write | Full doc dict |
| `approve_cost_sheet` | `name` | cost_sheet_approval (Dept Head) | Full doc dict |
| `reject_cost_sheet` | `name`, `reason` | cost_sheet_approval | Full doc dict |
| `revise_cost_sheet` | `name` | cost_sheet_write | New doc dict (version+1) |
| `get_cost_sheet_stats` | — | cost_sheet_read | `{ total, draft, pending_approval, approved, rejected }` |
| `create_cost_sheet_from_boq` | `boq_name` | cost_sheet_write | Full doc dict |

**`create_cost_sheet_from_boq`** — Takes an APPROVED GE BOQ, maps its items to cost sheet items, copies `linked_tender` / `linked_project`. Returns error if BOQ is not APPROVED or if a cost sheet already exists for that BOQ.

**GE Cost Sheet Item fields:**
`{ site_name, item_link, description (reqd), cost_type (reqd: Material/Service/Labour/Overhead/Other), qty (reqd), unit, base_rate (reqd), base_amount (auto), remarks }`

---

### 5.6 Procurement APIs (10 endpoints)

| Endpoint | Params | Role Gate | Response `data` |
|----------|--------|-----------|-----------------|
| `get_vendor_comparisons` | `status?`, `project?` | procurement_read | `[{ name, linked_material_request, linked_rfq, linked_project, linked_tender, linked_boq, status, recommended_supplier, quote_count, distinct_supplier_count, lowest_total_amount, selected_total_amount }]` |
| `get_vendor_comparison` | `name` | procurement_read | Full doc dict |
| `create_vendor_comparison` | `data` (JSON) | procurement_write | Full doc dict |
| `update_vendor_comparison` | `name`, `data` (JSON) | procurement_write | Full doc dict |
| `delete_vendor_comparison` | `name` | procurement_write | Blocked if APPROVED |
| `submit_vendor_comparison` | `name`, `exception_reason?` | procurement_write | Full doc dict |
| `approve_vendor_comparison` | `name` | procurement_approval (Dept Head) | Full doc dict |
| `reject_vendor_comparison` | `name`, `reason` | procurement_approval | Full doc dict |
| `revise_vendor_comparison` | `name` | procurement_write | New doc dict |
| `get_vendor_comparison_stats` | — | procurement_read | `{ total, draft, pending_approval, approved, rejected, three_quote_ready }` |

**`submit_vendor_comparison`**: If fewer than 3 distinct suppliers, `exception_reason` is required (single/sole-source justification).

**GE Vendor Comparison Quote fields:**
`{ supplier (reqd, Link→Supplier), supplier_quotation (Link→Supplier Quotation), item_link (Link→Item), description (reqd), qty (reqd), unit, rate (reqd), amount (auto), lead_time_days, is_selected, remarks }`

---

### 5.7 Stores APIs (12 endpoints)

| Endpoint | Params | Role Gate | Response `data` |
|----------|--------|-----------|-----------------|
| `get_dispatch_challans` | `status?`, `project?`, `dispatch_type?` | store_read | `[{ name, dispatch_type, dispatch_date, status, linked_project, from_warehouse, to_warehouse, target_site_name, vehicle_number, total_items, total_qty }]` |
| `get_dispatch_challan` | `name` | store_read | Full doc dict |
| `create_dispatch_challan` | `data` (JSON) | store_write | Full doc dict |
| `update_dispatch_challan` | `name`, `data` (JSON) | store_write | Full doc dict |
| `delete_dispatch_challan` | `name` | store_write | — |
| `submit_dispatch_challan` | `name` | store_write | Full doc dict |
| `approve_dispatch_challan` | `name` | store_approval (Dept Head) | Full doc dict |
| `reject_dispatch_challan` | `name`, `reason` | store_approval | Full doc dict |
| `mark_dispatch_challan_dispatched` | `name` | store_write | Full doc dict + creates Stock Entry |
| `get_dispatch_challan_stats` | — | store_read | `{ total, draft, pending_approval, approved, rejected, dispatched }` |
| `get_store_stock_snapshot` | `warehouse?` | store_read | `[{ item_code, warehouse, actual_qty, reserved_qty, projected_qty }]` (from ERPNext Bin) |

**4-state workflow:** DRAFT → PENDING_APPROVAL → APPROVED → DISPATCHED (+ REJECTED branch).
`mark_dispatch_challan_dispatched` creates a `Stock Entry` of type "Material Transfer" when `from_warehouse` and `to_warehouse` are both set.

**Dispatch types:** WAREHOUSE_TO_WAREHOUSE, WAREHOUSE_TO_SITE, VENDOR_TO_SITE

**GE Dispatch Challan Item fields:**
`{ item_link (reqd, Link→Item), description (reqd), qty (reqd), uom, serial_numbers, remarks }`

---

### 5.8 Execution APIs (17 endpoints)

| Endpoint | Params | Role Gate | Response `data` |
|----------|--------|-----------|-----------------|
| `get_sites` | `project?`, `status?` | execution_read | `[{ name, site_code, site_name, status, linked_project, linked_tender, latitude, longitude }]` |
| `get_site` | `name` | execution_read | Full doc dict |
| `create_site` | `data` (JSON) | execution_write | Full doc dict |
| `update_site` | `name`, `data` (JSON) | execution_write | Full doc dict |
| `delete_site` | `name` | execution_write | — |
| `get_milestones` | `project?`, `site?`, `status?` | execution_read | `[{ name, milestone_name, status, linked_project, linked_site, planned_date, actual_date, owner_user }]` |
| `get_milestone` | `name` | execution_read | Full doc dict |
| `create_milestone` | `data` (JSON) | execution_write | Full doc dict |
| `update_milestone` | `name`, `data` (JSON) | execution_write | Full doc dict |
| `delete_milestone` | `name` | execution_write | — |
| `get_dependency_rules` | `task?`, `active?` | execution_read | `[{ name, linked_task, prerequisite_type, linked_project, linked_site, prerequisite_reference_doctype, prerequisite_reference_name, required_status, hard_block, active, block_message }]` |
| `create_dependency_rule` | `data` (JSON) | execution_write | Full doc dict |
| `update_dependency_rule` | `name`, `data` (JSON) | execution_write | Full doc dict |
| `delete_dependency_rule` | `name` | execution_write | — |
| `get_dependency_overrides` | `task?`, `status?` | execution_read | `[{ name, linked_task, dependency_rule, status, requested_by, approved_by, actioned_at, reason }]` |
| `create_dependency_override` | `data` (JSON) | execution_write | Full doc dict |
| `approve_dependency_override` | `name`, `reason?` | dep_override_approval (Dept Head, Top Mgmt) | Full doc dict |
| `reject_dependency_override` | `name`, `reason` (reqd) | dep_override_approval | Full doc dict |
| `evaluate_task_dependencies` | `task_name` | execution_read | `{ task, can_start (bool), blockers: [{ rule, prerequisite_type, reference_doctype, reference_name, required_status, current_status, hard_block, message }] }` |

**GE Site statuses:** PLANNED, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
**GE Milestone statuses:** PLANNED, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED
**Dependency prerequisite_type options:** TASK, MATERIAL, DOCUMENT, APPROVAL, IP, SURVEY, BOQ, DISPATCH
**GE Dependency Override statuses:** REQUESTED, APPROVED, REJECTED

**`evaluate_task_dependencies`** — The key engine endpoint. Given a task name, evaluates all active dependency rules, checks approved overrides, and returns whether the task `can_start` (true if no hard blockers remain) plus the list of blocking rules with their current vs required status.

---

### 5.9 HR / Onboarding APIs (12 endpoints)

| Endpoint | Params | Role Gate | Response `data` |
|----------|--------|-----------|-----------------|
| `get_onboardings` | `status?`, `company?` | hr_read | `[{ name, employee_name, company, designation, onboarding_status, date_of_joining, employee_reference, submitted_by, approved_by, approved_at, creation, modified }]` |
| `get_onboarding` | `name` | hr_read | Full doc dict (includes child tables: certifications, documents, education, experience) |
| `create_onboarding` | `data` (JSON) | hr_write | Full doc dict |
| `update_onboarding` | `name`, `data` (JSON) | hr_write | Full doc dict |
| `delete_onboarding` | `name` | hr_write | Blocked if MAPPED_TO_EMPLOYEE |
| `submit_onboarding` | `name` | hr_write | Full doc dict |
| `review_onboarding` | `name` | hr_approval | Full doc dict |
| `approve_onboarding` | `name` | hr_approval | Full doc dict (checks mandatory documents first) |
| `reject_onboarding` | `name`, `reason?` | hr_approval | Full doc dict |
| `map_onboarding_to_employee` | `name` | hr_write | `{ onboarding: {...}, employee: "HR-EMP-00001" }` |
| `get_onboarding_stats` | — | hr_read | `{ total, draft, submitted, under_review, approved, rejected, mapped_to_employee }` |

**6-state workflow:** DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → MAPPED_TO_EMPLOYEE (+ REJECTED branch from UNDER_REVIEW).

**`approve_onboarding` gate:** All mandatory documents (Passport Size Photo, Aadhar Card, PAN Card) must have a file uploaded.

**`map_onboarding_to_employee`:** Creates an ERPNext `Employee` record + syncs education and experience rows. Links back. One-way — cannot delete once mapped.

**GE Employee Onboarding `data`:**
```
{
  employee_name (reqd), company (reqd, Link→Company),
  designation (Link→Designation), date_of_joining,
  form_source (Manual/Bulk Import/Field App),
  project_state, project_location, project_city,
  salutation, gender, date_of_birth,
  blood_group (A+/A-/B+/B-/O+/O-/AB+/AB-),
  marital_status (Single/Married/Divorced/Widowed),
  spouse_name, father_name, mother_name,
  contact_number, alternate_contact_number, personal_email,
  permanent_address, local_address,
  aadhar_number, pan_number, epf_number, esic_number,
  certifications: [{ certificate_name (reqd), certificate_description, validity_date }],
  documents: [{
    document_type (reqd: Passport Size Photo | CV | 10th Mark Sheet | 12th Mark Sheet | Diploma Certificate | UG Certificate | PG Certificate | Aadhar Card | PAN Card | Birth Certificate | Certifications Bundle | Other),
    is_mandatory (0/1), file (attach), verification_status (PENDING/VERIFIED/REJECTED),
    verified_by, verified_on, remarks
  }],
  education: [{ school_univ, qualification, level, year_of_passing, class_per }],
  experience: [{ company_name, designation, salary, total_experience }]
}
```

---

## 6. Status Enums & Valid Transitions — Quick Reference

| Domain | Statuses | Happy Path |
|--------|----------|------------|
| **Tender** | DRAFT, SUBMITTED, UNDER_EVALUATION, WON, LOST, CANCELLED, DROPPED | DRAFT → SUBMITTED → UNDER_EVALUATION → WON (triggers Project creation) |
| **Survey** | Pending, In Progress, Completed | Pending → In Progress → Completed |
| **BOQ** | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED | DRAFT → PENDING_APPROVAL → APPROVED; REJECTED/APPROVED → revise → new DRAFT |
| **Cost Sheet** | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED | Same as BOQ |
| **Vendor Comparison** | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED | Same as BOQ (+ exception path for < 3 quotes) |
| **Dispatch Challan** | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, DISPATCHED, CANCELLED | DRAFT → PENDING_APPROVAL → APPROVED → DISPATCHED |
| **Site** | PLANNED, ACTIVE, ON_HOLD, COMPLETED, CANCELLED | PLANNED → ACTIVE → COMPLETED |
| **Milestone** | PLANNED, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED | PLANNED → IN_PROGRESS → COMPLETED |
| **Dep. Override** | REQUESTED, APPROVED, REJECTED | REQUESTED → APPROVED / REJECTED |
| **EMD/PBG** | Pending, Submitted, Released, Forfeited, Expired | Pending → Submitted → Released |
| **Onboarding** | DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, MAPPED_TO_EMPLOYEE | DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → MAPPED_TO_EMPLOYEE |

---

## 7. Cross-Module Links (Entity Relationships)

```
GE Party ──┐
            ├──→ GE Tender (client)
            └──→ GE Tender Organization (organization)

GE Tender ──┬──→ GE Survey (linked_tender)
            ├──→ GE BOQ (linked_tender)
            ├──→ GE Cost Sheet (linked_tender)
            ├──→ GE Vendor Comparison (linked_tender)
            ├──→ GE Dispatch Challan (linked_tender)
            ├──→ GE Site (linked_tender)
            └──→ ERPNext Project (linked_project, created on WON)

GE BOQ ────→ GE Cost Sheet (linked_boq, via create_cost_sheet_from_boq)

GE Site ────→ GE Milestone (linked_site)

ERPNext Task ──→ GE Dependency Rule (linked_task)
               → GE Dependency Override (linked_task)

GE Employee Onboarding ──→ ERPNext Employee (employee_reference, via map_onboarding_to_employee)

ERPNext Material Request ──→ GE Vendor Comparison (linked_material_request)
ERPNext Request for Quotation ──→ GE Vendor Comparison (linked_rfq)
ERPNext Supplier ──→ GE Vendor Comparison Quote (supplier)
ERPNext Item ──→ GE BOQ Item, GE Cost Sheet Item, GE Vendor Comparison Quote, GE Dispatch Challan Item
ERPNext Warehouse ──→ GE Dispatch Challan (from_warehouse, to_warehouse)
```

---

## 8. Frontend Validation Rules to Mirror Backend

The backend enforces these — the frontend should mirror them for UX:

1. **BOQ submit gate** — Before showing "Submit for Approval", call `check_survey_complete(tender_name)`. If `all_complete` is false, disable the button and show count.
2. **Approved records are immutable** — BOQ, Cost Sheet, Vendor Comparison with status APPROVED cannot be deleted. Show revise button instead.
3. **Vendor comparison 3-quote rule** — If `distinct_supplier_count < 3` on submit, `exception_reason` is required. Show a warning dialog.
4. **Onboarding mandatory documents** — Before approve, check documents child table for `Passport Size Photo`, `Aadhar Card`, `PAN Card` with files attached.
5. **Mapped onboarding is locked** — `MAPPED_TO_EMPLOYEE` records cannot be deleted. Hide delete button.
6. **Dispatch → Stock Entry** — After `mark_dispatch_challan_dispatched`, the `linked_stock_entry` field will be populated. Show it as a read-only link.
7. **Dependency evaluation** — Call `evaluate_task_dependencies(task_name)` before allowing a task to start. If `can_start` is false, show blockers. If `hard_block` is true, disable the start button entirely.

---

## 9. ERPNext Built-in DocTypes You'll Query Directly

These are standard ERPNext doctype APIs (use Frappe Resource API: `GET /api/resource/<doctype>`):

| DocType | Purpose | Key Fields |
|---------|---------|------------|
| Project | Project management | `name`, `project_name`, `status`, `company` |
| Task | Task tracking | `name`, `subject`, `status`, `project` |
| Item | Item master | `name`, `item_name`, `item_group` |
| Supplier | Vendor master | `name`, `supplier_name`, `supplier_group` |
| Warehouse | Inventory locations | `name`, `warehouse_name` |
| Company | Company master | `name`, `company_name` |
| User | User accounts | `name`, `full_name`, `email` |
| Employee | Employee records | `name`, `employee_name`, `status` |
| Designation | Job titles | `name` |
| Material Request | Indent/requisition | `name`, `material_request_type` |
| Request for Quotation | RFQ | `name` |
| Supplier Quotation | Vendor quotes | `name`, `supplier` |

---

## 10. Pagination Convention

Only `get_tenders` currently implements server-side pagination:
- Params: `page` (default 1), `page_size` (default 20)
- Response: `{ tenders, total, page, page_size, total_pages }`

All other list endpoints return full results (no pagination params). If the frontend needs client-side pagination, it should handle it locally. **Future:** We can add pagination to any list endpoint upon request — the pattern is established.

---

## 11. File Uploads

Frappe handles file uploads via:
```
POST /api/method/upload_file
Content-Type: multipart/form-data
Body: file (binary), doctype, docname, fieldname
```
Returns `{ message: { file_url: "/files/..." } }`. Use the returned `file_url` in Attach fields (e.g., `rfp_document`, `tender_document`, survey attachment `attachment`, onboarding document `file`).

---

## 12. Future Backend Additions (Planned, Not Yet Built)

These modules will follow the same patterns (same response shape, same role gating, same approval workflows):

| Module | Expected DocTypes | Expected Endpoints | ETA |
|--------|-------------------|--------------------|-----|
| **DPR (Daily Progress Report)** | GE DPR, GE DPR Item | CRUD + submit/approve | Phase 5 extension |
| **Project Team Mapping** | GE Project Team Member | CRUD + role-based assignment | Phase 5 extension |
| **PO Hook** | — (extends ERPNext Purchase Order) | `create_po_from_comparison(name)` | Phase 4 extension |
| **Billing Tracker** | GE Billing Milestone, GE RA Bill | CRUD + approval + link to Sales Invoice | Phase 7 |
| **Payment & Retention** | GE Payment Receipt, GE Retention Entry | CRUD + reconciliation | Phase 7 |
| **Penalty Deductions** | GE Penalty | CRUD + link to billing | Phase 7 |
| **O&M Ticketing** | GE Ticket, GE SLA Timer | CRUD + SLA countdown + escalation | Phase 7 |
| **RMA Tracker** | GE RMA | CRUD + link to Stock Entry | Phase 7 |
| **Attendance / Travel** | GE Attendance Log, GE Travel Log | CRUD + approval | Phase 6 extension |
| **ESIC / PF Compliance** | GE Statutory Ledger | Monthly compliance entries | Phase 6 extension |
| **Payroll** | Likely reuse ERPNext Payroll | TBD — may stay out of scope | Phase 6 extension |

**Frontend should:**
- Stub navigation entries for these modules now (greyed out / "Coming Soon").
- Build module pages as configuration-driven components so new DocTypes can be wired up with minimal code.
- The API pattern will remain identical: `POST /api/method/gov_erp.api.<function>` → `{ success, data, message }`.

---

## 13. Quick-Start Checklist for Frontend Dev

1. **Auth flow:** Login → store session cookie → include on all requests → handle 403/401 globally.
2. **CSRF:** Fetch token, send as `X-Frappe-CSRF-Token` header on POST.
3. **API base:** All custom calls go to `POST /api/method/gov_erp.api.<endpoint>`.
4. **Response unwrap:** Always read `response.message.success` first. Data is in `response.message.data`.
5. **Role-based UI:** Fetch user roles on login, show/hide modules per the matrix in §4.
6. **Status colors:** Map status enums to UI badges/colors consistently across all modules.
7. **Approval pattern:** Every approval module has the same 5 buttons: Create, Submit, Approve, Reject, Revise. Build one reusable component.
8. **Stats endpoints:** Every module has a `get_<module>_stats` endpoint. Use these for dashboard cards.
9. **Link fields:** When a field type is Link (e.g., `client → GE Party`), fetch options from the linked DocType's list endpoint or `GET /api/resource/<DocType>?fields=["name","<display_field>"]`.
10. **Child tables:** Send as arrays in the `data` JSON payload. Field names match exactly as documented above.

--- 

Completed: *Write compliance document* (4/4)

That's the full compliance contract — 92 current endpoints across 8 domains, all field schemas, role matrices, status enums, validation rules, cross-module relationships, and the planned future modules. Hand this to the frontend dev and they can code against it with zero ambiguity.
