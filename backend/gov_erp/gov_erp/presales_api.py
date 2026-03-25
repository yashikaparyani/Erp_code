"""
Pre-Sales Funnel Dashboard API Module
gov_erp.presales_api

All new endpoints for the Funnel Dashboard, Bid lifecycle, LOI Tracker,
Color Config, and Tender Closure.

Call as: /api/method/gov_erp.presales_api.<method_name>
"""
import json

import frappe
from frappe.utils import cint, cstr, today, add_days, now, now_datetime

# ── Import only functions that ACTUALLY exist in api.py ──────────────────────
from gov_erp.api import (
    _require_roles,
    _require_param,
    _derive_tender_funnel_status,
    _attach_computed_tender_funnel_status,
)
from gov_erp.role_utils import (
    ROLE_PRESALES_HEAD,
    ROLE_PRESALES_EXECUTIVE,
    ROLE_DIRECTOR,
    ROLE_DEPARTMENT_HEAD,
    ROLE_PROJECT_HEAD,
    ROLE_SYSTEM_MANAGER,
)


# ─────────────────────────────────────────────────────────────────────────────
# LOCAL ACCESS GUARDS (replaces missing _require_tender_read/write_access)
# ─────────────────────────────────────────────────────────────────────────────

def _ps_read_access():
    """Require presales read access."""
    _require_roles(
        ROLE_PRESALES_HEAD,
        ROLE_PRESALES_EXECUTIVE,
        ROLE_DEPARTMENT_HEAD,
        ROLE_DIRECTOR,
    )


def _ps_write_access():
    """Require presales write access."""
    _require_roles(
        ROLE_PRESALES_HEAD,
        ROLE_PRESALES_EXECUTIVE,
    )


def _project_head_access():
    """Require project-head level access."""
    _require_roles(
        ROLE_PROJECT_HEAD,
        ROLE_DIRECTOR,
        ROLE_SYSTEM_MANAGER,
    )


def _project_head_submission_access():
    """Require project-head submission or presales leadership visibility."""
    _require_roles(
        ROLE_PROJECT_HEAD,
        ROLE_DIRECTOR,
        ROLE_SYSTEM_MANAGER,
        ROLE_PRESALES_HEAD,
    )


def _get_users_for_role(role_name):
    """Return enabled user ids that hold the supplied role."""
    users = frappe.get_all(
        "Has Role",
        filters={
            "role": role_name,
            "parenttype": "User",
        },
        pluck="parent",
    ) or []
    if not users:
        return []
    enabled_users = frappe.get_all(
        "User",
        filters={
            "name": ["in", users],
            "enabled": 1,
        },
        pluck="name",
    ) or []
    return [user for user in enabled_users if user != "Administrator"]


def _is_loc_window_active(tender_doc):
    """LOC request can be raised once the tenure is nearing completion."""
    tenure_end_date = cstr(tender_doc.get("tenure_end_date") or "").strip()
    if not tenure_end_date:
        return False
    return cint(add_days(today(), 90) >= tenure_end_date)


# ─────────────────────────────────────────────────────────────────────────────
# SYNC WON/LOST TO RESULT TRACKER (replaces missing _sync_tender_result_tracker)
# ─────────────────────────────────────────────────────────────────────────────

def _sync_result_tracker(tender_doc):
    """
    When a tender transitions to WON or LOST, check if a GE Tender Result
    record exists and update its status. Safe if the DocType doesn't exist.
    """
    try:
        if not frappe.db.table_exists("GE Tender Result"):
            return
        existing = frappe.get_all(
            "GE Tender Result",
            filters={"tender": tender_doc.name},
            fields=["name"],
            limit=1,
        )
        if existing:
            frappe.db.set_value(
                "GE Tender Result",
                existing[0]["name"],
                "result_status",
                tender_doc.status,
            )
            frappe.db.commit()
    except Exception:
        # Non-critical — do not break the main workflow
        pass


# ─────────────────────────────────────────────────────────────────────────────
# COLOR HEX MAP
# ─────────────────────────────────────────────────────────────────────────────

COLOR_HEX_MAP = {
    "Purple":   "#a855f7",
    "Teal":     "#14b8a6",
    "Brown":    "#92400e",
    "DarkGray": "#374151",
    "Indigo":   "#4f46e5",
    "Maroon":   "#9f1239",
    "Violet":   "#8b5cf6",
    "Cyan":     "#06b6d4",
    "Lime":     "#84cc16",
    "SkyBlue":  "#0ea5e9",
    "Rose":     "#f43f5e",
    "Fuchsia":  "#d946ef",
    "Amber":    "#f59e0b",
    "Emerald":  "#10b981",
    "Slate":    "#64748b",
    "Zinc":     "#71717a",
    "Coral":    "#f97316",
    "Navy":     "#1e3a5f",
    "Gold":     "#d97706",
    "Olive":    "#7c7a2e",
}

