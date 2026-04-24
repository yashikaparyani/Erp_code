app_name = "gov_erp"
app_title = "Gov ERP"
app_publisher = "Technosys"
app_description = "Government project ERP backend for Technosys"
app_email = "dev@technosys.local"
app_license = "mit"

# Required Apps
required_apps = ["erpnext", "hrms"]

website_route_rules = [
	{"from_route": "/api/<path:app_path>", "to_route": "api"},
]

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "gov_erp",
# 		"logo": "/assets/gov_erp/logo.png",
# 		"title": "Gov ERP",
# 		"route": "/gov_erp",
# 		"has_permission": "gov_erp.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/gov_erp/css/gov_erp.css"
# app_include_js = "/assets/gov_erp/js/gov_erp.js"

# include js, css files in header of web template
# web_include_css = "/assets/gov_erp/css/gov_erp.css"
# web_include_js = "/assets/gov_erp/js/gov_erp.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "gov_erp/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "gov_erp/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "gov_erp.utils.jinja_methods",
# 	"filters": "gov_erp.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "gov_erp.install.before_install"
after_install = "gov_erp.install.after_install"
after_migrate = ["gov_erp.install.after_migrate"]

# Uninstallation
# ------------

# before_uninstall = "gov_erp.uninstall.before_uninstall"
# after_uninstall = "gov_erp.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "gov_erp.utils.before_app_install"
# after_app_install = "gov_erp.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "gov_erp.utils.before_app_uninstall"
# after_app_uninstall = "gov_erp.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "gov_erp.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways
# ─────────────────────────────────────
# Single merge point: Frappe's native DocPerm table is bypassed for
# doctypes that our RBAC PermissionEngine + API-layer guards already
# handle.  See gov_erp/permissions.py for the hook logic.

_CORE_PERM    = "gov_erp.permissions.has_core_doctype_permission"
_GE_PERM      = "gov_erp.permissions.has_ge_doctype_permission"
_GE_MOD_PERM  = "gov_erp.permissions.has_ge_module_permission"

