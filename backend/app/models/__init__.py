"""Central ORM registry. Importing this package registers all mappers on Base.metadata."""
from app.models.core import Base  # noqa: F401 — also registers core models
from app.models import audit      # noqa: F401
from app.models import emergency  # noqa: F401
from app.models import health_goal  # noqa: F401
from app.models import medical_knowledge  # noqa: F401
from app.models import subscriptions  # noqa: F401
from app.models import visit_briefs  # noqa: F401
from app.models.rbac import Role, Permission, UserRole, RolePermission  # noqa: F401

__all__ = ["Base", "Role", "Permission", "UserRole", "RolePermission"]
