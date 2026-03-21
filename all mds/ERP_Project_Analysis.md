# 🎯 Complete ERP Project Analysis — Tujhe Kya Build Karna Hai

> **Generated:** 24 February 2026  
> **Source Documents Analyzed:** All 18 files in `d:\erp\`  
> **Primary Reference:** `frs and db schema fields.docx`

---

## 📁 Folder mein kya hai — File Overview

| File | Type | Context |
|------|------|---------|
| `frs and db schema fields.docx` | **📋 Main FRS (Functional Requirements Spec)** | Yahi hai core document — **isko build karna hai** |
| `RFPforCitySurveillanceSystem.pdf` | Government Tender (PPHC Punjab) | Real-world client project jiske liye yeh ERP banaya ja raha hai |
| `Golive-23.12.2024.pdf` | Project Completion Certificate | Punjab Police Surveillance + erp project — **go-live ho chuka** |
| `SAS Nagar Punjab Mohali Synopsis.xlsx` | BOQ/Scope Summary | Site-wise material breakdown |
| `BOQ PPHC 01.01.204.xlsx` | Bill of Quantities | Material list with quantities |
| `Master Compliance PPHC.xlsx` | Compliance Checklist | Technical specs compliance tracking |
| `Technical Compliance PPHC.xlsx` | Technical Compliance | OEM/hardware specs verification |
| `OEM Checklist Punjab Police.xlsx` | OEM Documentation | Hardware verification checklist |
| `Unpriced BOM.xlsx` / `BOQ_234791.xls` | BOM / Pricing sheets | Procurement data |
| `PBG_Punjab_Mohali.pdf` | Performance Bank Guarantee | Financial security document |
| `Corrigendum.pdf`, `eProcurement.pdf` etc. | Tender amendments | Govt procurement process docs |
| `PriceComponentForCapexandOpex01.pdf` | CAPEX/OPEX Pricing | Cost breakdown for hardware + maintenance |
| `techsummary_234791.pdf` | Technical Summary | Bid eligibility summary |

---

## 🧠 Background — Context Samajhna

Teri company (**Technosys / Infobase**) ne:
- Punjab Police **City Surveillance + erp project** execute kiya
- **Contract value: ₹1770 Lakhs**
- **Location:** S.A.S. Nagar (Mohali), Punjab
- Kya install kiya: 13 ANPRs, 29 PTZ + Bullet cameras, RLVD, Speed Detection, ICCC (Command & Control Centre), Servers, Video Wall, Networking
- **Project Go-Live: December 23, 2024** ✅

**Problem:** Yeh sab project manually manage ho raha tha — Excel, Email, WhatsApp se.  
Tenders, BOQ, Procurement, Sites, Billing — sab scattered.

**Solution:** Apna khud ka **custom ERP** banana hai jo specifically Govt project executing companies ke liye bana ho.

---

## 🏗️ Kya Build Karna Hai — ERP System Summary

> **Project Name:** Integrated Tender-to-Delivery ERP  
> **Phase:** Phase 1  
> **Target Users:** Govt project companies (Surveillance, erp, Solar, O&M)  
> **Recommended Stack:** ERPNext Framework (Python + Frappe + MariaDB)

### 🔄 Complete Lifecycle Jo Cover Hogi:

```
Tender → Survey → BOQ → Costing → Approval → Procurement →
Delivery (GRN) → Installation → Commissioning → Billing → Payment Tracking → O&M Ticketing
```

### Phase 1 mein kya NAHI hai (explicitly excluded):
- ❌ External accounting integration (Tally / Zoho / SAP)
- ❌ AI / Predictive analytics
- ❌ Biometric integration

---

## 👥 Users & Roles (11 Roles)

| Role | Kya Karta Hai |
|------|---------------|
| **Superadmin** | Full system access, user management, role permissions |
| **Department Head** | Approve records, override dependency blocks with justification |
| **Presales / Tendering** | Create tenders, track EMD/PBG, manage compliance |
| **Engineering Head + Engineers** | Drawings, network plans, deviation logs, FAT/SAT/UAT |
| **Purchase** | Indents, POs, 3-quotation compliance, vendor quotes |
| **Stores / Logistics (HO & Project)** | GRN, dispatch, inventory, serial tracking |
| **Project Manager** | Milestones, tasks, DPR, dependency management |
| **Accounts** | Invoices, payment receipts, retention ledger, penalties |
| **Field Technician** | DPR updates, installation records, site reports |
| **O&M Operator** | Ticket management, SLA timer, RMA tracking |
| **Top Management** | Read-only dashboards, overall visibility |

### Core Rules:
- Ek user ke multiple roles ho sakte hain (only via Superadmin)
- Role access is scoped: **project-first** (site/region optional)

---

## 📦 11 Modules — Phase 1 Detail

---

### Module 1: 📋 Tender & Presales

**Kya karta hai:**
- Tender create/edit karo: `tender_no`, `client`, `submission_date`, `status`
- RFP documents attach karo
- Compliance checklist maintain karo (line-level status + remarks)
- Clarification tracker (question → response, dates)
- EMD/PBG tracker: bank name, instrument no, amount, issue date, expiry date, status
- **Tender → Project conversion: only when status = WON**

---

### Module 2: 🗺️ Survey

**Kya karta hai:**
- Survey record karo per tender/project, per site
- Survey "COMPLETED" mark karna mandatory hai — BOQ approve nahi ho sakta bina iske
- Survey photos + site notes upload
- Survey se site conditions document karo

---

### Module 3: 📊 BOQ & Costing

**Kya karta hai:**
- BOQ = **site-wise** data + **project-level** aggregation
- Revisions/versioning support (history retain karo for long period)
- Costing model = **margin-on-cost** (cost + margin% = selling price)
- BOQ approval aur Costing approval — dono workflow ke through
- BOQ lines: Item Master se linked OR ad-hoc description lines (dono supported)
- BOQ line fields: `description`, `qty`, `unit`, `rate`, `amount`, `item`, `make`, `model`

---

### Module 4: 🛒 Procurement & Vendor

**Kya karta hai:**
- Vendor master management (name, GSTIN, PAN, addresses, contacts)
- Indent creation per project (optionally site-specific)
- **Mandatory 3-quotation compliance** — exception only with approval
- Quotation comparison sheet generate karo (auto)
- PO creation:
  - 1 PO → multiple indents cover kar sakta hai
  - Indent lines split across multiple POs/vendors possible
  - PO amendments tracked as revisions (version history)

---

### Module 5: 🏬 Stores & Logistics

**Kya karta hai:**
- **GRN (Goods Receipt Note):**
  - Partial deliveries supported
  - Accept qty + Reject qty (separate)
  - Attach: packing list, warranty certificate, MIR (Material Inspection Report)
- **Dispatch:**
  - Route 1: HO Store → Project Store → Site
  - Route 2: Vendor → Site (direct delivery) — dono supported
- **Inventory Rules:**
  - ❌ Negative stock NOT allowed
  - Ledger-based movements (har movement audit trail mein)
  - **Serialized tracking** for critical devices (IP cameras, servers etc.)

---

### Module 6: 🔨 Project Execution + Dependency Engine

**Kya karta hai:**
- Project types se template: erp / Surveillance / Solar / O&M / AMC
- Sites per project track karo (site status)
- **Milestones + Tasks:**
  - Planned dates vs Actual dates
  - Owner assignment
- **Dependency Engine (Core Feature):**
  - Prerequisites check karo: Survey complete? Drawings approved? Material delivered? IP assigned?
  - Incomplete prerequisite → **block progression + show reason**
  - Override: only Dept Head+ with written justification → creates audit entry
- **DPR (Daily Progress Report):**
  - Daily, per site
  - Photos + summary
  - One DPR per site per day enforced

---

### Module 7: ✏️ Engineering & Design

**Kya karta hai:**
- Drawing preparation status + revision history + client approval status
- Technical deviation log
- Change request tracker
- Engineering deliverables list:
  - Drawings / Layouts
  - Network Plans
  - Design Reports
  - FAT / SAT / UAT artefacts

---

### Module 8: 🌐 Network & Commissioning

**Kya karta hai:**
- Device register per site (serial number based)
- IP pool management per project/site (subnet, gateway, VLAN)
- IP allocation log (which device → which IP)
- Commissioning checklist completion (template-based)
- Test report upload
- **Client sign-off required** for:
  - Camera FOV (Field of View) sign-off
  - Overall commissioning completion

---

### Module 9: 💰 Billing & Accounts (Tracking only in Phase 1)

**Kya karta hai:**
- Invoice types: `MILESTONE` / `RA` (Running Account) / `O&M`
- Invoice raise kar sakte ho milestone complete hone se pehle bhi (with flag + audit)
- Payment receipt tracking: date, amount received, TDS amount, remarks
- Retention ledger per project (retention% = project-wise configurable)
- Penalties at payment stage: deduction records store karo
  - Types: SLA penalty / LD (Liquidated Damages) / Other

---

### Module 10: 🎫 O&M + Ticketing

**Kya karta hai:**
- Ticket create karo linked to: project / site / asset (device)
- **SLA Timer:**
  - Working hours: 24×7 × 365 days
  - Pause / Resume (with role restrictions)
- Penalty model:
  - Per-ticket penalty record
  - Monthly aggregate penalty calculation
- RMA (Return Material Authorization) tracker
- Ticket actions: COMMENT / ASSIGN / VISIT / START / PAUSE / RESOLVE / CLOSE

---

### Module 11: 🔔 Alerts & Notifications

**Kya karta hai:**
- **In-App + Email notifications** for:
  - Milestone due reminders (default 15 days, configurable)
  - Payment overdue alerts (configurable)
  - Dependency blocks
  - Document expiry reminders (insurance, warranty, BG expiry)
- **Escalation Chain:** hierarchical upward escalation (configurable)

---

## 🗄️ Database Schema — 50+ Collections (MongoDB)

### A) Foundation / Security
| Collection | Key Fields |
|------------|------------|
| `orgs` | `_id, name, gstin, addresses, settings, createdAt` |
| `branches` | `_id, orgId, name, address, region, active` |
| `departments` | `_id, orgId, name, active` |
| `users` | `_id, orgId, employeeCode, name, phone, email, departmentId, branchId, active, roleIds[], scopes{}` |
| `roles` | `_id, orgId, name, active, permissions[{module, actions[], scopeType}]` |
| `approval_workflows` | `_id, orgId, entityType, steps[{stepOrder, approverRoleId}]` |
| `approval_instances` | `_id, orgId, entityType, entityId, status, currentStep, createdBy, createdAt` |
| `approval_actions` | `_id, approvalInstanceId, action, byUserId, remarks, atTime` |
| `audit_events` | `_id, orgId, entityType, entityId, action, byUserId, atTime, before{}, after{}, reason` |

### B) Parties
| Collection | Key Fields |
|------------|------------|
| `parties` | `_id, orgId, type(CLIENT/VENDOR/BOTH), name, gstin, pan, addresses[], contacts[]` |

### C) Tendering
| Collection | Key Fields |
|------------|------------|
| `tenders` | `_id, orgId, tenderNumber, title, clientId, submissionDate, status, emdRequired, pbgRequired, linkedProjectId` |
| `tender_compliance_items` | `_id, tenderId, text, status, remarks` |
| `tender_clarifications` | `_id, tenderId, question, response, askedOn, answeredOn` |
| `emd_pbg_instruments` | `_id, tenderId, type(EMD/PBG), bank, instrumentNo, amount, issueDate, expiryDate, status` |

### D) Survey
| Collection | Key Fields |
|------------|------------|
| `surveys` | `_id, orgId, tenderId/projectId, siteId, surveyDate, byUserId, summary, attachments[{fileId, note}]` |

### E) BOQ & Costing
| Collection | Key Fields |
|------------|------------|
| `items` | `_id, orgId, itemCode, name, category, unit, isSerialized, gstRate, hsnSac` |
| `boqs` | `_id, orgId, tenderId/projectId, version, status, createdBy, approvedBy, approvedAt` |
| `boq_lines` | `_id, boqId, siteId, itemId(nullable), description, qty, unit, rate, amount, item, make, model` |
| `cost_sheets` | `_id, orgId, tenderId/projectId, version, status, marginPercent, notes, totals{}` |
| `cost_lines` | `_id, costSheetId, type(ITEM/SERVICE), basis(QTY_RATE/LUMPSUM), costAmount, linkedBoqLineId` |

### F) Projects / Sites / Teams
| Collection | Key Fields |
|------------|------------|
| `project_types` | `_id, orgId, name(erp/Surveillance/Solar/O&M/AMC), milestoneTemplates[], taskTemplates[]` |
| `projects` | `_id, orgId, projectCode, name, projectTypeId, clientId, branchId, region, startDate, plannedEndDate, status, contractSummary{value, retentionPercent, ldRules}, dashboardSummary{}` |
| `sites` | `_id, orgId, projectId, siteCode, name, address, lat, lng, status, siteSummary{}` |
| `project_team` | `_id, projectId, userId, roleInProject` |

### G) Procurement
| Collection | Key Fields |
|------------|------------|
| `indents` | `_id, orgId, projectId, siteId, requestedBy, requestedOn, requiredByDate, approvedBy, status` |
| `indent_lines` | `_id, indentId, itemId, qty, notes` |
| `rfqs` | `_id, indentId, createdBy, status` |
| `vendor_quotations` | `_id, rfqId/indentId, vendorId, quoteDate, validityDate, totalAmount, status` |
| `vendor_quotation_lines` | `_id, quotationId, itemId, qty, rate, amount` |
| `comparison_sheets` | `_id, indentId, preparedBy, status, exceptionApprovedBy, exceptionReason` |
| `purchase_orders` | `_id, orgId, poNumber, vendorId, projectId, indentIds[], poDate, status, paymentTerms, deliveryTerms, revisionNo` |
| `po_lines` | `_id, poId, itemId, qty, rate, tax, amount` |

### H) Stores / Logistics / Inventory
| Collection | Key Fields |
|------------|------------|
| `stores` | `_id, orgId, name, branchId, projectId, type(HO/PROJECT/SITE_TEMP)` |
| `grns` | `_id, orgId, poId, receivedAtStoreId, receivedOn, status` |
| `grn_lines` | `_id, grnId, itemId, qtyReceived, qtyAccepted, qtyRejected` |
| `serial_numbers` | `_id, orgId, itemId, serialNo, currentStatus(IN_STOCK/ISSUED/INSTALLED/RMA/SCRAP), currentLocation{type,id}, sourceGrnLineId` |
| `dispatch_challans` | `_id, orgId, fromStoreId, toStoreId, toSiteId, dispatchedOn, status` |
| `dispatch_lines` | `_id, challanId, itemId, qty, serialIds[]` |
| `stock_ledger` | `_id, orgId, itemId, storeId, movementType, qtyIn, qtyOut, refType, refId, atTime` |

### I) Execution / Tasks / DPR
| Collection | Key Fields |
|------------|------------|
| `milestones` | `_id, orgId, projectId, siteId, name, plannedDate, actualDate, status` |
| `tasks` | `_id, orgId, projectId, siteId, milestoneId, name, ownerUserId, plannedStart, plannedEnd, actualStart, actualEnd, status` |
| `dependency_rules` | `_id, taskId, prerequisiteType(TASK/MATERIAL/DOCUMENT/APPROVAL/IP/SURVEY), prerequisiteRefId, hardBlock` |
| `dependency_overrides` | `_id, taskId, overrideBy, approvedBy, reason, atTime` |
| `dprs` | `_id, orgId, projectId, siteId, reportDate, summary, createdBy, photos[{fileId, caption}]` |

### J) Network / Devices / Commissioning
| Collection | Key Fields |
|------------|------------|
| `devices` | `_id, orgId, projectId, siteId, itemId, serialId, deviceType, status` |
| `ip_pools` | `_id, orgId, projectId, siteId, networkName, subnet, gateway, vlan, remarks` |
| `ip_allocations` | `_id, ipPoolId, deviceId, ipAddress, allocatedOn, allocatedBy` |
| `commissionings` | `_id, orgId, projectId, siteId, status, commissionedOn, commissionedBy, clientSignoff, signoffDate` |
| `commissioning_checklist_templates` | `_id, orgId, projectTypeId, name, items[{text}]` |
| `commissioning_checklist_items` | `_id, commissioningId, templateItemId, status, remarks` |
| `test_reports` | `_id, commissioningId, fileId, reportType, uploadedOn` |

### K) Billing / Payments / Retention / Penalty
| Collection | Key Fields |
|------------|------------|
| `invoices` | `_id, orgId, projectId, siteId, invoiceNo, invoiceDate, invoiceType(MILESTONE/RA/O&M), amount, gstBreakup, status` |
| `invoice_lines` | `_id, invoiceId, linkedEntityType, linkedEntityId, description, qty, rate, amount` |
| `payment_receipts` | `_id, invoiceId, receivedDate, amountReceived, tdsAmount, remarks` |
| `retention_ledger` | `_id, orgId, projectId, invoiceId, retentionAmount, releaseDueDate, releasedOn, status` |
| `penalty_deductions` | `_id, orgId, projectId, invoiceId, source(SLA/LD/OTHER), amount, reason, appliedOn, appliedAtStage` |

### L) O&M / Tickets / SLA
| Collection | Key Fields |
|------------|------------|
| `tickets` | `_id, orgId, ticketNo, projectId, siteId, assetId, category, priority, status, raisedBy, raisedOn, assignedTo, resolvedOn, closedOn` |
| `ticket_actions` | `_id, ticketId, actionType, byUserId, atTime, notes` |
| `sla_profiles` | `_id, orgId, contractId/projectTypeId, responseMinutes, resolutionMinutes, workingHours` |
| `sla_timers` | `_id, ticketId, startedOn, pausedIntervals[], totalPauseMinutes, closedOn` |
| `sla_penalty_rules` | `_id, slaProfileId, breachType(RESPONSE/RESOLUTION), slabs[{fromMin, toMin, penaltyType, value}]` |
| `sla_penalty_records` | `_id, ticketId, calculatedPenalty, calculatedOn, approvedBy, appliedToInvoiceId` |

### M) DMS / Files
| Collection | Key Fields |
|------------|------------|
| `files` | `_id, orgId, storagePath, checksum, size, mime, uploadedBy, uploadedOn` |
| `document_types` | `_id, orgId, name, expiryRequired, approvalRequired` |
| `documents` | `_id, orgId, projectId, siteId, entityType, entityId, docTypeId, version(int), fileId, status(DRAFT/SUBMITTED/APPROVED/REJECTED), expiryDate` |
| `document_approvals` | `_id, documentId, status, approvedBy, approvedOn, remarks` |

### N) Alerts
| Collection | Key Fields |
|------------|------------|
| `alert_rules` | `_id, orgId, ruleName, triggerEvent, config{daysBefore, thresholds}, targetRoles[], escalationSteps[{afterMinutes, roleId}]` |
| `alert_instances` | `_id, orgId, ruleId, entityType, entityId, createdOn, status(NEW/SEEN/DONE)` |
| `notification_logs` | `_id, alertInstanceId, channel(IN_APP/EMAIL), toUserId, sentOn` |

---

## ⚡ ERPNext vs Custom Build — Decision

### Option A: ERPNext (Frappe Framework) ✅ RECOMMENDED

| Feature | ERPNext Built-in |
|---------|-----------------|
| Role-based permissions | ✅ Yes |
| Workflow engine | ✅ Yes |
| File / Document manager | ✅ Yes |
| Notifications (In-app + Email) | ✅ Yes |
| Audit logs | ✅ Yes |
| Item Master, PO, GRN, Invoice | ✅ Partial (needs customization) |
| Dashboards & Reports | ✅ Yes |
| REST API (auto-generated) | ✅ Yes |

- **Language:** Python + Frappe Framework
- **Database:** MariaDB (SQL — not MongoDB, but schema concepts are same)
- **Frontend:** Vue.js (Frappe Desk)
- **70% already built** → tujhe sirf govt-project specific customization karni hai

### Option B: Custom Node.js + MongoDB
- FRS ki MongoDB schema exactly follow karo
- Zyada flexibility, lekin **sab scratch se banana padega**
- Time: 6-8 months minimum for solo developer

---

## 🚀 ERPNext Par Kaise Start Karen — Step by Step

### Step 1: ERPNext Install Karo (Docker — Easiest Method)

```bash
# Prerequisites: Docker Desktop install hona chahiye
git clone https://github.com/frappe/frappe_docker
cd frappe_docker

