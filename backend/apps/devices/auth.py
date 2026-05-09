from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import Device


class DeviceKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        key = request.headers.get("X-Device-Key")
        if not key:
            return None
        try:
            device = Device.objects.select_related(
                "assigned_playlist"
            ).get(api_key=key)
        except (Device.DoesNotExist, ValueError):
            raise AuthenticationFailed("Invalid device key.")
        return (device, None)

    def authenticate_header(self, request):
        return "X-Device-Key"
