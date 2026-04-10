"""
Seed data for RBAC Permission Pack model.

Creates:
- GE Permission Capability records (machine-readable permission atoms)
- GE Permission Pack records with GE Permission Pack Item children
- GE Role Pack Mapping records (role-to-pack composition)

All seed operations are idempotent — safe to run on every migrate.
"""
import frappe
from frappe.utils import cint
from gov_erp.role_utils import BUSINESS_ROLES

# ── Capability definitions ──────────────────────────────────────────────────
# Each tuple: (capability_key, label, module_key, department_key, entity_type, action_type, is_sensitive)

CAPABILITIES = [
	# ── Project Command ──
	("project.workspace.access",      "Access Project Workspace",      "project",     "",            "project",   "access",   0),
	("project.summary.view",          "View All Project Summary",      "project",     "",            "project",   "view",     0),
	("project.site.view",             "View All Sites",                "project",     "",            "site",      "view",     0),
	("project.site.update",           "Update Site",                   "project",     "",            "site",      "update",   0),
	("project.board.view",            "View Site Board",               "project",     "",            "board",     "view",     0),
	("project.milestone.view",        "View Milestones",               "project",     "",            "milestone", "view",     0),
	("project.blocker.view",          "View Blockers",                 "project",     "",            "blocker",   "view",     0),
	("project.activity.view",         "View Activity",                 "project",     "",            "activity",  "view",     0),
	("project.member.manage",         "Manage Project Members",        "project",     "",            "member",    "manage",   0),
	("project.stage.submit",          "Submit Project Stage",          "project",     "",            "stage",     "submit",   0),
	("project.stage.approve",         "Approve Project Stage",         "project",     "",            "stage",     "approve",  1),
	("project.stage.reject",          "Reject Project Stage",          "project",     "",            "stage",     "reject",   0),
	("project.stage.override",        "Override Project Stage",        "project",     "",            "stage",     "override", 1),
	("project.dependency.override",   "Override Dependency",           "project",     "",            "dependency","override", 1),

	# ── Presales ──
	("presales.module.access",        "Access Presales Workspace",     "presales",    "presales",    "module",    "access",   0),

	# ── Engineering ──
	("engineering.iteration.access",  "Access Engineering Iteration",  "engineering", "engineering", "iteration", "access",   0),
	("engineering.project.view",      "View Engineering Projects",     "engineering", "engineering", "project",   "view",     0),
	("engineering.site.view",         "View Engineering Sites",        "engineering", "engineering", "site",      "view",     0),
	("engineering.survey.update",     "Update Survey/Design Status",   "engineering", "engineering", "survey",    "update",   0),
	("engineering.drawing.upload",    "Upload Drawings",               "engineering", "engineering", "drawing",   "upload",   0),
	("engineering.deviation.create",  "Raise Technical Deviation",     "engineering", "engineering", "deviation", "create",   0),
	("engineering.dependency.view",   "View Dependencies",             "engineering", "engineering", "dependency","view",     0),
	("engineering.output.submit",     "Submit Engineering Output",     "engineering", "engineering", "output",    "submit",   0),
	("engineering.file.view",         "View Engineering Files",        "engineering", "engineering", "file",      "view",     0),

	# ── Procurement ──
	("procurement.iteration.access",  "Access Procurement Iteration",  "procurement", "procurement", "iteration",  "access",  0),
	("procurement.project.view",      "View Procurement Projects",     "procurement", "procurement", "project",    "view",    0),
	("procurement.site.view",         "View Procurement Sites",        "procurement", "procurement", "site",       "view",    0),
	("procurement.indent.create",     "Create Indent",                 "procurement", "procurement", "indent",     "create",  0),
	("procurement.indent.update",     "Edit Indent",                   "procurement", "procurement", "indent",     "update",  0),
	("procurement.comparison.view",   "View Vendor Comparison",        "procurement", "procurement", "comparison", "view",    0),
	("procurement.comparison.create", "Create Vendor Comparison",      "procurement", "procurement", "comparison", "create",  0),
	("procurement.po.view",           "View Purchase Orders",          "procurement", "procurement", "po",         "view",    0),
	("procurement.readiness.update",  "Update Procurement Readiness",  "procurement", "procurement", "readiness",  "update",  0),
	("procurement.file.view",         "View Procurement Files",        "procurement", "procurement", "file",       "view",    0),

	# ── Inventory ──
	("inventory.module.access",       "Access Inventory Module",       "inventory",   "stores",      "module",     "access",  0),
	("inventory.stock.view",          "View Stock Position",           "inventory",   "stores",      "stock",      "view",    0),
	("inventory.aging.view",          "View Stock Aging",              "inventory",   "stores",      "aging",      "view",    0),
	("inventory.grn.create",          "Create GRN",                    "inventory",   "stores",      "grn",        "create",  0),
	("inventory.movement.create",     "Create Stock Movement",         "inventory",   "stores",      "movement",   "create",  0),
	("inventory.project_link.manage", "Link Stock to Project/Site",    "inventory",   "stores",      "link",       "manage",  0),
	("inventory.traceability.manage", "Manage Serial/Batch Tracing",   "inventory",   "stores",      "trace",      "manage",  0),
	("inventory.dispatch.view",       "View Dispatch-Linked Inventory","inventory",   "stores",      "dispatch",   "view",    0),

	# ── Execution / I&C ──
	("execution.iteration.access",    "Access Execution Iteration",    "execution",   "i_and_c",     "iteration",     "access",  0),
	("execution.site.view",           "View Execution Sites",          "execution",   "i_and_c",     "site",          "view",    0),
	("execution.installation.update", "Update Installation Status",    "execution",   "i_and_c",     "installation",  "update",  0),
	("execution.commissioning.update","Update Commissioning Status",   "execution",   "i_and_c",     "commissioning", "update",  0),
	("execution.evidence.upload",     "Upload Field Evidence",         "execution",   "i_and_c",     "evidence",      "upload",  0),
	("execution.device.manage",       "Manage Device/IP Allocation",   "execution",   "i_and_c",     "device",        "manage",  0),
	("execution.test_report.manage",  "Manage Test Reports",           "execution",   "i_and_c",     "test_report",   "manage",  0),
	("execution.blocker.create",      "Raise Field Blocker",           "execution",   "i_and_c",     "blocker",       "create",  0),
	("execution.file.view",           "View Execution Files",          "execution",   "i_and_c",     "file",          "view",    0),

	# ── Finance ──
	("finance.iteration.access",      "Access Finance Iteration",      "finance",     "accounts",    "iteration",  "access",  0),
	("finance.billing.view",          "View Billing Milestones",       "finance",     "accounts",    "billing",    "view",    0),
	("finance.invoice.create",        "Create Invoice",                "finance",     "accounts",    "invoice",    "create",  1),
	("finance.invoice.update",        "Update Invoice",                "finance",     "accounts",    "invoice",    "update",  1),
	("finance.receipt.record",         "Record Payment Receipt",        "finance",     "accounts",    "receipt",    "create",  1),
	("finance.retention.view",        "View Retention",                "finance",     "accounts",    "retention",  "view",    1),
	("finance.penalty.view",          "View Penalty",                  "finance",     "accounts",    "penalty",    "view",    0),
	("finance.exposure.view",         "View Commercial Exposure",      "finance",     "accounts",    "exposure",   "view",    1),
	("finance.action.approve",        "Approve Finance Actions",       "finance",     "accounts",    "action",     "approve", 1),

	# ── HR / Manpower ──
	("hr.iteration.access",           "Access Manpower Iteration",     "hr",          "hr",          "iteration",  "access",  0),
	("hr.staffing.view",              "View Staffing by Project/Site", "hr",          "hr",          "staffing",   "view",    0),
	("hr.onboarding.manage",          "Manage Onboarding Linkage",     "hr",          "hr",          "onboarding", "manage",  0),
	("hr.employee.manage",            "Manage Employee Directory",     "hr",          "hr",          "employee",   "manage",  0),
	("hr.leave.manage",               "Manage Leave And Holiday",      "hr",          "hr",          "leave",      "manage",  0),
	("hr.attendance.view",            "View Attendance",               "hr",          "hr",          "attendance", "view",    0),
	("hr.attendance.manage",          "Manage Attendance",             "hr",          "hr",          "attendance", "manage",  0),
	("hr.regularization.manage",      "Manage Regularization",         "hr",          "hr",          "regularization", "manage",  0),
	("hr.travel.view",                "View Travel/Overtime",          "hr",          "hr",          "travel",     "view",    0),
	("hr.manpower.assign",            "Assign Manpower",               "hr",          "hr",          "manpower",   "manage",  0),
	("hr.readiness.view",             "View People Readiness",         "hr",          "hr",          "readiness",  "view",    0),

	# ── O&M / RMA ──
	("om.iteration.access",           "Access O&M Iteration",          "om",          "om_rma",      "iteration",  "access",  0),
	("om.rma.access",                 "Access RMA Iteration",          "om",          "om_rma",      "iteration",  "access",  0),
	("om.ticket.manage",              "Manage Tickets",                "om",          "om_rma",      "ticket",     "manage",  0),
	("om.sla.manage",                 "Manage SLA Timers",             "om",          "om_rma",      "sla",        "manage",  0),
	("om.rma.manage",                 "Manage RMA Records",            "om",          "om_rma",      "rma",        "manage",  0),
	("om.uptime.view",                "View Uptime",                   "om",          "om_rma",      "uptime",     "view",    0),
	("om.issue.close",                "Close Service Issues",          "om",          "om_rma",      "issue",      "manage",  0),

	# ── DMS ──
	("dms.module.access",             "Access Documents",              "dms",         "",            "module",     "access",  0),
	("dms.file.view",                 "View Files",                    "dms",         "",            "file",       "view",    0),
	("dms.file.upload",               "Upload Files",                  "dms",         "",            "file",       "upload",  0),
	("dms.file.replace",              "Replace Version",               "dms",         "",            "file",       "update",  0),
	("dms.file.delete",               "Delete File",                   "dms",         "",            "file",       "delete",  1),
	("dms.expiry.manage",             "Manage Expiry Metadata",        "dms",         "",            "expiry",     "manage",  0),

	# ── Reports ──
	("reports.module.access",         "Access Reports Module",         "reports",     "",            "module",     "access",  0),

	# ── Master Data ──
	("master_data.module.access",     "Access Master Data Module",     "master_data", "",            "module",     "access",  0),

	# ── Approval ──
	("approval.inbox.access",         "Access Approval Inbox",         "approval",    "",            "inbox",      "access",  0),
	("approval.action.approve",       "Approve",                       "approval",    "",            "action",     "approve", 0),
	("approval.action.reject",        "Reject",                        "approval",    "",            "action",     "reject",  0),
	("approval.action.revise",        "Request Revision",              "approval",    "",            "action",     "manage",  0),
	("approval.action.comment",       "Comment on Approval",           "approval",    "",            "action",     "create",  0),
	("approval.action.override",      "Override with Reason",          "approval",    "",            "action",     "override",1),

	# ── Settings & Admin ──
	("settings.department.manage",    "Manage Departments",            "settings",    "",            "department", "manage",  0),
	("settings.designation.manage",   "Manage Designations",           "settings",    "",            "designation","manage",  0),
	("settings.role.manage",          "Manage Roles",                  "settings",    "",            "role",       "manage",  1),
	("settings.pack.manage",          "Manage Permission Packs",       "settings",    "",            "pack",       "manage",  1),
	("settings.user_role.manage",     "Manage User-Role Assignment",   "settings",    "",            "user_role",  "manage",  1),
	("settings.stage_policy.manage",  "Manage Stage Visibility Policy","settings",    "",            "policy",     "manage",  1),
	("settings.config.manage",        "Manage Settings",               "settings",    "",            "config",     "manage",  0),
]


