# Local Desktop Agent (LDA)

The Local Desktop Agent is a secure service that runs on your local machine to provide AI agents with controlled access to your filesystem and development tools.

## Features

- **Secure Filesystem Access**: Agents can only access approved writable roots
- **Git Operations**: Safe git worktree management for parallel development
- **AI Agents**: PM, Frontend, Backend, QA, and DevOps agents
- **Quality Gates**: Automated testing and linting

## Setup

### 1. Install Dependencies

```bash
cd lda
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the `lda` directory:

```env
# LDA Server
APP_NAME="Agent Company LDA"
DEBUG=True
PORT=8001
HOST=127.0.0.1

# Security
LDA_SECRET_KEY=your-lda-secret-key-change-me

# LLM API Keys
# Gemini API: https://makersuite.google.com/app/apikey
GOOGLE_API_KEY=your-google-api-key-here

# GLM-7 API (BigModel/Zhipu AI): https://open.bigmodel.cn/
OPENAI_API_KEY=your-glm-api-key-here

# Backend URL
BACKEND_URL=http://localhost:8000
```

### 3. Run the Service

```bash
python main.py
```

The service will start on `http://127.0.0.1:8001`

## API Endpoints

### Filesystem Operations
- `POST /api/v1/files/read` - Read file contents
- `POST /api/v1/files/write` - Write to file
- `POST /api/v1/files/list` - List directory contents
- `POST /api/v1/files/delete` - Safe delete (moves to trash)

### Git Operations
- `POST /api/v1/git/status` - Get git status
- `POST /api/v1/git/diff` - Get git diff
- `POST /api/v1/git/commit` - Create commit
- `POST /api/v1/git/worktree/add` - Create worktree
- `POST /api/v1/git/worktree/remove` - Remove worktree
- `POST /api/v1/git/merge` - Merge branches
- `POST /api/v1/git/cleanup` - Cleanup worktree

### AI Agents
- `POST /api/v1/pm/decompose` - PM Agent: Decompose requirements into tasks
- `POST /api/v1/agent/run` - Execute specialized agent (Frontend, Backend, QA, DevOps)

### Quality Gates
- `POST /api/v1/quality/run` - Run quality gates (tests, linting)

### Health Check
- `GET /health` - Service health check

## Agent Types

### PM Agent
Analyzes requirements and decomposes them into actionable tasks for specialized agents.

**Supported Models:**
- `gemini-2.5-flash` - Fast and cost-effective (recommended)
- `glm-7` - Lightweight alternative

### Specialized Agents

- **Frontend Agent**: React, TypeScript, UI implementation
- **Backend Agent**: Python, Django, API development
- **QA Agent**: Testing, quality assurance
- **DevOps Agent**: CI/CD, deployment, infrastructure

## Security

All API requests must include signature headers for authentication:
- `X-Timestamp`: Current Unix timestamp
- `X-Signature`: SHA256 HMAC of `timestamp + secret_key`

The backend automatically includes these headers when communicating with LDA.

## Writable Roots

Agents can only write to directories explicitly approved as "writable roots" in the main application. This prevents accidental modifications to system files or sensitive directories.

Configure writable roots through the main application UI at `/settings/local-access`.

## Troubleshooting

### Missing API Key Error
Ensure you've set the appropriate API key in your `.env` file:
- For Gemini models: Set `GOOGLE_API_KEY`
- For GLM-7: Set `OPENAI_API_KEY`

### Permission Denied
Check that the target directory is configured as a writable root in the main application.

### Module Not Found
Make sure you've installed all dependencies:
```bash
pip install -r requirements.txt
```

## Development

The LDA service runs independently and communicates with the main Django backend via HTTP APIs. The backend sends tasks to LDA, which executes them and returns results.
