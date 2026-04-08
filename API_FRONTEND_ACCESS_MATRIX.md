# API Frontend Access Matrix

This document maps every backend API group to the frontend tab, subtab, button type, primary role, and flow responsibility that should expose it.

The mapping is based on the existing frontend route structure, module flow docs, and the current API catalog.

Legend:
- UI control = the button or surface that should trigger the API.
- Current frontend surface = the place where the API is currently expected to be exposed.
- For APIs without a dedicated screen yet, the API Access Center is used as the fallback surface until a native page is added.

## Core Session And Health

- Frontend tab: Settings
- Default subtab/page: System Utilities
- Primary roles: Admin, Superadmin
- Flow role: Session and system health utilities
- Current frontend surface: API Access Center / admin utilities

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_session_context | Settings | System Utilities | View/list page | Admin, Superadmin | Session and system health utilities |
| logout_current_session | Settings | System Utilities | Action button | Admin, Superadmin | Session and system health utilities |
| health_check | Settings | System Utilities | Action button | Admin, Superadmin | Session and system health utilities |

## System Operations

- Frontend tab: Settings
- Default subtab/page: System Operations
- Primary roles: Admin, Superadmin
- Flow role: Background jobs and reminders
- Current frontend surface: API Access Center / system ops

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_workspace_permissions | Settings | System Operations | View/list page | Admin, Superadmin | Background jobs and reminders |
| generate_system_reminders | Settings | System Operations | Action button | Admin, Superadmin | Background jobs and reminders |
| process_due_reminders | Settings | System Operations | Action button | Admin, Superadmin | Background jobs and reminders |

## Admin Masters

- Frontend tab: Settings
- Default subtab/page: Master Data
- Primary roles: Superadmin, Admin
- Flow role: Departments, designations, roles, users
- Current frontend surface: Settings pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_departments | Settings | Master Data | View/list page | Superadmin, Admin | Departments, designations, roles, users |
| create_department | Settings | Master Data | Create button / modal | Superadmin, Admin | Departments, designations, roles, users |
| toggle_department | Settings | Master Data | Toggle button | Superadmin, Admin | Departments, designations, roles, users |
| get_designations | Settings | Master Data | View/list page | Superadmin, Admin | Departments, designations, roles, users |
| create_designation | Settings | Master Data | Create button / modal | Superadmin, Admin | Departments, designations, roles, users |
| get_roles | Settings | Master Data | View/list page | Superadmin, Admin | Departments, designations, roles, users |
| create_role | Settings | Master Data | Create button / modal | Superadmin, Admin | Departments, designations, roles, users |
| toggle_role | Settings | Master Data | Toggle button | Superadmin, Admin | Departments, designations, roles, users |
| get_users | Settings | Master Data | View/list page | Superadmin, Admin | Departments, designations, roles, users |
| create_user | Settings | Master Data | Create button / modal | Superadmin, Admin | Departments, designations, roles, users |

## Alerts And Reminders

- Frontend tab: Notifications
- Default subtab/page: Reminder Drawer
- Primary roles: All roles
- Flow role: Alerts, reminders, assignments, comments
- Current frontend surface: Notifications + reminder UI

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_alerts | Notifications | Alerts | View/list page | All roles | Cross-workflow notification and nudging. |
| get_unread_alert_count | Notifications | Alerts | View/list page | All roles | Cross-workflow notification and nudging. |
| mark_alert_as_read | Notifications | Alerts | Mark action | All roles | Cross-workflow notification and nudging. |
| mark_all_alerts_read | Notifications | Alerts | Mark action | All roles | Cross-workflow notification and nudging. |
| create_user_reminder | Notifications | Reminders | Create button / modal | All roles | Cross-workflow notification and nudging. |
| get_reminders | Notifications | Reminders | View/list page | All roles | Cross-workflow notification and nudging. |
| update_reminder | Notifications | Reminders | Edit button / form modal | All roles | Cross-workflow notification and nudging. |
| snooze_reminder | Notifications | Reminders | Action button | All roles | Cross-workflow notification and nudging. |
| dismiss_reminder | Notifications | Reminders | Action button | All roles | Cross-workflow notification and nudging. |
| delete_reminder | Notifications | Reminders | Delete button / confirm modal | All roles | Cross-workflow notification and nudging. |
| count_missed_reminders | Notifications | Reminders | Action button | All roles | Cross-workflow notification and nudging. |
| add_record_comment | Notifications | Comments | Action button | All roles | Cross-workflow notification and nudging. |
| get_record_comments | Notifications | Comments | View/list page | All roles | Cross-workflow notification and nudging. |
| assign_to_record | Notifications | Notification Center | Assign button / modal | All roles | Cross-workflow notification and nudging. |
| get_record_assignments | Notifications | Assignments | View/list page | All roles | Cross-workflow notification and nudging. |

## ANDA Import

- Frontend tab: ANDA
- Default subtab/page: Import Console
- Primary roles: Presales Head, Admin
- Flow role: ANDA bulk import and validation
- Current frontend surface: API Access Center until dedicated UI lands

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| run_anda_import | ANDA | Import Console | Run/execute button | Presales Head, Admin | ANDA bulk import and validation |
| get_anda_import_logs | ANDA | Import Console | View/list page | Presales Head, Admin | ANDA bulk import and validation |
| get_anda_import_tabs | ANDA | Import Console | View/list page | Presales Head, Admin | ANDA bulk import and validation |
| load_anda_masters | ANDA | Import Console | Load/import action | Presales Head, Admin | ANDA bulk import and validation |
| check_anda_master_integrity | ANDA | Import Console | Check/validate action | Presales Head, Admin | ANDA bulk import and validation |
| run_anda_orchestrated_import | ANDA | Import Console | Run/execute button | Presales Head, Admin | ANDA bulk import and validation |
| get_anda_import_order | ANDA | Import Console | View/list page | Presales Head, Admin | ANDA bulk import and validation |

## Tendering And Presales

