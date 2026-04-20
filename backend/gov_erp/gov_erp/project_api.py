"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ── Project Spine Model APIs ────────────────────────────────

SPINE_STAGES = [
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

# Map each department to the stages it can see in its operational lane.
# The frontend matrix can further distinguish read-only vs full access.
DEPARTMENT_STAGE_MAP = {
        "engineering": ["SURVEY", "BOQ_DESIGN", "COSTING", "PROCUREMENT", "EXECUTION"],
        "procurement": ["COSTING", "PROCUREMENT", "STORES_DISPATCH", "BILLING_PAYMENT"],
        "stores": ["PROCUREMENT", "STORES_DISPATCH", "EXECUTION"],
        "accounts": ["COSTING", "PROCUREMENT", "BILLING_PAYMENT", "CLOSED"],
        "i_and_c": ["STORES_DISPATCH", "EXECUTION", "BILLING_PAYMENT"],
        "hr": SPINE_STAGES,              # cross-cutting visibility
        "om_rma": ["OM_RMA", "CLOSED"],
}


def _require_project_workspace_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_PROJECT_HEAD,
                ROLE_PROJECT_MANAGER,
        )


def _require_project_workspace_write_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_PROJECT_HEAD,
                ROLE_PROJECT_MANAGER,
        )


def _require_project_approver_access():
        """Only Project Head and Director can approve/reject a stage submission."""
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PROJECT_HEAD,
        )


def _require_project_workspace_delete_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_PROJECT_HEAD,
        )


def _require_spine_read_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_DEPARTMENT_HEAD,
                ROLE_PROJECT_HEAD,
                ROLE_PROJECT_MANAGER,
                ROLE_ENGINEERING_HEAD,
                ROLE_ENGINEER,
                ROLE_PROCUREMENT_HEAD,
                ROLE_PROCUREMENT_MANAGER,
                ROLE_STORES_LOGISTICS_HEAD,
                ROLE_STORE_MANAGER,
                ROLE_ACCOUNTS,
                ROLE_ACCOUNTS_HEAD,
                ROLE_HR_HEAD,
                ROLE_HR_MANAGER,
                ROLE_RMA_HEAD,
                ROLE_RMA_MANAGER,
                ROLE_FIELD_TECHNICIAN,
                ROLE_OM_OPERATOR,
        )


def _require_spine_write_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_PROJECT_HEAD,
                ROLE_PROJECT_MANAGER,
                ROLE_ENGINEERING_HEAD,
                ROLE_PROCUREMENT_HEAD,
                ROLE_STORES_LOGISTICS_HEAD,
                ROLE_ACCOUNTS_HEAD,
                ROLE_HR_HEAD,
                ROLE_RMA_HEAD,
        )


def _compute_project_spine_progress(sites):
        """Compute project spine progress % from site stages."""
        if not sites:
                return 0
        stage_weight = {s: i for i, s in enumerate(SPINE_STAGES)}
        max_idx = len(SPINE_STAGES) - 1
        if max_idx == 0:
                return 100
        total = sum(stage_weight.get(s.current_site_stage or "SURVEY", 0) for s in sites)
        return round((total / (len(sites) * max_idx)) * 100, 2)


def _site_stage_coverage(sites):
        """Group sites by their current spine stage."""
        coverage = {s: 0 for s in SPINE_STAGES}
        for site in sites:
                stage = site.current_site_stage or "SURVEY"
                if stage in coverage:
                        coverage[stage] += 1
        return coverage


def _build_action_queue(sites, project=None):
        """Find sites that need attention: blocked, pending, overdue milestones."""
        blocked = []
        pending = []
        for site in sites:
                if site.site_blocked:
                        blocked.append({
                                "site": site.name,
                                "site_code": site.site_code,
                                "site_name": site.site_name,
                                "stage": site.current_site_stage,
                                "reason": site.blocker_reason,
                        })
                elif (site.current_site_stage or "SURVEY") != "CLOSED":
                        pending.append({
                                "site": site.name,
                                "site_code": site.site_code,
                                "site_name": site.site_name,
                                "stage": site.current_site_stage,
                                "owner_role": site.current_owner_role,
                                "owner_user": site.current_owner_user,
                        })

        # Overdue milestones for the project
        ms_filters = {}
        if project:
                ms_filters["linked_project"] = project
        overdue_milestones = []
        for ms in frappe.get_all(
                "GE Milestone",
                filters=ms_filters,
                fields=["name", "milestone_name", "linked_site", "planned_end_date", "status"],
        ):
                if (
                        ms.planned_end_date
                        and not ms.status == "COMPLETED"
                        and frappe.utils.date_diff(frappe.utils.nowdate(), ms.planned_end_date) > 0
                ):
                        overdue_milestones.append({
                                "milestone": ms.name,
                                "title": ms.milestone_name,
                                "site": ms.linked_site,
                                "planned_end_date": str(ms.planned_end_date),
                        })

        return {
                "blocked_sites": blocked,
                "blocked_count": len(blocked),
                "pending_sites": pending[:20],
                "pending_count": len(pending),
                "overdue_milestones": overdue_milestones[:20],
                "overdue_count": len(overdue_milestones),
        }


def _department_lane_for_stage(stage):
        stage = stage or "SURVEY"
        for department, stages in DEPARTMENT_STAGE_MAP.items():
                if department == "hr":
                        continue
                if stage in stages:
                        return department
        return "hr"


def _format_department_label(department):
        return cstr(department or "").replace("_", " ").title()


def _serialize_site_row(site, milestone_meta=None, dpr_meta=None):
        milestone_meta = milestone_meta or {}
        dpr_meta = dpr_meta or {}
        stage = site.current_site_stage or "SURVEY"
        return {
                "name": site.name,
                "site_code": site.site_code,
                "site_name": site.site_name,
                "status": site.status,
                "linked_project": site.linked_project,
                "installation_stage": getattr(site, "installation_stage", None),
                "current_site_stage": stage,
                "department_lane": _department_lane_for_stage(stage),
                "site_blocked": cint(site.site_blocked),
                "blocker_reason": getattr(site, "blocker_reason", None),
                "current_owner_role": getattr(site, "current_owner_role", None),
                "current_owner_user": getattr(site, "current_owner_user", None),
                "site_progress_pct": flt(getattr(site, "site_progress_pct", None) or getattr(site, "location_progress_pct", None) or 0),
                "milestone_count": milestone_meta.get(site.name, {}).get("count", 0),
                "open_milestone_count": milestone_meta.get(site.name, {}).get("open_count", 0),
                "latest_planned_end_date": milestone_meta.get(site.name, {}).get("latest_planned_end_date"),
                "latest_dpr_date": dpr_meta.get(site.name),
                "modified": str(site.modified) if getattr(site, "modified", None) else None,
        }


def _build_department_lane_breakdown(serialized_sites):
        lane_map = {}
        for department, stages in DEPARTMENT_STAGE_MAP.items():
                visible_sites = [site for site in serialized_sites if (site.get("current_site_stage") or "SURVEY") in stages]
                lane_map[department] = {
                        "department": department,
                        "label": _format_department_label(department),
                        "allowed_stages": list(stages),
                        "site_count": len(visible_sites),
                        "blocked_count": sum(1 for site in visible_sites if cint(site.get("site_blocked"))),
                        "avg_progress_pct": round(
                                (sum(flt(site.get("site_progress_pct") or 0) for site in visible_sites) / len(visible_sites)),
                                2,
                        ) if visible_sites else 0,
                        "stage_coverage": {
                                stage: sum(1 for site in visible_sites if (site.get("current_site_stage") or "SURVEY") == stage)
                                for stage in stages
                        },
                        "sites": visible_sites,
                }
        return lane_map


