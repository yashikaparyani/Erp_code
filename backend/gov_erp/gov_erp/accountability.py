# Copyright (c) 2026, Technosys and contributors
# For license information, please see license.txt
"""
gov_erp.accountability
======================
Central accountability engine for the Technosys ERP.

Every critical handoff must leave a trace:
  - who did what
  - who owns it now
  - who accepted it
  - who rejected it and WHY
  - why it was blocked
  - who approved the exception
  - where the failure originated

Usage pattern
-------------
    from gov_erp.accountability import record_and_log, EventType

    record_and_log(
        subject_doctype="Material Request",
        subject_name=doc.name,
        event_type=EventType.CREATED,
        linked_project=doc.project,
        current_status="Draft",
        current_owner_user=frappe.session.user,
        source_route="/projects/{project}/procurement/indents",
    )

The call both upserts the GE Accountability Record (current state snapshot)
and appends an immutable GE Accountability Event (audit row).
"""

import json

import frappe
from frappe.utils import now_datetime


# ---------------------------------------------------------------------------
# Event type constants
# ---------------------------------------------------------------------------

class EventType:
    CREATED          = "CREATED"
    SUBMITTED        = "SUBMITTED"
    ASSIGNED         = "ASSIGNED"
    ACKNOWLEDGED     = "ACKNOWLEDGED"
    ACCEPTED         = "ACCEPTED"
    RETURNED         = "RETURNED"
    APPROVED         = "APPROVED"
    REJECTED         = "REJECTED"
    BLOCKED          = "BLOCKED"
    UNBLOCKED        = "UNBLOCKED"
    ESCALATED        = "ESCALATED"
    DUE_DATE_CHANGED = "DUE_DATE_CHANGED"
    REOPENED         = "REOPENED"
    COMPLETED        = "COMPLETED"
    CANCELLED        = "CANCELLED"
    OVERRIDDEN       = "OVERRIDDEN"
    # Document traceability events
    DOC_UPLOADED     = "DOC_UPLOADED"
    DOC_REPLACED     = "DOC_REPLACED"
    DOC_SUPERSEDED   = "DOC_SUPERSEDED"
    DOC_REVIEWED     = "DOC_REVIEWED"
    DOC_APPROVED     = "DOC_APPROVED"
    DOC_REJECTED     = "DOC_REJECTED"
    DOC_EXPIRED      = "DOC_EXPIRED"
    DOC_MISSING      = "DOC_MISSING"


# Event types that MUST carry a written reason in remarks.
# Saving without remarks for these will raise ValidationError.
REASON_REQUIRED = frozenset({
    EventType.REJECTED,
    EventType.RETURNED,
    EventType.BLOCKED,
    EventType.ESCALATED,
    EventType.OVERRIDDEN,
    EventType.CANCELLED,
    EventType.DUE_DATE_CHANGED,
    EventType.DOC_REJECTED,
})

# ---------------------------------------------------------------------------
# Developer enforcement contract (Phase 9)
# ---------------------------------------------------------------------------
# RULE: Every @frappe.whitelist() function that modifies a document state
#       (approve_*, reject_*, submit_*, acknowledge_*, accept_*, return_*,
#        escalate_*, supersede_*, cancel_*, toggle_*) MUST call record_and_log()
#       inside a try/except block that logs but does NOT re-raise, so that
#       accountability bugs never block business operations.
#
# TEMPLATE (copy-paste into new workflow functions):
#
#   try:
#       from gov_erp.accountability import record_and_log, EventType
#       record_and_log(
#           subject_doctype="<DocType Name>",
#           subject_name=name,
#           event_type=EventType.<TYPE>,
#           linked_project=doc.get("linked_project"),
#           from_status="<old>",
#           to_status="<new>",
#           current_status="<new>",
#           current_owner_role=_detect_primary_role(),
#           source_route="/<module>/<path>",
#       )
#   except Exception:
#       frappe.log_error(frappe.get_traceback(), "Accountability: <function_name>")
#
# REJECTION/BLOCKING/RETURN: Add this guard BEFORE doc.save():
#   if not (reason or "").strip():
#       frappe.throw("A reason is required. Please provide remarks.")
# ---------------------------------------------------------------------------

