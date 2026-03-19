"""
RBAC Audit Logger — records all RBAC access changes.

Every mutation to role-pack mappings, user overrides, user context,
or user status is logged here for traceability.
"""
import json

import frappe


def _get_actor_name():
    """Return the full_name of the current user."""
    return (
        frappe.db.get_value("User", frappe.session.user, "full_name")
        or frappe.session.user
    )


def log_event(
    event_type,
    *,
    target_user=None,
    target_role=None,
    target_pack=None,
    action=None,
    scope=None,
    mode=None,
    old_value=None,
    new_value=None,
    valid_from=None,
    valid_to=None,
    remarks=None,
    snapshot=None,
):
    """
    Insert a GE RBAC Audit Log record.

    Args:
        event_type: One of the DocType select options
            (role_pack_assign, role_pack_remove, user_override_grant, etc.)
        target_user: User being affected (optional).
        target_role: Role being affected (optional).
        target_pack: Permission pack key (optional).
        action: Short action description.
        scope: Scope value if relevant.
        mode: Mode value if relevant.
        old_value: Previous state (string or dict → serialized).
        new_value: New state (string or dict → serialized).
        valid_from: Date string if temporal.
        valid_to: Date string if temporal.
        remarks: Free-text reason/notes.
        snapshot: JSON-serializable dict for permission snapshots.
    """
    pack_label = ""
    if target_pack:
        pack_label = (
            frappe.db.get_value("GE Permission Pack", target_pack, "pack_label")
            or target_pack
        )

    doc = frappe.get_doc({
        "doctype": "GE RBAC Audit Log",
        "event_type": event_type,
        "actor": frappe.session.user,
        "actor_name": _get_actor_name(),
        "target_user": target_user,
        "target_role": target_role,
        "target_pack": target_pack,
        "target_pack_label": pack_label,
        "action": action,
        "scope": scope,
        "mode": mode,
        "old_value": _serialize(old_value),
        "new_value": _serialize(new_value),
        "valid_from": valid_from,
        "valid_to": valid_to,
        "remarks": remarks,
        "snapshot": _serialize(snapshot),
    })
    doc.insert(ignore_permissions=True)
    return doc.name


def _serialize(value):
    """Convert dicts/lists to JSON strings; leave strings as-is."""
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, default=str)
    return str(value)


def log_role_pack_assign(role, packs_added, packs_removed=None):
    """Log when role-pack mappings are changed."""
    for pk in (packs_added or []):
        log_event(
            "role_pack_assign",
            target_role=role,
            target_pack=pk.get("pack_key", pk) if isinstance(pk, dict) else pk,
            action="assign",
            scope=pk.get("scope", "") if isinstance(pk, dict) else "",
            mode=pk.get("mode", "") if isinstance(pk, dict) else "",
        )
    for pk in (packs_removed or []):
        pack_key = pk.get("pack_key", pk) if isinstance(pk, dict) else pk
        log_event(
            "role_pack_remove",
            target_role=role,
            target_pack=pack_key,
            action="remove",
        )


def log_user_override(user, pack_key, grant_or_revoke, **kwargs):
    """Log when a user pack override is created/updated."""
    event_type = (
        "user_override_grant" if grant_or_revoke == "Grant"
        else "user_override_revoke"
    )
    log_event(
        event_type,
        target_user=user,
        target_pack=pack_key,
        action=grant_or_revoke.lower(),
        scope=kwargs.get("scope"),
        mode=kwargs.get("mode"),
        valid_from=kwargs.get("valid_from"),
        valid_to=kwargs.get("valid_to"),
        remarks=kwargs.get("remarks"),
    )


def log_user_override_remove(user, pack_key, override_name):
    """Log when a user pack override is deleted."""
    log_event(
        "user_override_remove",
        target_user=user,
        target_pack=pack_key,
        action="remove",
        remarks=f"Override {override_name} removed",
    )


def log_user_context_update(user, old_context, new_context):
    """Log when a user context is created or updated."""
    log_event(
        "user_context_update",
        target_user=user,
        action="update",
        old_value=old_context,
        new_value=new_context,
    )


def log_user_status_change(user, old_status, new_status):
    """Log when a user's active status changes."""
    log_event(
        "user_status_change",
        target_user=user,
        action="status_change",
        old_value=str(old_status),
        new_value=str(new_status),
    )


def log_permission_snapshot(user, snapshot_data):
    """Log a frozen permission snapshot for compliance."""
    return log_event(
        "permission_snapshot",
        target_user=user,
        action="snapshot",
        snapshot=snapshot_data,
    )