# ── Pack definitions ────────────────────────────────────────────────────────
# Each dict: pack_key, pack_label, module_family, sort_order, ui_color, ui_icon, description, capabilities
# capabilities is a list of (capability_key, default_scope, default_mode, required_for_pack)

PACKS = [
	{
		"pack_key": "project_command",
		"pack_label": "Project Command Pack",
		"module_family": "project",
		"sort_order": 1,
		"ui_color": "#3B82F6",
		"ui_icon": "briefcase",
		"description": "Command visibility over projects, cross-stage coordination, site-level delivery control",
		"capabilities": [
			("project.workspace.access",    "all",              "action",  1),
			("project.summary.view",        "all",              "read",    1),
			("project.site.view",           "all",              "read",    1),
			("project.board.view",          "all",              "read",    0),
			("project.milestone.view",      "all",              "read",    0),
			("project.blocker.view",        "all",              "read",    0),
			("project.activity.view",       "all",              "read",    0),
			("project.member.manage",       "assigned_project", "action",  0),
			("project.stage.submit",        "assigned_project", "action",  0),
			("project.stage.approve",       "assigned_project", "approve", 0),
			("project.stage.reject",        "assigned_project", "action",  0),
			("project.stage.override",      "assigned_project", "override",0),
			("project.dependency.override", "assigned_project", "override",0),
		],
	},
	{
		"pack_key": "presales",
		"pack_label": "Presales Pack",
		"module_family": "presales",
		"sort_order": 2,
		"ui_color": "#0EA5E9",
		"ui_icon": "briefcase-business",
		"description": "Tendering and bid-workspace access",
		"capabilities": [
			("presales.module.access", "department", "action", 1),
		],
	},
	{
		"pack_key": "engineering",
		"pack_label": "Engineering Pack",
		"module_family": "engineering",
		"sort_order": 3,
		"ui_color": "#8B5CF6",
		"ui_icon": "drafting-compass",
		"description": "Engineering-stage project iteration",
		"capabilities": [
			("engineering.iteration.access", "department",       "action",  1),
			("engineering.project.view",     "department",       "read",    1),
			("engineering.site.view",        "department",       "read",    1),
			("engineering.survey.update",    "assigned_project", "action",  0),
			("engineering.drawing.upload",   "assigned_project", "action",  0),
			("engineering.deviation.create", "assigned_project", "action",  0),
			("engineering.dependency.view",  "department",       "read",    0),
			("engineering.output.submit",    "assigned_project", "action",  0),
			("engineering.file.view",        "department",       "read",    0),
		],
	},
	{
		"pack_key": "procurement",
		"pack_label": "Procurement Pack",
		"module_family": "procurement",
		"sort_order": 4,
		"ui_color": "#F59E0B",
		"ui_icon": "shopping-cart",
		"description": "Procurement-side project execution",
		"capabilities": [
			("procurement.iteration.access",  "department",       "action",  1),
			("procurement.project.view",      "department",       "read",    1),
			("procurement.site.view",         "department",       "read",    1),
			("procurement.indent.create",     "assigned_project", "action",  0),
			("procurement.indent.update",     "assigned_project", "action",  0),
			("procurement.comparison.view",   "department",       "read",    0),
			("procurement.comparison.create", "assigned_project", "action",  0),
			("procurement.po.view",           "department",       "read",    0),
			("procurement.readiness.update",  "assigned_project", "action",  0),
			("procurement.file.view",         "department",       "read",    0),
		],
	},
	{
		"pack_key": "inventory",
		"pack_label": "Inventory Pack",
		"module_family": "inventory",
		"sort_order": 5,
		"ui_color": "#10B981",
		"ui_icon": "warehouse",
		"description": "Stock and warehouse truth — not a PM workspace pack",
		"capabilities": [
			("inventory.module.access",       "department",       "action",  1),
			("inventory.stock.view",          "department",       "read",    1),
			("inventory.aging.view",          "department",       "read",    0),
			("inventory.grn.create",          "department",       "action",  0),
			("inventory.movement.create",     "department",       "action",  0),
			("inventory.project_link.manage", "assigned_project", "action",  0),
			("inventory.traceability.manage", "department",       "action",  0),
			("inventory.dispatch.view",       "department",       "read",    0),
		],
	},
	{
		"pack_key": "execution_ic",
		"pack_label": "Execution / I&C Pack",
		"module_family": "execution",
		"sort_order": 6,
		"ui_color": "#EF4444",
		"ui_icon": "hard-hat",
		"description": "Field execution and commissioning control",
		"capabilities": [
			("execution.iteration.access",    "department",       "action",  1),
			("execution.site.view",           "department",       "read",    1),
			("execution.installation.update", "assigned_project", "action",  0),
			("execution.commissioning.update","assigned_project", "action",  0),
			("execution.evidence.upload",     "assigned_project", "action",  0),
			("execution.device.manage",       "assigned_project", "action",  0),
			("execution.test_report.manage",  "assigned_project", "action",  0),
			("execution.blocker.create",      "assigned_project", "action",  0),
			("execution.file.view",           "department",       "read",    0),
		],
	},
	{
		"pack_key": "finance",
		"pack_label": "Finance Pack",
		"module_family": "finance",
		"sort_order": 7,
		"ui_color": "#06B6D4",
		"ui_icon": "indian-rupee",
		"description": "Project-linked billing and payment control",
		"capabilities": [
			("finance.iteration.access", "department",       "action",  1),
			("finance.billing.view",     "department",       "read",    1),
			("finance.invoice.create",   "department",       "action",  0),
			("finance.invoice.update",   "department",       "action",  0),
			("finance.receipt.record",   "department",       "action",  0),
			("finance.retention.view",   "department",       "read",    0),
			("finance.penalty.view",     "department",       "read",    0),
			("finance.exposure.view",    "department",       "read",    0),
			("finance.action.approve",   "department",       "approve", 0),
		],
	},
	{
		"pack_key": "hr_manpower",
		"pack_label": "HR / Manpower Pack",
		"module_family": "hr",
		"sort_order": 8,
		"ui_color": "#EC4899",
		"ui_icon": "users",
		"description": "Project manpower support",
		"capabilities": [
			("hr.iteration.access",  "department",       "action",  1),
			("hr.staffing.view",     "department",       "read",    1),
			("hr.onboarding.manage", "department",       "action",  0),
			("hr.employee.manage",   "department",       "action",  0),
			("hr.leave.manage",      "department",       "action",  0),
			("hr.attendance.view",   "department",       "read",    0),
			("hr.attendance.manage", "department",       "action",  0),
			("hr.regularization.manage", "department",    "action",  0),
			("hr.travel.view",       "department",       "read",    0),
			("hr.manpower.assign",   "assigned_project", "action",  0),
			("hr.readiness.view",    "department",       "read",    0),
		],
	},
	{
		"pack_key": "om_rma",
		"pack_label": "O&M / RMA Pack",
		"module_family": "om",
		"sort_order": 9,
		"ui_color": "#F97316",
		"ui_icon": "wrench",
		"description": "Post-go-live service support",
		"capabilities": [
			("om.iteration.access", "department",       "action",  1),
			("om.rma.access",       "department",       "action",  0),
			("om.ticket.manage",    "assigned_project", "action",  0),
			("om.sla.manage",       "department",       "action",  0),
			("om.rma.manage",       "department",       "action",  0),
			("om.uptime.view",      "department",       "read",    0),
			("om.issue.close",      "assigned_project", "action",  0),
		],
	},
	{
		"pack_key": "dms",
		"pack_label": "DMS Pack",
		"module_family": "dms",
		"sort_order": 10,
		"ui_color": "#6366F1",
		"ui_icon": "folder",
		"description": "File and evidence management",
		"capabilities": [
			("dms.module.access", "department", "action",  1),
			("dms.file.view",     "department", "read",    1),
			("dms.file.upload",   "department", "action",  0),
			("dms.file.replace",  "department", "action",  0),
			("dms.file.delete",   "department", "action",  0),
			("dms.expiry.manage", "department", "action",  0),
		],
	},
	{
		"pack_key": "reports",
		"pack_label": "Reports Pack",
		"module_family": "reports",
		"sort_order": 11,
		"ui_color": "#A855F7",
		"ui_icon": "chart-bar",
		"description": "Cross-module analytics and reporting access",
		"capabilities": [
			("reports.module.access", "department", "read", 1),
		],
	},
	{
		"pack_key": "master_data",
		"pack_label": "Master Data Pack",
		"module_family": "master_data",
		"sort_order": 11,
		"ui_color": "#F59E0B",
		"ui_icon": "database",
		"description": "Client, vendor, and organization master record access",
		"capabilities": [
			("master_data.module.access", "department", "action", 1),
		],
	},
	{
		"pack_key": "approval",
		"pack_label": "Approval Pack",
		"module_family": "approval",
		"sort_order": 12,
		"ui_color": "#14B8A6",
		"ui_icon": "check-circle",
		"description": "Centralized approval participation",
		"capabilities": [
			("approval.inbox.access",    "department", "action",   1),
			("approval.action.approve",  "department", "approve",  1),
			("approval.action.reject",   "department", "action",   0),
			("approval.action.revise",   "department", "action",   0),
			("approval.action.comment",  "department", "action",   0),
			("approval.action.override", "department", "override", 0),
		],
	},
	{
		"pack_key": "settings_admin",
		"pack_label": "Settings & Role Admin Pack",
		"module_family": "settings",
		"sort_order": 13,
		"ui_color": "#64748B",
		"ui_icon": "settings",
		"description": "System administration — departments, designations, roles, packs, stage visibility",
		"capabilities": [
			("settings.department.manage",   "all", "action", 1),
			("settings.designation.manage",  "all", "action", 0),
			("settings.role.manage",         "all", "action", 0),
			("settings.pack.manage",         "all", "action", 0),
			("settings.user_role.manage",    "all", "action", 0),
			("settings.stage_policy.manage", "all", "action", 0),
			("settings.config.manage",       "all", "action", 0),
		],
	},
]