# Role priority order for actor-role detection (highest wins)
_ROLE_PRIORITY = [
    "Director",
    "Project Head",
    "Department Head",
    "Engineering Head",
    "Procurement Head",
    "Store Manager",
    "Stores & Logistics Head",
    "HR Head",
    "HR Manager",
    "Accounts Head",
    "Accounts",
    "Project Manager",
    "Procurement Manager",
    "Engineer",
    "Field Technician",
    "RMA Head",
    "RMA Manager",
    "OM Operator",
    "Presales Head",
    "Presales Executive",
    "System Manager",
]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _detect_actor_role(user: str = None) -> str:
    """Return the highest-priority role the user holds."""
    user = user or frappe.session.user
    held = set(frappe.get_roles(user))
    for role in _ROLE_PRIORITY:
        if role in held:
            return role
    return next(iter(held), "Unknown")


def _str(value) -> str:
    """Safely coerce None → empty string, everything else → str."""
    return str(value) if value is not None else ""


# ---------------------------------------------------------------------------
# Core public API
# ---------------------------------------------------------------------------

def upsert_accountability_record(
    subject_doctype: str,
    subject_name: str,
    *,
    root_doctype: str = None,
    root_name: str = None,
    linked_project: str = None,
    linked_site: str = None,
    linked_stage: str = None,
    current_status: str = None,
    current_owner_role: str = None,
    current_owner_user: str = None,
    current_owner_department: str = None,
    assigned_to_role: str = None,
    assigned_to_user: str = None,
    accepted_by: str = None,
    accepted_on=None,
    submitted_by: str = None,
    submitted_on=None,
    due_date=None,
    is_blocked: bool = None,
    blocking_reason: str = None,
    escalated_to_role: str = None,
    escalated_to_user: str = None,
    approved_by: str = None,
    approved_on=None,
    closed_by: str = None,
    closed_on=None,
    latest_event_type: str = None,
    source_route: str = None,
) -> str:
    """
    Create-or-update the live accountability snapshot for a tracked object.

    Returns the name (ID) of the GE Accountability Record.
    Multiple calls are safe: only non-None arguments overwrite existing values.
    """
    existing = frappe.db.get_value(
        "GE Accountability Record",
        {"subject_doctype": subject_doctype, "subject_name": subject_name},
        "name",
    )

    if existing:
        doc = frappe.get_doc("GE Accountability Record", existing)
    else:
        doc = frappe.new_doc("GE Accountability Record")
        doc.subject_doctype = subject_doctype
        doc.subject_name = subject_name

    # Apply only the explicitly-provided (non-None) updates
    _apply = {
        "root_doctype":             root_doctype,
        "root_name":                root_name,
        "linked_project":           linked_project,
        "linked_site":              linked_site,
        "linked_stage":             linked_stage,
        "current_status":           current_status,
        "current_owner_role":       current_owner_role,
        "current_owner_user":       current_owner_user,
        "current_owner_department": current_owner_department,
        "assigned_to_role":         assigned_to_role,
        "assigned_to_user":         assigned_to_user,
        "accepted_by":              accepted_by,
        "accepted_on":              accepted_on,
        "submitted_by":             submitted_by,
        "submitted_on":             submitted_on,
        "due_date":                 due_date,
        "is_blocked":               is_blocked,
        "blocking_reason":          blocking_reason,
        "escalated_to_role":        escalated_to_role,
        "escalated_to_user":        escalated_to_user,
        "approved_by":              approved_by,
        "approved_on":              approved_on,
        "closed_by":                closed_by,
        "closed_on":                closed_on,
        "latest_event_type":        latest_event_type,
        "source_route":             source_route,
    }
    for field, value in _apply.items():
        if value is not None:
            setattr(doc, field, value)

    if existing:
        doc.save(ignore_permissions=True)
    else:
        doc.insert(ignore_permissions=True)

    return doc.name


