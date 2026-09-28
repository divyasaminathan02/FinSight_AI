"""
FinSight AI - Role-Based Access Control (RBAC) & Fine-Grained Permissions
Maps institutional roles to explicit functional capabilities across NBFC operations.
"""

from typing import Set, Dict, List
from fastapi import HTTPException, status, Depends
from app.models.users import User, UserRole

# -------------------------------------------------------------
# Canonical System Permissions
# -------------------------------------------------------------
class Permission:
    # Customer Permissions
    CUSTOMERS_VIEW = "customers.view"
    CUSTOMERS_CREATE = "customers.create"
    CUSTOMERS_EDIT = "customers.edit"

    # Loan Application Permissions
    APPLICATIONS_CREATE = "applications.create"
    APPLICATIONS_VIEW = "applications.view"
    APPLICATIONS_REVIEW = "applications.review"
    APPLICATIONS_APPROVE = "applications.approve"
    APPLICATIONS_REJECT = "applications.reject"

    # Loan Servicing & Disbursement
    LOANS_VIEW = "loans.view"
    LOANS_DISBURSE = "loans.disburse"
    PAYMENTS_RECORD = "payments.record"

    # Fraud & KYC Forensics
    FRAUD_INVESTIGATE = "fraud.investigate"
    KYC_VERIFY = "kyc.verify"

    # Delinquency & Collections
    COLLECTIONS_VIEW = "collections.view"
    COLLECTIONS_MANAGE = "collections.manage"

    # Finance, Treasury & ALM
    FINANCE_VIEW = "finance.view"
    FINANCE_MANAGE = "finance.manage"

    # Risk Intelligence
    RISK_VIEW = "risk.view"

    # Reports & Business Intelligence
    REPORTS_VIEW = "reports.view"
    REPORTS_EXPORT = "reports.export"

    # Platform Administration
    USERS_MANAGE = "users.manage"
    SETTINGS_MANAGE = "settings.manage"

    # Workflow & Sales Funnel
    TASKS_MANAGE = "tasks.manage"
    LEADS_MANAGE = "leads.manage"

    # Aliases for backward compatibility with earlier handlers
    CUSTOMERS_READ = CUSTOMERS_VIEW
    CUSTOMERS_UPDATE = CUSTOMERS_EDIT
    LOANS_READ = LOANS_VIEW
    LOANS_CREATE = APPLICATIONS_CREATE
    LOANS_APPROVE = APPLICATIONS_APPROVE
    LOANS_REJECT = APPLICATIONS_REJECT
    CREDIT_REVIEW = APPLICATIONS_REVIEW