# Copy environment file
cp example.env .env

# Start containers
docker compose -f compose.yaml \
  -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml \
  up -d

# Open in browser: http://localhost:8080
# Default login: Administrator / admin
```

### Step 2: Custom Frappe App Banao

```bash
# Bench CLI use karke (if local install)
bench new-app govt_project_erp
# App name, title etc. fill karo

# App site par install karo
bench --site your_site.local install-app govt_project_erp
```

### Step 3: DocTypes Create Karo

Frappe mein **DocType = Database Table / Collection**

Example — **Tender** DocType fields:

| Field Name | Field Type | Notes |
|------------|------------|-------|
| `tender_number` | Data | Unique, mandatory |
| `title` | Data | Mandatory |
| `client` | Link → Party | Client ID |
| `submission_date` | Date | |
| `status` | Select | DRAFT / SUBMITTED / WON / LOST |
| `emd_required` | Check | |
| `pbg_required` | Check | |
| `linked_project` | Link → Project | Set when WON |
| `created_by` | Link → User | Auto |
| `created_at` | Datetime | Auto |

### Step 4: Workflow Configure Karo

Frappe mein **Workflow** tab se:
1. Tender Document Workflow: `DRAFT → SUBMITTED → APPROVED → WON/LOST`
2. Indent → PO Workflow: `DRAFT → PENDING APPROVAL → APPROVED → PO CREATED`
3. Invoice Workflow: `DRAFT → SUBMITTED → PAYMENT RECEIVED`

### Step 5: Role Permissions Set Karo

Frappe mein **Role Permission Manager:**
- Presales → Tender (Read + Write + Create)
- Purchase → Indent, PO (Read + Write + Submit)
- Accounts → Invoice, Payment (Read + Write)
- Top Management → All (Read only)

### Step 6: Custom Dashboards

Frappe **Dashboard Builder** se:
- Project Head Dashboard: pending indents, milestone billing, payment pending
- Presales Dashboard: active tenders, submission deadlines, EMD/PBG expiry
- Procurement Dashboard: comparison sheets, PO approval queue, delivery tracking
- Stores Dashboard: GRN queue, stock position, dispatch

---

## 📅 Recommended Build Sequence (Phase 1 — 20 Weeks)

```
Week 1-2:   Setup + Foundation
            → ERPNext install, Custom App create
            → Org, Branch, Department, User, Role DocTypes
            → Approval Workflow engine setup

