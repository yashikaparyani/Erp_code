"""
Alert Dispatcher — central module for resolving recipients and emitting alerts.

Responsible for:
- resolving who should receive an alert (project team + RBAC)
- creating GE Alert records for each eligible recipient
- pushing realtime events to each recipient
- providing helper functions keyed to common ERP event types
"""

import frappe
from gov_erp.gov_erp.doctype.ge_alert.ge_alert import create_alert
from gov_erp.permission_engine import PermissionEngine


# ---------------------------------------------------------------------------
# Event-type → required RBAC capability mapping
# If an event type is listed here the recipient must hold the capability.
# Events not listed require only project visibility.
# ---------------------------------------------------------------------------
EVENT_CAPABILITY_MAP = {
    "project_stage_submitted":      "project.stage.submit",
    "project_stage_approved":       "project.stage.approve",
    "project_stage_rejected":       "project.stage.approve",
    "project_stage_overridden":     "project.stage.override",
    "dependency_override_raised":   "project.dependency.override",
    "dependency_override_acted":    "project.dependency.override",
    "approval_assigned":            "approval.action.view",
    "approval_acted":               "approval.action.view",
    "dispatch_event":               "execution.dispatch.view",
    "grn_event":                    "inventory.grn.view",
    "invoice_event":                "finance.invoice.view",
    "retention_event":              "finance.retention.view",
    "penalty_event":                "finance.penalty.view",
    "rma_event":                    "om.rma.view",
    "ticket_escalation":            "om.ticket.view",
}

# Events that should go to the full project team (no extra capability gate)
BROAD_PROJECT_EVENTS = {
    "project_created",
    "site_stage_changed",
    "site_status_changed",
    "site_installation_stage_changed",
    "site_blocked",
    "site_unblocked",
    "milestone_overdue",
    "milestone_completed",
    "document_uploaded",
    "document_replaced",
    "document_expiring",
    "indent_submitted",
    "indent_acknowledged",
    "indent_accepted",
    "indent_rejected",
    "indent_returned",
    "indent_escalated",
}

# Department-scoped events — only go to users in that department + PMs
DEPARTMENT_EVENTS = {
    "dispatch_event":        "execution",
    "grn_event":             "inventory",
    "invoice_event":         "finance",
    "retention_event":       "finance",
    "penalty_event":         "finance",
    "rma_event":             "om",
    "ticket_escalation":     "om",
}


# ---------------------------------------------------------------------------
# Recipient resolution
# ---------------------------------------------------------------------------

def _get_project_team_users(project_name: str) -> list[str]:
    """Return list of active user emails assigned to a project."""
    if not project_name:
        return []

    # From GE Project Team Member
    team_users = frappe.get_all(
        "GE Project Team Member",
        filters={"linked_project": project_name, "is_active": 1},
        pluck="user",
    )

    # Also from GE User Context.assigned_projects (comma-separated)
    contexts = frappe.get_all(
        "GE User Context",
        filters={"is_active": 1},
        fields=["user", "assigned_projects"],
    )
    for ctx in contexts:
        if ctx.assigned_projects:
            projects = [p.strip() for p in ctx.assigned_projects.split(",") if p.strip()]
            if project_name in projects and ctx.user not in team_users:
                team_users.append(ctx.user)

    return list(set(team_users))


def _user_can_see_event(
    user: str,
    event_type: str,
    project_name: str = None,
    department: str = None,
) -> bool:
    """Check if a user has RBAC permission to see this event."""
    try:
        engine = PermissionEngine(user)
    except Exception:
        return False

    # System managers and directors always see everything
    if engine.is_system_manager or engine.is_director:
        return True

    # Must see the project at minimum
    if project_name and not engine.can_view_project(project_name=project_name):
        return False

    # Department-scoped events: user must be in that department or be a PM
    if event_type in DEPARTMENT_EVENTS and department:
        user_ctx = engine.user_context
        if user_ctx and user_ctx.get("department"):
            user_dept = user_ctx.get("department", "").lower().strip()
            event_dept = department.lower().strip()
            if user_dept != event_dept:
                # Not in this department — check if they have the specific capability
                cap_key = EVENT_CAPABILITY_MAP.get(event_type)
                if cap_key and not engine.has_capability(cap_key, project=project_name):
                    return False

    # Capability-gated events
    cap_key = EVENT_CAPABILITY_MAP.get(event_type)
    if cap_key:
        return engine.has_capability(cap_key, project=project_name)

    return True


def resolve_recipients(
    event_type: str,
    *,
    project: str = None,
    site: str = None,
    department: str = None,
    exclude_user: str = None,
    extra_users: list[str] = None,
) -> list[str]:
    """
    Resolve who should receive an alert.

    Logic:
    1. Start from the project team (if project is given)
    2. Add any extra_users (e.g. specific approver)
    3. Filter by RBAC — user must be allowed to see this event
    4. Exclude the actor (the person who triggered the event)

    Returns:
        List of user emails who should receive the alert
    """
    candidates = set()

    # Start from project team
    if project:
        candidates.update(_get_project_team_users(project))

    # Add extra users (e.g. assigned approver, mentioned user)
    if extra_users:
        candidates.update(extra_users)

    # If no project and no extras, return empty — we don't spam everyone
    if not candidates:
        return []

    # Exclude the actor
    if exclude_user:
        candidates.discard(exclude_user)

    # Exclude Guest
    candidates.discard("Guest")

    # RBAC filter
    eligible = []
    for user in candidates:
        if _user_can_see_event(user, event_type, project_name=project, department=department):
            eligible.append(user)

    return eligible


