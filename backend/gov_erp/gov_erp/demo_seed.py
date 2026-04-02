import json
import os
from datetime import timedelta

import frappe
from frappe.utils import add_days, get_datetime, now_datetime, today
from frappe.utils.file_manager import save_file

from gov_erp.gov_erp.doctype.ge_cost_sheet.ge_cost_sheet import map_boq_items_to_cost_sheet_items


SITE_NAME = os.environ.get("FRAPPE_SITE", "dev.localhost")
SITES_DIR = "/workspace/development/frappe-bench/sites"
DEMO_MARKER = "DEMO-20260316"
PRIMARY_PROJECT = "PROJ-0001"
PRIMARY_TENDER = "TEND-2026-001"

USERS = {
    "director": "director@technosys.local",
    "project_head": "project.head@technosys.local",
    "project_manager": "project.manager@technosys.local",
    "engineering_head": "eng.head@technosys.local",
    "engineer": "engineer@technosys.local",
    "purchase": "purchase@technosys.local",
    "procurement_manager": "proc.manager@technosys.local",
    "accounts": "accounts@technosys.local",
    "field_technician": "field.tech@technosys.local",
    "om_operator": "om.operator@technosys.local",
    "rma_manager": "rma.manager@technosys.local",
}

REALISTIC_ITEMS = [
    {
        "item_code": "DEMO-ANPR-CAM-001",
        "item_name": "ANPR Camera 8MP",
        "item_group": "Products",
        "stock_uom": "Nos",
        "description": "Automatic number plate recognition camera for city surveillance junctions.",
        "standard_rate": 125000,
    },
    {
        "item_code": "DEMO-PTZ-CAM-001",
        "item_name": "PTZ Camera 4MP",
        "item_group": "Products",
        "stock_uom": "Nos",
        "description": "Pan-tilt-zoom surveillance camera for chowk monitoring.",
        "standard_rate": 78000,
    },
    {
        "item_code": "DEMO-NVR-001",
        "item_name": "Network Video Recorder 32CH",
        "item_group": "Products",
        "stock_uom": "Nos",
        "description": "32 channel NVR with RAID-ready recording storage.",
        "standard_rate": 185000,
    },
    {
        "item_code": "DEMO-POE-SW-001",
        "item_name": "24 Port PoE Switch",
        "item_group": "Products",
        "stock_uom": "Nos",
        "description": "Layer-2 managed PoE switch for field camera aggregation.",
        "standard_rate": 48000,
    },
    {
        "item_code": "DEMO-CAT6-001",
        "item_name": "CAT6 Outdoor Cable",
        "item_group": "Consumable",
        "stock_uom": "Mtr",
        "description": "Outdoor shielded CAT6 cable for surveillance network links.",
        "standard_rate": 42,
    },
    {
        "item_code": "DEMO-UPS-001",
        "item_name": "UPS 2 KVA",
        "item_group": "Products",
        "stock_uom": "Nos",
        "description": "Online UPS for cabinet power backup.",
        "standard_rate": 36000,
    },
]

SITE_BLUEPRINTS = [
    {
        "site_code": "PPHC-RAJ-01",
        "site_name": "Rajwada Square Junction",
        "address": "Rajwada Square, Indore",
        "latitude": 22.7177,
        "longitude": 75.8545,
        "tower_count": 1,
        "fiber_length_m": 850,
        "backhaul_type": "Fiber",
        "power_source": "Grid",
        "installation_stage": "Commissioned",
        "location_progress_pct": 100,
    },
    {
        "site_code": "PPHC-RAJ-02",
        "site_name": "Rajwada Control Room",
        "address": "Police Control Room, Rajwada Zone, Indore",
        "latitude": 22.7191,
        "longitude": 75.8572,
        "tower_count": 0,
        "fiber_length_m": 320,
        "backhaul_type": "Fiber",
        "power_source": "Grid",
        "installation_stage": "Testing",
        "location_progress_pct": 88,
    },
]


def _bootstrap():
    if getattr(frappe.local, "site", None):
        return

    os.chdir(SITES_DIR)
    frappe.init(site=SITE_NAME)
    frappe.connect()
    frappe.set_user("Administrator")


def _teardown():
    if getattr(frappe.local, "site", None):
        frappe.destroy()


def _ensure_doc(doctype, filters, values=None):
    values = values or {}
    docname = frappe.db.exists(doctype, filters)
    if docname:
        return frappe.get_doc(doctype, docname), False

    payload = {"doctype": doctype}
    payload.update(filters)
    payload.update(values)
    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    return doc, True


def _ensure_file(file_name, content):
    existing = frappe.db.exists("File", {"file_name": file_name})
    if existing:
        return frappe.get_doc("File", existing).file_url

    file_doc = save_file(file_name, content.encode("utf-8"), None, None, is_private=False)
    return file_doc.file_url


def _first_or_none(doctype, filters=None, fields=None, order_by="creation asc"):
    rows = frappe.get_all(doctype, filters=filters or {}, fields=fields or ["name"], order_by=order_by, limit=1)
    return rows[0] if rows else None


def _get_project():
    if frappe.db.exists("Project", PRIMARY_PROJECT):
        return frappe.get_doc("Project", PRIMARY_PROJECT)

    row = _first_or_none("Project")
    if not row:
        frappe.throw("No Project found. Expected at least one project to seed demo operations.")
    return frappe.get_doc("Project", row.name)


def _get_tender(project_name):
    if frappe.db.exists("GE Tender", PRIMARY_TENDER):
        return frappe.get_doc("GE Tender", PRIMARY_TENDER)

    row = _first_or_none("GE Tender", filters={"linked_project": project_name})
    if row:
        return frappe.get_doc("GE Tender", row.name)

    row = _first_or_none("GE Tender")
    if not row:
        frappe.throw("No GE Tender found. Expected at least one tender to seed demo operations.")
    return frappe.get_doc("GE Tender", row.name)


def _get_demo_company(project):
    if getattr(project, "company", None):
        return project.company

    row = _first_or_none("Company")
    if not row:
        frappe.throw("No Company found.")
    return row.name


def _pick_warehouse(prefix, company=None):
    if company:
        company_abbr = frappe.db.get_value("Company", company, "abbr")
        if company_abbr:
            row = _first_or_none("Warehouse", filters={"name": ["like", f"{prefix}% - {company_abbr}"]})
            if row:
                return row.name

    row = _first_or_none("Warehouse", filters={"name": ["like", f"{prefix}%"]})
    if row:
        return row.name

    row = _first_or_none("Warehouse")
    if not row:
        frappe.throw("No Warehouse found.")
    return row.name


