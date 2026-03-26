"""
Doc Event Handlers — hooks into Frappe doc lifecycle to emit alerts.

These are wired via hooks.py doc_events and fire after persistence
so alerts reflect committed state.
"""

import frappe


def project_after_insert(doc, method):
    """Emit alert when a new project is created."""
    try:
        from gov_erp.alert_dispatcher import on_project_created
        on_project_created(doc.name)
    except Exception:
        frappe.log_error(f"Alert emission failed for project {doc.name}", "Alert Error")


def project_on_update(doc, method):
    """Emit alert when project stage changes."""
    if not doc.has_value_changed("current_project_stage"):
        return

    try:
        from gov_erp.alert_dispatcher import on_project_stage_change

        old_stage = doc.get_doc_before_save()
        old_val = getattr(old_stage, "current_project_stage", None) if old_stage else None
        new_val = doc.current_project_stage

        if old_val != new_val and new_val:
            on_project_stage_change(
                doc.name,
                action="submitted",
                stage=new_val,
            )
    except Exception:
        frappe.log_error(f"Alert emission failed for project stage {doc.name}", "Alert Error")


def site_on_update(doc, method):
    """Emit alert when site lifecycle fields change."""
    project = doc.linked_project
    if not project:
        return

    try:
        from gov_erp.alert_dispatcher import (
            on_site_blocked,
            on_site_installation_stage_changed,
            on_site_stage_changed,
            on_site_status_changed,
        )

        # Stage change
        if doc.has_value_changed("current_site_stage"):
            old = doc.get_doc_before_save()
            old_stage = getattr(old, "current_site_stage", None) if old else None
            if old_stage != doc.current_site_stage:
                on_site_stage_changed(project, doc.name, doc.current_site_stage or "")

        # High-level status change
        if doc.has_value_changed("status"):
            old = doc.get_doc_before_save()
            old_status = getattr(old, "status", None) if old else None
            if old_status != doc.status and doc.status:
                on_site_status_changed(project, doc.name, doc.status)

        # Installation stage progression
        if doc.has_value_changed("installation_stage"):
            old = doc.get_doc_before_save()
            old_installation_stage = getattr(old, "installation_stage", None) if old else None
            if old_installation_stage != doc.installation_stage and doc.installation_stage:
                on_site_installation_stage_changed(project, doc.name, doc.installation_stage)

        # Block/unblock
        if doc.has_value_changed("site_blocked"):
            on_site_blocked(project, doc.name, bool(doc.site_blocked))

    except Exception:
        frappe.log_error(f"Alert emission failed for site {doc.name}", "Alert Error")


def milestone_on_update(doc, method):
    """Emit alert when a milestone is completed or overdue."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        from gov_erp.alert_dispatcher import on_milestone_event

        if doc.has_value_changed("status"):
            if doc.status == "Completed":
                on_milestone_event(project, doc.name, "completed")
            elif doc.status == "Overdue":
                on_milestone_event(project, doc.name, "overdue")
    except Exception:
        frappe.log_error(f"Alert emission failed for milestone {doc.name}", "Alert Error")


def document_after_insert(doc, method):
    """Emit alert when a project document is uploaded."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        from gov_erp.alert_dispatcher import on_document_event
        on_document_event(
            project,
            doc.name,
            "uploaded",
            doc_title=getattr(doc, "document_name", None) or doc.name,
        )
    except Exception:
        frappe.log_error(f"Alert emission failed for document {doc.name}", "Alert Error")


def document_on_update(doc, method):
    """Emit alert when a project document is replaced."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        if doc.has_value_changed("file_url") or doc.has_value_changed("attached_file"):
            from gov_erp.alert_dispatcher import on_document_event
            on_document_event(
                project,
                doc.name,
                "replaced",
                doc_title=getattr(doc, "document_name", None) or doc.name,
            )
    except Exception:
        frappe.log_error(f"Alert emission failed for document update {doc.name}", "Alert Error")


def dependency_override_after_insert(doc, method):
    """Emit alert when a dependency override is raised."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        from gov_erp.alert_dispatcher import on_dependency_override
        on_dependency_override(project, doc.name, "raised")
    except Exception:
        frappe.log_error(f"Alert emission failed for override {doc.name}", "Alert Error")


def dependency_override_on_update(doc, method):
    """Emit alert when a dependency override is acted upon."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        if doc.has_value_changed("status"):
            from gov_erp.alert_dispatcher import on_dependency_override
            on_dependency_override(project, doc.name, "acted")
    except Exception:
        frappe.log_error(f"Alert emission failed for override update {doc.name}", "Alert Error")


def dispatch_challan_after_insert(doc, method):
    """Emit alert for dispatch events."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        from gov_erp.alert_dispatcher import on_execution_event
        on_execution_event(
            "dispatch_event", project, doc.name,
            f"Dispatch challan created: {doc.name}",
            reference_doctype="GE Dispatch Challan",
            department="execution",
        )
    except Exception:
        frappe.log_error(f"Alert emission failed for dispatch {doc.name}", "Alert Error")


def ticket_on_update(doc, method):
    """Emit alert for ticket escalation."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        if doc.has_value_changed("priority") or doc.has_value_changed("status"):
            from gov_erp.alert_dispatcher import on_execution_event
            on_execution_event(
                "ticket_escalation", project, doc.name,
                f"Ticket {doc.name} updated — {doc.status}",
                reference_doctype="GE Ticket",
                department="om",
            )
    except Exception:
        frappe.log_error(f"Alert emission failed for ticket {doc.name}", "Alert Error")


def rma_after_insert(doc, method):
    """Emit alert for RMA events."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        from gov_erp.alert_dispatcher import on_execution_event
        on_execution_event(
            "rma_event", project, doc.name,
            f"RMA tracker created: {doc.name}",
            reference_doctype="GE RMA Tracker",
            department="om",
        )
    except Exception:
        frappe.log_error(f"Alert emission failed for RMA {doc.name}", "Alert Error")


def invoice_after_insert(doc, method):
    """Emit alert for invoice events."""
    project = doc.linked_project if hasattr(doc, "linked_project") else None
    if not project:
        return

    try:
        from gov_erp.alert_dispatcher import on_execution_event
        on_execution_event(
            "invoice_event", project, doc.name,
            f"Invoice created: {doc.name}",
            reference_doctype="GE Invoice",
            department="finance",
        )
    except Exception:
        frappe.log_error(f"Alert emission failed for invoice {doc.name}", "Alert Error")
