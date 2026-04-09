# Backend API Inventory

Generated from `@frappe.whitelist` functions in `backend/gov_erp/gov_erp`.

Total whitelisted APIs: **639**.
All endpoints are reachable through the re-export layer as `gov_erp.api.<function_name>`.

## Core Session And Health (3)

Source: `backend/gov_erp/gov_erp/api_utils.py`

- `get_session_context`: Return the authenticated user's basic context for the frontend shell.
- `logout_current_session`: Force-clear the authenticated user's current session.
- `health_check` (guest): No docstring in source; behavior should be inferred from surrounding workflow and tests.

## System Operations (3)

Source: `backend/gov_erp/gov_erp/system_api.py`

- `get_workspace_permissions`: Forward to rbac_api.get_workspace_permissions (ops route resolves to gov_erp.api.*).
- `generate_system_reminders`: Auto-generate system reminders from real business data:
- `process_due_reminders`: Process due reminders: find active reminders whose next_reminder_at has

## Admin Masters (10)

Source: `backend/gov_erp/gov_erp/admin_api.py`

- `get_departments`: Return built-in Department masters for the settings UI.
- `create_department`: Create a Department using the default company in the site.
- `toggle_department`: Toggle a Department's disabled state.
- `get_designations`: Return built-in Designation masters for the settings UI.
- `create_designation`: Create a Designation master.
- `get_roles`: Return Frappe roles for the settings UI.
- `create_role`: Create a custom Frappe role.
- `toggle_role`: Toggle a role's disabled state.
- `get_users`: Return Frappe system users, enriched with role and employee context.
- `create_user`: Create a system user for the admin settings UI.

## Alerts And Reminders (15)

Source: `backend/gov_erp/gov_erp/alerts_api.py`

- `get_alerts`: Get alerts for the current user.
- `get_unread_alert_count`: Get unread alert count for the current user.
- `mark_alert_as_read` (methods=POST): Mark a single alert as read.
- `mark_all_alerts_read` (methods=POST): Mark all alerts as read for the current user.
- `create_user_reminder` (methods=POST): Create a new reminder for the current user.
- `get_reminders`: Get reminders for the current user.
- `update_reminder` (methods=POST): Update an existing reminder.
- `snooze_reminder` (methods=POST): Snooze a reminder by N minutes.
- `dismiss_reminder` (methods=POST): Dismiss a reminder.
- `delete_reminder` (methods=POST): Delete a reminder.
- `count_missed_reminders`: Return count of past-due active/snoozed reminders for the current user.
- `add_record_comment` (methods=POST): Add a comment to a record (project, site, milestone, etc.).
- `get_record_comments`: Get comments for a record.
- `assign_to_record` (methods=POST): Assign a user to a record (creates a ToDo).
- `get_record_assignments`: Get current assignments (ToDos) for a record.

## ANDA Import (7)

Source: `backend/gov_erp/gov_erp/anda_import_api.py`

- `run_anda_import`: Run an ANDA tab importer.
- `get_anda_import_logs`: Return recent ANDA import audit logs.
- `get_anda_import_tabs`: Return the list of available ANDA import tab names.
- `load_anda_masters`: Load master data in dependency order (Phase 3).
- `check_anda_master_integrity`: Check reference integrity of master data (Phase 3).
- `run_anda_orchestrated_import`: Run imports across multiple tabs in dependency order (Phase 4).
- `get_anda_import_order`: Return the recommended tab import order (Phase 4).

## Tendering And Presales (48)

Source: `backend/gov_erp/gov_erp/tender_api.py`

- `get_tenders`: Return list of tenders with pagination.
- `get_tender`: Return a single tender with all fields.
- `create_tender`: Create a new tender.
- `update_tender`: Update an existing tender.
- `get_tender_approvals`: Return tender-specific approval trail rows.
- `submit_tender_approval`: Raise a tender-specific approval request for presales workflow.
- `approve_tender_approval`: Approve a tender-specific approval request.
- `reject_tender_approval`: Reject a tender-specific approval request.
- `transition_tender_status`: Controlled tender lifecycle transition using existing linked records for readiness checks.
- `delete_tender`: Delete a tender.
- `get_tender_stats`: Aggregate tender stats for the dashboard.
- `convert_tender_to_project`: Manually convert a WON tender into an ERPNext Project.
- `get_tender_organizations`: Return organizations linked to tenders.
- `create_tender_organization`: Link an organization to a tender.
- `delete_tender_organization`: Remove an organization link from a tender.
- `get_parties`: Return list of parties (clients / vendors).
- `create_party`: Create a party (client/vendor) for tendering and master data flows.
- `update_party`: Update a party.
- `delete_party`: Delete a party.
- `get_organizations`: Return list of organizations for tendering flows.
- `create_organization`: Create an organization master used by tendering flows.
- `get_emd_pbg_instruments`: Return EMD/PBG instruments, optionally filtered by tender and type.
- `create_emd_pbg_instrument`: Create an EMD/PBG instrument row.
- `get_tender_results`: Return tender result rows.
- `get_tender_result`: Return one tender result row with bidders.
- `create_tender_result`: Create a tender result row.
- `update_tender_result`: Update a tender result row.
- `delete_tender_result`: Delete a tender result row.
- `get_tender_result_stats`: Aggregate tender result stats.
- `get_tender_checklists`: Return tender checklist templates.
- `get_tender_checklist`: Return one tender checklist template.
- `create_tender_checklist`: Create a tender checklist template.
- `update_tender_checklist`: Update a tender checklist template.
- `delete_tender_checklist`: Delete a tender checklist template.
- `get_tender_reminders`: Return tender reminders.
- `get_tender_reminder`: Return one tender reminder.
- `create_tender_reminder`: Create a tender reminder.
- `update_tender_reminder`: Update a tender reminder.
- `delete_tender_reminder`: Delete a tender reminder.
- `mark_tender_reminder_sent`: Mark a tender reminder as sent.
- `dismiss_tender_reminder`: Dismiss a tender reminder.
- `get_tender_reminder_stats`: Aggregate tender reminder stats.
- `get_competitors`: Return competitor master rows.
- `get_competitor`: Return one competitor master row.
- `create_competitor`: Create a competitor master row.
- `update_competitor`: Update a competitor master row.
- `delete_competitor`: Delete a competitor master row.
- `get_competitor_stats`: Aggregate competitor stats.