# ---------------------------------------------------------------------------
# Core emit function
# ---------------------------------------------------------------------------

def emit_alert(
    event_type: str,
    summary: str,
    *,
    actor: str = None,
    project: str = None,
    site: str = None,
    stage: str = None,
    department: str = None,
    reference_doctype: str = None,
    reference_name: str = None,
    detail: str = None,
    route_path: str = None,
    extra_recipients: list[str] = None,
):
    """
    Emit an alert to all eligible recipients.

    This is the main entry point for alert emission. It:
    1. Resolves recipients via project team + RBAC
    2. Creates a GE Alert record per recipient
    3. Pushes a realtime event to each recipient

    Args:
        event_type: One of the GE Alert event_type options
        summary: Short summary text
        actor: Who triggered the event (defaults to session.user)
        project: Related project name
        site: Related site name
        stage: Related stage/phase
        department: Related department
        reference_doctype: DocType of the source document
        reference_name: Name of the source document
        detail: Longer detail text
        route_path: Frontend route for deep-linking
        extra_recipients: Additional users who should receive this alert
    """
    actor = actor or frappe.session.user

    recipients = resolve_recipients(
        event_type,
        project=project,
        site=site,
        department=department,
        exclude_user=actor,
        extra_users=extra_recipients,
    )

    alert_names = []
    for user in recipients:
        name = create_alert(
            event_type=event_type,
            recipient_user=user,
            summary=summary,
            actor=actor,
            linked_project=project,
            linked_site=site,
            linked_stage=stage,
            linked_department=department,
            reference_doctype=reference_doctype,
            reference_name=reference_name,
            detail=detail,
            route_path=route_path,
        )
        alert_names.append(name)

        # Push realtime event
        frappe.publish_realtime(
            event="ge_alert",
            message={
                "alert_name": name,
                "event_type": event_type,
                "summary": summary,
                "actor": actor,
                "project": project,
                "site": site,
            },
            user=user,
        )

    return alert_names


# ---------------------------------------------------------------------------
# Convenience emitters for common ERP events
# ---------------------------------------------------------------------------

def on_project_created(project_name: str, **kwargs):
    """Emit alert when a new project is created."""
    emit_alert(
        "project_created",
        f"New project created: {project_name}",
        project=project_name,
        reference_doctype="Project",
        reference_name=project_name,
        route_path=f"/projects/{project_name}",
        **kwargs,
    )


def on_project_stage_change(project_name: str, action: str, stage: str, **kwargs):
    """Emit alert for project stage workflow actions."""
    event_map = {
        "submitted":  "project_stage_submitted",
        "approved":   "project_stage_approved",
        "rejected":   "project_stage_rejected",
        "overridden": "project_stage_overridden",
    }
    event_type = event_map.get(action, "project_stage_submitted")
    emit_alert(
        event_type,
        f"Project {project_name} stage '{stage}' {action}",
        project=project_name,
        stage=stage,
        reference_doctype="Project",
        reference_name=project_name,
        route_path=f"/projects/{project_name}",
        **kwargs,
    )


def on_site_stage_changed(project_name: str, site_name: str, stage: str, **kwargs):
    """Emit alert when a site stage changes."""
    emit_alert(
        "site_stage_changed",
        f"Site {site_name} moved to stage '{stage}'",
        project=project_name,
        site=site_name,
        stage=stage,
        reference_doctype="GE Site",
        reference_name=site_name,
        route_path=f"/projects/{project_name}/sites/{site_name}",
        **kwargs,
    )


def on_site_status_changed(project_name: str, site_name: str, status: str, **kwargs):
    """Emit alert when a site's high-level status changes."""
    emit_alert(
        "site_status_changed",
        f"Site {site_name} status changed to '{status}'",
        project=project_name,
        site=site_name,
        stage=status,
        reference_doctype="GE Site",
        reference_name=site_name,
        route_path=f"/projects/{project_name}/sites/{site_name}",
        **kwargs,
    )


def on_site_installation_stage_changed(project_name: str, site_name: str, installation_stage: str, **kwargs):
    """Emit alert when a site's installation stage progresses."""
    emit_alert(
        "site_installation_stage_changed",
        f"Site {site_name} installation stage changed to '{installation_stage}'",
        project=project_name,
        site=site_name,
        stage=installation_stage,
        reference_doctype="GE Site",
        reference_name=site_name,
        route_path=f"/projects/{project_name}/sites/{site_name}",
        **kwargs,
    )


