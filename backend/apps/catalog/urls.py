from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    InventoryViewSet,
    ProductBatchViewSet,
    ProductViewSet,
    StockMovementViewSet,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet)
router.register("products", ProductViewSet)
router.register("batches", ProductBatchViewSet)
router.register("inventory", InventoryViewSet)
router.register("stock-movements", StockMovementViewSet)

urlpatterns = router.urls
