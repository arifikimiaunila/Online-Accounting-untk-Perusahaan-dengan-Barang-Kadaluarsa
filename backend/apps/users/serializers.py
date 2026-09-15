from django.contrib.auth.models import User
from rest_framework import serializers

from .models import UserProfile


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, min_length=6, style={"input_type": "password"}
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices, required=False
    )

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]

    def create(self, validated_data):
        role = validated_data.pop("role", UserProfile.Role.KASIR)
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        user.profile.role = role
        user.profile.save(update_fields=["role"])
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_superuser",
            "role",
        ]

    def get_role(self, obj):
        profile = getattr(obj, "profile", None)
        if profile:
            return profile.role
        return "admin" if obj.is_superuser else "kasir"


class UserAdminSerializer(serializers.ModelSerializer):
    """Daftar & ubah role pengguna (khusus admin)."""

    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices, required=False
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_superuser",
            "role",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "is_superuser",
            "date_joined",
            "last_login",
        ]

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        if role is not None:
            profile = getattr(instance, "profile", None)
            if profile is None:
                from .models import UserProfile

                profile = UserProfile.objects.create(user=instance, role=role)
            else:
                profile.role = role
                profile.save(update_fields=["role"])
        return instance
