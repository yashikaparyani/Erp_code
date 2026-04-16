"""
RBAC Permission Engine — centralized permission resolution.

Resolves effective permissions for any user by composing:
  1. Role → Pack mappings  (GE Role Pack Mapping)
  2. Pack → Capability items (GE Permission Pack Item)
  3. User-level overrides   (GE User Pack Override)
  4. User context / scope   (GE User Context)

Usage:
    from gov_erp.permission_engine import PermissionEngine

    engine = PermissionEngine(user=frappe.session.user)
    engine.has_capability("project.site.view")
    engine.has_capability("finance.invoice.create", project="PROJ-001")
    engine.can_access_module("engineering")
    engine.can_access_route("/engineering/projects")
    engine.check_capability("project.stage.approve")  # throws on deny
"""
import frappe
from frappe.utils import getdate, today


# ── Scope hierarchy (broader scopes include narrower ones) ──────────────────
SCOPE_HIERARCHY = {
    "all":               5,
    "cross_stage_write": 4,
    "cross_stage_read":  3,
    "project_family":    3,
    "department":        2,
    "assigned_project":  1,
    "assigned_site":     1,
    "own":               0,
}

# ── Mode hierarchy ──────────────────────────────────────────────────────────
MODE_HIERARCHY = {
    "override": 3,
    "approve":  2,
    "action":   1,
    "read":     0,
}

# ── Module-to-route mapping ─────────────────────────────────────────────────
# Maps each RBAC module to the frontend route prefixes it governs.
# Routes not listed here are considered ungated (allowed for all authenticated
# users).  Add entries whenever a new module-specific route is created.
MODULE_ROUTE_MAP = {
    "project":     ["/projects", "/milestones", "/project-manager", "/project-head", "/comm-logs"],
    "presales":    ["/pre-sales", "/survey"],
    "engineering": ["/engineering", "/survey", "/drawings", "/change-requests"],
    "procurement": ["/procurement", "/indents", "/purchase-orders", "/petty-cash", "/vendor-comparisons"],
    "execution":   ["/execution", "/manpower", "/technician-visits", "/dispatch-challans", "/sites"],
    "inventory":   ["/inventory", "/grns", "/stock-position", "/stock-aging"],
    "finance":     ["/finance", "/payment-receipts", "/retention", "/penalties"],
    "hr":          ["/hr"],
    "om":          ["/om-helpdesk", "/rma", "/sla", "/sla-profiles", "/device-uptime", "/sla-penalties"],
    "dms":         ["/documents"],
    "reports":     ["/reports", "/accountability"],
    "master_data": ["/master-data"],
    "approval":    [],
    "settings":    ["/settings"],
}

# ── Public routes (accessible to any authenticated user) ────────────────────
# These are NOT gated by any module — they serve cross-cutting user needs.
PUBLIC_ROUTES = {
    "/login",
    "/profile",
    "/notifications",
}

# All module-gated route prefixes (flat set for fast lookup)
_ALL_GATED_PREFIXES: set[str] | None = None

ROLE_ROUTE_DENY_MAP = {
    "Project Manager": [
        "/projects",
        "/procurement",
        "/inventory",
        "/grns",
        "/petty-cash",
        "/documents",
        "/reports",
        "/accountability",
        "/execution",
        "/engineering",
        "/milestones",
        "/manpower",
        "/purchase-orders",
        "/indents",
        "/drawings",
        "/change-requests",
        "/technician-visits",
        "/stock-position",
        "/stock-aging",
        "/vendor-comparisons",
        "/dispatch-challans",
        "/sites",
    ],
}

def _get_all_gated_prefixes() -> set[str]:
    global _ALL_GATED_PREFIXES
    if _ALL_GATED_PREFIXES is None:
        _ALL_GATED_PREFIXES = {
            prefix
            for routes in MODULE_ROUTE_MAP.values()
            for prefix in routes
        }
    return _ALL_GATED_PREFIXES