## Survey (8)

Source: `backend/gov_erp/gov_erp/survey_api.py`

- `get_surveys`: Return normalized surveys scoped by project/site/tender/status.
- `get_survey`: Return a single normalized survey with all fields.
- `create_survey`: Create a new site-linked survey.
- `update_survey`: Update an existing survey.
- `delete_survey`: Delete a survey.
- `get_survey_stats`: Aggregate normalized survey stats for the dashboard.
- `check_survey_complete`: Check if all surveys for a tender/project/site are completed (gate for BOQ).
- `backfill_survey_context`: Backfill linked_site/project/tender on legacy surveys where resolution is safe.

## Procurement (32)

Source: `backend/gov_erp/gov_erp/procurement_api.py`

- `get_boqs`: Return BOQs, optionally filtered by tender and/or status.
- `get_boq`: Return a single BOQ with all fields and line items.
- `create_boq`: Create a new BOQ.
- `update_boq`: Update an existing BOQ.
- `delete_boq`: Delete a BOQ.
- `submit_boq_for_approval`: Move BOQ from DRAFT to PENDING_APPROVAL (enforces survey gate).
- `approve_boq`: Approve a BOQ that is PENDING_APPROVAL.
- `reject_boq`: Reject a BOQ that is PENDING_APPROVAL.
- `revise_boq`: Create a new revision of a BOQ by copying it with incremented version.
- `get_boq_stats`: Aggregate BOQ stats for the dashboard.
- `get_cost_sheets`: Return cost sheets, optionally filtered by tender and/or status.
- `get_cost_sheet`: Return a single cost sheet with all fields and line items.
- `create_cost_sheet`: Create a new cost sheet.
- `update_cost_sheet`: Update an existing cost sheet.
- `delete_cost_sheet`: Delete a cost sheet unless it is approved.
- `submit_cost_sheet_for_approval`: Move Cost Sheet from DRAFT to PENDING_APPROVAL.
- `approve_cost_sheet`: Approve a cost sheet that is pending approval.
- `reject_cost_sheet`: Reject a cost sheet that is pending approval.
- `revise_cost_sheet`: Create a new revision of a cost sheet by copying it with incremented version.
- `get_cost_sheet_stats`: Aggregate cost sheet stats for the dashboard.
- `create_cost_sheet_from_boq`: Create a DRAFT Cost Sheet pre-populated from an approved GE BOQ.
- `get_vendor_comparisons`: Return vendor comparison sheets.
- `get_vendor_comparison`: Return a single vendor comparison with quote rows.
- `create_vendor_comparison`: Create a vendor comparison sheet.
- `update_vendor_comparison`: Update a vendor comparison sheet.
- `delete_vendor_comparison`: Delete a vendor comparison unless approved.
- `submit_vendor_comparison_for_approval`: Move vendor comparison from draft to pending approval.
- `approve_vendor_comparison`: Approve a vendor comparison sheet.
- `reject_vendor_comparison`: Reject a vendor comparison sheet.
- `revise_vendor_comparison`: Create a draft revision of an existing vendor comparison.
- `get_vendor_comparison_stats`: Aggregate procurement comparison stats.
- `create_po_from_comparison`: Create Purchase Order(s) from an approved Vendor Comparison sheet.

## Stores And Inventory (42)

Source: `backend/gov_erp/gov_erp/inventory_api.py`

