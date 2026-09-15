from django.contrib.auth.models import User
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdmin
from .serializers import RegisterSerializer, UserAdminSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """Daftar pengguna baru (username, email, password)."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    """Profil pengguna yang sedang login."""

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserAdminViewSet(viewsets.ModelViewSet):
    """Manajemen pengguna & role (khusus admin). Hanya baca + ganti role."""

    queryset = User.objects.select_related("profile").order_by("id")
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "patch", "head", "options"]
    search_fields = ["username", "email"]
    ordering_fields = ["id", "username", "date_joined"]