SYSTEM_FUNNEL_LABEL_TO_COLOR = {
    "Tender under evaluation for GO-NOGO":    "Blue",
    "Working but not confirmed by technical": "Yellow",
    "Not Qualified Tender":                   "Red",
    "EMD done and technical confirmed":        "Green",
    "Locked Tender":                          "Orange",
    "Tender not bided but under observation": "Pink",
}


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _get_color_config():
    """Return color config as plain dict. Safe even if singleton missing."""
    defaults = ["Purple", "Teal", "Brown", "DarkGray", "Indigo", "Maroon"]
    try:
        doc = frappe.get_doc("GE Presales Color Config")
        result = {}
        for i in range(1, 7):
            color = cstr(getattr(doc, "slot_{}_color".format(i), "") or defaults[i - 1])
            result["slot_{}".format(i)] = {
                "color": color,
                "label": cstr(getattr(doc, "slot_{}_label".format(i), "") or "Custom {}".format(i)),
                "description": cstr(getattr(doc, "slot_{}_description".format(i), "") or ""),
                "hex": COLOR_HEX_MAP.get(color, "#a855f7"),
            }
        return result
    except Exception:
        return {
            "slot_{}".format(i): {
                "color": defaults[i - 1],
                "label": "Custom {}".format(i),
                "description": "",
                "hex": COLOR_HEX_MAP.get(defaults[i - 1], "#a855f7"),
            }
            for i in range(1, 7)
        }


def _get_funnel_color_key(tender_dict):
    """Return the funnel color key. USER_SLOT_N takes priority over system."""
    user_slot = cstr(tender_dict.get("user_color_slot") or "")
    if user_slot and user_slot in ("1", "2", "3", "4", "5", "6"):
        return "USER_SLOT_{}".format(user_slot)
    funnel = cstr(tender_dict.get("computed_funnel_status") or "")
    return SYSTEM_FUNNEL_LABEL_TO_COLOR.get(funnel, "Blue")


def _local_require_param(value, name="value"):
    """Local version of _require_param with positional name arg."""
    if not value:
        frappe.throw("{} is required".format(name))
    return value


# ─────────────────────────────────────────────────────────────────────────────
# COLOR CONFIG APIs
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_presales_color_config():
    """Return user color slot configs with tenant counts."""
    _ps_read_access()
    config = _get_color_config()
    for i in range(1, 7):
        config["slot_{}".format(i)]["count"] = frappe.db.count(
            "GE Tender", filters={"user_color_slot": str(i)}
        )
    return {"success": True, "data": config}


@frappe.whitelist()
def update_presales_color_config(slot, color, label, description=None):
    """Update one user color slot (slot = 1..6). Presales Head or Director only."""
    _ps_read_access()
    user_roles = set(frappe.get_roles(frappe.session.user))
    if not user_roles.intersection({ROLE_PRESALES_HEAD, ROLE_DIRECTOR, ROLE_SYSTEM_MANAGER}):
        frappe.throw("Only Presales Head or Director can update color config", frappe.PermissionError)
    slot = cint(slot)
    if not (1 <= slot <= 6):
        return {"success": False, "message": "Slot must be 1 to 6"}
    try:
        doc = frappe.get_doc("GE Presales Color Config")
    except frappe.DoesNotExistError:
        doc = frappe.new_doc("GE Presales Color Config")
    doc.set("slot_{}_color".format(slot), cstr(color))
    doc.set("slot_{}_label".format(slot), cstr(label))
    doc.set("slot_{}_description".format(slot), cstr(description or ""))
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "message": "Slot {} updated".format(slot), "data": _get_color_config()}


@frappe.whitelist()
def assign_tender_user_color(tender_name, slot, remarks=None):
    """Assign or clear a user color slot on a tender. Pass slot='' to clear."""
    _ps_write_access()
    tender_name = _local_require_param(tender_name, "tender_name")
    doc = frappe.get_doc("GE Tender", tender_name)
    slot_str = cstr(slot) if cstr(slot) in ("1", "2", "3", "4", "5", "6") else ""
    doc.user_color_slot = slot_str
    doc.user_color_remarks = cstr(remarks or "")
    doc.save()
    frappe.db.commit()
    return {"success": True, "message": "User color assigned", "data": {"user_color_slot": doc.user_color_slot}}


