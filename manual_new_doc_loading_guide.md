# Manual Guide To Load `new_doc` Data Into This ERP Project

Prepared on: 2026-04-01  
Project folder: `d:\erp final\Erp_code`

## Goal

Is guide ka purpose yeh hai ki aap `new_doc` folder ke documents ko samajhkar unka data **manually** ERP mein load kar sako.

Yeh guide 3 cheezon ko combine karti hai:

1. `new_doc` ke PDFs aur extracted text ka analysis
2. current ERP codebase ka analysis
3. beginner-friendly manual loading order

Is guide ko follow karke aap data ko **one by one**, safe order mein load kar paoge.

---

## Sabse Pehle Big Picture Samjho

`new_doc` folder mein jo documents hain, woh mostly ek hi contract packet ko represent karte hain:

- customer / authority: `Nava Raipur Atal Nagar Smart City Corporation Limited (NRANSCCL)`
- vendor / contractor: `M/s Technosys Security Systems Pvt. Ltd.`
- project: Digital City Platform rollout of additional modules and allied works
- major records available:
  - tender details
  - agreement details
  - BOQ items
  - SLA rules
  - go-live approval
  - performance / additional bank guarantee details

Simple language mein:

- `GE Tender` mein contract header jaayega
- `Project` tender se create hoga
- `GE BOQ` mein commercial line items jaayenge
- `GE Milestone` mein timeline jaayegi
- `GE Project Staffing Requirement` mein manpower obligations jaayengi
- `GE EMD PBG Instrument` mein guarantees jaayengi
- `GE SLA Profile` aur `GE SLA Penalty Rule` mein SLA structure jaayega

---

## `new_doc` Se Kya-Kya Reliable Data Mila

### 1. Core identity

- Employer: `NRANSCCL`
- Vendor: `Technosys Security Systems Pvt. Ltd.`
- Agreement date: `20/04/2022`
- LOA / Work order date: `31/03/2022`
- Go-Live approved date: `31/03/2025`
- O&M start date: `01/04/2025`
- SLA holiday: `01/04/2025` to `30/06/2025`

### 2. Commercial values

- Estimated tender value / PAC: `Rs. 47.53 Crores`
- BOQ quoted total: `Rs. 32,35,53,038.71`
- BOQ SOR/reference total: `Rs. 15,77,18,944.60`

### 3. Guarantees

- Performance Guarantee: around `Rs. 1,61,77,652`
- BG No: `062GT02221094001`
- Date: `19/04/2022`
- Bank: `HDFC Bank`

- Additional Performance Guarantee: `Rs. 3,80,24,857`
- BG No: `004401000A2986` or very close OCR form
- Date: `16/04/2022`
- Bank: `Axis Bank`

### 4. BOQ structure

- `NS1` to `NS110` items
- mix of:
  - capex items
  - integration items
  - O&M items
  - manpower items

### 5. SLA structure

- manpower penalties
- milestone delay penalties
- uptime penalties
- software availability/performance penalties
- helpdesk penalties
- security breach penalties

### 6. Important caution

Kuch fields scan-based hain, isliye production mein save karne se pehle manually verify karna chahiye:

- exact go-live letter number prefix
- exact BG digits where OCR weak hai
- final authoritative tender reference (`20/...` vs `21/...`)

---

## Codebase Mein Relevant Ready-Made Support Kahan Hai

Current codebase mein already kaafi support available hai. Isliye aapko sab kuch scratch se nahi banana hai.

### Tender lifecycle fields already present hain

`GE Tender` mein yeh fields mil gaye:

- `loa_date`
- `work_order_date`
- `work_order_no`
- `agreement_date`
- `awarded_value`
- `go_live_date`
- `om_start_date`
- `sla_holiday_from`
- `sla_holiday_to`
- `implementation_completion_date`
- `physical_completion_date`

### Historical project creation support already present hai

`GETender._convert_to_project()` historical dates use karta hai. Start date priority roughly yeh hai:

1. manual historical start
2. `loa_date`
3. `agreement_date`
4. `work_order_date`
5. today

### BOQ mein richer fields already present hain

`GE BOQ Item` mein yeh fields already available hain:

- `boq_code`
- `source_group`
- `module_name`
- `line_type`
- `source_sequence`
- `is_om_item`
- `is_manpower_item`
- `sor_rate`
- `quoted_rate`
- `source_total`

### Historical BOQ loading ke liye survey bypass support bhi hai

BOQ approval flow normally survey completion demand karta hai. Lekin historical import ke liye `bypass_survey_gate` support already code mein hai.

