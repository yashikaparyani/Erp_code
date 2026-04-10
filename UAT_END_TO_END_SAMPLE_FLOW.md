# ERP End-to-End UAT Flow

Yeh document aapke liye ready-to-use UAT script hai. Isme sample tender se lekar bid, project, sites, survey, BOQ, procurement, installation, completion, aur O&M closure tak ka full flow diya gaya hai.

Use case intent:
- `Tender -> Bid -> Won -> Project -> Sites -> Survey -> BOQ -> Vendor Comparison -> PO -> GRN / Project Inventory -> Execution / Commissioning -> Closeout -> O&M Closure`

Important system notes jo codebase se confirm hue:
- Tender ko project me convert karne ke liye tender ka status `WON` hona chahiye.
- Project spine stages hain:
  - `SURVEY`
  - `BOQ_DESIGN`
  - `COSTING`
  - `PROCUREMENT`
  - `STORES_DISPATCH`
  - `EXECUTION`
  - `BILLING_PAYMENT`
  - `OM_RMA`
  - `CLOSED`
- Site `installation_stage` values:
  - `Not Started`
  - `Survey`
  - `Civil Work`
  - `Equipment Installation`
  - `Cabling`
  - `Testing`
  - `Commissioned`
  - `Handed Over`
- Contract closeout sequence:
  - `I&C Only`: `Go Live Certificate -> Letter of Completion`
  - `I&C + O&M`: `Go Live Certificate -> Exit Management KT -> Letter of Handover`

## 1. Master Sample Data

In values ko throughout UAT copy-paste karna hai.

### Tender Master

```text
Tender Number: UAT/TDR/2026/001
Title: City Surveillance & Smart Command Center Project - UAT Sample
Client: UAT City Development Authority
Organization: UAT State Safe City Mission
Submission Date: 2026-04-18
Estimated Value: 125000000
EMD Required: Yes
EMD Amount: 2500000
PBG Required: Yes
PBG Amount: 6250000
PBG Percent: 5
Consultant Name: UAT Infra Consultants Pvt Ltd
Consultant Contact: 9876543210
Contract Scope: I&C + O&M
Tenure Years: 5
Tenure End Date: 2031-06-30
LOA Date: 2026-05-05
Work Order Date: 2026-05-12
Work Order No: WO/UAT/SAFECITY/2026/019
Agreement Date: 2026-05-20
Awarded Value: 118500000
Go Live Date: 2026-12-15
O&M Start Date: 2027-01-01
Implementation Completion Date: 2026-12-31
Physical Completion Date: 2026-12-20
```

### Tender Workflow Remarks

```text
GO / NO-GO Remarks: Strategic project, strong client fit, execution feasible across 3 pilot sites.
Qualification Reason: Commercially viable, documents available, scope aligned with CCTV + command center deployment.
Technical Remark: OEM support available, survey and design assumptions acceptable for pilot rollout.
Observation Reason: Keval negative test ke liye use karna hai, primary happy path me nahi.
```

### Bid Master

```text
Bid Date: 2026-04-17
Bid Amount: 118500000
Result Date: 2026-05-02
Result Remarks: L1 accepted, tender awarded for pilot + O&M package.
LOI Remarks: LOI requested from Procurement, Project, Engineering, Accounts, HR, Stores, O&M/RMA.
```

### Project Master

```text
Expected Start Date: 2026-05-12
Expected End Date: 2031-06-30
Project Note: Auto-created from tender conversion.
```

### Sites Master

```text
Site 1 Code: UAT-SITE-001
Site 1 Name: UAT Control Room HQ
Site 1 Address: Command Center Building, Sector 10, UAT Nagar
Site 1 Latitude: 28.6139
Site 1 Longitude: 77.2090

Site 2 Code: UAT-SITE-002
Site 2 Name: UAT Junction Alpha
Site 2 Address: Alpha Chowk, Ring Road, UAT Nagar
Site 2 Latitude: 28.6148
Site 2 Longitude: 77.2155

Site 3 Code: UAT-SITE-003
Site 3 Name: UAT Junction Beta
Site 3 Address: Beta Tiraha, Market Road, UAT Nagar
Site 3 Latitude: 28.6105
Site 3 Longitude: 77.2232
```

