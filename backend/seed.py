"""
Run with:  docker compose exec backend python manage.py shell < seed.py
"""
import django
django.setup()

from apps.devices.models import Device
from apps.locations.models import Location
from apps.playlists.models import Playlist
from apps.users.models import Role, User

# --- Admin user ---
if not User.objects.filter(email="admin@example.com").exists():
    User.objects.create_superuser(
        email="admin@example.com",
        password="admin",
        role=Role.ADMIN,
        is_staff=True,
    )
    print("Created superuser admin@example.com / admin")
else:
    print("Superuser already exists — skipped")

admin = User.objects.get(email="admin@example.com")

# --- Location ---
location, _ = Location.objects.get_or_create(
    name="Head Office",
    defaults={"description": "Main office lobby", "created_by": admin},
)
print(f"Location: {location.name} (id={location.pk})")

# --- Playlist ---
playlist, _ = Playlist.objects.get_or_create(
    name="Default Playlist",
    defaults={"description": "Seed playlist — add media items via the admin", "created_by": admin},
)
print(f"Playlist: {playlist.name} (id={playlist.pk})")

# --- Device ---
device, created = Device.objects.get_or_create(
    name="Lobby Screen",
    defaults={
        "location": location,
        "assigned_playlist": playlist,
        "registered_by": admin,
    },
)
if created:
    print(f"\nDevice created: {device.name}")
    print(f"  API key : {device.api_key}")
    print(f"  Player  : http://signage.localhost/player/{device.api_key}/")
else:
    print(f"\nDevice already exists: {device.name}")
    print(f"  API key : {device.api_key}")
    print(f"  Player  : http://signage.localhost/player/{device.api_key}/")
