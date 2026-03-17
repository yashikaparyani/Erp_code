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

# ── Stage enum shared across Project & Site ──────────────────
SPINE_STAGES = "\n".join([
    "SURVEY",
    "BOQ_DESIGN",
    "COSTING",
    "PROCUREMENT",
    "STORES_DISPATCH",
    "EXECUTION",
    "BILLING_PAYMENT",
    "OM_RMA",
    "CLOSED",
])

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
            "options": SPINE_STAGES,
            "insert_after": "total_sites",
        },
        {
            "fieldname": "spine_progress_pct",
            "fieldtype": "Percent",
            "label": "Spine Progress %",
            "insert_after": "current_project_stage",
            "read_only": 1,
        },
        {
            "fieldname": "spine_col2",
            "fieldtype": "Column Break",
            "insert_after": "spine_progress_pct",
        },
        {
            "fieldname": "spine_blocked",
            "fieldtype": "Check",
            "label": "Blocked",
            "insert_after": "spine_col2",
        },
        {
            "fieldname": "blocker_summary",
            "fieldtype": "Small Text",
            "label": "Blocker Summary",
            "insert_after": "spine_blocked",
            "depends_on": "spine_blocked",
        },
    ],
}


def ensure_spine_custom_fields():
    """Idempotently create / update spine custom fields on Project."""
    create_custom_fields(PROJECT_CUSTOM_FIELDS, update=True)
    frappe.db.commit()
