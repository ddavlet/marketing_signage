import json

from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .auth import DeviceKeyAuthentication
from .models import Device, DeviceCommand


def _auth_device(request):
    auth = DeviceKeyAuthentication()
    result = auth.authenticate(request)
    return result[0] if result else None


# ── register (open; pre-approval) ──────────────────────────────────────────

@csrf_exempt
@require_POST
def register(request):
    """First-boot registration. Open endpoint, idempotent on hardware_id.

    A device that has never been seen is created as pending. Subsequent calls
    return {"status": "pending"} until an admin approves it in the panel,
    after which they return {"status": "approved", "api_key": ...}.
    """
    try:
        body = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    hardware_id = (body.get("hardware_id") or "").strip()
    if not hardware_id:
        return JsonResponse({"detail": "hardware_id required."}, status=400)

    hostname = (body.get("hostname") or "").strip() or "Unnamed device"
    os_info = body.get("os_info") or {}
    if not isinstance(os_info, dict):
        os_info = {}
    player_version = (body.get("player_version") or "").strip()

    device, created = Device.objects.get_or_create(
        hardware_id=hardware_id,
        defaults={
            "name": hostname[:200],
            "is_approved": False,
            "os_info": os_info,
            "player_version": player_version,
        },
    )

    # Refresh metadata from the device on each register call so admins see
    # current OS/version while deciding whether to approve.
    if not created:
        update_fields = []
        if os_info and device.os_info != os_info:
            device.os_info = os_info
            update_fields.append("os_info")
        if player_version and device.player_version != player_version:
            device.player_version = player_version
            update_fields.append("player_version")
        if update_fields:
            device.save(update_fields=update_fields)

    if device.is_approved:
        return JsonResponse({"status": "approved", "api_key": str(device.api_key)})
    return JsonResponse({"status": "pending"})


# ── heartbeat ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_POST
def heartbeat(request):
    device = _auth_device(request)
    if device is None:
        return JsonResponse({"detail": "Invalid or missing device key."}, status=401)

    update_fields = ["last_seen"]
    device.last_seen = now()

    # Capture the running player version reported on every request so the
    # admin panel reflects post-auto-update versions without requiring the
    # agent to re-register.
    reported_version = (request.headers.get("X-Player-Version") or "").strip()
    if reported_version and reported_version != device.player_version:
        device.player_version = reported_version[:32]
        update_fields.append("player_version")

    Device.objects.filter(pk=device.pk).update(
        **{f: getattr(device, f) for f in update_fields}
    )

    # Collect and deliver pending commands atomically.
    pending_qs = DeviceCommand.objects.filter(device=device, delivered_at__isnull=True)
    commands = list(pending_qs.values("id", "kind", "payload"))
    if commands:
        pending_qs.update(delivered_at=now())

    playlist_version = device.assigned_playlist.version if device.assigned_playlist else 0

    def _hhmm(t):
        return t.strftime("%H:%M") if t else ""

    return JsonResponse({
        "playlist_version": playlist_version,
        "server_time": now().isoformat(),
        "sync_interval_seconds": device.sync_interval_seconds,
        "update_channel": device.update_channel,
        "screen_schedule": {
            "on": _hhmm(device.screen_on_time),
            "off": _hhmm(device.screen_off_time),
            "tz": device.timezone or "UTC",
        },
        "commands": commands,
    })


# ── command ack ────────────────────────────────────────────────────────────

@csrf_exempt
@require_POST
def ack_command(request, command_id):
    device = _auth_device(request)
    if device is None:
        return JsonResponse({"detail": "Invalid or missing device key."}, status=401)
    updated = DeviceCommand.objects.filter(
        pk=command_id, device=device, acked_at__isnull=True
    ).update(acked_at=now())
    if not updated:
        return JsonResponse({"detail": "Not found."}, status=404)
    return JsonResponse({"status": "acked"})


# ── sync ───────────────────────────────────────────────────────────────────

def _serialize_items(items, request):
    out = []
    for item in items:
        m = item.media
        out.append({
            "media_id": m.pk,
            "playlist_id": item.playlist_id,
            "url": request.build_absolute_uri(m.file.url),
            "type": m.media_type,
            "duration": item.duration_seconds or m.duration_seconds or 10,
        })
    return out


@csrf_exempt
def sync(request):
    device = _auth_device(request)
    if device is None:
        return JsonResponse({"detail": "Invalid or missing device key."}, status=401)

    Device.objects.filter(pk=device.pk).update(last_seen=now())

    # Default playlist items
    default_items = []
    if device.assigned_playlist:
        default_items = _serialize_items(
            device.assigned_playlist.items.select_related("media"),
            request,
        )

    # Schedules with their playlist items
    schedules = []
    for sch in device.schedules.filter(is_active=True).select_related("playlist").prefetch_related("playlist__items__media"):
        schedules.append({
            "id": sch.pk,
            "label": sch.label or sch.playlist.name,
            "playlist_id": sch.playlist_id,
            "days": sch.days_of_week,
            "start": str(sch.start_time)[:5],   # "HH:MM"
            "end": str(sch.end_time)[:5],
            "priority": sch.priority,
            "items": _serialize_items(
                sch.playlist.items.select_related("media"),
                request,
            ),
        })

    # Version: bump whenever playlists or schedules change
    version = device.assigned_playlist.version if device.assigned_playlist else 0
    for sch in device.schedules.filter(is_active=True).select_related("playlist"):
        version += sch.playlist.version

    return JsonResponse({
        "device_key": str(device.api_key),
        "device_name": device.name,
        "version": version,
        "server_time": now().isoformat(),
        "default_items": default_items,
        "schedules": schedules,
    })


# ── player page ────────────────────────────────────────────────────────────

def player_view(request, device_key):
    device = get_object_or_404(
        Device.objects.select_related("assigned_playlist"),
        api_key=device_key,
    )
    return render(request, "devices/player.html", {
        "device": device,
        "device_key": str(device.api_key),
        "sync_url": "/api/device/sync/",
        "heartbeat_url": "/api/device/heartbeat/",
        "play_url": "/api/device/play/",
    })


# ── service worker ─────────────────────────────────────────────────────────

@require_GET
def service_worker(request):
    sw_js = r"""
const CACHE = 'signage-v1';
const MEDIA_CACHE = 'signage-media-v1';

self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Page sends list of media URLs to pre-cache after a successful sync
self.addEventListener('message', async e => {
  if (e.data?.type !== 'CACHE_MEDIA') return;
  const cache = await caches.open(MEDIA_CACHE);
  for (const url of e.data.urls) {
    try { await cache.add(new Request(url, { mode: 'no-cors' })); } catch {}
  }
  e.source?.postMessage({ type: 'CACHE_DONE' });
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Media files — cache-first (immutable once uploaded)
  if (url.pathname.startsWith('/media/uploads/')) {
    e.respondWith(
      caches.match(e.request)
        .then(hit => hit || fetch(e.request).then(res => {
          caches.open(MEDIA_CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        }))
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Player page — network-first so updates are picked up; cache as fallback
  if (url.pathname.startsWith('/player/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else (API calls) — network only, no caching
});
"""
    return HttpResponse(sw_js, content_type="application/javascript")