def _get_project_site_rollup(project):
        site_rows = frappe.get_all(
                "GE Site",
                filters={"linked_project": project},
                fields=[
                        "name", "site_code", "site_name", "status", "linked_project",
                        "installation_stage", "current_site_stage", "site_blocked", "blocker_reason",
                        "current_owner_role", "current_owner_user", "site_progress_pct", "location_progress_pct",
                        "modified",
                ],
                order_by="site_code asc, site_name asc",
        )

        milestone_rows = frappe.get_all(
                "GE Milestone",
                filters={"linked_project": project},
                fields=["linked_site", "status", "planned_end_date"],
        )
        milestone_meta = {}
        for row in milestone_rows:
                linked_site = row.linked_site
                if not linked_site:
                        continue
                bucket = milestone_meta.setdefault(linked_site, {"count": 0, "open_count": 0, "latest_planned_end_date": None})
                bucket["count"] += 1
                if cstr(row.status or "").strip().upper() not in {"COMPLETED", "APPROVED", "CLOSED"}:
                        bucket["open_count"] += 1
                planned_end_date = str(row.planned_end_date) if row.planned_end_date else None
                if planned_end_date and (not bucket["latest_planned_end_date"] or planned_end_date > bucket["latest_planned_end_date"]):
                        bucket["latest_planned_end_date"] = planned_end_date

        dpr_rows = frappe.get_all(
                "GE DPR",
                filters={"linked_project": project},
                fields=["linked_site", "report_date"],
                order_by="report_date desc",
        )
        dpr_meta = {}
        for row in dpr_rows:
                if row.linked_site and row.linked_site not in dpr_meta:
                        dpr_meta[row.linked_site] = str(row.report_date) if row.report_date else None

        serialized_sites = [_serialize_site_row(site, milestone_meta, dpr_meta) for site in site_rows]
        return {
                "sites": serialized_sites,
                "stage_coverage": _site_stage_coverage(site_rows),
                "department_lanes": _build_department_lane_breakdown(serialized_sites),
                "action_queue": _build_action_queue(site_rows, project),
        }


def _department_lane_for_stage(stage):
        stage = stage or "SURVEY"
        for department, stages in DEPARTMENT_STAGE_MAP.items():
                if department == "hr":
                        continue
                if stage in stages:
                        return department
        return "hr"


def _format_department_label(department):
        return cstr(department or "").replace("_", " ").title()


def _serialize_site_row(site, milestone_meta=None, dpr_meta=None):
        milestone_meta = milestone_meta or {}
        dpr_meta = dpr_meta or {}
        stage = site.current_site_stage or "SURVEY"
        return {
                "name": site.name,
                "site_code": site.site_code,
                "site_name": site.site_name,
                "status": site.status,
                "linked_project": site.linked_project,
                "installation_stage": getattr(site, "installation_stage", None),
                "current_site_stage": stage,
                "department_lane": _department_lane_for_stage(stage),
                "site_blocked": cint(site.site_blocked),
                "blocker_reason": getattr(site, "blocker_reason", None),
                "current_owner_role": getattr(site, "current_owner_role", None),
                "current_owner_user": getattr(site, "current_owner_user", None),
                "site_progress_pct": flt(getattr(site, "site_progress_pct", None) or getattr(site, "location_progress_pct", None) or 0),
                "milestone_count": milestone_meta.get(site.name, {}).get("count", 0),
                "open_milestone_count": milestone_meta.get(site.name, {}).get("open_count", 0),
                "latest_planned_end_date": milestone_meta.get(site.name, {}).get("latest_planned_end_date"),
                "latest_dpr_date": dpr_meta.get(site.name),
                "modified": str(site.modified) if getattr(site, "modified", None) else None,
        }


def _build_department_lane_breakdown(serialized_sites):
        lane_map = {}
        for department, stages in DEPARTMENT_STAGE_MAP.items():
                visible_sites = [site for site in serialized_sites if (site.get("current_site_stage") or "SURVEY") in stages]
                lane_map[department] = {
                        "department": department,
                        "label": _format_department_label(department),
                        "allowed_stages": list(stages),
                        "site_count": len(visible_sites),
                        "blocked_count": sum(1 for site in visible_sites if cint(site.get("site_blocked"))),
                        "avg_progress_pct": round(
                                (sum(flt(site.get("site_progress_pct") or 0) for site in visible_sites) / len(visible_sites)),
                                2,
                        ) if visible_sites else 0,
                        "stage_coverage": {
                                stage: sum(1 for site in visible_sites if (site.get("current_site_stage") or "SURVEY") == stage)
                                for stage in stages
                        },
                        "sites": visible_sites,
                }
        return lane_map


def _get_project_site_rollup(project):
        site_rows = frappe.get_all(
                "GE Site",
                filters={"linked_project": project},
                fields=[
                        "name", "site_code", "site_name", "status", "linked_project",
                        "installation_stage", "current_site_stage", "site_blocked", "blocker_reason",
                        "current_owner_role", "current_owner_user", "site_progress_pct", "location_progress_pct",
                        "modified",
                ],
                order_by="site_code asc, site_name asc",
        )

        milestone_rows = frappe.get_all(
                "GE Milestone",
                filters={"linked_project": project},
                fields=["linked_site", "status", "planned_end_date"],
        )
        milestone_meta = {}
        for row in milestone_rows:
                linked_site = row.linked_site
                if not linked_site:
                        continue
                bucket = milestone_meta.setdefault(linked_site, {"count": 0, "open_count": 0, "latest_planned_end_date": None})
                bucket["count"] += 1
                if cstr(row.status or "").strip().upper() not in {"COMPLETED", "APPROVED", "CLOSED"}:
                        bucket["open_count"] += 1
                planned_end_date = str(row.planned_end_date) if row.planned_end_date else None
                if planned_end_date and (not bucket["latest_planned_end_date"] or planned_end_date > bucket["latest_planned_end_date"]):
                        bucket["latest_planned_end_date"] = planned_end_date

        dpr_rows = frappe.get_all(
                "GE DPR",
                filters={"linked_project": project},
                fields=["linked_site", "report_date"],
                order_by="report_date desc",
        )
        dpr_meta = {}
        for row in dpr_rows:
                if row.linked_site and row.linked_site not in dpr_meta:
                        dpr_meta[row.linked_site] = str(row.report_date) if row.report_date else None

        serialized_sites = [_serialize_site_row(site, milestone_meta, dpr_meta) for site in site_rows]
        return {
                "sites": serialized_sites,
                "stage_coverage": _site_stage_coverage(site_rows),
                "department_lanes": _build_department_lane_breakdown(serialized_sites),
                "action_queue": _build_action_queue(site_rows, project),
        }


PROJECT_EDITABLE_FIELDS = {
        "project_name",
        "status",
        "customer",
        "company",
        "expected_start_date",
        "expected_end_date",
        "percent_complete",
        "estimated_costing",
        "notes",
        "linked_tender",
        "project_head",
        "project_manager_user",
        "spine_blocked",
        "blocker_summary",
}


def _get_tender_contract_scope(tender_name):
        """Return contract_scope from linked GE Tender, or None."""
        if not tender_name:
                return None
        try:
                return frappe.db.get_value("GE Tender", tender_name, "contract_scope") or None
        except Exception:
                return None


def _serialize_project_record(doc):
        return {
                "name": doc.name,
                "project_name": doc.project_name,
                "status": doc.status,
                "customer": doc.customer,
                "company": doc.company,
                "expected_start_date": str(doc.expected_start_date) if doc.expected_start_date else None,
                "expected_end_date": str(doc.expected_end_date) if doc.expected_end_date else None,
                "percent_complete": doc.percent_complete,
                "estimated_costing": getattr(doc, "estimated_costing", None),
                "notes": doc.notes,
                "linked_tender": getattr(doc, "linked_tender", None),
                "project_head": getattr(doc, "project_head", None),
                "project_manager_user": getattr(doc, "project_manager_user", None),
                "total_sites": getattr(doc, "total_sites", 0),
                "current_project_stage": getattr(doc, "current_project_stage", None),
                "current_stage_status": getattr(doc, "current_stage_status", None),
                "current_stage_owner_department": getattr(doc, "current_stage_owner_department", None),
                "stage_submitted_by": getattr(doc, "stage_submitted_by", None),
                "stage_submitted_at": str(getattr(doc, "stage_submitted_at", None)) if getattr(doc, "stage_submitted_at", None) else None,
                "workflow_last_action": getattr(doc, "workflow_last_action", None),
                "workflow_last_actor": getattr(doc, "workflow_last_actor", None),
                "workflow_last_action_at": str(getattr(doc, "workflow_last_action_at", None)) if getattr(doc, "workflow_last_action_at", None) else None,
                "spine_progress_pct": getattr(doc, "spine_progress_pct", 0),
                "spine_blocked": getattr(doc, "spine_blocked", 0),
                "blocker_summary": getattr(doc, "blocker_summary", None),
                "contract_scope": _get_tender_contract_scope(getattr(doc, "linked_tender", None)),
                "creation": str(doc.creation) if doc.creation else None,
                "modified": str(doc.modified) if doc.modified else None,
        }