- Frontend tab: Pre-Sales
- Default subtab/page: Dashboard / Bids / In Process Bid / EMD Tracking
- Primary roles: Presales Head, Presales Executive, Department Head, Project Head
- Flow role: Tender intake, qualification, and conversion
- Current frontend surface: Pre-Sales pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_tenders | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| create_tender | Pre-Sales | Bids | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| update_tender | Pre-Sales | Bids | Edit button / form modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_approvals | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| submit_tender_approval | Pre-Sales | Bids | Submit button | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| approve_tender_approval | Pre-Sales | Bids | Approve button | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| reject_tender_approval | Pre-Sales | Bids | Reject button / reason modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| transition_tender_status | Pre-Sales | Bids | Action button | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| delete_tender | Pre-Sales | Bids | Delete button / confirm modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_stats | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| convert_tender_to_project | Pre-Sales | Bids | Action button | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_organizations | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| create_tender_organization | Pre-Sales | Bids | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| delete_tender_organization | Pre-Sales | Bids | Delete button / confirm modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_parties | Pre-Sales | Tender Detail | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| create_party | Pre-Sales | Master Records | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| update_party | Pre-Sales | Master Records | Edit button / form modal | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| delete_party | Pre-Sales | Master Records | Delete button / confirm modal | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| get_organizations | Pre-Sales | Master Records | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| create_organization | Pre-Sales | Master Records | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| get_emd_pbg_instruments | Pre-Sales | EMD Tracking | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Tracks bid security instruments. |
| create_emd_pbg_instrument | Pre-Sales | EMD Tracking | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Tracks bid security instruments. |
| get_tender_results | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_result | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| create_tender_result | Pre-Sales | Bids | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| update_tender_result | Pre-Sales | Bids | Edit button / form modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| delete_tender_result | Pre-Sales | Bids | Delete button / confirm modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_result_stats | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_checklists | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_checklist | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| create_tender_checklist | Pre-Sales | Bids | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| update_tender_checklist | Pre-Sales | Bids | Edit button / form modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| delete_tender_checklist | Pre-Sales | Bids | Delete button / confirm modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_reminders | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_reminder | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| create_tender_reminder | Pre-Sales | Bids | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| update_tender_reminder | Pre-Sales | Bids | Edit button / form modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| delete_tender_reminder | Pre-Sales | Bids | Delete button / confirm modal | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| mark_tender_reminder_sent | Pre-Sales | Bids | Mark action | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| dismiss_tender_reminder | Pre-Sales | Bids | Action button | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_tender_reminder_stats | Pre-Sales | Bids | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Manages tender intake, review, and conversion. |
| get_competitors | Pre-Sales | Master Records | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| get_competitor | Pre-Sales | Master Records | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| create_competitor | Pre-Sales | Master Records | Create button / modal | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| update_competitor | Pre-Sales | Master Records | Edit button / form modal | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| delete_competitor | Pre-Sales | Master Records | Delete button / confirm modal | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| get_competitor_stats | Pre-Sales | Master Records | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Supports presales tender progression. |
| /api/pre-sales/in-process-bids | Pre-Sales | In Process Bid | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Won bids with tenure tracking, closure countdown, and completion readiness. |
| /api/pre-sales/cancel-bids | Pre-Sales | Cancel Bid | View/list page | Presales Head, Presales Executive, Department Head, Project Head | Cancelled bids and rejection rationale tracking. |

## Survey

- Frontend tab: Survey
- Default subtab/page: Survey Records
- Primary roles: Presales, Engineer, Project Manager, Project Head
- Flow role: Site survey and completion gate
- Current frontend surface: Survey pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_surveys | Survey | Survey Records | View/list page | Presales, Engineer, Project Manager, Project Head | Captures site facts before BOQ and execution. |
| get_survey | Survey | Survey Records | View/list page | Presales, Engineer, Project Manager, Project Head | Captures site facts before BOQ and execution. |
| create_survey | Survey | Survey Records | Create button / modal | Presales, Engineer, Project Manager, Project Head | Captures site facts before BOQ and execution. |
| update_survey | Survey | Survey Records | Edit button / form modal | Presales, Engineer, Project Manager, Project Head | Captures site facts before BOQ and execution. |
| delete_survey | Survey | Survey Records | Delete button / confirm modal | Presales, Engineer, Project Manager, Project Head | Captures site facts before BOQ and execution. |
| get_survey_stats | Survey | Survey Records | View/list page | Presales, Engineer, Project Manager, Project Head | Captures site facts before BOQ and execution. |
| check_survey_complete | Survey | Survey Records | Check/validate action | Presales, Engineer, Project Manager, Project Head | Captures site facts before BOQ and execution. |
| backfill_survey_context | Survey | Survey Records | Action button | Presales, Engineer, Project Manager, Project Head | Captures site facts before BOQ and execution. |

## Procurement

- Frontend tab: Procurement
- Default subtab/page: Vendor Comparison / Indents / Purchase Orders
- Primary roles: Procurement Manager, Purchase, Project Manager
- Flow role: Vendor comparison, RFQ, PO, approvals
- Current frontend surface: Procurement pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_boqs | Procurement | Procurement Overview | View/list page | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| get_boq | Procurement | Procurement Overview | View/list page | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| create_boq | Procurement | Procurement Overview | Create button / modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| update_boq | Procurement | Procurement Overview | Edit button / form modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| delete_boq | Procurement | Procurement Overview | Delete button / confirm modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| submit_boq_for_approval | Procurement | Procurement Overview | Submit button | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| approve_boq | Procurement | Procurement Overview | Approve button | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| reject_boq | Procurement | Procurement Overview | Reject button / reason modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| revise_boq | Procurement | Procurement Overview | Action button | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| get_boq_stats | Procurement | Procurement Overview | View/list page | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| get_cost_sheets | Procurement | Procurement Overview | View/list page | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| get_cost_sheet | Procurement | Procurement Overview | View/list page | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| create_cost_sheet | Procurement | Procurement Overview | Create button / modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| update_cost_sheet | Procurement | Procurement Overview | Edit button / form modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| delete_cost_sheet | Procurement | Procurement Overview | Delete button / confirm modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| submit_cost_sheet_for_approval | Procurement | Procurement Overview | Submit button | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| approve_cost_sheet | Procurement | Procurement Overview | Approve button | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| reject_cost_sheet | Procurement | Procurement Overview | Reject button / reason modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| revise_cost_sheet | Procurement | Procurement Overview | Action button | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| get_cost_sheet_stats | Procurement | Procurement Overview | View/list page | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| create_cost_sheet_from_boq | Procurement | Procurement Overview | Create button / modal | Procurement Manager, Purchase, Project Manager | Procurement coordination. |
| get_vendor_comparisons | Procurement | Vendor Comparison | View/list page | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| get_vendor_comparison | Procurement | Vendor Comparison | View/list page | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| create_vendor_comparison | Procurement | Vendor Comparison | Create button / modal | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| update_vendor_comparison | Procurement | Vendor Comparison | Edit button / form modal | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| delete_vendor_comparison | Procurement | Vendor Comparison | Delete button / confirm modal | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| submit_vendor_comparison_for_approval | Procurement | Vendor Comparison | Submit button | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| approve_vendor_comparison | Procurement | Vendor Comparison | Approve button | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| reject_vendor_comparison | Procurement | Vendor Comparison | Reject button / reason modal | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| revise_vendor_comparison | Procurement | Vendor Comparison | Action button | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| get_vendor_comparison_stats | Procurement | Vendor Comparison | View/list page | Procurement Manager, Purchase, Project Manager | Compares quotations and supports PO selection. |
| create_po_from_comparison | Procurement | Purchase Orders | Create button / modal | Procurement Manager, Purchase, Project Manager | Converts approved procurement into PO. |