### Staffing requirement doctype bhi ready hai

`GE Project Staffing Requirement` available hai. Isme:

- position
- required_count
- deployment_phase
- deployment_type
- shift_pattern
- from_date / to_date
- contractual_clause
- penalty_for_shortfall

yeh sab bhar sakte ho.

### Instrument doctype bhi upgraded hai

`GE EMD PBG Instrument` mein:

- `EMD`
- `PBG`
- `ADDITIONAL_PBG`
- `SECURITY_DEPOSIT`
- `RETENTION_BG`

jaise types already supported hain.

### Historical bootstrap code bhi already bana hua hai

Aap manual loading karna chahte ho, lekin future mein same contract ko scripted mode se load karna ho to backend mein `historical_bootstrap.py` already available hai. Is guide mein main manual route explain kar raha hoon.

---

## Recommended Manual Loading Order

Data ko is order mein load karo:

1. party / organization master
2. tender header
3. project creation from tender
4. BOQ header + line items
5. milestones
6. staffing requirements
7. guarantee instruments
8. SLA profiles
9. SLA penalty rules
10. supporting source documents attach karna
11. final reconciliation

Yeh order isliye best hai kyunki baad ke records ko pehle wale records ke links chahiye hote hain.

---

## Step 0: Working Folder Samjho

Source material yahan pada hai:

- `new_doc\Agreement Naya Raypur.pdf`
- `new_doc\FINANCIAL BOQ RAIPUR.pdf`
- `new_doc\SLA RAIPUR PROJECT.pdf`
- `new_doc\Go Live certificate Nava Raipur.pdf`
- `new_doc\8165516850284535216_93441_01 NRANSCCL F-1.pdf`
- `new_doc\_extracted\...txt`

Best practice:

- screen 1 par ERP open rakho
- screen 2 par extracted `.txt` ya PDF open rakho
- ek Excel ya notepad mein checklist banao
- har completed entry ke aage tick lagao

---

## Step 1: Party Aur Organization Master Banao

### Kya banana hai

Manual loading start karne se pehle entity duplication avoid karo.

Suggested records:

1. `GE Party`
   - `NRANSCCL`
   - party type: client/customer side

2. `GE Party`
   - `Technosys Security Systems Pvt. Ltd.`
   - party type: vendor/contractor side

3. `GE Organization`
   - agar aapka workflow external org references ke liye use karta hai, tab `NRANSCCL` ya internal business mapping ke hisaab se create karo

### Fill karne wale basic fields

- name
- type
- phone
- email
- GSTIN if available
- PAN if available
- address

### Beginner tip

Agar aap sure nahi ho ki `GE Party` aur `GE Organization` dono banana hai ya nahi, to safest approach yeh hai:

- external authority aur vendor ke liye `GE Party` banao
- `GE Organization` tabhi banao jab aapke current form ya workflow mein woh specifically required ho

### Verify before moving on

- duplicate record pehle se exist to nahi karta
- spelling exactly same ho
- future linking ke liye short name aur long name consistent ho

---

## Step 2: `GE Tender` Record Banao

Yeh sabse important header record hai. Iske bina baaki records properly linked nahi honge.

### Suggested values

- tender number: primary reference ko manual verify karke use karo
- title: project ka full title
- status: `WON`
- client: `NRANSCCL`
- estimated value: `47.53 Cr` equivalent numeric value
- awarded value: `32,35,53,038.71`
- `loa_date`: `2022-03-31`
- `work_order_date`: `2022-03-31`
- `agreement_date`: `2022-04-20`
- `go_live_date`: `2025-03-31`
- `om_start_date`: `2025-04-01`
- `sla_holiday_from`: `2025-04-01`
- `sla_holiday_to`: `2025-06-30`
- `implementation_completion_date`: `2025-03-31`
- `physical_completion_date`: `2025-03-31`

### Work order number

Go-live certificate aur agreement se jo best reference mila hai, usse fill karo, but agar exact formatting uncertain ho:

- temporary note mein mention karo: `manual verification pending`
- wrong number confidently mat save karo

### Beginner tip

Agar tender form mein bahut saare extra fields dikh rahe hain aur aap confuse ho, to is stage par sirf:

- identity
- value
- dates
- client link
- status

par focus karo.

Baaki optional data baad mein bhar sakte ho.

---

## Step 3: Tender Se Project Create Karo

Codebase ke hisaab se tender se project create karna better hai instead of project manually alag banana.

### Why

Code mein `_convert_to_project()` tender ko project se link karta hai aur historical dates bhi respect karta hai.

