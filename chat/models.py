from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission



class Room(models.Model):
    room_name = models.CharField(max_length=50)

    def __str__(self):
        return self.room_name


class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    sender = models.CharField(max_length=50)
    message = models.TextField()

    def __str__(self):
        return f"{str(self.room)} - {self.sender}"
    
    
class Operator(AbstractUser):
    # Устанавливаем уникальные related_name для конфликтующих полей
    groups = models.ManyToManyField(
        Group,
        related_name="operator_groups",  # Уникальное имя
        blank=True,
        help_text="The groups this user belongs to.",
        verbose_name="groups",
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="operator_permissions",  # Уникальное имя
        blank=True,
        help_text="Specific permissions for this user.",
        verbose_name="user permissions",
    )