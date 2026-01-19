# PRD — Agent Kanban: Developer-Agent Project Builder

## 1. Summary
Agent Kanban is a web app where users manage software projects on a Kanban board and assign “developer agents” to task cards. Each card can be executed as an isolated coding run (an “Attempt”) that produces logs, diffs, and test results. Users review outputs and either request changes, rerun, or merge/create a PR.

---

## 2. Goals
- Provide a Kanban-first workflow to plan, run, and review agent-driven coding tasks.
- Enable safe, parallel task execution using isolated workspaces (branch/worktree/container).
- Make review easy via diff + tests + run transcript.
- Support multiple agent backends through a plug-in adapter interface.

### Success metrics (MVP)
- Time-to-first-run: user can run an agent on a task within 5 minutes of creating a project.
- ≥ 80% of attempts produce a diff artifact (even if failing tests).
- Users can run 3+ attempts in parallel on the same project without conflicts.
- Median “Run → Review-ready diff” under 3 minutes for small repos (local runner).

---

## 3. Non-goals (MVP)
- Fully autonomous multi-day project completion without human review.
- Complex org features (SSO, RBAC beyond basic roles).
- Large-scale cloud sandbox orchestration (Kubernetes) — optional later.
- Marketplace of agents/prompts (later).
- Full code editor replacement (basic diff viewer only).

---

## 4. Target users & personas
1. **Solo builder**
   - Wants to ship faster by delegating small tasks to agents.
2. **Student / learner**
   - Uses agents as guided copilots, wants transparency and reproducibility.
3. **Small team lead**
   - Uses board to triage tasks and parallelize implementation, reviews diffs.

---

## 5. Primary user journeys

### 5.1 Create Project → Add Tasks → Run Agent
1. User creates a Project and connects a repository (URL or local path).
2. User creates Task cards with acceptance criteria and optional “run commands”.
3. User assigns an agent profile to a task and clicks **Run**.
4. System creates an **Attempt**, prepares an isolated workspace, runs agent + gates.
5. User reviews logs/diff/tests and approves or requests changes.

### 5.2 Parallel execution
- User runs multiple tasks at once; each Attempt operates in its own workspace.
- UI shows concurrent run status and streams logs.

### 5.3 Review & merge
- User views file list and inline diff.
- User can:
  - Approve & Merge (local merge or API-assisted)
  - Create PR (GitHub integration)
  - Request Changes (creates next Attempt on same task)

---

## 6. Product scope

### 6.1 MVP features
**Kanban Board**
- Columns: To Do, In Progress, Review, Done (configurable later)
- Drag & drop tasks between columns
- Task ordering within columns
- Task metadata: title, description, acceptance criteria, labels, priority, estimate (optional)

**Agents**
- Agent Profiles (e.g., “OpenAI API”, “Claude Code CLI”, “Local Script Agent”)
- Per-task assignment to an agent profile
- Standard agent “run” interface (adapter pattern)

**Attempts (Runs)**
- Start/stop attempt (stop = best-effort cancel)
- Live logs stream (WebSocket)
- Artifacts:
  - git diff (or commit hash)
  - test outputs
  - summary (what changed, what’s left)
- Attempt status lifecycle:
  - Queued → Running → ReviewReady → Approved/Merged OR NeedsChanges OR Failed/Cancelled

**Workspace isolation**
- Create dedicated branch per Attempt
- Use git worktree or fresh clone per Attempt (implementation choice)
- Ensure no cross-attempt file collisions

**Quality gates (basic)**
- Optional per-project commands:
  - install command (e.g., `npm ci`, `pip install -r requirements.txt`)
  - test command (e.g., `npm test`, `pytest`)
  - lint command (optional)
- Display pass/fail and output

**Project configuration**
- Repo URL / local repo path
- Default branch
- Basic secrets placeholders (disabled by default in MVP)
- Commands & environment (safe allowlist)

**Authentication (MVP)**
- Email/password or OAuth (choose one)
- Single workspace per user

---

## 7. Requirements

### 7.1 Functional requirements
- FR1: Users can create/read/update/delete Projects.
- FR2: Users can create/read/update/delete Tasks within a Project.
- FR3: Users can drag Tasks across columns and reorder them.
- FR4: Users can create Agent Profiles and assign them to Tasks.
- FR5: Users can start an Attempt from a Task.
- FR6: Attempts stream logs in real time.
- FR7: Attempts produce a diff artifact (or a meaningful failure reason).
- FR8: Users can mark Attempt as “Needs changes” and rerun.
- FR9: Users can approve an Attempt and merge or create PR (one path required for MVP).
- FR10: System supports multiple concurrent Attempts per Project.

### 7.2 Non-functional requirements
- NFR1: Isolation: Attempts must not overwrite each other’s workspaces.
- NFR2: Auditability: Store attempt transcript + key artifacts for later review.
- NFR3: Reliability: If a worker crashes, Attempt transitions to Failed with diagnostics.
- NFR4: Security: Prevent arbitrary host access from agent by default (local-first sandbox rules).
- NFR5: Performance: Kanban interactions feel instant (<100ms UI updates locally).
- NFR6: Cost controls: Per-attempt limits (max runtime, max tokens if using API agent).

---