### Aapko kya dekhna hai

Project create hone ke baad verify karo:

- `linked_tender` set hua ho
- `expected_start_date` historical date le raha ho
- project stage sensible ho

### Important

Expected start date ideally:

- `31/03/2022` ya
- contract logic ke hisaab se historical start

Yeh check zaroor karo ki system aaj ki date na le le. Current code historical values ko prefer karta hai, jo good sign hai.

### Beginner tip

Agar UI mein convert button available ho to use karo. Agar nahi ho, to admin/developer ki help se tender conversion action run karwana best hoga instead of manual project duplication.

---

## Step 4: BOQ Load Karo

Yeh sabse heavy step hai.

### Source files

- `FINANCIAL BOQ RAIPUR.pdf`
- `new_doc\_extracted\FINANCIAL BOQ RAIPUR.txt`

### Recommended BOQ strategy

BOQ ko ek hi baar mein 110 items ke saath bharna risky ho sakta hai. Beginner-friendly approach:

1. pehle BOQ header banao
2. phir items ko module-wise load karo

Suggested groups:

- NS1-NS21: Surveillance / ANPR / ICCC
- NS22-NS43: Network / EMS / HIPS / Fiber
- NS44-NS69: ATCS / RLVD / Pelican
- NS70-NS73: Public Address / Environmental
- NS74-NS77: Health ATM / Kiosk / Integrations
- NS78-NS110: O&M / manpower / support

### BOQ header mein kya bharna hai

- linked tender
- linked project
- status

### BOQ line item mein kya bharna hai

Har line ke liye yeh fields bharne ki koshish karo:

- `description`
- `qty`
- `unit`
- `rate`
- `boq_code` like `NS1`
- `source_group`
- `module_name`
- `line_type`
- `source_sequence`
- `is_om_item`
- `is_manpower_item`
- `sor_rate`
- `quoted_rate`

### `line_type` ka practical mapping

- physical supply/install items: `CAPEX`
- recurring O&M services: `OPEX` ya `SERVICE`
- integration-heavy lines: `INTEGRATION`
- manpower rows: `MANPOWER`

### `is_om_item` kab `1` rakhna hai

- NS78 to NS110 lines ke liye mostly `1`

### `is_manpower_item` kab `1` rakhna hai

- NS91 to NS110 ke manpower rows ke liye `1`

### Important commercial rule

Final BOQ quoted total jo reconcile karna hai:

- `Rs. 32,35,53,038.71`

Reference / SOR total alag rakho:

- `Rs. 15,77,18,944.60`

Yeh dono same cheez nahi hain.

### Beginner tip

Agar aap manual UI entry kar rahe ho, 110 items continuous bharna mushkil hoga. Isliye:

1. pehle 10 items bharo
2. save karo
3. total check karo
4. phir next batch

### Very important note

Normal BOQ approval survey gate check kar sakta hai. Agar historical project ke liye blockage aaye, to aapko:

- ya to admin-level bypass use karna padega
- ya BOQ ko initially draft state mein rakhna padega jab tak approved route clear na ho

---

## Step 5: Milestones Load Karo

### Kahan load karna hai

`GE Milestone`

### Kya load karna hai

Tender aur go-live data ke basis par baseline milestones banao.

Minimum useful milestones:

1. Project Kickoff
2. Survey / Mobilisation
3. Requirement Finalization
4. Design Completion
5. Hardware / Software Delivery
6. Installation / Integration
7. UAT / Final Readiness
8. Go-Live
9. O&M Start

### Fields

- milestone name
- linked project
- status
- planned start date
- planned end date
- actual start date
- actual end date
- remarks

### Suggested status usage

- future / baseline items: `PLANNED`
- completed historical items: `COMPLETED`
- stuck items only if needed: `BLOCKED`

### Beginner tip

Go-Live aur O&M ko separate milestone/event ki tarah rakhna better hai. Isse reporting clearer hogi.

---

## Step 6: Staffing Requirements Load Karo

### Kahan load karna hai

`GE Project Staffing Requirement`

### Why yeh important hai

Source docs named employees nahi dete, but required roles clearly dete hain. Isliye staffing requirement record banana correct approach hai.

### Common roles from documents

- Project Manager
- Solution Architect cum Integration expert
- ITMS & Surveillance Expert and Site Manager
- IOT and ICCC expert
- Network and Security Expert
- Database Architect / DBA
- Data Centre Expert
- Technical Support Staff
- Field Support Staff
- Helpdesk Operators
- ITMS/CCTV Operator
- Paramedical Staff

### Current limitation

