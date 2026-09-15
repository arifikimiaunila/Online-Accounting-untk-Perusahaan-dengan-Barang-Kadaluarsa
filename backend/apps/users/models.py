from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """Profil pengguna dengan role untuk kontrol akses."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        KASIR = "kasir", "Kasir"
        GUDANG = "gudang", "Gudang"
        AKUNTAN = "akuntan", "Akuntan"

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="profile"
    )
    role = models.CharField(
        "Role", max_length=20, choices=Role.choices, default=Role.KASIR
    )

    class Meta:
        verbose_name = "Profil Pengguna"
        verbose_name_plural = "Profil Pengguna"

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        role = (
            UserProfile.Role.ADMIN
            if instance.is_superuser
            else UserProfile.Role.KASIR
        )
        UserProfile.objects.create(user=instance, role=role)

