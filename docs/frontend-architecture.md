# Frontend Architecture (Implementation Spec)

## 1. Technology Stack
- **Build Tool:** Vite (React + TypeScript)
- **Styling:** TailwindCSS
- **State Management:**
  - **Server State:** TanStack Query (React Query) v5
  - **Global UI State:** Zustand
- **Router:** React Router v6
- **Realtime:** Native `WebSocket` (or `react-use-websocket`)
- **Drag & Drop:** `@dnd-kit/core`
- **Terminal:** `xterm.js` or `xterm-for-react`
- **Diffing:** `react-diff-view`

## 2. Directory Structure (`src/`)
```
src/
├── api/                  # Axios/Fetch setup
│   ├── client.ts
│   ├── queries.ts        
│   └── mutations.ts      
├── components/           
│   ├── ui/               # Reusable atomic components
│   └── layout/           
├── features/
│   ├── projects/         # Project creation, selection
│   │   └── PMInitWizard.tsx  # NEW: PM Agent initialization dialog
│   ├── kanban/           # Board, Column, TaskCard
│   │   └── RoleFilter.tsx    # NEW: Filter tasks by agent role
│   ├── task-drawer/      # Task details, Checklist
│   ├── execution/        # Terminal, DiffViewer, GateResults
│   └── local-access/     # Settings page for LDA & Roots
├── stores/               # Zustand
│   └── useUIStore.ts     
├── hooks/
│   ├── useAttemptSocket.ts
│   └── useLocalAgentStatus.ts
└── routes/               # Route definitions
```

## 3. Key Components & Implementation Details

### 3.1 Kanban Board (`features/kanban`)
- **State:** `useQuery(['tasks', projectId, filters])`
  - Filters include agent role (PM, FRONTEND, BACKEND, QA, DEVOPS)
- **Role Badges:** Each task card displays its assigned agent role with color coding
- **Optimistic Updates:** Immediate UI reflection for drag-and-drop.

### 3.1.1 PM Initialization Wizard (`features/projects/PMInitWizard.tsx`)
- **Trigger:** After user creates a new project
- **UI Flow:**
  1. Text area for user to describe the project
  2. "Generate Tasks" button→ calls `/api/projects/{id}/initialize-with-pm`
  3. Loading state while PM agent analyzes
  4. Success: Shows summary of tasks created by role
  5. Navigate to Kanban board with newly generated tasks

### 3.2 Task Drawer (`features/task-drawer`)
- **Agent Selection:** Dropdown list of available profiles.
- **Context Files:** 
  - New "Attachments" section.
  - Allows picking files/folders using native file picker (absolute paths).
  - Validates if selected paths are readable/writable based on current settings.

### 3.3 Execution View (`features/execution`)
- **Terminal:** `xterm.js` streaming logs via WebSocket.
- **Diff Viewer:** Visualizes `git diff` output.

### 3.4 Local Access Settings (`features/local-access`)
**Route:** `/settings/local-access`

**Components:**
1. **AgentStatusIndicator:**
   - Polls `GET /api/local-access/status/`.
   - Shows "Connected" (Green) or "Disconnected" (Red).
2. **WritableRootsManager:**
   - Table listing current roots (Path + Status).
   - "Add Root" button -> Opens native folder picker -> POST path to backend.
3. **AuditLogViewer:**
   - Table of `FsAuditEvents`.
   - Columns: Timestamp, Path, Operation, Result (Allowed/Denied).
   - Filters: "Show Denied Only", Date Range.

## 4. State Management Strategy

### React Query Keys
- `['projects']`
- `['tasks', projectId, filters]`: Tasks with optional role filter
- `['attempt', attemptId]`
- `['pm-decomposition', projectId]`: PM agent's task breakdown
- `['local-access-status']`: LDA connection health.
- `['audit-logs', filters]`: Paginated audit events.

### Zustand Stores
- **AuthStore:** User session.
- **UIStore:** Sidebar state, active modal state.

## 5. Security UX
- **Warnings:**
  - If user tries to run a task with output files outside writable roots, show a pre-flight warning (if detectable).
  - Explicit visual distinction between "Read-Only" references and "Writable" workspaces.
- **Secret Management:**
  - Never display API keys in plain text.