- `get_inventory_reference_schema`: Expose workbook-style header references for stores, receipts, and dispatch UX.
- `get_dispatch_challans`: Return dispatch challans for store/logistics workflow.
- `get_dispatch_challan`: Return a single dispatch challan with line items.
- `create_dispatch_challan`: Create a dispatch challan draft.
- `update_dispatch_challan`: Update a dispatch challan.
- `delete_dispatch_challan`: Delete a dispatch challan unless it has been dispatched.
- `submit_dispatch_challan_for_approval`: Move dispatch challan to pending approval.
- `approve_dispatch_challan`: Approve a dispatch challan.
- `reject_dispatch_challan`: Reject a dispatch challan.
- `mark_dispatch_challan_dispatched`: Mark an approved dispatch challan as dispatched after stock validation.
- `get_dispatch_challan_stats`: Aggregate dispatch challan stats for the stores dashboard.
- `get_store_stock_snapshot`: Return ERPNext stock snapshot from Bin for stores dashboard / dispatch validation.
- `get_indents`: Return purchase indents backed by ERPNext Material Request.
- `get_indent`: Return one indent backed by Material Request.
- `create_indent`: Create an indent backed by Material Request.
- `get_project_indents`: Return project-scoped indents for PM/PH inventory-facing surfaces.
- `create_project_indent`: Create a project-scoped indent from the PM inventory lane.
- `get_indent_stats`: Aggregate indent counts for procurement dashboards.
- `submit_indent`: Submit a draft indent (Material Request) for PH review.
- `acknowledge_indent`: PH acknowledges receipt of a submitted indent.
- `accept_indent`: PH accepts the indent and passes it to the procurement team.
- `reject_indent`: PH rejects a submitted indent and stops the Material Request.
- `return_indent`: PH returns an indent for revision — cancels the Material Request.
- `escalate_indent`: Escalate a stalled indent to a higher authority.
- `get_purchase_orders`: Return ERPNext purchase orders for procurement dashboards.
- `get_purchase_order`: Return one ERPNext purchase order.
- `get_po_stats`: Aggregate purchase order counts and value for procurement dashboards.
- `create_purchase_order`: Create a new ERPNext Purchase Order with items and optional payment terms.
- `update_purchase_order`: Update an existing draft Purchase Order.
- `delete_purchase_order`: Delete a draft Purchase Order.
- `submit_purchase_order`: Submit a draft Purchase Order.
- `cancel_purchase_order`: Cancel a submitted Purchase Order.
- `get_po_payment_terms`: Return payment terms for a purchase order from GE PO Extension.
- `save_po_payment_terms`: Save/replace payment terms for a purchase order.
- `approve_po_payment_terms`: Mark payment terms as approved by accounts department.
- `reject_po_payment_terms`: Reject payment terms by accounts department.
- `get_grns`: Return ERPNext purchase receipts (GRNs) for stores dashboards.
- `get_grn`: Return one ERPNext purchase receipt.
- `create_grn`: Create a GRN backed by Purchase Receipt, optionally deriving lines from a PO.
- `get_grn_stats`: Aggregate GRN counts and value for stores dashboards.
- `get_stock_position`: Return current stock position with item metadata and computed stock value.
- `get_stock_aging`: Return stock aging buckets using Bin and latest positive Stock Ledger Entry.

## Finance And Commercial (94)

Source: `backend/gov_erp/gov_erp/finance_api.py`

- `get_invoices`: Return invoices.
- `get_invoice`: Return a single invoice with line items.
- `create_invoice`: Create an invoice.
- `update_invoice`: Update an invoice.
- `delete_invoice`: Delete a draft invoice.
- `submit_invoice`: Submit a draft invoice.
- `approve_invoice`: Approve a submitted invoice.
- `reject_invoice`: Reject a submitted invoice.
- `mark_invoice_paid`: Mark an approved invoice as payment received.
- `cancel_invoice`: Cancel an invoice.
- `get_invoice_stats`: Aggregate invoice stats.
- `get_payment_receipts`: Return payment receipts.
- `get_payment_receipt`: Return a single payment receipt.
- `create_payment_receipt`: Create a payment receipt.
- `update_payment_receipt`: Update a payment receipt.
- `delete_payment_receipt`: Delete a payment receipt.
- `get_payment_receipt_stats`: Aggregate payment receipt totals.
- `reconcile_invoice_payments`: Reconcile invoices against payment receipts.
- `get_retention_ledgers`: Return retention ledger entries.
- `get_retention_ledger`: Return a single retention ledger entry.
- `create_retention_ledger`: Create a retention entry.
- `update_retention_ledger`: Update a retention entry.
- `delete_retention_ledger`: Delete a retention entry.
- `release_retention`: Release (fully or partially) a retained amount.
- `get_retention_stats`: Aggregate retention stats.
- `get_penalty_deductions`: Return penalty deductions.
- `get_penalty_deduction`: Return a single penalty deduction.
- `create_penalty_deduction`: Create a penalty deduction.
- `update_penalty_deduction`: Update a penalty deduction.
- `delete_penalty_deduction`: Delete a penalty deduction.
- `approve_penalty_deduction`: Approve a pending penalty deduction.
- `apply_penalty_deduction`: Apply an approved penalty to an invoice.
- `reverse_penalty_deduction`: Reverse an applied penalty.
- `get_penalty_stats`: Aggregate penalty stats.
- `get_petty_cash_entries`: Return petty cash entries.
- `get_petty_cash_entry`: Return a single petty cash entry.
- `create_petty_cash_entry`: Create a petty cash entry.
- `update_petty_cash_entry`: Update a petty cash entry.
- `approve_petty_cash_entry`: Approve a petty cash entry.
- `reject_petty_cash_entry`: Reject a petty cash entry.
- `delete_petty_cash_entry`: Delete a draft petty cash entry.
- `submit_petty_cash_to_ph`: Send an approved petty cash entry to PH approval queue for costing release.
- `create_petty_cash_fund_request`: Create a PH-bound petty cash fund request.
- `get_petty_cash_fund_requests`: List petty cash fund requests that move through PH approval.
- `submit_po_to_ph`: Send a submitted purchase order to the PH approval queue.
- `submit_rma_po_to_ph`: Send an RMA-linked PO spend request to the PH approval queue.
- `get_ph_approval_items`: List Project Head approval items by lane.
- `get_ph_approval_item`: Return one PH approval item with source attachments.
- `ph_approve_item`: Approve a PH approval item and forward it to costing.
- `ph_reject_item`: Reject a PH approval item.
- `get_costing_queue`: List PH-approved items awaiting costing action.
- `get_costing_queue_item`: Return one costing queue entry.
- `costing_release_item`: Release / disburse a costing queue item.
- `costing_hold_item`: Put a costing queue item on hold.
- `costing_reject_item`: Reject a costing queue item.
- `get_project_inventory_records`: Return project-scoped inventory truth for PM/PH surfaces.
- `record_project_inventory_receipt`: Apply a project-side receipt update to project inventory totals.
- `get_material_consumption_reports`: Return material consumption reports scoped to a project.
- `create_material_consumption_report`: Create a PM-side material consumption report and update project inventory.
- `get_project_receiving_summary`: Return project-linked dispatch and GRN visibility for PM follow-through.
- `get_estimates`: Return estimate records.
- `get_estimate`: Return a single estimate with lines.
- `create_estimate`: Create an estimate.
- `update_estimate`: Update an estimate.
- `delete_estimate`: Delete an estimate.
- `submit_estimate`: Mark estimate as sent.
- `approve_estimate`: Approve an estimate.
- `reject_estimate`: Reject an estimate.
- `convert_estimate_to_proforma`: Create a proforma invoice from an estimate.
- `get_estimate_stats`: Aggregate estimate stats.
- `get_proforma_invoices`: Return proforma invoices.
- `get_proforma_invoice`: Return one proforma invoice.
- `create_proforma_invoice`: Create a proforma invoice.
- `update_proforma_invoice`: Update a proforma invoice.
- `delete_proforma_invoice`: Delete a proforma invoice.
- `submit_proforma_invoice`: Mark proforma as sent.
- `approve_proforma_invoice`: Approve a proforma invoice.
- `cancel_proforma_invoice`: Cancel a proforma invoice.
- `convert_proforma_to_invoice`: Create an invoice from a proforma invoice.
- `get_proforma_invoice_stats`: Aggregate proforma stats.
- `get_payment_follow_ups`: Return payment follow-up records.
- `create_payment_follow_up`: Create a payment follow-up.
- `update_payment_follow_up`: Update a payment follow-up.
- `delete_payment_follow_up`: Delete a payment follow-up.
- `close_payment_follow_up`: Close a payment follow-up item.
- `escalate_payment_follow_up`: Escalate a payment follow-up item.
- `get_payment_follow_up_stats`: Aggregate follow-up stats.
- `get_customer_statement`: Return a customer statement with running balance.
- `get_commercial_comments`: Return commercial record comments with optional customer or record filtering.
- `add_commercial_comment`: Add a transaction-level comment to a commercial record.
- `get_commercial_documents`: Return customer-context commercial document exchange records.
- `create_commercial_document`: Create a customer-context commercial document exchange record.
- `get_receivable_aging`: Return customer-wise receivable aging buckets.
- `seed_bookkeeping_demo`: Seed a small bookkeeping demo chain if one does not already exist.