### Survey Data

```text
Survey Date: 2026-05-25
Surveyed By: PM UAT
Coordinates: 28.6139,77.2090
Summary: Site accessible, power available, pole mounting feasible, fiber route identified.
```

Use per site:

```text
Site 1 Summary: Existing control room available, 20 camera inputs planned, UPS room available.
Site 2 Summary: 12 pole-mounted cameras, feeder pillar available, trench length approx 180 m.
Site 3 Summary: 10 cameras, 1 junction box, OFC route via municipal duct, no roadblock.
```

### Site Infra Sample

```text
Tower Count: 1
Fiber Length (m): 180
Backhaul Type: Fiber
Feasibility Status: Approved
Power Source: Grid
Power Available: Yes
Road Accessible: Yes
```

### BOQ Sample

```text
BOQ Version: 1
BOQ Name: UAT Pilot BOQ v1
Linked Tender: UAT/TDR/2026/001
Linked Project: auto after conversion
Total Amount: 35500000
```

Suggested BOQ line items:

```text
1. IPC Dome Camera, Qty 20, Rate 18500
2. Bullet Camera, Qty 12, Rate 16200
3. 16 Channel NVR, Qty 3, Rate 42000
4. 24 Core OFC Cable, Qty 1500 m, Rate 42
5. GI Pole 6 Meter, Qty 8, Rate 14500
6. UPS 5 KVA, Qty 2, Rate 68000
7. Network Switch 24 Port, Qty 4, Rate 28500
8. Installation & Commissioning Lot, Qty 1, Rate 850000
9. O&M Support Year 1 Lot, Qty 1, Rate 1200000
```

### Vendor Comparison Sample

```text
Comparison Name: VC-UAT-001
Recommended Supplier: SecureVision Technologies
Quote Count: 3
Distinct Supplier Count: 3
Lowest Total Amount: 32950000
Selected Total Amount: 33600000
Exception Reason: SecureVision selected due to faster delivery and 5-year OEM support despite not being absolute lowest.
```

Suggested quote set:

```text
Vendor 1: SecureVision Technologies, Total 33600000, Delivery 21 days, Recommended Yes
Vendor 2: Alpha Integrated Systems, Total 32950000, Delivery 35 days, Recommended No
Vendor 3: Sentinel Networks India, Total 34100000, Delivery 18 days, Recommended No
```

### Purchase Order Sample

```text
Supplier: SecureVision Technologies
Transaction Date: 2026-06-15
Schedule Date: 2026-07-05
Company: default company as per system
Warehouse: default warehouse as per system
Payment Terms Note: 70 percent against supply, 20 percent after installation, 10 percent after signoff.
```

### GRN / Inventory Sample

```text
GRN Date: 2026-07-06
Supplier Invoice No: INV-SVT-2401
Transporter: UAT Logistics Carriers
LR No: LR-77821
```

### Execution / Commissioning Sample

```text
Drawing Number: DRW-UAT-001
Drawing Title: Camera Layout and Network Backbone - Pilot Sites
Drawing Revision: R0

Checklist Name: COMM-UAT-001
Checklist Status Flow: Draft -> In Progress -> Completed

Test Report Name: TR-UAT-001
Test Type: SAT
Test Result Remark: Video feed, recording, network uptime, and power failover verified.

Client Signoff Type: Go Live Signoff
Signed By Client: Rajesh Kumar
Signoff Date: 2026-12-15
```

### O&M / Closure Sample

```text
LOC Request Date Window: Use when tender tenure is nearing completion in UAT or if admin already seeded eligible data.
Project Head LOC Remarks: All implementation deliverables completed and accepted.
O&M Completion Letter Date: 2031-06-30
Final Closure Remarks: O&M tenure completed successfully, closure recorded.
```

## 2. Happy Path UAT Steps

## Step 1: Tender Create

Module:
- `Pre-Sales`
- `Tender Workspace`

Action:
- New tender create karo
- Upar wala `Tender Master` data fill karo
- `Contract Scope = I&C + O&M` zaroor set karo
- `EMD Required = Yes`
- `PBG Required = Yes`

Expected result:
- Tender create ho jaye
- Status initially `DRAFT` ya presales initial state me ho
- Tender number unique save ho

