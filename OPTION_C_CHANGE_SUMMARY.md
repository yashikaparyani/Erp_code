# Option C Change Summary

## What was edited

1. Frontend role access safety
- File: `erp_frontend/src/context/RoleContext.tsx`
- Added a defensive fallback so unknown or unexpected roles do not crash sidebar permission checks.
- Access checks now safely fall back to Project Manager routes if role mapping is missing.

2. Backend POC role cleanup
- File: `backend/gov_erp/gov_erp/poc_setup.py`
- Added `ROLE_TO_STRIP = "Top Management"`.
- Added helper `_remove_role_if_present(user, role_name)`.
- Updated `create_poc_users()` to remove `Top Management` automatically for every POC user during provisioning.
- Added `strip_non_poc_roles()` utility to remove `Top Management` from all existing POC users in one run.

3. Policy A permission fix (Director tender create/update)
- File: `backend/gov_erp/gov_erp/api.py`
- Updated `_require_tender_write_access()` to allow `Director` in addition to `Presales Tendering Head` and `Presales Executive`.
- Effect: Director can now create and update tenders from the frontend without role-denied popup.

4. Policy A doctype permission alignment
- File: `backend/gov_erp/gov_erp/gov_erp/doctype/ge_tender/ge_tender.json`
- Updated `Director` DocType permissions for `GE Tender` to include `create` and `write`.
- Reason: Frappe checks both API role guard and DocType permissions; both must allow the action.

5. Survey API integration with frontend
- Files:
	- `erp_frontend/src/app/api/surveys/route.ts` (already present; keeps `get_surveys` + `create_survey` wiring)
	- `erp_frontend/src/app/api/surveys/stats/route.ts` (already present; keeps `get_survey_stats` wiring)
	- `erp_frontend/src/app/api/surveys/[id]/route.ts` (new; adds `get_survey`, `update_survey`, `delete_survey` wiring)
	- `erp_frontend/src/app/api/surveys/check-complete/route.ts` (new; adds `check_survey_complete` wiring)
	- `erp_frontend/src/app/survey/page.tsx` (updated to use all survey endpoints)
- Added frontend actions for:
	- list surveys
	- create survey
	- view single survey details
	- update survey status
	- delete survey
	- fetch survey stats
	- check tender survey completion gate

## Why this fixes the issue

- Backend cleanup prevents `Top Management` from being returned as an active frontend role for POC users.
- Frontend fallback ensures no runtime crash even if any unexpected role appears in future.
- Policy A fix aligns backend permission with Director's pre-sales UI access so New Tender action is allowed.
- Doctype permission alignment removes second-layer Frappe deny (`No permission for GE Tender`) for Director create/update.
- Survey module now has end-to-end frontend route coverage for all requested survey backend APIs.

## Bulk API connector update (latest)

6. Unified connector for priority backend APIs
- File: `erp_frontend/src/app/api/ops/route.ts`
- Added a new allowlisted frontend proxy endpoint: `POST /api/ops`
- Request format:
	- `{ "method": "<backend_method_name>", "args": { ... } }`
- This route now connects **288 APIs** from the provided pending list.
- Added alias handling for typo input:
	- `waive_sla_penal` -> `waive_sla_penalty`

7. APIs successfully connected in this batch
- Connected via `POST /api/ops` (allowlist + backend proxy):
	- Ticket/RMA/SLA actions (create/update/delete/assign/start/pause/resume/resolve/close/escalate/comment/convert, SLA timer and penalty actions)
	- BOQ and Cost Sheet lifecycle actions (create/update/delete/submit/approve/reject/revise)
	- Dispatch, Invoice, Vendor Comparison lifecycle actions
	- Execution + Engineering records (site, DPR, milestone, drawing, device, IP pool/allocation, logs, checklist/signoff/change/dependency)
	- HR + Finance operational records (attendance, onboarding, overtime, travel, petty cash, payment receipt, penalty deduction, retention/statutory)
	- Pre-sales support records (tender result, reminder, checklist, tender organization, document-folder/document actions)
	- Inventory + procurement reads and stats (GRN, indent, purchase order, stock)

8. APIs where dedicated frontend screen is not found yet
- Note: these are still callable now through `POST /api/ops`, but dedicated page/module UX is not found as separate screens.
- Technical deviation:
	- `create_technical_deviation`, `get_technical_deviation`, `get_technical_deviations`, `update_technical_deviation`, `delete_technical_deviation`
- Test report:
	- `create_test_report`, `get_test_report`, `get_test_reports`, `update_test_report`, `delete_test_report`
- Dependency override/rule workflows:
	- `create_dependency_override`, `approve_dependency_override`, `reject_dependency_override`, `get_dependency_overrides`, `create_dependency_rule`, `update_dependency_rule`, `delete_dependency_rule`, `get_dependency_rules`
- Device/IP deep operations:
	- `create_device_register`, `get_device_register`, `get_device_registers`, `update_device_register`, `delete_device_register`
	- `create_device_uptime_log`, `get_device_uptime_log`, `get_device_uptime_logs`, `update_device_uptime_log`, `delete_device_uptime_log`
	- `create_ip_pool`, `get_ip_pool`, `get_ip_pools`, `update_ip_pool`, `delete_ip_pool`
	- `create_ip_allocation`, `get_ip_allocation`, `get_ip_allocations`, `update_ip_allocation`, `delete_ip_allocation`
