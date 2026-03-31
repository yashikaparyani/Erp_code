# ERP Loading Issues And Suggested Solutions

Prepared on: 2026-03-30  
Context: Loading data from the 5 documents in `Erp_code/new_doc` into the current ERP codebase

## Purpose

This document lists the practical issues you are likely to face while loading the extracted tender, agreement, BOQ, milestone, manpower, guarantee, go-live, and SLA data into the ERP.

For each issue, this file includes:

- what the issue is
- why it matters during loading
- suggested solution
- whether the change is needed in `Frontend`, `Backend`, or `Both`

---

## 1. Milestone Importer Writes Wrong Status Values And Wrong Field Names

### Finding

The milestone importer currently maps statuses like:

- `NOT_STARTED`
- `DELAYED`

But the `GE Milestone` doctype only supports:

- `PLANNED`
- `IN_PROGRESS`
- `BLOCKED`
- `COMPLETED`
- `CANCELLED`

Also, the importer writes to fields:

- `planned_start`
- `planned_end`
- `actual_start`
- `actual_end`

But the real doctype fields are:

- `planned_start_date`
- `planned_end_date`
- `actual_start_date`
- `actual_end_date`

### Why This Will Cause Problems

- milestone imports may fail validation
- milestone dates may not actually save
- planned vs actual project timeline will become unreliable
- Go-Live and implementation completion history may be wrong in ERP

### Suggested Solution

- fix the importer status mapping:
  - `NOT STARTED` -> `PLANNED`
  - `DELAYED` -> `BLOCKED` or introduce a new valid status if the business really needs delay tracking
- update importer field assignment to use the real date fields:
  - `planned_start_date`
  - `planned_end_date`
  - `actual_start_date`
  - `actual_end_date`
- optionally add a `delay_reason` or `delay_flag` field if delayed milestones must be tracked separately

### Change Area

- `Backend`

### Relevant Files

- [milestones_phases.py](D:\erp final\Erp_code\backend\gov_erp\gov_erp\importers\anda\milestones_phases.py)
- [ge_milestone.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_milestone\ge_milestone.json)

---

## 2. Tender-To-Project Conversion Uses Today’s Date Instead Of Actual Historical Start Date

### Finding

When a tender is converted to a project, the project is created with:

- `expected_start_date = today()`

instead of using the actual contract timeline from the documents.

### Why This Will Cause Problems

- project history becomes inaccurate
- milestone planning and lateness calculations become misleading
- billing, O&M, SLA, and closure reporting can drift from actual contract dates

### Suggested Solution

- update conversion logic to accept historical date inputs:
  - LOA / work order date
  - agreement date
  - expected start date
  - go-live target date
- if conversion is done after result loading, derive the project start from:
  - work order date first
  - else contract date
  - else manual project start
- add a protected override path for historical imports

### Change Area

- `Backend`

### Relevant Files

- [ge_tender.py](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_tender\ge_tender.py)

---

## 3. BOQ Approval Is Blocked Unless Surveys Exist And Are Completed

### Finding

The BOQ flow enforces a survey gate before status can move to approval.

### Why This Will Cause Problems

- historical document loading may get blocked even when BOQ data is already final
- legacy projects may not have survey data in ERP yet
- commercial onboarding becomes dependent on unrelated operational records

### Suggested Solution

- keep the survey gate for live operational tenders
- add a controlled `historical_import_mode` or `bypass_survey_gate` option for authorized imports
- log such bypasses in import audit records
- optionally require a manual approval note when bypass is used

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- admin/import UI should expose a safe historical import toggle only to privileged users

### Relevant Files

- [ge_boq.py](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_boq\ge_boq.py)
- [test_boq_logic.py](D:\erp final\Erp_code\backend\gov_erp\gov_erp\tests\test_boq_logic.py)

---

## 4. Current BOQ Structure Is Too Thin For The Document Set

### Finding

Current BOQ item fields only store:

- description
- qty
- unit
- rate
- amount
- make
- model

But the documents contain more structure:

- BOQ code like `NS1` to `NS110`
- SOR/base rate
- quoted rate
- grouped modules
- capex vs O&M distinction
- implementation vs service lines
- integration-heavy items
- major category totals

### Why This Will Cause Problems

- important commercial meaning gets lost
- O&M items and implementation items cannot be separated properly
- it will be hard to report by module
- reconciliation with source BOQ becomes difficult

### Suggested Solution

- extend `GE BOQ Item` with fields like:
  - `boq_code`
  - `source_group`
  - `module_name`
  - `line_type` (`CAPEX`, `OPEX`, `SERVICE`, `INTEGRATION`, `MANPOWER`)
  - `sor_rate`
  - `quoted_rate`
  - `source_total`
  - `is_om_item`
  - `is_manpower_item`
  - `source_sequence`
- keep ERP-calculated amount, but also preserve original document values
- add group-wise reporting support

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- BOQ form/list should display new grouping and type fields
- users should be able to filter capex vs O&M vs manpower