# ─────────────────────────────────────────────────────────────────────────────
# FUNNEL DASHBOARD STATS
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_funnel_dashboard_stats():
    """Return count + pipeline value for all 12 colour slots."""
    _ps_read_access()

    tenders = frappe.get_all(
        "GE Tender",
        fields=[
            "name", "status", "estimated_value",
            "go_no_go_status", "technical_readiness", "commercial_readiness",
            "finance_readiness", "submission_status",
            "emd_required", "pbg_required", "user_color_slot",
        ],
    )
    for t in tenders:
        _attach_computed_tender_funnel_status(t)

    sys_buckets = {c: {"count": 0, "value": 0} for c in
                   ["Blue", "Yellow", "Red", "Green", "Orange", "Pink"]}
    usr_buckets = {"USER_SLOT_{}".format(i): {"count": 0, "value": 0} for i in range(1, 7)}

    for t in tenders:
        key = _get_funnel_color_key(t)
        val = float(t.get("estimated_value") or 0)
        if key.startswith("USER_SLOT_"):
            usr_buckets[key]["count"] += 1
            usr_buckets[key]["value"] += val
        elif key in sys_buckets:
            sys_buckets[key]["count"] += 1
            sys_buckets[key]["value"] += val

    color_config = _get_color_config()
    for i in range(1, 7):
        sk = "USER_SLOT_{}".format(i)
        cfg = color_config.get("slot_{}".format(i), {})
        usr_buckets[sk]["label"] = cfg.get("label", "Custom {}".format(i))
        usr_buckets[sk]["color"] = cfg.get("color", "Purple")
        usr_buckets[sk]["hex"] = cfg.get("hex", "#a855f7")

    td = today()
    total_pipeline = (
        sum(b["value"] for b in sys_buckets.values()) +
        sum(b["value"] for b in usr_buckets.values())
    )

    # Active bids
    active_bids = 0
    if frappe.db.table_exists("GE Bid"):
        active_bids = frappe.db.count("GE Bid", {"status": ["in", ["SUBMITTED", "UNDER_EVALUATION"]]})

    # Won this year
    won_this_year = 0
    if frappe.db.table_exists("GE Bid"):
        this_year = "{}-01-01".format(now_datetime().year)
        won_this_year = frappe.db.count("GE Bid", {"status": "WON", "result_date": [">=", this_year]})

    # Overdue
    terminal = ["WON", "LOST", "DROPPED", "CANCELLED", "CONVERTED_TO_PROJECT"]
    overdue = frappe.db.count(
        "GE Tender",
        {"submission_date": ["<", td], "status": ["not in", terminal]},
    )
    due_this_week = frappe.db.count(
        "GE Tender",
        {"submission_date": ["between", [td, add_days(td, 7)]], "status": ["not in", terminal]},
    )

    # EMD refund pending (safe — field may not exist)
    emd_pending = 0
    try:
        if frappe.db.table_exists("GE EMD PBG Instrument") and frappe.db.has_column("GE EMD PBG Instrument", "refund_status"):
            emd_pending = frappe.db.count("GE EMD PBG Instrument", {"refund_status": "PENDING"})
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            "system": sys_buckets,
            "user": usr_buckets,
            "quick_stats": {
                "total_pipeline": total_pipeline,
                "active_bids": active_bids,
                "won_this_year": won_this_year,
                "emd_pending_refund": emd_pending,
                "overdue": overdue,
                "due_this_week": due_this_week,
            },
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# FUNNEL TENDER LIST (20+ filters)
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_funnel_tenders(
    funnel_color=None,
    user_color_slot=None,
    search=None,
    assignee=None,
    client=None,
    organization=None,
    status=None,
    go_no_go=None,
    technical=None,
    bid_status=None,
    emd_status=None,
    enquiry_pending=None,
    pu_nzd=None,
    submission_date_from=None,
    submission_date_to=None,
    bid_opening_from=None,
    bid_opening_to=None,
    pre_bid_meeting_from=None,
    pre_bid_meeting_to=None,
    corrigendum_date_from=None,
    corrigendum_date_to=None,
    created_from=None,
    created_to=None,
    overdue_only=None,
    due_this_week=None,
    due_this_month=None,
    value_min=None,
    value_max=None,
    emd_min=None,
    emd_max=None,
    pbg_percent_min=None,
    pbg_percent_max=None,
    sort_by=None,
    sort_dir=None,
    page=1,
    limit=50,
):
    """Return tenders for funnel dashboard with 20+ filter options."""
    _ps_read_access()

    sort_by = cstr(sort_by or "submission_date")
    sort_dir_str = cstr(sort_dir or "asc").lower()
    if sort_dir_str not in ("asc", "desc"):
        sort_dir_str = "asc"
    allowed_sorts = {
        "submission_date", "estimated_value", "emd_amount", "creation",
        "tender_owner", "bid_opening_date", "latest_corrigendum_date",
    }
    if sort_by not in allowed_sorts:
        sort_by = "submission_date"

    td = today()
    filters = []
    terminal = ["WON", "LOST", "DROPPED", "CANCELLED", "CONVERTED_TO_PROJECT"]

    if user_color_slot:
        filters.append(["user_color_slot", "=", cstr(user_color_slot)])

    if status:
        sl = [s.strip() for s in cstr(status).split(",") if s.strip()]
        if sl:
            filters.append(["status", "in", sl])

    if go_no_go:
        filters.append(["go_no_go_status", "=", cstr(go_no_go)])

    if technical:
        filters.append(["technical_readiness", "=", cstr(technical)])

    if assignee:
        al = [a.strip() for a in cstr(assignee).split(",") if a.strip()]
        if al:
            filters.append(["tender_owner", "in", al])

    if client:
        cl = [c.strip() for c in cstr(client).split(",") if c.strip()]
        if cl:
            filters.append(["client", "in", cl])

    if organization:
        ol = [o.strip() for o in cstr(organization).split(",") if o.strip()]
        if ol:
            filters.append(["organization", "in", ol])

    def _is_true(val):
        return cstr(val) in ("1", "true", "True", "yes")

    if enquiry_pending is not None:
        filters.append(["enquiry_pending", "=", 1 if _is_true(enquiry_pending) else 0])

    if pu_nzd is not None:
        filters.append(["pu_nzd_qualified", "=", 1 if _is_true(pu_nzd) else 0])

    if submission_date_from:
        filters.append(["submission_date", ">=", submission_date_from])
    if submission_date_to:
        filters.append(["submission_date", "<=", submission_date_to])
    if bid_opening_from:
        filters.append(["bid_opening_date", ">=", bid_opening_from])
    if bid_opening_to:
        filters.append(["bid_opening_date", "<=", bid_opening_to])
    if pre_bid_meeting_from:
        filters.append(["pre_bid_meeting_date", ">=", pre_bid_meeting_from])
    if pre_bid_meeting_to:
        filters.append(["pre_bid_meeting_date", "<=", pre_bid_meeting_to])
    if corrigendum_date_from:
        filters.append(["latest_corrigendum_date", ">=", corrigendum_date_from])
    if corrigendum_date_to:
        filters.append(["latest_corrigendum_date", "<=", corrigendum_date_to])
    if created_from:
        filters.append(["creation", ">=", created_from])
    if created_to:
        filters.append(["creation", "<=", created_to])

    if _is_true(overdue_only):
        filters.append(["submission_date", "<", td])
        filters.append(["status", "not in", terminal])

    if _is_true(due_this_week):
        filters.append(["submission_date", ">=", td])
        filters.append(["submission_date", "<=", add_days(td, 7)])

    if _is_true(due_this_month):
        filters.append(["submission_date", ">=", td])
        filters.append(["submission_date", "<=", add_days(td, 30)])

    if value_min is not None:
        try:
            filters.append(["estimated_value", ">=", float(value_min)])
        except (ValueError, TypeError):
            pass
    if value_max is not None:
        try:
            filters.append(["estimated_value", "<=", float(value_max)])
        except (ValueError, TypeError):
            pass
    if emd_min is not None:
        try:
            filters.append(["emd_amount", ">=", float(emd_min)])
        except (ValueError, TypeError):
            pass
    if emd_max is not None:
        try:
            filters.append(["emd_amount", "<=", float(emd_max)])
        except (ValueError, TypeError):
            pass
    if pbg_percent_min is not None:
        try:
            filters.append(["pbg_percent", ">=", float(pbg_percent_min)])
        except (ValueError, TypeError):
            pass
    if pbg_percent_max is not None:
        try:
            filters.append(["pbg_percent", "<=", float(pbg_percent_max)])
        except (ValueError, TypeError):
            pass

    try:
        limit = min(int(limit or 50), 200)
    except (TypeError, ValueError):
        limit = 50
    try:
        page_num = max(int(page or 1), 1)
    except (TypeError, ValueError):
        page_num = 1
    offset = (page_num - 1) * limit

    # NULL-last sort: rows missing submission_date go to bottom
    order_by_clause = (
        "`tabGE Tender`.{col} IS NULL, "
        "`tabGE Tender`.{col} {dir}, "
        "`tabGE Tender`.creation desc"
    ).format(col=sort_by, dir=sort_dir_str)

    fields = [
        "name", "tender_number", "title", "client", "organization",
        "submission_date", "status", "funnel_status", "estimated_value",
        "emd_required", "emd_amount", "pbg_required", "pbg_amount", "pbg_percent",
        "tender_owner", "go_no_go_status", "technical_readiness",
        "commercial_readiness", "finance_readiness", "submission_status",
        "user_color_slot", "user_color_remarks",
        "enquiry_pending", "pu_nzd_qualified",
        "bid_opening_date", "pre_bid_query_submission_date", "pre_bid_meeting_date",
        "latest_corrigendum_date", "latest_corrigendum_desc",
        "consultant_name", "consultant_contact",
        "tenure_years", "tenure_end_date",
        "closure_letter_received", "presales_closure_date",
        "linked_project", "creation", "modified",
    ]

    data = frappe.get_all(
        "GE Tender",
        filters=filters,
        fields=fields,
        order_by=order_by_clause,
        start=offset,
        page_length=limit + 200,  # over-fetch for post-filter
    )

    # Attach computed funnel status + latest bid
    has_bid_table = frappe.db.table_exists("GE Bid")
    for t in data:
        _attach_computed_tender_funnel_status(t)
        t["funnel_color_key"] = _get_funnel_color_key(t)
        if has_bid_table:
            latest = frappe.get_all(
                "GE Bid",
                filters={"tender": t["name"], "is_latest": 1},
                fields=["name", "status", "bid_amount", "result_date", "bid_date"],
                limit=1,
            )
            t["latest_bid"] = latest[0] if latest else None
        else:
            t["latest_bid"] = None

    # Post-filter: text search
    if search:
        sl = cstr(search).lower()
        data = [
            t for t in data if any(
                sl in cstr(t.get(f) or "").lower()
                for f in ["tender_number", "title", "client", "organization", "consultant_name", "name"]
            )
        ]

    # Post-filter: system funnel color
    if funnel_color:
        data = [t for t in data if t.get("funnel_color_key") == cstr(funnel_color)]

    # Post-filter: bid status
    if bid_status:
        bsl = [b.strip() for b in cstr(bid_status).split(",") if b.strip()]
        if bsl:
            data = [
                t for t in data
                if t.get("latest_bid") and t["latest_bid"].get("status") in bsl
            ]

    # Post-filter: EMD status
    if emd_status == "required_submitted":
        data = [t for t in data if t.get("emd_required")]
    elif emd_status == "not_required":
        data = [t for t in data if not t.get("emd_required")]

    total = len(data)
    data = data[:limit]

    return {
        "success": True,
        "data": data,
        "total": total,
        "page": page_num,
        "limit": limit,
    }


