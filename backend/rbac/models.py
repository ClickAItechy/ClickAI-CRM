from django.db import models
from django.conf import settings

class Permission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(Permission, related_name='roles')
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='roles', blank=True)

    def __str__(self):
        return self.name
