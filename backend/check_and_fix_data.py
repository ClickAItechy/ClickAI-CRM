import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Lead

# Check Users
print(f"Users found: {User.objects.count()}")
for u in User.objects.all():
    print(f" - {u.username} (Manager: {u.is_manager}, Superuser: {u.is_superuser})")

# Check Leads
print(f"Leads found: {Lead.objects.count()}")

# Create Admin if missing
if not User.objects.filter(username='admin').exists():
    print("Creating admin user...")
    admin = User.objects.create_superuser('admin', 'admin@finkey.com', 'admin123')
    print("Admin user created.")
else:
    print("Admin user already exists.")

# Re-run seed if empty
if Lead.objects.count() == 0:
    print("No leads found. Running seed...")
    # Import logic from seed_data (simplified here)
    from crm.models import Team, LeadStage
    import random
    from decimal import Decimal
    
    # Ensure users exist (simplified)
    if User.objects.count() < 2:
        # Create minimal users
        User.objects.create_user('sales_rep1', 'rep1@finkey.com', 'password123', team=Team.SALES)
        
    users = list(User.objects.all())
    for i in range(1, 21):
        Lead.objects.create(
            email=f'lead{i}@example.com',
            first_name=f'Lead{i}',
            last_name='Test',
            phone=f'+9715000000{i}',
            salary_aed=Decimal(10000),
            stage=LeadStage.PROFILING,
            assigned_team=Team.SALES,
            assigned_to=random.choice(users)
        )
    print("Leads created.")