has_permission = {
	# ── Core Frappe doctypes (admin roles only) ─────────────────────────
	"Role":        _CORE_PERM,
	"Department":  _CORE_PERM,
	"Designation": _CORE_PERM,
	"User":        _CORE_PERM,
	"Company":     _CORE_PERM,
	"Has Role":    _CORE_PERM,
	"Employee":    _CORE_PERM,
	"Project":     _CORE_PERM,

	# ── RBAC infrastructure (blanket allow — bootstrap, no recursion) ──
	"GE Permission Pack":       _GE_PERM,
	"GE Permission Pack Item":  _GE_PERM,
	"GE Role Pack Mapping":     _GE_PERM,
	"GE User Context":          _GE_PERM,
	"GE Permission Capability": _GE_PERM,
	"GE User Pack Override":    _GE_PERM,
	"GE RBAC Audit Log":        _GE_PERM,

	# ── Cross-cutting (blanket allow — any authenticated user) ─────────
	"GE Alert":                 _GE_PERM,
	"GE User Reminder":         _GE_PERM,
	"GE Import Log":            _GE_PERM,

	# ── Project Command (module-gated) ─────────────────────────────────
	"GE Site":                         _GE_MOD_PERM,
	"GE Milestone":                    _GE_MOD_PERM,
	"GE Project Closeout":             _GE_MOD_PERM,
	"GE Project Favorite":             _GE_MOD_PERM,
	"GE Project Note":                 _GE_MOD_PERM,
	"GE Project Task":                 _GE_MOD_PERM,
	"GE Project Team Member":          _GE_MOD_PERM,
	"GE Project Communication Log":    _GE_MOD_PERM,
	"GE Project Asset":                _GE_MOD_PERM,
	"GE Project Staffing Requirement": _GE_MOD_PERM,
	"GE Project Staffing Assignment":  _GE_MOD_PERM,

	# ── Presales (module-gated) ────────────────────────────────────────
	"GE Tender":                 _GE_MOD_PERM,
	"GE Bid":                    _GE_MOD_PERM,
	"GE Tender Approval":        _GE_MOD_PERM,
	"GE Tender Checklist":       _GE_MOD_PERM,
	"GE Tender Checklist Item":  _GE_MOD_PERM,
	"GE Tender Clarification":   _GE_MOD_PERM,
	"GE Tender Compliance Item": _GE_MOD_PERM,
	"GE Tender Organization":    _GE_MOD_PERM,
	"GE Tender Reminder":        _GE_MOD_PERM,
	"GE Tender Result":          _GE_MOD_PERM,
	"GE Tender Result Bidder":   _GE_MOD_PERM,
	"GE LOI Tracker":            _GE_MOD_PERM,
	"GE Party":                  _GE_MOD_PERM,
	"GE Organization":           _GE_MOD_PERM,
	"GE Competitor":             _GE_MOD_PERM,
	"GE Presales Color Config":  _GE_MOD_PERM,
	"GE Commercial Document":    _GE_MOD_PERM,
	"GE PDC Instrument":         _GE_MOD_PERM,

	# ── Engineering (module-gated) ─────────────────────────────────────
	"GE Survey":                 _GE_MOD_PERM,
	"GE Survey Attachment":      _GE_MOD_PERM,
	"GE Drawing":                _GE_MOD_PERM,
	"GE Technical Deviation":    _GE_MOD_PERM,
	"GE Change Request":         _GE_MOD_PERM,

	# ── Procurement (module-gated) ─────────────────────────────────────
	"GE BOQ":                    _GE_MOD_PERM,
	"GE BOQ Item":               _GE_MOD_PERM,
	"GE Cost Sheet":             _GE_MOD_PERM,
	"GE Cost Sheet Item":        _GE_MOD_PERM,
	"GE Vendor Comparison":      _GE_MOD_PERM,
	"GE Vendor Comparison Quote": _GE_MOD_PERM,
	"GE Costing Queue":          _GE_MOD_PERM,

	# ── Inventory / Stores (module-gated) ──────────────────────────────
	"GE Dispatch Challan":       _GE_MOD_PERM,
	"GE Dispatch Challan Item":  _GE_MOD_PERM,
	"GE Project Inventory":      _GE_MOD_PERM,
	"GE PO Extension":           _GE_MOD_PERM,
	"GE PO Payment Term":        _GE_MOD_PERM,

	# ── Execution / I&C (module-gated) ─────────────────────────────────
	"GE Dependency Rule":              _GE_MOD_PERM,
	"GE Dependency Override":          _GE_MOD_PERM,
	"GE DPR":                          _GE_MOD_PERM,
	"GE DPR Item":                     _GE_MOD_PERM,
	"GE DPR Photo":                    _GE_MOD_PERM,
	"GE Document Folder":              _GE_MOD_PERM,
	"GE Project Document":             _GE_MOD_PERM,
	"GE Document Requirement":         _GE_MOD_PERM,
	"GE Test Report":                  _GE_MOD_PERM,
	"GE Test Result Item":             _GE_MOD_PERM,
	"GE Commissioning Checklist":      _GE_MOD_PERM,
	"GE Commissioning Checklist Item": _GE_MOD_PERM,
	"GE Client Signoff":               _GE_MOD_PERM,
	"GE Project Issue":                _GE_MOD_PERM,
	"GE PM Request":                   _GE_MOD_PERM,
	"GE Manpower Log":                 _GE_MOD_PERM,
	"GE IP Allocation":                _GE_MOD_PERM,
	"GE IP Pool":                      _GE_MOD_PERM,

	# ── Finance (module-gated) ─────────────────────────────────────────
	"GE Invoice":                _GE_MOD_PERM,
	"GE Invoice Line":           _GE_MOD_PERM,
	"GE Estimate":               _GE_MOD_PERM,
	"GE Proforma Invoice":       _GE_MOD_PERM,
	"GE Payment Follow Up":      _GE_MOD_PERM,
	"GE Payment Receipt":        _GE_MOD_PERM,
	"GE Retention Ledger":       _GE_MOD_PERM,
	"GE Petty Cash":             _GE_MOD_PERM,
	"GE Budget Allocation":      _GE_MOD_PERM,
	"GE Penalty Deduction":      _GE_MOD_PERM,
	"GE EMD PBG Instrument":     _GE_MOD_PERM,

	# ── HR / Manpower (module-gated) ───────────────────────────────────
	"GE Employee Onboarding":         _GE_MOD_PERM,
	"GE Leave Application":           _GE_MOD_PERM,
	"GE Leave Allocation":            _GE_MOD_PERM,
	"GE Leave Type":                  _GE_MOD_PERM,
	"GE Attendance Log":              _GE_MOD_PERM,
	"GE Attendance Regularization":   _GE_MOD_PERM,
	"GE Travel Log":                  _GE_MOD_PERM,
	"GE Overtime Entry":              _GE_MOD_PERM,
	"GE Statutory Ledger":            _GE_MOD_PERM,
	"GE Technician Visit Log":        _GE_MOD_PERM,
	"GE Employee Certification":      _GE_MOD_PERM,
	"GE Employee Document":           _GE_MOD_PERM,
	"GE Material Consumption Report": _GE_MOD_PERM,

	# ── O&M / RMA (module-gated) ──────────────────────────────────────
	"GE Ticket":                 _GE_MOD_PERM,
	"GE Ticket Action":          _GE_MOD_PERM,
	"GE RMA Tracker":            _GE_MOD_PERM,
	"GE SLA Profile":            _GE_MOD_PERM,
	"GE SLA Timer":              _GE_MOD_PERM,
	"GE SLA Penalty Rule":       _GE_MOD_PERM,
	"GE SLA Penalty Record":     _GE_MOD_PERM,
	"GE Device Register":        _GE_MOD_PERM,
	"GE Device Uptime Log":      _GE_MOD_PERM,

	# ── Approval (module-gated) ────────────────────────────────────────
	"GE PH Approval Item":       _GE_MOD_PERM,

	# ── Reports / Accountability (module-gated) ────────────────────────
	"GE Accountability Event":   _GE_MOD_PERM,
	"GE Accountability Record":  _GE_MOD_PERM,
}

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Doc Events — auto-emit alerts on record lifecycle
doc_events = {
	"Project": {
		"after_insert": "gov_erp.doc_event_handlers.project_after_insert",
		"on_update": "gov_erp.doc_event_handlers.project_on_update",
	},
	"GE Site": {
		"on_update": "gov_erp.doc_event_handlers.site_on_update",
	},
	"GE Milestone": {
		"on_update": "gov_erp.doc_event_handlers.milestone_on_update",
	},
	"GE Project Document": {
		"after_insert": "gov_erp.doc_event_handlers.document_after_insert",
		"on_update": "gov_erp.doc_event_handlers.document_on_update",
	},
	"GE Dependency Override": {
		"after_insert": "gov_erp.doc_event_handlers.dependency_override_after_insert",
		"on_update": "gov_erp.doc_event_handlers.dependency_override_on_update",
	},
	"GE Dispatch Challan": {
		"after_insert": "gov_erp.doc_event_handlers.dispatch_challan_after_insert",
	},
	"GE Ticket": {
		"on_update": "gov_erp.doc_event_handlers.ticket_on_update",
	},
	"GE RMA Tracker": {
		"after_insert": "gov_erp.doc_event_handlers.rma_after_insert",
	},
	"GE Invoice": {
		"after_insert": "gov_erp.doc_event_handlers.invoice_after_insert",
	},
}

# Scheduled Tasks
# ---------------

scheduler_events = {
	"cron": {
		"* * * * *": [
			"gov_erp.gov_erp.doctype.ge_user_reminder.ge_user_reminder.process_due_reminders"
		],
		"0 6 * * *": [
			"gov_erp.api._process_expiring_documents",
			"gov_erp.api.generate_system_reminders"
		]
	}
}

# Testing
# -------

# before_tests = "gov_erp.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "gov_erp.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "gov_erp.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["gov_erp.utils.before_request"]
# after_request = ["gov_erp.utils.after_request"]

# Job Events
# ----------
# before_job = ["gov_erp.utils.before_job"]
# after_job = ["gov_erp.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"gov_erp.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []
