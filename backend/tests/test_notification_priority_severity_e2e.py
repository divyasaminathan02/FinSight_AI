"""
FinSight AI - Notification Priority and Severity Automated E2E Test Suite
Validates:
1. Dynamic Business Rule Determination for Priority (LOW, NORMAL, HIGH, URGENT) and Severity (INFO, WARNING, CRITICAL)
2. Exact matching for all specified rule examples:
   - EMI approaching -> Priority: NORMAL, Severity: INFO
   - Document required -> Priority: HIGH, Severity: WARNING
   - Payment failed -> Priority: HIGH, Severity: WARNING
   - Fraud alert -> Priority: URGENT, Severity: CRITICAL
   - Liquidity alert -> Priority: URGENT, Severity: CRITICAL
   - System failure -> Priority: URGENT, Severity: CRITICAL
3. Database persistence of priority, severity, category, status, event_key
4. In-place deduplication when event changes state
5. Audit log tracking for all priority and severity modifications
6. Multi-tier sorting (URGENT/HIGH first -> Severity -> Newest timestamp)
7. Multi-dimensional filtering (Priority, Severity, Category, Read/Unread, Date)
8. User-scoped unread count badge calculation
"""

import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.notifications import Notification
from app.models.users import User, UserRole, AuditLog
from app.config import settings
from app.security.jwt import get_password_hash

client = TestClient(app)


def _get_token(email: str, name: str, role: UserRole) -> str:
    email = email.lower().strip()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                full_name=name,
                hashed_password=get_password_hash(settings.DEMO_PASSWORD),
                role=role,
                department="Risk Management",
                is_active=True
            )
            db.add(user)
            db.commit()
        else:
            user.hashed_password = get_password_hash(settings.DEMO_PASSWORD)
            user.role = role
            user.is_active = True
            db.commit()
    finally:
        db.close()

    res = client.post("/api/auth/login", json={
        "email": email,
        "password": settings.DEMO_PASSWORD
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def test_priority_and_severity_business_rules():
    """
    Validates dynamic business rules derivation for all required Prompt examples:
    - EMI approaching -> Priority: NORMAL, Severity: INFO
    - Document required -> Priority: HIGH, Severity: WARNING
    - Payment failed -> Priority: HIGH, Severity: WARNING
    - Fraud alert -> Priority: URGENT, Severity: CRITICAL
    - Liquidity alert -> Priority: URGENT, Severity: CRITICAL
    - System failure -> Priority: URGENT, Severity: CRITICAL
    """
    token = _get_token("notif.tester@finsight.ai", "Notif Tester", UserRole.RISK_MANAGER)
    headers = {"Authorization": f"Bearer {token}"}

    test_cases = [
        {
            "payload": {
                "title": "EMI payment reminder due in 2 days",
                "message": "Installment of INR 12,000 approaching due date.",
                "event_type": "EMI_APPROACHING",
                "category": "Customer Servicing",
                "event_key": f"EMI_TEST_{uuid.uuid4().hex[:6]}"
            },
            "expected_priority": "NORMAL",
            "expected_severity": "INFO"
        },
        {
            "payload": {
                "title": "KYC Document required for verification",
                "message": "Customer salary slip is missing or corrupted. Document required.",
                "event_type": "DOCUMENT_REQUIRED",
                "category": "Compliance",
                "event_key": f"DOC_TEST_{uuid.uuid4().hex[:6]}"
            },
            "expected_priority": "HIGH",
            "expected_severity": "WARNING"
        },
        {
            "payload": {
                "title": "Borrower ACH Payment failed",
                "message": "NACH mandate bounce returned from clearing bank.",
                "event_type": "PAYMENT_FAILED",
                "category": "Collections",
                "event_key": f"PAY_TEST_{uuid.uuid4().hex[:6]}"
            },
            "expected_priority": "HIGH",
            "expected_severity": "WARNING"
        },
        {
            "payload": {
                "title": "Synthetic identity fraud alert detected",
                "message": "Device collision across multiple high-velocity applications.",
                "event_type": "FRAUD_ALERT",
                "category": "Fraud Alert",
                "event_key": f"FRAUD_TEST_{uuid.uuid4().hex[:6]}"
            },
            "expected_priority": "URGENT",
            "expected_severity": "CRITICAL"
        },
        {
            "payload": {
                "title": "ALM liquidity alert LCR threshold breach",
                "message": "Regulatory liquidity buffer ratio projected below minimum safety cushion.",
                "event_type": "LIQUIDITY_ALERT",
                "category": "Liquidity Alert",
                "event_key": f"LIQ_TEST_{uuid.uuid4().hex[:6]}"
            },
            "expected_priority": "URGENT",
            "expected_severity": "CRITICAL"
        },
        {
            "payload": {
                "title": "Core banking system failure in payment gateway",
                "message": "Critical API outage detected across payment rail connections.",
                "event_type": "SYSTEM_FAILURE",
                "category": "System",
                "event_key": f"SYS_TEST_{uuid.uuid4().hex[:6]}"
            },
            "expected_priority": "URGENT",
            "expected_severity": "CRITICAL"
        }
    ]

    for tc in test_cases:
        res = client.post("/api/notifications", json=tc["payload"], headers=headers)
        assert res.status_code == 200, f"Failed for {tc['payload']['event_type']}: {res.text}"
        data = res.json()["notification"]
        assert data["priority"] == tc["expected_priority"], (
            f"Expected priority {tc['expected_priority']} for {tc['payload']['event_type']}, got {data['priority']}"
        )
        assert data["severity"] == tc["expected_severity"], (
            f"Expected severity {tc['expected_severity']} for {tc['payload']['event_type']}, got {data['severity']}"
        )


def test_database_persistence_and_in_place_deduplication():
    """
    Validates:
    1. Priority and severity are persisted in SQLite database.
    2. When an event changes state, update existing notification in place instead of creating duplicate notifications.
    """
    token = _get_token("risk.eval@finsight.ai", "Risk Eval", UserRole.RISK_MANAGER)
    headers = {"Authorization": f"Bearer {token}"}

    unique_key = f"APP_STATE_CHANGE_{uuid.uuid4().hex[:8]}"

    # Step 1: Initial event creation
    init_res = client.post("/api/notifications", json={
        "title": "Loan Application under initial review",
        "message": "KYC documents uploaded, pending compliance review.",
        "event_type": "DOCUMENT_REQUIRED",
        "category": "Compliance",
        "event_key": unique_key
    }, headers=headers)
    assert init_res.status_code == 200
    init_notif = init_res.json()["notification"]
    notif_id = init_notif["notification_id"]
    assert init_notif["priority"] == "HIGH"
    assert init_notif["severity"] == "WARNING"

    # Step 2: Event changes state to critical fraud escalation with same event_key
    update_res = client.post("/api/notifications", json={
        "title": "Fraud alert detected on application",
        "message": "Forensic audit discovered forged documents and spoofed geolocation.",
        "event_type": "FRAUD_ALERT",
        "category": "Fraud Alert",
        "event_key": unique_key
    }, headers=headers)
    assert update_res.status_code == 200
    res_data = update_res.json()
    assert res_data["action"] == "UPDATED", "Must update in place when event_key matches active notification"
    updated_notif = res_data["notification"]
    assert updated_notif["notification_id"] == notif_id, "Notification ID must remain the same (no duplicate created)"
    assert updated_notif["priority"] == "URGENT"
    assert updated_notif["severity"] == "CRITICAL"

    # Step 3: Direct DB check
    db = SessionLocal()
    try:
        matching_count = db.query(Notification).filter(Notification.event_key == unique_key).count()
        assert matching_count == 1, "Exactly one notification must exist for unique event_key in database"
        db_obj = db.query(Notification).filter(Notification.event_key == unique_key).first()
        assert db_obj.priority == "URGENT"
        assert db_obj.severity == "CRITICAL"
        assert "Fraud alert" in db_obj.title
    finally:
        db.close()


def test_audit_history_records_priority_severity_changes():
    """
    Validates requirement: All notification priority/severity changes must be recorded in the audit history.
    """
    token = _get_token("compliance.auditor@finsight.ai", "Compliance Auditor", UserRole.RISK_MANAGER)
    headers = {"Authorization": f"Bearer {token}"}

    unique_key = f"AUDIT_TEST_{uuid.uuid4().hex[:8]}"

    # Create notification
    res = client.post("/api/notifications", json={
        "title": "Customer Payment Processing",
        "message": "Payment scheduled for processing.",
        "priority": "LOW",
        "severity": "INFO",
        "category": "Customer Servicing",
        "event_key": unique_key
    }, headers=headers)
    assert res.status_code == 200
    notif_id = res.json()["notification"]["notification_id"]

    # Manual update of priority and severity
    put_res = client.put(f"/api/notifications/{notif_id}", json={
        "priority": "URGENT",
        "severity": "CRITICAL",
        "message": "Payment defaulted; critical exposure trigger."
    }, headers=headers)
    assert put_res.status_code == 200

    # Query audit logs
    db = SessionLocal()
    try:
        audit_records = db.query(AuditLog).filter(
            AuditLog.entity_id == notif_id,
            AuditLog.action.in_(["NOTIFICATION_CREATED", "NOTIFICATION_PRIORITY_SEVERITY_CHANGED"])
        ).all()
        assert len(audit_records) >= 2, f"Expected at least 2 audit entries for {notif_id}, got {len(audit_records)}"

        change_audit = [a for a in audit_records if a.action == "NOTIFICATION_PRIORITY_SEVERITY_CHANGED"]
        assert len(change_audit) >= 1, "Must log NOTIFICATION_PRIORITY_SEVERITY_CHANGED"
        rec = change_audit[0]
        assert "LOW" in rec.before_state_json
        assert "URGENT" in rec.after_state_json
        assert "CRITICAL" in rec.after_state_json
    finally:
        db.close()


def test_multi_tier_sorting():
    """
    Validates required sorting order:
    1. Urgent/High priority first
    2. Then severity (CRITICAL > WARNING > INFO)
    3. Then newest timestamp
    """
    token = _get_token("ops.analyst@finsight.ai", "Ops Analyst", UserRole.OPERATIONS_OFFICER)
    headers = {"Authorization": f"Bearer {token}"}

    # Create a batch of notifications with varying priorities, severities, and timestamps
    batch = [
        {"title": "Low Info Item", "priority": "LOW", "severity": "INFO"},
        {"title": "Normal Info Item", "priority": "NORMAL", "severity": "INFO"},
        {"title": "High Warning Item", "priority": "HIGH", "severity": "WARNING"},
        {"title": "High Critical Item", "priority": "HIGH", "severity": "CRITICAL"},
        {"title": "Urgent Warning Item", "priority": "URGENT", "severity": "WARNING"},
        {"title": "Urgent Critical Item", "priority": "URGENT", "severity": "CRITICAL"},
    ]

    for item in batch:
        client.post("/api/notifications", json={
            "title": item["title"],
            "message": f"Test message for {item['title']}",
            "priority": item["priority"],
            "severity": item["severity"],
            "category": "Sorting Validation"
        }, headers=headers)

    res = client.get("/api/notifications?category=Sorting Validation&limit=20", headers=headers)
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 6

    # Verify sort invariant:
    p_rank = {"URGENT": 4, "HIGH": 3, "NORMAL": 2, "LOW": 1}
    s_rank = {"CRITICAL": 3, "WARNING": 2, "INFO": 1}

    for i in range(len(items) - 1):
        curr_p = p_rank.get(items[i]["priority"].upper(), 2)
        next_p = p_rank.get(items[i+1]["priority"].upper(), 2)

        if curr_p == next_p:
            curr_s = s_rank.get(items[i]["severity"].upper(), 1)
            next_s = s_rank.get(items[i+1]["severity"].upper(), 1)
            if curr_s == next_s:
                # Timestamps should be descending
                assert items[i]["created_at"] >= items[i+1]["created_at"]
            else:
                assert curr_s >= next_s, f"Item {items[i]['title']} (s={curr_s}) should be >= {items[i+1]['title']} (s={next_s})"
        else:
            assert curr_p >= next_p, f"Item {items[i]['title']} (p={curr_p}) should be >= {items[i+1]['title']} (p={next_p})"


def test_multi_dimensional_filtering():
    """
    Validates filtering notifications by:
    - Priority
    - Severity
    - Category
    - Read/Unread
    - Date
    """
    token = _get_token("filter.tester@finsight.ai", "Filter Tester", UserRole.ADMIN)
    headers = {"Authorization": f"Bearer {token}"}

    # Filter by Priority = URGENT
    res_urgent = client.get("/api/notifications?priority=URGENT&limit=50", headers=headers)
    assert res_urgent.status_code == 200
    for it in res_urgent.json()["items"]:
        assert it["priority"].upper() == "URGENT"

    # Filter by Severity = CRITICAL
    res_crit = client.get("/api/notifications?severity=CRITICAL&limit=50", headers=headers)
    assert res_crit.status_code == 200
    for it in res_crit.json()["items"]:
        assert it["severity"].upper() == "CRITICAL"

    # Filter by Read status
    res_unread = client.get("/api/notifications?is_read=false&limit=50", headers=headers)
    assert res_unread.status_code == 200
    for it in res_unread.json()["items"]:
        assert it["is_read"] is False

    # Filter by Category
    res_fraud = client.get("/api/notifications?category=Fraud&limit=50", headers=headers)
    assert res_fraud.status_code == 200
    for it in res_fraud.json()["items"]:
        assert "fraud" in (it["category"] or "").lower()

    # Filter by Date
    yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
    res_date = client.get(f"/api/notifications?start_date={yesterday}&limit=50", headers=headers)
    assert res_date.status_code == 200
    assert "items" in res_date.json()


def test_user_scoped_unread_count_badge():
    """
    Validates requirement: The notification badge/count must reflect unread notifications relevant to the logged-in user.
    """
    user_a_email = f"user_a_{uuid.uuid4().hex[:6]}@finsight.ai"
    user_b_email = f"user_b_{uuid.uuid4().hex[:6]}@finsight.ai"

    token_a = _get_token(user_a_email, "User Alpha", UserRole.CUSTOMER)
    token_b = _get_token(user_b_email, "User Beta", UserRole.CUSTOMER)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create private notification targeted strictly at User A
    client.post("/api/notifications", json={
        "title": "Private Notice for User A",
        "message": "Confidential account statement.",
        "priority": "HIGH",
        "severity": "WARNING",
        "recipient_email": user_a_email,
        "is_read": False
    })

    # User A unread count should reflect this notice
    res_a = client.get("/api/notifications/unread-count", headers=headers_a)
    assert res_a.status_code == 200
    count_a = res_a.json()["unread_count"]
    assert count_a >= 1

    # User B should NOT see User A's private notification
    list_b = client.get("/api/notifications", headers=headers_b)
    assert list_b.status_code == 200
    user_b_titles = [it["title"] for it in list_b.json()["items"]]
    assert "Private Notice for User A" not in user_b_titles


def test_mark_read_and_mark_all_read():
    """
    Validates marking a single notification as read and marking all relevant notifications as read.
    """
    test_email = f"mark_read_{uuid.uuid4().hex[:6]}@finsight.ai"
    token = _get_token(test_email, "Mark Read Tester", UserRole.OPERATIONS_OFFICER)
    headers = {"Authorization": f"Bearer {token}"}

    # Create unread notification for this user
    create_res = client.post("/api/notifications", json={
        "title": "Unread Action Item",
        "message": "Please review loan documentation.",
        "priority": "NORMAL",
        "severity": "INFO",
        "recipient_email": test_email,
        "is_read": False
    })
    assert create_res.status_code == 200
    notif_id = create_res.json()["notification"]["notification_id"]

    # Mark single as read
    mark_res = client.post(f"/api/notifications/{notif_id}/read", headers=headers)
    assert mark_res.status_code == 200

    # Verify is_read is True
    db = SessionLocal()
    try:
        notif = db.query(Notification).filter(Notification.notification_id == notif_id).first()
        assert notif.is_read is True
    finally:
        db.close()

    # Create another unread notification and test mark-all-read
    client.post("/api/notifications", json={
        "title": "Second Action Item",
        "message": "Another pending verification.",
        "priority": "HIGH",
        "severity": "WARNING",
        "recipient_email": test_email,
        "is_read": False
    })

    all_read_res = client.post("/api/notifications/read-all", headers=headers)
    assert all_read_res.status_code == 200

    # Unread count should now be 0 for this user
    unread_res = client.get("/api/notifications/unread-count", headers=headers)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] == 0
