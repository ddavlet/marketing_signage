from django.urls import path

from . import views_device

urlpatterns = [
    path("heartbeat/", views_device.heartbeat, name="device-heartbeat"),
]
