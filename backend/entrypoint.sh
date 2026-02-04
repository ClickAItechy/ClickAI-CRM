#!/bin/sh

# Wait for DB to be ready
echo "Waiting for database..."
sleep 5

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Setup users (only if admin doesn't exist)
echo "Checking user setup..."
python manage.py shell -c "
from crm.models import User
if not User.objects.filter(username='admin').exists():
    print('No admin user found. Running user setup...')
    import reset_and_seed_users
    reset_and_seed_users.reset_and_seed_users()
else:
    print('Admin user exists. Skipping user setup.')
"

# Start server
echo "Starting server with command: $@"
exec "$@"