# ─────────────────────────────────────────────────────────────────────────────
# BID CRUD
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_bids(tender=None, status=None, is_latest=None, loi_decision_status=None):
    """Return bids, optionally filtered."""
    _ps_read_access()
    filters = {}
    if tender:
        filters["tender"] = tender
    if status:
        sl = [s.strip() for s in cstr(status).split(",") if s.strip()]
        if sl:
            filters["status"] = ["in", sl]
    if is_latest is not None:
        filters["is_latest"] = 1 if cstr(is_latest) in ("1", "true", "True") else 0
    if loi_decision_status:
        statuses = [s.strip() for s in cstr(loi_decision_status).split(",") if s.strip()]
        if statuses:
            filters["loi_decision_status"] = ["in", statuses]
    data = frappe.get_all(
        "GE Bid",
        filters=filters,
        fields=[
            "name", "tender", "bid_date", "status", "bid_amount",
            "result_date", "result_remarks", "is_latest",
            "retender_reason", "cancel_reason", "creation",
            "loi_decision_status", "loi_decision_reason", "loi_decision_by", "loi_decision_on",
            "loc_request_status", "loc_requested_on", "loc_requested_by",
            "loc_submitted_on", "loc_submitted_by", "loc_submission_remarks",
        ],
        order_by="creation desc",
    )
    return {"success": True, "data": data}


