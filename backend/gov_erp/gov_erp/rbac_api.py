"""
Phase 3 — RBAC API Contract Layer.

Exposes the RBAC permission truth to the frontend via whitelisted endpoints.
All endpoints are callable at:
    frappe.call("gov_erp.rbac_api.<method_name>", ...)

Read endpoints:
    get_permission_packs       — list packs with capabilities
    get_role_pack_matrix       — role-to-pack matrix
    get_user_effective_permissions — resolved capabilities for a user
    get_user_context           — user context assignment

Write endpoints:
    assign_role_packs          — create/update role-pack mappings
    assign_user_override       — create/update user pack overrides
    update_user_context        — update user context assignment
"""
import json

import frappe
from frappe.utils import cint, getdate, today

from gov_erp.permission_engine import PermissionEngine
from gov_erp import rbac_audit


# ── Helpers ──────────────────────────────────────────────────────────────────

def _require_authenticated():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.PermissionError)


def _get_engine(user=None):
    """Request-scoped PermissionEngine."""
    user = user or frappe.session.user
    cache_key = f"_permission_engine_{user}"
    engine = getattr(frappe.local, cache_key, None)
    if engine is None:
        engine = PermissionEngine(user=user)
        setattr(frappe.local, cache_key, engine)
    return engine


def _require_settings_capability(capability_key):
    """Guard: current user must have the given settings capability."""
    _require_authenticated()
    engine = _get_engine()
    if not (engine.is_director or engine.is_system_manager):
        engine.check_capability(capability_key)


def _is_settings_admin():
    """Check if the current user can manage settings (no throw)."""
    engine = _get_engine()
    return (
        engine.is_director
        or engine.is_system_manager
        or engine.has_capability("settings.pack.manage")
        or engine.has_capability("settings.role.manage")
    )


def _parse_csv_list(raw_value):
    if not raw_value:
        return []
    if isinstance(raw_value, (list, tuple, set)):
        return [str(v).strip() for v in raw_value if str(v).strip()]
    return [part.strip() for part in str(raw_value).split(",") if part.strip()]


def _validate_link_targets(doctype, values, label):
    missing = [value for value in values if not frappe.db.exists(doctype, value)]
    if missing:
        frappe.throw(f"Invalid {label}: {', '.join(missing)}")


# ═══════════════════════════════════════════════════════════════════════════
#  READ ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


@frappe.whitelist()
def get_permission_packs(pack_key=None, include_items=True):
    """
    Return permission packs with their capabilities.

    Args:
        pack_key: Optional — return a single pack by key.
        include_items: Whether to include the capability items (default True).

    Returns:
        List of pack dicts (or a single dict if pack_key specified).
    """
    _require_authenticated()
    _require_settings_capability("settings.pack.manage")

    include_items = cint(include_items)

    filters = {"is_active": 1}
    if pack_key:
        filters["pack_key"] = pack_key

    packs = frappe.get_all(
        "GE Permission Pack",
        filters=filters,
        fields=[
            "name", "pack_key", "pack_label", "description",
            "module_family", "is_system_pack", "sort_order",
            "ui_color", "ui_icon",
        ],
        order_by="sort_order asc",
    )

    if include_items:
        for pack in packs:
            pack["items"] = frappe.get_all(
                "GE Permission Pack Item",
                filters={"parent": pack["name"]},
                fields=[
                    "capability", "default_scope", "default_mode",
                    "required_for_pack", "display_order", "notes",
                ],
                order_by="display_order asc",
            )
            # Enrich each item with the capability label and metadata
            for item in pack["items"]:
                cap = frappe.db.get_value(
                    "GE Permission Capability",
                    item["capability"],
                    ["capability_label", "module_key", "action_type", "is_sensitive"],
                    as_dict=True,
                )
                if cap:
                    item["capability_label"] = cap.capability_label
                    item["module_key"] = cap.module_key
                    item["action_type"] = cap.action_type
                    item["is_sensitive"] = cap.is_sensitive
            pack["capability_count"] = len(pack["items"])

    if pack_key:
        return packs[0] if packs else None

    return packs


