from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .auth import DeviceKeyAuthentication
from .models import Device


def _auth_device(request):
    auth = DeviceKeyAuthentication()
    result = auth.authenticate(request)
    return result[0] if result else None


# ── heartbeat ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_POST
def heartbeat(request):
    device = _auth_device(request)
    if device is None:
        return JsonResponse({"detail": "Invalid or missing device key."}, status=401)
    Device.objects.filter(pk=device.pk).update(last_seen=now())
    playlist_version = device.assigned_playlist.version if device.assigned_playlist else None
    return JsonResponse({"playlist_version": playlist_version, "server_time": now().isoformat()})


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