@frappe.whitelist()
def get_bid(name):
    """Return single bid with LOI summary."""
    _ps_read_access()
    name = _local_require_param(name)
    doc = frappe.get_doc("GE Bid", name)
    bid_dict = doc.as_dict()
    tender_doc = frappe.get_doc("GE Tender", doc.tender)
    bid_dict["tender_detail"] = {
        "name": tender_doc.name,
        "tender_number": tender_doc.get("tender_number"),
        "title": tender_doc.get("title"),
        "status": tender_doc.get("status"),
        "client": tender_doc.get("client"),
        "organization": tender_doc.get("organization"),
        "tenure_years": tender_doc.get("tenure_years"),
        "tenure_end_date": tender_doc.get("tenure_end_date"),
        "closure_letter_received": tender_doc.get("closure_letter_received"),
        "presales_closure_date": tender_doc.get("presales_closure_date"),
        "bid_denied_reason": tender_doc.get("bid_denied_reason"),
    }

    loi_rows = []
    if frappe.db.table_exists("GE LOI Tracker"):
        loi_rows = frappe.get_all(
            "GE LOI Tracker",
            filters={"bid": name},
            fields=["name", "department", "loi_expected_by", "loi_received", "loi_received_date", "remarks"],
        )
    bid_dict["loi_tracker"] = loi_rows
    bid_dict["loi_n_expected"] = len(loi_rows)
    bid_dict["loi_n_received"] = sum(1 for r in loi_rows if r.get("loi_received"))
    return {"success": True, "data": bid_dict}


@frappe.whitelist()
def create_bid(tender, bid_amount=0, bid_date=None):
    """Create a bid. Tender must be in GREEN (Bid Ready) state."""
    _ps_write_access()
    tender = _local_require_param(tender, "tender")
    tender_doc = frappe.get_doc("GE Tender", tender)
    funnel = _derive_tender_funnel_status(tender_doc.as_dict())
    if funnel != "EMD done and technical confirmed":
        return {
            "success": False,
            "message": "Bids can only be created on GREEN (Bid Ready) tenders. Current funnel: {}".format(funnel),
        }
    # Mark any previous bid as not latest
    frappe.db.set_value("GE Bid", {"tender": tender, "is_latest": 1}, "is_latest", 0)
    doc = frappe.get_doc({
        "doctype": "GE Bid",
        "tender": tender,
        "bid_date": bid_date or today(),
        "bid_amount": float(bid_amount or 0),
        "status": "UNDER_EVALUATION",
        "is_latest": 1,
    })
    doc.insert()
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Bid created and moved under evaluation"}


@frappe.whitelist()
def set_tender_qualification(name, qualified=None, reason=None):
    """Set presales qualification outcome after GO/NO-GO approval."""
    _ps_write_access()
    name = _local_require_param(name, "name")
    doc = frappe.get_doc("GE Tender", name)
    if cstr(doc.go_no_go_status or "PENDING") != "GO":
        return {"success": False, "message": "Tender must be GO before qualification can be updated"}

    is_qualified = cstr(qualified).lower() in ("1", "true", "yes", "qualified")
    if not is_qualified and not cstr(reason or "").strip():
        return {"success": False, "message": "Reason is required when qualification is rejected"}

    doc.commercial_readiness = "APPROVED" if is_qualified else "REJECTED"
    doc.qualification_reason = cstr(reason or "")
    doc.bid_denied_by_presales = 0
    if is_qualified:
        doc.status = "TECHNICAL_IN_PROGRESS"
    else:
        doc.technical_readiness = "NOT_STARTED"
        doc.status = "TECHNICAL_IN_PROGRESS"
    doc.save()
    frappe.db.commit()
    return {
        "success": True,
        "data": doc.as_dict(),
        "message": "Tender qualification marked as {}".format("qualified" if is_qualified else "not qualified"),
    }


@frappe.whitelist()
def mark_tender_under_observation(name, reason=None):
    """Move a rejected tender into observation with a mandatory reason."""
    _ps_write_access()
    name = _local_require_param(name, "name")
    reason = cstr(reason or "").strip()
    if not reason:
        return {"success": False, "message": "Reason is required to keep a tender under observation"}

    doc = frappe.get_doc("GE Tender", name)
    funnel = _derive_tender_funnel_status(doc.as_dict())
    if funnel not in ("Not Qualified Tender", "Locked Tender", "Tender not bided but under observation"):
        return {"success": False, "message": "Under observation is only available for red, orange, or pink tenders"}

    doc.bid_denied_by_presales = 1
    doc.bid_denied_reason = reason
    doc.status = "DROPPED"
    doc.save()
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Tender moved under observation"}


@frappe.whitelist()
def clear_tender_observation(name):
    """Clear observation marker and reopen the tender at its current stage."""
    _ps_write_access()
    name = _local_require_param(name, "name")
    doc = frappe.get_doc("GE Tender", name)
    doc.bid_denied_by_presales = 0
    doc.bid_denied_reason = ""
    if cstr(doc.go_no_go_status or "") == "NO_GO":
        doc.status = "NO_GO"
    elif cstr(doc.technical_readiness or "") == "REJECTED":
        doc.status = "TECHNICAL_IN_PROGRESS"
    elif cstr(doc.commercial_readiness or "") == "REJECTED":
        doc.status = "TECHNICAL_IN_PROGRESS"
    else:
        doc.status = "DRAFT"
    doc.save()
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Tender observation cleared"}