def _pick_supplier(index=0):
    suppliers = frappe.get_all("Supplier", fields=["name"], order_by="creation asc", limit=10)
    if not suppliers:
        frappe.throw("No Supplier found. Expected existing suppliers for procurement demo data.")
    return suppliers[min(index, len(suppliers) - 1)].name


def _pick_department(name):
    row = _first_or_none("Department", filters={"department_name": name}, fields=["name"])
    return row.name if row else None


def _ensure_uoms(summary):
    for uom_name in ("Nos", "Mtr"):
        _, created = _ensure_doc("UOM", {"uom_name": uom_name})
        summary["created"].setdefault("UOM", 0)
        summary["created"]["UOM"] += int(created)


def _ensure_items(summary):
    items = {}
    for row in REALISTIC_ITEMS:
        doc, created = _ensure_doc(
            "Item",
            {"item_code": row["item_code"]},
            {
                "item_name": row["item_name"],
                "item_group": row["item_group"],
                "stock_uom": row["stock_uom"],
                "description": row["description"],
                "standard_rate": row["standard_rate"],
                "is_stock_item": 1,
                "include_item_in_manufacturing": 0,
            },
        )
        items[row["item_code"]] = doc
        summary["created"]["Item"] += int(created)
    return items


def _ensure_party_and_org(summary):
    party, created_party = _ensure_doc(
        "GE Party",
        {"party_name": "Punjab Police Housing Corporation"},
        {
            "party_type": "CLIENT",
            "active": 1,
            "city": "Indore",
            "state": "Madhya Pradesh",
            "address": "Police Headquarters Liaison Office, Indore",
            "phone": "+91-731-4000000",
            "email": "projects@pphc.example.com",
        },
    )
    org, created_org = _ensure_doc(
        "GE Organization",
        {"organization_name": "Hikvision Systems India Pvt Ltd"},
        {
            "active": 1,
            "city": "Bhopal",
            "state": "Madhya Pradesh",
            "address": "Regional Support Office, MP Circle",
            "phone": "+91-755-4400110",
            "email": "support@hikvision-demo.example.com",
        },
    )
    summary["created"]["GE Party"] += int(created_party)
    summary["created"]["GE Organization"] += int(created_org)
    return party, org


def _ensure_sites(project, tender, summary):
    sites = []
    for blueprint in SITE_BLUEPRINTS:
        payload = {
            "site_name": blueprint["site_name"],
            "status": "ACTIVE",
            "linked_project": project.name,
            "linked_tender": tender.name,
            "address": blueprint["address"],
            "latitude": blueprint["latitude"],
            "longitude": blueprint["longitude"],
            "location_id": blueprint["site_code"],
            "survey_completion_date": add_days(today(), -28),
            "tower_count": blueprint["tower_count"],
            "fiber_length_m": blueprint["fiber_length_m"],
            "backhaul_type": blueprint["backhaul_type"],
            "feasibility_status": "Approved",
            "power_source": blueprint["power_source"],
            "power_availability": 1,
            "road_accessibility": 1,
            "installation_stage": blueprint["installation_stage"],
            "location_progress_pct": blueprint["location_progress_pct"],
            "remarks": f"{DEMO_MARKER}: seeded from realistic surveillance rollout docs.",
        }
        doc, created = _ensure_doc("GE Site", {"site_code": blueprint["site_code"]}, payload)
        sites.append(doc)
        summary["created"]["GE Site"] += int(created)
    return sites


def _ensure_boq(project, tender, items, summary):
    existing = _first_or_none(
        "GE BOQ",
        filters={"linked_tender": tender.name},
        fields=["name"],
        order_by="version desc, creation desc",
    )
    if existing:
        return frappe.get_doc("GE BOQ", existing.name)

    boq_items = [
        {
            "site_name": SITE_BLUEPRINTS[0]["site_name"],
            "item_link": items["DEMO-ANPR-CAM-001"].name,
            "description": "ANPR camera package with mounting accessories",
            "qty": 4,
            "unit": "Nos",
            "rate": 125000,
            "amount": 500000,
            "make": "Hikvision",
            "model": "iDS-TCV900-BI",
        },
        {
            "site_name": SITE_BLUEPRINTS[0]["site_name"],
            "item_link": items["DEMO-PTZ-CAM-001"].name,
            "description": "PTZ surveillance camera for chowk coverage",
            "qty": 6,
            "unit": "Nos",
            "rate": 78000,
            "amount": 468000,
            "make": "Hikvision",
            "model": "DS-2DF8C435MHS-DELW",
        },
        {
            "site_name": SITE_BLUEPRINTS[1]["site_name"],
            "item_link": items["DEMO-CAT6-001"].name,
            "description": "Outdoor CAT6 cable lot",
            "qty": 1500,
            "unit": "Mtr",
            "rate": 42,
            "amount": 63000,
            "make": "Polycab",
            "model": "Outdoor Shielded CAT6",
        },
    ]
    doc, created = _ensure_doc(
        "GE BOQ",
        {"linked_tender": tender.name, "version": 1},
        {
            "linked_project": project.name,
            "status": "APPROVED",
            "created_by_user": USERS["presales"] if "presales" in USERS else USERS["project_manager"],
            "approved_by": USERS["project_head"],
            "approved_at": now_datetime(),
            "total_amount": sum(row["amount"] for row in boq_items),
            "total_items": len(boq_items),
            "items": boq_items,
            "notes": f"{DEMO_MARKER}: baseline BOQ for surveillance deployment demo.",
        },
    )
    summary["created"]["GE BOQ"] += int(created)
    return doc