Current position dropdown limited hai. Isliye do approaches hain:

1. nearest matching role use karo
2. exact role ko `remarks` or `contractual_clause` mein preserve karo

Jahan exact role match na ho, temporary `Other` use karke exact designation remarks mein likho.

### Phase mapping

- implementation manpower: `IMPLEMENTATION`
- O&M manpower: `O_AND_M`
- both phase roles: `BOTH`

### Dates

- implementation roles:
  - from: project/LOA/agreement start basis
  - to: go-live date

- O&M roles:
  - from: `2025-04-01`
  - to: O&M end date if known, otherwise leave open carefully

### Penalty info

`penalty_for_shortfall` mein SLA se related short text daalo, for example:

- `Rs 2,00,000 per month if Project Manager not deployed`
- `Rs 50,000 per month per Helpdesk Operator delay`

---

## Step 7: Guarantee Instruments Load Karo

### Kahan load karna hai

`GE EMD PBG Instrument`

### Is contract ke liye kya entries banao

1. Performance Guarantee
   - type: `PBG`
2. Additional Performance Guarantee
   - type: `ADDITIONAL_PBG`

### Fill karne wale fields

- instrument type
- linked tender
- linked project
- amount
- instrument number
- bank name
- issue date
- agreement number / agreement reference
- beneficiary name
- release condition
- remarks

### Suggested release condition wording

- `Release after contractual condition satisfaction / defect liability closure / employer approval`

### Beginner tip

Agar expiry date document mein clearly visible nahi hai, us field ko blank chhodna zyada safe hai compared to guess karna.

---

## Step 8: SLA Profile Create Karo

### Kahan load karna hai

`GE SLA Profile`

### Practical recommendation

Ek hi giant profile banana beginner ke liye confusing hoga. Better approach:

- multiple SLA profiles banao by category

Suggested profiles:

1. Manpower SLA
2. Milestone Delay SLA
3. Device Uptime SLA
4. Application Availability SLA
5. Application Performance SLA
6. Helpdesk Response SLA
7. Helpdesk Resolution SLA
8. Security Breach SLA

### Har profile mein basic fields

- profile name
- linked project
- linked tender
- SLA category
- scope

### Important business note

SLA holiday approved hai:

- from `2025-04-01`
- to `2025-06-30`

Isliye practical monitoring ya deduction July 2025 se start maana jaana chahiye unless business team differently decide kare.

### Beginner tip

Agar UI exact holiday fields SLA profile mein nahi dikhata, to holiday ko:

- tender record mein save karo
- remarks/document note mein repeat karo
- penalty calculation se pehle manual rule ke roop mein consider karo

---

## Step 9: SLA Penalty Rules Load Karo

### Kahan load karna hai

`GE SLA Penalty Rule`

### Suggested category-wise rules

#### A. Manpower

- Project Manager: `Rs 2,00,000 / month`
- key experts: `Rs 1,00,000 / month`
- support roles: `Rs 50,000 / month`
- absent without approval: `Rs 10,000 per day`
- unauthorized replacement: `Rs 1,00,000`

#### B. Milestones

- `0.5% of contract value per week or part`

#### C. Device uptime

- below 98%: `0.1% of quarterly O&M per device per 1% drop`

#### D. Application availability

- below 98%: `0.5% of quarterly O&M per application per 1% drop`

#### E. Application performance

- `<99 and >=95`: `0.05%`
- `<95`: `0.1%`

#### F. Helpdesk response

- below 95%: `1% of quarterly O&M per 1% drop`

#### G. Helpdesk resolution

- Severity 1: `0.1%` per 30 min delay
- Severity 2: `0.05%` per 2 hr delay

#### H. Security breach

- Severity 1: `Rs 15 lakh`
- Severity 2: `Rs 10 lakh`
- Severity 3: `Rs 5 lakh`

### Beginner tip

Agar rule form exact formula support na de, to:

1. rule name clear rakho
2. category sahi rakho
3. penalty value/remarks mein formula preserve karo

Goal yeh hai ki contractual meaning lost na ho.

---

## Step 10: Source Documents Attach Karo

Manual data loading ke baad supporting PDFs attach karna bahut useful hoga.

Suggested attachment mapping:

- Tender PDF -> tender record
- Agreement PDF -> tender ya commercial document record
- BOQ PDF -> BOQ record
- SLA PDF -> SLA profile / project document
- Go-Live certificate -> tender/project document

Isse future audit aur reconciliation easy ho jayega.

---

## Step 11: Final Reconciliation Karo

Yeh final step skip mat karo.

### Checklist