def _normalize_project_payload(data, existing_doc=None):
        values = {key: value for key, value in (data or {}).items() if key in PROJECT_EDITABLE_FIELDS}
        string_fields = [
                "project_name",
                "status",
                "customer",
                "company",
                "notes",
                "linked_tender",
                "project_head",
                "project_manager_user",
                "blocker_summary",
        ]
        for fieldname in string_fields:
                if fieldname not in values or not isinstance(values[fieldname], str):
                        continue
                cleaned = values[fieldname].strip()
                values[fieldname] = cleaned or None

        if values.get("customer"):
                values["customer"] = _ensure_customer_exists(values["customer"])

        if existing_doc:
                if "project_name" in values:
                        values["project_name"] = _require_param(values.get("project_name"), "project_name")
                if "company" in values and not values.get("company"):
                        values["company"] = existing_doc.company or _get_default_company()
        else:
                values["project_name"] = _require_param(values.get("project_name"), "project_name")
                values["company"] = values.get("company") or _get_default_company()
                if not values.get("company"):
                        frappe.throw("company is required to create a Project")
                values["status"] = values.get("status") or "Open"
                values["expected_start_date"] = values.get("expected_start_date") or frappe.utils.today()
                values["current_project_stage"] = values.get("current_project_stage") or "SURVEY"
                values["current_stage_status"] = "IN_PROGRESS"
                values["spine_blocked"] = cint(values.get("spine_blocked") or 0)
                values["spine_progress_pct"] = 0
                values["total_sites"] = 0

        if "percent_complete" in values and values["percent_complete"] not in (None, ""):
                values["percent_complete"] = float(values["percent_complete"])
        if "estimated_costing" in values and values["estimated_costing"] not in (None, ""):
                values["estimated_costing"] = float(values["estimated_costing"])
        if "spine_blocked" in values:
                values["spine_blocked"] = cint(values["spine_blocked"])
                if not values["spine_blocked"] and "blocker_summary" not in values:
                        values["blocker_summary"] = None
        return values


def _normalize_initial_sites(data):
        sites = data.get("initial_sites") if isinstance(data, dict) else None
        if not sites:
                return []

        normalized = []
        for index, row in enumerate(sites, start=1):
                if not isinstance(row, dict):
                        continue
                site_name = cstr(row.get("site_name") or "").strip()
                site_code = cstr(row.get("site_code") or "").strip()
                if not site_name:
                        continue
                normalized.append(
                        {
                                "site_name": site_name,
                                "site_code": site_code or f"S{index:02d}",
                        }
                )
        return normalized


def _create_initial_sites_for_project(project_doc, initial_sites):
        if not initial_sites:
                return

        for row in initial_sites:
                site_doc = frappe.get_doc(_build_project_site_doc(project_doc, row))
                site_doc.insert()

        _refresh_project_spine(project_doc.name)


def _build_project_site_doc(project_doc, row):
        code_seed = cstr(row.get("site_code") or "").strip() or "SITE"
        return {
                "doctype": "GE Site",
                "site_code": f"{project_doc.name}-{code_seed}",
                "site_name": row.get("site_name"),
                "status": "PLANNED",
                "linked_project": project_doc.name,
                "linked_tender": getattr(project_doc, "linked_tender", None),
                "installation_stage": "Not Started",
                "current_site_stage": getattr(project_doc, "current_project_stage", None) or "SURVEY",
                "site_progress_pct": 0,
                "location_progress_pct": 0,
        }


def _get_project_delete_dependencies(project_name):
        dependencies = []
        link_fields = frappe.get_all(
                "DocField",
                filters={"fieldtype": "Link", "options": "Project"},
                fields=["parent", "fieldname"],
        )
        for field in link_fields:
                if field.parent in {"Project", "DocField", "Custom Field"}:
                        continue
                try:
                        count = frappe.db.count(field.parent, filters={field.fieldname: project_name})
                except Exception:
                        continue
                if count:
                        dependencies.append(
                                {
                                        "doctype": field.parent,
                                        "fieldname": field.fieldname,
                                        "count": count,
                                }
                        )
        return dependencies


@frappe.whitelist()
def get_project(name=None):
        """Return a single editable project record."""
        _require_project_workspace_access()
        name = _require_param(name, "name")
        doc = frappe.get_doc("Project", name, ignore_permissions=True)
        return {"success": True, "data": _serialize_project_record(doc)}


@frappe.whitelist()
def create_project(data):
        """Create a Project record with project-spine custom fields."""
        _require_project_workspace_write_access()
        payload = _parse_payload(data)
        values = _normalize_project_payload(payload)
        initial_sites = _normalize_initial_sites(payload)
        doc = frappe.get_doc({"doctype": "Project", **values})
        _sync_project_workflow_fields(doc, reset_submission=True)
        _append_project_workflow_event(doc, "PROJECT_CREATED", doc.current_project_stage, remarks="Project created from workspace")
        doc.insert(ignore_permissions=True)
        _create_initial_sites_for_project(doc, initial_sites)
        doc.reload()
        frappe.db.commit()
        return {"success": True, "data": _serialize_project_record(doc), "message": "Project created"}


@frappe.whitelist()
def add_project_sites(project, data=None):
        """Append new GE Site rows to an existing project from the project workspace."""
        _require_project_workspace_write_access()
        project = _require_param(project, "project")
        project_doc = frappe.get_doc("Project", project, ignore_permissions=True)
        payload = _parse_payload(data)
        initial_sites = _normalize_initial_sites(payload)
        if not initial_sites:
                frappe.throw("At least one site name is required")
        _create_initial_sites_for_project(project_doc, initial_sites)
        project_doc.reload()
        frappe.db.commit()
        return {"success": True, "data": _serialize_project_record(project_doc), "message": "Sites added"}


@frappe.whitelist()
def update_project(name, data):
        """Update a Project record."""
        _require_project_workspace_write_access()
        name = _require_param(name, "name")
        doc = frappe.get_doc("Project", name, ignore_permissions=True)
        previous_stage = getattr(doc, "current_project_stage", None)
        values = _normalize_project_payload(_parse_payload(data), existing_doc=doc)
        doc.update(values)
        if values.get("current_project_stage") and values.get("current_project_stage") != previous_stage:
                _sync_project_workflow_fields(doc, reset_submission=True)
                _append_project_workflow_event(
                        doc,
                        "PROJECT_STAGE_MANUALLY_SET",
                        doc.current_project_stage,
                        remarks=f"Stage manually changed from {previous_stage or 'unset'} to {doc.current_project_stage}",
                        metadata={"previous_stage": previous_stage, "new_stage": doc.current_project_stage},
                )
        else:
                _sync_project_workflow_fields(doc)
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return {"success": True, "data": _serialize_project_record(doc), "message": "Project updated"}


@frappe.whitelist()
def delete_project(name):
        """Delete a Project record after dependency check."""
        _require_project_workspace_delete_access()
        name = _require_param(name, "name")
        dependencies = _get_project_delete_dependencies(name)
        if dependencies:
                summary = ", ".join(f"{row['doctype']} ({row['count']})" for row in dependencies[:5])
                frappe.throw(f"Cannot delete project while linked records still exist: {summary}")
        frappe.delete_doc("Project", name, ignore_permissions=True)
        frappe.db.commit()
        return {"success": True, "message": "Project deleted"}


@frappe.whitelist()
def get_project_spine_list(department=None):
        """List projects with optional department-aware filtering."""
        _require_spine_read_access()
        projects = frappe.get_all(
                "Project",
                fields=[
                        "name", "project_name", "status", "customer",
                        "percent_complete", "expected_start_date", "expected_end_date",
                        "linked_tender", "project_head", "project_manager_user",
                        "total_sites", "current_project_stage", "current_stage_status", "current_stage_owner_department", "spine_progress_pct",
                        "spine_blocked", "blocker_summary",
                ],
                order_by="creation desc",
        )

        if department:
                dept_key = cstr(department).strip().lower().replace(" ", "_")
                allowed_stages = set(DEPARTMENT_STAGE_MAP.get(dept_key, []))
                if allowed_stages:
                        relevant_projects = []
                        for project in projects:
                                project_stage = project.get("current_project_stage") or "SURVEY"
                                if project_stage in allowed_stages:
                                        relevant_projects.append(project)
                                        continue

                                matching_sites = frappe.db.count(
                                        "GE Site",
                                        filters={
                                                "linked_project": project.get("name"),
                                                "current_site_stage": ["in", list(allowed_stages)],
                                        },
                                )
                                if matching_sites:
                                        relevant_projects.append(project)

                        projects = relevant_projects

        return {"success": True, "data": projects}