def _ensure_costing_and_procurement(project, tender, boq, items, company, stores_warehouse, summary):
    cost_items = map_boq_items_to_cost_sheet_items(boq.items)
    cost_items.append(
        {
            "description": "Installation and commissioning labour",
            "cost_type": "Labour",
            "qty": 12,
            "unit": "Manday",
            "base_rate": 2800,
        }
    )
    cost_items.append(
        {
            "description": "Project overhead and logistics",
            "cost_type": "Overhead",
            "qty": 1,
            "unit": "Lot",
            "base_rate": 95000,
        }
    )

    cost_sheet, created_cost = _ensure_doc(
        "GE Cost Sheet",
        {"linked_tender": tender.name, "version": 1},
        {
            "linked_project": project.name,
            "linked_boq": boq.name,
            "status": "APPROVED",
            "margin_percent": 18,
            "created_by_user": USERS["purchase"],
            "approved_by": USERS["project_head"],
            "approved_at": now_datetime(),
            "items": cost_items,
            "notes": f"{DEMO_MARKER}: approved cost sheet prepared from BOQ items.",
        },
    )
    summary["created"]["GE Cost Sheet"] += int(created_cost)

    budget_rows = [
        ("Surveillance Equipment", 850000),
        ("Network & Cabling", 210000),
        ("Commissioning & QA", 160000),
    ]
    for budget_head, sanctioned_amount in budget_rows:
        _, created = _ensure_doc(
            "GE Budget Allocation",
            {"linked_project": project.name, "budget_head": budget_head, "period_start": "2026-03-01"},
            {
                "status": "Active",
                "period_end": "2026-06-30",
                "sanctioned_amount": sanctioned_amount,
                "spent_to_date": round(sanctioned_amount * 0.42, 2),
                "utilization_pct": 42,
                "remarks": f"{DEMO_MARKER}: seeded budget head.",
            },
        )
        summary["created"]["GE Budget Allocation"] += int(created)

    mr_items = [
        {
            "item_code": items["DEMO-ANPR-CAM-001"].name,
            "item_name": items["DEMO-ANPR-CAM-001"].item_name,
            "description": items["DEMO-ANPR-CAM-001"].description,
            "qty": 2,
            "schedule_date": add_days(today(), 5),
            "uom": items["DEMO-ANPR-CAM-001"].stock_uom,
            "stock_uom": items["DEMO-ANPR-CAM-001"].stock_uom,
            "conversion_factor": 1,
            "warehouse": stores_warehouse,
        },
        {
            "item_code": items["DEMO-POE-SW-001"].name,
            "item_name": items["DEMO-POE-SW-001"].item_name,
            "description": items["DEMO-POE-SW-001"].description,
            "qty": 2,
            "schedule_date": add_days(today(), 5),
            "uom": items["DEMO-POE-SW-001"].stock_uom,
            "stock_uom": items["DEMO-POE-SW-001"].stock_uom,
            "conversion_factor": 1,
            "warehouse": stores_warehouse,
        },
    ]
    material_request, created_mr = _ensure_doc(
        "Material Request",
        {"title": f"{DEMO_MARKER} PPHC final deployment material request"},
        {
            "material_request_type": "Purchase",
            "company": company,
            "schedule_date": add_days(today(), 5),
            "transaction_date": today(),
            "items": mr_items,
        },
    )
    summary["created"]["Material Request"] += int(created_mr)

    vendor_quotes = [
        {
            "supplier": _pick_supplier(0),
            "item_link": items["DEMO-ANPR-CAM-001"].name,
            "description": "ANPR camera supply quote",
            "qty": 2,
            "unit": "Nos",
            "rate": 122500,
            "amount": 245000,
            "lead_time_days": 12,
            "is_selected": 1,
            "remarks": "Selected based on lead time and warranty support.",
        },
        {
            "supplier": _pick_supplier(1),
            "item_link": items["DEMO-POE-SW-001"].name,
            "description": "24 port PoE switch quote",
            "qty": 2,
            "unit": "Nos",
            "rate": 49500,
            "amount": 99000,
            "lead_time_days": 14,
            "is_selected": 0,
            "remarks": "Higher price, retained for comparison.",
        },
        {
            "supplier": _pick_supplier(2),
            "item_link": items["DEMO-NVR-001"].name,
            "description": "32 channel NVR quote",
            "qty": 1,
            "unit": "Nos",
            "rate": 189500,
            "amount": 189500,
            "lead_time_days": 10,
            "is_selected": 0,
            "remarks": "Commercially acceptable backup vendor quote.",
        },
    ]
    vendor_comparison, created_vc = _ensure_doc(
        "GE Vendor Comparison",
        {"linked_material_request": material_request.name},
        {
            "linked_project": project.name,
            "linked_tender": tender.name,
            "linked_boq": boq.name,
            "prepared_by_user": USERS["purchase"],
            "recommended_supplier": vendor_quotes[0]["supplier"],
            "status": "APPROVED",
            "approved_by": USERS["project_head"],
            "approved_at": now_datetime(),
            "quote_count": len(vendor_quotes),
            "distinct_supplier_count": 3,
            "total_items": len(vendor_quotes),
            "lowest_total_amount": 344000,
            "selected_total_amount": 245000,
            "quotes": vendor_quotes,
            "expected_delivery_date": add_days(today(), 12),
            "approval_date": today(),
            "notes": f"{DEMO_MARKER}: procurement comparison for final deployment lot.",
        },
    )
    summary["created"]["GE Vendor Comparison"] += int(created_vc)
    return cost_sheet, material_request, vendor_comparison


