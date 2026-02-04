from rest_framework import serializers
from .models import Permission, Role

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'name']

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(), source='permissions', write_only=True, required=False
    )
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'permission_ids']