def _matches_route_prefix(path: str, prefix: str) -> bool:
    return path == prefix or path.startswith(prefix + "/")

# ── Module-to-access capability ─────────────────────────────────────────────
MODULE_ACCESS_CAPABILITIES = {
    "project":     "project.workspace.access",
    "presales":    "presales.module.access",
    "engineering": "engineering.iteration.access",
    "procurement": "procurement.iteration.access",
    "inventory":   "inventory.module.access",
    "execution":   "execution.iteration.access",
    "finance":     "finance.iteration.access",
    "hr":          "hr.iteration.access",
    "om":          "om.iteration.access",
    "dms":         "dms.module.access",
    "reports":     "reports.module.access",
    "master_data": "master_data.module.access",
    "approval":    "approval.inbox.access",
    "settings":    "settings.department.manage",
}


class PermissionEngine:
    """
    Stateful permission resolver for a single user.

    Caches resolved permissions for the lifetime of the instance.
    Create a new instance per request or when user context changes.
    """

    def __init__(self, user=None):
        self.user = user or frappe.session.user
        self._user_roles = None
        self._user_context = None
        self._effective_caps = None  # dict: capability_key → {scope, mode}
        self._is_system_manager = None
        self._is_director = None

    # ── Core resolution ─────────────────────────────────────────────────

    @property
    def user_roles(self):
        """Frappe roles assigned to the user."""
        if self._user_roles is None:
            self._user_roles = set(frappe.get_roles(self.user))
        return self._user_roles

    @property
    def is_system_manager(self):
        if self._is_system_manager is None:
            self._is_system_manager = "System Manager" in self.user_roles
        return self._is_system_manager

    @property
    def is_director(self):
        if self._is_director is None:
            self._is_director = "Director" in self.user_roles
        return self._is_director

    @property
    def user_context(self):
        """GE User Context record for the user, or empty dict."""
        if self._user_context is None:
            self._user_context = self._load_user_context()
        return self._user_context

    @property
    def effective_capabilities(self):
        """
        Dict of capability_key → {"scope": str, "mode": str}
        representing the resolved permission set.
        """
        if self._effective_caps is None:
            self._effective_caps = self._resolve_effective_capabilities()
        return self._effective_caps

    def _load_user_context(self):
        """Load GE User Context for the user."""
        if not frappe.db.exists("GE User Context", self.user):
            return {
                "department": "",
                "designation": "",
                "primary_role": "",
                "secondary_roles": "",
                "assigned_projects": "",
                "assigned_sites": "",
                "region": "",
                "is_active": 1,
            }
        ctx = frappe.get_doc("GE User Context", self.user)
        return {
            "department": ctx.department or "",
            "designation": ctx.designation or "",
            "primary_role": ctx.primary_role or "",
            "secondary_roles": ctx.secondary_roles or "",
            "assigned_projects": ctx.assigned_projects or "",
            "assigned_sites": ctx.assigned_sites or "",
            "region": ctx.region or "",
            "is_active": ctx.is_active,
        }

    def _parse_csv(self, value):
        """Parse a comma-separated string into a set of stripped values."""
        if not value:
            return set()
        return {v.strip() for v in value.split(",") if v.strip()}

    def _project_manager_fallback_projects(self):
        if "Project Manager" not in self.user_roles:
            return set()
        return {
            row.name
            for row in frappe.get_all(
                "Project",
                filters={"project_manager_user": self.user},
                fields=["name"],
                limit_page_length=0,
            )
            if row.name
        }

    @property
    def assigned_projects(self):
        assigned = self._parse_csv(self.user_context.get("assigned_projects", ""))
        if assigned:
            return assigned
        return self._project_manager_fallback_projects()

    @property
    def assigned_sites(self):
        return self._parse_csv(self.user_context.get("assigned_sites", ""))

    @property
    def department(self):
        return self.user_context.get("department", "")

    def _effective_grant_value(self, explicit_value, default_value):
        """
        Prefer the mapping/override value when present; otherwise fall back to
        the pack-item default. This preserves intentional narrowing at the
        role-mapping layer.
        """
        return explicit_value or default_value

    def _resolve_effective_capabilities(self):
        """
        Build the effective capability map:
        1. Start with role-pack-mapping grants
        2. Apply user-pack overrides (grant / revoke)

        For each capability, keep the highest scope and mode seen.
        """
        # Director and System Manager get everything
        if self.is_director or self.is_system_manager:
            return self._build_superuser_caps()

        caps = {}

        # Step 1: Role → Pack → Capabilities
        role_mappings = frappe.get_all(
            "GE Role Pack Mapping",
            filters={
                "role": ["in", list(self.user_roles)],
                "is_enabled": 1,
            },
            fields=["permission_pack", "scope", "mode"],
        )

        for mapping in role_mappings:
            pack_items = frappe.get_all(
                "GE Permission Pack Item",
                filters={"parent": mapping.permission_pack},
                fields=["capability", "default_scope", "default_mode"],
            )
            for item in pack_items:
                cap_key = item.capability
                scope = self._effective_grant_value(mapping.scope, item.default_scope)
                mode = self._effective_grant_value(mapping.mode, item.default_mode)

                if cap_key in caps:
                    caps[cap_key] = {
                        "scope": self._broader_scope(caps[cap_key]["scope"], scope),
                        "mode": self._broader_mode(caps[cap_key]["mode"], mode),
                    }
                else:
                    caps[cap_key] = {"scope": scope, "mode": mode}

        # Step 2: User-level overrides
        today_date = getdate(today())
        overrides = frappe.get_all(
            "GE User Pack Override",
            filters={"user": self.user},
            fields=["permission_pack", "scope", "mode", "grant_or_revoke",
                     "valid_from", "valid_to"],
        )
        for ovr in overrides:
            # Check validity
            if ovr.valid_from and getdate(ovr.valid_from) > today_date:
                continue
            if ovr.valid_to and getdate(ovr.valid_to) < today_date:
                continue

            pack_items = frappe.get_all(
                "GE Permission Pack Item",
                filters={"parent": ovr.permission_pack},
                fields=["capability", "default_scope", "default_mode"],
            )

            if ovr.grant_or_revoke == "Grant":
                for item in pack_items:
                    cap_key = item.capability
                    scope = self._effective_grant_value(ovr.scope, item.default_scope)
                    mode = self._effective_grant_value(ovr.mode, item.default_mode)
                    if cap_key in caps:
                        caps[cap_key] = {
                            "scope": self._broader_scope(caps[cap_key]["scope"], scope),
                            "mode": self._broader_mode(caps[cap_key]["mode"], mode),
                        }
                    else:
                        caps[cap_key] = {"scope": scope, "mode": mode}
            elif ovr.grant_or_revoke == "Revoke":
                for item in pack_items:
                    caps.pop(item.capability, None)

        return caps

    def _build_superuser_caps(self):
        """Build a capability map that grants everything at 'all' scope and 'override' mode."""
        all_caps = frappe.get_all(
            "GE Permission Capability",
            filters={"is_active": 1},
            pluck="capability_key",
        )
        return {cap: {"scope": "all", "mode": "override"} for cap in all_caps}

    def _broader_scope(self, scope_a, scope_b):
        """Return the broader of two scopes."""
        rank_a = SCOPE_HIERARCHY.get(scope_a, 0)
        rank_b = SCOPE_HIERARCHY.get(scope_b, 0)
        return scope_a if rank_a >= rank_b else scope_b

    def _broader_mode(self, mode_a, mode_b):
        """Return the higher-privilege mode."""
        rank_a = MODE_HIERARCHY.get(mode_a, 0)
        rank_b = MODE_HIERARCHY.get(mode_b, 0)
        return mode_a if rank_a >= rank_b else mode_b

    # ── Capability checks ────────────────────────────────────────────────

    def has_capability(self, capability_key, project=None, site=None,
                       required_mode=None):
        """
        Check if the user has the given capability.

        Args:
            capability_key: e.g. "project.site.view"
            project: Optional project name for scope validation
            site: Optional site name for scope validation
            required_mode: If set, checks mode is at least this level

        Returns:
            True if the user has the capability (with matching scope/mode).
        """
        if self.user == "Guest":
            return False

        cap = self.effective_capabilities.get(capability_key)
        if not cap:
            return False

        # Mode check
        if required_mode:
            if MODE_HIERARCHY.get(cap["mode"], 0) < MODE_HIERARCHY.get(required_mode, 0):
                return False

        # Department-scoped grants are only meaningful when the user context
        # actually carries a department identity.
        if cap["scope"] == "department" and not self.department:
            return False

        # Scope check — if project/site is specified, validate scope
        if project and cap["scope"] in ("assigned_project", "assigned_site"):
            if project not in self.assigned_projects:
                return False

        if site and cap["scope"] == "assigned_site":
            if site not in self.assigned_sites:
                return False

        return True

    def check_capability(self, capability_key, project=None, site=None,
                         required_mode=None):
        """
        Like has_capability but throws frappe.PermissionError on deny.
        """
        if not self.has_capability(capability_key, project=project,
                                   site=site, required_mode=required_mode):
            frappe.throw(
                f"Permission denied: {capability_key}",
                frappe.PermissionError,
            )

    def has_any_capability(self, *capability_keys, project=None, site=None):
        """Check if user has at least one of the given capabilities."""
        return any(
            self.has_capability(ck, project=project, site=site)
            for ck in capability_keys
        )

    def check_any_capability(self, *capability_keys, project=None, site=None):
        """Like has_any_capability but throws on deny."""
        if not self.has_any_capability(*capability_keys, project=project,
                                       site=site):
            keys = ", ".join(capability_keys)
            frappe.throw(
                f"Permission denied: requires one of [{keys}]",
                frappe.PermissionError,
            )

    # ── Module / Route checks ────────────────────────────────────────────

    def can_access_module(self, module_key):
        """
        Check if user can access a module.

        Args:
            module_key: e.g. "engineering", "finance", "project"
        """
        cap_key = MODULE_ACCESS_CAPABILITIES.get(module_key)
        if not cap_key:
            return False
        return self.has_capability(cap_key)

    def check_module_access(self, module_key):
        """Like can_access_module but throws on deny."""
        if not self.can_access_module(module_key):
            frappe.throw(
                f"Permission denied: no access to module '{module_key}'",
                frappe.PermissionError,
            )

    def can_access_route(self, route_path):
        """
        Check if user can access a frontend route path.

        Fail-closed: routes not in MODULE_ROUTE_MAP or PUBLIC_ROUTES are denied.

        Args:
            route_path: e.g. "/engineering/projects/PROJ-001"
        """
        # System Manager / Director bypass
        if self.is_system_manager or self.is_director:
            return True
        # Explicit deny-list per role
        for role, denied_prefixes in ROLE_ROUTE_DENY_MAP.items():
            if role in self.user_roles and any(_matches_route_prefix(route_path, prefix) for prefix in denied_prefixes):
                return False
        # Public routes — any authenticated user
        for pub in PUBLIC_ROUTES:
            if _matches_route_prefix(route_path, pub):
                return True
        # Module-gated routes
        for module_key, routes in MODULE_ROUTE_MAP.items():
            for prefix in routes:
                if _matches_route_prefix(route_path, prefix):
                    return self.can_access_module(module_key)
        # Fail-closed: unmapped routes are denied
        return False

    def get_accessible_modules(self):
        """Return list of module_keys the user can access."""
        return [
            mod for mod in MODULE_ACCESS_CAPABILITIES
            if self.can_access_module(mod)
        ]

    def get_accessible_routes(self):
        """
        Return the list of frontend route prefixes the user can access.

        Includes:
        - Route prefixes from modules the user has access to
        - All ungated routes (those not controlled by any module) are implicitly
          allowed and NOT listed here — the frontend should treat them as open.
        """
        accessible = []
        for module_key, routes in MODULE_ROUTE_MAP.items():
            if self.can_access_module(module_key):
                accessible.extend(routes)
        for role, denied_prefixes in ROLE_ROUTE_DENY_MAP.items():
            if role in self.user_roles:
                accessible = [
                    route for route in accessible
                    if not any(_matches_route_prefix(route, prefix) for prefix in denied_prefixes)
                ]
        return sorted(set(accessible))

    # ── Project / Site / Stage checks ────────────────────────────────────

    def can_view_project(self, project_name=None):
        """Check if user can view a project."""
        return self.has_capability("project.summary.view", project=project_name)

    def can_view_sites(self, project_name=None):
        """Check if user can view sites for a project."""
        return self.has_any_capability(
            "project.site.view",
            "engineering.site.view",
            "procurement.site.view",
            "execution.site.view",
            project=project_name,
        )

    def can_update_site(self, project_name=None, site_name=None):
        """Check if user can update a specific site."""
        return self.has_capability(
            "project.site.update", project=project_name, site=site_name,
        )

    def can_submit_stage(self, project_name=None):
        """Check if user can submit a stage transition."""
        return self.has_capability(
            "project.stage.submit", project=project_name,
            required_mode="action",
        )

    def can_approve_stage(self, project_name=None):
        """Check if user can approve a stage transition."""
        return self.has_capability(
            "project.stage.approve", project=project_name,
            required_mode="approve",
        )

    def can_override_stage(self, project_name=None):
        """Check if user can override a stage."""
        return self.has_capability(
            "project.stage.override", project=project_name,
            required_mode="override",
        )

    def can_override_dependency(self, project_name=None):
        """Check if user can override a dependency check."""
        return self.has_capability(
            "project.dependency.override", project=project_name,
            required_mode="override",
        )

    # ── Approval checks ─────────────────────────────────────────────────

    def can_approve(self, project_name=None):
        """Check if user can approve items."""
        return self.has_any_capability(
            "approval.action.approve",
            "finance.action.approve",
            "project.stage.approve",
            project=project_name,
        )

    def can_reject(self, project_name=None):
        """Check if user can reject items."""
        return self.has_any_capability(
            "approval.action.reject",
            "project.stage.reject",
            project=project_name,
        )

    def can_override_approval(self, project_name=None):
        """Check if user can override approval with reason."""
        return self.has_capability(
            "approval.action.override", project=project_name,
            required_mode="override",
        )

    # ── Tab visibility ───────────────────────────────────────────────────

    # All tab keys that exist in the frontend WorkspaceShell.
    ALL_TAB_KEYS = [
        "overview", "sites", "board", "milestones", "ops", "files",
        "activity", "issues", "staff", "petty_cash", "comms",
        "central_status", "requests", "notes", "tasks", "timesheets",
        "dossier", "accountability", "approvals", "closeout",
    ]

    def get_visible_tabs(self, project_name=None):
        """
        Return a list of workspace tab keys the user can see.
        Maps capability keys to tab names.

        Directors and System Managers are superusers — they receive every
        known tab key so the frontend intersection never hides tabs from them.
        """
        # Superusers see all tabs unconditionally.
        if self.is_director or self.is_system_manager:
            return list(self.ALL_TAB_KEYS)

        tab_caps = {
            "overview":   ["project.summary.view", "project.workspace.access"],
            "sites":      ["project.site.view", "engineering.site.view",
                          "procurement.site.view", "execution.site.view"],
            "board":      ["project.board.view"],
            "milestones": ["project.milestone.view"],
            "files":      ["dms.file.view", "engineering.file.view",
                          "procurement.file.view", "execution.file.view"],
            "activity":   ["project.activity.view"],
        }
        visible = []
        for tab, caps in tab_caps.items():
            if self.has_any_capability(*caps, project=project_name):
                visible.append(tab)
        return visible

    # ── Project workspace permissions (Phase 6) ────────────────────────

    # Maps department keys to the module capabilities that grant access to
    # that department's iteration/lens within a project workspace.
    DEPARTMENT_MODULE_MAP = {
        "engineering":  "engineering",
        "procurement":  "procurement",
        "execution":    "execution",
        "finance":      "finance",
        "hr":           "hr",
        "om":           "om",
        "inventory":    "inventory",
    }

    def get_workspace_permissions(self, project_name=None):
        """
        Return a structured dict of what the current user can do inside a
        project workspace.  This drives front-end gating per pack:

        - **Project Command Pack** → top-level project workspace access,
          stage lifecycle, member management.
        - **Department packs** → which department lanes are visible.
        - **DMS Pack** → files tab read-only vs full access.
        - **Approval Pack** → approval action buttons.
        - **Inventory Pack** → remains separate (stock/GRN views).

        Returns dict with boolean flags the frontend can consume directly.
        """
        p = project_name  # shorthand

        return {
            # ── Project Command Pack controls ────────────────────────────
            "can_access_workspace": self.has_capability(
                "project.workspace.access", project=p,
            ),
            "can_view_summary": self.has_capability(
                "project.summary.view", project=p,
            ),
            "can_view_sites": self.can_view_sites(project_name=p),
            "can_update_site": self.has_capability(
                "project.site.update", project=p, required_mode="action",
            ),
            "can_view_board": self.has_capability(
                "project.board.view", project=p,
            ),
            "can_view_milestones": self.has_capability(
                "project.milestone.view", project=p,
            ),
            "can_manage_milestones": self.has_capability(
                "project.milestone.manage", project=p, required_mode="action",
            ),
            "can_manage_members": self.has_capability(
                "project.member.manage", project=p, required_mode="action",
            ),
            "can_view_activity": self.has_capability(
                "project.activity.view", project=p,
            ),

            # ── Stage lifecycle (Project Command + Approval) ────────────
            "can_submit_stage": self.can_submit_stage(project_name=p),
            "can_approve_stage": self.can_approve_stage(project_name=p),
            "can_reject_stage": self.has_capability(
                "project.stage.reject", project=p, required_mode="action",
            ),
            "can_override_stage": self.can_override_stage(project_name=p),
            "can_override_dependency": self.can_override_dependency(project_name=p),

            # ── Approval Pack controls ──────────────────────────────────
            "can_approve": self.can_approve(project_name=p),
            "can_reject": self.can_reject(project_name=p),
            "can_override_approval": self.can_override_approval(project_name=p),
            "can_revise": self.has_capability(
                "approval.action.revise", project=p, required_mode="action",
            ),

            # ── DMS Pack controls ───────────────────────────────────────
            "can_view_files": self.has_any_capability(
                "dms.file.view", "engineering.file.view",
                "procurement.file.view", "execution.file.view",
                project=p,
            ),
            "can_upload_files": self.has_capability(
                "dms.file.upload", project=p, required_mode="action",
            ),
            "can_replace_files": self.has_capability(
                "dms.file.replace", project=p, required_mode="action",
            ),
            "can_delete_files": self.has_capability(
                "dms.file.delete", project=p, required_mode="action",
            ),

            # ── Inventory Pack controls ─────────────────────────────────
            "can_view_inventory": self.has_capability(
                "inventory.module.access", project=p,
            ),
            "can_view_stock": self.has_capability(
                "inventory.stock.view", project=p,
            ),
            "can_create_grn": self.has_capability(
                "inventory.grn.create", project=p, required_mode="action",
            ),
            "can_view_dispatch": self.has_capability(
                "inventory.dispatch.view", project=p,
            ),

            # ── Department lenses (which iterations the user can see) ───
            "department_access": self._get_department_access(project=p),

            # ── Visible tabs (already exists, included for convenience) ─
            "visible_tabs": self.get_visible_tabs(project_name=p),
        }

    def _get_department_access(self, project=None):
        """
        Return a dict of department_key → {can_view, can_act} indicating
        which department lanes the user can see and interact with.
        """
        access = {}
        for dept_key, mod_key in self.DEPARTMENT_MODULE_MAP.items():
            cap_key = MODULE_ACCESS_CAPABILITIES.get(mod_key)
            if not cap_key:
                continue
            can_view = self.has_capability(cap_key, project=project)
            can_act = self.has_capability(
                cap_key, project=project, required_mode="action",
            )
            access[dept_key] = {"can_view": can_view, "can_act": can_act}

        # Project-level access (the "all" lens) is governed by the project
        # workspace access capability.
        access["all"] = {
            "can_view": self.has_capability(
                "project.workspace.access", project=project,
            ),
            "can_act": self.has_capability(
                "project.workspace.access", project=project,
                required_mode="action",
            ),
        }
        return access

    # ── Bulk permission summary ──────────────────────────────────────────

    def get_effective_summary(self):
        """
        Return a structured summary of effective permissions.
        Useful for admin UIs and debugging.
        """
        caps = self.effective_capabilities
        packs = {}
        for cap_key, grant in caps.items():
            module = cap_key.split(".")[0] if "." in cap_key else "unknown"
            if module not in packs:
                packs[module] = []
            packs[module].append({
                "capability": cap_key,
                "scope": grant["scope"],
                "mode": grant["mode"],
            })

        return {
            "user": self.user,
            "is_superuser": self.is_director or self.is_system_manager,
            "roles": sorted(self.user_roles),
            "department": self.department,
            "assigned_projects": sorted(self.assigned_projects),
            "assigned_sites": sorted(self.assigned_sites),
            "capability_count": len(caps),
            "modules": packs,
        }


