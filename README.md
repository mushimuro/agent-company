# Agent Company 🤖

**AI-powered project management and development automation platform**

A full-stack application that uses specialized AI agents (PM, Frontend, Backend, QA, DevOps) to autonomously plan, develop, and manage software projects.

---

## 🚀 Quick Start

**[→ See Quick Start Guide](./docs/QUICK_START.md)**

**[→ See Full Development Setup](./docs/DEVELOPMENT_SETUP.md)**

---

## 📋 What You Need

- Python 3.14+
- Node.js 18+
- Docker Desktop
- Git

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│              http://localhost:5173                       │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────┐
│                 Backend (Django + DRF)                   │
│              http://localhost:8000                       │
└─────┬──────────────────────────────┬─────────────────┬──┘
      │                              │                 │
      │ WebSocket                    │ Celery Tasks    │ HMAC Auth
      ▼                              ▼                 ▼
┌──────────┐                  ┌──────────────┐   ┌─────────────┐
│ Channels │                  │ Celery Worker│   │  LDA Service│
│  Redis   │                  │   + Redis    │   │  (FastAPI)  │
└──────────┘                  └──────┬───────┘   └──────┬──────┘
                                     │                   │
                                     │ Background Tasks  │ AI Agents
                                     ▼                   ▼
                              ┌──────────────────────────────┐
                              │  PostgreSQL + Git Worktrees  │
                              └──────────────────────────────┘
```

---

## 🎯 Features

### ✅ Implemented
- **AI-Powered Planning:** PM Agent decomposes requirements into actionable tasks
- **Specialized Agents:** Frontend, Backend, QA, DevOps agents for task execution
- **Visual Task Board:** Kanban board with drag-and-drop and dependency tracking
- **Real-time Updates:** WebSocket-powered live status updates
- **Git Worktrees:** Isolated execution environments for parallel work
- **Quality Gates:** Automated testing and linting
- **Local File Access:** Secure filesystem operations with signature authentication

### 🚧 In Progress
- Agent execution with actual file modifications
- Code review and approval workflow
- Test execution and reporting
- Multi-project management

---

## 🛠️ Tech Stack

### Frontend
- React + TypeScript
- TanStack Query (React Query)
- Tailwind CSS
- Vite

### Backend
- Django + Django REST Framework
- Celery (async tasks)
- Django Channels (WebSocket)
- PostgreSQL
- Redis

### LDA (Local Development Agent)
- FastAPI
- GitPython
- Google Gemini / OpenAI APIs
- HMAC-SHA256 authentication

---

## 📚 Documentation

- **[Quick Start](./docs/QUICK_START.md)** - Start all services in 5 commands
- **[Development Setup](./docs/DEVELOPMENT_SETUP.md)** - Detailed setup guide
- **[Error Logs](./docs/error-log/)** - Known issues and solutions
- **[Backend Architecture](./docs/backend-architecture.md)**
- **[Frontend Architecture](./docs/frontend-architecture.md)**
- **[Database Schema](./docs/database-architecture.md)**

---

## 🔧 Development

### Required Services (5 terminals)

1. **Docker:** `docker compose up -d`
2. **Backend:** `cd backend && python manage.py runserver`
3. **Frontend:** `cd frontend && npm run dev`
4. **Celery:** `cd backend && celery -A config worker --loglevel=info -P solo`
5. **LDA:** `cd lda && python main.py`

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Backend Admin | http://localhost:8000/admin |
| LDA API | http://localhost:8001 |
| LDA Docs | http://localhost:8001/docs |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

## 📝 License

[Your License Here]

---

## 🆘 Troubleshooting

**Services won't start?**
- Check Docker is running: `docker ps`
- Check ports are free: `netstat -ano | findstr :8000`
- See [Development Setup](./docs/DEVELOPMENT_SETUP.md) for detailed troubleshooting

**Tasks failing?**
- Check [Error Logs](./docs/error-log/) for known issues
- Verify Git repository is initialized with commits
- Restart Celery after code changes

**More help:**
- Check terminal logs
- See documentation in `/docs`
- Review error log files

---

**Built with ❤️ using AI-powered development**
