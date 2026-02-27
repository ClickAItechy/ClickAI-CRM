---
description: Start the ClickAI CRM application locally using Docker (Development Mode)
---

This workflow starts the ClickAI CRM application in development mode, using a local database isolate from production.

// turbo
1. Start the Docker services in the background:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Wait for the services to stabilize (approx. 10-15 seconds).

3. Verify the services are running:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

4. Access the application at [http://localhost:8088](http://localhost:8088).

5. To view logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs -f
   ```

6. To stop the services:
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```
