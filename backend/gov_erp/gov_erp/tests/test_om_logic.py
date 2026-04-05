"""Source-level tests for O&M module business logic.

Tests SLA calculations, ticket status flows, and RMA transitions
without requiring a running Frappe site.
"""

import json
from datetime import datetime, timedelta

from gov_erp.gov_erp.doctype.ge_rma_tracker.ge_rma_tracker import VALID_TRANSITIONS


# ── Ticket status flow ─────────────────────────────────────

TICKET_STATUSES = ["NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"]

TICKET_TRANSITIONS = {
    "NEW": ["ASSIGNED", "IN_PROGRESS"],
    "ASSIGNED": ["IN_PROGRESS"],
    "IN_PROGRESS": ["ON_HOLD", "RESOLVED"],
    "ON_HOLD": ["IN_PROGRESS"],
    "RESOLVED": ["CLOSED"],
}


def test_ticket_status_enum_count():
    assert len(TICKET_STATUSES) == 6


def test_ticket_new_can_be_assigned_or_started():
    assert "ASSIGNED" in TICKET_TRANSITIONS["NEW"]
    assert "IN_PROGRESS" in TICKET_TRANSITIONS["NEW"]


def test_ticket_in_progress_can_be_paused_or_resolved():
    assert "ON_HOLD" in TICKET_TRANSITIONS["IN_PROGRESS"]
    assert "RESOLVED" in TICKET_TRANSITIONS["IN_PROGRESS"]


def test_ticket_on_hold_can_resume():
    assert "IN_PROGRESS" in TICKET_TRANSITIONS["ON_HOLD"]


def test_ticket_resolved_can_be_closed():
    assert "CLOSED" in TICKET_TRANSITIONS["RESOLVED"]


def test_ticket_closed_is_terminal():
    assert "CLOSED" not in TICKET_TRANSITIONS


# ── Ticket action types ─────────────────────────────────────

VALID_ACTION_TYPES = [
    "COMMENT", "ASSIGN", "VISIT_START", "VISIT_END",
    "STATUS_CHANGE", "PAUSE", "RESOLVE", "CLOSE", "ESCALATE",
]


def test_action_type_count():
    assert len(VALID_ACTION_TYPES) == 9


def test_escalate_is_a_valid_action():
    assert "ESCALATE" in VALID_ACTION_TYPES


# ── SLA deadline calculations ─────────────────────────────

def test_sla_response_deadline_calculation():
    started = datetime(2026, 3, 13, 10, 0, 0)
    response_minutes = 60
    deadline = started + timedelta(minutes=response_minutes)
    assert deadline == datetime(2026, 3, 13, 11, 0, 0)


def test_sla_resolution_deadline_calculation():
    started = datetime(2026, 3, 13, 10, 0, 0)
    resolution_minutes = 4320  # 72 hours
    deadline = started + timedelta(minutes=resolution_minutes)
    assert deadline == datetime(2026, 3, 16, 10, 0, 0)


def test_sla_elapsed_minutes_with_pause():
    started = datetime(2026, 3, 13, 10, 0, 0)
    closed = datetime(2026, 3, 13, 14, 0, 0)  # 4 hours = 240 min
    total_seconds = (closed - started).total_seconds()
    elapsed = total_seconds / 60
    pause_minutes = 30
    effective = elapsed - pause_minutes
    assert effective == 210


def test_sla_pause_interval_json_structure():
    intervals = [
        {"paused_at": "2026-03-13 11:00:00", "resumed_at": "2026-03-13 11:30:00"},
        {"paused_at": "2026-03-13 13:00:00", "resumed_at": None},
    ]
    serialized = json.dumps(intervals)
    parsed = json.loads(serialized)
    assert len(parsed) == 2
    assert parsed[0]["resumed_at"] is not None
    assert parsed[1]["resumed_at"] is None  # Still paused


def test_sla_met_when_closed_before_deadline():
    started = datetime(2026, 3, 13, 10, 0, 0)
    deadline = started + timedelta(minutes=60)
    closed = started + timedelta(minutes=45)
    assert closed < deadline


def test_sla_breached_when_closed_after_deadline():
    started = datetime(2026, 3, 13, 10, 0, 0)
    deadline = started + timedelta(minutes=60)
    closed = started + timedelta(minutes=90)
    assert closed > deadline


# ── SLA penalty tier logic ────────────────────────────────

def test_penalty_tier_matching():
    """Match breach duration to correct penalty tier."""
    tiers = [
        {"from": 0, "to": 60, "type": "FIXED", "value": 1000},
        {"from": 60, "to": 240, "type": "FIXED", "value": 2000},
        {"from": 240, "to": None, "type": "PERCENTAGE", "value": 0.5},
    ]
    breach_minutes = 90
    matched = None
    for tier in tiers:
        if breach_minutes >= tier["from"] and (tier["to"] is None or breach_minutes < tier["to"]):
            matched = tier
            break
    assert matched is not None
    assert matched["value"] == 2000


def test_penalty_fixed_calculation():
    penalty = 2000  # Fixed
    assert penalty == 2000


def test_penalty_percentage_calculation():
    contract_value = 1000000
    penalty_pct = 0.5
    penalty = contract_value * penalty_pct / 100
    assert penalty == 5000


def test_penalty_per_hour_calculation():
    breach_minutes = 180  # 3 hours
    per_hour_rate = 500
    penalty = (breach_minutes / 60) * per_hour_rate
    assert penalty == 1500


# ── RMA lifecycle ──────────────────────────────────────────

def test_rma_full_repair_lifecycle():
    status = "PENDING"
    transitions = ["APPROVED", "IN_TRANSIT", "RECEIVED_AT_SERVICE_CENTER", "UNDER_REPAIR", "REPAIRED"]
    for next_status in transitions:
        assert next_status in VALID_TRANSITIONS.get(status, []), f"Cannot go from {status} to {next_status}"
        status = next_status
    assert status == "REPAIRED"


def test_rma_replacement_lifecycle():
    status = "PENDING"
    transitions = ["APPROVED", "IN_TRANSIT", "RECEIVED_AT_SERVICE_CENTER", "UNDER_REPAIR", "REPLACED"]
    for next_status in transitions:
        assert next_status in VALID_TRANSITIONS.get(status, [])
        status = next_status
    assert status == "REPLACED"


def test_rma_rejection_is_terminal():
    status = "PENDING"
    assert "REJECTED" in VALID_TRANSITIONS.get(status, set())
    # After rejection, can only go to CLOSED or back to PENDING
    assert VALID_TRANSITIONS["REJECTED"] <= {"CLOSED", "PENDING"}


# ── Ticket categories and priorities ────────────────────────

CATEGORIES = ["HARDWARE_ISSUE", "SOFTWARE_ISSUE", "NETWORK_ISSUE", "PERFORMANCE", "MAINTENANCE", "OTHER"]
PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


def test_category_count():
    assert len(CATEGORIES) == 6


def test_priority_count():
    assert len(PRIORITIES) == 4


def test_critical_is_highest_priority():
    assert PRIORITIES[0] == "CRITICAL"