## Project Spine And Workspace (40)

Source: `backend/gov_erp/gov_erp/project_api.py`

- `get_project`: Return a single editable project record.
- `create_project`: Create a Project record with project-spine custom fields.
- `add_project_sites`: Append new GE Site rows to an existing project from the project workspace.
- `update_project`: Update a Project record.
- `delete_project`: Delete a Project record after dependency check.
- `get_project_spine_list`: List projects with optional department-aware filtering.
- `get_project_spine_summary`: Full spine summary for a single project (or all projects).
- `get_project_spine_detail`: Detailed project view centered on site-level execution.
- `get_project_workflow_state`: Return the current workflow state, readiness, and history for a project.
- `submit_project_stage_for_approval`: Submit the current project stage for approval once readiness checks pass.
- `approve_project_stage`: Approve the current stage and advance the project to the next stage.
- `reject_project_stage`: Reject the current project stage and return it to the owning department.
- `restart_project_stage`: Move a rejected project stage back into active working state.
- `override_project_stage`: Manual workflow override for users with stage-override capability.
- `get_department_spine_view`: Department-filtered spine view.
- `toggle_project_favorite`: Toggle the current user's favorite status for a project. Returns is_favorite.
- `get_project_favorites`: Return list of project names the current user has favorited.
- `get_project_notes`: Return notes for a project. Private notes only visible to their owner.
- `create_project_note`: Create a project note.
- `update_project_note`: Update a project note. Only the owner can update.
- `delete_project_note`: Delete a project note. Only the owner can delete.
- `get_project_tasks`: List tasks for a project. Supports status/parent filter.
- `create_project_task`: Create a new project task.
- `update_project_task`: Update an existing project task.
- `delete_project_task`: Delete a project task and its subtasks.
- `reorder_project_tasks`: Bulk-update sort_order for drag-drop reorder.
- `update_task_status`: Quick status update for kanban drag-drop.
- `get_task_summary`: Return task counts by status for a project.
- `clone_project`: Clone a project: optionally copy tasks, milestones, notes.
- `get_project_timesheet_summary`: Aggregate time data from DPR, manpower, and overtime entries for a project.
- `get_project_activity`: Aggregate activity feed for a project from Version (audit trail),
- `get_site_spine_detail`: Full spine detail for a single site.
- `advance_site_stage`: Advance a site to the next spine stage.
- `toggle_site_blocked`: Block or unblock a site.
- `refresh_project_spine`: Recompute project spine stats (total_sites, spine_progress_pct, current_project_stage).
- `get_project_closeout_items`: List all closeout certificates for a project.
- `get_project_closeout_eligibility`: Return which closeout types can be issued now, which are done, and which are blocked.
- `issue_closeout_certificate`: Issue a closeout certificate for a project following strict sequence rules.
- `revoke_closeout_certificate`: Revoke a previously issued closeout certificate.
- `complete_exit_management_kt`: Mark an Exit Management KT closeout as completed.