@frappe.whitelist()
def get_role_pack_matrix():
    """
    Return the full role-to-pack mapping matrix.

    Returns:
        {
            "roles": [{"role": ..., "packs": [{"pack_key": ..., "scope": ..., "mode": ..., ...}]}],
            "packs": [{"pack_key": ..., "pack_label": ...}],
        }
    """
    _require_authenticated()
    _require_settings_capability("settings.role.manage")

    # All active packs (for column headers)
    packs = frappe.get_all(
        "GE Permission Pack",
        filters={"is_active": 1},
        fields=["name", "pack_key", "pack_label", "ui_color", "ui_icon", "sort_order"],
        order_by="sort_order asc",
    )

    # All enabled mappings
    mappings = frappe.get_all(
        "GE Role Pack Mapping",
        filters={"is_enabled": 1},
        fields=[
            "name", "role", "permission_pack", "scope", "mode",
            "is_system_default",
        ],
    )

    # Group by role
    role_map = {}
    for m in mappings:
        role_map.setdefault(m.role, []).append({
            "mapping_name": m.name,
            "pack_key": m.permission_pack,
            "scope": m.scope,
            "mode": m.mode,
            "is_system_default": m.is_system_default,
        })

    # Build ordered role list
    from gov_erp.rbac_seed import ROLE_PRIORITY
    ordered_roles = []
    seen = set()
    for role_name in ROLE_PRIORITY:
        if role_name in role_map:
            ordered_roles.append({
                "role": role_name,
                "packs": role_map[role_name],
            })
            seen.add(role_name)
    # Add any roles not in ROLE_PRIORITY
    for role_name in sorted(role_map.keys()):
        if role_name not in seen:
            ordered_roles.append({
                "role": role_name,
                "packs": role_map[role_name],
            })

    return {
        "roles": ordered_roles,
        "packs": packs,
    }


@frappe.whitelist()
def get_user_effective_permissions(user=None):
    """
    Return the resolved effective permissions for a user.

    Non-admin users can only query their own permissions.
    Admin users (settings.role.manage or Director/System Manager) can query any user.

    Args:
        user: The user to resolve permissions for. Defaults to session user.

    Returns:
        Dict with complete effective permission summary.
    """
    _require_authenticated()

    target_user = user or frappe.session.user
    if target_user != frappe.session.user and not _is_settings_admin():
        frappe.throw("You can only view your own permissions", frappe.PermissionError)

    engine = _get_engine(target_user)
    summary = engine.get_effective_summary()

    # Enrich with pack-level breakdown
    role_mappings = frappe.get_all(
        "GE Role Pack Mapping",
        filters={
            "role": ["in", list(engine.user_roles)],
            "is_enabled": 1,
        },
        fields=["role", "permission_pack", "scope", "mode"],
    )

    pack_breakdown = {}
    for m in role_mappings:
        pack_key = m.permission_pack
        if pack_key not in pack_breakdown:
            pack_info = frappe.db.get_value(
                "GE Permission Pack", pack_key,
                ["pack_label", "ui_color", "ui_icon", "module_family"],
                as_dict=True,
            ) or {}
            pack_breakdown[pack_key] = {
                "pack_key": pack_key,
                "pack_label": pack_info.get("pack_label", pack_key),
                "ui_color": pack_info.get("ui_color", ""),
                "ui_icon": pack_info.get("ui_icon", ""),
                "module_family": pack_info.get("module_family", ""),
                "granted_by_roles": [],
                "effective_scope": m.scope,
                "effective_mode": m.mode,
            }
        pack_breakdown[pack_key]["granted_by_roles"].append({
            "role": m.role,
            "scope": m.scope,
            "mode": m.mode,
        })
        # Keep the broadest scope/mode
        existing = pack_breakdown[pack_key]
        existing["effective_scope"] = engine._broader_scope(
            existing["effective_scope"], m.scope,
        )
        existing["effective_mode"] = engine._broader_mode(
            existing["effective_mode"], m.mode,
        )

    # User overrides
    today_date = getdate(today())
    overrides = frappe.get_all(
        "GE User Pack Override",
        filters={"user": target_user},
        fields=[
            "name", "permission_pack", "scope", "mode",
            "grant_or_revoke", "valid_from", "valid_to",
            "granted_by", "remarks",
        ],
    )
    active_overrides = []
    for ovr in overrides:
        is_active = True
        if ovr.valid_from and getdate(ovr.valid_from) > today_date:
            is_active = False
        if ovr.valid_to and getdate(ovr.valid_to) < today_date:
            is_active = False
        pack_info = frappe.db.get_value(
            "GE Permission Pack", ovr.permission_pack,
            ["pack_label"], as_dict=True,
        ) or {}
        active_overrides.append({
            "name": ovr.name,
            "pack_key": ovr.permission_pack,
            "pack_label": pack_info.get("pack_label", ovr.permission_pack),
            "scope": ovr.scope,
            "mode": ovr.mode,
            "grant_or_revoke": ovr.grant_or_revoke,
            "valid_from": ovr.valid_from,
            "valid_to": ovr.valid_to,
            "granted_by": ovr.granted_by,
            "remarks": ovr.remarks,
            "is_currently_active": is_active,
        })

    summary["pack_breakdown"] = sorted(
        pack_breakdown.values(),
        key=lambda p: p.get("pack_label", ""),
    )
    summary["overrides"] = active_overrides
    summary["accessible_modules"] = engine.get_accessible_modules()
    summary["visible_tabs"] = engine.get_visible_tabs()

    return summary


