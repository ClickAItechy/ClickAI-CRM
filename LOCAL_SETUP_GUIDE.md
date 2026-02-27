# ClickAI CRM - Local Setup Guide

This guide explains how to run the ClickAI CRM application locally for development and testing, ensuring that your production database remains untouched.

## Prerequisites

- **Docker Desktop**: Ensure Docker Desktop is installed and running on your machine.
- **Git**: To clone and manage the repository.

## How to Run Locally

To start the application locally, follow these steps:

1. **Navigate to the Project Root**:
   Open your terminal and `cd` into the project directory:
   ```bash
   cd "/Volumes/Lee's SSD 1/Projects/ClickAI/clickai-crm"
   ```

2. **Start the Services**:
   Run the following command to start the backend, frontend, database, and gateway services:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
   *Note: The `-d` flag runs the containers in detached mode (in the background).*

3. **Verify the Services**:
   You can check the status of the containers using:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

4. **Access the Application**:
   - **Main Entry (Nginx Gateway)**: [http://localhost:8088](http://localhost:8088)
   - **Frontend Directly**: [http://localhost:4200](http://localhost:4200)
   - **Backend API**: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)

## Safety from Production

This setup is guaranteed not to touch your production database because:
- **Environment Variables**: The `docker-compose.dev.yml` file uses `.env.dev`, which points to a local PostgreSQL container (`db`) on port `5432` (mapped to `5433` on your host).
- **Isolation**: Docker creates a separate network for these containers, isolated from any external production environments.
- **Local Database Service**: A dedicated `db` service is defined in `docker-compose.dev.yml` that uses local storage.

## Troubleshooting

- **Logs**: To view logs for all services:
  ```bash
  docker compose -f docker-compose.dev.yml logs -f
  ```
- **Stop Services**: To stop and remove the local containers:
  ```bash
  docker compose -f docker-compose.dev.yml down
  ```

## Initial Setup / Seeding

The first time you run this, the system will automatically:
1. Run database migrations.
2. Create an admin user if one doesn't exist.
3. Seed the local database with initial data.