# ── Module-level convenience functions ──────────────────────────────────────
# These are stateless helpers that create a PermissionEngine for the
# current session user on each call. For repeated checks within a single
# request, instantiate PermissionEngine once and reuse it.

def get_engine(user=None):
    """Get a PermissionEngine for the given user (default: session user)."""
    return PermissionEngine(user=user)


def has_capability(capability_key, user=None, project=None, site=None):
    """One-shot capability check for the current (or specified) user."""
    return get_engine(user).has_capability(capability_key, project=project, site=site)


def check_capability(capability_key, user=None, project=None, site=None):
    """One-shot capability check that throws on deny."""
    get_engine(user).check_capability(capability_key, project=project, site=site)


def can_access_module(module_key, user=None):
    """One-shot module access check."""
    return get_engine(user).can_access_module(module_key)


def check_module_access(module_key, user=None):
    """One-shot module access check that throws on deny."""
    get_engine(user).check_module_access(module_key)


def can_access_route(route_path, user=None):
    """One-shot route access check."""
    return get_engine(user).can_access_route(route_path)


def get_visible_tabs(project_name=None, user=None):
    """One-shot visible-tab resolver for a project workspace."""
    return get_engine(user).get_visible_tabs(project_name=project_name)


def get_effective_summary(user=None):
    """One-shot effective permission summary for admin/debug use."""
    return get_engine(user).get_effective_summary()


def get_accessible_routes(user=None):
    """One-shot accessible route list."""
    return get_engine(user).get_accessible_routes()


def get_all_gated_prefixes():
    """Return the set of all route prefixes governed by a module capability."""
    return _get_all_gated_prefixes()


def get_workspace_permissions(project_name=None, user=None):
    """One-shot workspace permission resolver for a project."""
    return get_engine(user).get_workspace_permissions(project_name=project_name)
