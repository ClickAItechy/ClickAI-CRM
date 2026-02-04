import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import Lead, LeadStage, TechPipeline, User, Team

def run_test():
    print("=" * 50)
    print("TESTING TECH PIPELINE")
    print("=" * 50)
    
    # 1. Create a Lead
    print("[1] Creating a test Lead...")
    lead = Lead.objects.create(
        first_name='Tech',
        last_name='Pipeline Test',
        email='tech.test@example.com',
        phone='1234567890',
        stage=LeadStage.NEGOTIATION,
        assigned_team=Team.SALES
    )
    print(f"    Lead created: {lead} (ID: {lead.id})")
    
    # Verify no pipeline exist yet
    try:
        if getattr(lead, 'tech_pipeline', None):
             print("    [ERROR] Tech Pipeline exists prematurely!")
        else:
             print("    [OK] No Tech Pipeline yet.")
    except Exception:
         print("    [OK] No Tech Pipeline yet (exception caught).")

    # 2. Move to Project Preparation
    print("\n[2] Moving Lead to PROJECT_PREPARATION stage...")
    lead.stage = LeadStage.PROJECT_PREPARATION
    lead.save()
    print(f"    Lead stage updated to: {lead.stage}")
    
    # 3. Verify Tech Pipeline created
    print("\n[3] Verifying Tech Pipeline creation...")
    lead.refresh_from_db()
    if hasattr(lead, 'tech_pipeline'):
        pipeline = lead.tech_pipeline
        print(f"    [SUCCESS] Tech Pipeline created: {pipeline}")
        print(f"    Stage: {pipeline.stage}")
    else:
        print("    [FAILURE] Tech Pipeline NOT created!")

    # 4. Check Permissions Logic (Simulation)
    print("\n[4] Checking Permissions Logic (Simulation via script)...")
    
    # Sales User (Should NOT see tech pipeline, unless view_tech_pipeline=True)
    sales_user = User.objects.get(username='sales')
    can_view_sales = (
        sales_user.is_superuser or 
        sales_user.is_manager or 
        sales_user.team in ['ADMIN', 'TECH'] or 
        sales_user.view_tech_pipeline or 
        sales_user.manage_tech_pipeline
    )
    print(f"    Sales User ('{sales_user.username}') Access: {'GRANTED' if can_view_sales else 'DENIED'} (Expected: DENIED)")
    
    # Tech User (Should see tech pipeline)
    tech_user = User.objects.get(username='tech')
    can_view_tech = (
        tech_user.is_superuser or 
        tech_user.is_manager or 
        tech_user.team in ['ADMIN', 'TECH'] or 
        tech_user.view_tech_pipeline or 
        tech_user.manage_tech_pipeline
    )
    print(f"    Tech User ('{tech_user.username}') Access: {'GRANTED' if can_view_tech else 'DENIED'} (Expected: GRANTED)")

    print("\n" + "=" * 50)

if __name__ == '__main__':
    try:
        run_test()
    except Exception as e:
        print(f"[ERROR] Test failed with exception: {e}")
