# Frontend Wiring Audit - 2026-03-31

## Current First-Pass Unwired API Candidates

This list is based on a frontend string-reference scan against `backend/gov_erp/gov_erp/api.py`.
It is meant as a practical wiring backlog, not a deletion list.

1. `check_anda_master_integrity`
2. `create_staffing_assignment`
3. `delete_staffing_assignment`
4. `end_staffing_assignment`
5. `get_anda_import_logs`
6. `get_anda_import_order`
7. `get_anda_import_tabs`
8. `get_finance_mis`
9. `get_login_mis`
10. `get_sales_mis`
11. `get_staffing_assignment`
12. `get_staffing_assignments`
13. `get_staffing_summary`
14. `get_tender_result_stats`
15. `health_check`
16. `load_anda_masters`
17. `reconcile_invoice_payments`
18. `run_anda_import`
19. `run_anda_orchestrated_import`
20. `sync_site_milestone_progress`
21. `update_staffing_assignment`

## High-Value Wiring Priorities

1. `create_project`, `get_project`, `update_project`, `delete_project`
2. `get_staffing_assignments`, `create_staffing_assignment`, `update_staffing_assignment`, `delete_staffing_assignment`, `end_staffing_assignment`
3. `get_tender_result_stats`
4. `reconcile_invoice_payments`
5. `get_finance_mis`, `get_login_mis`, `get_sales_mis`

## Wired In This Pass

1. Added frontend API routes for direct project CRUD.
2. Added frontend API route for staffing assignment CRUD.
3. Next UI layer in this pass is:
   project create/edit/delete on `/projects`
   staffing assignment management in execution project structure