UAT evidence:
- Tender open ho raha hai
- Tender document / RFP upload option visible hai

## Step 2: Tender Documents Upload

Action:
- `Tender Document` upload karo
- `RFP Document` upload karo

Expected result:
- Dono docs workspace me visible ho
- Tender workspace card me document count / available status show ho

## Step 3: GO / NO-GO Flow

Action:
- Presales side se `Send GO / NO-GO Request`
- Director login se request approve karo
- Remarks me use karo:

```text
Strategic project, strong client fit, execution feasible across 3 pilot sites.
```

Expected result:
- `go_no_go_status = GO`
- Tender funnel next stage me move kare
- Approval trail visible ho

## Step 4: Qualification / Commercial Readiness

Action:
- Commercial / qualification ready mark karo
- Qualification reason paste karo:

```text
Commercially viable, documents available, scope aligned with CCTV + command center deployment.
```

Expected result:
- `commercial_readiness = APPROVED`
- Tender bid-ready pipeline ki taraf move kare

## Step 5: Technical Approval Request

Action:
- `Send Technical Request`
- Technical remark paste karo:

```text
OEM support available, survey and design assumptions acceptable for pilot rollout.
```

- Director ya authority se technical approval karao

Expected result:
- `technical_readiness = APPROVED`
- Tender `BID_READY` / green state me aa jaye

## Step 6: EMD / PBG Tracking

Action:
- EMD/PBG instrument create karo
- Sample values:

```text
Instrument Type: EMD
Amount: 2500000
Instrument Number: EMD-UAT-001
Bank Name: State Bank of UAT
Issue Date: 2026-04-14
Expiry Date: 2026-10-14
Remarks: EMD submitted for UAT bid
```

Phir PBG:

```text
Instrument Type: PBG
Amount: 6250000
Instrument Number: PBG-UAT-001
Bank Name: State Bank of UAT
Issue Date: 2026-05-10
Expiry Date: 2031-07-31
Remarks: Performance BG for awarded contract
```

Expected result:
- EMD/PBG rows visible ho
- Documents attach ho sakein

## Step 7: Bid Create

Action:
- Tender se bid create karo
- Use values:

```text
Bid Date: 2026-04-17
Bid Amount: 118500000
```

Expected result:
- Latest bid create ho
- Bid tender se linked ho

## Step 8: Bid Submit and Under Evaluation

Action:
- Bid submit karo
- Under evaluation move karo

Expected result:
- Bid status `SUBMITTED` then `UNDER_EVALUATION`
- Tender status bhi sync ho

## Step 9: Mark Bid Won

Action:
- Bid ko `WON` mark karo
- Result remarks:

```text
L1 accepted, tender awarded for pilot + O&M package.
```

Expected result:
- Bid status `WON`
- Tender status `WON`

## Step 10: LOI Tracker Flow

Action:
- LOI requests raise karo for:
  - Procurement
  - Project
  - Engineering
  - Accounts
  - HR
  - Stores
  - O&M / RMA

Remarks:

```text
LOI requested from all required departments for in-process bid conversion.
```

Expected result:
- LOI tracker rows create ho
- Summary me expected vs received count dikhe

## Step 11: Accept Won Bid for In-Process Tracking

Action:
- Won bid LOI decision `ACCEPT`

Expected result:
- Bid in-process lifecycle ke liye ready ho

## Step 12: Convert Tender to Project

Action:
- Tender ya bid workspace se `Convert to Project`

Expected result:
- Project auto-create ho
- Tender status `CONVERTED_TO_PROJECT`
- `linked_project` populate ho
- Project current stage `SURVEY` ho

UAT check:
- Project open ho
- Tender link visible ho

## Step 13: Add Sites in Project

Action:
- Project me 3 sites add karo using `Sites Master` data

Expected result:
- 3 `GE Site` rows create ho
- Har site me:
  - `linked_project` set ho
  - `current_site_stage = SURVEY`
  - `installation_stage = Not Started`

## Step 14: Site Detail Update

Action:
- Har site me address, lat/long, infra, feasibility fields fill karo
- `Tower Count`, `Fiber Length`, `Backhaul Type`, `Power`, `Road Accessible`