def _ensure_execution_finance_and_docs(project, tender, sites, items, company, summary):
    drawing_file = _ensure_file(
        "demo-pphc-drawing-rev1.txt",
        "Single line surveillance layout for Rajwada cluster. Rev-1. Generated for demo seeding.",
    )
    test_report_file = _ensure_file(
        "demo-commissioning-test-report.txt",
        "SAT report summary for Rajwada Square Junction. Generated for demo seeding.",
    )
    handover_file = _ensure_file(
        "demo-handover-note.txt",
        "Project handover and client acceptance note. Generated for demo seeding.",
    )

    milestones = [
        ("Survey Freeze", sites[0].name, "COMPLETED", -40, -35, 100),
        ("Equipment Installation", sites[0].name, "COMPLETED", -20, -12, 100),
        ("SAT & Commissioning", sites[0].name, "IN_PROGRESS", -4, 3, 78),
        ("Final Handover", sites[1].name, "PLANNED", 5, 14, 10),
    ]
    milestone_docs = []
    for name, site_name, status, start_offset, end_offset, progress in milestones:
        doc, created = _ensure_doc(
            "GE Milestone",
            {"linked_project": project.name, "milestone_name": name},
            {
                "status": status,
                "linked_site": site_name,
                "planned_start_date": add_days(today(), start_offset),
                "planned_end_date": add_days(today(), end_offset),
                "actual_start_date": add_days(today(), start_offset),
                "progress_pct": progress,
                "assigned_role": "PROJECT_MANAGER",
                "assigned_team": "Rajwada Deployment Squad",
                "owner_user": USERS["project_manager"],
                "remarks": f"{DEMO_MARKER}: seeded milestone.",
            },
        )
        milestone_docs.append(doc)
        summary["created"]["GE Milestone"] += int(created)

    dispatch_items = [
        {
            "item_link": items["DEMO-ANPR-CAM-001"].name,
            "description": items["DEMO-ANPR-CAM-001"].description,
            "qty": 2,
            "uom": items["DEMO-ANPR-CAM-001"].stock_uom,
            "serial_numbers": "ANPR-PPHC-001\nANPR-PPHC-002",
        },
        {
            "item_link": items["DEMO-POE-SW-001"].name,
            "description": items["DEMO-POE-SW-001"].description,
            "qty": 1,
            "uom": items["DEMO-POE-SW-001"].stock_uom,
            "serial_numbers": "SW-PPHC-001",
        },
    ]
    dispatch, created_dispatch = _ensure_doc(
        "GE Dispatch Challan",
        {"tracking_reference": f"{DEMO_MARKER}-DISP-001"},
        {
            "dispatch_type": "VENDOR_TO_SITE",
            "dispatch_date": add_days(today(), -9),
            "status": "DISPATCHED",
            "linked_project": project.name,
            "linked_tender": tender.name,
            "target_site_name": sites[0].site_name,
            "vehicle_number": "MP09-HF-2201",
            "transporter_name": "Technosys Logistics",
            "created_by_user": USERS["purchase"],
            "approved_by": USERS["project_head"],
            "approved_at": now_datetime(),
            "total_items": len(dispatch_items),
            "total_qty": 3,
            "items": dispatch_items,
            "requested_by": USERS["project_manager"],
            "received_by": USERS["field_technician"],
            "purpose_of_issuance": "Site Installation",
            "condition_on_receipt": "Good",
            "remarks": f"{DEMO_MARKER}: dispatch for Rajwada field lot.",
        },
    )
    summary["created"]["GE Dispatch Challan"] += int(created_dispatch)

    team_members = [
        (USERS["project_manager"], "PROJECT_MANAGER", None),
        (USERS["engineer"], "ENGINEER", sites[0].name),
        (USERS["field_technician"], "TECHNICIAN", sites[0].name),
        (USERS["accounts"], "ACCOUNTS", None),
    ]
    for user, role_in_project, linked_site in team_members:
        _, created = _ensure_doc(
            "GE Project Team Member",
            {"linked_project": project.name, "user": user, "role_in_project": role_in_project},
            {
                "linked_site": linked_site,
                "start_date": add_days(today(), -45),
                "is_active": 1,
                "remarks": f"{DEMO_MARKER}: active project team assignment.",
            },
        )
        summary["created"]["GE Project Team Member"] += int(created)

    asset_rows = [
        ("Rajwada ANPR Camera 01", "Hardware", items["DEMO-ANPR-CAM-001"].description, "ANPR-PPHC-001", 1, 125000, sites[0].name),
        ("Rajwada PTZ Camera 01", "Hardware", items["DEMO-PTZ-CAM-001"].description, "PTZ-PPHC-001", 1, 78000, sites[0].name),
        ("Rajwada NVR Rack 01", "Hardware", items["DEMO-NVR-001"].description, "NVR-PPHC-001", 1, 185000, sites[1].name),
    ]
    for asset_name, asset_type, category, serial_no, quantity, unit_cost, linked_site in asset_rows:
        _, created = _ensure_doc(
            "GE Project Asset",
            {"linked_project": project.name, "asset_name": asset_name},
            {
                "linked_site": linked_site,
                "asset_type": asset_type,
                "status": "Deployed",
                "category": category,
                "make_model": "Technosys Demo Deployment",
                "serial_no": serial_no,
                "part_no": serial_no,
                "quantity": quantity,
                "unit_cost": unit_cost,
                "assigned_to": USERS["field_technician"],
                "deployment_date": add_days(today(), -7),
                "warranty_end_date": add_days(today(), 365),
                "remarks": f"{DEMO_MARKER}: seeded project asset.",
            },
        )
        summary["created"]["GE Project Asset"] += int(created)

    comm_logs = [
        ("Site readiness confirmation", "Call", "Outbound", "Police Liaison Officer", "Confirmed pole foundation and power availability at Rajwada Square."),
        ("NOC document follow-up", "Email", "Inbound", "Municipal Electrical Cell", "Received approved route drawing for cable trench crossing."),
        ("Weekly progress review", "Meeting", "Internal", "Project Core Team", "Reviewed installation progress, pending SAT checklist, and client observation closure."),
    ]
    for idx, (subject, ctype, direction, counterparty, body) in enumerate(comm_logs, start=1):
        _, created = _ensure_doc(
            "GE Project Communication Log",
            {"linked_project": project.name, "subject": subject, "communication_date": add_days(today(), -idx * 3)},
            {
                "linked_site": sites[0].name,
                "communication_type": ctype,
                "direction": direction,
                "counterparty_name": counterparty,
                "counterparty_role": "Stakeholder",
                "summary": body,
                "follow_up_required": 1 if idx == 2 else 0,
                "follow_up_date": add_days(today(), 2) if idx == 2 else None,
                "follow_up_note": "Collect final stamped NOC copy." if idx == 2 else None,
                "logged_by": USERS["project_manager"],
            },
        )
        summary["created"]["GE Project Communication Log"] += int(created)

    petty_rows = [
        ("Local transport for junction inspection", "Travel", 1850),
        ("Consumables for control room labeling", "Office Supplies", 920),
    ]
    for idx, (description, category, amount) in enumerate(petty_rows, start=1):
        _, created = _ensure_doc(
            "GE Petty Cash",
            {"linked_project": project.name, "description": description, "entry_date": add_days(today(), -idx * 2)},
            {
                "linked_site": sites[0].name,
                "status": "APPROVED",
                "category": category,
                "amount": amount,
                "paid_to": "Rajwada Field Team",
                "voucher_ref": f"{DEMO_MARKER}-PC-{idx:03d}",
                "paid_by": USERS["project_manager"],
                "approved_by": USERS["accounts"],
                "approved_on": add_days(today(), -idx * 2),
                "remarks": f"{DEMO_MARKER}: seeded petty cash voucher.",
            },
        )
        summary["created"]["GE Petty Cash"] += int(created)

    manpower_rows = [
        ("Rohit Gupta", "Field Technician", "TECHNICIAN", 2.0, 1400),
        ("Neha Singh", "Engineer", "ENGINEER", 1.5, 2200),
        ("Deepak Mali", "OM Operator", "OPERATOR", 1.0, 1100),
    ]
    for idx, (worker_name, designation, role_in_project, man_days, daily_rate) in enumerate(manpower_rows, start=1):
        _, created = _ensure_doc(
            "GE Manpower Log",
            {"linked_project": project.name, "worker_name": worker_name, "log_date": add_days(today(), -idx)},
            {
                "linked_site": sites[0].name,
                "designation": designation,
                "role_in_project": role_in_project,
                "man_days": man_days,
                "daily_rate": daily_rate,
                "total_cost": man_days * daily_rate,
                "overtime_hours": 1 if idx == 1 else 0,
                "overtime_rate": 250,
                "overtime_cost": 250 if idx == 1 else 0,
                "remarks": f"{DEMO_MARKER}: seeded manpower log.",
            },
        )
        summary["created"]["GE Manpower Log"] += int(created)

    drawing, created_drawing = _ensure_doc(
        "GE Drawing",
        {"linked_project": project.name, "drawing_number": "PPHC-DWG-EL-001"},
        {
            "linked_site": sites[0].name,
            "discipline": "Electrical",
            "title": "Rajwada Square power and network layout",
            "revision": 1,
            "status": "Approved",
            "client_approval_status": "Approved",
            "approval_date": today(),
            "file": drawing_file,
            "approved_by": USERS["engineering_head"],
            "remarks": f"{DEMO_MARKER}: client-approved for execution.",
        },
    )
    summary["created"]["GE Drawing"] += int(created_drawing)

    deviation, created_td = _ensure_doc(
        "GE Technical Deviation",
        {"deviation_id": "PPHC-TD-001"},
        {
            "linked_project": project.name,
            "linked_drawing": drawing.name,
            "impact": "Medium",
            "description": "Shifted camera pole by 4 meters due to underground utility conflict.",
            "proposed_solution": "Use alternate pole position with revised cable route.",
            "root_cause": "On-site utility trench discovered during excavation.",
            "status": "Approved",
            "approval_date": today(),
            "raised_by": USERS["engineer"],
            "approved_by": USERS["engineering_head"],
            "remarks": f"{DEMO_MARKER}: approved field deviation.",
        },
    )
    summary["created"]["GE Technical Deviation"] += int(created_td)

    _, created_cr = _ensure_doc(
        "GE Change Request",
        {"cr_number": "PPHC-CR-001"},
        {
            "linked_project": project.name,
            "status": "Approved",
            "approval_date": today(),
            "description": "Add one PTZ camera to cover market entry blind spot.",
            "reason": "Client observation during joint inspection.",
            "cost_impact": 92000,
            "schedule_impact_days": 3,
            "raised_by": USERS["project_manager"],
            "approved_by": USERS["project_head"],
            "remarks": f"{DEMO_MARKER}: approved scope refinement.",
        },
    )
    summary["created"]["GE Change Request"] += int(created_cr)

    _, created_invoice = _ensure_doc(
        "GE Invoice",
        {"linked_project": project.name, "payment_milestone_description": "Rajwada phase SAT completion"},
        {
            "linked_site": sites[0].name,
            "invoice_date": today(),
            "invoice_type": "MILESTONE",
            "status": "APPROVED",
            "amount": 275000,
            "gst_percent": 18,
            "gst_amount": 49500,
            "tds_percent": 2,
            "tds_amount": 5500,
            "net_receivable": 319000,
            "milestone_complete": 1,
            "audit_note": "Milestone verified by PM and Accounts.",
            "items": [
                {
                    "linked_entity_type": "MILESTONE",
                    "linked_entity_name": milestone_docs[2].name,
                    "description": "SAT completion billing for Rajwada junction",
                    "qty": 1,
                    "rate": 275000,
                    "amount": 275000,
                    "gst_rate": 18,
                }
            ],
            "payment_milestone_description": "Rajwada phase SAT completion",
            "scheduled_milestone_date": add_days(today(), -2),
            "submitted_by": USERS["accounts"],
            "approved_by": USERS["project_head"],
            "approved_at": now_datetime(),
            "remarks": f"{DEMO_MARKER}: milestone invoice seeded.",
        },
    )
    summary["created"]["GE Invoice"] += int(created_invoice)

    root_folder, created_root_folder = _ensure_doc(
        "GE Document Folder",
        {"folder_name": "PPHC Demo Project Folder", "linked_project": project.name},
        {
            "sort_order": 1,
            "description": f"{DEMO_MARKER}: root document workspace.",
        },
    )
    summary["created"]["GE Document Folder"] += int(created_root_folder)

    engineering_folder, created_eng_folder = _ensure_doc(
        "GE Document Folder",
        {"folder_name": "Engineering Pack", "linked_project": project.name, "parent_folder": root_folder.name},
        {
            "department": _pick_department("Project Coordinator Department"),
            "sort_order": 2,
            "description": f"{DEMO_MARKER}: engineering deliverables.",
        },
    )
    summary["created"]["GE Document Folder"] += int(created_eng_folder)

    execution_folder, created_exec_folder = _ensure_doc(
        "GE Document Folder",
        {"folder_name": "Execution & SAT", "linked_project": project.name, "parent_folder": root_folder.name},
        {
            "department": _pick_department("Central Team"),
            "sort_order": 3,
            "description": f"{DEMO_MARKER}: execution and handover records.",
        },
    )
    summary["created"]["GE Document Folder"] += int(created_exec_folder)

    documents = [
        ("Rajwada Approved Drawing Rev1", engineering_folder.name, "Engineering", drawing_file),
        ("Rajwada SAT Report", execution_folder.name, "Execution", test_report_file),
        ("Rajwada Client Handover Note", execution_folder.name, "Finance", handover_file),
    ]
    for document_name, folder, category, file_url in documents:
        _, created = _ensure_doc(
            "GE Project Document",
            {"linked_project": project.name, "document_name": document_name},
            {
                "folder": folder,
                "category": category,
                "file": file_url,
                "version": 1,
                "uploaded_by": USERS["project_manager"],
                "uploaded_on": now_datetime(),
                "remarks": f"{DEMO_MARKER}: seeded project document.",
            },
        )
        summary["created"]["GE Project Document"] += int(created)

    return {
        "dispatch": dispatch,
        "drawing": drawing,
        "deviation": deviation,
        "milestones": milestone_docs,
        "test_report_file": test_report_file,
    }