@frappe.whitelist()
def get_project_spine_summary(project=None):
        """
        Full spine summary for a single project (or all projects).

        Returns 3 layers:
          1. Project summary
          2. Site coverage by stage
          3. Action queue
        """
        _require_project_workspace_access()

        # Layer 1 – Project summary
        if project:
                project = _require_param(project, "project")
                proj = frappe.get_doc("Project", project, ignore_permissions=True)
                project_summary = {
                        "name": proj.name,
                        "project_name": proj.project_name,
                        "status": proj.status,
                        "customer": proj.customer,
                        "linked_tender": getattr(proj, "linked_tender", None),
                        "project_head": getattr(proj, "project_head", None),
                        "project_manager": getattr(proj, "project_manager_user", None),
                        "current_project_stage": getattr(proj, "current_project_stage", None),
                        "current_stage_status": getattr(proj, "current_stage_status", None),
                        "current_stage_owner_department": getattr(proj, "current_stage_owner_department", None),
                        "spine_progress_pct": getattr(proj, "spine_progress_pct", 0),
                        "spine_blocked": getattr(proj, "spine_blocked", 0),
                        "blocker_summary": getattr(proj, "blocker_summary", None),
                        "total_sites": getattr(proj, "total_sites", 0),
                        "percent_complete": proj.percent_complete,
                }
        else:
                project_summary = None

        # Fetch sites
        site_filters = {"linked_project": project} if project else {}
        sites = frappe.get_all(
                "GE Site",
                filters=site_filters,
                fields=[
                        "name", "site_code", "site_name", "status",
                        "linked_project", "current_site_stage",
                        "site_blocked", "blocker_reason",
                        "current_owner_role", "current_owner_user",
                        "site_progress_pct", "location_progress_pct",
                ],
        )

        # If no specific project, compute total_sites for project_summary
        if project and project_summary:
                project_summary["total_sites"] = len(sites)

        # Layer 2 – Site coverage by stage
        stage_coverage = _site_stage_coverage(sites)

        # Layer 3 – Action queue
        action_queue = _build_action_queue(sites, project)

        return {
                "success": True,
                "data": {
                        "project_summary": project_summary,
                        "site_count": len(sites),
                        "stage_coverage": stage_coverage,
                        "action_queue": action_queue,
                },
        }


@frappe.whitelist()
def get_project_spine_detail(project=None, department=None):
        """
        Detailed project view centered on site-level execution.

        A project is treated as an aggregation of its sites so each department can
        break the project down only through site/stage reality.
        """
        _require_spine_read_access()
        project = _require_param(project, "project")
        proj = frappe.get_doc("Project", project, ignore_permissions=True)
        rollup = _get_project_site_rollup(project)
        team_members = frappe.get_all(
                "GE Project Team Member",
                filters={"linked_project": project},
                fields=["name", "user", "role_in_project", "linked_site", "is_active"],
                order_by="creation asc",
        )
        project_assets = frappe.get_all(
                "GE Project Asset",
                filters={"linked_project": project},
                fields=["name", "asset_name", "asset_type", "status", "linked_site", "assigned_to"],
                order_by="creation desc",
                limit_page_length=50,
        )

        selected_lane = None
        if department:
                department_key = cstr(department).strip().lower().replace(" ", "_")
                selected_lane = rollup["department_lanes"].get(department_key)

        return {
                "success": True,
                "data": {
                        "project_summary": {
                                "name": proj.name,
                                "project_name": proj.project_name,
                                "status": proj.status,
                                "customer": proj.customer,
                                "company": proj.company,
                                "linked_tender": getattr(proj, "linked_tender", None),
                                "project_head": getattr(proj, "project_head", None),
                                "project_manager_user": getattr(proj, "project_manager_user", None),
                                "current_project_stage": getattr(proj, "current_project_stage", None),
                                "current_stage_status": getattr(proj, "current_stage_status", None),
                                "current_stage_owner_department": getattr(proj, "current_stage_owner_department", None),
                                "spine_progress_pct": getattr(proj, "spine_progress_pct", 0),
                                "spine_blocked": cint(getattr(proj, "spine_blocked", 0)),
                                "blocker_summary": getattr(proj, "blocker_summary", None),
                                "total_sites": len(rollup["sites"]),
                                "expected_start_date": str(proj.expected_start_date) if proj.expected_start_date else None,
                                "expected_end_date": str(proj.expected_end_date) if proj.expected_end_date else None,
                        },
                        "site_count": len(rollup["sites"]),
                        "sites": rollup["sites"],
                        "stage_coverage": rollup["stage_coverage"],
                        "department_lanes": rollup["department_lanes"],
                        "selected_department_lane": selected_lane,
                        "action_queue": rollup["action_queue"],
                        "team_members": team_members,
                        "project_assets": project_assets,
                },
        }


@frappe.whitelist()
def get_project_workflow_state(project=None):
        """Return the current workflow state, readiness, and history for a project."""
        _require_spine_read_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project, ignore_permissions=True)
        _sync_project_workflow_fields(doc)
        return {"success": True, "data": _serialize_workflow_state(doc)}


@frappe.whitelist()
def submit_project_stage_for_approval(project=None, remarks=None):
        """Submit the current project stage for approval once readiness checks pass."""
        _require_project_workspace_write_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project, ignore_permissions=True)
        _sync_project_workflow_fields(doc)
        workflow_state = _serialize_workflow_state(doc)

        if not workflow_state["actions"]["can_submit"]:
                frappe.throw("Current stage cannot be submitted by this user right now.")

        doc.current_stage_status = "PENDING_APPROVAL"
        doc.stage_submitted_by = frappe.session.user
        doc.stage_submitted_at = frappe.utils.now()
        _append_project_workflow_event(doc, "STAGE_SUBMITTED", doc.current_project_stage, remarks=remarks)
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="Project",
                        subject_name=project,
                        event_type=EventType.SUBMITTED,
                        linked_project=project,
                        from_status=doc.current_project_stage,
                        to_status="PENDING_APPROVAL",
                        current_status="PENDING_APPROVAL",
                        remarks=remarks,
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: submit_project_stage_for_approval")

        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Stage submitted for approval"}


@frappe.whitelist()
def approve_project_stage(project=None, remarks=None):
        """Approve the current stage and advance the project to the next stage."""
        _require_project_approver_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project, ignore_permissions=True)
        _sync_project_workflow_fields(doc)
        workflow_state = _serialize_workflow_state(doc)

        if not workflow_state["actions"]["can_approve"]:
                frappe.throw("Current stage cannot be approved by this user right now.")

        current_stage = doc.current_project_stage
        next_stage = get_next_workflow_stage(current_stage)
        if not next_stage:
                _sync_project_workflow_fields(doc, reset_submission=True)
                doc.current_stage_status = "COMPLETED"
                doc.status = "Completed"
                _append_project_workflow_event(doc, "PROJECT_CLOSED", current_stage, remarks=remarks)
        else:
                _append_project_workflow_event(doc, "STAGE_APPROVED", current_stage, remarks=remarks, next_stage=next_stage)
                doc.current_project_stage = next_stage
                _sync_project_workflow_fields(doc, reset_submission=True)
                if next_stage == "CLOSED":
                        doc.current_stage_status = "COMPLETED"
                        doc.status = "Completed"

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                _to_stage = next_stage if next_stage else "COMPLETED"
                record_and_log(
                        subject_doctype="Project",
                        subject_name=project,
                        event_type=EventType.APPROVED,
                        linked_project=project,
                        from_status=current_stage,
                        to_status=_to_stage,
                        current_status=_to_stage,
                        approved_by=frappe.session.user,
                        approved_on=now_datetime(),
                        remarks=remarks,
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: approve_project_stage")

        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Stage approved"}


@frappe.whitelist()
def reject_project_stage(project=None, remarks=None):
        """Reject the current project stage and return it to the owning department."""
        _require_project_approver_access()
        project = _require_param(project, "project")
        if not (remarks or "").strip():
                frappe.throw("A rejection reason is required. Please provide remarks.")
        doc = frappe.get_doc("Project", project, ignore_permissions=True)
        _sync_project_workflow_fields(doc)
        workflow_state = _serialize_workflow_state(doc)

        if not workflow_state["actions"]["can_reject"]:
                frappe.throw("Current stage cannot be rejected by this user right now.")

        current_stage = doc.current_project_stage
        doc.current_stage_status = "REJECTED"
        _append_project_workflow_event(doc, "STAGE_REJECTED", current_stage, remarks=remarks)
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="Project",
                        subject_name=project,
                        event_type=EventType.REJECTED,
                        linked_project=project,
                        from_status=current_stage,
                        to_status="REJECTED",
                        current_status="REJECTED",
                        remarks=remarks,
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: reject_project_stage")

        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Stage rejected"}


@frappe.whitelist()
def restart_project_stage(project=None, remarks=None):
        """Move a rejected project stage back into active working state."""
        _require_project_workspace_write_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project, ignore_permissions=True)
        _sync_project_workflow_fields(doc)
        workflow_state = _serialize_workflow_state(doc)

        if not workflow_state["actions"]["can_restart"]:
                frappe.throw("Current stage cannot be restarted by this user right now.")

        doc.current_stage_status = "IN_PROGRESS"
        doc.stage_submitted_by = None
        doc.stage_submitted_at = None
        _append_project_workflow_event(doc, "STAGE_RESTARTED", doc.current_project_stage, remarks=remarks)
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="Project",
                        subject_name=project,
                        event_type=EventType.REOPENED,
                        linked_project=project,
                        from_status="REJECTED",
                        to_status="IN_PROGRESS",
                        current_status="IN_PROGRESS",
                        remarks=remarks,
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: restart_project_stage")

        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Stage moved back to in-progress"}