## Stores And Inventory

- Frontend tab: Inventory
- Default subtab/page: GRN / Dispatch Challans / Stock Position / Stock Aging
- Primary roles: Store Manager, Stores Logistics Head, Purchase
- Flow role: Receipt, stock, dispatch, and traceability
- Current frontend surface: Inventory pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_inventory_reference_schema | Inventory | Inventory Overview | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_dispatch_challans | Inventory | Dispatch Challans | View/list page | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| get_dispatch_challan | Inventory | Dispatch Challans | View/list page | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| create_dispatch_challan | Inventory | Dispatch Challans | Create button / modal | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| update_dispatch_challan | Inventory | Dispatch Challans | Edit button / form modal | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| delete_dispatch_challan | Inventory | Dispatch Challans | Delete button / confirm modal | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| submit_dispatch_challan_for_approval | Inventory | Dispatch Challans | Submit button | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| approve_dispatch_challan | Inventory | Dispatch Challans | Approve button | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| reject_dispatch_challan | Inventory | Dispatch Challans | Reject button / reason modal | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| mark_dispatch_challan_dispatched | Inventory | Dispatch Challans | Mark action | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| get_dispatch_challan_stats | Inventory | Dispatch Challans | View/list page | Store Manager, Stores Logistics Head, Purchase | Moves material out to project/site. |
| get_store_stock_snapshot | Inventory | Inventory Overview | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_indents | Inventory | Indents | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_indent | Inventory | Indents | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| create_indent | Inventory | Indents | Create button / modal | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_project_indents | Inventory | Indents | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| create_project_indent | Inventory | Indents | Create button / modal | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_indent_stats | Inventory | Indents | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| submit_indent | Inventory | Indents | Submit button | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| acknowledge_indent | Inventory | Indents | Action button | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| accept_indent | Inventory | Indents | Action button | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| reject_indent | Inventory | Indents | Reject button / reason modal | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| return_indent | Inventory | Indents | Action button | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| escalate_indent | Inventory | Indents | Action button | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_purchase_orders | Inventory | Inventory Overview | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_purchase_order | Inventory | Inventory Overview | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_po_stats | Inventory | Inventory Overview | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| create_purchase_order | Inventory | Inventory Overview | Create button / modal | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| update_purchase_order | Inventory | Inventory Overview | Edit button / form modal | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| delete_purchase_order | Inventory | Inventory Overview | Delete button / confirm modal | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| submit_purchase_order | Inventory | Inventory Overview | Submit button | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| cancel_purchase_order | Inventory | Inventory Overview | Cancel button / confirm modal | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_po_payment_terms | Inventory | Inventory Overview | View/list page | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| save_po_payment_terms | Inventory | Inventory Overview | Action button | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| approve_po_payment_terms | Inventory | Inventory Overview | Approve button | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| reject_po_payment_terms | Inventory | Inventory Overview | Reject button / reason modal | Store Manager, Stores Logistics Head, Purchase | Material movement and stock control. |
| get_grns | Inventory | GRN | View/list page | Store Manager, Stores Logistics Head, Purchase | Confirms receipt of material into stock. |
| get_grn | Inventory | GRN | View/list page | Store Manager, Stores Logistics Head, Purchase | Confirms receipt of material into stock. |
| create_grn | Inventory | GRN | Create button / modal | Store Manager, Stores Logistics Head, Purchase | Confirms receipt of material into stock. |
| get_grn_stats | Inventory | GRN | View/list page | Store Manager, Stores Logistics Head, Purchase | Confirms receipt of material into stock. |
| get_stock_position | Inventory | Stock Position | View/list page | Store Manager, Stores Logistics Head, Purchase | Shows inventory health and ageing. |
| get_stock_aging | Inventory | Stock Aging | View/list page | Store Manager, Stores Logistics Head, Purchase | Shows inventory health and ageing. |

## Finance And Commercial