# ── Role compositions ──────────────────────────────────────────────────────
# Each tuple: (role_name, pack_key, scope, mode)

ROLE_PACK_MAPPINGS = [
	# Director — all packs, scope: all
	("Director",                "project_command",  "all",              "override"),
	("Director",                "presales",         "all",              "action"),
	("Director",                "engineering",      "all",              "action"),
	("Director",                "procurement",      "all",              "action"),
	("Director",                "inventory",        "all",              "action"),
	("Director",                "execution_ic",     "all",              "action"),
	("Director",                "finance",          "all",              "approve"),
	("Director",                "hr_manpower",      "all",              "action"),
	("Director",                "om_rma",           "all",              "action"),
	("Director",                "dms",              "all",              "action"),
	("Director",                "reports",           "all",              "action"),
	("Director",                "master_data",      "all",              "action"),
	("Director",                "approval",         "all",              "override"),
	("Director",                "settings_admin",   "all",              "action"),

	# Project Head
	("Project Head",            "project_command",  "all",              "approve"),
	("Project Head",            "engineering",      "all",              "read"),
	("Project Head",            "procurement",      "all",              "read"),
	("Project Head",            "execution_ic",     "all",              "read"),
	("Project Head",            "finance",          "all",              "read"),
	("Project Head",            "dms",              "all",              "action"),
	("Project Head",            "reports",           "all",              "read"),
	("Project Head",            "master_data",      "all",              "read"),
	("Project Head",            "approval",         "all",              "approve"),

	# Project Manager
	("Project Manager",         "project_command",  "assigned_project", "read"),
	("Project Manager",         "engineering",      "assigned_project", "read"),
	("Project Manager",         "procurement",      "assigned_project", "read"),
	("Project Manager",         "inventory",        "assigned_project", "read"),
	("Project Manager",         "execution_ic",     "assigned_project", "read"),
	("Project Manager",         "dms",              "assigned_project", "action"),
	("Project Manager",         "reports",           "assigned_project", "read"),

	# Department Head
	("Department Head",         "presales",         "department",       "read"),
	("Department Head",         "engineering",      "department",       "action"),
	("Department Head",         "procurement",      "department",       "action"),
	("Department Head",         "inventory",        "department",       "read"),
	("Department Head",         "execution_ic",     "department",       "read"),
	("Department Head",         "finance",          "department",       "read"),
	("Department Head",         "hr_manpower",      "department",       "action"),
	("Department Head",         "om_rma",           "department",       "read"),
	("Department Head",         "dms",              "department",       "action"),
	("Department Head",         "reports",           "department",       "read"),
	("Department Head",         "master_data",      "department",       "action"),
	("Department Head",         "approval",         "department",       "approve"),
	("Department Head",         "settings_admin",   "all",              "action"),

	# Presales
	("Presales Tendering Head", "presales",         "department",       "action"),
	("Presales Tendering Head", "dms",              "department",       "action"),
	("Presales Tendering Head", "reports",           "department",       "read"),
	("Presales Executive",      "presales",         "department",       "read"),
	("Presales Executive",      "dms",              "department",       "read"),

	# Engineering Head
	("Engineering Head",        "engineering",      "department",       "action"),
	("Engineering Head",        "execution_ic",     "department",       "read"),
	("Engineering Head",        "dms",              "department",       "action"),
	("Engineering Head",        "reports",           "department",       "read"),
	("Engineering Head",        "approval",         "department",       "approve"),

	# Engineer
	("Engineer",                "engineering",      "assigned_project", "action"),
	("Engineer",                "execution_ic",     "assigned_project", "read"),
	("Engineer",                "dms",              "assigned_project", "action"),

	# Procurement Manager
	("Procurement Manager",     "procurement",      "department",       "action"),
	("Procurement Manager",     "inventory",        "department",       "read"),
	("Procurement Manager",     "dms",              "department",       "action"),
	("Procurement Manager",     "reports",           "department",       "read"),
	("Procurement Manager",     "approval",         "department",       "approve"),

	# Purchase
	("Purchase",                "procurement",      "assigned_project", "action"),
	("Purchase",                "inventory",        "assigned_project", "read"),
	("Purchase",                "dms",              "assigned_project", "read"),

	# Store Manager
	("Store Manager",           "inventory",        "department",       "action"),
	("Store Manager",           "procurement",      "department",       "read"),
	("Store Manager",           "dms",              "department",       "read"),

	# Stores Logistics Head
	("Stores Logistics Head",   "inventory",        "department",       "action"),
	("Stores Logistics Head",   "procurement",      "department",       "read"),
	("Stores Logistics Head",   "dms",              "department",       "read"),

	# Accounts
	("Accounts",                "finance",          "department",       "action"),
	("Accounts",                "approval",         "department",       "approve"),
	("Accounts",                "dms",              "department",       "action"),
	("Accounts",                "reports",           "department",       "read"),

	# HR Manager
	("HR Manager",              "hr_manpower",      "department",       "action"),
	("HR Manager",              "reports",           "department",       "read"),
	("HR Manager",              "dms",              "department",       "read"),

	# Field Technician
	("Field Technician",        "execution_ic",     "assigned_site",    "action"),
	("Field Technician",        "om_rma",           "assigned_site",    "read"),
	("Field Technician",        "dms",              "assigned_site",    "read"),

	# OM Operator
	("OM Operator",             "om_rma",           "assigned_project", "action"),
	("OM Operator",             "dms",              "assigned_project", "read"),
	("OM Operator",             "reports",           "assigned_project", "read"),

	# RMA Manager
	("RMA Manager",             "om_rma",           "department",       "action"),
	("RMA Manager",             "approval",         "department",       "approve"),
	("RMA Manager",             "dms",              "department",       "action"),
	("RMA Manager",             "reports",           "department",       "read"),
]

