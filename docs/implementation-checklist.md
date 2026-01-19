# Agent Company - Implementation Checklist

> **Based on:** [plan.md](file:///c:/Users/muro/Documents/GitHub/agent-company/docs/plan.md)  
> **Last Updated:** 2026-01-19  
> **Timeline:** 12 weeks across 5 phases

---

## Phase 1: Foundation & Boilerplate (Weeks 1-3)

### 1.1 Repository Structure
- [ ] Initialize monorepo with git
- [ ] Create directory structure (backend, frontend, lda, docs)
- [ ] Create .gitignore file
- [ ] Setup Docker Compose (PostgreSQL + Redis)
- [ ] Verify Docker services are running

### 1.2 Backend: Django Foundation
- [ ] Initialize Django project in backend folder
- [ ] Install core dependencies (Django, DRF, JWT, Channels, Celery, Redis)
- [ ] Create requirements.txt
- [ ] Create Django apps (users, projects, tasks, attempts, agents, local_access, realtime)
- [ ] Configure settings.py (database, channels, celery, CORS, JWT)
- [ ] Create custom User model with UUID primary key
- [ ] Create user serializers (UserSerializer, UserRegistrationSerializer)
- [ ] Create auth views (RegisterView, CurrentUserView)
- [ ] Setup auth URLs (register, login, token refresh, me)
- [ ] Run initial migrations
- [ ] Create superuser
- [ ] Test auth endpoints (register, login, token refresh)

### 1.3 Frontend: React Foundation
- [ ] Initialize Vite project with React + TypeScript
- [ ] Install core dependencies (axios, react-router-dom, react-query, zustand)
- [ ] Install UI dependencies (tailwindcss, lucide-react, @dnd-kit, xterm, sonner)
- [ ] Configure Tailwind CSS with custom colors
- [ ] Configure TypeScript path aliases (@/*)
- [ ] Setup Vite proxy for /api and /ws
- [ ] Create API client with axios interceptors
- [ ] Create auth API functions (login, register, getCurrentUser, logout)
- [ ] Create auth store with Zustand
- [ ] Create App.tsx with routing structure
- [ ] Create PrivateRoute component
- [ ] Test frontend dev server

### 1.4 Core Domain Models (Projects & Tasks)
- [ ] Create Project model with owner, name, repo_path, config
- [ ] Create Task model with status, agent_role, priority, dependencies
- [ ] Create project serializers (ProjectSerializer, ProjectCreateSerializer)
- [ ] Create task serializers (TaskSerializer, TaskMoveSerializer)
- [ ] Create ProjectViewSet with CRUD operations
- [ ] Create TaskViewSet with filtering and move action
- [ ] Setup project and task URLs with routers
- [ ] Run migrations for projects and tasks
- [ ] Test project CRUD endpoints
- [ ] Test task CRUD endpoints
- [ ] Test task move endpoint
- [ ] Test task dependency checking

### 1.5 Frontend: Kanban Board
- [ ] Create projects API types and functions
- [ ] Create tasks API types and functions
- [ ] Create useProjects hook with React Query
- [ ] Create useTasks hook with React Query
- [ ] Create useCreateProject mutation
- [ ] Create useCreateTask mutation
- [ ] Create useMoveTask mutation
- [ ] Create Kanban board component with @dnd-kit
- [ ] Create task card component
- [ ] Create project list page
- [ ] Create project detail page with Kanban
- [ ] Test drag-and-drop functionality
- [ ] Test task creation and updates

### 1.6 UI Components
- [ ] Create Login page with form
- [ ] Create Register page with form
- [ ] Create DashboardLayout with navigation
- [ ] Create project creation modal/form
- [ ] Create task creation modal/form
- [ ] Add toast notifications with sonner
- [ ] Style all components with Tailwind

---

## Phase 2: Real-Time Pipeline (Weeks 4-6)

### 2.1 Django Channels Setup
- [ ] Create ASGI configuration file
- [ ] Configure CHANNEL_LAYERS in settings
- [ ] Create WebSocket routing file
- [ ] Create base consumer class
- [ ] Test WebSocket connection

### 2.2 Attempt Model & State Machine
- [ ] Create Attempt model (task, status, logs, git_branch, started_at, completed_at)
- [ ] Define attempt status choices (QUEUED, RUNNING, SUCCESS, FAILED, CANCELLED)
- [ ] Create attempt serializers
- [ ] Create AttemptViewSet with start/cancel actions
- [ ] Run migrations for attempts
- [ ] Test attempt creation

### 2.3 Celery Task Queue
- [ ] Create celery.py configuration
- [ ] Configure Celery broker and result backend
- [ ] Create agent execution Celery task
- [ ] Create log streaming Celery task
- [ ] Test Celery worker startup
- [ ] Test task execution

### 2.4 WebSocket Consumers
- [ ] Create TaskExecutionConsumer for live logs
- [ ] Implement WebSocket authentication middleware
- [ ] Create event protocol (log, status_change, progress)
- [ ] Test WebSocket message sending
- [ ] Test WebSocket reconnection

### 2.5 Frontend WebSocket Integration
- [ ] Create WebSocket connection manager
- [ ] Implement exponential backoff reconnection
- [ ] Create useWebSocket hook
- [ ] Create live log viewer component with xterm.js
- [ ] Create execution status indicator
- [ ] Test real-time log streaming
- [ ] Test reconnection on disconnect

---

## Phase 3: Local Desktop Agent (Weeks 7-9)

### 3.1 LDA Architecture
- [ ] Decide on framework (FastAPI vs Go)
- [ ] Initialize LDA project
- [ ] Install dependencies (FastAPI/Go, GitPython/libgit2)
- [ ] Create project structure

### 3.2 Filesystem Permission Manager
- [ ] Create writable roots configuration
- [ ] Implement canonical path resolution
- [ ] Create path validation function
- [ ] Implement read-anywhere, write-restricted logic
- [ ] Create audit log for file operations
- [ ] Test path traversal prevention
- [ ] Test symlink escape prevention

### 3.3 Writable Roots Management
- [ ] Create WritableRoot model in backend
- [ ] Create writable roots API endpoints
- [ ] Create writable roots UI in frontend
- [ ] Implement add/remove writable root
- [ ] Test writable root enforcement

### 3.4 Audit Logging
- [ ] Create AuditLog model (action, path, user, timestamp)
- [ ] Create audit log ingestion endpoint
- [ ] Create audit log viewer UI with filters
- [ ] Implement export functionality
- [ ] Test audit log recording

### 3.5 Safe Delete Implementation
- [ ] Create trash/quarantine folder
- [ ] Implement move-to-trash instead of delete
- [ ] Create restore functionality
- [ ] Create permanent delete with confirmation
- [ ] Test safe delete workflow

### 3.6 Git Worktree Management
- [ ] Implement git worktree creation
- [ ] Implement worktree cleanup
- [ ] Create branch naming convention
- [ ] Test worktree isolation
- [ ] Test concurrent worktrees

### 3.7 LDA ↔ Backend Communication
- [ ] Implement signed token authentication
- [ ] Create LDA registration endpoint
- [ ] Create task execution endpoint
- [ ] Implement TLS for communication
- [ ] Test authentication flow

---

## Phase 4: Multi-Agent Execution (Weeks 10-11)

### 4.1 PM Agent Service
- [ ] Create PM agent service class
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
- [ ] Create Frontend agent prompt template
- [ ] Create Backend agent prompt template
- [ ] Create QA agent prompt template
- [ ] Create DevOps agent prompt template
- [ ] Test each agent prompt

### 4.4 Dependency Resolution
- [ ] Implement dependency graph builder
- [ ] Create topological sort algorithm
- [ ] Implement blocked task detection
- [ ] Create dependency visualization
- [ ] Test dependency resolution

### 4.5 Parallel Execution Coordinator
- [ ] Create execution coordinator service
- [ ] Implement parallel task spawning
- [ ] Create task queue management
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

## Phase 5: Review & Safety (Week 12)

### 5.1 Approve/Reject Workflow
- [ ] Create approve/reject endpoints
- [ ] Implement git merge logic
- [ ] Create conflict detection
- [ ] Create conflict resolution helpers
- [ ] Create approve/reject UI
- [ ] Test merge workflow

### 5.2 Security Testing
- [ ] Test path traversal exploits
- [ ] Test symlink escape attempts
- [ ] Test unauthorized file access
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention
- [ ] Test CSRF token validation
- [ ] Test rate limiting

### 5.3 End-to-End Testing
- [ ] Setup Playwright
- [ ] Create E2E test: User registration and login
- [ ] Create E2E test: Project creation
- [ ] Create E2E test: PM decomposition
- [ ] Create E2E test: Agent execution
- [ ] Create E2E test: Approve and merge
- [ ] Run all E2E tests

### 5.4 Performance Optimization
- [ ] Optimize database queries (add indexes)
- [ ] Implement frontend code splitting
- [ ] Optimize bundle size
- [ ] Run Lighthouse CI
- [ ] Ensure page load < 3 seconds
- [ ] Ensure WebSocket latency < 500ms

### 5.5 Documentation
- [ ] Write user guide
- [ ] Write API documentation
- [ ] Write developer setup guide
- [ ] Create architecture diagrams
- [ ] Document deployment process

### 5.6 Launch Readiness
- [ ] Complete all security tests
- [ ] Achieve 80% test coverage
- [ ] Pass all E2E tests
- [ ] Meet all success criteria metrics
- [ ] Create production deployment plan
- [ ] Prepare launch announcement

---

## Testing Checklist

### Unit Tests
- [ ] Backend: Setup pytest + pytest-django + factory_boy
- [ ] Backend: Write tests for User model
- [ ] Backend: Write tests for Project model
- [ ] Backend: Write tests for Task model
- [ ] Backend: Write tests for Attempt model
- [ ] Backend: Write tests for auth endpoints
- [ ] Backend: Write tests for project endpoints
- [ ] Backend: Write tests for task endpoints
- [ ] Frontend: Setup Vitest + React Testing Library
- [ ] Frontend: Write tests for auth store
- [ ] Frontend: Write tests for API hooks
- [ ] Frontend: Write tests for components
- [ ] LDA: Write tests for filesystem operations
- [ ] LDA: Write tests for git operations
- [ ] Achieve 80% code coverage

### Integration Tests
- [ ] Test API endpoints with real database
- [ ] Test WebSocket connections
- [ ] Test LDA filesystem operations with temp directories
- [ ] Test Celery task execution
- [ ] Test end-to-end agent workflow

### Performance Tests
- [ ] Setup Locust for load testing
- [ ] Test 100 concurrent users
- [ ] Test WebSocket stress
- [ ] Optimize slow database queries
- [ ] Ensure p95 query time < 100ms

---

## Deployment Checklist

### Development Environment
- [ ] Verify docker-compose.yml works
- [ ] Verify Vite dev server with HMR
- [ ] Setup hot-reload for Django
- [ ] Setup hot-reload for Celery
- [ ] Document local setup steps

### Production (Post-MVP)
- [ ] Create Docker containers for Backend
- [ ] Create Docker containers for Celery
- [ ] Create Docker containers for Channels
- [ ] Setup Nginx reverse proxy
- [ ] Configure PostgreSQL managed service
- [ ] Configure Redis managed service
- [ ] Deploy frontend to static hosting
- [ ] Create LDA standalone installer
- [ ] Setup monitoring with Sentry
- [ ] Configure CI/CD with GitHub Actions

---

## Success Criteria Validation

### User Experience
- [ ] Time to first task completion < 10 minutes
- [ ] User retention (Week 1) ≥ 60%
- [ ] Task approval rate ≥ 70%

### Agent Performance
- [ ] PM agent task quality ≥ 85%
- [ ] Code quality gate pass rate ≥ 80%
- [ ] Parallel execution speedup ≥ 2.5x

### Safety & Security
- [ ] Permission clarity ≥ 90%
- [ ] Unauthorized write attempts = 0
- [ ] Audit log completeness = 100%

### Technical Performance
- [ ] WebSocket connection stability ≥ 99%
- [ ] Event stream latency < 500ms
- [ ] Page load time < 3 seconds

---

## Current Status

**Phase 1 Progress:**
- [x] Repository initialized
- [x] Docker Compose setup
- [x] Backend Django foundation
- [x] Custom User model
- [x] Auth endpoints (register, login, token refresh, me)
- [x] Frontend Vite + React + TypeScript
- [x] Tailwind CSS configured
- [x] API client with interceptors
- [x] Auth store with Zustand
- [x] Basic routing structure
- [x] Project and Task models
- [x] Project and Task API endpoints
- [ ] **TODO: Login/Register UI pages**
- [ ] **TODO: Kanban board UI**
- [ ] **TODO: Project list and detail pages**

**Next Steps:**
1. Build Login and Register pages
2. Build Kanban board with drag-and-drop
3. Build project management UI
4. Complete Phase 1 testing
5. Move to Phase 2 (Real-Time Pipeline)