- Frontend tab: Finance
- Default subtab/page: Commercial / Estimates / Proformas / Billing / Receipts / Retention / Penalties / Costing / Follow Ups
- Primary roles: Accounts, Project Manager, Project Head
- Flow role: Commercial-to-cash, retention, penalties, and costing
- Current frontend surface: Finance pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_invoices | Finance | Billing | View/list page | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| get_invoice | Finance | Billing | View/list page | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| create_invoice | Finance | Billing | Create button / modal | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| update_invoice | Finance | Billing | Edit button / form modal | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| delete_invoice | Finance | Billing | Delete button / confirm modal | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| submit_invoice | Finance | Billing | Submit button | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| approve_invoice | Finance | Billing | Approve button | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| reject_invoice | Finance | Billing | Reject button / reason modal | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| mark_invoice_paid | Finance | Billing | Mark action | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| cancel_invoice | Finance | Billing | Cancel button / confirm modal | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| get_invoice_stats | Finance | Billing | View/list page | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| get_payment_receipts | Finance | Payment Receipts | View/list page | Accounts, Project Manager, Project Head | Records incoming cash and reconciles invoices. |
| get_payment_receipt | Finance | Payment Receipts | View/list page | Accounts, Project Manager, Project Head | Records incoming cash and reconciles invoices. |
| create_payment_receipt | Finance | Payment Receipts | Create button / modal | Accounts, Project Manager, Project Head | Records incoming cash and reconciles invoices. |
| update_payment_receipt | Finance | Payment Receipts | Edit button / form modal | Accounts, Project Manager, Project Head | Records incoming cash and reconciles invoices. |
| delete_payment_receipt | Finance | Payment Receipts | Delete button / confirm modal | Accounts, Project Manager, Project Head | Records incoming cash and reconciles invoices. |
| get_payment_receipt_stats | Finance | Payment Receipts | View/list page | Accounts, Project Manager, Project Head | Records incoming cash and reconciles invoices. |
| reconcile_invoice_payments | Finance | Billing | Action button | Accounts, Project Manager, Project Head | Raises billing demand and tracks approval/payment status. |
| get_retention_ledgers | Finance | Retention Ledger | View/list page | Accounts, Project Manager, Project Head | Tracks holdback and release conditions. |
| get_retention_ledger | Finance | Retention Ledger | View/list page | Accounts, Project Manager, Project Head | Tracks holdback and release conditions. |
| create_retention_ledger | Finance | Retention Ledger | Create button / modal | Accounts, Project Manager, Project Head | Tracks holdback and release conditions. |
| update_retention_ledger | Finance | Retention Ledger | Edit button / form modal | Accounts, Project Manager, Project Head | Tracks holdback and release conditions. |
| delete_retention_ledger | Finance | Retention Ledger | Delete button / confirm modal | Accounts, Project Manager, Project Head | Tracks holdback and release conditions. |
| release_retention | Finance | Retention Ledger | Release button | Accounts, Project Manager, Project Head | Tracks holdback and release conditions. |
| get_retention_stats | Finance | Retention Ledger | View/list page | Accounts, Project Manager, Project Head | Tracks holdback and release conditions. |
| get_penalty_deductions | Finance | Penalty Deductions | View/list page | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| get_penalty_deduction | Finance | Penalty Deductions | View/list page | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| create_penalty_deduction | Finance | Penalty Deductions | Create button / modal | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| update_penalty_deduction | Finance | Penalty Deductions | Edit button / form modal | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| delete_penalty_deduction | Finance | Penalty Deductions | Delete button / confirm modal | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| approve_penalty_deduction | Finance | Penalty Deductions | Approve button | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| apply_penalty_deduction | Finance | Penalty Deductions | Action button | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| reverse_penalty_deduction | Finance | Penalty Deductions | Action button | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| get_penalty_stats | Finance | Penalty Deductions | View/list page | Accounts, Project Manager, Project Head | Captures deductions and applies them to invoices/payments. |
| get_petty_cash_entries | Finance | Finance Overview | View/list page | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| get_petty_cash_entry | Finance | Finance Overview | View/list page | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| create_petty_cash_entry | Finance | Finance Overview | Create button / modal | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| update_petty_cash_entry | Finance | Finance Overview | Edit button / form modal | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| approve_petty_cash_entry | Finance | Finance Overview | Approve button | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| reject_petty_cash_entry | Finance | Finance Overview | Reject button / reason modal | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| delete_petty_cash_entry | Finance | Finance Overview | Delete button / confirm modal | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| submit_petty_cash_to_ph | Finance | Finance Overview | Submit button | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| create_petty_cash_fund_request | Finance | Finance Overview | Create button / modal | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| get_petty_cash_fund_requests | Finance | Finance Overview | View/list page | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| submit_po_to_ph | Finance | Finance Overview | Submit button | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| submit_rma_po_to_ph | Finance | Finance Overview | Submit button | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| get_ph_approval_items | Finance | Project Head Approval | View/list page | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| get_ph_approval_item | Finance | Project Head Approval | View/list page | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| ph_approve_item | Finance | Finance Overview | Action button | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| ph_reject_item | Finance | Finance Overview | Action button | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| get_costing_queue | Finance | Costing Queue | View/list page | Accounts, Project Manager, Project Head | Moves estimated cost into approved margin-safe selling price. |
| get_costing_queue_item | Finance | Costing Queue | View/list page | Accounts, Project Manager, Project Head | Moves estimated cost into approved margin-safe selling price. |
| costing_release_item | Finance | Costing | Action button | Accounts, Project Manager, Project Head | Moves estimated cost into approved margin-safe selling price. |
| costing_hold_item | Finance | Costing | Action button | Accounts, Project Manager, Project Head | Moves estimated cost into approved margin-safe selling price. |
| costing_reject_item | Finance | Costing | Action button | Accounts, Project Manager, Project Head | Moves estimated cost into approved margin-safe selling price. |
| get_project_inventory_records | Finance | Project Inventory / Consumption | View/list page | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| record_project_inventory_receipt | Finance | Project Inventory / Consumption | Action button | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| get_material_consumption_reports | Finance | Project Inventory / Consumption | View/list page | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| create_material_consumption_report | Finance | Project Inventory / Consumption | Create button / modal | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| get_project_receiving_summary | Finance | Finance Overview | View/list page | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |
| get_estimates | Finance | Estimates | View/list page | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| get_estimate | Finance | Estimates | View/list page | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| create_estimate | Finance | Estimates | Create button / modal | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| update_estimate | Finance | Estimates | Edit button / form modal | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| delete_estimate | Finance | Estimates | Delete button / confirm modal | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| submit_estimate | Finance | Estimates | Submit button | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| approve_estimate | Finance | Estimates | Approve button | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| reject_estimate | Finance | Estimates | Reject button / reason modal | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| convert_estimate_to_proforma | Finance | Estimates | Action button | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| get_estimate_stats | Finance | Estimates | View/list page | Accounts, Project Manager, Project Head | Creates and approves quotations before conversion to proforma. |
| get_proforma_invoices | Finance | Proformas | View/list page | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| get_proforma_invoice | Finance | Proformas | View/list page | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| create_proforma_invoice | Finance | Proformas | Create button / modal | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| update_proforma_invoice | Finance | Proformas | Edit button / form modal | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| delete_proforma_invoice | Finance | Proformas | Delete button / confirm modal | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| submit_proforma_invoice | Finance | Proformas | Submit button | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| approve_proforma_invoice | Finance | Proformas | Approve button | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| cancel_proforma_invoice | Finance | Proformas | Cancel button / confirm modal | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| convert_proforma_to_invoice | Finance | Proformas | Action button | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| get_proforma_invoice_stats | Finance | Proformas | View/list page | Accounts, Project Manager, Project Head | Converts estimate value into invoicing-ready commercial docs. |
| get_payment_follow_ups | Finance | Follow Ups | View/list page | Accounts, Project Manager, Project Head | Tracks recovery and pending collection actions. |
| create_payment_follow_up | Finance | Follow Ups | Create button / modal | Accounts, Project Manager, Project Head | Tracks recovery and pending collection actions. |
| update_payment_follow_up | Finance | Follow Ups | Edit button / form modal | Accounts, Project Manager, Project Head | Tracks recovery and pending collection actions. |
| delete_payment_follow_up | Finance | Follow Ups | Delete button / confirm modal | Accounts, Project Manager, Project Head | Tracks recovery and pending collection actions. |
| close_payment_follow_up | Finance | Follow Ups | Action button | Accounts, Project Manager, Project Head | Tracks recovery and pending collection actions. |
| escalate_payment_follow_up | Finance | Follow Ups | Action button | Accounts, Project Manager, Project Head | Tracks recovery and pending collection actions. |
| get_payment_follow_up_stats | Finance | Follow Ups | View/list page | Accounts, Project Manager, Project Head | Tracks recovery and pending collection actions. |
| get_customer_statement | Finance | Customer Statement | View/list page | Accounts, Project Manager, Project Head | Provides customer-wise ledger visibility. |
| get_commercial_comments | Finance | Commercial Hub | View/list page | Accounts, Project Manager, Project Head | Commercial document coordination and bookkeeping demo support. |
| add_commercial_comment | Finance | Commercial Hub | Action button | Accounts, Project Manager, Project Head | Commercial document coordination and bookkeeping demo support. |
| get_commercial_documents | Finance | Commercial Hub | View/list page | Accounts, Project Manager, Project Head | Commercial document coordination and bookkeeping demo support. |
| create_commercial_document | Finance | Commercial Hub | Create button / modal | Accounts, Project Manager, Project Head | Commercial document coordination and bookkeeping demo support. |
| get_receivable_aging | Finance | Receivable Aging | View/list page | Accounts, Project Manager, Project Head | Surfaces overdue customer balances. |
| seed_bookkeeping_demo | Finance | Finance Overview | Action button | Accounts, Project Manager, Project Head | Finance and commercial workflow support. |