def log_accountability_event(
    record_name: str,
    event_type: str,
    *,
    from_status: str = None,
    to_status: str = None,
    from_owner_user: str = None,
    to_owner_user: str = None,
    from_owner_role: str = None,
    to_owner_role: str = None,
    remarks: str = None,
    reason_code: str = None,
    linked_project: str = None,
    linked_site: str = None,
    linked_stage: str = None,
    reference_doctype: str = None,
    reference_name: str = None,
    metadata: dict = None,
    actor_user: str = None,
    actor_role: str = None,
    actor_department: str = None,
) -> str:
    """
    Append one immutable event row to the accountability ledger.

    Raises frappe.exceptions.ValidationError if remarks are missing for
    event types that mandate a written reason (REJECTED, BLOCKED, etc.).

    Returns the name of the created GE Accountability Event.
    """
    # ── Reason enforcement ───────────────────────────────────────────────────
    if event_type in REASON_REQUIRED and not (remarks or "").strip():
        frappe.throw(
            f"Event '{event_type}' requires a written reason in remarks.",
            frappe.exceptions.ValidationError,
        )

    actor = actor_user or frappe.session.user
    role  = actor_role or _detect_actor_role(actor)

    event = frappe.get_doc({
        "doctype":              "GE Accountability Event",
        "accountability_record": record_name,
        "event_type":           event_type,
        "actor":                actor,
        "actor_role":           _str(role),
        "actor_department":     _str(actor_department),
        "from_status":          _str(from_status),
        "to_status":            _str(to_status),
        "from_owner_user":      _str(from_owner_user),
        "to_owner_user":        _str(to_owner_user),
        "from_owner_role":      _str(from_owner_role),
        "to_owner_role":        _str(to_owner_role),
        "remarks":              _str(remarks),
        "reason_code":          _str(reason_code),
        "linked_project":       _str(linked_project),
        "linked_site":          _str(linked_site),
        "linked_stage":         _str(linked_stage),
        "reference_doctype":    _str(reference_doctype),
        "reference_name":       _str(reference_name),
        "event_time":           now_datetime(),
        "metadata_json":        json.dumps(metadata) if metadata else "",
    })
    event.insert(ignore_permissions=True)
    return event.name