## Execution And Commissioning (134)

Source: `backend/gov_erp/gov_erp/execution_api.py`

- `download_site_bulk_upload_template`: Download an XLSX template for bulk GE Site creation.
- `bulk_upload_sites`: Create GE Site records from an attached XLSX/CSV file.
- `get_sites`: Return execution sites.
- `get_site`: Return a single site.
- `create_site`: Create a site.
- `update_site`: Update a site.
- `delete_site`: Delete a site.
- `get_milestones`: Return milestones.
- `get_milestone`: Return a single milestone.
- `create_milestone`: Create a milestone.
- `update_milestone`: Update a milestone.
- `delete_milestone`: Delete a milestone.
- `sync_site_milestone_progress`: Recompute site progress from its linked milestones.
- `get_dependency_rules`: Return dependency rules for execution tasks.
- `create_dependency_rule`: Create a dependency rule.
- `update_dependency_rule`: Update a dependency rule.
- `delete_dependency_rule`: Delete a dependency rule.
- `get_dependency_overrides`: Return dependency override requests.
- `create_dependency_override`: Create a dependency override request.
- `approve_dependency_override`: Approve a dependency override.
- `reject_dependency_override`: Reject a dependency override.
- `evaluate_task_dependencies`: Evaluate whether a task is blocked by active dependency rules.
- `get_dprs`: Return DPR records.
- `get_dpr`: Return a single DPR with child tables.
- `create_dpr`: Create a DPR. Enforces one DPR per site per day.
- `update_dpr`: Update a DPR.
- `delete_dpr`: Delete a DPR.
- `submit_dpr`: Submit a DPR for approval.
- `approve_dpr`: Approve a submitted DPR.
- `reject_dpr`: Reject a submitted DPR.
- `get_dpr_stats`: Aggregate DPR stats.
- `get_project_team_members`: Return project team members.
- `get_project_team_member`: Return a single team member record.
- `create_project_team_member`: Add a team member to a project.
- `update_project_team_member`: Update a team member record.
- `delete_project_team_member`: Remove a team member from a project.
- `get_project_document`: Return a single custom project document.
- `update_document_folder`: Update a custom document folder.
- `delete_document_folder`: Delete a custom document folder.
- `update_project_document`: Update a custom project document.
- `delete_project_document`: Delete a custom project document.
- `get_drawings`: Return engineering drawings.
- `get_drawing`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_drawing`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_drawing`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_drawing`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_technical_deviations`: Return technical deviations.
- `get_technical_deviation`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_technical_deviation`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_technical_deviation`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_technical_deviation`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_change_requests`: Return change requests.
- `get_change_request`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_change_request`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_change_request`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_change_request`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_device_registers`: Return device register entries.
- `get_device_register`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_device_register`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_device_register`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_device_register`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_ip_pools`: Return IP pools.
- `get_ip_pool`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_ip_pool`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_ip_pool`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_ip_pool`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_ip_allocations`: Return IP allocations.
- `get_ip_allocation`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_ip_allocation`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_ip_allocation`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_ip_allocation`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_commissioning_checklists`: Return commissioning checklists.
- `get_commissioning_checklist`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_commissioning_checklist`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_commissioning_checklist`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_commissioning_checklist`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_test_reports`: Return test reports.
- `get_test_report`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_test_report`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_test_report`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_test_report`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_client_signoffs`: Return client signoffs.
- `get_client_signoff`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `create_client_signoff`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `update_client_signoff`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `delete_client_signoff`: No docstring in source; behavior should be inferred from surrounding workflow and tests.
- `get_comm_logs`: Return project communication log entries.
- `get_comm_log`: Return a single communication log entry.
- `create_comm_log`: Create a communication log entry.
- `update_comm_log`: Update a communication log entry.
- `delete_comm_log`: Delete a communication log entry.
- `get_project_assets`: Return project asset records.
- `get_project_asset`: Return a single project asset record.
- `create_project_asset`: Create a project asset record.
- `update_project_asset`: Update a project asset record.
- `delete_project_asset`: Delete a project asset record.
- `get_manpower_logs`: Return manpower log entries.
- `get_manpower_log`: Return a single manpower log entry.
- `create_manpower_log`: Create a manpower log entry.
- `update_manpower_log`: Update a manpower log entry.
- `delete_manpower_log`: Delete a manpower log entry.
- `get_manpower_summary`: Return aggregated manpower stats for a project/site.
- `get_staffing_assignments`: Return staffing assignment records, optionally filtered.
- `get_staffing_assignment`: Return a single staffing assignment.
- `create_staffing_assignment`: Create a new project staffing assignment.
- `update_staffing_assignment`: Update an existing staffing assignment.
- `delete_staffing_assignment`: Delete a staffing assignment.
- `end_staffing_assignment`: End a staffing assignment by setting leave_date and letting the controller auto-deactivate it.
- `get_staffing_summary`: Return aggregated staffing stats for a project/site.
- `get_device_uptime_logs`: Return device uptime log entries.
- `get_device_uptime_log`: Return a single device uptime log entry.
- `create_device_uptime_log`: Create a device uptime log entry.
- `update_device_uptime_log`: Update a device uptime log entry.
- `delete_device_uptime_log`: Delete a device uptime log entry.
- `get_site_uptime_summary`: Return per-device uptime summary for a site.
- `approve_technical_deviation`: Approve a technical deviation (Engineering Head/Project Manager only).
- `reject_technical_deviation`: Reject a technical deviation.
- `close_technical_deviation`: Close an approved or rejected deviation.
- `submit_change_request`: Submit a draft change request for review.
- `approve_change_request`: Approve a submitted change request.
- `reject_change_request`: Reject a submitted change request.
- `approve_test_report`: Approve a submitted test report.
- `reject_test_report`: Reject a submitted test report.
- `commission_device`: Mark a deployed/active device as commissioned.
- `mark_device_faulty`: Flag a device as faulty.
- `decommission_device`: Decommission a device and release its IP allocation if any.
- `release_ip_allocation`: Release an active IP allocation back to its pool.
- `start_commissioning_checklist`: Move a draft commissioning checklist to In Progress.
- `complete_commissioning_checklist`: Complete a commissioning checklist after verifying all items.
- `sign_client_signoff`: Record client signature on a pending signoff.
- `approve_client_signoff`: Final internal approval after client signature.
- `submit_drawing`: Submit a draft drawing for approval.
- `approve_drawing`: Approve a submitted drawing.
- `supersede_drawing`: Mark an approved drawing as superseded by a newer revision.