@frappe.whitelist()
def override_project_stage(project=None, new_stage=None, remarks=None):
        """Manual workflow override for users with stage-override capability."""
        _require_project_workspace_write_access()
        project = _require_param(project, "project")
        new_stage = _require_param(new_stage, "new_stage")
        _require_capability("project.stage.override", project=project, required_mode="override")
        if new_stage not in WORKFLOW_STAGE_KEYS:
                frappe.throw(f"Invalid stage override: {new_stage}")
        if not (remarks or "").strip():
                frappe.throw("A reason is required for stage override. Please provide remarks.")

        doc = frappe.get_doc("Project", project, ignore_permissions=True)
        previous_stage = doc.current_project_stage or WORKFLOW_STAGE_KEYS[0]
        doc.current_project_stage = new_stage
        _sync_project_workflow_fields(doc, reset_submission=True)
        _append_project_workflow_event(
                doc,
                "STAGE_OVERRIDDEN",
                previous_stage,
                remarks=remarks,
                next_stage=new_stage,
                metadata={"previous_stage": previous_stage, "new_stage": new_stage},
        )
        if new_stage == "CLOSED":
                doc.current_stage_status = "COMPLETED"
                doc.status = "Completed"
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="Project",
                        subject_name=project,
                        event_type=EventType.OVERRIDDEN,
                        linked_project=project,
                        from_status=previous_stage,
                        to_status=new_stage,
                        current_status=new_stage,
                        remarks=remarks,
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: override_project_stage")

        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Project stage overridden"}


@frappe.whitelist()
def get_department_spine_view(department=None, project=None):
        """
        Department-filtered spine view.

        Shows only the stages that belong to the given department
        and the sites currently in those stages.
        """
        _require_project_workspace_access()
        department = _require_param(department, "department")
        dept_key = department.lower().replace(" ", "_")
        allowed_stages = DEPARTMENT_STAGE_MAP.get(dept_key, SPINE_STAGES)

        site_filters = {}
        if project:
                site_filters["linked_project"] = project

        all_sites = frappe.get_all(
                "GE Site",
                filters=site_filters,
                fields=[
                        "name", "site_code", "site_name", "status",
                        "linked_project", "current_site_stage",
                        "site_blocked", "blocker_reason",
                        "current_owner_role", "current_owner_user",
                        "site_progress_pct",
                ],
        )

        # Filter to sites in department's stages
        dept_sites = [s for s in all_sites if (s.current_site_stage or "SURVEY") in allowed_stages]

        # Coverage only for department stages
        coverage = {s: 0 for s in allowed_stages}
        for site in dept_sites:
                stage = site.current_site_stage or "SURVEY"
                if stage in coverage:
                        coverage[stage] += 1

        return {
                "success": True,
                "data": {
                        "department": department,
                        "allowed_stages": allowed_stages,
                        "total_sites": len(all_sites),
                        "department_sites": len(dept_sites),
                        "stage_coverage": coverage,
                        "blocked_sites": [
                                {
                                        "site": s.name,
                                        "site_code": s.site_code,
                                        "stage": s.current_site_stage,
                                        "reason": s.blocker_reason,
                                }
                                for s in dept_sites
                                if s.site_blocked
                        ],
                        "sites": [
                                {
                                        "site": s.name,
                                        "site_code": s.site_code,
                                        "site_name": s.site_name,
                                        "stage": s.current_site_stage,
                                        "progress_pct": s.site_progress_pct,
                                        "owner_role": s.current_owner_role,
                                        "owner_user": s.current_owner_user,
                                        "blocked": s.site_blocked,
                                }
                                for s in dept_sites
                        ],
                },
        }


# ╔═══════════════════════════════════════════════════════════════╗
# ║  PROJECT FAVORITES                                           ║
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def toggle_project_favorite(project=None):
	"""Toggle the current user's favorite status for a project. Returns is_favorite."""
	_require_spine_read_access()
	project = _require_param(project, "project")
	user = frappe.session.user
	existing = frappe.db.exists("GE Project Favorite", {"linked_project": project, "user": user})
	if existing:
		frappe.delete_doc("GE Project Favorite", existing, force=True)
		frappe.db.commit()
		return {"success": True, "data": {"is_favorite": False}, "message": "Removed from favorites"}
	doc = frappe.get_doc({"doctype": "GE Project Favorite", "linked_project": project, "user": user}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": {"is_favorite": True}, "message": "Added to favorites"}


@frappe.whitelist()
def get_project_favorites():
	"""Return list of project names the current user has favorited."""
	_require_spine_read_access()
	rows = frappe.get_all("GE Project Favorite", filters={"user": frappe.session.user}, fields=["linked_project"], limit_page_length=500)
	return {"success": True, "data": [r.linked_project for r in rows]}


# ╔═══════════════════════════════════════════════════════════════╗
# ║  PROJECT NOTES                                               ║
# ╚═══════════════════════════════════════════════════════════════╝

PROJECT_NOTE_FIELDS = [
	"name", "linked_project", "title", "content", "is_private",
	"owner", "creation", "modified",
]


@frappe.whitelist()
def get_project_notes(project=None):
	"""Return notes for a project. Private notes only visible to their owner."""
	_require_spine_read_access()
	project = _require_param(project, "project")
	user = frappe.session.user
	notes = frappe.get_all(
		"GE Project Note",
		filters={"linked_project": project},
		fields=PROJECT_NOTE_FIELDS,
		order_by="modified desc",
		limit_page_length=200,
	)
	# Filter private notes to only the owner
	visible = [n for n in notes if not n.get("is_private") or n.get("owner") == user]
	return {"success": True, "data": visible}


@frappe.whitelist()
def create_project_note(data):
	"""Create a project note."""
	_require_spine_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	values["doctype"] = "GE Project Note"
	_require_param(values.get("linked_project"), "linked_project")
	_require_param(values.get("title"), "title")
	doc = frappe.get_doc(values).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Note created"}


@frappe.whitelist()
def update_project_note(name, data):
	"""Update a project note. Only the owner can update."""
	_require_spine_write_access()
	doc = frappe.get_doc("GE Project Note", name)
	if doc.owner != frappe.session.user:
		frappe.throw("Only the note creator can edit this note", frappe.PermissionError)
	values = json.loads(data) if isinstance(data, str) else data
	for field in ("title", "content", "is_private"):
		if field in values:
			setattr(doc, field, values[field])
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Note updated"}


@frappe.whitelist()
def delete_project_note(name):
	"""Delete a project note. Only the owner can delete."""
	_require_spine_write_access()
	doc = frappe.get_doc("GE Project Note", name)
	if doc.owner != frappe.session.user:
		frappe.throw("Only the note creator can delete this note", frappe.PermissionError)
	frappe.delete_doc("GE Project Note", name, force=True)
	frappe.db.commit()
	return {"success": True, "message": "Note deleted"}


# ╔═══════════════════════════════════════════════════════════════╗
#   RISE-Ported: Project Tasks (list/kanban, CRUD, subtasks)
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def get_project_tasks(project=None, status=None, parent_task=None):
	"""List tasks for a project. Supports status/parent filter."""
	_require_spine_read_access()
	if not project:
		frappe.throw("project is required")
	filters = {"linked_project": project}
	if status:
		filters["status"] = status
	if parent_task is not None:
		filters["parent_task"] = parent_task if parent_task else ["in", ["", None]]
	tasks = frappe.get_all(
		"GE Project Task",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site", "title", "status",
			"priority", "assigned_to", "collaborators", "start_date",
			"deadline", "description", "parent_task", "milestone_id",
			"points", "labels", "sort_order", "owner", "creation", "modified"
		],
		order_by="sort_order asc, creation desc",
		ignore_permissions=True,
		limit_page_length=500,
	)
	return tasks


@frappe.whitelist()
def create_project_task(data):
	"""Create a new project task."""
	_require_spine_write_access()
	if isinstance(data, str):
		data = frappe.parse_json(data)
	if not data.get("linked_project") or not data.get("title"):
		frappe.throw("linked_project and title are required")
	doc = frappe.new_doc("GE Project Task")
	for field in ["linked_project", "linked_site", "title", "status", "priority",
	              "assigned_to", "collaborators", "start_date", "deadline",
	              "description", "parent_task", "milestone_id", "points", "labels", "sort_order"]:
		if field in data:
			doc.set(field, data[field])
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return doc.as_dict()


