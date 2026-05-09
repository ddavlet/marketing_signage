from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

# Auth routes — mounted at /api/auth/
auth_urlpatterns = [
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("me/", views.MeView.as_view(), name="auth-me"),
]

# User CRUD routes — mounted at /api/users/
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("", views.UserViewSet, basename="user")
user_urlpatterns = router.urls