def _ensure_commissioning_and_support(project, sites, items, drawing_ctx, summary):
    sla_profile, created_sla = _ensure_doc(
        "GE SLA Profile",
        {"profile_name": "PPHC 24x7 Critical Surveillance SLA"},
        {
            "linked_project": project.name,
            "response_minutes": 30,
            "resolution_minutes": 240,
            "working_hours_type": "24x7",
            "escalation_enabled": 1,
            "escalation_user": USERS["project_head"],
            "is_active": 1,
        },
    )
    summary["created"]["GE SLA Profile"] += int(created_sla)

    pool, created_pool = _ensure_doc(
        "GE IP Pool",
        {"linked_project": project.name, "network_name": "Rajwada Surveillance VLAN 101"},
        {
            "linked_site": sites[0].name,
            "status": "Active",
            "subnet": "10.68.101.0/24",
            "gateway": "10.68.101.1",
            "vlan_id": "101",
            "total_ips": 64,
            "allocated_ips": 3,
            "available_ips": 61,
            "remarks": f"{DEMO_MARKER}: live commissioning IP pool.",
        },
    )
    summary["created"]["GE IP Pool"] += int(created_pool)

    device_rows = [
        ("Rajwada ANPR Camera 01", "ANPR Camera", items["DEMO-ANPR-CAM-001"].name, "ANPR-PPHC-001", "00:11:22:33:44:55", "Commissioned", "10.68.101.11"),
        ("Rajwada PTZ Camera 01", "PTZ Camera", items["DEMO-PTZ-CAM-001"].name, "PTZ-PPHC-001", "00:11:22:33:44:66", "Active", "10.68.101.12"),
        ("Rajwada NVR Rack 01", "NVR", items["DEMO-NVR-001"].name, "NVR-PPHC-001", "00:11:22:33:44:77", "Active", "10.68.101.21"),
    ]
    devices = []
    for idx, (device_name, device_type, item_link, serial_no, mac_address, status, ip_address) in enumerate(device_rows, start=1):
        device, created_device = _ensure_doc(
            "GE Device Register",
            {"linked_project": project.name, "serial_no": serial_no},
            {
                "linked_site": sites[0].name if idx < 3 else sites[1].name,
                "device_name": device_name,
                "device_type": device_type,
                "status": status,
                "item_link": item_link,
                "make_model": "Technosys Demo Build",
                "mac_address": mac_address,
                "linked_dispatch_challan": drawing_ctx["dispatch"].name,
                "deployment_date": add_days(today(), -7),
                "warranty_end_date": add_days(today(), 365),
                "remarks": f"{DEMO_MARKER}: seeded commissioned device.",
            },
        )
        summary["created"]["GE Device Register"] += int(created_device)

        allocation, created_alloc = _ensure_doc(
            "GE IP Allocation",
            {"linked_pool": pool.name, "ip_address": ip_address},
            {
                "linked_device": device.name,
                "status": "Active",
                "allocated_on": now_datetime(),
                "allocated_by": USERS["engineer"],
                "remarks": f"{DEMO_MARKER}: seeded IP allocation.",
            },
        )
        summary["created"]["GE IP Allocation"] += int(created_alloc)

        if not device.ip_address:
            device.ip_address = allocation.name
            device.save(ignore_permissions=True)

        devices.append(device)

    checklist_items = [
        {"item_name": "Power and grounding verified", "is_completed": 1, "completed_by": USERS["engineer"], "completed_on": now_datetime()},
        {"item_name": "Camera focus and FoV aligned", "is_completed": 1, "completed_by": USERS["engineer"], "completed_on": now_datetime()},
        {"item_name": "Recording validation completed", "is_completed": 1, "completed_by": USERS["project_manager"], "completed_on": now_datetime()},
        {"item_name": "Client witness SAT done", "is_completed": 1, "completed_by": USERS["project_manager"], "completed_on": now_datetime()},
    ]
    checklist, created_checklist = _ensure_doc(
        "GE Commissioning Checklist",
        {"linked_project": project.name, "checklist_name": "Rajwada SAT Checklist"},
        {
            "linked_site": sites[0].name,
            "template_type": "SAT",
            "status": "Completed",
            "items": checklist_items,
            "commissioned_by": USERS["engineer"],
            "commissioned_date": today(),
            "client_signoff_received": 1,
            "signoff_date": today(),
            "remarks": f"{DEMO_MARKER}: completed SAT checklist.",
        },
    )
    summary["created"]["GE Commissioning Checklist"] += int(created_checklist)

    test_report, created_report = _ensure_doc(
        "GE Test Report",
        {"linked_project": project.name, "report_name": "Rajwada SAT Report"},
        {
            "linked_site": sites[0].name,
            "test_type": "SAT",
            "status": "Approved",
            "linked_commissioning_checklist": checklist.name,
            "file": drawing_ctx["test_report_file"],
            "tested_by": USERS["engineer"],
            "test_date": today(),
            "approved_by": USERS["engineering_head"],
            "approval_date": today(),
            "test_items": [
                {
                    "test_case_id": "SAT-001",
                    "description": "ANPR capture at approach lane",
                    "expected_result": "Plate recognized within 2 seconds",
                    "actual_result": "Recognition success in 1.4 seconds",
                    "status": "Pass",
                },
                {
                    "test_case_id": "SAT-002",
                    "description": "PTZ preset tour playback",
                    "expected_result": "Preset tour completes without packet loss",
                    "actual_result": "Preset tour completed successfully",
                    "status": "Pass",
                },
            ],
            "remarks": f"{DEMO_MARKER}: SAT approved.",
        },
    )
    summary["created"]["GE Test Report"] += int(created_report)

    _, created_signoff = _ensure_doc(
        "GE Client Signoff",
        {"linked_project": project.name, "signoff_type": "Commissioning", "linked_site": sites[0].name},
        {
            "status": "Approved",
            "signed_by_client": "A. Singh, Client Representative",
            "signoff_date": today(),
            "linked_commissioning_checklist": checklist.name,
            "attachment": drawing_ctx["test_report_file"],
            "remarks": f"{DEMO_MARKER}: client witness signoff captured.",
        },
    )
    summary["created"]["GE Client Signoff"] += int(created_signoff)

    uptime_rows = [
        (devices[0], "CCTV", 23.2, 0.8, "Compliant", None),
        (devices[2], "Server", 22.0, 2.0, "Non-Compliant", "Power Failure"),
    ]
    for idx, (device, device_type, uptime_hours, downtime_hours, sla_status, reason) in enumerate(uptime_rows, start=1):
        total_hours = uptime_hours + downtime_hours
        uptime_pct = round((uptime_hours / total_hours) * 100, 2) if total_hours else 0
        _, created = _ensure_doc(
            "GE Device Uptime Log",
            {"linked_project": project.name, "device_name": device.device_name, "log_date": add_days(today(), -idx)},
            {
                "linked_site": device.linked_site,
                "device_type": device_type,
                "serial_no": device.serial_no,
                "uptime_hours": uptime_hours,
                "downtime_hours": downtime_hours,
                "sla_target_uptime_pct": 99.0,
                "actual_uptime_pct": uptime_pct,
                "sla_status": sla_status,
                "downtime_reason": reason,
                "downtime_description": "Short power interruption at feeder side." if reason else None,
                "reported_by": USERS["om_operator"],
                "verified_by": USERS["engineer"],
                "remarks": f"{DEMO_MARKER}: uptime log seeded.",
            },
        )
        summary["created"]["GE Device Uptime Log"] += int(created)

    ticket_one, created_ticket_one = _ensure_doc(
        "GE Ticket",
        {"linked_project": project.name, "title": "NVR storage alarm at Rajwada control room"},
        {
            "linked_site": sites[1].name,
            "category": "HARDWARE_ISSUE",
            "priority": "HIGH",
            "status": "IN_PROGRESS",
            "description": "NVR generated RAID degradation alarm during soak test.",
            "raised_by": USERS["om_operator"],
            "raised_on": now_datetime() - timedelta(days=2),
            "assigned_to": USERS["field_technician"],
            "asset_serial_no": devices[2].serial_no,
            "sla_profile": sla_profile.name,
        },
    )
    summary["created"]["GE Ticket"] += int(created_ticket_one)

    _, created_ticket_two = _ensure_doc(
        "GE Ticket",
        {"linked_project": project.name, "title": "Fiber patch fluctuation at Rajwada junction cabinet"},
        {
            "linked_site": sites[0].name,
            "category": "NETWORK_ISSUE",
            "priority": "MEDIUM",
            "status": "RESOLVED",
            "description": "Intermittent packet loss observed at field switch uplink.",
            "raised_by": USERS["project_manager"],
            "raised_on": now_datetime() - timedelta(days=4),
            "assigned_to": USERS["engineer"],
            "resolved_on": now_datetime() - timedelta(days=3),
            "resolution_notes": "Re-terminated LC connector and cleaned patch panel tray.",
            "sla_profile": sla_profile.name,
        },
    )
    summary["created"]["GE Ticket"] += int(created_ticket_two)

    rma, created_rma = _ensure_doc(
        "GE RMA Tracker",
        {"rma_reference_no": "PPHC-RMA-001"},
        {
            "linked_ticket": ticket_one.name,
            "linked_project": project.name,
            "item_link": items["DEMO-NVR-001"].name,
            "asset_serial_number": devices[2].serial_no,
            "qty": 1,
            "faulty_date": add_days(today(), -2),
            "failure_reason": "RAID controller error and repeated storage alarms.",
            "field_rca": "Suspected controller board failure.",
            "dispatch_destination": "OEM",
            "service_partner_name": _pick_supplier(0),
            "outbound_dispatch_date": add_days(today(), -1),
            "outbound_dc_challan_no": "PPHC-DC-RMA-001",
            "outbound_courier_name": "Blue Dart",
            "outbound_docket_no": "BD1234567890",
            "warranty_status": "UNDER_WARRANTY",
            "approval_status": "APPROVED",
            "approved_by_project_head": USERS["project_head"],
            "repairing_status": "SERVICE_PENDING",
            "rma_status": "IN_TRANSIT",
            "initial_inspection_by": USERS["field_technician"],
            "initial_inspection_date": add_days(today(), -2),
            "estimated_resolution_date": add_days(today(), 10),
            "remarks": f"{DEMO_MARKER}: active RMA seeded from ticket flow.",
        },
    )
    summary["created"]["GE RMA Tracker"] += int(created_rma)

    if not ticket_one.linked_rma:
        ticket_one.is_rma = 1
        ticket_one.linked_rma = rma.name
        ticket_one.save(ignore_permissions=True)

    _, created_pdc = _ensure_doc(
        "GE PDC Instrument",
        {"cheque_number": "PDC-PPHC-260316-01"},
        {
            "bank_name": "HDFC Bank",
            "amount": 150000,
            "issue_date": today(),
            "maturity_date": add_days(today(), 45),
            "linked_vendor": _pick_supplier(0),
            "linked_project": project.name,
            "status": "Pending",
            "remarks": f"{DEMO_MARKER}: PDC retained against deployment milestone.",
        },
    )
    summary["created"]["GE PDC Instrument"] += int(created_pdc)

    task_survey, created_task_survey = _ensure_doc(
        "Task",
        {"subject": f"{DEMO_MARKER} Survey closure for {sites[0].site_name}"},
        {
            "project": project.name,
            "status": "Completed",
            "exp_start_date": add_days(today(), -30),
            "exp_end_date": add_days(today(), -25),
        },
    )
    summary["created"]["Task"] += int(created_task_survey)

    task_commission, created_task_commission = _ensure_doc(
        "Task",
        {"subject": f"{DEMO_MARKER} Commission {sites[0].site_name}"},
        {
            "project": project.name,
            "status": "Open",
            "exp_start_date": add_days(today(), -3),
            "exp_end_date": add_days(today(), 2),
        },
    )
    summary["created"]["Task"] += int(created_task_commission)

    dep_rule_one, created_dep_rule_one = _ensure_doc(
        "GE Dependency Rule",
        {
            "linked_task": task_commission.name,
            "prerequisite_reference_doctype": "GE Commissioning Checklist",
            "prerequisite_reference_name": checklist.name,
        },
        {
            "prerequisite_type": "DOCUMENT",
            "active": 1,
            "hard_block": 1,
            "linked_project": project.name,
            "linked_site": sites[0].name,
            "required_status": "Completed",
            "block_message": "Commissioning checklist must be completed before handover task closure.",
        },
    )
    summary["created"]["GE Dependency Rule"] += int(created_dep_rule_one)

    dep_rule_two, created_dep_rule_two = _ensure_doc(
        "GE Dependency Rule",
        {
            "linked_task": task_commission.name,
            "prerequisite_reference_doctype": "GE Test Report",
            "prerequisite_reference_name": test_report.name,
        },
        {
            "prerequisite_type": "APPROVAL",
            "active": 1,
            "hard_block": 1,
            "linked_project": project.name,
            "linked_site": sites[0].name,
            "required_status": "Approved",
            "block_message": "SAT report approval is required before task closure.",
        },
    )
    summary["created"]["GE Dependency Rule"] += int(created_dep_rule_two)

    _, created_override = _ensure_doc(
        "GE Dependency Override",
        {"linked_task": task_commission.name, "dependency_rule": dep_rule_two.name},
        {
            "status": "APPROVED",
            "requested_by": USERS["project_manager"],
            "approved_by": USERS["project_head"],
            "actioned_at": now_datetime(),
            "reason": "Approved for urgent night commissioning window after verbal client clearance.",
        },
    )
    summary["created"]["GE Dependency Override"] += int(created_override)