## Project Spine And Workspace

- Frontend tab: Projects
- Default subtab/page: Workspace / Tasks / Notes / Files / Issues / Requests
- Primary roles: Project Manager, Project Head, Department Head
- Flow role: Project governance and work coordination
- Current frontend surface: Project workspace pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_project | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| create_project | Projects | Workspace Overview | Create button / modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| add_project_sites | Projects | Workspace Overview | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| update_project | Projects | Workspace Overview | Edit button / form modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| delete_project | Projects | Workspace Overview | Delete button / confirm modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_spine_list | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_spine_summary | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_spine_detail | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_workflow_state | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| submit_project_stage_for_approval | Projects | Workspace Overview | Submit button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| approve_project_stage | Projects | Workspace Overview | Approve button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| reject_project_stage | Projects | Workspace Overview | Reject button / reason modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| restart_project_stage | Projects | Workspace Overview | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| override_project_stage | Projects | Workspace Overview | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_department_spine_view | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| toggle_project_favorite | Projects | Workspace Overview | Toggle button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_favorites | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_notes | Projects | Notes | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| create_project_note | Projects | Notes | Create button / modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| update_project_note | Projects | Notes | Edit button / form modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| delete_project_note | Projects | Notes | Delete button / confirm modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_tasks | Projects | Tasks | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| create_project_task | Projects | Tasks | Create button / modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| update_project_task | Projects | Tasks | Edit button / form modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| delete_project_task | Projects | Tasks | Delete button / confirm modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| reorder_project_tasks | Projects | Tasks | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| update_task_status | Projects | Tasks | Edit button / form modal | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_task_summary | Projects | Tasks | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| clone_project | Projects | Workspace Overview | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_timesheet_summary | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_activity | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_site_spine_detail | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| advance_site_stage | Projects | Workspace Overview | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| toggle_site_blocked | Projects | Workspace Overview | Toggle button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| refresh_project_spine | Projects | Workspace Overview | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_closeout_items | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| get_project_closeout_eligibility | Projects | Workspace Overview | View/list page | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| issue_closeout_certificate | Projects | Issues | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| revoke_closeout_certificate | Projects | Workspace Overview | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |
| complete_exit_management_kt | Projects | Workspace Overview | Action button | Project Manager, Project Head, Department Head | Project control, coordination, and escalation workflow. |

## Execution And Commissioning

- Frontend tab: Execution
- Default subtab/page: Projects / Dependencies / Project Structure / Commissioning / Drawings / DPR
- Primary roles: Project Manager, Engineering Head, Engineer, Field Technician
- Flow role: Delivery execution and commissioning gates
- Current frontend surface: Execution and engineering pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| download_site_bulk_upload_template | Execution | Sites | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| bulk_upload_sites | Execution | Sites | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| get_sites | Execution | Sites | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| get_site | Execution | Sites | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| create_site | Execution | Sites | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| update_site | Execution | Sites | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| delete_site | Execution | Sites | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| get_milestones | Execution | Milestones | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_milestone | Execution | Milestones | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_milestone | Execution | Milestones | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_milestone | Execution | Milestones | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_milestone | Execution | Milestones | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| sync_site_milestone_progress | Execution | Sites | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| get_dependency_rules | Execution | Dependencies | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Blocks or unlocks execution by prerequisite checks. |
| create_dependency_rule | Execution | Dependencies | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Blocks or unlocks execution by prerequisite checks. |
| update_dependency_rule | Execution | Dependencies | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Blocks or unlocks execution by prerequisite checks. |
| delete_dependency_rule | Execution | Dependencies | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Blocks or unlocks execution by prerequisite checks. |
| get_dependency_overrides | Execution | Dependencies | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Blocks or unlocks execution by prerequisite checks. |
| create_dependency_override | Execution | Dependencies | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Blocks or unlocks execution by prerequisite checks. |
| approve_dependency_override | Execution | Dependencies | Approve button | Project Manager, Engineering Head, Engineer, Field Technician | Blocks or unlocks execution by prerequisite checks. |
| reject_dependency_override | Execution | Dependencies | Reject button / reason modal | Project Manager, Engineering Head, Engineer, Field Technician | Blocks or unlocks execution by prerequisite checks. |
| evaluate_task_dependencies | Execution | Execution Overview | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_dprs | Execution | DPR | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| get_dpr | Execution | DPR | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| create_dpr | Execution | DPR | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| update_dpr | Execution | DPR | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| delete_dpr | Execution | DPR | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| submit_dpr | Execution | DPR | Submit button | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| approve_dpr | Execution | DPR | Approve button | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| reject_dpr | Execution | DPR | Reject button / reason modal | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| get_dpr_stats | Execution | DPR | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Daily progress reporting and signoff. |
| get_project_team_members | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_project_team_member | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_project_team_member | Execution | Execution Overview | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_project_team_member | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_project_team_member | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_project_document | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_document_folder | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_document_folder | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_project_document | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_project_document | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_drawings | Execution | Drawings | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Reviews technical drawings and approvals. |
| get_drawing | Execution | Drawings | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Reviews technical drawings and approvals. |
| create_drawing | Execution | Drawings | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Reviews technical drawings and approvals. |
| update_drawing | Execution | Drawings | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Reviews technical drawings and approvals. |
| delete_drawing | Execution | Drawings | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Reviews technical drawings and approvals. |
| get_technical_deviations | Execution | Technical Deviations | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| get_technical_deviation | Execution | Technical Deviations | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| create_technical_deviation | Execution | Technical Deviations | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| update_technical_deviation | Execution | Technical Deviations | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| delete_technical_deviation | Execution | Technical Deviations | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| get_change_requests | Execution | Change Requests | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| get_change_request | Execution | Change Requests | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| create_change_request | Execution | Change Requests | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| update_change_request | Execution | Change Requests | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| delete_change_request | Execution | Change Requests | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| get_device_registers | Execution | Devices | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_device_register | Execution | Devices | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_device_register | Execution | Devices | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_device_register | Execution | Devices | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_device_register | Execution | Devices | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_ip_pools | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_ip_pool | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_ip_pool | Execution | Execution Overview | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_ip_pool | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_ip_pool | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_ip_allocations | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_ip_allocation | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_ip_allocation | Execution | Execution Overview | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_ip_allocation | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_ip_allocation | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_commissioning_checklists | Execution | Commissioning | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| get_commissioning_checklist | Execution | Commissioning | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| create_commissioning_checklist | Execution | Commissioning | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| update_commissioning_checklist | Execution | Commissioning | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| delete_commissioning_checklist | Execution | Commissioning | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| get_test_reports | Execution | Test Reports | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_test_report | Execution | Test Reports | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_test_report | Execution | Test Reports | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_test_report | Execution | Test Reports | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_test_report | Execution | Test Reports | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_client_signoffs | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_client_signoff | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_client_signoff | Execution | Execution Overview | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_client_signoff | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_client_signoff | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_comm_logs | Execution | Communication Logs | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_comm_log | Execution | Communication Logs | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_comm_log | Execution | Communication Logs | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_comm_log | Execution | Communication Logs | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_comm_log | Execution | Communication Logs | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_project_assets | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_project_asset | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_project_asset | Execution | Execution Overview | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_project_asset | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_project_asset | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_manpower_logs | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_manpower_log | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_manpower_log | Execution | Execution Overview | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_manpower_log | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_manpower_log | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_manpower_summary | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_staffing_assignments | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_staffing_assignment | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_staffing_assignment | Execution | Execution Overview | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_staffing_assignment | Execution | Execution Overview | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_staffing_assignment | Execution | Execution Overview | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| end_staffing_assignment | Execution | Execution Overview | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_staffing_summary | Execution | Execution Overview | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_device_uptime_logs | Execution | Devices | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_device_uptime_log | Execution | Devices | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| create_device_uptime_log | Execution | Devices | Create button / modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| update_device_uptime_log | Execution | Devices | Edit button / form modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| delete_device_uptime_log | Execution | Devices | Delete button / confirm modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| get_site_uptime_summary | Execution | Sites | View/list page | Project Manager, Engineering Head, Engineer, Field Technician | Advances site lifecycle state. |
| approve_technical_deviation | Execution | Technical Deviations | Approve button | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| reject_technical_deviation | Execution | Technical Deviations | Reject button / reason modal | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| close_technical_deviation | Execution | Technical Deviations | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| submit_change_request | Execution | Change Requests | Submit button | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| approve_change_request | Execution | Change Requests | Approve button | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| reject_change_request | Execution | Change Requests | Reject button / reason modal | Project Manager, Engineering Head, Engineer, Field Technician | Records technical exceptions and corrective paths. |
| approve_test_report | Execution | Test Reports | Approve button | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| reject_test_report | Execution | Test Reports | Reject button / reason modal | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| commission_device | Execution | Commissioning | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| mark_device_faulty | Execution | Devices | Mark action | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| decommission_device | Execution | Commissioning | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| release_ip_allocation | Execution | Execution Overview | Release button | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| start_commissioning_checklist | Execution | Commissioning | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| complete_commissioning_checklist | Execution | Commissioning | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Completes commissioning and device readiness. |
| sign_client_signoff | Execution | Execution Overview | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| approve_client_signoff | Execution | Execution Overview | Approve button | Project Manager, Engineering Head, Engineer, Field Technician | Execution control and commissioning. |
| submit_drawing | Execution | Drawings | Submit button | Project Manager, Engineering Head, Engineer, Field Technician | Reviews technical drawings and approvals. |
| approve_drawing | Execution | Drawings | Approve button | Project Manager, Engineering Head, Engineer, Field Technician | Reviews technical drawings and approvals. |
| supersede_drawing | Execution | Drawings | Action button | Project Manager, Engineering Head, Engineer, Field Technician | Reviews technical drawings and approvals. |