Expected result:
- Site master complete ho
- Site dossier / detail page pe data visible ho

## Step 15: Survey Create for Each Site

Action:
- 3 surveys create karo, each site ke against
- Common values:

```text
Survey Date: 2026-05-25
Surveyed By: PM UAT
```

Per-site summary use karo:
- Site 1: `Existing control room available, 20 camera inputs planned, UPS room available.`
- Site 2: `12 pole-mounted cameras, feeder pillar available, trench length approx 180 m.`
- Site 3: `10 cameras, 1 junction box, OFC route via municipal duct, no roadblock.`

Status strategy:
- Ek-ek karke first `Pending` ya `In Progress`
- Final me sabko `Completed`

Expected result:
- `get_surveys` me 3 rows visible
- `check_survey_complete` final me complete return kare

## Step 16: Advance Site Stage to BOQ_DESIGN

Action:
- Har site ko `advance_site_stage` ya UI se `BOQ_DESIGN` me move karo

Expected result:
- Site current stage `BOQ_DESIGN`
- Site progress percent increase ho
- Project spine progress refresh ho

## Step 17: BOQ Create

Action:
- `Engineering BOQ` module me `UAT Pilot BOQ v1` create karo
- Linked tender aur linked project set karo
- Upar diye gaye 9 BOQ line items add karo

Expected result:
- BOQ `DRAFT` me create ho
- Total amount populated ho

## Step 18: BOQ Submit for Approval

Action:
- BOQ submit karo

Expected result:
- Status `DRAFT -> PENDING_APPROVAL`
- Accountability trail create ho

## Step 19: BOQ Approve

Action:
- Approver role se BOQ approve karo

Expected result:
- Status `APPROVED`
- BOQ downstream costing / procurement ke liye usable ho

## Step 20: Advance Site Stage to COSTING

Action:
- Har site stage `COSTING` karo

Expected result:
- Project progress aur stage lane update ho

## Step 21: Create Vendor Comparison

Action:
- Procurement module me vendor comparison create karo
- Sample values use karo:

```text
Comparison Name: VC-UAT-001
Recommended Supplier: SecureVision Technologies
Quote Count: 3
Distinct Supplier Count: 3
Lowest Total Amount: 32950000
Selected Total Amount: 33600000
```

Quotes:
- SecureVision Technologies
- Alpha Integrated Systems
- Sentinel Networks India

Expected result:
- Vendor comparison `DRAFT` me create ho

## Step 22: Submit Vendor Comparison for Approval

Action:
- Vendor comparison submit karo

Expected result:
- Status `PENDING_APPROVAL`

## Step 23: Approve Vendor Comparison

Action:
- Approver se approve karo
- Agar required ho to exception reason use karo:

```text
SecureVision selected due to faster delivery and 5-year OEM support despite not being absolute lowest.
```

Expected result:
- Status `APPROVED`
- Recommended supplier final ho

## Step 24: Create Purchase Order

Action:
- Approved comparison se PO create karo, ya manually create karo
- Supplier:

```text
SecureVision Technologies
```

- Items BOQ ke matching rakho

Expected result:
- PO `Draft` me create ho
- Project linked ho

## Step 25: Submit Purchase Order

Action:
- PO submit karo

Expected result:
- PO submitted ho
- Downstream GRN possible ho

## Step 26: Create GRN

Action:
- PO ke against GRN create karo
- Sample values:

```text
GRN Date: 2026-07-06
Supplier Invoice No: INV-SVT-2401
Transporter: UAT Logistics Carriers
LR No: LR-77821
```

Expected result:
- GRN create ho
- GRN detail page me PO link visible ho

## Step 27: Verify Project Inventory Receiving Context

Action:
- `Project Manager -> Inventory` page open karo
- GRN visible hona chahiye
- Dispatch/receiving context check karo

Expected result:
- GRN list me record dikhe
- Project inventory workspace accessible ho

## Step 28: Update Project Inventory Receipt

Action:
- PM inventory me receipt update karo
- Sample item:

```text
Item Code: IPC Dome Camera
Item Name: IPC Dome Camera
Received Qty: 20
Site: UAT-SITE-001
Source / Vendor: SecureVision Technologies
Invoice No: INV-SVT-2401
Purchase Order: generated PO number
Last GRN Ref: generated GRN number
Receipt Note: Pilot batch received in good condition
```