## 8. UX / UI requirements

### 8.1 Kanban board
- Left: project selector
- Main: columns with cards
- Card shows:
  - title
  - assignee agent
  - status badge (if active attempt)
  - last run result (pass/fail)
- Card click opens Task drawer:
  - description
  - acceptance criteria (checklist)
  - agent selection
  - Run button
  - Attempt history list

### 8.2 Attempt view (in drawer/modal)
- Tabs:
  1) Logs (live)
  2) Diff (file tree + inline diff)
  3) Tests (command output)
  4) Summary (agent-written)
- Actions:
  - Stop
  - Request changes
  - Approve & merge / Create PR

---

## 9. System design (high-level)

### 9.1 Components
- Frontend: React app with drag & drop Kanban + diff viewer
- Backend API: CRUD for projects/tasks/attempts; issues run jobs; stores artifacts
- Realtime: WebSocket for attempt logs and status updates
- Worker/Runner: executes attempts in isolated workspaces; calls agent adapters; runs commands
- Storage: Postgres for metadata; disk/S3 for artifacts (choose based on deployment)

### 9.2 Attempt pipeline
1. Create Attempt row (Queued)
2. Worker claims job
3. Prepare workspace (branch/worktree/clone)
4. Agent run:
   - receives instructions + constraints + repo context
   - applies edits
5. Run gates (tests/lint if configured)
6. Produce artifacts (diff, logs, test output)
7. Mark Attempt ReviewReady (or Failed)

---

## 10. Agent adapter interface (MVP)
All agents implement:
- `start_attempt(context) -> stream events`
Events:
- `LOG {line}`
- `PROGRESS {step, message}`
- `PATCH {diff}` (optional incremental)
- `COMMAND {cmd}`
- `TEST_RESULT {exit_code, output}`
- `DONE {summary, diff_ref}`
- `ERROR {message, stack?}`

Adapters in MVP:
- A1: “Script Agent” (runs a local script for deterministic testing)
- A2: “API Agent” (OpenAI/other) — optional if you want MVP without external dependency

---

## 11. Data model (MVP entities)
- User
- Project
  - id, owner_id, name, repo_url or local_path, default_branch
  - install_cmd, test_cmd, lint_cmd
- Task
  - id, project_id, title, description, acceptance_criteria, status, order, assigned_agent_id
- AgentProfile
  - id, owner_id, name, type, config_json (encrypted at rest if contains secrets)
- Attempt
  - id, task_id, status, created_at, started_at, ended_at
  - workspace_ref (branch/worktree path), summary, exit_code
- AttemptEvent
  - id, attempt_id, ts, type, payload_json
- Artifact
  - id, attempt_id, kind (diff/log/test), storage_ref, created_at

---

## 12. API (example endpoints)
- Projects
  - `GET /api/projects`
  - `POST /api/projects`
  - `GET /api/projects/:id`
- Tasks
  - `GET /api/projects/:id/tasks`
  - `POST /api/projects/:id/tasks`
  - `PATCH /api/tasks/:id`
- Agent Profiles
  - `GET /api/agents`
  - `POST /api/agents`
- Attempts
  - `POST /api/tasks/:id/attempts` (start run)
  - `GET /api/attempts/:id`
  - `POST /api/attempts/:id/cancel`
  - `POST /api/attempts/:id/approve` (merge/PR)

WebSocket:
- `/ws/attempts/:id` streams AttemptEvents and status changes

---

## 13. Security & safety (MVP)
- Default to local-first runner or sandboxed Docker runner.
- Disallow outbound network by default for agents (configurable later).
- Command allowlist: only run configured commands; block arbitrary shell injection.
- Store secrets encrypted; never stream secrets in logs.
- Permissions:
  - Project owner can view/run/merge
  - (Optional) collaborators later

---

## 14. Telemetry & logging
- Track:
  - attempt duration, success rate, gate pass rate
  - queue wait time
  - number of reruns per task
- Store structured events for debugging and replay.

---

## 15. Risks & mitigations
- **Repo size / dependency installs slow**
  - Mitigation: caching (node_modules/pip cache), configurable skip-install
- **Agents produce unsafe commands or exfiltrate**
  - Mitigation: sandbox, network off by default, strict command policy
- **Merge conflicts with parallel attempts**
  - Mitigation: merge to main requires rebase/check; highlight conflicts; prefer PR flow
- **Cost blowups for API agents**
  - Mitigation: token/runtime budgets, per-user limits

---

## 16. Milestones
1. **Week 1–2: Core Kanban**
   - Projects + Tasks + drag/drop + persistence
2. **Week 2–3: Attempts pipeline**
   - Worker, workspace isolation, log streaming
3. **Week 3–4: Review**
   - Diff viewer + test output + attempt history
4. **Week 4–5: Merge/PR**
   - One-click PR creation or merge flow
5. **Week 5+: Polishing**
   - better summaries, budgets, retries, role-based agents

---

## 17. Future enhancements
- Multi-agent roles (Planner/Implementer/Tester/Reviewer) with handoffs
- PRD-to-board auto task decomposition
- Commenting on diffs and tasks
- Team collaboration, RBAC, org projects
- Cloud runners / Kubernetes pools
- Reproducible “rerun exact attempt” bundles