def record_and_log(
    subject_doctype: str,
    subject_name: str,
    event_type: str,
    *,
    # ── Record snapshot fields ─────────────────────────────────────────────
    root_doctype: str = None,
    root_name: str = None,
    linked_project: str = None,
    linked_site: str = None,
    linked_stage: str = None,
    current_status: str = None,
    current_owner_role: str = None,
    current_owner_user: str = None,
    current_owner_department: str = None,
    assigned_to_role: str = None,
    assigned_to_user: str = None,
    accepted_by: str = None,
    accepted_on=None,
    submitted_by: str = None,
    submitted_on=None,
    due_date=None,
    is_blocked: bool = None,
    blocking_reason: str = None,
    escalated_to_role: str = None,
    escalated_to_user: str = None,
    approved_by: str = None,
    approved_on=None,
    closed_by: str = None,
    closed_on=None,
    source_route: str = None,
    # ── Event-specific fields ──────────────────────────────────────────────
    from_status: str = None,
    to_status: str = None,
    from_owner_user: str = None,
    to_owner_user: str = None,
    from_owner_role: str = None,
    to_owner_role: str = None,
    remarks: str = None,
    reason_code: str = None,
    reference_doctype: str = None,
    reference_name: str = None,
    metadata: dict = None,
    actor_user: str = None,
    actor_role: str = None,
    actor_department: str = None,
) -> tuple:
    """
    Convenience wrapper: upsert accountability record + append event in one call.

    The effective current_status and current_owner_* on the record snapshot
    are derived from the event's to_status / to_owner_* when not explicitly
    provided as record snapshot fields.

    Returns (record_name: str, event_name: str).
    """
    record_name = upsert_accountability_record(
        subject_doctype=subject_doctype,
        subject_name=subject_name,
        root_doctype=root_doctype,
        root_name=root_name,
        linked_project=linked_project,
        linked_site=linked_site,
        linked_stage=linked_stage,
        current_status=current_status or to_status,
        current_owner_role=current_owner_role or to_owner_role,
        current_owner_user=current_owner_user or to_owner_user,
        current_owner_department=current_owner_department,
        assigned_to_role=assigned_to_role,
        assigned_to_user=assigned_to_user,
        accepted_by=accepted_by,
        accepted_on=accepted_on,
        submitted_by=submitted_by,
        submitted_on=submitted_on,
        due_date=due_date,
        is_blocked=is_blocked,
        blocking_reason=blocking_reason,
        escalated_to_role=escalated_to_role,
        escalated_to_user=escalated_to_user,
        approved_by=approved_by,
        approved_on=approved_on,
        closed_by=closed_by,
        closed_on=closed_on,
        latest_event_type=event_type,
        source_route=source_route,
    )

    event_name = log_accountability_event(
        record_name=record_name,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        from_owner_user=from_owner_user,
        to_owner_user=to_owner_user,
        from_owner_role=from_owner_role,
        to_owner_role=to_owner_role,
        remarks=remarks,
        reason_code=reason_code,
        linked_project=linked_project,
        linked_site=linked_site,
        linked_stage=linked_stage,
        reference_doctype=reference_doctype,
        reference_name=reference_name,
        metadata=metadata,
        actor_user=actor_user,
        actor_role=actor_role,
        actor_department=actor_department,
    )

    return record_name, event_name


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_accountability_timeline(subject_doctype: str, subject_name: str) -> dict:
    """
    Return the full accountability picture for a tracked object:
        { "record": {...}, "events": [{...}, ...] }

    Events are ordered oldest-first (ASC by event_time).
    Returns {"record": None, "events": []} if no record exists.
    """
    record = frappe.db.get_value(
        "GE Accountability Record",
        {"subject_doctype": subject_doctype, "subject_name": subject_name},
        "*",
        as_dict=True,
    )
    if not record:
        return {"record": None, "events": []}

    events = frappe.get_all(
        "GE Accountability Event",
        filters={"accountability_record": record["name"]},
        fields=[
            "name", "event_type", "actor", "actor_role", "actor_department",
            "from_status", "to_status",
            "from_owner_user", "to_owner_user",
            "from_owner_role", "to_owner_role",
            "remarks", "reason_code",
            "linked_project", "linked_site", "linked_stage",
            "reference_doctype", "reference_name",
            "event_time", "metadata_json",
        ],
        order_by="event_time asc",
        limit_page_length=500,
    )
    return {"record": record, "events": events}


def get_open_accountability_items(
    project: str = None,
    site: str = None,
    owner_user: str = None,
    blocked_only: bool = False,
    escalated_only: bool = False,
    subject_doctype: str = None,
    limit: int = 100,
) -> list:
    """
    Query open accountability records.

    "Open" means latest_event_type is NOT COMPLETED or CANCELLED.
    Supports optional filters: project, site, owner, blocked, escalated, doctype.
    """
    filters = {
        "latest_event_type": ["not in", ["COMPLETED", "CANCELLED", ""]],
    }
    if project:
        filters["linked_project"] = project
    if site:
        filters["linked_site"] = site
    if owner_user:
        filters["current_owner_user"] = owner_user
    if blocked_only:
        filters["is_blocked"] = 1
    if escalated_only:
        filters["escalated_to_user"] = ["is", "set"]
    if subject_doctype:
        filters["subject_doctype"] = subject_doctype

    return frappe.get_all(
        "GE Accountability Record",
        filters=filters,
        fields=[
            "name", "subject_doctype", "subject_name",
            "root_doctype", "root_name",
            "linked_project", "linked_site", "linked_stage",
            "current_status", "latest_event_type",
            "current_owner_role", "current_owner_user", "current_owner_department",
            "assigned_to_role", "assigned_to_user",
            "due_date", "is_blocked", "blocking_reason",
            "escalated_to_role", "escalated_to_user",
            "source_route", "creation", "modified",
        ],
        order_by="modified desc",
        limit_page_length=limit,
    )