- Project structure entities:
	- `create_project_team_member`, `get_project_team_member`, `get_project_team_members`, `update_project_team_member`, `delete_project_team_member`
	- `create_project_asset`, `get_project_asset`, `get_project_assets`, `update_project_asset`, `delete_project_asset`

## Module interactivity upgrade (inventory, execution, finance)

9. Execution page button wiring fixed
- File: `erp_frontend/src/app/execution/page.tsx`
- Updated `New Site` button to open a modal and call `POST /api/sites`.
- Effect: execution button is no longer static; site creation now performs a real backend action.

10. Inventory page converted from static actions to real workflow actions
- Files:
	- `erp_frontend/src/app/inventory/page.tsx`
	- `erp_frontend/src/app/api/dispatch-challans/route.ts` (added `POST` create)
	- `erp_frontend/src/app/api/dispatch-challans/[id]/actions/route.ts` (new)
- Added inventory UI functionality:
	- `New Challan` modal + create dispatch challan API call
	- Row-level actions: `submit`, `approve`, `reject`, `mark_dispatched`
- Role-sensitive action visibility is wired in frontend for operator vs approval roles.

11. Finance Billing now has create + lifecycle action buttons
- Files:
	- `erp_frontend/src/app/finance/billing/page.tsx`
	- `erp_frontend/src/app/api/invoices/route.ts` (added `POST` create)
	- `erp_frontend/src/app/api/invoices/[id]/actions/route.ts` (new)
- Added billing UI functionality:
	- `New Invoice` modal + create invoice API call
	- Row-level actions: `submit`, `approve`, `reject`, `mark_paid`, `cancel`
	- Quick `View` action for per-record status visibility

12. Finance Costing now has create + lifecycle action buttons
- Files:
	- `erp_frontend/src/app/finance/costing/page.tsx`
	- `erp_frontend/src/app/api/cost-sheets/route.ts` (added `POST` create)
	- `erp_frontend/src/app/api/cost-sheets/[id]/actions/route.ts` (new)
- Added costing UI functionality:
	- `New Cost Sheet` modal + create cost sheet API call
	- Row-level actions: `submit`, `approve`, `reject`, `revise`
	- Quick `View` action for per-record status visibility

13. Execution support route updates
- File: `erp_frontend/src/app/api/dprs/route.ts`
- Added `POST` create for DPR so execution data-entry APIs are available through dedicated frontend route.

## Validation status for this wave

- Checked frontend diagnostics for modified pages:
	- `erp_frontend/src/app/finance/billing/page.tsx` -> no errors
	- `erp_frontend/src/app/finance/costing/page.tsx` -> no errors
	- `erp_frontend/src/app/inventory/page.tsx` -> no errors
	- `erp_frontend/src/app/execution/page.tsx` -> no errors

## Post-wave fixes (finance + O&M)

14. Finance dashboard `Generate Invoice` button fix
- File: `erp_frontend/src/app/finance/page.tsx`
- Added navigation handler for `Generate Invoice` button.
- Behavior now: click redirects to `/finance/billing` where full invoice create/actions are available.

15. O&M Helpdesk `Create Ticket` button fix (full wiring)
- Files:
	- `erp_frontend/src/app/om-helpdesk/page.tsx`
	- `erp_frontend/src/app/api/tickets/route.ts`
- Added O&M UI functionality:
	- `Create Ticket` button now opens modal form.
	- Modal fields wired for title, category, priority, project/site, asset serial, description.
	- Submit now calls `POST /api/tickets`.
- Added backend proxy route functionality:
	- `POST` handler added in tickets API route, mapped to backend `create_ticket`.

16. Runtime verification after fixes
- Frontend diagnostics:
	- `erp_frontend/src/app/om-helpdesk/page.tsx` -> no errors
	- `erp_frontend/src/app/api/tickets/route.ts` -> no errors
- RMA runtime smoke check (live site, backend):
	- `create_rma_tracker` -> success
	- `reject_rma` -> success
	- `close_rma` -> success
	- `delete_rma_tracker` -> success
	- `get_rma_trackers` list call -> success

17. Department Head tender creation permission enabled
- Files:
	- `backend/gov_erp/gov_erp/api.py`
	- `backend/gov_erp/gov_erp/gov_erp/doctype/ge_tender/ge_tender.json`
- API guard update:
	- Added `Department Head` to `_require_tender_write_access()` role list.
- DocType permission update:
	- `GE Tender` now grants `Department Head` -> `create: 1`, `write: 1`, `read: 1`, `report: 1`.
- Runtime sync:
	- Executed `bench --site dev.localhost migrate` and cache clear.
	- Verified runtime `DocPerm` for `GE Tender` + `Department Head` shows `create=1`, `write=1`.

18. OM Operator dashboard access fix (O&M should not require executive/director dashboard)
- File:
	- `backend/gov_erp/gov_erp/api.py`
- Access guard updates:
	- Added `OM Operator` to `_require_om_read_access()` and `_require_om_write_access()`.
	- Added `OM Operator` to `_require_rma_read_access()` and `_require_rma_write_access()` because O&M dashboard aggregates RMA metrics.
- Runtime sync and verification:
	- Executed `bench --site dev.localhost migrate` and cache clear.
	- Verified as `om.operator@technosys.local`:
		- `get_om_dashboard` -> success
		- `get_rma_stats` -> success
	- Dashboard payload now returns expected role-specific keys: `tickets`, `sla`, `rma`.
