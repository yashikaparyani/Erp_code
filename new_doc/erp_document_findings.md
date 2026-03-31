# ERP Document Findings From `new_doc`

Prepared on: 2026-03-30  
Source folder: `Erp_code/new_doc`

## Important Note

- The Python environment was repaired first. The project `.venv` was retargeted to a workspace-local Python runtime at `D:\erp final\python313`, and PDF extraction libraries were installed there.
- 4 of the 5 PDFs had extractable text.
- `Go Live certificate Nava Raipur.pdf` is image-based, so its findings below are based on visual inspection of rendered pages.
- `Agreement Naya Raypur.pdf` is a scanned document with noisy OCR, so a few fields are marked as "best-effort" where the scan quality is weak.

## Files Reviewed

1. `8165516850284535216_93441_01 NRANSCCL F-1.pdf`
2. `Agreement Naya Raypur.pdf`
3. `FINANCIAL BOQ RAIPUR.pdf`
4. `Go Live certificate Nava Raipur.pdf`
5. `SLA RAIPUR PROJECT.pdf`

## Executive Summary

These five documents together describe one government smart-city contract for Nava Raipur Atal Nagar covering design, development, implementation, integration, go-live, and 3 years of O&M for digital city platform expansion modules.

The document set is strong enough to drive ERP master and transactional loading for:

- customer and project master
- contract and work order master
- milestone schedule
- BOQ item master
- contract value and commercial schedule
- performance guarantee / bank guarantee records
- manpower obligations
- SLA and penalty matrix
- go-live / physical completion / O&M commencement events

The biggest ERP-relevant conclusion is this:

- Physical completion for Go-Live was initially targeted for `31/01/2023`
- actual Go-Live services approval was granted on `31/03/2025`
- O&M should be treated as starting from `01/04/2025`
- first SLA holiday period after Go-Live is approved from `01/04/2025` to `30/06/2025`
- implementation phase is declared complete through Go-Live letter

## Core Contract Identity

- Employer: `Nava Raipur Atal Nagar Smart City Corporation Limited (NRANSCCL)`
- Location: `Nava Raipur Atal Nagar, Dist. Raipur, Chhattisgarh`
- Contractor / SI: `M/s Technosys Security Systems Private Limited`
- Contractor registered office captured in documents: `7047/4, Rameshwari Nehru Nagar, New Delhi-110005`
- Project name: `Design, Development, Implementation, Comprehensive Operation and Maintenance of Digital City Platform – Rollout of Additional Modules and allied works in Nava Raipur Atal Nagar, Dist. - Raipur (CG)`
- Tender issuing authority: `Managing Director, NRANSCCL`
- Engineer in charge named in tender: `Mr. Pradip Mishra`, `Manager in Charge (Electrical)`
- Engineer in charge contact extracted from tender:
  - Office phone: `0771-2211016`
  - Mobile: `8889633334`
  - Email: `aeit.nranvp@cg.gov.in`

## Key Reference Numbers And Dates

### Tender / NIT

- Tender document name: `NRANSCCL F-1`
- NIT number found prominently in tender: `21/ICCC/MD/NRANSCCL/2021-22`
- NIT date: `14.02.2022`
- Another tender reference appears in forms: `20/ICCC/MD/NRANSCCL/2021-22` dated `09.02.2022`
- Action for ERP: treat `21/ICCC/MD/NRANSCCL/2021-22` as primary tender reference and keep `20/...` as related/secondary reference until verified against original hard copy.

### Award / Agreement / Go-Live

- Letter of Acceptance / work order reference date in agreement text: `31/03/2022`
- Agreement date: `20/04/2022`
- Go-Live letter number visible on certificate: `Digital City/MD/NRANSCCL/2025-26` with handwritten number prefix that appears to be `310` or `316` and should be manually verified from original scan
- Go-Live letter date visible on certificate: `03/06/2025`
- Previous office letter granting final EOT referenced in certificate: `letter no. 287 dated 14/05/2025`

## Tender-Level Commercial Facts

- Estimated cost / PAC in tender: `Rs. 47.53 Crores`
- EMD stated in tender: `Rs. 47,53,000.00`
- Time allowed for execution / Go-Live from work order: `9 months`
- O&M duration after completion / Go-Live: `3 years`
- Defect liability period in Schedule-F: `36 months (after issue of Go-Live certificate)`

