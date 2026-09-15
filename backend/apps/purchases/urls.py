from rest_framework.routers import DefaultRouter

from .views import PurchaseItemViewSet, PurchaseViewSet

router = DefaultRouter()
router.register("purchases", PurchaseViewSet)
router.register("purchase-items", PurchaseItemViewSet)

urlpatterns = router.urls