## DMS And Dossier

- Frontend tab: Documents
- Default subtab/page: Folders / Project Documents / Dossier
- Primary roles: Project Manager, Engineer, Admin
- Flow role: Document lifecycle, versioning, completeness
- Current frontend surface: Documents / Dossier pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_documents | Documents | Documents | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| get_project_documents | Documents | Documents | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| get_document_folders | Documents | Folders | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| create_document_folder | Documents | Folders | Create button / modal | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| upload_project_document | Documents | Documents | Upload button / file input | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| update_document_status | Documents | Documents | Edit button / form modal | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| delete_uploaded_project_file | Documents | Documents | Delete button / confirm modal | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| get_document_versions | Documents | Document Versions | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| get_expiring_documents | Documents | Documents | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| get_document_requirements | Documents | Document Requirements | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| check_stage_document_completeness | Documents | Document Requirements | Check/validate action | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| get_project_dossier | Documents | Dossier | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| get_site_dossier | Documents | Dossier | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| get_record_documents | Documents | Documents | View/list page | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |
| check_progression_gate | Documents | Document Overview | Check/validate action | Project Manager, Engineer, Admin | Document completeness, versioning, and submission evidence. |

## PM Workspace

- Frontend tab: Project Manager
- Default subtab/page: Requests / Inventory / DPR / Petty Cash
- Primary roles: Project Manager
- Flow role: PM operations and escalation handling
- Current frontend surface: Project manager pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_project_issues | Project Manager | Issues | View/list page | Project Manager | Project control, coordination, and escalation workflow. |
| get_project_issue | Project Manager | Issues | View/list page | Project Manager | Project control, coordination, and escalation workflow. |
| create_project_issue | Project Manager | Issues | Create button / modal | Project Manager | Project control, coordination, and escalation workflow. |
| update_project_issue | Project Manager | Issues | Edit button / form modal | Project Manager | Project control, coordination, and escalation workflow. |
| delete_project_issue | Project Manager | Issues | Delete button / confirm modal | Project Manager | Project control, coordination, and escalation workflow. |
| get_pm_central_status | Project Manager | Workspace Overview | View/list page | Project Manager | Project control, coordination, and escalation workflow. |
| get_pm_requests | Project Manager | Requests | View/list page | Project Manager | Project control, coordination, and escalation workflow. |
| get_pm_request | Project Manager | Requests | View/list page | Project Manager | Project control, coordination, and escalation workflow. |
| create_pm_request | Project Manager | Requests | Create button / modal | Project Manager | Project control, coordination, and escalation workflow. |
| update_pm_request | Project Manager | Requests | Edit button / form modal | Project Manager | Project control, coordination, and escalation workflow. |
| submit_pm_request | Project Manager | Requests | Submit button | Project Manager | Project control, coordination, and escalation workflow. |
| approve_pm_request | Project Manager | Requests | Approve button | Project Manager | Project control, coordination, and escalation workflow. |
| reject_pm_request | Project Manager | Requests | Reject button / reason modal | Project Manager | Project control, coordination, and escalation workflow. |
| withdraw_pm_request | Project Manager | Requests | Action button | Project Manager | Project control, coordination, and escalation workflow. |
| delete_pm_request | Project Manager | Requests | Delete button / confirm modal | Project Manager | Project control, coordination, and escalation workflow. |

## HR