## DMS And Dossier (15)

Source: `backend/gov_erp/gov_erp/dms_api.py`

- `get_documents`: Return uploaded files for the document briefcase UI.
- `get_project_documents`: Return custom GE Project Document records.
- `get_document_folders`: Return document folders from File or custom GE Document Folder records.
- `create_document_folder`: Create a custom document folder under GE Document Folder.
- `upload_project_document`: Create a custom GE Project Document record.
- `update_document_status`: Update the workflow status of a GE Project Document with accountability logging.
- `delete_uploaded_project_file`: Delete an uploaded File record by file_url when document creation fails.
- `get_document_versions`: Return all versions of a project document grouped by logical document name and project.
- `get_expiring_documents`: Return project documents that are expiring within the given number of days.
- `get_document_requirements`: Return all GE Document Requirement rules, optionally filtered by stage.
- `check_stage_document_completeness`: Check which required documents exist and which are missing for a given stage.
- `get_project_dossier`: Return all documents for a project grouped by stage for dossier view.
- `get_site_dossier`: Return all documents for a site, grouped by stage.
- `get_record_documents`: Return all documents linked to a specific record (e.g., a BOQ, a PO, etc.).
- `check_progression_gate`: Check if all mandatory documents from prior stages are present before advancing.

## PM Workspace (15)

Source: `backend/gov_erp/gov_erp/pm_workspace_api.py`

- `get_project_issues`: Return project issues / blockers for PM workspace.
- `get_project_issue`: Return a single project issue.
- `create_project_issue`: Create a project issue / blocker.
- `update_project_issue`: Update a project issue.
- `delete_project_issue`: Delete a project issue.
- `get_pm_central_status`: Return read-only status slices from all central teams for a project.
- `get_pm_requests`: List PM requests for a project.
- `get_pm_request`: Get a single PM request.
- `create_pm_request`: Create a new PM request. Auto-sets requested_by and requested_date.
- `update_pm_request`: Update a draft PM request.
- `submit_pm_request`: Submit a draft PM request for PH review.
- `approve_pm_request`: PH approves a pending PM request.
- `reject_pm_request`: PH rejects a pending PM request.
- `withdraw_pm_request`: PM withdraws a pending or draft PM request.
- `delete_pm_request`: Delete a draft PM request.

## HR (92)

Source: `backend/gov_erp/gov_erp/hr_api.py`

- `get_onboardings`: Return onboarding records, optionally filtered.
- `get_onboarding`: Return a single onboarding record with all fields and child tables.
- `create_onboarding`: Create a new onboarding record.
- `update_onboarding`: Update an existing onboarding record.
- `delete_onboarding`: Delete an onboarding record unless it is mapped to an employee.
- `submit_onboarding`: Move onboarding from DRAFT to SUBMITTED.
- `review_onboarding`: Move onboarding from SUBMITTED to UNDER_REVIEW.
- `return_onboarding_to_submitted`: Move onboarding from UNDER_REVIEW back to SUBMITTED.
- `approve_onboarding`: Approve an onboarding that is under review.
- `reject_onboarding`: Reject an onboarding that is under review.
- `reopen_onboarding_draft`: Move onboarding back to DRAFT from a rejected or submitted state.
- `preview_onboarding_employee_mapping`: Return the employee payload that would be created from an approved onboarding record.
- `map_onboarding_to_employee`: Create an ERPNext Employee from an approved onboarding record.
- `get_onboarding_stats`: Aggregate onboarding stats for dashboard.
- `get_attendance_logs`: Return attendance logs, optionally filtered by employee/date/status.
- `get_attendance_log`: Return one attendance log.
- `create_attendance_log`: Create an attendance log.
- `update_attendance_log`: Update an attendance log.
- `delete_attendance_log`: Delete an attendance log.
- `get_attendance_stats`: Aggregate attendance counts for dashboard use.
- `get_leave_types`: Return leave type setup rows.
- `create_leave_type`: Create a leave type.
- `update_leave_type`: Update a leave type.
- `delete_leave_type`: Delete a leave type.
- `get_leave_allocations`: Return leave allocations.
- `create_leave_allocation`: Create a leave allocation.
- `update_leave_allocation`: Update a leave allocation.
- `delete_leave_allocation`: Delete a leave allocation.
- `get_leave_applications`: Return leave applications.
- `get_leave_application`: Return one leave application.
- `create_leave_application`: Create a leave application.
- `update_leave_application`: Update a leave application.
- `delete_leave_application`: Delete a leave application.
- `submit_leave_application`: Move leave application from DRAFT to SUBMITTED.
- `approve_leave_application`: Approve a submitted leave application if balance is available.
- `reject_leave_application`: Reject a submitted leave application.
- `reopen_leave_application`: Move a rejected or submitted leave application back to draft.
- `get_leave_balances`: Return leave balances for the selected cycle.
- `get_holiday_lists`: Return available holiday lists.
- `get_holiday_list`: Return one holiday list with its child rows.
- `get_leave_calendar`: Return leave and holiday events for calendar views.
- `get_who_is_in`: Return who is in, on leave, absent, or unmarked for a selected date.
- `get_attendance_muster`: Return a muster-style employee status list for a given date.
- `get_swipe_ingestion_placeholder`: Return placeholder information for future swipe ingestion integration.
- `get_attendance_regularizations`: Return attendance regularization requests.
- `get_attendance_regularization`: Return one attendance regularization request.
- `create_attendance_regularization`: Create an attendance regularization request.
- `update_attendance_regularization`: Update an attendance regularization request.
- `delete_attendance_regularization`: Delete an attendance regularization request.
- `submit_attendance_regularization`: Move regularization request from DRAFT to SUBMITTED.
- `approve_attendance_regularization`: Approve a regularization request and apply it to the attendance log.
- `reject_attendance_regularization`: Reject a submitted attendance regularization request.
- `reopen_attendance_regularization`: Move a rejected or submitted regularization request back to draft.
- `get_hr_approval_inbox`: Return a unified HR approval inbox across onboarding, leave, travel, overtime, and regularization.
- `act_on_hr_approval`: Dispatch an approval inbox action to the correct HR workflow method.
- `get_travel_logs`: Return travel logs.
- `get_travel_log`: Return one travel log.
- `create_travel_log`: Create a travel log draft.
- `update_travel_log`: Update a travel log.
- `delete_travel_log`: Delete a travel log unless approved.
- `submit_travel_log`: Move travel log to submitted state.
- `approve_travel_log`: Approve a submitted travel log.
- `reject_travel_log`: Reject a submitted travel log.
- `get_travel_log_stats`: Aggregate travel log status counts.
- `get_overtime_entries`: Return overtime entries.
- `get_overtime_entry`: Return one overtime entry.
- `create_overtime_entry`: Create an overtime entry draft.
- `update_overtime_entry`: Update an overtime entry.
- `delete_overtime_entry`: Delete an overtime entry unless approved.
- `submit_overtime_entry`: Move overtime entry to submitted state.
- `approve_overtime_entry`: Approve a submitted overtime entry.
- `reject_overtime_entry`: Reject a submitted overtime entry.
- `get_overtime_stats`: Aggregate overtime status counts and hours.
- `get_statutory_ledgers`: Return statutory ledgers for EPF / ESIC tracking.
- `get_statutory_ledger`: Return one statutory ledger entry.
- `create_statutory_ledger`: Create a statutory ledger entry.
- `update_statutory_ledger`: Update a statutory ledger entry.
- `delete_statutory_ledger`: Delete a statutory ledger entry.
- `get_statutory_ledger_stats`: Aggregate statutory ledger counts and totals.
- `get_technician_visit_logs`: Return technician visit logs.
- `get_technician_visit_log`: Return one technician visit log.
- `create_technician_visit_log`: Create a technician visit log.
- `update_technician_visit_log`: Update a technician visit log.
- `delete_technician_visit_log`: Delete a technician visit log.
- `get_technician_visit_stats`: Aggregate technician visit counts.
- `get_employees`: Return the employee directory list.
- `get_employee`: Return a single employee with profile details, education, and experience.
- `get_employee_stats`: Return employee directory summary counts.
- `update_employee`: Update writable fields on an Employee record.
- `get_employee_family`: Return family/dependent info stored as Employee custom fields or child table.
- `get_employee_education`: Return education rows for an employee.
- `get_employee_experience`: Return work experience rows for an employee.

## Operations And Maintenance (47)

Source: `backend/gov_erp/gov_erp/om_api.py`

