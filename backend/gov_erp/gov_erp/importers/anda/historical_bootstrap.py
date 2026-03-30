"""
Historical Contract Bootstrap

High-level import flow for loading a complete historical government contract
into the ERP. Orchestrates the creation of:
  1. Tender (with lifecycle dates)
  2. Project (from tender conversion, using historical dates)
  3. BOQ + items (with survey gate bypass)
  4. Milestones
  5. Staffing requirements
  6. Guarantee instruments (EMD/PBG/Security Deposits)

Usage:
    from gov_erp.importers.anda.historical_bootstrap import bootstrap_contract

    result = bootstrap_contract({
        "tender_number": "ANDA/2023/001",
        "title": "Mumbai CCTV Phase III",
        "client": "Mumbai Municipal Corporation",
        ...
    }, mode="dry_run")
"""

import frappe
from frappe.utils import cstr, today, now_datetime, getdate
from gov_erp.importers.anda.base import normalize_date


class BootstrapResult:
    """Tracks outcomes of each bootstrap step."""

    def __init__(self, mode):
        self.mode = mode
        self.started_at = now_datetime()
        self.finished_at = None
        self.steps = []
        self.errors = []
        self.created = {}  # doctype → [names]

    def add_step(self, step_name, status, detail="", doc_name=""):
        entry = {
            "step": step_name,
            "status": status,
            "detail": detail,
            "doc_name": doc_name,
        }
        self.steps.append(entry)
        if doc_name:
            doctype = step_name.split(":")[0] if ":" in step_name else step_name
            self.created.setdefault(doctype, []).append(doc_name)

    def add_error(self, step_name, error):
        self.errors.append({"step": step_name, "error": str(error)})
        self.steps.append({"step": step_name, "status": "error", "detail": str(error)})

    def finalize(self):
        self.finished_at = now_datetime()

    def as_dict(self):
        return {
            "mode": self.mode,
            "started_at": str(self.started_at),
            "finished_at": str(self.finished_at) if self.finished_at else None,
            "steps": self.steps,
            "errors": self.errors,
            "created": self.created,
        }

    def summary(self):
        ok = sum(1 for s in self.steps if s["status"] == "ok")
        skip = sum(1 for s in self.steps if s["status"] == "skipped")
        err = len(self.errors)
        return f"Bootstrap ({self.mode}): {ok} ok, {skip} skipped, {err} errors"


