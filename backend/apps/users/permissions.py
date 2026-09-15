"""Kontrol akses berbasis role (RBAC).

Role: admin (superuser / role=admin) memiliki akses penuh. Role lain dibatasi
per resource & aksi lewat `ROLE_PERMISSIONS`.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Hanya superuser atau role=admin."""

    message = "Hanya admin yang dapat mengakses fitur ini."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        role = getattr(getattr(user, "profile", None), "role", None)
        return role == "admin"

# Resource name diambil dari `view.basename` (otomatis di-set oleh DRF router).
ROLE_PERMISSIONS = {
    "kasir": {
        "products": ["list", "retrieve"],
        "categories": ["list", "retrieve"],
        "batches": ["list", "retrieve"],
        "inventory": ["list", "retrieve"],
        "stock-movements": ["list", "retrieve"],
        "customers": "*",
        "sales": "*",
        "sale-items": ["list", "retrieve"],
        "suppliers": ["list", "retrieve"],
        "purchases": ["list", "retrieve"],
        "purchase-items": ["list", "retrieve"],
        "accounts": ["list", "retrieve"],
        "journal-entries": ["list", "retrieve"],
    },
    "gudang": {
        "products": "*",
        "categories": "*",
        "batches": "*",
        "inventory": ["list", "retrieve"],
        "stock-movements": ["list", "retrieve"],
        "suppliers": "*",
        "purchases": "*",
        "purchase-items": ["list", "retrieve"],
        "customers": ["list", "retrieve"],
        "sales": ["list", "retrieve"],
        "sale-items": ["list", "retrieve"],
        "accounts": ["list", "retrieve"],
        "journal-entries": ["list", "retrieve"],
    },
    "akuntan": {
        "accounts": "*",
        "journal-entries": "*",
        "sales": ["list", "retrieve"],
        "sale-items": ["list", "retrieve"],
        "purchases": ["list", "retrieve"],
        "purchase-items": ["list", "retrieve"],
        "products": ["list", "retrieve"],
        "categories": ["list", "retrieve"],
        "batches": ["list", "retrieve"],
        "inventory": ["list", "retrieve"],
        "stock-movements": ["list", "retrieve"],
        "customers": ["list", "retrieve"],
        "suppliers": ["list", "retrieve"],
    },
}

STANDARD_ACTIONS = {
    "list",
    "retrieve",
    "create",
    "update",
    "partial_update",
    "destroy",
    "metadata",
}

# View yang boleh diakses tanpa login (register / token).
PUBLIC_VIEW_NAMES = {
    "RegisterView",
    "TokenObtainPairView",
    "TokenRefreshView",
}


class RoleBasedPermission(BasePermission):
    message = "Anda tidak memiliki izin untuk aksi ini."

    def has_permission(self, request, view):
        view_name = view.__class__.__name__
        if view_name in PUBLIC_VIEW_NAMES:
            return True

        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True

        role = getattr(getattr(user, "profile", None), "role", None)
        if role == "admin":
            return True

        # APIView biasa (mis. /auth/me/, dashboard, laporan) -> cukup terautentikasi.
        resource = getattr(view, "basename", None)
        if resource is None:
            return True

        action = getattr(view, "action", None) or "list"
        if action not in STANDARD_ACTIONS:
            # Aksi custom (expiring, low_stock, stock_card, trial_balance, ...) = read.
            action = "list"

        allowed = ROLE_PERMISSIONS.get(role, {}).get(resource)
        if allowed == "*":
            return True
        if isinstance(allowed, (list, tuple, set)):
            return action in allowed or "*" in allowed
        return False
