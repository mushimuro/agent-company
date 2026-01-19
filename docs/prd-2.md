# PRD — Agent Company (Django + DRF + Channels, PostgreSQL, Redis)

## 0. Document control
- **Product name:** Agent Company
- **Version:** v1.1 (Enhanced)
- **Owner:** You
- **Last updated:** 2026-01-11
- **Target release:** MVP

---

## 1. Executive summary
Agent Kanban is a web application that combines a **Kanban board** with an **agent-runner pipeline**. Users create projects backed by a Git repository, define tasks as cards, and assign developer agents to implement changes. Each run happens as an **Attempt** in an **isolated workspace** and produces **live logs**, **diff artifacts**, and **quality gate results** (tests/lint). Users review outputs and approve merges or create PRs.

---

## 2. Goals and success criteria

### 2.1 Goals
1. **Kanban-first orchestration**
   - Users manage work on a board and treat agents as “assignees” that execute tasks.
2. **Safe parallel execution**
   - Multiple attempts can run concurrently without interfering.
3. **Reviewable outcomes**
   - Every attempt produces reproducible artifacts (diff, logs, test output, summary).
4. **Pluggable agent framework**
   - Support multiple agent providers via adapters without rewriting core workflow.

### 2.2 MVP success metrics (measurable)
- **Activation:** ≥ 60% of new users create a project and run at least 1 attempt within 1 session.
- **Reliability:** ≥ 95% of attempts end in a terminal state (ReviewReady/Failed/Cancelled) with artifacts.
- **Parallelism:** User can run **≥ 3** concurrent attempts on the same project without workspace conflicts.
- **Review readiness:** ≥ 80% of attempts produce a diff artifact (even if gates fail).
- **UX latency:** Board interactions update UI in < 150ms perceived latency (optimistic UI).

---

## 3. Target users
1. **Solo builder**
   - Wants to delegate implementation tasks and review diffs quickly.
2. **Student / learner**
   - Wants transparency: what commands ran, what changed, why tests fail.
3. **Small team lead (later)**
   - Wants shared board and governance (collaboration is Phase 2).

---

## 4. Product scope

### 4.1 MVP (in scope)
**Core**
- Projects tied to git repos (local path or remote URL)
- Kanban board CRUD, drag/drop, ordering
- Tasks: description + acceptance criteria + labels + optional “focus files”
- Agent Profiles (adapter-based)
- Attempts: queue, run, stream logs, store artifacts, show diff
- Quality gates: install/test/lint commands (configurable per project)
- Approve & Merge OR Create PR (choose one for MVP; can support both if time)

**Infrastructure**
- Django + DRF for REST APIs
- Django Channels for WebSocket streaming
- PostgreSQL for metadata + event indexing
- Redis for:
  - Celery broker + result backend (or just broker)
  - Channels layer (pub/sub)
  - optional caching + rate limits

### 4.2 Explicitly out of scope (MVP)
- Multi-tenant org, advanced RBAC, audit dashboards
- Kubernetes runner pools / fully hosted sandbox fleet
- Built-in IDE (only diff viewer + logs)
- Marketplace of agent templates
- Complex GitHub App installation flow (can use PAT for MVP)

---

## 5. Definitions & terminology
- **Project:** A workspace anchored to a git repository and configured with run commands.
- **Task:** A Kanban card representing a unit of work. Belongs to a Project.
- **Agent Profile:** Configured agent backend and policies (provider, model, limits).
- **Attempt:** A single execution run for a Task. Has isolated workspace + artifacts.
- **Attempt Event:** A log/progress/tool event emitted during an Attempt.
- **Artifact:** Persisted output from an Attempt (diff, test output, summarized report).
- **Quality gates:** Commands executed after agent work (tests/lint/typecheck).

---

## 6. User stories & acceptance criteria

### 6.1 Projects
**US-P1:** As a user, I can create a Project connected to a repo.
- Acceptance:
  - Create with: name, repo_url OR local_path, default branch
  - Configure commands: install, test, lint (optional)
  - Project appears in selector; can be updated/deleted

**US-P2:** As a user, I can validate project configuration.
- Acceptance:
  - “Validate” runs lightweight checks (repo reachable, branch exists, commands present)
  - Errors are actionable

