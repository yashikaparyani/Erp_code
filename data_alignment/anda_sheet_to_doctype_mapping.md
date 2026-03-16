  # ANDA Sheet To Doctype Mapping

This mapping is based on direct inspection of `ANDA.xlsx` on 2026-03-15.

## Summary

The workbook is usable, but not uniformly clean.
Some sheets are direct tracker candidates, while others contain title rows, repeated headers, derived dashboard rows, or shifted columns.
The safest implementation rule is:

- use the sheet as the business source of truth
- import only the high-confidence master rows directly
- treat noisy rows as staging data that should be cleaned before import

## Sheet Mapping

| Workbook Sheet | Primary ERP Target | Status | Notes |
| --- | --- | --- | --- |
| `project dashboRD` | `Project` | Partial | Good source for project IDs and names; some columns are shifted, so work-order and end-date values should be validated against combined sheet before import |
| `PROJECT AND MILESTONE PHASES` | `GE Milestone` | Partial | Suitable for milestone staging; clean milestone names exist, but several rows omit project context |
| `LOCATION AND SURVEY DETAILS` | `GE Site` + survey extensions | Partial | Field intent maps well, but the current sheet mixes tracker rows and dashboard notes |
| `PROCUREMENT` | ERPNext `Material Request` / `Purchase Order` / `Purchase Receipt` + `GE Vendor Comparison` | Partial | Business structure is correct, but columns are visibly shifted in live workbook rows |
| `CLIENT PAYMENT MILESTONES` | `GE Invoice` / `GE Payment Receipt` / billing dashboards | Good | Milestone description and payment dates are structurally aligned |
| `MATERIAL CONSUMPTION` | stock issue flow + `GE Dispatch Challan` / stock entry audit | Partial | Business fields map well, but live rows include template notes and sparse records |
| `PROJECT COMMUNICATION LOG` | `GE Project Communication Log` | Good | Clean direct mapping |
| `RMA TRACKER` | `GE RMA Tracker` | Good | Direct tracker-to-doctype match |
| `PROJECT ASSESTS & SERVICES` | `GE Project Asset` | Good | Direct tracker-to-doctype match; workbook spelling retained only as source label |
| `PETTY CASH TRACKER` | `GE Petty Cash` | Good | Direct tracker-to-doctype match |
| `MASTER COMBINED DATA` | Not a direct import target | Staging only | Best used as reconciliation / merge source across projects, vendors, locations, issues, uptime, and communication metadata |

## Recommended Target Mapping By Business Area

### Project and executive overview
- Source sheet: `project dashboRD`
- Target: `Project`
- Use for:
  - project seed list
  - status sanity checks
  - expected start/end staging
- Do not import dashboard totals directly

### Milestones and phases
- Source sheet: `PROJECT AND MILESTONE PHASES`
- Target: `GE Milestone`
- Current import columns to prefer:
  - `milestone_name`
  - `linked_project`
  - `linked_site`
  - `planned_date`
  - `actual_date`
  - `status`
  - `remarks`
- `Assigned Team/Role` should remain in staging until milestone/team model is expanded further

### Locations and survey
- Source sheet: `LOCATION AND SURVEY DETAILS`
- Targets:
  - `GE Site`
  - survey-related extensions already added to site model / survey workflow
- High-confidence direct fields today:
  - `Project ID`
  - `Location ID`
  - `Location Name`
  - `Lat / Long`
  - `Survey Status`
  - `Survey Completed Date`

### Procurement and vendors
- Source sheet: `PROCUREMENT`
- Targets:
  - `Material Request` wrapper APIs for indent flow
  - `Purchase Order`
  - `Purchase Receipt`
  - `GE Vendor Comparison`
  - `GE Party` / `Supplier` master staging
- Current workbook issue:
  - several live rows are column-shifted
  - vendor names are still recoverable with high confidence from the first four observed columns

### Client payment milestones
- Source sheet: `CLIENT PAYMENT MILESTONES`
- Targets:
  - `GE Invoice`
  - `GE Payment Receipt`
  - `GE Retention Ledger` where applicable
- This is one of the cleaner sheets in the workbook

### Material consumption
- Source sheet: `MATERIAL CONSUMPTION`
- Targets:
  - material issuance workflow
  - stock movement / dispatch traceability
- Treat current sheet as staging until row cleanliness improves

### Project communication
- Source sheet: `PROJECT COMMUNICATION LOG`
- Target: `GE Project Communication Log`
- Direct tracker alignment is already good

### RMA
- Source sheet: `RMA TRACKER`
- Target: `GE RMA Tracker`
- Direct tracker alignment is already good

### Assets and services
- Source sheet: `PROJECT ASSESTS & SERVICES`
- Target: `GE Project Asset`
- Direct tracker alignment is already good

### Petty cash
- Source sheet: `PETTY CASH TRACKER`
- Target: `GE Petty Cash`
- Direct tracker alignment is already good

## High-Confidence Master Rows Extracted

### Projects
- `P001` -> `Project Alpha` -> `WO-ALPHA-001`
- `P002` -> `Project Beta` -> `WO-BETA-001`
- `P003` -> `Project Gamma` -> `WO-GAMMA-001`

### Locations
- `P001` -> `Loc1`
- `P002` -> `Loc2`
- `P003` -> `Loc3`

### Vendors
- `Vendor X`
- `Vendor Y`
- `Vendor Z`

### Milestone seeds / templates
- `CCR Integration` -> `Project Management`
- `Survey & Design` -> `Engineering Team`
- `O&M` -> role blank in workbook

## Data Quality Notes

- The workbook is suitable for controlled staging, not blind bulk import.
- `MASTER COMBINED DATA` is the best reconciliation source, not the best direct import source.
- `PROCUREMENT` contains usable vendor signals even though its headers and data are shifted.
- `LOCATION AND SURVEY DETAILS` includes both real tracker fields and presentation-only rows; it needs row filtering before full import.