ROLE_PRIORITY = [
	"Director",
	"Project Head",
	"Project Manager",
	"Engineering Head",
	"Engineer",
	"Procurement Manager",
	"Purchase",
	"Store Manager",
	"Stores Logistics Head",
	"Accounts",
	"HR Manager",
	"RMA Manager",
	"OM Operator",
	"Field Technician",
	"Presales Tendering Head",
	"Presales Executive",
	"Department Head",
]

EXCLUDED_USER_CONTEXTS = {"Administrator", "Guest"}

ROLE_DEPARTMENT_DEFAULTS = {
	"Presales Tendering Head": "presales",
	"Presales Executive": "presales",
	"Engineering Head": "engineering",
	"Engineer": "engineering",
	"Department Head": "project",
	"Project Head": "project",
	"Accounts": "accounts",
	"HR Manager": "hr",
	"Procurement Manager": "procurement",
	"Purchase": "procurement",
	"Project Manager": "project",
	"Store Manager": "stores",
	"Stores Logistics Head": "stores",
	"Director": "leadership",
	"Field Technician": "i_and_c",
	"OM Operator": "om_rma",
	"RMA Manager": "om_rma",
}


# ── Seed functions ──────────────────────────────────────────────────────────

def seed_capabilities():
	"""Create or update all permission capability records."""
	for cap_key, label, module_key, dept_key, entity, action, sensitive in CAPABILITIES:
		if frappe.db.exists("GE Permission Capability", cap_key):
			frappe.db.set_value("GE Permission Capability", cap_key, {
				"capability_label": label,
				"module_key": module_key,
				"department_key": dept_key,
				"entity_type": entity,
				"action_type": action,
				"is_sensitive": sensitive,
				"is_active": 1,
			}, update_modified=False)
		else:
			frappe.get_doc({
				"doctype": "GE Permission Capability",
				"capability_key": cap_key,
				"capability_label": label,
				"module_key": module_key,
				"department_key": dept_key,
				"entity_type": entity,
				"action_type": action,
				"supports_scope": 1,
				"supports_mode": 1,
				"is_sensitive": sensitive,
				"is_active": 1,
			}).insert(ignore_permissions=True)

	frappe.db.commit()


