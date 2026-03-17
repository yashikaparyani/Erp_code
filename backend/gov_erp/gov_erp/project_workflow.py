from gov_erp.role_utils import (
	ROLE_DIRECTOR,
	ROLE_ENGINEERING_HEAD,
	ROLE_ENGINEER,
	ROLE_PRESALES_HEAD,
	ROLE_PROCUREMENT_HEAD,
	ROLE_PROJECT_HEAD,
	ROLE_PROJECT_MANAGER,
	ROLE_STORE_MANAGER,
	ROLE_STORES_LOGISTICS_HEAD,
	ROLE_ACCOUNTS_HEAD,
	ROLE_ACCOUNTS,
	ROLE_RMA_HEAD,
	ROLE_RMA_MANAGER,
	ROLE_OM_OPERATOR,
)


WORKFLOW_SUPER_ROLES = [
	ROLE_DIRECTOR,
	ROLE_PRESALES_HEAD,
]


WORKFLOW_STAGE_KEYS = [
	"SURVEY",
	"BOQ_DESIGN",
	"COSTING",
	"PROCUREMENT",
	"STORES_DISPATCH",
	"EXECUTION",
	"BILLING_PAYMENT",
	"OM_RMA",
	"CLOSED",
]


WORKFLOW_STAGE_STATUS_KEYS = [
	"IN_PROGRESS",
	"PENDING_APPROVAL",
	"REJECTED",
	"COMPLETED",
]


WORKFLOW_STAGE_OPTIONS = "\n".join(WORKFLOW_STAGE_KEYS)
WORKFLOW_STAGE_STATUS_OPTIONS = "\n".join(WORKFLOW_STAGE_STATUS_KEYS)


WORKFLOW_STAGES = [
	{
		"key": "SURVEY",
		"label": "Survey",
		"owner_department": "Engineering",
		"owner_roles": [ROLE_ENGINEERING_HEAD, ROLE_ENGINEER, ROLE_PROJECT_MANAGER],
		"submit_roles": [ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_PRESALES_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD, ROLE_PROJECT_MANAGER],
		"next_stage": "BOQ_DESIGN",
		"description": "Initial site survey and readiness capture before BOQ/design work moves forward.",
	},
	{
		"key": "BOQ_DESIGN",
		"label": "BOQ and Design",
		"owner_department": "Engineering",
		"owner_roles": [ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PRESALES_HEAD],
		"submit_roles": [ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_PRESALES_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD, ROLE_PROJECT_MANAGER],
		"next_stage": "COSTING",
		"description": "Survey-backed BOQ and design outputs should be finalized and approved here.",
	},
	{
		"key": "COSTING",
		"label": "Costing",
		"owner_department": "Presales and Finance",
		"owner_roles": [ROLE_PRESALES_HEAD, ROLE_PROJECT_MANAGER, ROLE_ACCOUNTS],
		"submit_roles": [ROLE_PRESALES_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"next_stage": "PROCUREMENT",
		"description": "Commercial validation and cost sheet approval should complete before procurement starts.",
	},
	{
		"key": "PROCUREMENT",
		"label": "Procurement",
		"owner_department": "Procurement",
		"owner_roles": [ROLE_PROCUREMENT_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD],
		"submit_roles": [ROLE_PROCUREMENT_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_PRESALES_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"next_stage": "STORES_DISPATCH",
		"description": "Vendor comparison and buying decisions should be completed before dispatch.",
	},
	{
		"key": "STORES_DISPATCH",
		"label": "Stores and Dispatch",
		"owner_department": "Stores",
		"owner_roles": [ROLE_STORE_MANAGER, ROLE_STORES_LOGISTICS_HEAD, ROLE_PROJECT_MANAGER],
		"submit_roles": [ROLE_STORE_MANAGER, ROLE_STORES_LOGISTICS_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"next_stage": "EXECUTION",
		"description": "Material movement should be approved before installation and execution begins.",
	},
	{
		"key": "EXECUTION",
		"label": "Execution",
		"owner_department": "Project Delivery",
		"owner_roles": [ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_ENGINEERING_HEAD],
		"submit_roles": [ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_ENGINEERING_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"next_stage": "BILLING_PAYMENT",
		"description": "Site execution, milestone completion, and field delivery should be completed here.",
	},
	{
		"key": "BILLING_PAYMENT",
		"label": "Billing and Payment",
		"owner_department": "Accounts",
		"owner_roles": [ROLE_ACCOUNTS_HEAD, ROLE_ACCOUNTS, ROLE_PROJECT_MANAGER],
		"submit_roles": [ROLE_ACCOUNTS_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_PRESALES_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"next_stage": "OM_RMA",
		"description": "Billing closure and payment milestones should be stabilized before handover or support mode.",
	},
	{
		"key": "OM_RMA",
		"label": "O and M / RMA",
		"owner_department": "Support and RMA",
		"owner_roles": [ROLE_RMA_HEAD, ROLE_RMA_MANAGER, ROLE_OM_OPERATOR, ROLE_PROJECT_MANAGER],
		"submit_roles": [ROLE_RMA_HEAD, ROLE_RMA_MANAGER, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"next_stage": "CLOSED",
		"description": "Post-delivery support and closure checks should be completed before final project closure.",
	},
	{
		"key": "CLOSED",
		"label": "Closed",
		"owner_department": "Management",
		"owner_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"submit_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"approve_roles": [ROLE_DIRECTOR, ROLE_PRESALES_HEAD, ROLE_PROJECT_HEAD],
		"next_stage": None,
		"description": "Final project closure state.",
	},
]


WORKFLOW_STAGE_MAP = {stage["key"]: stage for stage in WORKFLOW_STAGES}


def get_workflow_stage(stage_key):
	return WORKFLOW_STAGE_MAP.get(stage_key or WORKFLOW_STAGE_KEYS[0], WORKFLOW_STAGES[0])


def get_next_workflow_stage(stage_key):
	return get_workflow_stage(stage_key).get("next_stage")
