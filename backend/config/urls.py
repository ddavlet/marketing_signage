from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.devices import views_device
from apps.users.urls import auth_urlpatterns, user_urlpatterns

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/auth/", include(auth_urlpatterns)),
    # Resource APIs
    path("api/users/", include(user_urlpatterns)),
    path("api/locations/", include("apps.locations.urls")),
    path("api/media/", include("apps.media_library.urls")),
    path("api/playlists/", include("apps.playlists.urls")),
    path("api/devices/", include("apps.devices.urls_admin")),
    # Device endpoints (X-Device-Key auth)
    path("api/device/", include("apps.devices.urls_device")),
    # Chromium player page (key in URL, no auth header)
    path("player/<uuid:device_key>/", views_device.player_view, name="player"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
