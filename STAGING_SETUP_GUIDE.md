# ClickAI CRM - Staging Environment Setup Guide

This guide provides step-by-step instructions to set up and maintain a staging environment that mirrors production but remains fully isolated.

---

## 1. Supabase (Database) Setup

You have already created the Supabase project.

- **Status**: ✅ Created
- **Connection String**: `postgresql://postgres.bjsudfixnbwnmldkxtdg:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`
- **Action Required**: None (ensure migrations are run).

---

## 2. Render (Backend) Setup

Follow these steps to deploy the staging backend on Render:

1.  **Create a New Web Service**:
    - Log in to your Render dashboard.
    - Click **New +** > **Web Service**.
    - Connect your GitHub repository.
2.  **Service Configuration**:
    - **Name**: `clickai-crm-staging`
    - **Environment**: `Docker`
    - **Region**: Same as production (likely `singapore`).
    - **Branch**: Select your feature branch or a dedicated `staging` branch.
    - **Dockerfile Path**: `./backend/Dockerfile`
    - **Docker Context**: `.`
3.  **Environment Variables**:
    - `DATABASE_URL`: `postgresql://postgres.bjsudfixnbwnmldkxtdg:AXoARqnkDehaHXtJ@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`
    - `DJANGO_SECRET_KEY`: (Generate a new secure key)
    - `DEBUG`: `False`
    - `ALLOWED_HOSTS`: `clickai-crm-staging.onrender.com`
    - `CORS_ALLOWED_ORIGINS`: Your Vercel preview/staging URL (e.g., `https://click-ai-crm-staging.vercel.app`)

---

## 3. Vercel (Frontend) Setup

To connect your frontend to the staging backend:

1.  **Vercel Project Settings**:
    - Go to your Vercel project > **Settings** > **Environment Variables**.
2.  **Configure Environment Variables**:
    - Create a new variable named `NEXT_PUBLIC_API_URL` (or whatever your frontend uses for the API base).
    - **Value**: `https://clickai-crm-staging.onrender.com/api/v1/`
    - **Environment**: Select **Preview** and **Development**.
3.  **Preview Deployments**:
    - Every pull request or push to a branch (other than `main`) will now automatically build a preview deployment pointing to your staging backend.

---

## 4. Maintenance and Isolation

- **Migrations**: When you add new tables or fields, run `python manage.py migrate` in the staging environment before production.
- **Data Isolation**: Never use production credentials in staging.
- **Testing**: Use the staging environment to verify features with the team before merging into `main`.