# -------------------------------------------------------------
# Comprehensive 16-Role Permission Matrix (+ Legacy Aliases)
# -------------------------------------------------------------
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    # 1. Admin - Full organization-wide administration
    UserRole.ADMIN.value: {
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_EDIT,
        Permission.APPLICATIONS_CREATE, Permission.APPLICATIONS_VIEW, Permission.APPLICATIONS_REVIEW,
        Permission.APPLICATIONS_APPROVE, Permission.APPLICATIONS_REJECT,
        Permission.LOANS_VIEW, Permission.LOANS_DISBURSE, Permission.PAYMENTS_RECORD,
        Permission.FRAUD_INVESTIGATE, Permission.KYC_VERIFY,
        Permission.COLLECTIONS_VIEW, Permission.COLLECTIONS_MANAGE,
        Permission.FINANCE_VIEW, Permission.FINANCE_MANAGE,
        Permission.RISK_VIEW, Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
        Permission.USERS_MANAGE, Permission.SETTINGS_MANAGE,
        Permission.TASKS_MANAGE, Permission.LEADS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_UPDATE, Permission.LOANS_READ, Permission.LOANS_CREATE
    },

    # 2. Risk Manager - Portfolio-level intelligence & mitigation
    UserRole.RISK_MANAGER.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.APPLICATIONS_REVIEW, Permission.FRAUD_INVESTIGATE, Permission.COLLECTIONS_VIEW,
        Permission.COLLECTIONS_MANAGE, Permission.FINANCE_VIEW, Permission.RISK_VIEW,
        Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ, Permission.CREDIT_REVIEW
    },

    # 3. Risk Analyst - Portfolio risk modeling & trend analysis
    UserRole.RISK_ANALYST.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.RISK_VIEW, Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
        Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ
    },

    # 4. Credit Manager - Underwriting sanction authority
    UserRole.CREDIT_MANAGER.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.APPLICATIONS_REVIEW,
        Permission.APPLICATIONS_APPROVE, Permission.APPLICATIONS_REJECT, Permission.LOANS_VIEW,
        Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ, Permission.CREDIT_REVIEW,
        Permission.LOANS_APPROVE, Permission.LOANS_REJECT
    },

    # 5. Credit Analyst - Application review & appraisal
    UserRole.CREDIT_ANALYST.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.APPLICATIONS_REVIEW,
        Permission.LOANS_VIEW, Permission.REPORTS_VIEW, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ, Permission.CREDIT_REVIEW
    },

    # 6. Fraud Officer - Forensic fraud & network collision unit
    UserRole.FRAUD_OFFICER.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.FRAUD_INVESTIGATE, Permission.KYC_VERIFY, Permission.REPORTS_VIEW,
        Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ
    },

    # 7. KYC Officer - Identity, document verification & AML screening
    UserRole.KYC_OFFICER.value: {
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_EDIT, Permission.APPLICATIONS_VIEW,
        Permission.KYC_VERIFY, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_UPDATE
    },

    # 8. Collections Manager - NPA remediation & delinquency governance
    UserRole.COLLECTIONS_MANAGER.value: {
        Permission.CUSTOMERS_VIEW, Permission.LOANS_VIEW, Permission.COLLECTIONS_VIEW,
        Permission.COLLECTIONS_MANAGE, Permission.PAYMENTS_RECORD, Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ
    },

    # 9. Collections Officer - Assigned field / tele-recovery queues
    UserRole.COLLECTIONS_OFFICER.value: {
        Permission.CUSTOMERS_VIEW, Permission.LOANS_VIEW, Permission.COLLECTIONS_VIEW,
        Permission.COLLECTIONS_MANAGE, Permission.PAYMENTS_RECORD, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ
    },

    # 10. Operations Manager - Back-office disbursement approval & policy
    UserRole.OPERATIONS_MANAGER.value: {
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_EDIT, Permission.APPLICATIONS_VIEW,
        Permission.LOANS_VIEW, Permission.LOANS_DISBURSE, Permission.PAYMENTS_RECORD,
        Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_UPDATE, Permission.LOANS_READ
    },

    # 11. Operations Officer - Loan booking, document checks & NACH mandate
    UserRole.OPERATIONS_OFFICER.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.LOANS_DISBURSE, Permission.PAYMENTS_RECORD, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ
    },

    # 12. Finance Manager - Treasury, ALM & cashflow liquidity governance
    UserRole.FINANCE_MANAGER.value: {
        Permission.LOANS_VIEW, Permission.FINANCE_VIEW, Permission.FINANCE_MANAGE,
        Permission.PAYMENTS_RECORD, Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
        Permission.TASKS_MANAGE,
        # Aliases
        Permission.LOANS_READ
    },

    # 13. Finance Officer - Financial transactions & payment reconciliation
    UserRole.FINANCE_OFFICER.value: {
        Permission.LOANS_VIEW, Permission.FINANCE_VIEW, Permission.FINANCE_MANAGE,
        Permission.PAYMENTS_RECORD, Permission.REPORTS_VIEW, Permission.TASKS_MANAGE,
        # Aliases
        Permission.LOANS_READ
    },

    # 14. Sales Officer - Retail lead origination & preliminary eligibility
    UserRole.SALES_OFFICER.value: {
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_EDIT,
        Permission.APPLICATIONS_CREATE, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.LEADS_MANAGE, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_UPDATE, Permission.LOANS_READ, Permission.LOANS_CREATE
    },

    # 15. Relationship Manager - High-touch SME borrower accounts
    UserRole.RELATIONSHIP_MANAGER.value: {
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_EDIT,
        Permission.APPLICATIONS_CREATE, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.LEADS_MANAGE, Permission.REPORTS_VIEW, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_UPDATE, Permission.LOANS_READ, Permission.LOANS_CREATE
    },

    # 16. Customer - Strictly self-service borrower access
    UserRole.CUSTOMER.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_CREATE, Permission.APPLICATIONS_VIEW,
        Permission.LOANS_VIEW, Permission.PAYMENTS_RECORD,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ, Permission.LOANS_CREATE
    },

    # Backward Compatibility Aliases for existing DB rows
    UserRole.CREDIT_OFFICER.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.APPLICATIONS_REVIEW,
        Permission.APPLICATIONS_APPROVE, Permission.APPLICATIONS_REJECT, Permission.LOANS_VIEW,
        Permission.REPORTS_VIEW, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ, Permission.CREDIT_REVIEW,
        Permission.LOANS_APPROVE, Permission.LOANS_REJECT
    },
    UserRole.COLLECTION_MANAGER.value: {
        Permission.CUSTOMERS_VIEW, Permission.LOANS_VIEW, Permission.COLLECTIONS_VIEW,
        Permission.COLLECTIONS_MANAGE, Permission.PAYMENTS_RECORD, Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ
    },
    UserRole.OPERATIONS.value: {
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_EDIT, Permission.APPLICATIONS_VIEW,
        Permission.LOANS_VIEW, Permission.LOANS_DISBURSE, Permission.PAYMENTS_RECORD,
        Permission.TASKS_MANAGE, Permission.REPORTS_EXPORT,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_UPDATE, Permission.LOANS_READ
    },
    UserRole.EXECUTIVE.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.APPLICATIONS_APPROVE,
        Permission.LOANS_VIEW, Permission.FINANCE_VIEW, Permission.FINANCE_MANAGE,
        Permission.RISK_VIEW, Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
        Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ, Permission.CREDIT_REVIEW
    },
    UserRole.SALES.value: {
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_EDIT,
        Permission.APPLICATIONS_CREATE, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.LEADS_MANAGE, Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_UPDATE, Permission.LOANS_READ, Permission.LOANS_CREATE
    },
    UserRole.ANALYST.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.RISK_VIEW, Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
        Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ
    },
    UserRole.AUDITOR.value: {
        Permission.CUSTOMERS_VIEW, Permission.APPLICATIONS_VIEW, Permission.LOANS_VIEW,
        Permission.RISK_VIEW, Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
        Permission.TASKS_MANAGE,
        # Aliases
        Permission.CUSTOMERS_READ, Permission.LOANS_READ
    },
}

def has_permission(role: str, permission: str) -> bool:
    """Check if given role possesses a specific permission."""
    perms = ROLE_PERMISSIONS.get(role, set())
    return permission in perms

def get_permissions_for_role(role: str) -> List[str]:
    """List all permitted action strings for a given role."""
    return sorted(list(ROLE_PERMISSIONS.get(role, set())))

def require_permission(permission: str):
    """FastAPI dependency to enforce that the logged-in user possesses a permission."""
    from app.security.jwt import get_current_user
    
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        return check_permission(current_user, permission)
    return dependency

def check_permission(user: User, permission: str) -> User:
    """Verifies that user possesses permission, raising 403 Forbidden if not."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )
    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
    if not has_permission(role_str, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: User role '{role_str}' lacks required permission '{permission}'"
        )
    return user
