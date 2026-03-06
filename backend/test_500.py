import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from crm.models import User
from rest_framework_simplejwt.tokens import RefreshToken

u = User.objects.first()
c = Client()
token = RefreshToken.for_user(u).access_token
payload = {"reminder_date": "2026-03-20"}
res = c.patch('/api/v1/leads/7/update_reminder/', payload, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {token}')

print("STATUS:", res.status_code)
print("CONTENT:", res.content.decode('utf-8'))