- `GE Tender` dates sahi save hui hain
- linked project properly create hua hai
- BOQ total exactly `Rs. 32,35,53,038.71` match karta hai
- BOQ item count complete hai
- milestone dates logical hain
- O&M start `2025-04-01` hi hai
- SLA holiday `2025-04-01` to `2025-06-30` hi hai
- guarantee records sahi amount aur bank details ke saath save hue hain
- scan-sensitive fields marked/verified hain

### Best beginner practice

Ek reconciliation sheet banao with 3 columns:

1. source value
2. ERP saved value
3. status: match / mismatch / verify

---

## Exact Beginner-Friendly Execution Plan

Agar aap bilkul step-by-step chalna chahte ho, to is order mein kaam karo:

1. `GE Party` mein `NRANSCCL` banao
2. `GE Party` mein `Technosys Security Systems Pvt. Ltd.` banao
3. zarurat ho to `GE Organization` record banao
4. `GE Tender` banao aur saare core dates fill karo
5. tender ko project se convert karo
6. project open karke check karo ki linked tender aur expected start date sahi hain
7. `GE BOQ` header banao
8. NS1-NS21 items load karo, save karo, cross-check karo
9. NS22-NS43 items load karo, save karo, cross-check karo
10. NS44-NS69 items load karo, save karo, cross-check karo
11. NS70-NS77 items load karo, save karo, cross-check karo
12. NS78-NS110 items load karo, save karo, cross-check karo
13. final BOQ total verify karo
14. `GE Milestone` entries create karo
15. `GE Project Staffing Requirement` entries create karo
16. `GE EMD PBG Instrument` entries create karo
17. `GE SLA Profile` category-wise create karo
18. `GE SLA Penalty Rule` rules add karo
19. source PDFs attach karo
20. final reconciliation sheet complete karo

---

## Mere Practical Recommendations

### Recommendation 1

BOQ ko ek hi sitting mein full 110 rows mat bharo. Batch-wise bharo.

### Recommendation 2

Uncertain legal reference numbers ko guess mat karo. Remarks mein `manual verification pending` likho.

### Recommendation 3

Go-Live aur O&M dates ko bahut carefully save karo, kyunki SLA aur reporting dono isi par depend karenge.

### Recommendation 4

Staffing ke exact designations current dropdown mein fully match na karein to contractual wording ko remarks/clause field mein preserve karo.

### Recommendation 5

SLA rules ko category-wise split karo. Ek giant mixed record future mein confusing ho jaata hai.

---

## Agar Aap Future Mein Isko Faster Karna Chaho

Manual loading possible hai, but codebase mein `historical_bootstrap.py` already present hai jo future automation ke liye helpful hai.

Manual load ke baad next improvement yeh ho sakta hai:

- isi contract ka structured JSON payload banao
- pehle `dry_run` karo
- phir `commit` mode se same contract script ke through load karo

Lekin abhi ke liye, aapka manual route current system ke saath possible hai.

---

## Final Summary

Haan, `new_doc` ka data aapke current ERP mein manually load ho sakta hai.

Best safe sequence yeh hai:

- master data
- tender
- project
- BOQ
- milestones
- staffing
- guarantees
- SLA
- attachments
- reconciliation

Sabse critical cheezein jo galat nahi honi chahiye:

- tender identity
- awarded BOQ total
- agreement / go-live / O&M dates
- guarantee numbers and amounts
- SLA holiday period

---

## Helpful File References

- Tender lifecycle logic: [ge_tender.py](d:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_tender\ge_tender.py)
- Historical bootstrap flow: [historical_bootstrap.py](d:\erp final\Erp_code\backend\gov_erp\gov_erp\importers\anda\historical_bootstrap.py)
- BOQ survey gate and totals logic: [ge_boq.py](d:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_boq\ge_boq.py)
- BOQ item fields: [ge_boq_item.json](d:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_boq_item\ge_boq_item.json)
- Staffing requirement fields: [ge_project_staffing_requirement.json](d:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_project_staffing_requirement\ge_project_staffing_requirement.json)
- Instrument fields: [ge_emd_pbg_instrument.json](d:\erp final\Erp_code\backend\gov_erp\gov_erp\gov_erp\doctype\ge_emd_pbg_instrument\ge_emd_pbg_instrument.json)
- Source findings already prepared: [erp_document_findings.md](d:\erp final\Erp_code\new_doc\erp_document_findings.md)
- Earlier loading gap analysis: [erp_loading_issues_and_solutions.md](d:\erp final\Erp_code\new_doc\erp_loading_issues_and_solutions.md)
