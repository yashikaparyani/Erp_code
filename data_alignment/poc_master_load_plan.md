# POC Master Load Plan

This file identifies which master rows should be loaded before implementation / POC, based on the current ERP model and the cleaned Priority 8 extraction.

## Load First

### 1. Departments
Reason:
- role-based views, document folders, and HR alignment already depend on these labels
- current backend seeder already standardizes the active department vocabulary

Load set:
- Accounts Department
- Presales Department
- Central Team
- Project Coordinator Department
- Purchase Department
- HR/Admin Department
- Store Department
- Sales Department
- RMA
- O&M

### 2. Designations
Reason:
- employee onboarding, HR mapping, and reporting structure all depend on designation vocabulary
- these are stable and already captured in current seed data

Load set:
- Director
- General Manager
- Department Head
- Project Head
- Presales Head
- HR Head
- Accounts Head
- Procurement Head
- RMA Head
- Store Head
- Engineering Head
- Project Manager
- Project Coordinator
- Presales Executive
- MIS Executive
- Accounts Executive
- HR Executive
- Procurement Manager
- Purchase Executive
- Network Engineer
- Engineer
- Technical Executive
- Field Technician
- Store Executive
- Logistics Executive
- OM Operator
- Operator
- Admin Executive

### 3. Permission Roles and aliases
Reason:
- role guards are already implemented in backend APIs
- user seeding and POC login setup need the final role vocabulary fixed up front

Load roles:
- Director
- Project Head
- Engineering Head
- Presales Tendering Head
- Presales Executive
- HR Manager
- Accounts
- Procurement Manager
- Purchase
- Project Manager
- Store Manager
- Stores Logistics Head
- Engineer
- Field Technician
- OM Operator
- RMA Manager

Load aliases alongside role mapping:
- Presales Head -> Presales Tendering Head
- HR Head -> HR Manager
- Accounts Head -> Accounts
- Procurement Head -> Procurement Manager
- RMA Head -> RMA Manager

### 4. Projects
Reason:
- project is the system spine
- all other imported tracker records depend on project linkage

High-confidence project rows extracted from ANDA:
- P001 / Project Alpha / WO-ALPHA-001 / In Progress
- P002 / Project Beta / WO-BETA-001 / Planning
- P003 / Project Gamma / WO-GAMMA-001 / On Hold

### 5. Locations / sites
Reason:
- sites are required before milestone, survey, device, and execution-level imports become reliable

High-confidence location rows extracted from ANDA:
- P001 -> Loc1
- P002 -> Loc2
- P003 -> Loc3

### 6. Vendor masters
Reason:
- procurement, comparison sheets, and PO creation depend on vendor normalization before transactional import

High-confidence vendor rows extracted from ANDA:
- Vendor X
- Vendor Y
- Vendor Z

### 7. Milestone template staging
Reason:
- these are reusable delivery vocabulary values even when project-linked milestone rows still need cleanup

High-confidence milestone names extracted from ANDA:
- CCR Integration
- Survey & Design
- O&M

## Load After Cleanup

### Organization / client master
Current state:
- `ANDA.xlsx` does not expose a clean client organization master with reliable contact and address fields
- keep the template file ready, but do not bulk import until client-side master rows are cleaned

### Full location survey rows
Current state:
- the location workbook sheet mixes true field rows and dashboard/display rows
- clean row filtering is required before full import into `GE Site` / survey structures

### Full procurement transaction history
Current state:
- the workbook is useful for reconciliation, but not safe for direct transaction import without column cleanup

## Recommended Load Order

1. departments
2. designations
3. roles
4. projects
5. sites
6. vendors
7. milestone staging
8. organizations after client cleanup