### Relevant Files

- [ge_boq.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_boq\ge_boq.json)
- [ge_boq_item.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_boq_item\ge_boq_item.json)

---

## 5. Tender Master Cannot Represent Full Contract Lifecycle

### Finding

The tender doctype does not have dedicated fields for:

- LOA/work order date
- agreement date
- actual Go-Live date
- O&M start date
- SLA holiday start/end
- implementation completion date
- awarded contract value as distinct from estimated value

### Why This Will Cause Problems

- core project history will be split across notes or external files
- users cannot reliably see project state from one record
- downstream reports will not know when O&M actually starts
- SLA logic may start too early

### Suggested Solution

- extend `GE Tender` or create a linked `GE Contract / GE Award` doctype with fields for:
  - `loa_date`
  - `work_order_no`
  - `agreement_date`
  - `awarded_value`
  - `go_live_date`
  - `om_start_date`
  - `sla_holiday_from`
  - `sla_holiday_to`
  - `implementation_completion_date`
  - `physical_completion_date`
- separate `estimated_value` from `awarded_value`

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- tender/project detail screen should show lifecycle timeline clearly

### Relevant Files

- [ge_tender.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_tender\ge_tender.json)
- [ge_tender_result.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_tender_result\ge_tender_result.json)

---

## 6. SLA Model Is Too Simple For This Contract

### Finding

The current SLA model mainly supports:

- response time
- resolution time
- time slab penalties

But the documents require handling of:

- manpower penalties
- milestone delay penalties
- device uptime penalties
- application availability penalties
- application performance penalties
- helpdesk response and resolution penalties
- reopened incident logic
- security breach penalties
- quarterly O&M-linked percentage deductions
- SLA holiday period

### Why This Will Cause Problems

- most contractual SLA rules cannot be loaded natively
- penalties will be tracked outside ERP or manually
- SLA audit trail will be incomplete

### Suggested Solution

- expand SLA design to support multiple SLA categories:
  - `MANPOWER`
  - `MILESTONE`
  - `DEVICE_UPTIME`
  - `APPLICATION_AVAILABILITY`
  - `APPLICATION_PERFORMANCE`
  - `HELPDESK_RESPONSE`
  - `HELPDESK_RESOLUTION`
  - `SECURITY_BREACH`
- extend penalty rules with:
  - `calculation_basis`
  - `linked_financial_base`
  - `penalty_scope`
  - `unit_of_measure`
  - `per_device`
  - `per_application`
  - `per_incident`
  - `per_week`
  - `per_percentage_drop`
- add support for SLA holiday windows
- allow linking SLA rules to O&M billing base values

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- SLA screens need category-aware configuration
- users need a readable matrix view of penalty rules

### Relevant Files

- [ge_sla_profile.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_sla_profile\ge_sla_profile.json)
- [ge_sla_penalty_rule.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_sla_penalty_rule\ge_sla_penalty_rule.json)

---

## 7. Staffing Model Expects Named Employees, But Source Documents Mostly Define Roles And Counts

### Finding

The documents define mandatory positions and deployment counts, but not always actual employee identities.

Also, the staffing role options are too limited for this project.

### Why This Will Cause Problems

- you cannot fully load staffing obligations at contract stage
- required roles may collapse into `Other`
- contract manpower requirement and actual staffing assignment are mixed together

### Suggested Solution

- separate two concepts:
  - `Contractual Staffing Requirement`
  - `Actual Staffing Assignment`
- create a new doctype like `GE Project Staffing Requirement` with fields:
  - `linked_project`
  - `role_name`
  - `required_count`
  - `phase` (`IMPLEMENTATION`, `OM`)
  - `deployment_type`
  - `minimum_qualification`
  - `required_from`
  - `required_to`
- keep `GE Project Staffing Assignment` for actual named staff
- expand role list to include all contract roles

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- project staffing view should show required vs filled roles

### Relevant Files

- [project_manpower_assignment.py](D:\erp final\Erp_code\backend\gov_erp\gov_erp\importers\anda\project_manpower_assignment.py)
- [ge_project_staffing_assignment.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_project_staffing_assignment\ge_project_staffing_assignment.json)

---

## 8. EMD/PBG Instrument Model Is Too Narrow For Performance Security Data

### Finding

The instrument doctype supports only:

- `EMD`
- `PBG`

But your documents include:

- performance guarantee
- additional performance guarantee
- agreement-linked guarantee context
- release conditions based on contract / go-live / defect liability

### Why This Will Cause Problems

- additional performance guarantee cannot be categorized properly
- relationship to agreement and release condition is weak
- BG tracking will be incomplete for finance/legal teams

### Suggested Solution

- extend instrument type options:
  - `EMD`
  - `PBG`
  - `ADDITIONAL_PBG`
  - `SECURITY_DEPOSIT`
  - `RETENTION_BG`