def seed_packs():
	"""Create or update all permission pack records with their capability items."""
	for pack_def in PACKS:
		pack_key = pack_def["pack_key"]

		if frappe.db.exists("GE Permission Pack", pack_key):
			pack_doc = frappe.get_doc("GE Permission Pack", pack_key)
			pack_doc.pack_label = pack_def["pack_label"]
			pack_doc.module_family = pack_def["module_family"]
			pack_doc.sort_order = pack_def["sort_order"]
			pack_doc.ui_color = pack_def["ui_color"]
			pack_doc.ui_icon = pack_def["ui_icon"]
			pack_doc.description = pack_def["description"]
			pack_doc.is_system_pack = 1
			pack_doc.is_active = 1

			# Rebuild items
			pack_doc.items = []
			for idx, (cap_key, scope, mode, required) in enumerate(pack_def["capabilities"]):
				pack_doc.append("items", {
					"capability": cap_key,
					"default_scope": scope,
					"default_mode": mode,
					"required_for_pack": required,
					"display_order": idx + 1,
				})
			pack_doc.save(ignore_permissions=True)
		else:
			pack_doc = frappe.get_doc({
				"doctype": "GE Permission Pack",
				"pack_key": pack_key,
				"pack_label": pack_def["pack_label"],
				"module_family": pack_def["module_family"],
				"sort_order": pack_def["sort_order"],
				"ui_color": pack_def["ui_color"],
				"ui_icon": pack_def["ui_icon"],
				"description": pack_def["description"],
				"is_system_pack": 1,
				"is_active": 1,
				"items": [],
			})
			for idx, (cap_key, scope, mode, required) in enumerate(pack_def["capabilities"]):
				pack_doc.append("items", {
					"capability": cap_key,
					"default_scope": scope,
					"default_mode": mode,
					"required_for_pack": required,
					"display_order": idx + 1,
				})
			pack_doc.insert(ignore_permissions=True)

	frappe.db.commit()