@frappe.whitelist()
def get_user_context(user=None):
    """
    Return the GE User Context for a user.

    Non-admin users can only query their own context.
    Admin users can query any user.

    Args:
        user: The user to look up. Defaults to session user.

    Returns:
        Dict of user context fields, or empty context if none exists.
    """
    _require_authenticated()

    target_user = user or frappe.session.user
    if target_user != frappe.session.user and not _is_settings_admin():
        frappe.throw("You can only view your own context", frappe.PermissionError)

    if not frappe.db.exists("GE User Context", target_user):
        return {
            "user": target_user,
            "department": "",
            "designation": "",
            "primary_role": "",
            "secondary_roles": "",
            "assigned_projects": "",
            "assigned_sites": "",
            "region": "",
            "is_active": 1,
            "exists": False,
        }

    ctx = frappe.get_doc("GE User Context", target_user)
    return {
        "user": ctx.user,
        "department": ctx.department or "",
        "designation": ctx.designation or "",
        "primary_role": ctx.primary_role or "",
        "secondary_roles": ctx.secondary_roles or "",
        "assigned_projects": ctx.assigned_projects or "",
        "assigned_sites": ctx.assigned_sites or "",
        "region": ctx.region or "",
        "is_active": cint(ctx.is_active),
        "exists": True,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  WRITE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


@frappe.whitelist(methods=["POST"])
def assign_role_packs(role, packs):
    """
    Create or update role-pack mappings for a role.

    Replaces the entire pack set for the role with the provided list.

    Args:
        role: The Frappe role name.
        packs: JSON list of dicts, each with:
            - pack_key (required)
            - scope (optional, default: pack's default)
            - mode (optional, default: pack's default)

    Returns:
        {"message": "...", "mappings_count": N}
    """
    _require_settings_capability("settings.role.manage")

    if not role or not frappe.db.exists("Role", role):
        frappe.throw(f"Role '{role}' does not exist")

    if isinstance(packs, str):
        packs = json.loads(packs)
    if not isinstance(packs, list):
        frappe.throw("packs must be a list")

    # Validate all pack_keys exist
    pack_keys = set()
    for p in packs:
        pk = p.get("pack_key")
        if not pk:
            frappe.throw("Each pack entry must have a 'pack_key'")
        if not frappe.db.exists("GE Permission Pack", pk):
            frappe.throw(f"Permission pack '{pk}' does not exist")
        pack_keys.add(pk)

    # Remove old non-system mappings for this role that are not in the new set
    existing = frappe.get_all(
        "GE Role Pack Mapping",
        filters={"role": role},
        fields=["name", "permission_pack", "is_system_default"],
    )
    removed_packs = []
    for ex in existing:
        if ex.permission_pack not in pack_keys:
            if not ex.is_system_default:
                removed_packs.append(ex.permission_pack)
                frappe.delete_doc(
                    "GE Role Pack Mapping", ex.name,
                    ignore_permissions=True, force=True,
                )

    # Create or update mappings
    for p in packs:
        pk = p["pack_key"]
        scope = p.get("scope", "")
        mode = p.get("mode", "")

        existing_name = frappe.db.exists("GE Role Pack Mapping", {
            "role": role,
            "permission_pack": pk,
        })

        if existing_name:
            update_vals = {"is_enabled": 1}
            if scope:
                update_vals["scope"] = scope
            if mode:
                update_vals["mode"] = mode
            frappe.db.set_value(
                "GE Role Pack Mapping", existing_name,
                update_vals, update_modified=True,
            )
        else:
            frappe.get_doc({
                "doctype": "GE Role Pack Mapping",
                "role": role,
                "permission_pack": pk,
                "scope": scope or "department",
                "mode": mode or "read",
                "is_enabled": 1,
                "is_system_default": 0,
            }).insert(ignore_permissions=True)

    frappe.db.commit()

    # ── Audit logging ──
    rbac_audit.log_role_pack_assign(role, packs, removed_packs)

    return {
        "message": f"Role-pack mappings updated for '{role}'",
        "mappings_count": len(packs),
    }


@frappe.whitelist(methods=["POST"])
def assign_user_override(user, pack_key, grant_or_revoke,
                         scope=None, mode=None, remarks=None,
                         valid_from=None, valid_to=None):
    """
    Create or update a user pack override.

    Args:
        user: The user to override.
        pack_key: The permission pack key.
        grant_or_revoke: "Grant" or "Revoke".
        scope: Optional scope override.
        mode: Optional mode override.
        remarks: Optional reason text.
        valid_from: Optional start date (YYYY-MM-DD).
        valid_to: Optional end date (YYYY-MM-DD).

    Returns:
        {"message": "...", "override_name": "..."}
    """
    _require_settings_capability("settings.user_role.manage")

    if not user or not frappe.db.exists("User", user):
        frappe.throw(f"User '{user}' does not exist")
    if not pack_key or not frappe.db.exists("GE Permission Pack", pack_key):
        frappe.throw(f"Permission pack '{pack_key}' does not exist")
    if grant_or_revoke not in ("Grant", "Revoke"):
        frappe.throw("grant_or_revoke must be 'Grant' or 'Revoke'")

    # Check if an override already exists for this user+pack+action
    existing = frappe.db.exists("GE User Pack Override", {
        "user": user,
        "permission_pack": pack_key,
        "grant_or_revoke": grant_or_revoke,
    })

    if existing:
        doc = frappe.get_doc("GE User Pack Override", existing)
        if scope:
            doc.scope = scope
        if mode:
            doc.mode = mode
        if remarks is not None:
            doc.remarks = remarks
        if valid_from is not None:
            doc.valid_from = valid_from
        if valid_to is not None:
            doc.valid_to = valid_to
        doc.granted_by = frappe.session.user
        doc.save(ignore_permissions=True)
        override_name = doc.name
    else:
        doc = frappe.get_doc({
            "doctype": "GE User Pack Override",
            "user": user,
            "permission_pack": pack_key,
            "scope": scope or "",
            "mode": mode or "",
            "grant_or_revoke": grant_or_revoke,
            "remarks": remarks or "",
            "valid_from": valid_from,
            "valid_to": valid_to,
            "granted_by": frappe.session.user,
        })
        doc.insert(ignore_permissions=True)
        override_name = doc.name

    frappe.db.commit()

    # ── Audit logging ──
    rbac_audit.log_user_override(
        user, pack_key, grant_or_revoke,
        scope=scope, mode=mode, remarks=remarks,
        valid_from=valid_from, valid_to=valid_to,
    )

    return {
        "message": f"Override '{grant_or_revoke}' for pack '{pack_key}' on user '{user}' saved",
        "override_name": override_name,
    }


@frappe.whitelist(methods=["POST"])
def update_user_context(user, department=None, designation=None,
                        primary_role=None, secondary_roles=None,
                        assigned_projects=None, assigned_sites=None,
                        region=None, is_active=None):
    """
    Create or update a GE User Context record.

    Args:
        user: The user to update.
        department: Department name.
        designation: Designation/title.
        primary_role: The user's primary business role.
        secondary_roles: Comma-separated secondary roles.
        assigned_projects: Comma-separated project names.
        assigned_sites: Comma-separated site names.
        region: Region string.
        is_active: 1 or 0.

    Returns:
        {"message": "...", "user": "..."}
    """
    _require_settings_capability("settings.user_role.manage")

    if not user or not frappe.db.exists("User", user):
        frappe.throw(f"User '{user}' does not exist")
    if primary_role is not None and primary_role and not frappe.db.exists("Role", primary_role):
        frappe.throw(f"Role '{primary_role}' does not exist")

    project_values = _parse_csv_list(assigned_projects) if assigned_projects is not None else None
    site_values = _parse_csv_list(assigned_sites) if assigned_sites is not None else None
    if project_values is not None:
        _validate_link_targets("Project", project_values, "assigned projects")
        assigned_projects = ", ".join(project_values)
    if site_values is not None:
        _validate_link_targets("GE Site", site_values, "assigned sites")
        assigned_sites = ", ".join(site_values)

    existing = frappe.db.exists("GE User Context", user)

    # Capture old context for audit
    old_ctx = None
    if existing:
        doc = frappe.get_doc("GE User Context", existing)
        old_ctx = {
            "department": doc.department, "designation": doc.designation,
            "primary_role": doc.primary_role, "secondary_roles": doc.secondary_roles,
            "assigned_projects": doc.assigned_projects, "assigned_sites": doc.assigned_sites,
            "region": doc.region, "is_active": doc.is_active,
        }
        if department is not None:
            doc.department = department
        if designation is not None:
            doc.designation = designation
        if primary_role is not None:
            doc.primary_role = primary_role
        if secondary_roles is not None:
            doc.secondary_roles = secondary_roles
        if assigned_projects is not None:
            doc.assigned_projects = assigned_projects
        if assigned_sites is not None:
            doc.assigned_sites = assigned_sites
        if region is not None:
            doc.region = region
        if is_active is not None:
            doc.is_active = cint(is_active)
        doc.save(ignore_permissions=True)
    else:
        frappe.get_doc({
            "doctype": "GE User Context",
            "user": user,
            "department": department or "",
            "designation": designation or "",
            "primary_role": primary_role or "",
            "secondary_roles": secondary_roles or "",
            "assigned_projects": assigned_projects or "",
            "assigned_sites": assigned_sites or "",
            "region": region or "",
            "is_active": cint(is_active) if is_active is not None else 1,
        }).insert(ignore_permissions=True)

    frappe.db.commit()

    # ── Audit logging ──
    new_ctx = {
        "department": department, "designation": designation,
        "primary_role": primary_role, "secondary_roles": secondary_roles,
        "assigned_projects": assigned_projects, "assigned_sites": assigned_sites,
        "region": region, "is_active": is_active,
    }
    # Remove None entries (fields that were not changed)
    new_ctx = {k: v for k, v in new_ctx.items() if v is not None}
    rbac_audit.log_user_context_update(user, old_ctx, new_ctx)

    return {
        "message": f"User context updated for '{user}'",
        "user": user,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  UTILITY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


@frappe.whitelist()
def get_all_capabilities(module_key=None):
    """
    Return all registered capabilities, optionally filtered by module.

    Args:
        module_key: Optional module filter (e.g. "engineering", "finance").

    Returns:
        List of capability dicts.
    """
    _require_authenticated()
    _require_settings_capability("settings.pack.manage")

    filters = {"is_active": 1}
    if module_key:
        filters["module_key"] = module_key

    return frappe.get_all(
        "GE Permission Capability",
        filters=filters,
        fields=[
            "capability_key", "capability_label", "module_key",
            "department_key", "entity_type", "action_type",
            "is_sensitive",
        ],
        order_by="module_key asc, capability_key asc",
    )


@frappe.whitelist()
def get_rbac_users(department=None, role=None, is_active=1):
    """
    Return user contexts for admin user management screens.

    Only accessible to settings admins.

    Args:
        department: Optional department filter.
        role: Optional primary_role filter.
        is_active: Filter by active status (default 1).

    Returns:
        List of user context dicts with user full_name.
    """
    _require_settings_capability("settings.user_role.manage")

    filters = {}
    if department:
        filters["department"] = department
    if role:
        filters["primary_role"] = role
    if is_active is not None:
        filters["is_active"] = cint(is_active)

    contexts = frappe.get_all(
        "GE User Context",
        filters=filters,
        fields=[
            "user", "department", "designation", "primary_role",
            "secondary_roles", "assigned_projects", "assigned_sites",
            "region", "is_active",
        ],
        order_by="user asc",
    )

    # Enrich with user full_name
    for ctx in contexts:
        ctx["full_name"] = frappe.db.get_value("User", ctx["user"], "full_name") or ctx["user"]

    return contexts


@frappe.whitelist(methods=["POST"])
def remove_user_override(override_name):
    """
    Delete a user pack override by name.

    Args:
        override_name: The document name of the GE User Pack Override.

    Returns:
        {"message": "..."}
    """
    _require_settings_capability("settings.user_role.manage")

    if not override_name or not frappe.db.exists("GE User Pack Override", override_name):
        frappe.throw(f"Override '{override_name}' does not exist")

    # Capture details before deletion for audit
    ovr_doc = frappe.get_doc("GE User Pack Override", override_name)
    ovr_user = ovr_doc.user
    ovr_pack = ovr_doc.permission_pack

    frappe.delete_doc(
        "GE User Pack Override", override_name,
        ignore_permissions=True, force=True,
    )
    frappe.db.commit()

    # ── Audit logging ──
    rbac_audit.log_user_override_remove(ovr_user, ovr_pack, override_name)

    return {"message": f"Override '{override_name}' removed"}


# ═══════════════════════════════════════════════════════════════════════════
#  PHASE 5 — FRONTEND NAVIGATION ENFORCEMENT
# ═══════════════════════════════════════════════════════════════════════════


@frappe.whitelist()
def get_frontend_permissions():
    """
    Compact permission payload optimized for the frontend navigation shell.

    Returns the current session user's:
    - accessible module keys
    - accessible route prefixes (from module capabilities)
    - all gated route prefixes (so the frontend can tell gated from ungated)
    - visible workspace tabs
    - individual capability keys with scope/mode
    - key flags (is_superuser, can_access_settings)
    - user context (department, projects, sites)

    This is the single source of truth the frontend should use for:
    - sidebar link filtering
    - route guard enforcement
    - action button visibility
    - tab visibility in project workspaces
    """
    _require_authenticated()

    engine = _get_engine()

    caps = engine.effective_capabilities
    capabilities = {
        cap_key: {"scope": grant["scope"], "mode": grant["mode"]}
        for cap_key, grant in caps.items()
    }

    from gov_erp.permission_engine import MODULE_ROUTE_MAP, _get_all_gated_prefixes

    return {
        "user": engine.user,
        "is_superuser": engine.is_director or engine.is_system_manager,
        "accessible_modules": engine.get_accessible_modules(),
        "accessible_routes": engine.get_accessible_routes(),
        "gated_route_prefixes": sorted(_get_all_gated_prefixes()),
        "visible_tabs": engine.get_visible_tabs(),
        "capabilities": capabilities,
        "can_access_settings": engine.has_capability("settings.department.manage"),
        "user_context": {
            "department": engine.department,
            "assigned_projects": sorted(engine.assigned_projects),
            "assigned_sites": sorted(engine.assigned_sites),
        },
    }


# ═══════════════════════════════════════════════════════════════════════════
#  PHASE 6 — PROJECT WORKSPACE INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════


@frappe.whitelist()
def get_workspace_permissions(project=None):
    """
    Return the current user's workspace-specific permissions for a project.

    Resolves pack-driven permissions:
    - Project Command Pack → workspace access, stage lifecycle, members
    - Department packs → department lane visibility
    - DMS Pack → file management rights
    - Approval Pack → approval actions
    - Inventory Pack → stock/GRN views

    Args:
        project: Optional project name for scope validation.

    Returns:
        Dict with boolean flags and department access map.
    """
    _require_authenticated()

    engine = _get_engine()
    return engine.get_workspace_permissions(project_name=project)


# ═══════════════════════════════════════════════════════════════════════════
#  PHASE 7 — AUDIT AND REPORTING
# ═══════════════════════════════════════════════════════════════════════════


@frappe.whitelist()
def get_rbac_audit_log(
    event_type=None, target_user=None, target_role=None,
    target_pack=None, actor=None, from_date=None, to_date=None,
    limit_page_length=50, limit_start=0,
):
    """
    Query the RBAC audit log with optional filters.

    Args:
        event_type: Filter by event type.
        target_user: Filter by affected user.
        target_role: Filter by affected role.
        target_pack: Filter by pack key.
        actor: Filter by who made the change.
        from_date: Start date (YYYY-MM-DD).
        to_date: End date (YYYY-MM-DD).
        limit_page_length: Page size (default 50).
        limit_start: Offset (default 0).

    Returns:
        {"logs": [...], "total": N}
    """
    _require_authenticated()
    _require_settings_capability("settings.role.manage")

    filters = {}
    if event_type:
        filters["event_type"] = event_type
    if target_user:
        filters["target_user"] = target_user
    if target_role:
        filters["target_role"] = target_role
    if target_pack:
        filters["target_pack"] = target_pack
    if actor:
        filters["actor"] = actor
    if from_date:
        filters["creation"] = [">=", from_date]
    if to_date:
        if "creation" in filters:
            filters["creation"] = ["between", [from_date, to_date + " 23:59:59"]]
        else:
            filters["creation"] = ["<=", to_date + " 23:59:59"]

    logs = frappe.get_all(
        "GE RBAC Audit Log",
        filters=filters,
        fields=[
            "name", "event_type", "actor", "actor_name",
            "target_user", "target_role", "target_pack", "target_pack_label",
            "action", "scope", "mode",
            "old_value", "new_value",
            "valid_from", "valid_to",
            "remarks", "creation",
        ],
        order_by="creation desc",
        limit_page_length=cint(limit_page_length),
        limit_start=cint(limit_start),
    )

    total = frappe.db.count("GE RBAC Audit Log", filters=filters)

    return {"logs": logs, "total": total}


@frappe.whitelist()
def get_rbac_audit_event_types():
    """Return the available event types for filtering."""
    _require_authenticated()
    return [
        {"value": "role_pack_assign", "label": "Role Pack Assigned"},
        {"value": "role_pack_remove", "label": "Role Pack Removed"},
        {"value": "user_override_grant", "label": "User Override Granted"},
        {"value": "user_override_revoke", "label": "User Override Revoked"},
        {"value": "user_override_remove", "label": "User Override Removed"},
        {"value": "user_context_update", "label": "User Context Updated"},
        {"value": "user_status_change", "label": "User Status Changed"},
        {"value": "permission_snapshot", "label": "Permission Snapshot"},
    ]


@frappe.whitelist(methods=["POST"])
def create_permission_snapshot(user=None):
    """
    Create and log a frozen permission snapshot for a user.

    Captures the complete effective permissions at this point in time.
    Useful for compliance audits and debugging.

    Args:
        user: The user to snapshot (default: session user).
            Admin users can snapshot any user.

    Returns:
        {"message": "...", "log_name": "...", "snapshot": {...}}
    """
    _require_authenticated()

    target_user = user or frappe.session.user
    if target_user != frappe.session.user and not _is_settings_admin():
        frappe.throw("You can only snapshot your own permissions", frappe.PermissionError)

    engine = _get_engine(target_user)
    summary = engine.get_effective_summary()
    summary["accessible_modules"] = engine.get_accessible_modules()
    summary["visible_tabs"] = engine.get_visible_tabs()
    summary["timestamp"] = frappe.utils.now()

    log_name = rbac_audit.log_permission_snapshot(target_user, summary)
    frappe.db.commit()

    return {
        "message": f"Permission snapshot created for '{target_user}'",
        "log_name": log_name,
        "snapshot": summary,
    }