@frappe.whitelist()
def convert_tender_to_bid(name):
    """Create the latest bid for a green tender and place it directly under evaluation."""
    _ps_write_access()
    name = _local_require_param(name, "name")
    result = create_bid(tender=name)
    if not result.get("success"):
        return result
    doc = frappe.get_doc("GE Tender", name)
    doc.status = "UNDER_EVALUATION"
    doc.save()
    frappe.db.commit()
    return {"success": True, "data": result.get("data"), "message": "Bid created from tender and moved under evaluation"}


@frappe.whitelist()
def update_bid(name, data):
    """Update safe fields on a bid."""
    _ps_write_access()
    name = _local_require_param(name)
    values = json.loads(data) if isinstance(data, str) else (data or {})
    doc = frappe.get_doc("GE Bid", name)
    allowed_update_fields = {"bid_amount", "bid_date", "result_remarks"}
    for k, v in values.items():
        if k in allowed_update_fields:
            doc.set(k, v)
    doc.save()
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict()}


# ─────────────────────────────────────────────────────────────────────────────
# BID LIFECYCLE
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def submit_bid(name):
    """DRAFT → SUBMITTED. Moves tender status to SUBMITTED (Orange)."""
    _ps_write_access()
    name = _local_require_param(name)
    doc = frappe.get_doc("GE Bid", name)
    if doc.status != "DRAFT":
        return {"success": False, "message": "Only DRAFT bids can be submitted. Current: {}".format(doc.status)}
    doc.status = "SUBMITTED"
    doc.save()
    frappe.db.set_value("GE Tender", doc.tender, "status", "SUBMITTED")
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Bid submitted — Tender is now Locked (Orange)"}


@frappe.whitelist()
def mark_bid_under_evaluation(name):
    """Move a legacy DRAFT/SUBMITTED bid into UNDER_EVALUATION."""
    _ps_write_access()
    name = _local_require_param(name)
    doc = frappe.get_doc("GE Bid", name)
    if doc.status not in ("DRAFT", "SUBMITTED"):
        return {"success": False, "message": "Bid must be DRAFT or SUBMITTED. Current: {}".format(doc.status)}
    doc.status = "UNDER_EVALUATION"
    doc.save()
    frappe.db.set_value("GE Tender", doc.tender, "status", "UNDER_EVALUATION")
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Bid moved under evaluation"}


@frappe.whitelist()
def mark_bid_won(name, result_date=None, remarks=None):
    """Mark bid WON → tender WON."""
    _ps_write_access()
    name = _local_require_param(name)
    doc = frappe.get_doc("GE Bid", name)
    if doc.status not in ("SUBMITTED", "UNDER_EVALUATION"):
        return {"success": False, "message": "Bid must be SUBMITTED or UNDER_EVALUATION. Current: {}".format(doc.status)}
    doc.status = "WON"
    doc.result_date = result_date or today()
    doc.result_remarks = cstr(remarks or "")
    doc.save()
    tender_doc = frappe.get_doc("GE Tender", doc.tender)
    tender_doc.status = "WON"
    tender_doc.save()
    _sync_result_tracker(tender_doc)
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Bid WON"}


@frappe.whitelist()
def mark_bid_lost(name, result_date=None, remarks=None):
    """Mark bid LOST → tender LOST."""
    _ps_write_access()
    name = _local_require_param(name)
    doc = frappe.get_doc("GE Bid", name)
    if doc.status not in ("SUBMITTED", "UNDER_EVALUATION"):
        return {"success": False, "message": "Bid must be SUBMITTED or UNDER_EVALUATION. Current: {}".format(doc.status)}
    doc.status = "LOST"
    doc.result_date = result_date or today()
    doc.result_remarks = cstr(remarks or "")
    doc.save()
    tender_doc = frappe.get_doc("GE Tender", doc.tender)
    tender_doc.status = "LOST"
    tender_doc.save()
    _sync_result_tracker(tender_doc)
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Bid marked LOST"}


@frappe.whitelist()
def mark_bid_cancelled(name, reason=None):
    """Cancel a bid. Not allowed in terminal states."""
    _ps_write_access()
    name = _local_require_param(name)
    reason = cstr(reason or "").strip()
    if not reason:
        return {"success": False, "message": "Reason is required to cancel a bid"}
    doc = frappe.get_doc("GE Bid", name)
    if doc.status in ("WON", "LOST", "CANCEL", "RETENDER"):
        return {"success": False, "message": "Cannot cancel a bid in {} state".format(doc.status)}
    doc.status = "CANCEL"
    doc.cancel_reason = reason
    doc.save()
    tender_doc = frappe.get_doc("GE Tender", doc.tender)
    tender_doc.bid_denied_by_presales = 1
    tender_doc.bid_denied_reason = reason
    tender_doc.save()
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Bid cancelled"}


@frappe.whitelist()
def mark_bid_retender(name, reason=None):
    """Retender: reset tender back to BLUE (new evaluation cycle)."""
    _ps_write_access()
    name = _local_require_param(name)
    reason = cstr(reason or "").strip()
    if not reason:
        return {"success": False, "message": "Reason is required to retender a bid"}
    doc = frappe.get_doc("GE Bid", name)
    doc.status = "RETENDER"
    doc.retender_reason = reason
    doc.is_latest = 0
    doc.save()
    # Full reset of tender for new cycle
    tender_doc = frappe.get_doc("GE Tender", doc.tender)
    tender_doc.status = "DRAFT"
    tender_doc.go_no_go_status = "PENDING"
    tender_doc.technical_readiness = "NOT_STARTED"
    tender_doc.commercial_readiness = "NOT_STARTED"
    tender_doc.finance_readiness = "NOT_STARTED"
    tender_doc.submission_status = "NOT_READY"
    if hasattr(tender_doc, "bid_denied_by_presales"):
        tender_doc.bid_denied_by_presales = 0
    if hasattr(tender_doc, "bid_denied_reason"):
        tender_doc.bid_denied_reason = reason
    tender_doc.save()
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "Retender initiated — Tender reset to BLUE"}


