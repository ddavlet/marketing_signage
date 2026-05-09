from django.urls import path

from . import views_device

urlpatterns = [
    path("heartbeat/", views_device.heartbeat, name="device-heartbeat"),
    path("sync/", views_device.sync, name="device-sync"),
]
