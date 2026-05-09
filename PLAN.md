# Plan — Marketing Signage v1

Backend (Django + DRF) and admin frontend (React + Vite + Tailwind + shadcn/ui) for managing digital marketing signage. This file is the source of truth for v1 scope; edit it directly and we'll work from the latest version.

## 1. Architectural decisions

| Concern | Choice |
|---|---|
| Backend | Django 5 + DRF |
| Auth (admins) | JWT via `djangorestframework-simplejwt` |
| Auth (devices) | Per-device API key (UUID4) sent as `X-Device-Key` header |
| Device sync | REST polling (heartbeat + fetch-playlist) |
| Frontend | Vite + React 18 + TypeScript + Tailwind v3 + shadcn/ui |
| Routing | React Router v6 |
| State / data | TanStack Query for server state, Zustand for auth |
| Storage (media) | Local `MEDIA_ROOT` via `FileField` for v1, swappable to S3 via `django-storages` |
| DB | SQLite for dev; switch to Postgres for prod via `DATABASE_URL` |
| CORS | `django-cors-headers`, allow `localhost:5173` in dev |

## 2. Domain model

```
User
  email (unique, used as login)
  role: enum {admin, manager, viewer}        ← exactly 3 roles
  is_active, last_login

Location                                      ← supports folder hierarchy
  name
  parent → Location (nullable, self-FK)       ← Region → Store → Zone
  description
  created_by, created_at

Media
  name
  file (image or video)
  media_type: {image, video}
  duration_seconds (nullable; auto-detected for video, default 10s for images)
  file_size, mime_type
  uploaded_by, uploaded_at

Playlist
  name, description
  created_by, created_at, updated_at
  is_active
  version (int, bumps on edit — devices use this to detect changes)

PlaylistItem                                  ← through model, ordered
  playlist → Playlist
  media → Media
  order (int)
  duration_seconds (override; null = use Media.duration_seconds)
  unique_together: (playlist, order)

Device
  name
  location → Location (nullable)
  api_key (UUID4, unique, indexed)
  assigned_playlist → Playlist (nullable)
  status: {online, offline}                   ← derived from last_seen
  last_seen (datetime, nullable)
  registered_by, created_at, updated_at
```

### Role permissions

| Role | Users | Locations | Media | Playlists | Devices |
|---|---|---|---|---|---|
| **admin** | full CRUD | full CRUD | full CRUD | full CRUD | full CRUD + regenerate key |
| **manager** | read self | full CRUD | full CRUD | full CRUD | full CRUD + regenerate key |
| **viewer** | read self | read | read | read | read |

## 3. Backend layout

```
backend/
├── manage.py
├── requirements.txt
├── .env.example                  # SECRET_KEY, DEBUG, DATABASE_URL, MEDIA_ROOT
├── config/                       # Django project (settings, root urls, asgi/wsgi)
│   ├── settings.py
│   ├── urls.py
│   └── ...
└── apps/
    ├── users/        (User, role enum, serializers, viewset, JWT views, /me)
    ├── locations/    (Location tree, serializer with parent/children, viewset)
    ├── media_library/ (Media model, multipart upload, validation, viewset)
    ├── playlists/    (Playlist + PlaylistItem, reorder action, version bump signal)
    └── devices/
        ├── models.py             # Device + api_key generation
        ├── auth.py               # DeviceKeyAuthentication (DRF auth class)
        ├── views_admin.py        # admin CRUD viewset
        └── views_device.py       # heartbeat + playlist endpoints
```

### Endpoint summary

```
# Admin (JWT)
POST   /api/auth/login/                  → access + refresh
POST   /api/auth/refresh/
POST   /api/auth/logout/                 → blacklist refresh
GET    /api/auth/me/

GET/POST/PATCH/DELETE  /api/users/
GET/POST/PATCH/DELETE  /api/locations/        (returns tree-shaped list)
GET/POST/PATCH/DELETE  /api/media/            (POST = multipart upload)
GET/POST/PATCH/DELETE  /api/playlists/
PATCH  /api/playlists/{id}/items/        → set/replace items
PATCH  /api/playlists/{id}/reorder/      → reorder by id list
GET/POST/PATCH/DELETE  /api/devices/
POST   /api/devices/{id}/regenerate-key/

# Device (X-Device-Key)
POST   /api/device/heartbeat/            → { playlist_version, server_time }
GET    /api/device/playlist/             → { version, items: [{ url, type, duration }] }
```

## 4. Frontend layout

```
frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
└── src/
    ├── main.tsx, App.tsx
    ├── lib/
    │   ├── api.ts                # axios + JWT interceptor + 401 → refresh
    │   ├── auth-store.ts         # Zustand: tokens, user, role helpers
    │   └── permissions.ts        # canEdit(resource, role)
    ├── components/
    │   ├── layout/               # AppShell, Sidebar, Topbar
    │   ├── ui/                   # shadcn primitives (button, input, dialog, table…)
    │   └── forms/                # Reusable CRUD forms
    ├── pages/
    │   ├── Login.tsx
    │   ├── Dashboard.tsx         # device count, online %, media count
    │   ├── Users.tsx             # admin only
    │   ├── Locations.tsx         # tree view + add/edit
    │   ├── Media.tsx             # grid with upload dropzone
    │   ├── Playlists.tsx         # list + drag-and-drop item editor
    │   └── Devices.tsx           # list + register dialog + show/regenerate key
    └── routes.tsx                # ProtectedRoute, role gating
```

## 5. Build order

1. Scaffold structure (folders, README, .gitignore, dev runner)
2. Django + DRF + JWT + CORS + custom User
3. `users` app (User w/ role, JWT login/refresh, `/me`)
4. `locations` app (tree model, serializer, viewset)
5. `media_library` app (upload, validation, list/delete)
6. `playlists` app (Playlist + PlaylistItem, reorder, version bump)
7. `devices` app + device-side endpoints (key auth)
8. URL wiring + Django admin + initial migration + seed script
9. Vite/React/Tailwind/shadcn scaffold + API client + auth flow
10. CRUD pages

## 6. Out of scope for v1

- Scheduling (time-of-day playlists, day-of-week)
- Multi-tenant / org separation
- Device groups beyond locations
- Real-time push (WebSockets/MQTT) — REST polling only
- Analytics / proof-of-play reporting
- S3 storage (config-ready, but local FS in v1)
- Offline media caching strategy on the player itself

## 7. Open questions

1. **Device registration flow** — admin pre-creates a device and hands the key to the player, or players self-register with a one-time pairing code? (Default: admin pre-creates.)
2. **Image default duration** — okay to default images to 10s, configurable per playlist item?
3. **Video file size limit** — pick a number now (e.g. 200 MB) for upload validation?
4. **Locations as tree or flat?** — Plan is a self-FK tree. If only flat is needed, we drop the parent FK.
5. **Should `viewer` see Users at all, even read-only of self?** — Assumed yes (self only).
