# Marketing Signage

Backend (Django + DRF) and admin frontend (React + Vite + Tailwind + shadcn/ui) for managing digital marketing signage.

## Domain

- **Users** — three roles: `admin`, `manager`, `viewer`.
- **Locations** — folder/tree of physical sites (region → store → zone). Devices belong to one location.
- **Devices** — signage players. Each has a unique API key. Devices poll the backend for their assigned playlist.
- **Media** — uploaded images and videos with metadata.
- **Playlists** — ordered lists of media items, each with its own display duration. Devices play their assigned playlist on loop.

## Repo layout

```
backend/   Django project (apps: users, media_library, playlists, devices, locations)
frontend/  Vite + React admin SPA
```

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # creates an admin
python manage.py runserver         # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

The admin signs in at `/login` using their email + password and gets a JWT pair.

## Device protocol (REST polling)

Each device is provisioned with an `X-Device-Key` (UUID). It polls:

- `POST /api/device/heartbeat/` — every ~30s. Updates `last_seen` and returns playlist version.
- `GET  /api/device/playlist/` — fetches its assigned playlist with media URLs to play.

Devices do not use JWT — they auth with their per-device key only.

## API surface (admin, JWT)

```
POST /api/auth/login/                  → { access, refresh }
POST /api/auth/refresh/                → { access }
GET  /api/auth/me/                     → current user

CRUD /api/users/        (admin only)
CRUD /api/locations/    (admin, manager)
CRUD /api/media/        (admin, manager)   POST is multipart upload
CRUD /api/playlists/    (admin, manager)
POST /api/playlists/{id}/items/        → add media to playlist
PATCH /api/playlists/{id}/reorder/     → reorder items
CRUD /api/devices/      (admin, manager)
POST /api/devices/{id}/regenerate-key/ → rotate API key
```

