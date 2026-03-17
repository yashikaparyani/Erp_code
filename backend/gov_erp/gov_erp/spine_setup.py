"""
Project Spine Model – custom-field bootstrapper.

Adds the spine-model fields (linked_tender, project_head, project_manager,
total_sites, current_project_stage, spine_progress_pct, blocked,
blocker_summary) to ERPNext's native **Project** doctype so that
GE Site → Project linkage keeps working unchanged.

Called from ``after_install`` / ``after_migrate`` in install.py.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from gov_erp.project_workflow import WORKFLOW_STAGE_OPTIONS, WORKFLOW_STAGE_STATUS_OPTIONS

# ── Custom fields to graft onto ERPNext Project ─────────────
PROJECT_CUSTOM_FIELDS = {
    "Project": [
        {
            "fieldname": "spine_section",
            "fieldtype": "Section Break",
            "label": "Project Spine",
            "insert_after": "notes",
            "collapsible": 0,
        },
        {
            "fieldname": "linked_tender",
            "fieldtype": "Link",
            "label": "Linked Tender",
            "options": "GE Tender",
            "insert_after": "spine_section",
        },
        {
            "fieldname": "project_head",
            "fieldtype": "Link",
            "label": "Project Head",
            "options": "User",
            "insert_after": "linked_tender",
        },
        {
            "fieldname": "project_manager_user",
            "fieldtype": "Link",
            "label": "Project Manager",
            "options": "User",
            "insert_after": "project_head",
        },
        {
            "fieldname": "spine_col1",
            "fieldtype": "Column Break",
            "insert_after": "project_manager_user",
        },
        {
            "fieldname": "total_sites",
            "fieldtype": "Int",
            "label": "Total Sites",
            "insert_after": "spine_col1",
            "read_only": 1,
        },
        {
            "fieldname": "current_project_stage",
            "fieldtype": "Select",
            "label": "Current Project Stage",
            "options": WORKFLOW_STAGE_OPTIONS,
            "insert_after": "total_sites",
        },
        {
            "fieldname": "current_stage_status",
            "fieldtype": "Select",
            "label": "Current Stage Status",
            "options": WORKFLOW_STAGE_STATUS_OPTIONS,
            "insert_after": "current_project_stage",
        },
        {
            "fieldname": "current_stage_owner_department",
            "fieldtype": "Data",
            "label": "Current Owner Department",
            "insert_after": "current_stage_status",
            "read_only": 1,
        },
        {
            "fieldname": "spine_progress_pct",
            "fieldtype": "Percent",
            "label": "Spine Progress %",
            "insert_after": "current_stage_owner_department",
            "read_only": 1,
        },
        {
            "fieldname": "spine_col2",
            "fieldtype": "Column Break",
            "insert_after": "spine_progress_pct",
        },
        {
            "fieldname": "stage_submitted_by",
            "fieldtype": "Link",
            "label": "Stage Submitted By",
            "options": "User",
            "insert_after": "spine_col2",
            "read_only": 1,
        },
        {
            "fieldname": "stage_submitted_at",
            "fieldtype": "Datetime",
            "label": "Stage Submitted At",
            "insert_after": "stage_submitted_by",
            "read_only": 1,
        },
        {
            "fieldname": "workflow_last_action",
            "fieldtype": "Data",
            "label": "Workflow Last Action",
            "insert_after": "stage_submitted_at",
            "read_only": 1,
        },
        {
            "fieldname": "workflow_last_actor",
            "fieldtype": "Link",
            "label": "Workflow Last Actor",
            "options": "User",
            "insert_after": "workflow_last_action",
            "read_only": 1,
        },
        {
            "fieldname": "workflow_last_action_at",
            "fieldtype": "Datetime",
            "label": "Workflow Last Action At",
            "insert_after": "workflow_last_actor",
            "read_only": 1,
        },
        {
            "fieldname": "spine_blocked",
            "fieldtype": "Check",
            "label": "Blocked",
            "insert_after": "workflow_last_action_at",
        },
        {
            "fieldname": "blocker_summary",
            "fieldtype": "Small Text",
            "label": "Blocker Summary",
            "insert_after": "spine_blocked",
            "depends_on": "spine_blocked",
        },
        {
            "fieldname": "workflow_history_json",
            "fieldtype": "Long Text",
            "label": "Workflow History JSON",
            "insert_after": "blocker_summary",
            "hidden": 1,
            "read_only": 1,
        },
    ],
}


def ensure_spine_custom_fields():
    """Idempotently create / update spine custom fields on Project."""
    create_custom_fields(PROJECT_CUSTOM_FIELDS, update=True)
    _sync_project_workflow_select_options()
    frappe.db.commit()


def _sync_project_workflow_select_options():
    """Force-refresh select options on existing custom fields after workflow changes."""
    option_map = {
        "current_project_stage": WORKFLOW_STAGE_OPTIONS,
        "current_stage_status": WORKFLOW_STAGE_STATUS_OPTIONS,
    }
    for fieldname, options in option_map.items():
        custom_field_name = frappe.db.get_value(
            "Custom Field",
            {"dt": "Project", "fieldname": fieldname},
            "name",
        )
        if not custom_field_name:
            continue
        custom_field = frappe.get_doc("Custom Field", custom_field_name)
        if custom_field.options == options:
            continue
        custom_field.options = options
        custom_field.save(ignore_permissions=True)
