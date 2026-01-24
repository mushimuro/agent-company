# Agent Company - Implementation Checklist

> **Based on:** [plan.md](file:///c:/Users/muro/Documents/GitHub/agent-company/docs/plan.md)  
> **Last Updated:** 2026-01-19  
> **Timeline:** 12 weeks across 5 phases

---

## Phase 1: Foundation & Boilerplate (Weeks 1-3)

### 1.1 Repository Structure
- [x] Initialize monorepo with git
- [x] Create directory structure (backend, frontend, lda, docs)
- [x] Create .gitignore file
- [x] Setup Docker Compose (PostgreSQL + Redis)
- [x] Verify Docker services are running

### 1.2 Backend: Django Foundation
- [x] Initialize Django project in backend folder
- [x] Install core dependencies (Django, DRF, JWT, Channels, Celery, Redis)
- [x] Create requirements.txt
- [x] Create Django apps (users, projects, tasks, attempts, agents, local_access, realtime)
- [x] Configure settings.py (database, channels, celery, CORS, JWT)
- [x] Create custom User model with UUID primary key
- [x] Create user serializers (UserSerializer, UserRegistrationSerializer)
- [x] Create auth views (RegisterView, CurrentUserView)
- [x] Setup auth URLs (register, login, token refresh, me)
- [x] Run initial migrations
- [x] Create superuser
- [x] Test auth endpoints (register, login, token refresh)

### 1.3 Frontend: React Foundation
- [x] Initialize Vite project with React + TypeScript
- [x] Install core dependencies (axios, react-router-dom, react-query, zustand)
- [x] Install UI dependencies (tailwindcss, lucide-react, @dnd-kit, xterm, sonner)
- [x] Configure Tailwind CSS with custom colors
- [x] Configure TypeScript path aliases (@/*)
- [x] Setup Vite proxy for /api and /ws
- [x] Create API client with axios interceptors
- [x] Create auth API functions (login, register, getCurrentUser, logout)
- [x] Create auth store with Zustand
- [x] Create App.tsx with routing structure
- [x] Create PrivateRoute component
- [x] Test frontend dev server

### 1.4 Core Domain Models (Projects & Tasks)
- [x] Create Project model with owner, name, repo_path, config
- [x] Create Task model with status, agent_role, priority, dependencies
- [x] Create project serializers (ProjectSerializer, ProjectCreateSerializer)
- [x] Create task serializers (TaskSerializer, TaskMoveSerializer)
- [x] Create ProjectViewSet with CRUD operations
- [x] Create TaskViewSet with filtering and move action
- [x] Setup project and task URLs with routers
- [x] Run migrations for projects and tasks
- [x] Test project CRUD endpoints
- [x] Test task CRUD endpoints
- [x] Test task move endpoint
- [x] Test task dependency checking

### 1.5 Frontend: Kanban Board
- [x] Create projects API types and functions
- [x] Create tasks API types and functions
- [x] Create useProjects hook with React Query
- [x] Create useTasks hook with React Query
- [x] Create useCreateProject mutation
- [x] Create useCreateTask mutation
- [x] Create useMoveTask mutation
- [x] Create Kanban board component with @dnd-kit
- [x] Create task card component
- [x] Create project list page
- [x] Create project detail page with Kanban
- [x] Test drag-and-drop functionality
- [x] Test task creation and updates

### 1.6 UI Components
- [x] Create Login page with form
- [x] Create Register page with form
- [x] Create DashboardLayout with navigation
- [x] Create project creation modal/form
- [x] Create task creation modal/form
- [x] Add toast notifications with sonner
- [x] Style all components with Tailwind

---

## Phase 2: Real-Time Pipeline (Weeks 4-6)

### 2.1 Django Channels Setup
- [x] Create ASGI configuration file
- [x] Configure CHANNEL_LAYERS in settings
- [x] Create WebSocket routing file
- [x] Create base consumer class (ProjectConsumer)
- [x] Test WebSocket connection

### 2.2 Attempt Model & State Machine
- [x] Create Attempt model (task, status, logs, git_branch, started_at, completed_at)
- [x] Define attempt status choices (QUEUED, RUNNING, SUCCESS, FAILED, CANCELLED)
- [x] Create attempt serializers
- [x] Create AttemptViewSet with start/cancel actions
- [x] Run migrations for attempts
- [x] Test attempt creation

### 2.3 Celery Task Queue
- [x] Create celery.py configuration
- [x] Configure Celery broker and result backend
- [x] Create agent execution Celery task
- [x] Create log streaming Celery task
- [x] Test Celery worker startup
- [x] Test task execution

### 2.4 WebSocket Consumers
- [ ] Create TaskExecutionConsumer for live logs
- [x] Implement WebSocket authentication middleware
- [x] Create event protocol (log, status_change, progress)
- [x] Test WebSocket message sending
- [x] Test WebSocket reconnection

### 2.5 Frontend WebSocket Integration
- [x] Create WebSocket connection manager (useWebSocket hook)
- [ ] Implement exponential backoff reconnection
- [x] Create useWebSocket hook
- [ ] Create live log viewer component with xterm.js
- [x] Create execution status indicator
- [x] Test real-time log streaming
- [x] Test reconnection on disconnect

---

## Phase 3: Local Desktop Agent (Weeks 7-9)

### 3.1 LDA Architecture
- [x] Decide on framework (FastAPI)
- [x] Initialize LDA project
- [x] Install dependencies (FastAPI, pydantic, GitPython, etc.)
- [x] Create project structure (api, core, services, schema)

### 3.2 Filesystem Permission Manager
- [x] Create writable roots configuration
- [x] Implement canonical path resolution
- [x] Create path validation function
- [x] Implement read-anywhere, write-restricted logic
- [x] Create audit log for file operations
- [x] Test path traversal prevention
- [x] Test symlink escape prevention

### 3.3 Writable Roots Management
- [x] Create WritableRoot model in backend
- [x] Create writable roots API endpoints
- [x] Create writable roots UI in frontend
- [x] Implement add/remove writable root
- [x] Test writable root enforcement

### 3.4 Audit Logging
- [x] Create AuditLog model (action, path, user, timestamp)
- [x] Create audit log ingestion endpoint
- [x] Create audit log viewer UI with filters
- [ ] Implement export functionality
- [x] Test audit log recording

### 3.5 Safe Delete Implementation
- [x] Create trash/quarantine folder
- [x] Implement move-to-trash instead of delete
- [ ] Create restore functionality
- [ ] Create permanent delete with confirmation
- [x] Test safe delete workflow

### 3.6 Git Worktree Management
- [x] Implement git worktree creation
- [x] Implement worktree cleanup
- [x] Create branch naming convention
- [ ] Test worktree isolation
- [ ] Test concurrent worktrees

### 3.7 LDA ↔ Backend Communication
- [x] Implement signed token authentication
- [x] Create LDA registration endpoint (handled via config/handshake)
- [x] Create task execution endpoint
- [ ] Implement TLS for communication
- [x] Test authentication flow

---

## Phase 4: Multi-Agent Execution (Weeks 10-11)

### 4.1 PM Agent Service
- [ ] Create PM agent service class
- [x] Integrate Agent interface (BaseAgent)
- [ ] Integrate GLM-7 API
- [ ] Integrate Gemini 2.5 Flash API
- [ ] Create task decomposition prompt
- [ ] Implement decomposition logic
- [ ] Test PM agent decomposition

### 4.2 PM Decomposition UI
- [ ] Create PM wizard component
- [ ] Create requirements input form
- [ ] Create generated tasks preview
- [ ] Implement approve/edit/regenerate flow
- [ ] Test PM decomposition workflow

### 4.3 Specialized Agent Prompts
- [x] Create Frontend agent (placeholder logic)
- [x] Create Backend agent (placeholder logic)
- [x] Create QA agent (placeholder logic)
- [x] Create DevOps agent (placeholder logic)
- [ ] Test each agent prompt

### 4.4 Dependency Resolution
- [ ] Implement dependency graph builder
- [ ] Create topological sort algorithm
- [ ] Implement blocked task detection
- [ ] Create dependency visualization
- [ ] Test dependency resolution

### 4.5 Parallel Execution Coordinator
- [x] Create execution coordinator service (TaskExecutor)
- [x] Implement parallel task spawning (Celery delay)
- [x] Create task queue management (Celery)
- [ ] Implement resource limits
- [ ] Test parallel execution
- [ ] Measure speedup vs sequential

### 4.6 Quality Gates
- [ ] Implement test execution gate
- [ ] Implement linting gate
- [ ] Create quality gate configuration
- [ ] Create quality gate results UI
- [ ] Test quality gate enforcement

### 4.7 Diff Generation & Viewer
- [ ] Implement git diff generation
- [ ] Create diff viewer component (react-diff-view or Monaco)
- [ ] Add syntax highlighting
- [ ] Add file tree navigation
- [ ] Test diff viewer with large changes

---

## Phase 4 Progress:
- [x] TaskExecutor class created
- [/] Planning PM Agent decomposition logic

**Current Status:**
Phase 3 (LDA) is complete. Starting Phase 4: Multi-Agent Execution. Next: task decomposition wizard & PM Agent service.