## Agreement Findings

### Parties

- Agreement between:
  - `Nava Raipur Atal Nagar Smart City Corporation Limited`
  - `M/s Technosys Security Systems Pvt. Ltd.`

### Agreement date

- The rendered first page clearly shows: `THIS AGREEMENT made the 20th April 2022`

### Linked contract references

- Letter of Acceptance cum Work Order date captured in agreement body: `31/03/2022`
- Agreement says the contract documents include:
  - letter of acceptance / work order
  - tender
  - addendum if any
  - special conditions of contract
  - general conditions of contract
  - specifications
  - drawings
  - submitted financial bid
  - completed schedules

### Security / guarantee information

Best-effort OCR plus visual review shows:

- Performance Guarantee: approximately `Rs. 1,61,77,652`
- Performance Guarantee instrument: `BG No. 062GT02221094001`
- Performance Guarantee date: `19/04/2022`
- Issuing bank: `HDFC Bank`
- Additional Performance Guarantee: `Rs. 3,80,24,857`
- Additional Performance Guarantee instrument: `BG No. 004401000A2986`
- Additional Performance Guarantee date: `16/04/2022`
- Issuing bank: `Axis Bank`
- Additional guarantee branch visible in OCR / visual context: `Bhopal`

### Jurisdiction

- Disputes appear to be subject to `Raipur` jurisdiction.

### ERP loading impact

Agreement should drive these ERP records:

- contract master
- linked tender reference
- agreement execution date
- bank guarantee register
- performance security obligations
- legal jurisdiction field

## Financial BOQ Findings

## BOQ Overview

- Vendor header: `Technosys Security Systems (P) Limited (TSSPL)`
- BOQ contains `110` line items extracted
- Final total line shows two totals:
  - likely SOR/benchmark total: `Rs. 15,77,18,944.60`
  - quoted / financial bid total: `Rs. 32,35,53,038.71`

### Practical interpretation for ERP

- Use `Rs. 32,35,53,038.71` as the active commercial contract/BOQ amount unless another signed comparative statement says otherwise.
- Preserve `Rs. 15,77,18,944.60` separately as a reference / benchmark / SOR-derived total, not as the contract booking value.

## BOQ Category-Level Value Summary

These totals are derived from the extracted BOQ line items:

| Group | Item Range | Derived Total |
| --- | --- | --- |
| Surveillance / ANPR / ICCC | NS1-NS21 | Rs. 7,56,67,138.32 |
| Network / EMS / HIPS / Fiber | NS22-NS43 | Rs. 5,69,82,135.44 |
| ATCS / RLVD / Pelican | NS44-NS69 | Rs. 5,30,49,431.45 |
| Public Address + Environmental | NS70-NS73 | Rs. 1,24,45,750.51 |
| Health ATM / Kiosk + Integrations | NS74-NS77 | Rs. 6,02,75,449.43 |
| O&M manpower / support / services | NS78-NS110 | Rs. 6,51,33,133.56 |
| Total | NS1-NS110 | Rs. 32,35,53,038.71 |

## Highest-Value BOQ Items

These are the largest extracted commercial lines and should be treated as critical ERP cost objects:

1. `NS77` Integration of new systems with existing ICCC applications: `Rs. 5,03,42,813.07`
2. `NS23` Additional licenses of existing Enterprise Monitoring System: `Rs. 1,51,02,843.56`
3. `NS59` RLVD / no-helmet / triple-riding detection with perpetual license: `Rs. 1,37,60,369.06`
4. `NS18` Server blade chassis: `Rs. 1,33,18,825.04`
5. `NS19` SAN storage primary: `Rs. 1,17,46,656.11`
6. `NS20` SAN storage secondary: `Rs. 1,17,46,656.11`
7. `NS58` RLVD system hardware set: `Rs. 1,05,39,096.96`
8. `NS110` Paramedical staff for health kiosk / ATM: `Rs. 92,67,436.80`
9. `NS25` Additional HIPS licenses: `Rs. 83,90,468.65`
10. `NS71` IP-based public address system application: `Rs. 75,59,812.65`

## BOQ Scope Signals By Module

Major functional clusters visible in BOQ:

- Surveillance cameras
- IR illuminators
- PTZ cameras
- BRTS bus shelter cameras
- camera poles and civil foundations
- UPS and junction boxes
- VMS and video analytics licenses
- ANPR cameras
- servers and SAN storage
- enterprise monitoring system licenses
- HIPS licenses
- workstation and UPS for network management
- optical fiber, ducts, closures, manholes, LIU/FDMS
- edge switches and SFP modules
- ATCS field devices
- RLVD hardware and detection software
- pedestrian pelican signaling
- IP public address system
- environmental sensors and sensor software
- health ATM / kiosk setup
- citizen kiosks
- digital kiosk software and customization
- integration of all new systems with existing ICCC applications
- O&M, cloud hosting, software services, teleconsultation, warranty, and manpower

## O&M-Related BOQ Lines

The BOQ is not only capex. It clearly includes recurring / service-oriented items:

- NS78-NS90: O&M / AMC / hosting / software services / teleconsultation / warranty / integration support
- NS91-NS97: implementation-phase manpower up to Go-Live
- NS98-NS110: post-Go-Live manpower during O&M

This means ERP must support both:

- itemized implementation procurement/capex tracking
- long-duration service/O&M billing and cost tracking

## Tender Milestones And Time Structure

### High-level time rules

- Start / commencement: `7 days from LOA or date of work order whichever is later`
- Date of start reckoning in Schedule-F: `15 days from letter of acceptance`
- Physical completion and commissioning target: `9 months from work order`
- Operation and maintenance period: `36 months`

### Milestone withholding table from Schedule-F

| Phase | Timeline from start | % work completion | Minimum withholding if not achieved |
| --- | --- | --- | --- |
| 1 | 2 months | 10% | Rs. 10,00,000 |
| 2 | 4 months | 30% | Rs. 10,00,000 |
| 3 | 6 months | 50% | Rs. 10,00,000 |
| 4 | 8 months | 75% | Rs. 10,00,000 |
| 5 | 9 months | 100% | Rs. 10,00,000 |

### Detailed milestone structure from scope section

The tender also defines:

- `M1 Project Kickoff` at `T + 7 days`
- `M2.1 Site Assessment and Survey / Mobilisation`
- `M2.2 Requirement Phase Completion`
- `M2.3 Design completion + delivery/receipt of hardware and software at site`
- Additional milestone breakdown continues up to `M2.7`

### ERP loading impact

ERP should support:

- milestone master
- planned vs actual milestone dates
- milestone-linked withholding / retention rules
- milestone completion evidence attachment
- milestone-based invoicing/release logic

## Manpower Obligations

### Minimum roles seen in tender / SLA

- Project Manager
- Solution Architect cum Integration expert
- ITMS & Surveillance Expert and Site Manager
- IOT and ICCC expert
- Network and Security Expert
- Database Architect / DBA
- Data Centre Expert
- Technical Support / NOC
- Helpdesk Operator
- ITMS/CCTV Operator
- Field Support Staff
- Paramedical Staff

### Minimum deployment signals extracted

- Project Manager: implementation `100%`, O&M `100%`
- Solution Architect cum Integration expert: implementation `100%`, O&M `on need basis`
- ITMS & Surveillance Expert / Site Manager: implementation `100%`, O&M `on need basis`
- IOT and ICCC expert: implementation `100%`, O&M `on need basis`
- Network and Security Expert: implementation `100%`, O&M `on need basis`
- Database Architect / DBA: implementation `100%`, O&M `on need basis`
- Data Centre Expert: implementation `100%`, O&M `on need basis`
- Technical Support / NOC: O&M `100%`
- Helpdesk Operator: O&M `100%`
- ITMS/CCTV Operator: O&M `100%`
- Field Support Staff: O&M `100%`
- Paramedical Staff: O&M `100%`

### ERP loading impact

ERP should maintain:

- manpower role master
- approved deployment count
- planned start/end dates
- implementation vs O&M assignment category
- attendance / availability / replacement tracking

## SLA Findings

The standalone SLA PDF and the tender SLA section are consistent and rich enough to configure an ERP-side SLA engine or at least a penalty register.

### Category I: Manpower

Monthly penalty for delay in deployment:

- Project Manager: `Rs. 2,00,000`
- Solution Architect cum integration expert: `Rs. 1,00,000`
- ITMS & Surveillance Expert and Site Manager: `Rs. 1,00,000`
- IOT and ICCC expert: `Rs. 1,00,000`
- Network and Security Expert: `Rs. 1,00,000`
- Database Architect / DBA: `Rs. 1,00,000`
- Data Centre Expert: `Rs. 1,00,000`
- Technical Support Staff: `Rs. 50,000`
- Field Support Staff: `Rs. 50,000`
- Helpdesk Operators: `Rs. 50,000`
- ITMS/CCTV Operator: `Rs. 50,000`
- Paramedical Staff: `Rs. 50,000`

Other manpower penalties:

- non-availability on working days without approval: `Rs. 10,000 per resource per day`
- replacement of key resource without authority request: `Rs. 1,00,000 per replacement`

### Category II: Key Milestones

- penalty for delay: `0.5% of contract value per week or part thereof`
- if `M2.7` is delayed beyond `12 weeks` due to SI, NRANSCCL may invoke termination

### Category III: Device Uptime

- target: `>= 98%`
- penalty below target: `0.1% of quarterly O&M payment per device for every 1% drop or part thereof`

### Category IV: Software

Application availability:

- target: `>= 98%`
- penalty below target: `0.5% of quarterly O&M payment per application for every 1% drop or part thereof`

Application performance:

- target response time baseline: `5 seconds`
- `>= 99%` within target: no penalty
- `<99% and >=95%`: `0.05% of quarterly O&M payment per application`
- `<95%`: `0.1% of quarterly O&M payment per application`

### Category V: Helpdesk

Incident response:

- `95%` of tickets must be responded to within `30 minutes`
- below target: `1% of quarterly O&M payment per one-percentage drop below 95%`

Incident resolution:

- Severity 1: `<= 8 hours`; beyond that `0.1% of quarterly O&M payment` per `30 minutes` delay
- Severity 2: `<= 16 hours`; beyond that `0.05% of quarterly O&M payment` per `2 hours` delay

Re-opened incidents:

- explicitly tracked in SLA as a penalty category

### Category VI: Security

- security breach / data theft penalties captured
- severity-based penalties:
  - Severity 1: `Rs. 15 Lakh per incident`
  - Severity 2: `Rs. 10 Lakh per incident`
  - Severity 3: `Rs. 5 Lakh per incident`
- serious breach may trigger contract termination

### ERP loading impact

ERP should support:

- SLA category master
- service level target master
- penalty formula master
- incident / uptime / availability event logging
- quarterly O&M deduction computation
- breach register and deduction notes

## Go-Live Certificate Findings

Based on visual inspection of the rendered pages:

- Issuer: `Nava Raipur Atal Nagar Smart City Corporation Limited`
- Addressee: `Authorized Signatory, M/s Technosys Security Systems Private Limited`
- Subject confirms same project scope as tender/agreement
- Ref. 1: LOA / work order reference for `350/Digital City/MD/NRANSCCL/2021-22`, dated `31/03/2022`
- Ref. 2: Contract agreement reference, appears to be `01/43/Digital City/MD/NRANSCCL/Smart city/2022-23 dated 20/04/2022`
- Ref. 3: Vendor request letter `TISPL/NRANSCCL/24-25/March/02 dated 15/03/2025`

### Operational meaning of Go-Live letter

- physical completion for Go-Live of services was stipulated as `14/01/2023`
- completion time was provisionally extended multiple times
- final EOT for completion of Go-Live services was granted till `31/03/2025`
- recent deliverables were approved and date of `Go-Live of services` was approved as `31 March 2025`
- `O&M shall be reckoned as 1st April 2025`
- for project closure purposes, implementation phase `(M2.1 to M2.7)` is declared complete

### SLA holiday

- First SLA holiday after Go-Live approved for first `3 months` of O&M
- period: `01.04.2025 to 30.06.2025`
- reason stated: stabilization of newly integrated ICCC platform took time

### Post-Go-Live obligations still open as per certificate

Vendor was directed to ensure:

1. pending in-scope work completion as per agreement / MOMs
2. submission of names of O&M resources with qualification proof
3. availability of tools and plants at site during O&M
4. regular preventive maintenance and operational reports on monthly basis
5. preventive maintenance like cleaning/dusting and ensuring device accessibility
6. closure of observations/comments from NRANSCCL/PMC based on UAT and MOMs
7. compliance with previous conditional approvals