### 6.2 Kanban board & Tasks
**US-T1:** As a user, I can create and manage tasks on a Kanban board.
- Acceptance:
  - Create/edit: title, description, acceptance checklist, labels, priority, estimate (optional)
  - Drag/drop changes status and persists ordering
  - Search/filter by label, status, text, agent

**US-T2:** As a user, I can assign an agent profile to a task.
- Acceptance:
  - Select agent profile in task drawer
  - Assignment persists; visible on card

### 6.3 Attempts (runs)
**US-A1:** As a user, I can start an Attempt from a Task.
- Acceptance:
  - Clicking “Run” creates Attempt in Queued
  - Attempt appears in task history immediately
  - Worker starts Attempt and streams logs via WebSocket

**US-A2:** As a user, I can observe Attempt progress in real time.
- Acceptance:
  - Live logs stream within 2 seconds after worker starts
  - Status transitions are visible: Queued → Running → ReviewReady/Failed/Cancelled

**US-A3:** As a user, I can review Attempt outputs.
- Acceptance:
  - Diff viewer shows changed files + inline diff
  - Test output shows exit code and console output
  - Summary is displayed (even if generated by template initially)

**US-A4:** As a user, I can request changes and rerun.
- Acceptance:
  - “Request changes” stores feedback and creates a new Attempt referencing prior attempt
  - New attempt inherits same task context and can include feedback

**US-A5:** As a user, I can approve and merge (or create a PR).
- Acceptance:
  - Approve triggers merge/PR creation with conflict handling
  - On success, task can be moved to Done and Attempt marked Approved/Merged
  - On conflict, system returns actionable message and keeps Attempt in ReviewReady

### 6.4 Concurrency
**US-C1:** As a user, I can run multiple attempts in parallel safely.
- Acceptance:
  - Each Attempt uses unique workspace (worktree/branch) and does not overwrite others
  - UI shows multiple Running attempts simultaneously

---

## 7. UX specification

### 7.1 Layout
- **Left sidebar:** Project selector + project settings shortcut
- **Top bar:** search/filter, “New Task”, “New Agent Profile”
- **Main:** Kanban columns (To Do / In Progress / Review / Done)
- **Right drawer (Task Drawer):**
  - details, acceptance checklist, agent assignment
  - attempt history list
  - run controls

### 7.2 Task card
- Title, labels, priority badge (optional)
- Assigned agent badge
- Attempt status indicator (if running) + last outcome (pass/fail)

### 7.3 Attempt view (within drawer or modal)
Tabs:
1. **Logs** (live streaming; auto-scroll toggle)
2. **Diff** (file tree + inline diff; show stats)
3. **Gates** (install/test/lint outputs)
4. **Summary** (changes, remaining issues, next actions)

Actions:
- Run (if idle)
- Cancel (while queued/running)
- Request changes
- Approve & merge / Create PR

---

## 8. System architecture (recommended setup)

### 8.1 Components
- **Frontend:** React (Kanban + diff viewer)
- **Backend API:** Django + DRF (CRUD + run orchestration)
- **Realtime:** Django Channels (WebSockets)
- **Worker:** Celery workers executing attempts
- **DB:** PostgreSQL (source of truth)
- **Broker/Layers:** Redis (Celery broker + Channels layer + optional cache)

### 8.2 High-level sequence
1. User clicks **Run**
2. DRF endpoint creates Attempt row and enqueues Celery job
3. Celery worker:
   - prepares isolated workspace
   - runs agent adapter
   - runs quality gates
   - emits AttemptEvents to Channels group via Redis layer
   - persists artifacts to disk/S3 and metadata to Postgres
4. UI subscribes to attempt WebSocket and updates live

### 8.3 Isolation strategy (MVP)
Choose 1:
- **Git worktrees (recommended local-first):**
  - `git worktree add ../worktrees/<attempt_id> -b ak/<attempt_id>`
  - Fast, avoids full clone
- **Fresh clone per attempt (simple, slower):**
  - `git clone` into attempt folder each time

---

## 9. Functional requirements (detailed)