def seed_demo_operational_data():
    _bootstrap()
    summary = {
        "project": None,
        "tender": None,
        "created": {},
    }

    doctypes = [
        "UOM",
        "Item",
        "GE Party",
        "GE Organization",
        "GE Site",
        "GE BOQ",
        "GE Cost Sheet",
        "GE Budget Allocation",
        "Material Request",
        "GE Vendor Comparison",
        "GE Milestone",
        "GE Dispatch Challan",
        "GE Project Team Member",
        "GE Project Asset",
        "GE Project Communication Log",
        "GE Petty Cash",
        "GE Manpower Log",
        "GE Drawing",
        "GE Technical Deviation",
        "GE Change Request",
        "GE Invoice",
        "GE Document Folder",
        "GE Project Document",
        "GE SLA Profile",
        "GE IP Pool",
        "GE Device Register",
        "GE IP Allocation",
        "GE Commissioning Checklist",
        "GE Test Report",
        "GE Client Signoff",
        "GE Device Uptime Log",
        "GE Ticket",
        "GE RMA Tracker",
        "GE PDC Instrument",
        "Task",
        "GE Dependency Rule",
        "GE Dependency Override",
    ]
    summary["created"] = {doctype: 0 for doctype in doctypes}

    try:
        project = _get_project()
        tender = _get_tender(project.name)
        company = _get_demo_company(project)
        stores_warehouse = _pick_warehouse("Stores", company)

        summary["project"] = project.name
        summary["tender"] = tender.name

        _ensure_uoms(summary)
        items = _ensure_items(summary)
        _ensure_party_and_org(summary)
        sites = _ensure_sites(project, tender, summary)
        boq = _ensure_boq(project, tender, items, summary)
        _ensure_costing_and_procurement(project, tender, boq, items, company, stores_warehouse, summary)
        drawing_ctx = _ensure_execution_finance_and_docs(project, tender, sites, items, company, summary)
        _ensure_commissioning_and_support(project, sites, items, drawing_ctx, summary)

        frappe.db.commit()
        return summary
    except Exception:
        frappe.db.rollback()
        raise
    finally:
        _teardown()


