# Backend Architecture (Implementation Spec)

## 1. Technology Stack
- **Framework:** Django 5.x + Django Rest Framework (DRF)
- **Async:** Django Channels 4.x (Daphne)
- **Task Queue:** Celery 5.x
- **Database:** PostgreSQL 16
- **Broker/Cache:** Redis 7

## 2. Component Diagram
```mermaid
graph TD
    UI[Frontend (React)] <-->|REST| API[Django API]
    UI <-->|WebSocket| WS[Django Channels]
    API -->|Enqueue| RD[Redis (Broker)]
    W[Celery Worker] -->|Pop| RD
    W <-->|HTTP/JSON| LDA[Local Desktop Agent (Port 8001)]
    LDA -->|Git/Process| FS[User Filesystem]
    LDA -->|Stream Events| API_INGEST[API Ingest Endpoint]
    WS <-->|Pub/Sub| RD_CH[Redis Channel Layer]
    
    subgraph "Local Machine"
    LDA
    FS
    end
```

## 3. Django App Structure & Models

### `apps.users`
- **User**: AbstractUser
  - `id`: UUID

### `apps.projects`
- **Project**
  - `id`: UUID
  - `name`: CharField(255)
  - `repo_path`: CharField(1024) (Absolute path)
  - `created_at`: DateTime
  - `config`: JSONField (stores `install_cmd`, `test_cmd`, `lint_cmd`)

### `apps.tasks`
- **Task**
  - `id`: UUID
  - `project`: FK(Project)
  - `title`: CharField(255)
  - `description`: TextField
  - `status`: CharField (TODO, IN_PROGRESS, REVIEW, DONE)
  - `priority`: IntegerField (default=0)
  - `agent_role`: CharField(50) (PM, FRONTEND, BACKEND, QA, DEVOPS) — **NEW**
  - `dependencies`: JSONField (Array of task IDs) — **NEW**
  - `assigned_agent_id`: UUID (nullable)

### `apps.attempts`
Core execution logic.
- **Attempt**
  - `id`: UUID
  - `task`: FK(Task)
  - `status`: CharField (QUEUED, RUNNING, GATES, REVIEW, SUCCESS, FAILED)
  - `branch_name`: CharField(255)
  - `started_at`: DateTime
  - `completed_at`: DateTime
  - `exit_code`: IntegerField (nullable)
- **AttemptEvent**
  - `id`: BigAuto
  - `attempt`: FK(Attempt)
  - `timestamp`: DateTime
  - `type`: CharField (LOG, ERROR, ARTIFACT, STATUS)
  - `payload`: JSONField

### `apps.local_access` (NEW)
Manages permissions and audit trails.
- **WritableRoot**
  - `id`: UUID
  - `user`: FK(User)
  - `path`: CharField(1024) (User provided path)
  - `canonical_path`: CharField(1024) (Resolved absolute path)
  - `is_enabled`: Boolean
- **FsAuditEvent**
  - `id`: BigAuto (TimeScale compatible)
  - `user`: FK(User)
  - `attempt`: FK(Attempt, null=True)
  - `path`: CharField(1024)
  - `operation`: CharField (READ, WRITE, DELETE)
  - `result`: CharField (ALLOWED, DENIED)
  - `timestamp`: DateTime
- **PMDecomposition** — **NEW**
  - `id`: UUID
  - `project`: FK(Project)
  - `user_prompt`: TextField (What user described)
  - `pm_response`: TextField (PM agent's analysis)
  - `tasks_created`: JSONField (Array of created task IDs)
  - `created_at`: DateTime

### `apps.agents`
- **AgentProfile**
  - `id`: UUID
  - `name`: CharField
  - `provider`: CharField (GLM, GEMINI)
  - `model`: CharField (glm-7 or gemini-2.5-flash)
  - `system_prompt`: TextField
  - `role`: CharField (PM, FRONTEND, BACKEND, QA, DEVOPS) — **NEW**

> **Supported Models:**
> - GLM-7 (via compatible API endpoint)
> - Gemini 2.5 Flash (via Google AI API)
> - Users select which model to use per agent profile

## 4. API Endpoints (Specifics)

### REST API
- `POST /api/projects/` -> Create Project
- `GET /api/projects/{id}/tasks/` -> List tasks
- **Local Access:**
  - `GET /api/local-access/status/` -> Returns health of LDA and current roots.
  - `POST /api/local-access/roots/` -> Add a writable root (validated by LDA).
  - `DELETE /api/local-access/roots/{id}/` -> Remove a root.
  - `GET /api/audit/logs/` -> Filterable audit logs.

### Execution API
- `POST /api/tasks/{id}/attempts/` -> **Trigger Run**
  - payload includes `reference_paths` (optional context files)

### Ingestion API (Used by LDA)
- `POST /api/attempts/{id}/events/` -> Stream Attempt Logs
- `POST /api/audit/ingest/` -> Stream FS Audit Logs
  - Payload: `[{ operation: "WRITE", path: "/foo/bar", result: "ALLOWED", ... }]`
  - Logic: Bulk insert into `FsAuditEvent`.

## 5. Celery Tasks & LDA Protocol

### Task: `attempts.tasks.start_attempt_task(attempt_id)`
**Responsibility:** Orchestrate the execution by talking to LDA.

**Steps:**
1. Fetch `Attempt` and related `Project`.
2. Fetch enabled `WritableRoots` for the user.
3. Construct **Run ContextPayload**:
   ```json
   {
     "attempt_id": "...",
     "repo_path": "/Users/foo/project",
     "writable_roots": ["/Users/foo/project", "/Users/foo/docs"],
     "commands": { ... },
     "agent_config": { ... }
   }
   ```
4. Send POST to `http://localhost:8001/run` (The LDA).
5. Update Attempt status to `RUNNING`.

## 6. Realtime (Django Channels)

### Consumer: `AttemptConsumer`
- **Path:** `/ws/attempts/{attempt_id}/`
- **Groups:** `attempt_{attempt_id}`
- **Methods:**
  - `attempt_event(event)`: Handler for group messages. Sends JSON to client.

## 7. Security & Permissions
- **Filesystem Configuration:**
  - The LDA reads `WritableRoots` from the payload (or queries backend) to enforce policy.
  - **Backend** is the Source of Truth for "What is allowed", **LDA** is the Enforcer.
- **LDA Authentication:**
  - LDA listens on `localhost:8001`.
  - Requests from Backend -> LDA should include a shared secret or signed JWT to prevent other local processes from hijacking the LDA.
- **Symlink Protection:**
  - LDA must resolve all paths to `canonical_path` before checking against `writable_roots`.