- `get_tickets`: Return tickets, optionally filtered.
- `get_ticket`: Return a single ticket with all actions.
- `create_ticket`: Create a ticket.
- `update_ticket`: Update a ticket.
- `delete_ticket`: Delete a ticket (only NEW tickets).
- `assign_ticket`: Assign a ticket to a user.
- `start_ticket`: Move ticket to IN_PROGRESS.
- `pause_ticket`: Pause a ticket (ON_HOLD).
- `resume_ticket`: Resume a paused ticket.
- `resolve_ticket`: Resolve a ticket.
- `close_ticket`: Close a resolved ticket.
- `escalate_ticket`: Escalate a ticket (increments escalation_level).
- `add_ticket_comment`: Add a comment action to a ticket.
- `get_ticket_stats`: Aggregate ticket stats.
- `get_sla_profiles`: Return SLA profiles.
- `get_sla_profile`: Return a single SLA profile.
- `create_sla_profile`: Create an SLA profile.
- `update_sla_profile`: Update an SLA profile.
- `delete_sla_profile`: Delete an SLA profile.
- `get_sla_timers`: Return SLA timers.
- `get_sla_timer`: Return a single SLA timer.
- `create_sla_timer`: Create an SLA timer for a ticket.
- `close_sla_timer`: Close an SLA timer and record whether SLAs were met.
- `pause_sla_timer`: Record a pause interval on the SLA timer.
- `resume_sla_timer`: Resume a paused SLA timer.
- `get_sla_penalty_rules`: Return SLA penalty rules.
- `create_sla_penalty_rule`: Create an SLA penalty rule.
- `update_sla_penalty_rule`: Update an SLA penalty rule.
- `delete_sla_penalty_rule`: Delete an SLA penalty rule.
- `get_sla_penalty_records`: Return SLA penalty records.
- `get_sla_penalty_record`: Return a single SLA penalty record.
- `create_sla_penalty_record`: Create a penalty record from an SLA breach.
- `approve_sla_penalty`: Approve an SLA penalty.
- `reject_sla_penalty`: Reject an SLA penalty.
- `waive_sla_penalty`: Waive an SLA penalty (requires Dept Head+).
- `get_sla_penalty_stats`: Aggregate SLA penalty stats across tickets.
- `get_rma_trackers`: Return RMA trackers.
- `get_rma_tracker`: Return a single RMA tracker.
- `create_rma_tracker`: Create an RMA tracker.
- `update_rma_tracker`: Update an RMA tracker.
- `convert_ticket_to_rma`: Create an RMA tracker from a helpdesk ticket.
- `delete_rma_tracker`: Delete an RMA tracker.
- `approve_rma`: Approve an RMA request.
- `reject_rma`: Reject an RMA request.
- `update_rma_status`: Advance an RMA through its lifecycle.
- `close_rma`: Close a completed RMA.
- `get_rma_stats`: Aggregate RMA stats.

## Dashboards And MIS (23)

Source: `backend/gov_erp/gov_erp/reporting_api.py`

- `get_finance_requests`: Return finance requests backed by GE EMD/PBG instruments.
- `approve_finance_request`: Approve a finance request by submitting the instrument for use.
- `deny_finance_request`: Mark a finance request as forfeited when it is not approved.
- `get_finance_request_stats`: Return aggregate counts and amounts for the finance request dashboard.
- `get_finance_mis`: Return finance request MIS rows with optional date filtering.
- `get_login_mis`: Return login/logout activity from Activity Log.
- `get_sales_mis`: Return tender ownership/status aggregation for the sales MIS page.
- `get_pending_approvals`: Return a lightweight cross-module pending approval inbox.
- `get_om_dashboard`: Aggregate O&M dashboard metrics.
- `get_accounts_dashboard`: Aggregate accounts dashboard metrics.
- `get_presales_dashboard`: Aggregate presales dashboard metrics.
- `get_execution_dashboard`: Aggregate execution dashboard metrics.
- `get_project_head_dashboard`: Aggregate project-head dashboard metrics.
- `get_project_manager_dashboard`: Aggregate project-manager dashboard metrics scoped to assigned projects.
- `get_engineering_head_dashboard`: Aggregate engineering-head dashboard metrics across design, surveys, and execution readiness.
- `get_procurement_dashboard`: Aggregate procurement dashboard metrics.
- `get_stores_dashboard`: Aggregate stores dashboard metrics.
- `get_executive_dashboard`: Aggregate executive dashboard metrics across modules.
- `get_pm_cockpit_summary`: Aggregated PM cockpit summary with DPRs, commissioning, and dependencies.
- `get_execution_summary`: Returns a unified execution/commissioning summary for the execution dashboard.
- `get_notification_center`: Returns a unified view of alerts, reminders, mentions, and due items.
- `mark_mention_read` (methods=POST): Mark a mention as read.
- `get_user_mentions`: Get mentions for the current user, optionally filtered by project.

## Accountability And Audit (11)

Source: `backend/gov_erp/gov_erp/accountability_api.py`

- `get_accountability_timeline`: Return the full accountability record + ordered event timeline for a tracked object.
- `get_accountability_record`: Return the live accountability snapshot (record only, no events) for a tracked object.
- `get_open_accountability_items`: Query open accountability items with optional filters.
- `get_overdue_accountability_items`: Return accountability records where due_date is in the past and status is open.
- `get_blocked_accountability_items`: Return accountability records that are currently blocked.
- `get_accountability_events_by_project`: Return all accountability events linked to a project, newest first.
- `get_accountability_dashboard_summary`: Director/RCA dashboard summary.
- `backfill_accountability_records`: Phase 9 migration helper.
- `backfill_derive_project`: Phase 8 migration: backfill linked_project on doctypes that derive it from
- `backfill_boq_context`: Phase 8 migration: backfill linked_project and linked_tender on GE BOQ rows.
- `get_legacy_data_report`: Phase 8 diagnostic: produce a summary of legacy rows that need attention.

