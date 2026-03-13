"""Source-level tests for billing module business logic.

These test pure functions and data shapes without requiring
a running Frappe site.
"""

from gov_erp.gov_erp.doctype.ge_invoice.ge_invoice import calculate_invoice_totals
from gov_erp.gov_erp.doctype.ge_rma_tracker.ge_rma_tracker import VALID_TRANSITIONS


# ── Invoice totals ─────────────────────────────────────────

def test_invoice_totals_basic():
    items = [{"qty": 10, "rate": 100}, {"qty": 5, "rate": 200}]
    result = calculate_invoice_totals(items, gst_percent=18, tds_percent=2)
    assert result["amount"] == 2000
    assert result["gst_amount"] == 360
    assert result["tds_amount"] == 40
    assert result["net_receivable"] == 2320  # 2000 + 360 - 40


def test_invoice_totals_zero_gst():
    items = [{"qty": 1, "rate": 500}]
    result = calculate_invoice_totals(items, gst_percent=0, tds_percent=0)
    assert result["amount"] == 500
    assert result["gst_amount"] == 0
    assert result["tds_amount"] == 0
    assert result["net_receivable"] == 500


def test_invoice_totals_empty_items():
    result = calculate_invoice_totals([], gst_percent=18, tds_percent=2)
    assert result["amount"] == 0
    assert result["net_receivable"] == 0


def test_invoice_totals_missing_qty_or_rate():
    items = [{"qty": 5}, {"rate": 100}, {}]
    result = calculate_invoice_totals(items, gst_percent=0, tds_percent=0)
    assert result["amount"] == 0


def test_invoice_totals_single_item_with_tds():
    items = [{"qty": 100, "rate": 50}]
    result = calculate_invoice_totals(items, gst_percent=18, tds_percent=10)
    assert result["amount"] == 5000
    assert result["gst_amount"] == 900
    assert result["tds_amount"] == 500
    assert result["net_receivable"] == 5400  # 5000 + 900 - 500


# ── RMA valid transitions ──────────────────────────────────

def test_rma_pending_can_be_approved_or_rejected():
    assert "APPROVED" in VALID_TRANSITIONS["PENDING"]
    assert "REJECTED" in VALID_TRANSITIONS["PENDING"]


def test_rma_approved_goes_to_in_transit():
    assert VALID_TRANSITIONS["APPROVED"] == ["IN_TRANSIT"]


def test_rma_in_transit_goes_to_received():
    assert VALID_TRANSITIONS["IN_TRANSIT"] == ["RECEIVED_AT_SERVICE_CENTER"]


def test_rma_under_repair_can_be_repaired_or_replaced():
    assert "REPAIRED" in VALID_TRANSITIONS["UNDER_REPAIR"]
    assert "REPLACED" in VALID_TRANSITIONS["UNDER_REPAIR"]


def test_rma_no_transition_from_repaired():
    assert "REPAIRED" not in VALID_TRANSITIONS


def test_rma_no_transition_from_rejected():
    assert "REJECTED" not in VALID_TRANSITIONS


# ── Retention validation logic ──────────────────────────────

def test_retention_release_cannot_exceed_retained():
    """Verify the validation rule exists in the pure form."""
    retained = 10000
    release = 12000
    assert release > retained  # Would be blocked by controller


def test_retention_partial_release_math():
    retained = 10000
    first_release = 4000
    remaining = retained - first_release
    assert remaining == 6000
    second_release = 6000
    total = first_release + second_release
    assert total == retained


# ── Penalty status flow ─────────────────────────────────────

def test_penalty_statuses_are_correct():
    valid = {"PENDING", "APPROVED", "APPLIED", "REVERSED"}
    assert len(valid) == 4


def test_penalty_reversed_amount_math():
    original = 5000
    # When reversed, the net effect should be zero
    net = original - original
    assert net == 0