@frappe.whitelist()
def update_project_task(name, data):
	"""Update an existing project task."""
	_require_spine_write_access()
	if isinstance(data, str):
		data = frappe.parse_json(data)
	doc = frappe.get_doc("GE Project Task", name)
	for field in ["title", "status", "priority", "assigned_to", "collaborators",
	              "start_date", "deadline", "description", "parent_task",
	              "milestone_id", "points", "labels", "sort_order", "linked_site"]:
		if field in data:
			doc.set(field, data[field])
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return doc.as_dict()


@frappe.whitelist()
def delete_project_task(name):
	"""Delete a project task and its subtasks."""
	_require_spine_write_access()
	# delete subtasks first
	subtasks = frappe.get_all("GE Project Task", filters={"parent_task": name}, pluck="name", ignore_permissions=True)
	for st in subtasks:
		frappe.delete_doc("GE Project Task", st, force=True, ignore_permissions=True)
	frappe.delete_doc("GE Project Task", name, force=True, ignore_permissions=True)
	frappe.db.commit()
	return {"success": True}


@frappe.whitelist()
def reorder_project_tasks(task_orders):
	"""Bulk-update sort_order for drag-drop reorder."""
	_require_spine_write_access()
	if isinstance(task_orders, str):
		task_orders = frappe.parse_json(task_orders)
	for item in task_orders:
		frappe.db.set_value("GE Project Task", item["name"], "sort_order", item["sort_order"], update_modified=False)
	frappe.db.commit()
	return {"success": True}


@frappe.whitelist()
def update_task_status(name, status):
	"""Quick status update for kanban drag-drop."""
	_require_spine_write_access()
	if status not in ("To Do", "In Progress", "Review", "Done"):
		frappe.throw("Invalid status")
	frappe.db.set_value("GE Project Task", name, "status", status)
	frappe.db.commit()
	return {"success": True, "status": status}


@frappe.whitelist()
def get_task_summary(project=None):
	"""Return task counts by status for a project."""
	_require_spine_read_access()
	if not project:
		frappe.throw("project is required")
	rows = frappe.db.sql("""
		SELECT status, COUNT(*) as cnt, COALESCE(SUM(points),0) as pts
		FROM `tabGE Project Task`
		WHERE linked_project=%s
		GROUP BY status
	""", (project,), as_dict=True)
	summary = {"To Do": {"count": 0, "points": 0}, "In Progress": {"count": 0, "points": 0},
	           "Review": {"count": 0, "points": 0}, "Done": {"count": 0, "points": 0}, "total": 0, "total_points": 0}
	for r in rows:
		summary[r.status] = {"count": r.cnt, "points": int(r.pts)}
		summary["total"] += r.cnt
		summary["total_points"] += int(r.pts)
	return summary


# ╔═══════════════════════════════════════════════════════════════╗
#   RISE-Ported: Project Cloning
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def clone_project(source_project, new_project_name, copy_tasks=1, copy_milestones=1, copy_notes=1):
	"""Clone a project: optionally copy tasks, milestones, notes."""
	_require_spine_write_access()
	if not source_project or not new_project_name:
		frappe.throw("source_project and new_project_name are required")

	copy_tasks = int(copy_tasks or 0)
	copy_milestones = int(copy_milestones or 0)
	copy_notes = int(copy_notes or 0)

	# Verify source exists
	if not frappe.db.exists("Project", source_project):
		frappe.throw("Source project not found")
	if frappe.db.exists("Project", new_project_name):
		frappe.throw("A project with this name already exists")

	result = {"project": new_project_name, "tasks_copied": 0, "milestones_copied": 0, "notes_copied": 0}

	# Clone tasks with parent-child ID mapping (RISE pattern)
	if copy_tasks:
		old_tasks = frappe.get_all("GE Project Task",
			filters={"linked_project": source_project},
			fields=["*"], ignore_permissions=True, order_by="sort_order asc")
		task_id_map = {}
		for t in old_tasks:
			old_name = t.name
			new_task = frappe.new_doc("GE Project Task")
			for f in ["title", "status", "priority", "assigned_to", "collaborators",
			          "start_date", "deadline", "description", "milestone_id",
			          "points", "labels", "sort_order", "linked_site"]:
				new_task.set(f, t.get(f))
			new_task.linked_project = new_project_name
			new_task.parent_task = ""
			new_task.insert(ignore_permissions=True)
			task_id_map[old_name] = new_task.name
		# Fix parent_task references using ID map
		for t in old_tasks:
			if t.parent_task and t.parent_task in task_id_map:
				frappe.db.set_value("GE Project Task", task_id_map[t.name],
				                    "parent_task", task_id_map[t.parent_task], update_modified=False)
		result["tasks_copied"] = len(task_id_map)

	# Clone notes
	if copy_notes:
		old_notes = frappe.get_all("GE Project Note",
			filters={"linked_project": source_project},
			fields=["title", "content", "is_private"], ignore_permissions=True)
		for n in old_notes:
			new_note = frappe.new_doc("GE Project Note")
			new_note.linked_project = new_project_name
			new_note.title = n.title
			new_note.content = n.content
			new_note.is_private = n.is_private
			new_note.insert(ignore_permissions=True)
		result["notes_copied"] = len(old_notes)

	frappe.db.commit()
	return result


# ╔═══════════════════════════════════════════════════════════════╗
#   RISE-Ported: Timesheet Aggregation
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def get_project_timesheet_summary(project=None):
	"""Aggregate time data from DPR, manpower, and overtime entries for a project."""
	_require_spine_read_access()
	if not project:
		frappe.throw("project is required")

	summary = {
		"dpr_count": 0,
		"dpr_rows": [],
		"manpower_total_persons": 0,
		"manpower_rows": [],
		"overtime_total_hours": 0,
		"overtime_rows": [],
	}

	# DPR entries
	if frappe.db.exists("DocType", "GE DPR"):
		dprs = frappe.get_all("GE DPR",
			filters={"linked_project": project},
			fields=["name", "linked_site", "report_date", "summary", "manpower_on_site", "equipment_count", "owner", "creation"],
			order_by="report_date desc", limit_page_length=50, ignore_permissions=True)
		summary["dpr_count"] = len(dprs)
		summary["dpr_rows"] = dprs

	# Manpower logs
	if frappe.db.exists("DocType", "GE Manpower Log"):
		manpower = frappe.get_all("GE Manpower Log",
			filters={"linked_project": project},
			fields=["name", "linked_site", "log_date", "num_persons", "trade", "remarks", "owner", "creation"],
			order_by="log_date desc", limit_page_length=50, ignore_permissions=True)
		summary["manpower_rows"] = manpower
		summary["manpower_total_persons"] = sum(int(m.get("num_persons") or 0) for m in manpower)

	# Overtime entries
	if frappe.db.exists("DocType", "GE Overtime Entry"):
		overtime = frappe.get_all("GE Overtime Entry",
			filters={"linked_project": project},
			fields=["name", "linked_site", "entry_date", "hours", "employee_name", "reason", "status", "owner", "creation"],
			order_by="entry_date desc", limit_page_length=50, ignore_permissions=True)
		summary["overtime_rows"] = overtime
		summary["overtime_total_hours"] = sum(float(o.get("hours") or 0) for o in overtime)

	return summary