### ERP loading impact

This letter should create or update:

- actual Go-Live date
- actual implementation completion date
- O&M start date
- SLA holiday period
- open punch-list / conditional closure tasks

## Data Retention / Compliance Signals

Tender text includes useful operational compliance fields that can later map into ERP or DMS checklists:

- surveillance data retention: `30 days`
- ITMS-related data retention includes `365 days` for violation data in some cases
- database backup retention: `30 days`
- helpdesk should support incident, problem, SLA tracking
- SLA and contract management solution should centrally calculate penalties
- data confidentiality, integrity, and availability requirements are explicitly stated, especially for health kiosk data

## What Can Be Loaded Into ERP Immediately

These records are mature enough to load now:

- organization/customer: `NRANSCCL`
- project: Nava Raipur digital city platform additional modules
- contractor/vendor: `Technosys Security Systems Pvt. Ltd.`
- tender record
- agreement record
- work order / LOA reference
- project dates:
  - LOA/work order date `31/03/2022`
  - agreement date `20/04/2022`
  - Go-Live approved date `31/03/2025`
  - O&M start `01/04/2025`
  - SLA holiday `01/04/2025` to `30/06/2025`
- contract amounts:
  - PAC `Rs. 47.53 Cr`
  - BOQ quoted total `Rs. 32,35,53,038.71`
- bank guarantees:
  - performance guarantee
  - additional performance guarantee
- BOQ item master from `NS1` to `NS110`
- manpower role master
- SLA category and penalty matrix

## Fields That Need Manual Verification Before Final Production Load

- exact LOA / work order number format
- exact Go-Live letter number prefix handwritten on certificate
- exact performance guarantee amount first OCR digit group: visually very close to `Rs. 1,61,77,652`
- exact first BG number characters in agreement
- whether `20/ICCC/...` or `21/ICCC/...` is the final authoritative tender reference in signed award package
- whether BOQ amount `Rs. 32,35,53,038.71` is tax-inclusive or exclusive in the final signed commercial approval sheet

## Recommended ERP Data Model Mapping

### Masters

- Customer / Department Master
- Project Master
- Contract Master
- Tender Master
- BOQ Item Master
- Milestone Master
- SLA Category Master
- Penalty Rule Master
- Manpower Role Master
- Asset / Module Master
- Bank Guarantee Master

### Transactions / operational records

- contract award / agreement execution
- milestone baseline and actual completion
- BOQ loading and budget allocation
- implementation manpower deployment
- O&M manpower deployment
- Go-Live event
- SLA holiday event
- monthly preventive maintenance logs
- helpdesk incidents
- uptime / downtime events
- SLA penalty deductions
- bank guarantee issuance / validity / release

## Recommended Loading Sequence

1. Load parties, project, contract, tender, and site masters.
2. Load BOQ item master `NS1-NS110` with grouped module tags.
3. Load commercial header amounts and bank guarantee records.
4. Load milestone baseline and implementation timeline.
5. Load manpower role obligations and O&M staffing plan.
6. Load SLA definitions and penalty formulae.
7. Load actual project events: agreement, Go-Live, O&M start, SLA holiday.
8. Load open action items from the Go-Live conditional closure list.

## What Should Be Our Last Task

The last task should **not** be raw data entry.  
The last task should be:

- a **full ERP reconciliation and dry-run validation** before final production posting

That last task should verify:

- BOQ total in ERP equals `Rs. 32,35,53,038.71`
- milestone dates are logically consistent with LOA, agreement, Go-Live, and O&M dates
- O&M starts on `01/04/2025`, not on LOA date
- SLA deductions do not start before `01/07/2025` because of the approved SLA holiday
- manpower roles and counts match tender and BOQ obligations
- BG records have correct issue dates, values, and release conditions
- all high-value modules are mapped to correct ERP cost heads / service heads
- scanned / uncertain fields are manually approved before final lock

## Final Recommendation

Use this document set to build one unified ERP package with:

- one project header
- one contract/agreement header
- one itemized BOQ import
- one milestone import
- one manpower/SLA import
- one go-live/O&M transition record

Before production loading, manually validate the few scan-sensitive identifiers, then run one end-to-end import rehearsal and reconciliation report. That rehearsal is the safest final gate before the real ERP load.