- Frontend tab: HR
- Default subtab/page: Employees / Attendance / Leave / Onboarding / Overtime / Reports
- Primary roles: HR Manager, Project Manager, Department Head
- Flow role: Human resources and manpower tracking
- Current frontend surface: HR pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_onboardings | HR | Onboarding | View/list page | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| get_onboarding | HR | Onboarding | View/list page | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| create_onboarding | HR | Onboarding | Create button / modal | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| update_onboarding | HR | Onboarding | Edit button / form modal | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| delete_onboarding | HR | Onboarding | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| submit_onboarding | HR | Onboarding | Submit button | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| review_onboarding | HR | Onboarding | Action button | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| return_onboarding_to_submitted | HR | Onboarding | Action button | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| approve_onboarding | HR | Onboarding | Approve button | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| reject_onboarding | HR | Onboarding | Reject button / reason modal | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| reopen_onboarding_draft | HR | Onboarding | Action button | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| preview_onboarding_employee_mapping | HR | Employees | Action button | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |
| map_onboarding_to_employee | HR | Employees | Action button | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |
| get_onboarding_stats | HR | Onboarding | View/list page | HR Manager, Project Manager, Department Head | Brings new joiners into the workspace. |
| get_attendance_logs | HR | Attendance | View/list page | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| get_attendance_log | HR | Attendance | View/list page | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| create_attendance_log | HR | Attendance | Create button / modal | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| update_attendance_log | HR | Attendance | Edit button / form modal | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| delete_attendance_log | HR | Attendance | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| get_attendance_stats | HR | Attendance | View/list page | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| get_leave_types | HR | Leave Applications | View/list page | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| create_leave_type | HR | Leave Applications | Create button / modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| update_leave_type | HR | Leave Applications | Edit button / form modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| delete_leave_type | HR | Leave Applications | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| get_leave_allocations | HR | Leave Applications | View/list page | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| create_leave_allocation | HR | Leave Applications | Create button / modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| update_leave_allocation | HR | Leave Applications | Edit button / form modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| delete_leave_allocation | HR | Leave Applications | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| get_leave_applications | HR | Leave Applications | View/list page | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| get_leave_application | HR | Leave Applications | View/list page | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| create_leave_application | HR | Leave Applications | Create button / modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| update_leave_application | HR | Leave Applications | Edit button / form modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| delete_leave_application | HR | Leave Applications | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| submit_leave_application | HR | Leave Applications | Submit button | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| approve_leave_application | HR | Leave Applications | Approve button | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| reject_leave_application | HR | Leave Applications | Reject button / reason modal | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| reopen_leave_application | HR | Leave Applications | Action button | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| get_leave_balances | HR | Leave Applications | View/list page | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| get_holiday_lists | HR | HR Overview | View/list page | HR Manager, Project Manager, Department Head | HR manpower management. |
| get_holiday_list | HR | HR Overview | View/list page | HR Manager, Project Manager, Department Head | HR manpower management. |
| get_leave_calendar | HR | Leave Applications | View/list page | HR Manager, Project Manager, Department Head | Manages leave request, approval, and balance flow. |
| get_who_is_in | HR | HR Overview | View/list page | HR Manager, Project Manager, Department Head | HR manpower management. |
| get_attendance_muster | HR | Attendance | View/list page | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| get_swipe_ingestion_placeholder | HR | HR Overview | View/list page | HR Manager, Project Manager, Department Head | HR manpower management. |
| get_attendance_regularizations | HR | Attendance | View/list page | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| get_attendance_regularization | HR | Attendance | View/list page | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| create_attendance_regularization | HR | Attendance | Create button / modal | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| update_attendance_regularization | HR | Attendance | Edit button / form modal | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| delete_attendance_regularization | HR | Attendance | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| submit_attendance_regularization | HR | Attendance | Submit button | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| approve_attendance_regularization | HR | Attendance | Approve button | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| reject_attendance_regularization | HR | Attendance | Reject button / reason modal | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| reopen_attendance_regularization | HR | Attendance | Action button | HR Manager, Project Manager, Department Head | Tracks presence, roster, and regularization. |
| get_hr_approval_inbox | HR | Approvals | View/list page | HR Manager, Project Manager, Department Head | HR manpower management. |
| act_on_hr_approval | HR | Approvals | Action button | HR Manager, Project Manager, Department Head | HR manpower management. |
| get_travel_logs | HR | Travel Logs | View/list page | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| get_travel_log | HR | Travel Logs | View/list page | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| create_travel_log | HR | Travel Logs | Create button / modal | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| update_travel_log | HR | Travel Logs | Edit button / form modal | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| delete_travel_log | HR | Travel Logs | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| submit_travel_log | HR | Travel Logs | Submit button | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| approve_travel_log | HR | Travel Logs | Approve button | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| reject_travel_log | HR | Travel Logs | Reject button / reason modal | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| get_travel_log_stats | HR | Travel Logs | View/list page | HR Manager, Project Manager, Department Head | Logs travel activity and approvals. |
| get_overtime_entries | HR | Overtime | View/list page | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| get_overtime_entry | HR | Overtime | View/list page | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| create_overtime_entry | HR | Overtime | Create button / modal | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| update_overtime_entry | HR | Overtime | Edit button / form modal | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| delete_overtime_entry | HR | Overtime | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| submit_overtime_entry | HR | Overtime | Submit button | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| approve_overtime_entry | HR | Overtime | Approve button | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| reject_overtime_entry | HR | Overtime | Reject button / reason modal | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| get_overtime_stats | HR | Overtime | View/list page | HR Manager, Project Manager, Department Head | Captures overtime approvals and reports. |
| get_statutory_ledgers | HR | HR Overview | View/list page | HR Manager, Project Manager, Department Head | HR manpower management. |
| get_statutory_ledger | HR | HR Overview | View/list page | HR Manager, Project Manager, Department Head | HR manpower management. |
| create_statutory_ledger | HR | HR Overview | Create button / modal | HR Manager, Project Manager, Department Head | HR manpower management. |
| update_statutory_ledger | HR | HR Overview | Edit button / form modal | HR Manager, Project Manager, Department Head | HR manpower management. |
| delete_statutory_ledger | HR | HR Overview | Delete button / confirm modal | HR Manager, Project Manager, Department Head | HR manpower management. |
| get_statutory_ledger_stats | HR | HR Overview | View/list page | HR Manager, Project Manager, Department Head | HR manpower management. |
| get_technician_visit_logs | HR | Technician Visits | View/list page | HR Manager, Project Manager, Department Head | Records technician field activity and deployment. |
| get_technician_visit_log | HR | Technician Visits | View/list page | HR Manager, Project Manager, Department Head | Records technician field activity and deployment. |
| create_technician_visit_log | HR | Technician Visits | Create button / modal | HR Manager, Project Manager, Department Head | Records technician field activity and deployment. |
| update_technician_visit_log | HR | Technician Visits | Edit button / form modal | HR Manager, Project Manager, Department Head | Records technician field activity and deployment. |
| delete_technician_visit_log | HR | Technician Visits | Delete button / confirm modal | HR Manager, Project Manager, Department Head | Records technician field activity and deployment. |
| get_technician_visit_stats | HR | Technician Visits | View/list page | HR Manager, Project Manager, Department Head | Records technician field activity and deployment. |
| get_employees | HR | Employees | View/list page | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |
| get_employee | HR | Employees | View/list page | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |
| get_employee_stats | HR | Employees | View/list page | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |
| update_employee | HR | Employees | Edit button / form modal | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |
| get_employee_family | HR | Employees | View/list page | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |
| get_employee_education | HR | Employees | View/list page | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |
| get_employee_experience | HR | Employees | View/list page | HR Manager, Project Manager, Department Head | Maintains employee master and assignment context. |