Expected result:
- Project inventory row create/update ho
- `received_qty` badhe
- `balance_qty` reflect ho

## Step 29: Raise Indent From PM Side

Action:
- PM inventory se indent raise karo
- Example:

```text
Item Code: 24 Core OFC Cable
Qty: 200
Required By: 2026-07-20
Site: UAT-SITE-002
Justification / Note: Additional cable for route diversion at Junction Alpha
```

Expected result:
- Indent create ho
- Procurement linkage visible ho

## Step 30: Move Site Stage to PROCUREMENT then STORES_DISPATCH

Action:
- Site stages gradually move karo:
  - `PROCUREMENT`
  - `STORES_DISPATCH`

Expected result:
- Spine stage progression visible ho
- No backward movement allowed

## Step 31: Create Drawing

Action:
- Execution / Engineering drawing create karo

```text
Drawing Number: DRW-UAT-001
Title: Camera Layout and Network Backbone - Pilot Sites
Revision: R0
Linked Project: converted project
Linked Site: UAT-SITE-001
```

Expected result:
- Drawing create ho

## Step 32: Approve Drawing

Action:
- Drawing submit aur approve karo

Expected result:
- Drawing approved ho
- Engineering to execution handoff traceable ho

## Step 33: Move Site Stage to EXECUTION

Action:
- Har active site ko `EXECUTION` stage me le jao

Expected result:
- Current site stage `EXECUTION`

## Step 34: Update Installation Stage

Action:
- Site installation stage is order me progress karo:
  - `Survey`
  - `Civil Work`
  - `Equipment Installation`
  - `Cabling`
  - `Testing`
  - `Commissioned`
  - `Handed Over`

Expected result:
- Installation stage forward-only move kare
- Regression allowed na ho

## Step 35: Commissioning Checklist Create

Action:
- Checklist create karo

```text
Checklist Name: COMM-UAT-001
Linked Project: converted project
Linked Site: UAT-SITE-001
Status: Draft
```

Expected result:
- Checklist create ho

## Step 36: Start and Complete Commissioning Checklist

Action:
- Checklist `Draft -> In Progress -> Completed`

Expected result:
- Commissioning lane close ho
- Completion status visible ho

## Step 37: Create Test Report

Action:
- Test report create karo

```text
Report Name: TR-UAT-001
Test Type: SAT
Status: Submitted
Remarks: Video feed, recording, network uptime, and power failover verified.
```

Expected result:
- Test report create ho

## Step 38: Create Client Signoff

Action:
- Client signoff create karo

```text
Signoff Type: Go Live Signoff
Signed By Client: Rajesh Kumar
Signoff Date: 2026-12-15
Remarks: Pilot sites accepted and handed over for operations.
```

Expected result:
- Client signoff save ho
- Commissioning evidence complete ho

## Step 39: Move Site Stage to BILLING_PAYMENT

Action:
- Site stage `BILLING_PAYMENT` karo

Expected result:
- Execution se post-execution lane move ho

## Step 40: Project Closeout - Go Live Certificate

Action:
- Project workspace closeout tab me `Go Live Certificate` issue karo

Expected result:
- First closeout certificate issue ho
- Sequence check pass ho

## Step 41: Project Closeout - Exit Management KT

Action:
- Kyunki contract scope `I&C + O&M` hai, next `Exit Management KT` issue karo
- KT plan:

```text
Knowledge transfer to O&M team covering camera health checks, incident logging, NVR backup verification, and SLA response workflow.
```

Expected result:
- `Exit Management KT` issue ho

## Step 42: Complete Exit Management KT

Action:
- KT complete mark karo

Expected result:
- KT completed by/on visible ho

## Step 43: Project Closeout - Letter of Handover

Action:
- Final closeout certificate `Letter of Handover` issue karo

Expected result:
- Closeout sequence complete ho

## Step 44: Move Site Stage to OM_RMA

Action:
- Site stage `OM_RMA` karo

Expected result:
- O&M lane visible ho

## Step 45: LOC Request Flow

