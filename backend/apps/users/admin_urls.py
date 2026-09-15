"""Router untuk manajemen pengguna (khusus admin)."""
from rest_framework.routers import DefaultRouter

from .views import UserAdminViewSet

router = DefaultRouter()
router.register("users", UserAdminViewSet)

urlpatterns = router.urls