Week 3-4:   Tendering Module
            → Tender DocType + compliance checklist
            → EMD/PBG tracker
            → Clarification tracker
            → Survey DocType

Week 5-6:   BOQ & Costing Module
            → Item Master, BOQ, BOQ Lines
            → Cost Sheet, Cost Lines
            → BOQ versioning + approval workflow

Week 7-8:   Procurement Module
            → Vendor (Party) master
            → Indent + Indent Lines
            → RFQ, Vendor Quotations
            → Comparison Sheet generator
            → Purchase Order + PO Lines + Revisions

Week 9-10:  Stores & Inventory
            → Store master, GRN, GRN Lines
            → Serial Number tracking
            → Dispatch Challan
            → Stock Ledger (ledger-based movements)
            → Negative stock prevention

Week 11-12: Project Execution
            → Project Types + Templates
            → Projects, Sites
            → Milestones, Tasks
            → Dependency Engine (blocker logic)
            → Dependency Overrides + Audit

Week 13:    DPR (Daily Progress Reports)
            → DPR form with photo upload
            → One DPR per site per day validation

Week 14:    Engineering & Design
            → Drawing tracker with revisions
            → Deviation log, Change request tracker

Week 15:    Network & Commissioning
            → Device register + Serial linking
            → IP Pool + IP Allocation
            → Commissioning Checklist (template-based)
            → Test report upload + Client signoff

