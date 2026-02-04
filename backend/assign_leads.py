import os
import django
import random

# Setup Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Lead, Team

def distribute_leads():
    print("Fetching unassigned leads...")
    unassigned_leads = Lead.objects.filter(assigned_to__isnull=True)
    count = unassigned_leads.count()
    
    if count == 0:
        print("No unassigned leads found.")
        return

    print(f"Found {count} unassigned leads.")

    # Fetch active users (Sales & Operations)
    # We can fetch all users or filter by team. Let's filter by relevant teams or just all non-superusers.
    # User request "assign leads to every team member randomly".
    # We'll include admins if they are in the list, but standard practice usually favors Sales reps.
    # Let's get all active users.
    users = list(User.objects.filter(is_active=True))
    
    if not users:
        print("No users found to assign to.")
        return

    print(f"Distributing among {len(users)} users...")

    for lead in unassigned_leads:
        assignee = random.choice(users)
        lead.assigned_to = assignee
        lead.assigned_team = assignee.team if assignee.team else Team.SALES
        lead.save()
    
    print(f"Successfully assigned {count} leads.")

if __name__ == '__main__':
    distribute_leads()
