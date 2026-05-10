from django.urls import path

from . import views_device

urlpatterns = [
    path("heartbeat/", views_device.heartbeat, name="device-heartbeat"),
    path("sync/", views_device.sync, name="device-sync"),
    path("register/", views_device.register, name="device-register"),
    path("commands/<int:command_id>/ack/", views_device.ack_command, name="device-command-ack"),
]