Action:
- Agar bid/tender O&M nearing completion state me eligible hai, presales se `Send Request to Project Head for LOC`

Expected result:
- `loc_request_status = REQUESTED`
- Project Head workspace me request visible ho

Note:
- System rule ke hisaab se LOC request normally tab raise hota hai jab `tenure_end_date` near ho.
- Agar UAT environment me ye gating issue de, to is step ko closure phase me execute karo ya admin-assisted date setup use karo.

## Step 46: Project Head Submits LOC

Action:
- Project Head side se LOC submit karo
- Remarks:

```text
All implementation deliverables completed and accepted.
```

Expected result:
- `loc_request_status = SUBMITTED`
- Tender me `closure_letter_received = 1`

## Step 47: Record O&M Completion Letter

Action:
- Presales side se O&M completion letter record karo

```text
Completion Date: 2031-06-30
```

Expected result:
- Tender pe `O&M Completion Letter recorded`
- `closure_letter_received = 1`

## Step 48: Final Tender Closure

Action:
- Presales Head ya Director se final tender closure mark karo

Expected result:
- Formal closure ho
- Presales closure date populate ho

## 3. Mandatory Validation Checklist

Har major stage ke baad ye verify karna hai:

- Tender se linked bid visible hai
- Won tender se linked project visible hai
- Project se linked sites visible hain
- Surveys correct site/project/tender context ke saath visible hain
- BOQ tender/project se linked hai
- Vendor comparison project/tender se linked hai
- PO supplier aur project ke against visible hai
- GRN PO ke against visible hai
- Project inventory me GRN reference visible hai
- Site stage progression backward nahi ja raha
- Installation stage backward nahi ja raha
- Closeout sequence wrong order me allow nahi ho raha
- O&M closure ke bina final tender closure allow nahi hona chahiye

## 4. Negative Tests

Ye bhi ek baar test kar lena:

1. Non-won tender ko project me convert karne ki koshish karo.
Expected:
- Error aaye: only won tender can be converted.

2. BOQ ko approve karne se pehle submit skip karo.
Expected:
- Direct approval allowed na ho.

3. Vendor comparison ko `DRAFT` se direct approve without submission.
Expected:
- Reject ya validation error.

4. Site stage ko backward move karo.
Expected:
- Not allowed.

5. Installation stage `Commissioned` se `Cabling` pe lao.
Expected:
- Not allowed.

6. O&M completion letter ke bina tender close karo.
Expected:
- Not allowed.

## 5. Suggested UAT Execution Order

Fastest smooth order:

1. Tender create
2. Tender docs upload
3. GO / NO-GO
4. Qualification
5. Technical approval
6. EMD / PBG
7. Bid create
8. Bid submit
9. Bid won
10. LOI tracking
11. Tender convert to project
12. Sites add
13. Surveys complete
14. Site stage to BOQ_DESIGN
15. BOQ create and approve
16. Site stage to COSTING
17. Vendor comparison create and approve
18. PO create and submit
19. GRN create
20. Project inventory update
21. Indent create
22. Drawing create and approve
23. Site stage to EXECUTION
24. Installation progress
25. Commissioning checklist
26. Test report
27. Client signoff
28. Site stage to BILLING_PAYMENT
29. Closeout certificates
30. Site stage to OM_RMA
31. LOC request and submission
32. O&M completion letter
33. Final tender closure

## 6. UAT Signoff Format

Har step ke against ye 4 columns maintain kar lo:

```text
Step No | Module | Test Data Used | Actual Result | Pass/Fail | Screenshot Ref
```

Example:

```text
01 | Tender Create | UAT/TDR/2026/001 | Tender created successfully | Pass | SS-01
02 | GO/NO-GO | GO remarks sample | Director approved GO | Pass | SS-02
03 | Bid Create | 118500000 | Bid created successfully | Pass | SS-03
```

## 7. Final Note

Agar aap strictly happy path run karna chahte ho, to same naming pattern maintain karo:
- Tender: `UAT/TDR/2026/001`
- Vendor Comparison: `VC-UAT-001`
- Drawing: `DRW-UAT-001`
- Checklist: `COMM-UAT-001`
- Test Report: `TR-UAT-001`

Isse cross-linking aur screenshots dono clean rahenge.