def on_site_blocked(project_name: str, site_name: str, blocked: bool, **kwargs):
    """Emit alert when a site is blocked or unblocked."""
    event_type = "site_blocked" if blocked else "site_unblocked"
    action = "blocked" if blocked else "unblocked"
    emit_alert(
        event_type,
        f"Site {site_name} has been {action}",
        project=project_name,
        site=site_name,
        reference_doctype="GE Site",
        reference_name=site_name,
        route_path=f"/projects/{project_name}/sites/{site_name}",
        **kwargs,
    )


def on_milestone_event(project_name: str, milestone_name: str, event: str, **kwargs):
    """Emit alert for milestone events (overdue, completed)."""
    event_type = "milestone_overdue" if event == "overdue" else "milestone_completed"
    emit_alert(
        event_type,
        f"Milestone '{milestone_name}' is {event}",
        project=project_name,
        reference_doctype="GE Milestone",
        reference_name=milestone_name,
        route_path=f"/projects/{project_name}/milestones",
        **kwargs,
    )


def on_document_event(
    project_name: str, doc_name: str, event: str, doc_title: str = None, **kwargs
):
    """Emit alert for document events (uploaded, replaced, expiring)."""
    event_map = {
        "uploaded": "document_uploaded",
        "replaced": "document_replaced",
        "expiring": "document_expiring",
    }
    event_type = event_map.get(event, "document_uploaded")
    label = doc_title or doc_name
    emit_alert(
        event_type,
        f"Document '{label}' {event}",
        project=project_name,
        reference_doctype="GE Project Document",
        reference_name=doc_name,
        route_path=f"/projects/{project_name}/files",
        **kwargs,
    )


def on_dependency_override(project_name: str, override_name: str, action: str, **kwargs):
    """Emit alert for dependency override events."""
    event_type = (
        "dependency_override_raised" if action == "raised"
        else "dependency_override_acted"
    )
    emit_alert(
        event_type,
        f"Dependency override {action} on project {project_name}",
        project=project_name,
        reference_doctype="GE Dependency Override",
        reference_name=override_name,
        route_path=f"/projects/{project_name}",
        **kwargs,
    )


def on_approval_event(
    project_name: str, approval_name: str, event: str, approver: str = None, **kwargs
):
    """Emit alert for approval events."""
    event_type = "approval_assigned" if event == "assigned" else "approval_acted"
    extra = [approver] if approver else None
    emit_alert(
        event_type,
        f"Approval {event} on project {project_name}",
        project=project_name,
        reference_doctype="GE Tender Approval",
        reference_name=approval_name,
        route_path=f"/projects/{project_name}",
        extra_recipients=extra,
        **kwargs,
    )


def on_mention(
    mentioned_user: str,
    summary: str,
    *,
    project: str = None,
    reference_doctype: str = None,
    reference_name: str = None,
    route_path: str = None,
    **kwargs,
):
    """Emit alert when a user is mentioned in a comment."""
    if not route_path and reference_doctype and reference_name:
        if reference_doctype == "Project":
            route_path = f"/projects/{reference_name}"
        elif project:
            route_path = f"/projects/{project}"
    emit_alert(
        "user_mentioned",
        summary,
        project=project,
        reference_doctype=reference_doctype,
        reference_name=reference_name,
        route_path=route_path,
        extra_recipients=[mentioned_user],
        **kwargs,
    )


def on_execution_event(
    event_type: str,
    project_name: str,
    doc_name: str,
    summary: str,
    *,
    reference_doctype: str = None,
    route_path: str = None,
    **kwargs,
):
    """Emit alert for execution-related events (dispatch, GRN, invoice, etc.)."""
    emit_alert(
        event_type,
        summary,
        project=project_name,
        department=DEPARTMENT_EVENTS.get(event_type),
        reference_doctype=reference_doctype,
        reference_name=doc_name,
        route_path=route_path or f"/projects/{project_name}",
        **kwargs,
    )


def on_indent_event(
    project_name: str,
    indent_name: str,
    action: str,
    *,
    detail: str = None,
    extra_recipients: list[str] = None,
    **kwargs,
):
    """Emit alerts for indent workflow transitions."""
    event_map = {
        "submitted": "indent_submitted",
        "acknowledged": "indent_acknowledged",
        "accepted": "indent_accepted",
        "rejected": "indent_rejected",
        "returned": "indent_returned",
        "escalated": "indent_escalated",
    }
    summary_map = {
        "submitted": f"Indent {indent_name} submitted for approval",
        "acknowledged": f"Indent {indent_name} acknowledged",
        "accepted": f"Indent {indent_name} accepted for procurement action",
        "rejected": f"Indent {indent_name} rejected",
        "returned": f"Indent {indent_name} returned for revision",
        "escalated": f"Indent {indent_name} escalated",
    }

    emit_alert(
        event_map.get(action, "general"),
        summary_map.get(action, f"Indent {indent_name} updated"),
        project=project_name,
        department="procurement",
        reference_doctype="Material Request",
        reference_name=indent_name,
        detail=detail,
        route_path="/indents",
        extra_recipients=extra_recipients,
        **kwargs,
    )