def _pluck_names(doctype, filter_sets):
    names = set()
    for filters in filter_sets:
        for name in frappe.get_all(doctype, filters=filters, pluck="name", limit_page_length=0):
            names.add(name)
    return list(names)


def _delete_doc_safely(doctype, name):
    if not frappe.db.exists(doctype, name):
        return False

    doc = frappe.get_doc(doctype, name)
    meta = frappe.get_meta(doctype)

    if meta.is_submittable and getattr(doc, "docstatus", 0) == 1:
        doc.cancel()

    frappe.delete_doc(doctype, name, ignore_permissions=True, force=1)
    return True


def purge_seeded_data():
    """Delete demo/sample records created by demo_seed and bookkeeping demo helpers."""
    _bootstrap()
    summary = {"deleted": {}}

    site_codes = [row["site_code"] for row in SITE_BLUEPRINTS]
    demo_item_codes = [row["item_code"] for row in REALISTIC_ITEMS]
    demo_file_names = [
        "demo-pphc-drawing-rev1.txt",
        "demo-commissioning-test-report.txt",
        "demo-handover-note.txt",
    ]
    exact_subjects = [
        "Site readiness confirmation",
        "NOC document follow-up",
        "Weekly progress review",
    ]
    exact_ticket_titles = [
        "NVR storage alarm at Rajwada control room",
        "Fiber patch fluctuation at Rajwada junction cabinet",
    ]

    delete_plan = [
        ("Task", [{"subject": ["like", f"{DEMO_MARKER}%"]}]),
        ("GE Payment Receipt", [{"remarks": ["like", "%bookkeeping demo%"]}]),
        ("GE Invoice", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"remarks": ["like", "%bookkeeping demo%"]}]),
        ("GE Proforma Invoice", [{"remarks": ["like", "%bookkeeping demo%"]}]),
        ("GE Estimate", [{"remarks": ["like", "%bookkeeping demo%"]}]),
        ("GE RMA Tracker", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"rma_reference_no": "PPHC-RMA-001"}]),
        ("GE Ticket", [{"title": ["in", exact_ticket_titles]}]),
        ("GE Device Uptime Log", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Client Signoff", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Test Report", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"report_name": "Rajwada SAT Report"}]),
        ("GE Commissioning Checklist", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"checklist_name": "Rajwada SAT Checklist"}]),
        ("GE IP Allocation", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Device Register", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"serial_no": ["in", ["ANPR-PPHC-001", "PTZ-PPHC-001", "NVR-PPHC-001"]]}]),
        ("GE IP Pool", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"network_name": "Rajwada Surveillance VLAN 101"}]),
        ("GE SLA Profile", [{"profile_name": "PPHC 24x7 Critical Surveillance SLA"}]),
        ("GE Project Document", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Document Folder", [{"description": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Change Request", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"cr_number": "PPHC-CR-001"}]),
        ("GE Technical Deviation", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"deviation_id": "PPHC-TD-001"}]),
        ("GE Drawing", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}, {"drawing_number": "PPHC-DWG-EL-001"}]),
        ("GE Manpower Log", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Petty Cash", [{"voucher_ref": ["like", f"{DEMO_MARKER}%"]}, {"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Project Communication Log", [{"subject": ["in", exact_subjects]}]),
        ("GE Project Asset", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Project Team Member", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Dispatch Challan", [{"tracking_reference": ["like", f"{DEMO_MARKER}%"]}, {"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Milestone", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Vendor Comparison", [{"notes": ["like", f"%{DEMO_MARKER}%"]}]),
        ("Material Request", [{"title": ["like", f"{DEMO_MARKER}%"]}]),
        ("GE Budget Allocation", [{"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Cost Sheet", [{"notes": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE BOQ", [{"notes": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Site", [{"site_code": ["in", site_codes]}, {"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE PDC Instrument", [{"cheque_number": "PDC-PPHC-260316-01"}, {"remarks": ["like", f"%{DEMO_MARKER}%"]}]),
        ("GE Organization", [{"email": ["like", "%@hikvision-demo.example.com"]}, {"organization_name": "Hikvision Systems India Pvt Ltd", "email": "support@hikvision-demo.example.com"}]),
        ("GE Party", [{"party_name": "DEMO CUSTOMER - COMMERCIAL"}, {"party_name": "Punjab Police Housing Corporation", "email": "projects@pphc.example.com"}]),
        ("Item", [{"item_code": ["in", demo_item_codes]}]),
        ("File", [{"file_name": ["in", demo_file_names]}]),
    ]

    try:
        task_names = _pluck_names("Task", [{"subject": ["like", f"{DEMO_MARKER}%"]}])
        dep_rule_names = _pluck_names("GE Dependency Rule", [{"linked_task": ["in", task_names]}]) if task_names else []

        if dep_rule_names:
            deleted_overrides = 0
            for name in _pluck_names("GE Dependency Override", [{"dependency_rule": ["in", dep_rule_names]}]):
                deleted_overrides += int(_delete_doc_safely("GE Dependency Override", name))
            if deleted_overrides:
                summary["deleted"]["GE Dependency Override"] = deleted_overrides

            deleted_rules = 0
            for name in dep_rule_names:
                deleted_rules += int(_delete_doc_safely("GE Dependency Rule", name))
            if deleted_rules:
                summary["deleted"]["GE Dependency Rule"] = deleted_rules

        for doctype, filter_sets in delete_plan:
            names = _pluck_names(doctype, filter_sets)
            deleted = 0
            for name in names:
                deleted += int(_delete_doc_safely(doctype, name))
            if deleted:
                summary["deleted"][doctype] = deleted

        frappe.db.commit()
        return summary
    except Exception:
        frappe.db.rollback()
        raise
    finally:
        _teardown()


if __name__ == "__main__":
    result = seed_demo_operational_data()
    print(json.dumps(result, indent=2, sort_keys=True, default=str))