- add fields:
  - `linked_project`
  - `linked_agreement_no`
  - `branch_name`
  - `issuing_city`
  - `release_condition`
  - `source_document_reference`
  - `beneficiary_name`

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- BG/instrument screen should show status timeline and release conditions

### Relevant Files

- [ge_emd_pbg_instrument.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_emd_pbg_instrument\ge_emd_pbg_instrument.json)

---

## 9. Master Data Dependencies Can Block Loading

### Finding

The import pipeline expects master data readiness before transactional import:

- departments
- designations
- projects
- sites
- suppliers
- users/roles in some workflows

### Why This Will Cause Problems

- imports will fail on unresolved references
- historical data load may stop midway
- naming mismatches will create duplicates or rejects

### Suggested Solution

- create a dedicated pre-load step for this project:
  - create client
  - create vendor
  - create tender
  - create project
  - create site records
  - load required departments/designations
- create a normalization layer for:
  - project names
  - vendor names
  - site names
  - role labels
- build a preflight report before commit

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- import screen should show missing masters before actual import

### Relevant Files

- [master_loaders.py](D:\erp final\Erp_code\backend\gov_erp\gov_erp\importers\anda\master_loaders.py)

---

## 10. Client/Vendor/Organization Separation May Be Confusing During Load

### Finding

The current model uses:

- `GE Party`
- `GE Organization`
- ERPNext `Supplier`
- ERPNext `Project`

The same real-world entity can end up represented in multiple places:

- NRANSCCL as client
- Technosys as vendor
- possibly supplier
- possibly organization

### Why This Will Cause Problems

- duplicate entity creation
- reporting fragmentation
- broken links between tender, project, procurement, and commercial records

### Suggested Solution

- define a clear entity strategy before load:
  - `GE Party` for client and vendor relationship entities
  - `Supplier` only for procurement/payables vendor use
  - `GE Organization` only for internal org or structured external org if truly needed
- create deterministic matching rules:
  - exact normalized name
  - GST/PAN if available
  - type-aware uniqueness

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- creation forms should guide users on when to use Party vs Supplier vs Organization

### Relevant Files

- [ge_party.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_party\ge_party.json)
- [ge_organization.json](D:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_organization\ge_organization.json)

---

## 11. Source Documents Contain Scan-Sensitive And Ambiguous Fields

### Finding

Some fields extracted from scanned documents are not perfectly reliable, such as:

- exact BG number characters
- exact handwritten go-live letter number prefix
- one or two tender reference variants

### Why This Will Cause Problems

- legal/commercial references may be saved incorrectly
- future reconciliation with source scans becomes harder
- finance/legal audit risk increases

### Suggested Solution

- mark a set of fields as `manual verification required` before final commit
- use two-stage load:
  - `staged`
  - `verified/committed`
- attach the original source PDFs to ERP records
- keep source text and rendered image evidence with records where needed

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- import review screen should highlight uncertain fields for manual approval

---

## 12. Current ERP Has No Clear Historical Import Package For Tender + Contract + Go-Live + O&M Transition

### Finding

The current flows are more operational and stage-driven, but your data is document-driven and historical.

### Why This Will Cause Problems

- users may have to manually create many linked records in the correct order
- chances of partial/inconsistent loading increase
- project may look active in the wrong stage after import

### Suggested Solution

- create a project bootstrap importer for historical awarded contracts
- one backend command/import flow should:
  - create client/vendor
  - create tender
  - create tender result / work order stage
  - convert tender to project using historical dates
  - load BOQ
  - load milestones
  - create guarantees
  - create SLA profiles/rules
  - create go-live / O&M transition markers

### Change Area

- `Backend`
- `Frontend`

### Frontend Need

- add a “Historical Contract Import” flow with step-by-step validation

---

## Recommended Priority Order

### Priority 1: Must Fix Before Real Loading

1. milestone importer bug
2. historical project start date handling
3. BOQ survey gate bypass path for historical loading
4. tender lifecycle fields for go-live / O&M

### Priority 2: Strongly Recommended

5. richer BOQ item structure
6. richer guarantee structure
7. staffing requirement vs staffing assignment separation
8. entity/master normalization strategy

### Priority 3: Needed For Full Contract Control

9. richer SLA data model
10. historical import workflow with review screen
11. manual verification step for scan-sensitive fields

---

## Recommended Practical Approach

Instead of loading this document set directly into the current ERP as-is, the safer path is:

1. fix the broken milestone importer
2. add missing historical contract lifecycle fields
3. expand BOQ item structure enough to preserve source meaning
4. create a small historical import path for this project
5. run a dry-run import
6. manually verify ambiguous fields
7. commit only after reconciliation

---

## Conclusion

The main loading risk is not only document quality. The bigger issue is that some of the current ERP structures are still too operationally simple for a real contract packet like this one.

The best solution is a mixed approach:

- fix definite backend bugs
- extend the schema where contract history is missing
- add frontend review support where humans must confirm uncertain values

If we do that first, your load into ERP will be much safer and much more accurate.