## Operations And Maintenance

- Frontend tab: O&M Helpdesk
- Default subtab/page: Tickets / Device Uptime / SLA Penalties / RMA
- Primary roles: OM Operator, RMA Manager, Accounts
- Flow role: Post-delivery support and SLA response
- Current frontend surface: O&M and RMA pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_tickets | O&M Helpdesk | Tickets | View/list page | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| get_ticket | O&M Helpdesk | Tickets | View/list page | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| create_ticket | O&M Helpdesk | Tickets | Create button / modal | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| update_ticket | O&M Helpdesk | Tickets | Edit button / form modal | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| delete_ticket | O&M Helpdesk | Tickets | Delete button / confirm modal | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| assign_ticket | O&M Helpdesk | Tickets | Assign button / modal | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| start_ticket | O&M Helpdesk | Tickets | Action button | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| pause_ticket | O&M Helpdesk | Tickets | Action button | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| resume_ticket | O&M Helpdesk | Tickets | Action button | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| resolve_ticket | O&M Helpdesk | Tickets | Action button | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| close_ticket | O&M Helpdesk | Tickets | Action button | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| escalate_ticket | O&M Helpdesk | Tickets | Action button | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| add_ticket_comment | O&M Helpdesk | Tickets | Action button | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| get_ticket_stats | O&M Helpdesk | Tickets | View/list page | OM Operator, RMA Manager, Accounts | Ticket handling and service assurance. |
| get_sla_profiles | O&M Helpdesk | SLA | View/list page | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| get_sla_profile | O&M Helpdesk | SLA | View/list page | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| create_sla_profile | O&M Helpdesk | SLA | Create button / modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| update_sla_profile | O&M Helpdesk | SLA | Edit button / form modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| delete_sla_profile | O&M Helpdesk | SLA | Delete button / confirm modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| get_sla_timers | O&M Helpdesk | SLA | View/list page | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| get_sla_timer | O&M Helpdesk | SLA | View/list page | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| create_sla_timer | O&M Helpdesk | SLA | Create button / modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| close_sla_timer | O&M Helpdesk | SLA | Action button | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| pause_sla_timer | O&M Helpdesk | SLA | Action button | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| resume_sla_timer | O&M Helpdesk | SLA | Action button | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| get_sla_penalty_rules | O&M Helpdesk | SLA | View/list page | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| create_sla_penalty_rule | O&M Helpdesk | SLA | Create button / modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| update_sla_penalty_rule | O&M Helpdesk | SLA | Edit button / form modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| delete_sla_penalty_rule | O&M Helpdesk | SLA | Delete button / confirm modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| get_sla_penalty_records | O&M Helpdesk | SLA | View/list page | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| get_sla_penalty_record | O&M Helpdesk | SLA | View/list page | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| create_sla_penalty_record | O&M Helpdesk | SLA | Create button / modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| approve_sla_penalty | O&M Helpdesk | SLA | Approve button | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| reject_sla_penalty | O&M Helpdesk | SLA | Reject button / reason modal | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| waive_sla_penalty | O&M Helpdesk | SLA | Action button | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| get_sla_penalty_stats | O&M Helpdesk | SLA | View/list page | OM Operator, RMA Manager, Accounts | Manages SLA response, penalty, and breach tracking. |
| get_rma_trackers | O&M Helpdesk | RMA | View/list page | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| get_rma_tracker | O&M Helpdesk | RMA | View/list page | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| create_rma_tracker | O&M Helpdesk | RMA | Create button / modal | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| update_rma_tracker | O&M Helpdesk | RMA | Edit button / form modal | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| convert_ticket_to_rma | O&M Helpdesk | RMA | Action button | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| delete_rma_tracker | O&M Helpdesk | RMA | Delete button / confirm modal | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| approve_rma | O&M Helpdesk | RMA | Approve button | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| reject_rma | O&M Helpdesk | RMA | Reject button / reason modal | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| update_rma_status | O&M Helpdesk | RMA | Edit button / form modal | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| close_rma | O&M Helpdesk | RMA | Action button | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |
| get_rma_stats | O&M Helpdesk | RMA | View/list page | OM Operator, RMA Manager, Accounts | Returns faulty devices into repair/replacement flow. |

## Dashboards And MIS

- Frontend tab: Reports
- Default subtab/page: Dashboards / MIS
- Primary roles: Director, Department Head, Project Head, Managers
- Flow role: Portfolio monitoring and management reporting
- Current frontend surface: Dashboard pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_finance_requests | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| approve_finance_request | Reports | Dashboards / MIS | Approve button | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| deny_finance_request | Reports | Dashboards / MIS | Action button | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_finance_request_stats | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_finance_mis | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_login_mis | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_sales_mis | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_pending_approvals | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_om_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_accounts_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_presales_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_execution_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_project_head_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_project_manager_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_engineering_head_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_procurement_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_stores_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_executive_dashboard | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_pm_cockpit_summary | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_execution_summary | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_notification_center | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| mark_mention_read | Reports | Dashboards / MIS | Mark action | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |
| get_user_mentions | Reports | Dashboards / MIS | View/list page | Director, Department Head, Project Head, Managers | Portfolio monitoring and management reporting |

## Accountability And Audit

- Frontend tab: Accountability
- Default subtab/page: Traceability / Audit / Blocked Items
- Primary roles: Department Head, Project Head, Admin
- Flow role: Traceability, blockage analysis, and backfills
- Current frontend surface: Accountability pages

| API | Frontend tab | Subtab / page | UI control | Primary role | Flow role |
| --- | --- | --- | --- | --- | --- |
| get_accountability_timeline | Accountability | Audit Overview | View/list page | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| get_accountability_record | Accountability | Traceability | View/list page | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| get_open_accountability_items | Accountability | Audit Overview | View/list page | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| get_overdue_accountability_items | Accountability | Overdue Items | View/list page | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| get_blocked_accountability_items | Accountability | Blocked Items | View/list page | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| get_accountability_events_by_project | Accountability | Traceability | View/list page | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| get_accountability_dashboard_summary | Accountability | Audit Overview | View/list page | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| backfill_accountability_records | Accountability | Backfill Utilities | Action button | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| backfill_derive_project | Accountability | Backfill Utilities | Action button | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| backfill_boq_context | Accountability | Backfill Utilities | Action button | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
| get_legacy_data_report | Accountability | Legacy Data Report | View/list page | Department Head, Project Head, Admin | Traceability, backfill, and exception analysis. |
