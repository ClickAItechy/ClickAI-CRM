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
    - **Branch**: `staging`
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
    - Go to your Vercel project > **Settings** > **Git**.
    - Ensure your repository is connected.
2.  **Configure Build Settings**:
    - **Root Directory**: `frontend`
    - **Build Command**: `npm run build:staging` (This points to the staging backend automatically).
    - **Output Directory**: `dist/clickai-crm-frontend/browser`
3.  **Configure Staging Branch**:
    - Go to **Settings** > **Git** > **Deployment Branche**.
    - Add `staging` as a deployment branch if you want it to be tracked specifically.
4.  **Preview Deployments**:
    - Every push to the `staging` branch will now automatically build using the staging configuration and point to: `https://clickai-crm-staging.onrender.com/api/v1`.

---

## 4. Maintenance and Isolation

- **Migrations**: When you add new tables or fields, run `python manage.py migrate` in the staging environment before production.
- **Data Isolation**: Never use production credentials in staging.
- **Testing**: Use the staging environment to verify features with the team before merging into `main`.