### 9.1 Project management
- Create/update/delete project
- Store repo config and safe commands
- Project-level defaults:
  - install/test/lint commands
  - agent defaults
  - budgets: max runtime, max attempts per hour, max tokens (if API agent)

### 9.2 Task management
- CRUD tasks
- Task statuses map to columns
- Ordering stored per-column (float rank or integer order)
- Labels: many-to-many or JSON list (prefer normalized for filtering later)
- Acceptance criteria: checklist items with done/undone (per task)

### 9.3 Attempt lifecycle (state machine)
States:
- `QUEUED`
- `RUNNING`
- `GATES_RUNNING` (optional separate)
- `REVIEW_READY`
- `FAILED`
- `CANCELLED`
- `APPROVED_MERGED` (or `PR_CREATED`)

Rules:
- Only one terminal state allowed per attempt
- Cancel allowed only in QUEUED/RUNNING
- Approve allowed only in REVIEW_READY

### 9.4 Attempt events (streamed + stored)
Event types (MVP):
- `LOG` {level, message}
- `PROGRESS` {phase, step, total?, message}
- `COMMAND` {cmd, cwd}
- `PATCH` {diff_snippet?} (optional)
- `GATE_RESULT` {gate: install|test|lint, exit_code, output_ref}
- `ARTIFACT` {kind, ref}
- `STATUS` {from, to}
- `ERROR` {message, detail?}

Persistence:
- Store **all** LOG/ERROR/STATUS, plus summarized PROGRESS
- Optionally throttle LOG storage (store every line in file artifact, index key lines in DB)

### 9.5 Quality gates
Per project config:
- Install command (optional)
- Test command (optional)
- Lint command (optional)

Behavior:
- If install fails → attempt becomes FAILED (or REVIEW_READY with gates failed; pick one policy)
- If test fails → still produce diff, mark gates failed, keep REVIEW_READY for human decision
Recommended policy:
- Always produce diff; gates failure does NOT block ReviewReady (unless workspace prep fails)

### 9.6 Git operations
- Create unique branch per attempt: `ak/<task_id>/<attempt_id>`
- Collect diff:
  - `git diff <base_branch>...HEAD` (or `git diff --stat`)
- Merge flow (if “Approve & Merge”):
  - fetch base branch, attempt rebase or merge
  - detect conflicts; if conflict, keep attempt as REVIEW_READY with conflict message
- PR flow (if “Create PR”):
  - push branch and create PR via GitHub API

---

## 10. API design (DRF)

### 10.1 Core endpoints
**Projects**
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}`
- `PATCH /api/projects/{project_id}`
- `DELETE /api/projects/{project_id}`
- `POST /api/projects/{project_id}/validate`

**Tasks**
- `GET /api/projects/{project_id}/tasks`
- `POST /api/projects/{project_id}/tasks`
- `GET /api/tasks/{task_id}`
- `PATCH /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`
- `POST /api/tasks/{task_id}/move` (status + order)
- `GET /api/tasks/{task_id}/attempts`

**Agents**
- `GET /api/agents`
- `POST /api/agents`
- `GET /api/agents/{agent_id}`
- `PATCH /api/agents/{agent_id}`
- `DELETE /api/agents/{agent_id}`

**Attempts**
- `POST /api/tasks/{task_id}/attempts` (start)
- `GET /api/attempts/{attempt_id}`
- `POST /api/attempts/{attempt_id}/cancel`
- `POST /api/attempts/{attempt_id}/request-changes`
- `POST /api/attempts/{attempt_id}/approve` (merge or PR)
- `GET /api/attempts/{attempt_id}/artifacts` (list)

### 10.2 Response essentials
- Every attempt detail includes:
  - status, timestamps, summary
  - last N events (or cursor for pagination)
  - artifact pointers

---

## 11. WebSocket design (Channels)

### 11.1 Connection
- `ws://.../ws/attempts/{attempt_id}`
- Auth: session cookie or token

### 11.2 Message format
Server → client:
```json
{
  "type": "event",
  "attempt_id": "uuid",
  "seq": 123,
  "ts": "2026-01-11T07:03:10Z",
  "event": {
    "kind": "LOG",
    "payload": { "level": "INFO", "message": "Running tests..." }
  }
}
