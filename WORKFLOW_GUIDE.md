# ClickAI CRM - Development & Deployment Workflow

This guide explains how to manage your application across **Local**, **Staging**, and **Production** environments while maintaining strict isolation.

---

## 1. Local Development (Your Sandbox)

Use this for building and testing features before anyone else sees them.

- **Storage**: Data is saved in a local Docker volume (`postgres_dev_data`).
- **Isolation**: Completely offline; no connection to Supabase.

### How to Run Locally with Hot Reload (Recommended):
We use a **Hybrid Setup**: Database in Docker + App on your Mac. This is the fastest way and fixes SSD mounting issues.

1.  **Run the helper script**:
    ```bash
    chmod +x run-dev.sh
    ./run-dev.sh
    ```
    *This will start the DB in Docker, then start the Django and Angular servers natively.*

2.  **Repopulate Data (If empty)**:
    ```bash
    # Run this while run-dev.sh is active
    cd backend && python3 manage.py seed_dev_data
    ```

3.  **Access**:
    - **Frontend (Live Updates)**: [http://localhost:4200](http://localhost:4200)
    - **Backend API**: [http://localhost:8000](http://localhost:8000)

4.  **How to see changes**: Just save your file. The terminal running `run-dev.sh` will refresh the app instantly.

---

## 2. Staging Environment (Testing Ground)

Use this to test changes in a "real" cloud environment before going to production.

- **Stack**: Supabase (Staging DB) + Render (Staging API) + Vercel (Preview URL).
- **Isolation**: Uses its own Supabase project. Changes here **do not** affect customers.

### How to Push to Staging:
1.  **Commit your changes**:
    ```bash
    git add .
    git commit -m "Description of your feature"
    ```
2.  **Push to the staging branch**:
    ```bash
    git push origin staging
    ```
3.  **Verify**: Open your Vercel Preview URL (e.g., `*-git-staging-*.vercel.app`).

---

## 3. Production Environment (The Live App)

This is the live app used by your business. Every push here is permanent.

### How to Deploy to Production:
1.  **Merge changes** from `staging` to `main`:
    ```bash
    git checkout main
    git merge staging
    ```
2.  **Push to main**:
    ```bash
    git push origin main
    ```
3.  **Render & Vercel**: They will detect the push to `main` and deploy automatically.

---

## 4. Rollback & Troubleshooting

### If Staging Fails:
- **Don't Merge**: Simply fix the bug on your local/staging branch and push again.
- **Wipe Staging Data**: If the staging database gets corrupted, you can re-run migrations or use the Supabase dashboard to reset the project.

### If Production Fails (Emergency Rollback):
1.  **Revert the commit**:
    ```bash
    git revert HEAD
    git push origin main
    ```
2.  **Manual Rollback (Render/Vercel)**:
    - Go to the Render/Vercel dashboard.
    - Select the previous "Success" deployment.
    - Click **Rollback** to immediately restore the last working version while you investigate.

---

## 5. Summary of Isolation

| Feature | Local | Staging | Production |
| :--- | :--- | :--- | :--- |
| **Database** | Docker (Local) | Supabase (Staging) | Supabase (Production) |
| **Backend** | Docker (Port 8000) | Render (Staging) | Render (Production) |
| **Frontend** | Localhost:8088 | Vercel (Preview) | Vercel (Live Domain) |
| **Safe to Break?** | Yes ✅ | Yes ✅ | **NO ❌** |

---

### Pro-Tip: "The No-Interception Golden Rule"
Always keep separate browser tabs for Staging and Production to avoid confusion. Staging URLs typically contain the word `staging` or `preview`.
