from rest_framework.routers import DefaultRouter

from .views import PlaylistViewSet

router = DefaultRouter()
router.register("", PlaylistViewSet, basename="playlist")
urlpatterns = router.urls