@frappe.whitelist()
def get_project_activity(project=None, limit=50):
        """
        Aggregate activity feed for a project from Version (audit trail),
        Comment, and linked site changes.
        """
        _require_spine_read_access()
        project = _require_param(project, "project")
        limit = min(int(limit or 50), 200)

        activities = []

        # 1. Version log entries for the Project document itself
        versions = frappe.get_all(
                "Version",
                filters={"ref_doctype": "Project", "docname": project},
                fields=["name", "creation", "owner", "data"],
                order_by="creation desc",
                limit_page_length=limit,
        )
        import json as _json
        for v in versions:
                try:
                        vdata = _json.loads(v.data) if isinstance(v.data, str) else (v.data or {})
                except Exception:
                        vdata = {}
                changed_fields = [c.get("field", "?") for c in (vdata.get("changed", []) or [])]
                activities.append({
                        "type": "version",
                        "ref_doctype": "Project",
                        "ref_name": project,
                        "actor": v.owner,
                        "timestamp": str(v.creation),
                        "summary": f"Updated {', '.join(changed_fields[:5]) or 'record'}" + (" ..." if len(changed_fields) > 5 else ""),
                        "detail": changed_fields,
                })

        # 2. Comments on the Project itself
        comments = frappe.get_all(
                "Comment",
                filters={"reference_doctype": "Project", "reference_name": project,
                          "comment_type": ["in", ["Comment", "Info", "Edit"]]},
                fields=["name", "creation", "comment_by", "comment_type", "content"],
                order_by="creation desc",
                limit_page_length=limit,
        )
        for c in comments:
                activities.append({
                        "type": "comment",
                        "ref_doctype": "Project",
                        "ref_name": project,
                        "actor": c.comment_by,
                        "timestamp": str(c.creation),
                        "summary": (c.content or "")[:200],
                        "comment_type": c.comment_type,
                })

        # 3. Site-level comments (stage changes, etc.)
        sites = frappe.get_all("GE Site", filters={"linked_project": project}, pluck="name")
        if sites:
                site_comments = frappe.get_all(
                        "Comment",
                        filters={"reference_doctype": "GE Site", "reference_name": ["in", sites],
                                  "comment_type": ["in", ["Comment", "Info", "Edit"]]},
                        fields=["name", "creation", "comment_by", "comment_type", "content",
                                "reference_name"],
                        order_by="creation desc",
                        limit_page_length=limit,
                )
                for c in site_comments:
                        activities.append({
                                "type": "site_comment",
                                "ref_doctype": "GE Site",
                                "ref_name": c.reference_name,
                                "actor": c.comment_by,
                                "timestamp": str(c.creation),
                                "summary": (c.content or "")[:200],
                                "comment_type": c.comment_type,
                        })

        # 4. Workflow history from project doc
        try:
                proj_doc = frappe.get_doc("Project", project, ignore_permissions=True)
                wf_history = _json.loads(proj_doc.get("workflow_history") or "[]") if hasattr(proj_doc, "workflow_history") else []
                for entry in (wf_history or []):
                        activities.append({
                                "type": "workflow",
                                "ref_doctype": "Project",
                                "ref_name": project,
                                "actor": entry.get("actor", "System"),
                                "timestamp": entry.get("timestamp", ""),
                                "summary": f"{entry.get('action', '?')} stage {entry.get('stage', '?')}" + (f" → {entry.get('next_stage', '')}" if entry.get("next_stage") else ""),
                                "stage": entry.get("stage"),
                                "action": entry.get("action"),
                        })
        except Exception:
                frappe.log_error(
                        frappe.get_traceback(),
                        f"project_api.get_project_activity workflow_history failed for {project}",
                )

        # 5. Project-scoped alerts (notifications, mentions, approval events)
        try:
                proj_alerts = frappe.get_all(
                        "GE Alert",
                        filters={"linked_project": project},
                        fields=["name", "creation", "actor", "event_type", "summary", "detail",
                                "reference_doctype", "reference_name", "route_path"],
                        order_by="creation desc",
                        limit_page_length=min(limit, 20),
                )
                for pa in proj_alerts:
                        activities.append({
                                "type": "alert",
                                "ref_doctype": pa.reference_doctype or "GE Alert",
                                "ref_name": pa.reference_name or pa.name,
                                "actor": pa.actor or "System",
                                "timestamp": str(pa.creation),
                                "summary": pa.summary or pa.event_type,
                                "event_type": pa.event_type,
                                "route": pa.route_path,
                        })
        except Exception:
                frappe.log_error(
                        frappe.get_traceback(),
                        f"project_api.get_project_activity alerts failed for {project}",
                )

        # 6. Accountability events for this project
        try:
                acct_events = frappe.get_all(
                        "GE Accountability Event",
                        filters={"linked_project": project},
                        fields=["name", "creation", "submitted_by", "event_type",
                                "subject_doctype", "subject_name", "from_status", "to_status",
                                "source_route"],
                        order_by="creation desc",
                        limit_page_length=min(limit, 20),
                )
                for ae in acct_events:
                        activities.append({
                                "type": "accountability",
                                "ref_doctype": ae.subject_doctype or "GE Accountability Event",
                                "ref_name": ae.subject_name or ae.name,
                                "actor": ae.submitted_by or "System",
                                "timestamp": str(ae.creation),
                                "summary": f"{ae.event_type}: {ae.subject_doctype} {ae.subject_name}" + (f" ({ae.from_status} → {ae.to_status})" if ae.from_status and ae.to_status else ""),
                                "event_type": ae.event_type,
                                "route": ae.source_route,
                        })
        except Exception:
                frappe.log_error(
                        frappe.get_traceback(),
                        f"project_api.get_project_activity accountability failed for {project}",
                )

        # Sort all activities by timestamp descending, then limit
        activities.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
        activities = activities[:limit]

        return {"success": True, "data": activities}


@frappe.whitelist()
def get_site_spine_detail(site=None):
        """Full spine detail for a single site."""
        _require_spine_read_access()
        site = _require_param(site, "site")
        doc = frappe.get_doc("GE Site", site)
        data = doc.as_dict()

        # Enrich with milestone progress
        milestones = frappe.get_all(
                "GE Milestone",
                filters={"linked_site": site},
                fields=["name", "milestone_name", "status", "progress_pct", "planned_end_date", "actual_end_date"],
                order_by="creation asc",
        )

        # Enrich with recent DPRs
        dprs = frappe.get_all(
                "GE DPR",
                filters={"linked_site": site},
                fields=["name", "report_date", "manpower_on_site"],
                order_by="report_date desc",
                limit_page_length=10,
        )

        return {
                "success": True,
                "data": {
                        "site": data,
                        "milestones": milestones,
                        "recent_dprs": dprs,
                },
        }


@frappe.whitelist()
def advance_site_stage(site=None, new_stage=None, notes=None):
        """Advance a site to the next spine stage."""
        _require_spine_write_access()
        site = _require_param(site, "site")
        new_stage = _require_param(new_stage, "new_stage")

        if new_stage not in SPINE_STAGES:
                frappe.throw(f"Invalid stage: {new_stage}. Must be one of: {', '.join(SPINE_STAGES)}")

        doc = frappe.get_doc("GE Site", site)
        old_stage = doc.current_site_stage or "SURVEY"

        old_idx = SPINE_STAGES.index(old_stage) if old_stage in SPINE_STAGES else 0
        new_idx = SPINE_STAGES.index(new_stage)
        if new_idx < old_idx:
                frappe.throw(f"Cannot move site backward from {old_stage} to {new_stage}")

        doc.current_site_stage = new_stage

        # Auto-compute site_progress_pct based on stage position
        max_idx = len(SPINE_STAGES) - 1
        doc.site_progress_pct = round((new_idx / max_idx) * 100, 2) if max_idx else 100

        doc.save(ignore_permissions=True)

        # Log the transition as a comment
        frappe.get_doc({
                "doctype": "Comment",
                "comment_type": "Info",
                "reference_doctype": "GE Site",
                "reference_name": site,
                "content": f"Stage advanced: {old_stage} → {new_stage}" + (f" | {notes}" if notes else ""),
        }).insert(ignore_permissions=True)

        # Recompute project-level progress
        _refresh_project_spine(doc.linked_project)

        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="GE Site",
                        subject_name=site,
                        event_type=EventType.SUBMITTED,
                        linked_project=doc.linked_project,
                        linked_site=site,
                        linked_stage=new_stage,
                        from_status=old_stage,
                        to_status=new_stage,
                        current_status=new_stage,
                        current_owner_user=frappe.session.user,
                        current_owner_role=_detect_primary_role(),
                        remarks=notes or "",
                        source_route=f"/projects/{doc.linked_project}/sites/{site}",
                        reference_doctype="GE Site",
                        reference_name=site,
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: advance_site_stage")

        return {
                "success": True,
                "data": doc.as_dict(),
                "message": f"Site stage advanced to {new_stage}",
        }