def seed_role_pack_mappings():
	"""Create default role-to-pack mappings. Skips existing (role, pack) pairs."""
	for role_name, pack_key, scope, mode in ROLE_PACK_MAPPINGS:
		exists = frappe.db.exists("GE Role Pack Mapping", {
			"role": role_name,
			"permission_pack": pack_key,
		})
		if exists:
			frappe.db.set_value("GE Role Pack Mapping", exists, {
				"scope": scope,
				"mode": mode,
				"is_enabled": 1,
				"is_system_default": 1,
			}, update_modified=False)
		else:
			frappe.get_doc({
				"doctype": "GE Role Pack Mapping",
				"role": role_name,
				"permission_pack": pack_key,
				"scope": scope,
				"mode": mode,
				"is_enabled": 1,
				"is_system_default": 1,
			}).insert(ignore_permissions=True)

	frappe.db.commit()


def _pick_primary_role(user_roles):
	"""Pick a stable primary business role for a user."""
	role_set = set(user_roles or [])
	for role in ROLE_PRIORITY:
		if role in role_set:
			return role
	return None


def seed_user_contexts():
	"""Create/update GE User Context rows for active business users."""
	user_role_rows = frappe.get_all(
		"Has Role",
		filters={"role": ["in", BUSINESS_ROLES]},
		fields=["parent as user", "role"],
	)

	user_roles = {}
	for row in user_role_rows:
		user_roles.setdefault(row.user, set()).add(row.role)

	for user, roles in user_roles.items():
		if user in EXCLUDED_USER_CONTEXTS:
			continue

		user_doc = frappe.db.get_value("User", user, ["name", "enabled"], as_dict=True)
		if not user_doc:
			continue

		employee = frappe.db.get_value(
			"Employee",
			{"user_id": user},
			["department", "designation"],
			as_dict=True,
		) or {}

		primary_role = _pick_primary_role(roles)
		secondary_roles = [r for r in ROLE_PRIORITY if r in roles and r != primary_role]
		active_project_links = frappe.get_all(
			"GE Project Team Member",
			filters={"user": user, "is_active": 1},
			fields=["linked_project", "linked_site"],
		)
		assigned_projects = sorted(
			{
				row.linked_project for row in active_project_links
				if row.get("linked_project")
			}
		)
		assigned_sites = sorted(
			{
				row.linked_site for row in active_project_links
				if row.get("linked_site")
			}
		)
		if not assigned_sites:
			owned_sites = frappe.get_all(
				"GE Site",
				filters={"current_owner_user": user},
				pluck="name",
			)
			assigned_sites = sorted({site for site in owned_sites if site})

		department = employee.get("department") or ROLE_DEPARTMENT_DEFAULTS.get(primary_role)
		existing_name = frappe.db.exists("GE User Context", user)

		if existing_name:
			doc = frappe.get_doc("GE User Context", existing_name)
			doc.department = department or doc.department
			doc.designation = employee.get("designation") or doc.designation
			doc.primary_role = primary_role or doc.primary_role
			doc.secondary_roles = ", ".join(secondary_roles)
			doc.assigned_projects = ", ".join(assigned_projects)
			doc.assigned_sites = ", ".join(assigned_sites)
			doc.is_active = 1 if cint(user_doc.enabled) else 0
			doc.save(ignore_permissions=True)
		else:
			frappe.get_doc(
				{
					"doctype": "GE User Context",
					"user": user,
					"department": department,
					"designation": employee.get("designation"),
					"primary_role": primary_role,
					"secondary_roles": ", ".join(secondary_roles),
					"assigned_projects": ", ".join(assigned_projects),
					"assigned_sites": ", ".join(assigned_sites),
					"is_active": 1 if cint(user_doc.enabled) else 0,
				}
			).insert(ignore_permissions=True)

	for system_user in EXCLUDED_USER_CONTEXTS:
		if frappe.db.exists("GE User Context", system_user):
			frappe.delete_doc("GE User Context", system_user, ignore_permissions=True, force=1)

	frappe.db.commit()


def seed_rbac():
	"""Master entry point — seeds capabilities, packs, role mappings, and user contexts."""
	seed_capabilities()
	seed_packs()
	seed_role_pack_mappings()
	seed_user_contexts()