Week 16:    Billing & Accounts
            → Invoice (Milestone/RA/O&M)
            → Payment Receipts
            → Retention Ledger
            → Penalty Deductions

Week 17:    O&M + Ticketing
            → Ticket management
            → SLA Timer (24x7) with pause/resume
            → SLA Penalty Rules + Records
            → RMA Tracker

Week 18:    DMS (Document Management)
            → File uploads, Document Types
            → Document versioning
            → Expiry tracking + alerts
            → Document approval workflow

Week 19:    Alerts & Notifications
            → Alert Rules configuration
            → In-app + Email notification logs
            → Escalation chains

Week 20:    Dashboards + Testing
            → Role-specific dashboards
            → Reports and Analytics
            → User Acceptance Testing (UAT)
            → Bug fixes + Go-Live
```

---

## 🎯 Cross-cutting Requirements (Har Jagah Apply Hota Hai)

### 1. Audit Trail (Every entity mein mandatory)
```
created_by, created_at
updated_by, updated_at
status + status_history
```
**Approval workflow support karo for:**
Tender, Costing, Indent, PO, GRN/Stock movements, Invoices, Documents, Commissioning

### 2. Document Management System (DMS) — Phase 1 mandatory
- Documents link karo: Tender / Project / Site / PO / GRN / Commissioning
- Manual versioning: v1, v2, v3...
- Expiry tracking: Insurance, Warranty certificates, BG expiry
- Old versions: only Dept Head delete kar sakta hai (audited)

### 3. Dashboards — Role-wise

| Role | Dashboard Items |
|------|----------------|
| **Project Head** | Indents pending, milestone billing upcoming, payment pending, SLA risk, red flags |
| **Presales** | Active tenders, submission deadlines, BOQ readiness, survey status, compliance, EMD/PBG tracker |
| **Procurement** | Indents, comparison sheets, 3-quote compliance, PO approval queue, delivery tracking, advance + PDC requirements |
| **Stores** | GRN queue, dispatch, stock position, aging, consumption (project + site wise) |
| **Execution** | Timeline vs actual, DPR, site photos, dependencies, manpower deployed |
| **Accounts** | Billing tracker, payment aging, retention, GST/TDS, penalty deductions |
| **O&M** | Ticket queue, SLA timer, RMA tracker |

---

## 💡 Key Business Rules (Important!)

1. **Survey before BOQ:** Survey "COMPLETED" hone ke baad hi BOQ approval allowed
2. **Tender → Project:** Sirf "WON" tenders project ban sakte hain
3. **3-Quotation Rule:** Procurement mein minimum 3 vendor quotes mandatory (exception = approval required)
4. **No Negative Stock:** Inventory mein negative stock kabhi nahi hoga
5. **Serial Tracking:** IP devices (cameras, servers) = mandatory serial number tracking
6. **Dependency Engine:** Task start nahi hoga jab tak prerequisites complete na hon
7. **Override with Audit:** Dependency override sirf Dept Head+ kar sakta hai + written justification mandatory
8. **6.Invoicing before Milestone:** Allowed hai lekin flag aur audit entry mandatory hai
9. **Approved Records:** Only Superadmin/Dept Head edit kar sakte hain + audit entry mandatory
10. **SLA Timer:** 24×7×365, pause/resume role-restricted

---

## 🛠️ Tech Stack Summary

```
Framework:          ERPNext v14+ (Frappe Framework)
Backend Language:   Python 3.10+
Database:           MariaDB 10.6+ (ERPNext default)
Frontend:           Vue.js + Frappe Desk UI
File Storage:       Frappe File System (local or S3)
Task Queue:         Redis + RQ (Frappe built-in)
Notifications:      Frappe Email + In-app Notifications
Deployment:         Docker / Ubuntu Server / ERPNext Cloud
Version Control:    Git (separate repo for custom app)
```

---

## 📋 Summary — Ek Line Mein

> **Tu ek Govt Project specific ERP bana raha hai jisme Tender se leke Commissioning aur O&M Ticketing tak ka poora lifecycle cover hoga — ERPNext framework par custom DocTypes aur Workflows use karke, primarily apni company ke CCTV / erp / Surveillance government projects manage karne ke liye.**

---

## 📌 Next Steps (Kya Karna Hai Abhi)

- [ ] **Step 1:** Docker install karo + ERPNext setup karo locally
- [ ] **Step 2:** Custom Frappe app create karo: `govt_project_erp`
- [ ] **Step 3:** Foundation DocTypes banao: Org, Branch, User, Role
- [ ] **Step 4:** Tender Module se start karo (sabse pehla module)
- [ ] **Step 5:** Workflow engine configure karo for Tender approval

---

*Document generated from analysis of all 18 files in `d:\erp\`*  
*Primary source: `frs and db schema fields.docx` (Phase 1 FRS)*