def bootstrap_contract(payload, mode="dry_run"):
    """
    Bootstrap a full historical contract.

    Args:
        payload: dict with keys:
            # Required
            tender_number: str
            title: str
            # Tender lifecycle (all optional)
            client, organization, estimated_value, submission_date,
            loa_date, work_order_date, work_order_no, agreement_date,
            awarded_value, go_live_date, om_start_date,
            sla_holiday_from, sla_holiday_to,
            implementation_completion_date, physical_completion_date,
            # Project dates
            project_start_date, project_end_date,
            # Child records (lists of dicts)
            boq_items: [...],
            milestones: [...],
            staffing_requirements: [...],
            instruments: [...],
        mode: "dry_run" | "commit"

    Returns:
        BootstrapResult
    """
    result = BootstrapResult(mode)
    is_commit = mode == "commit"

    tender_number = cstr(payload.get("tender_number", "")).strip()
    title = cstr(payload.get("title", "")).strip()

    if not tender_number:
        result.add_error("validation", "tender_number is required")
        result.finalize()
        return result
    if not title:
        result.add_error("validation", "title is required")
        result.finalize()
        return result

    tender_name = None
    project_name = None

    # ── Step 1: Create or find Tender ──────────────────────

    try:
        existing_tender = frappe.db.get_value(
            "GE Tender", {"tender_number": tender_number}, "name"
        ) if is_commit else None

        if existing_tender:
            tender_name = existing_tender
            result.add_step("Tender", "skipped", f"Already exists: {existing_tender}", existing_tender)
        else:
            tender_data = {
                "doctype": "GE Tender",
                "tender_number": tender_number,
                "title": title,
                "status": "WON",
            }
            # Copy lifecycle fields
            lifecycle_fields = [
                "client", "organization", "estimated_value", "submission_date",
                "loa_date", "work_order_date", "work_order_no", "agreement_date",
                "awarded_value", "go_live_date", "om_start_date",
                "sla_holiday_from", "sla_holiday_to",
                "implementation_completion_date", "physical_completion_date",
            ]
            for field in lifecycle_fields:
                val = payload.get(field)
                if val is not None:
                    # Normalize date fields
                    if field.endswith("_date") or field.endswith("_from") or field.endswith("_to"):
                        val = normalize_date(val) or val
                    tender_data[field] = val

            if is_commit:
                doc = frappe.get_doc(tender_data)
                doc.flags.ignore_validate = True
                doc.flags.ignore_mandatory = True
                doc.insert(ignore_permissions=True)
                tender_name = doc.name
                frappe.db.commit()
                result.add_step("Tender", "ok", "Created", tender_name)
            else:
                result.add_step("Tender", "ok", f"Would create tender: {tender_number}")
    except Exception as e:
        result.add_error("Tender", e)
        result.finalize()
        return result  # Can't continue without tender

    # ── Step 2: Convert Tender to Project ──────────────────

    try:
        project_start = normalize_date(payload.get("project_start_date")) or \
                        normalize_date(payload.get("loa_date")) or \
                        normalize_date(payload.get("agreement_date")) or \
                        normalize_date(payload.get("work_order_date")) or \
                        today()
        project_end = normalize_date(payload.get("project_end_date"))

        if is_commit and tender_name:
            # Check if project already exists for this tender
            existing_project = frappe.db.get_value(
                "Project", {"linked_tender": tender_name}, "name"
            )
            if existing_project:
                project_name = existing_project
                result.add_step("Project", "skipped", f"Already exists: {existing_project}", existing_project)
            else:
                tender_doc = frappe.get_doc("GE Tender", tender_name)
                project_name = tender_doc._convert_to_project(
                    historical_start_date=project_start,
                    historical_end_date=project_end,
                )
                frappe.db.commit()
                result.add_step("Project", "ok", "Created from tender", project_name)
        else:
            result.add_step("Project", "ok", f"Would create project from tender (start={project_start})")
    except Exception as e:
        result.add_error("Project", e)
        # Continue — some steps can still run

    # ── Step 3: Create BOQ with items ──────────────────────

    boq_items = payload.get("boq_items", [])
    if boq_items:
        try:
            if is_commit:
                boq_doc = frappe.get_doc({
                    "doctype": "GE BOQ",
                    "linked_tender": tender_name,
                    "linked_project": project_name,
                    "status": "APPROVED",
                    "bypass_survey_gate": 1,
                    "items": [],
                })
                for raw_item in boq_items:
                    boq_doc.append("items", {
                        "description": cstr(raw_item.get("description", "")).strip() or "Imported item",
                        "qty": float(raw_item.get("qty", 1)),
                        "unit": cstr(raw_item.get("unit", "Nos")),
                        "rate": float(raw_item.get("rate", 0)),
                        "amount": float(raw_item.get("amount", 0)),
                        "make": cstr(raw_item.get("make", "")),
                        "model": cstr(raw_item.get("model", "")),
                        "boq_code": cstr(raw_item.get("boq_code", "")),
                        "source_group": cstr(raw_item.get("source_group", "")),
                        "module_name": cstr(raw_item.get("module_name", "")),
                        "line_type": cstr(raw_item.get("line_type", "")),
                        "source_sequence": int(raw_item.get("source_sequence", 0)),
                        "is_om_item": int(raw_item.get("is_om_item", 0)),
                        "is_manpower_item": int(raw_item.get("is_manpower_item", 0)),
                        "sor_rate": float(raw_item.get("sor_rate", 0)),
                        "quoted_rate": float(raw_item.get("quoted_rate", 0)),
                        "site_name": cstr(raw_item.get("site_name", "")),
                    })
                boq_doc.flags.ignore_validate = True
                boq_doc.flags.bypass_survey_gate = True
                boq_doc.insert(ignore_permissions=True)
                frappe.db.commit()
                result.add_step("BOQ", "ok", f"{len(boq_items)} items", boq_doc.name)
            else:
                result.add_step("BOQ", "ok", f"Would create BOQ with {len(boq_items)} items")
        except Exception as e:
            result.add_error("BOQ", e)
    else:
        result.add_step("BOQ", "skipped", "No boq_items in payload")

    # ── Step 4: Create Milestones ──────────────────────────

    milestones = payload.get("milestones", [])
    if milestones:
        created_count = 0
        for ms in milestones:
            try:
                ms_title = cstr(ms.get("milestone_name") or ms.get("title") or "").strip()
                if not ms_title:
                    continue
                if is_commit and project_name:
                    doc = frappe.get_doc({
                        "doctype": "GE Milestone",
                        "linked_project": project_name,
                        "milestone_name": ms_title,
                        "status": cstr(ms.get("status", "PLANNED")),
                        "planned_start_date": normalize_date(ms.get("planned_start_date")),
                        "planned_end_date": normalize_date(ms.get("planned_end_date")),
                        "actual_start_date": normalize_date(ms.get("actual_start_date")),
                        "actual_end_date": normalize_date(ms.get("actual_end_date")),
                        "linked_site": cstr(ms.get("linked_site", "")),
                        "assigned_team": cstr(ms.get("assigned_team", "")),
                        "remarks": cstr(ms.get("remarks", "")),
                    })
                    doc.flags.ignore_validate = True
                    doc.insert(ignore_permissions=True)
                    created_count += 1
                else:
                    created_count += 1
            except Exception as e:
                result.add_error(f"Milestone:{ms_title}", e)

        if created_count:
            if is_commit:
                frappe.db.commit()
            result.add_step("Milestones", "ok", f"{created_count}/{len(milestones)} milestones")
        else:
            result.add_step("Milestones", "skipped", "No valid milestones")
    else:
        result.add_step("Milestones", "skipped", "No milestones in payload")

    # ── Step 5: Create Staffing Requirements ───────────────

    staffing = payload.get("staffing_requirements", [])
    if staffing:
        created_count = 0
        for sr in staffing:
            try:
                position = cstr(sr.get("position", "")).strip()
                if not position:
                    continue
                if is_commit and project_name:
                    doc = frappe.get_doc({
                        "doctype": "GE Project Staffing Requirement",
                        "linked_project": project_name,
                        "linked_tender": tender_name,
                        "position": position,
                        "required_count": int(sr.get("required_count", 1)),
                        "deployment_phase": cstr(sr.get("deployment_phase", "")),
                        "deployment_type": cstr(sr.get("deployment_type", "")),
                        "shift_pattern": cstr(sr.get("shift_pattern", "")),
                        "from_date": normalize_date(sr.get("from_date")),
                        "to_date": normalize_date(sr.get("to_date")),
                        "contractual_clause": cstr(sr.get("contractual_clause", "")),
                        "penalty_for_shortfall": cstr(sr.get("penalty_for_shortfall", "")),
                    })
                    doc.insert(ignore_permissions=True)
                    created_count += 1
                else:
                    created_count += 1
            except Exception as e:
                result.add_error(f"Staffing:{position}", e)

        if created_count:
            if is_commit:
                frappe.db.commit()
            result.add_step("Staffing Requirements", "ok", f"{created_count}/{len(staffing)} requirements")
        else:
            result.add_step("Staffing Requirements", "skipped", "No valid staffing entries")
    else:
        result.add_step("Staffing Requirements", "skipped", "No staffing_requirements in payload")

    # ── Step 6: Create Instruments (EMD/PBG/etc.) ──────────

    instruments = payload.get("instruments", [])
    if instruments:
        created_count = 0
        for inst in instruments:
            try:
                itype = cstr(inst.get("instrument_type", "EMD")).strip()
                if is_commit:
                    doc = frappe.get_doc({
                        "doctype": "GE EMD PBG Instrument",
                        "instrument_type": itype,
                        "linked_tender": tender_name,
                        "linked_project": project_name,
                        "amount": float(inst.get("amount", 0)),
                        "instrument_number": cstr(inst.get("instrument_number", "")),
                        "bank_name": cstr(inst.get("bank_name", "")),
                        "issue_date": normalize_date(inst.get("issue_date")),
                        "expiry_date": normalize_date(inst.get("expiry_date")),
                        "status": cstr(inst.get("status", "Pending")),
                        "linked_agreement_no": cstr(inst.get("linked_agreement_no", "")),
                        "beneficiary_name": cstr(inst.get("beneficiary_name", "")),
                        "release_condition": cstr(inst.get("release_condition", "")),
                        "remarks": cstr(inst.get("remarks", "")),
                    })
                    doc.insert(ignore_permissions=True)
                    created_count += 1
                else:
                    created_count += 1
            except Exception as e:
                result.add_error(f"Instrument:{itype}", e)

        if created_count:
            if is_commit:
                frappe.db.commit()
            result.add_step("Instruments", "ok", f"{created_count}/{len(instruments)} instruments")
        else:
            result.add_step("Instruments", "skipped", "No valid instruments")
    else:
        result.add_step("Instruments", "skipped", "No instruments in payload")

    result.finalize()
    return result