# ─────────────────────────────────────────────────────────────────────────────
# LOI TRACKER APIs
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def decide_won_bid_loi(name, decision=None, reason=None):
    """Accept or reject a won bid after all required LOIs are received."""
    _ps_write_access()
    name = _local_require_param(name)
    decision = cstr(decision or "").strip().upper()
    reason = cstr(reason or "").strip()
    if decision not in ("ACCEPT", "REJECT"):
        return {"success": False, "message": "Decision must be ACCEPT or REJECT"}

    doc = frappe.get_doc("GE Bid", name)
    if doc.status != "WON":
        return {"success": False, "message": "Only won bids can go through LOI decision"}

    loi_summary = get_loi_status(doc.name).get("data") or {}
    if not loi_summary.get("all_received"):
        return {"success": False, "message": "All department LOIs must be received before final decision"}

    if decision == "REJECT" and not reason:
        return {"success": False, "message": "Reason is required when rejecting a won bid"}

    doc.loi_decision_status = "ACCEPTED" if decision == "ACCEPT" else "REJECTED"
    doc.loi_decision_reason = reason
    doc.loi_decision_by = frappe.session.user
    doc.loi_decision_on = now()
    if decision == "REJECT":
        doc.status = "CANCEL"
        doc.cancel_reason = reason
    doc.save()

    tender_doc = frappe.get_doc("GE Tender", doc.tender)
    if decision == "REJECT":
        tender_doc.bid_denied_by_presales = 1
        tender_doc.bid_denied_reason = reason
        tender_doc.status = "DROPPED"
    tender_doc.save()
    frappe.db.commit()
    return {
        "success": True,
        "data": doc.as_dict(),
        "message": "Won bid {}".format("accepted for in-process bid tracking" if decision == "ACCEPT" else "rejected and moved to cancel bid"),
    }


@frappe.whitelist()
def get_loi_status(bid):
    """Return LOI tracker rows + summary for a bid."""
    _ps_read_access()
    bid = _local_require_param(bid, "bid")
    rows = []
    if frappe.db.table_exists("GE LOI Tracker"):
        rows = frappe.get_all(
            "GE LOI Tracker",
            filters={"bid": bid},
            fields=["name", "department", "loi_expected_by", "loi_received",
                    "loi_received_date", "loi_document", "remarks"],
            order_by="creation asc",
        )
    return {
        "success": True,
        "data": {
            "rows": rows,
            "n_expected": len(rows),
            "n_received": sum(1 for r in rows if r.get("loi_received")),
            "all_received": all(r.get("loi_received") for r in rows) if rows else False,
        },
    }


@frappe.whitelist()
def create_loi_tracker(bid, department=None, loi_expected_by=None, remarks=None):
    """Add a LOI tracker row for a bid."""
    _ps_write_access()
    bid = _local_require_param(bid, "bid")
    bid_doc = frappe.get_doc("GE Bid", bid)
    doc = frappe.get_doc({
        "doctype": "GE LOI Tracker",
        "bid": bid,
        "tender": bid_doc.tender,
        "department": department or "",
        "loi_expected_by": loi_expected_by or "",
        "loi_received": 0,
        "remarks": cstr(remarks or ""),
    })
    doc.insert()
    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "LOI row added"}


@frappe.whitelist()
def mark_loi_received(name, loi_received_date=None, loi_document=None):
    """Mark a LOI row as received."""
    _ps_write_access()
    name = _local_require_param(name)
    doc = frappe.get_doc("GE LOI Tracker", name)
    doc.loi_received = 1
    doc.loi_received_date = loi_received_date or today()
    if loi_document:
        doc.loi_document = loi_document
    doc.save()
    frappe.db.commit()
    loi_summary = get_loi_status(doc.bid).get("data")
    return {
        "success": True,
        "data": doc.as_dict(),
        "loi_summary": loi_summary,
        "message": "LOI received",
    }


# ─────────────────────────────────────────────────────────────────────────────
# TENDER CLOSURE
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def record_om_completion_letter(tender_name, completion_date=None):
    """Record O&M completion letter receipt for this tender."""
    _ps_write_access()
    tender_name = _local_require_param(tender_name, "tender_name")
    doc = frappe.get_doc("GE Tender", tender_name)
    doc.closure_letter_received = 1
    if completion_date and hasattr(doc, "tenure_end_date"):
        doc.tenure_end_date = completion_date
    doc.save()
    frappe.db.commit()
    return {"success": True, "message": "O&M Completion Letter recorded"}


