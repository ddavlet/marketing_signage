from rest_framework.routers import DefaultRouter

from .views_admin import DeviceViewSet

router = DefaultRouter()
router.register("", DeviceViewSet, basename="device")
urlpatterns = router.urls
