from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.authentication import get_authorization_header

from .auth import DeviceKeyAuthentication
from .models import Device


def _authenticate_device(request):
    """Return device or None using X-Device-Key header."""
    auth = DeviceKeyAuthentication()
    result = auth.authenticate(request)
    return result[0] if result else None


@csrf_exempt
@require_POST
def heartbeat(request):
    device = _authenticate_device(request)
    if device is None:
        return JsonResponse({"detail": "Invalid or missing device key."}, status=401)

    Device.objects.filter(pk=device.pk).update(last_seen=now())
    playlist_version = (
        device.assigned_playlist.version if device.assigned_playlist else None
    )
    return JsonResponse(
        {
            "playlist_version": playlist_version,
            "server_time": now().isoformat(),
        }
    )


def player_view(request, device_key):
    device = get_object_or_404(
        Device.objects.select_related(
            "assigned_playlist__items__media"
        ),
        api_key=device_key,
    )

    playlist = device.assigned_playlist

    if playlist is None:
        return render(request, "devices/player_no_playlist.html", {"device": device})

    if playlist.type == "external_url":
        from django.shortcuts import redirect
        return redirect(playlist.external_url)

    # Build the items list for the template
    items = []
    for item in playlist.items.select_related("media"):
        media = item.media
        duration = item.duration_seconds or media.duration_seconds or 10
        items.append(
            {
                "url": request.build_absolute_uri(media.file.url),
                "type": media.media_type,
                "duration": duration,
            }
        )

    return render(
        request,
        "devices/player.html",
        {
            "device": device,
            "playlist": playlist,
            "items": items,
            "heartbeat_url": "/api/device/heartbeat/",
            "device_key": str(device.api_key),
        },
    )