@frappe.whitelist()
def send_loc_request_to_project_head(name):
    """Raise LOC request for Project Head once an in-process bid nears completion."""
    _ps_write_access()
    name = _local_require_param(name)
    doc = frappe.get_doc("GE Bid", name)
    if doc.status != "WON" or cstr(doc.loi_decision_status or "") != "ACCEPTED":
        return {"success": False, "message": "LOC request is only available for accepted in-process bids"}
    if cstr(doc.loc_request_status or "NOT_REQUESTED") == "SUBMITTED":
        return {"success": False, "message": "LOC has already been submitted by Project Head"}

    tender_doc = frappe.get_doc("GE Tender", doc.tender)
    if not _is_loc_window_active(tender_doc):
        return {"success": False, "message": "LOC request can only be raised when tenure is nearing completion"}

    doc.loc_request_status = "REQUESTED"
    doc.loc_requested_on = now()
    doc.loc_requested_by = frappe.session.user
    doc.save()

    route_path = "/engineering/letter-of-submission"
    from gov_erp.gov_erp.doctype.ge_alert.ge_alert import create_alert

    for user in _get_users_for_role(ROLE_PROJECT_HEAD):
        create_alert(
            event_type="general",
            recipient_user=user,
            summary="LOC request received for bid {}".format(doc.name),
            actor=frappe.session.user,
            reference_doctype="GE Bid",
            reference_name=doc.name,
            detail="Submit the Letter of Completion for tender {} in the Project Head workspace.".format(doc.tender),
            route_path=route_path,
        )

    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "LOC request sent to Project Head"}


@frappe.whitelist()
def get_project_head_loc_requests(status=None):
    """Return in-process bids that are in the LOC request/submission cycle."""
    _project_head_submission_access()
    requested_statuses = [s.strip().upper() for s in cstr(status or "REQUESTED,SUBMITTED").split(",") if s.strip()]
    bids = frappe.get_all(
        "GE Bid",
        filters={
            "status": "WON",
            "is_latest": 1,
            "loi_decision_status": "ACCEPTED",
            "loc_request_status": ["in", requested_statuses],
        },
        fields=[
            "name", "tender", "loc_request_status", "loc_requested_on", "loc_requested_by",
            "loc_submitted_on", "loc_submitted_by", "loc_submission_remarks",
        ],
        order_by="modified desc",
    ) or []
    rows = []
    for row in bids:
        tender_detail = frappe.db.get_value(
            "GE Tender",
            row.get("tender"),
            ["name", "tender_number", "title", "client", "organization", "tenure_years", "tenure_end_date"],
            as_dict=1,
        ) or {}
        rows.append({
            "bid_id": row.get("name"),
            "tender_id": tender_detail.get("name") or row.get("tender"),
            "tender_number": tender_detail.get("tender_number") or row.get("tender"),
            "tender_title": tender_detail.get("title") or "",
            "client": tender_detail.get("client") or "",
            "organization": tender_detail.get("organization") or "",
            "tenure_years": tender_detail.get("tenure_years") or 0,
            "tenure_end_date": tender_detail.get("tenure_end_date") or "",
            "loc_request_status": cstr(row.get("loc_request_status") or "NOT_REQUESTED").upper(),
            "loc_requested_on": row.get("loc_requested_on"),
            "loc_requested_by": row.get("loc_requested_by"),
            "loc_submitted_on": row.get("loc_submitted_on"),
            "loc_submitted_by": row.get("loc_submitted_by"),
            "loc_submission_remarks": row.get("loc_submission_remarks") or "",
        })
    return {"success": True, "data": rows}


@frappe.whitelist()
def submit_loc_by_project_head(name, submission_date=None, remarks=None):
    """Project Head submits LOC against a requested in-process bid."""
    _project_head_access()
    name = _local_require_param(name)
    doc = frappe.get_doc("GE Bid", name)
    if cstr(doc.loc_request_status or "NOT_REQUESTED") != "REQUESTED":
        return {"success": False, "message": "LOC submission is only available after a presales request"}

    doc.loc_request_status = "SUBMITTED"
    doc.loc_submitted_on = submission_date or today()
    doc.loc_submitted_by = frappe.session.user
    doc.loc_submission_remarks = cstr(remarks or "")
    doc.save()

    tender_doc = frappe.get_doc("GE Tender", doc.tender)
    tender_doc.closure_letter_received = 1
    if submission_date and hasattr(tender_doc, "tenure_end_date"):
        tender_doc.tenure_end_date = submission_date
    tender_doc.save()

    from gov_erp.gov_erp.doctype.ge_alert.ge_alert import create_alert

    for user in _get_users_for_role(ROLE_PRESALES_HEAD):
        create_alert(
            event_type="general",
            recipient_user=user,
            summary="Project Head submitted LOC for bid {}".format(doc.name),
            actor=frappe.session.user,
            reference_doctype="GE Bid",
            reference_name=doc.name,
            detail="LOC submission is available for review in the bid workspace.",
            route_path="/pre-sales/bids/{}".format(doc.name),
        )

    frappe.db.commit()
    return {"success": True, "data": doc.as_dict(), "message": "LOC submitted successfully"}


@frappe.whitelist()
def mark_tender_closure(tender_name, closure_date=None, remarks=None):
    """Formally close a tender. Presales Head or Director only. O&M letter must be recorded first."""
    _ps_read_access()
    user_roles = set(frappe.get_roles(frappe.session.user))
    if not user_roles.intersection({ROLE_PRESALES_HEAD, ROLE_DIRECTOR, ROLE_SYSTEM_MANAGER}):
        frappe.throw("Only Presales Head or Director can formally close tenders", frappe.PermissionError)
    tender_name = _local_require_param(tender_name, "tender_name")
    doc = frappe.get_doc("GE Tender", tender_name)
    if not doc.closure_letter_received:
        return {"success": False, "message": "O&M Completion Letter must be recorded before closure"}
    doc.presales_closure_date = closure_date or today()
    if hasattr(doc, "presales_closure_by"):
        doc.presales_closure_by = frappe.session.user
    doc.status = "DROPPED"
    doc.save()
    frappe.db.commit()
    return {"success": True, "message": "Tender formally closed"}