@frappe.whitelist()
def toggle_site_blocked(site=None, blocked=None, reason=None):
        """Block or unblock a site."""
        _require_spine_write_access()
        site = _require_param(site, "site")
        blocked = cint(blocked)

        # Reason is mandatory when blocking (BLOCKED event requires it by ledger rules)
        if blocked and not (reason or "").strip():
                frappe.throw("A blocking reason is required when blocking a site.")

        doc = frappe.get_doc("GE Site", site)
        doc.site_blocked = blocked
        doc.blocker_reason = reason if blocked else ""
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                event_type = EventType.BLOCKED if blocked else EventType.UNBLOCKED
                record_and_log(
                        subject_doctype="GE Site",
                        subject_name=site,
                        event_type=event_type,
                        linked_project=doc.linked_project,
                        linked_site=site,
                        linked_stage=doc.current_site_stage,
                        is_blocked=bool(blocked),
                        blocking_reason=reason if blocked else None,
                        current_owner_user=frappe.session.user,
                        current_owner_role=_detect_primary_role(),
                        remarks=reason or "",
                        source_route=f"/projects/{doc.linked_project}/sites/{site}",
                        reference_doctype="GE Site",
                        reference_name=site,
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: toggle_site_blocked")

        return {
                "success": True,
                "data": doc.as_dict(),
                "message": f"Site {'blocked' if blocked else 'unblocked'}",
        }


@frappe.whitelist()
def refresh_project_spine(project=None):
        """Recompute project spine stats (total_sites, spine_progress_pct, current_project_stage)."""
        _require_spine_write_access()
        project = _require_param(project, "project")
        _refresh_project_spine(project)
        frappe.db.commit()
        proj = frappe.get_doc("Project", project, ignore_permissions=True)
        return {
                "success": True,
                "data": {
                        "total_sites": getattr(proj, "total_sites", 0),
                        "current_project_stage": getattr(proj, "current_project_stage", None),
                        "spine_progress_pct": getattr(proj, "spine_progress_pct", 0),
                        "spine_blocked": getattr(proj, "spine_blocked", 0),
                },
                "message": "Project spine refreshed",
        }


# ── Project Closeout APIs ────────────────────────────────────────────────────

# Business rules:
#  - I&C Only  →  Go Live Certificate  →  Letter of Completion
#  - I&C + O&M →  Go Live Certificate  →  Exit Management KT  →  Letter of Handover

CLOSEOUT_IC_ONLY_SEQUENCE = ["Go Live Certificate", "Letter of Completion"]
CLOSEOUT_IC_OM_SEQUENCE = ["Go Live Certificate", "Exit Management KT", "Letter of Handover"]


def _get_closeout_sequence(contract_scope):
        if contract_scope == "I&C + O&M":
                return CLOSEOUT_IC_OM_SEQUENCE
        return CLOSEOUT_IC_ONLY_SEQUENCE


@frappe.whitelist()
def get_project_closeout_items(project=None):
        """List all closeout certificates for a project."""
        _require_spine_read_access()
        project = _require_param(project, "project")
        rows = frappe.get_all(
                "GE Project Closeout",
                filters={"project": project},
                fields=[
                        "name", "closeout_type", "project", "linked_tender",
                        "contract_scope", "status", "issued_by", "issued_on",
                        "certificate_date", "remarks",
                        "kt_handover_plan", "kt_completed_on", "kt_completed_by",
                        "revoked_by", "revoked_on", "revocation_reason",
                        "creation", "modified",
                ],
                order_by="creation asc",
        )
        return {"success": True, "data": rows}


@frappe.whitelist()
def get_project_closeout_eligibility(project=None):
        """Return which closeout types can be issued now, which are done, and which are blocked."""
        _require_spine_read_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project, ignore_permissions=True)
        tender_name = getattr(doc, "linked_tender", None)
        contract_scope = _get_tender_contract_scope(tender_name)
        if not contract_scope:
                return {
                        "success": True,
                        "data": {
                                "contract_scope": None,
                                "sequence": [],
                                "issued": [],
                                "next_eligible": None,
                                "all_complete": False,
                                "message": "Contract scope not set on linked tender. Set it before issuing closeout certificates.",
                        },
                }

        sequence = _get_closeout_sequence(contract_scope)
        existing = frappe.get_all(
                "GE Project Closeout",
                filters={"project": project, "status": "Issued"},
                fields=["closeout_type"],
        )
        issued_types = {r["closeout_type"] for r in existing}

        next_eligible = None
        for step in sequence:
                if step not in issued_types:
                        next_eligible = step
                        break

        return {
                "success": True,
                "data": {
                        "contract_scope": contract_scope,
                        "sequence": sequence,
                        "issued": list(issued_types),
                        "next_eligible": next_eligible,
                        "all_complete": next_eligible is None,
                },
        }


@frappe.whitelist()
def issue_closeout_certificate(project=None, closeout_type=None, certificate_date=None, remarks=None, kt_handover_plan=None):
        """Issue a closeout certificate for a project following strict sequence rules."""
        _require_roles(ROLE_PROJECT_HEAD, ROLE_DIRECTOR)
        project = _require_param(project, "project")
        closeout_type = _require_param(closeout_type, "closeout_type")
        doc = frappe.get_doc("Project", project, ignore_permissions=True)
        tender_name = getattr(doc, "linked_tender", None)
        contract_scope = _get_tender_contract_scope(tender_name)
        if not contract_scope:
                frappe.throw("Contract scope is not set on the linked tender. Cannot issue closeout certificates.")

        sequence = _get_closeout_sequence(contract_scope)
        if closeout_type not in sequence:
                frappe.throw(f"'{closeout_type}' is not valid for contract scope '{contract_scope}'")

        existing = frappe.get_all(
                "GE Project Closeout",
                filters={"project": project, "status": "Issued"},
                fields=["closeout_type"],
        )
        issued_types = {r["closeout_type"] for r in existing}

        if closeout_type in issued_types:
                frappe.throw(f"'{closeout_type}' has already been issued for this project")

        for step in sequence:
                if step == closeout_type:
                        break
                if step not in issued_types:
                        frappe.throw(f"Cannot issue '{closeout_type}' — '{step}' must be issued first")

        closeout_doc = frappe.get_doc({
                "doctype": "GE Project Closeout",
                "closeout_type": closeout_type,
                "project": project,
                "linked_tender": tender_name,
                "contract_scope": contract_scope,
                "status": "Issued",
                "issued_by": frappe.session.user,
                "issued_on": now_datetime(),
                "certificate_date": certificate_date or frappe.utils.today(),
                "remarks": cstr(remarks).strip() or None,
                "kt_handover_plan": cstr(kt_handover_plan).strip() or None,
        })
        closeout_doc.insert()
        frappe.db.commit()

        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="GE Project Closeout",
                        subject_name=closeout_doc.name,
                        event_type=EventType.APPROVED,
                        linked_project=project,
                        from_status="Draft",
                        to_status="Issued",
                        current_status="Issued",
                        approved_by=frappe.session.user,
                        approved_on=now_datetime(),
                        remarks=f"{closeout_type} issued",
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: issue_closeout_certificate")

        return {"success": True, "data": closeout_doc.as_dict(), "message": f"{closeout_type} issued successfully"}


@frappe.whitelist()
def revoke_closeout_certificate(name=None, reason=None):
        """Revoke a previously issued closeout certificate."""
        _require_roles(ROLE_PROJECT_HEAD, ROLE_DIRECTOR)
        name = _require_param(name, "name")
        if not (reason or "").strip():
                frappe.throw("A revocation reason is required")
        closeout_doc = frappe.get_doc("GE Project Closeout", name)
        if closeout_doc.status != "Issued":
                frappe.throw("Only issued certificates can be revoked")

        later_issued = frappe.get_all(
                "GE Project Closeout",
                filters={"project": closeout_doc.project, "status": "Issued", "name": ["!=", name]},
                fields=["closeout_type", "creation"],
        )
        sequence = _get_closeout_sequence(closeout_doc.contract_scope)
        current_idx = sequence.index(closeout_doc.closeout_type) if closeout_doc.closeout_type in sequence else -1
        for row in later_issued:
                row_idx = sequence.index(row["closeout_type"]) if row["closeout_type"] in sequence else -1
                if row_idx > current_idx:
                        frappe.throw(f"Cannot revoke '{closeout_doc.closeout_type}' — later certificate '{row['closeout_type']}' is still issued")

        closeout_doc.status = "Revoked"
        closeout_doc.revoked_by = frappe.session.user
        closeout_doc.revoked_on = now_datetime()
        closeout_doc.revocation_reason = cstr(reason).strip()
        closeout_doc.save()
        frappe.db.commit()
        return {"success": True, "data": closeout_doc.as_dict(), "message": f"{closeout_doc.closeout_type} revoked"}


@frappe.whitelist()
def complete_exit_management_kt(name=None, kt_completed_on=None, remarks=None):
        """Mark an Exit Management KT closeout as completed."""
        _require_roles(ROLE_PROJECT_HEAD, ROLE_DIRECTOR, ROLE_PROJECT_MANAGER)
        name = _require_param(name, "name")
        closeout_doc = frappe.get_doc("GE Project Closeout", name)
        if closeout_doc.closeout_type != "Exit Management KT":
                frappe.throw("This action is only valid for Exit Management KT certificates")
        if closeout_doc.status != "Issued":
                frappe.throw("Certificate must be in Issued state")
        closeout_doc.kt_completed_on = kt_completed_on or frappe.utils.today()
        closeout_doc.kt_completed_by = frappe.session.user
        if remarks:
                closeout_doc.remarks = (closeout_doc.remarks or "") + "\n" + cstr(remarks).strip()
        closeout_doc.save()
        frappe.db.commit()
        return {"success": True, "data": closeout_doc.as_dict(), "message": "Exit Management KT marked as completed"}
