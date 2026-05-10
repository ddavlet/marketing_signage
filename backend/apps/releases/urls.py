from rest_framework.routers import DefaultRouter

from .views import ReleaseViewSet

router = DefaultRouter()
router.register("", ReleaseViewSet, basename="release")

urlpatterns = router.urls
