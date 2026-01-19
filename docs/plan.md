# Implementation Plan — Agent Company (v1.3) [COMPREHENSIVE]

> **Based on:** [PRD v1.3](file:///c:/Users/muro/Documents/GitHub/agent-company/docs/prd-3.md)  
> **Last Updated:** 2026-01-17  
> **Target Timeline:** 12 weeks (Milestone 1-5)  
> **Team:** 2 full-time developers + 1 part-time designer

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Success Criteria](#success-criteria)
3. [Technical Stack](#technical-stack)
4. [Development Phases](#development-phases)
5. [Phase 1: Foundation & Boilerplate (Weeks 1-3)](#phase-1-foundation--boilerplate-weeks-1-3)
6. [Phase 2: Real-Time Pipeline (Weeks 4-6)](#phase-2-real-time-pipeline-weeks-4-6)
7. [Phase 3: Local Desktop Agent (Weeks 7-9)](#phase-3-local-desktop-agent-weeks-7-9)
8. [Phase 4: Multi-Agent Execution (Weeks 10-11)](#phase-4-multi-agent-execution-weeks-10-11)
9. [Phase 5: Review & Safety (Week 12)](#phase-5-review--safety-week-12)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Plan](#deployment-plan)

---

## Project Overview

**Agent Company** is an AI-powered development orchestration platform featuring:
- **Multi-agent specialization:** 5 specialized AI agents (PM, Frontend, Backend, QA, DevOps)
- **Intelligent PM Agent:** Automatically decomposes project requirements into tasks
- **Kanban workflow:** Visual task management with drag-and-drop
- **Parallel execution:** Multiple agents work simultaneously in isolated git worktrees
- **Secure local filesystem:** Read-anywhere, write to user-approved folders only
- **Real-time streaming:** Live logs and progress updates via WebSockets

---

## Success Criteria

### MVP+ Launch Criteria (Must Achieve)

| Category | Metric | Target | Validation Method |
|----------|--------|--------|-------------------|
| **User Experience** | Time to First Task Completion | < 10 minutes | Automated timer tracking |
| | User Retention (Week 1) | ≥ 60% | Analytics cohort analysis |
| | Task Approval Rate | ≥ 70% | Approve/reject ratio |
| **Agent Performance** | PM Agent Task Quality | ≥ 85% | User rating survey |
| | Code Quality Gate Pass Rate | ≥ 80% | Automated gate results |
| | Parallel Execution Speedup | ≥ 2.5x | Time comparison benchmarks |
| **Safety & Security** | Permission Clarity | ≥ 90% | In-app comprehension quiz |
| | Unauthorized Write Attempts | 0 | Automated security tests |
| | Audit Log Completeness | 100% | Write/delete operation coverage |
| **Technical Performance** | WebSocket Connection Stability | ≥ 99% | Uptime monitoring |
| | Event Stream Latency | < 500ms | Real-time latency tracking |
| | Page Load Time | < 3 seconds | Lighthouse CI |

### Non-Functional Requirements Checklist

**Performance:**
- [ ] Page load time (initial): < 3 seconds (Lighthouse)
- [ ] Task board rendering (100 tasks): < 1 second
- [ ] Agent spawn time: < 5 seconds
- [ ] Database query p95: < 100ms
- [ ] Diff rendering (5000 lines): < 2 seconds

**Security:**
- [ ] JWT authentication with HTTP-only cookies
- [ ] All DRF endpoints protected with permission classes
- [ ] WebSocket token validation in middleware
- [ ] TLS for LDA ↔ Backend communication
- [ ] Rate limiting: 100 req/min per user
- [ ] SQL injection prevention (Django ORM only)
- [ ] XSS prevention (React auto-escape + CSP headers)
- [ ] CSRF protection enabled

**Reliability:**
- [ ] System uptime: 99.5%
- [ ] WebSocket auto-reconnect with exponential backoff
- [ ] Agent retry on transient errors (max 2 attempts)
- [ ] Daily automated database backups

**Compatibility:**
- [ ] Browser support: Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- [ ] LDA OS support: Windows 10+, macOS 12+, Ubuntu 20.04+
- [ ] Git version: 2.5+ (worktree support)
- [ ] Python: 3.9+
- [ ] Node: 18+

**Accessibility:**
- [ ] WCAG 2.1 Level AA compliance
- [ ] Full keyboard navigation
- [ ] ARIA labels on all interactive elements
- [ ] Color contrast: ≥ 4.5:1 for text

---

## Technical Stack

### Backend
- **Framework:** Django 4.2+ with Django REST Framework
- **Real-time:** Django Channels 4.0+ (WebSockets)
- **Task Queue:** Celery 5.3+ with Redis broker
- **Database:** PostgreSQL 16 (primary storage)
- **Cache:** Redis 7 (Celery + Channels layer)
- **Authentication:** JWT (djangorestframework-simplejwt)

### Frontend
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite 5+
- **State Management:** Zustand + React Query
- **UI Components:** Headless UI + Tailwind CSS 3.4+
- **Routing:** React Router 6+
- **Kanban:** @dnd-kit (drag & drop)
- **Diff Viewer:** react-diff-view or Monaco Diff Editor
- **Terminal:** xterm.js

### Local Desktop Agent (LDA)
- **Framework:** FastAPI (Python) or Go + Fiber (TBD in Week 2)
- **Git Operations:** GitPython or libgit2
- **Filesystem:** pathlib + os.path.realpath
- **LLM Integration:** OpenAI SDK + Google GenerativeAI

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Nginx (production)
- **CI/CD:** GitHub Actions (TBD post-MVP)
- **Monitoring:** Sentry for error tracking (post-MVP)

---

## Development Phases

### Week-by-Week Breakdown

| Week | Phase | Milestone | Key Deliverables |
|------|-------|-----------|------------------|
| 1-3 | Foundation | M1: Backend + DB + Auth | User auth, Project/Task CRUD, Basic frontend |
| 4-6 | Real-Time | M2: Channels + WebSocket | Live log streaming, Celery setup |
| 7-9 | Local Agent | M3: LDA + Filesystem | Writable roots, Permission enforcement, Audit logs |
| 10-11 | Multi-Agent | M4: PM + Specialized Agents | PM decomposition, Parallel execution, Quality gates |
| 12 | Polish | M5: Review + Safety | Approve/reject, Safe delete, Security tests |

---

## Phase 1: Foundation & Boilerplate (Weeks 1-3)

**Goal:** Stable monorepo with authenticated users, project/task CRUD, and basic Kanban UI.

### Milestone 1 Success Criteria
- [ ] User can register, login, logout (JWT auth)
- [ ] User can create a project with name + repo path
- [ ] User can manually create 5 tasks with titles, descriptions, roles
- [ ] Basic Kanban board displays tasks in 4 columns
- [ ] All APIs return data in <100ms (p95)
- [ ] Frontend loads in <3 seconds

---

### 1.1 Repository Structure

#### Step 1.1.1: Initialize Monorepo
```bash
mkdir agent-company
cd agent-company
git init
echo "# Agent Company" > README.md
```

#### Step 1.1.2: Create Directory Structure
```bash
# Backend
mkdir -p backend/apps/{users,projects,tasks,attempts,agents,local_access,realtime}
mkdir -p backend/config

# Frontend
mkdir -p frontend/src/{api,components/{ui,layout},features/{auth,projects,kanban,task-detail,execution,settings},stores,hooks,routes,types}

# Local Desktop Agent
mkdir -p lda/{services,core,prompts}

# Documentation
mkdir -p docs

# Configuration
mkdir -p .github/workflows .vscode

# Create initial files
touch .gitignore .env.example docker-compose.yml
```

#### Step 1.1.3: Create .gitignore
```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
*.egg-info/
dist/
build/

# Node
node_modules/
dist/
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Secrets
.env
*.pem
*.key

# Database
*.db
*.sqlite3
postgres_data/
```

#### Step 1.1.4: Setup Docker Compose
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: agent-company-db
    environment:
      POSTGRES_DB: agent_company
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: agent-company-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
```

**Test:**
```bash
docker-compose up -d
docker-compose ps  # Should show both services as "Up"
```

---

### 1.2 Backend: Django Foundation

#### Step 1.2.1: Initialize Django Project
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install core dependencies
pip install django==4.2.* \
  djangorestframework==3.14.* \
  djangorestframework-simplejwt==5.3.* \
  django-cors-headers==4.3.* \
  psycopg2-binary==2.9.* \
  python-dotenv==1.0.* \
  celery==5.3.* \
  redis==5.0.* \
  channels==4.0.* \
  channels-redis==4.1.*

# Create requirements.txt
pip freeze > requirements.txt

# Initialize Django project
django-admin startproject config .
```

#### Step 1.2.2: Create Django Apps
```bash
cd backend

# Create apps directory
mkdir -p apps

# Create all apps
python manage.py startapp users apps/users
python manage.py startapp projects apps/projects
python manage.py startapp tasks apps/tasks
python manage.py startapp attempts apps/attempts
python manage.py startapp agents apps/agents
python manage.py startapp local_access apps/local_access
python manage.py startapp realtime apps/realtime
```

#### Step 1.2.3: Configure settings.py
Edit `backend/config/settings.py`:

```python
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    
    # Local apps
    'apps.users',
    'apps.projects',
    'apps.tasks',
    'apps.attempts',
    'apps.agents',
    'apps.local_access',
    'apps.realtime',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'agent_company'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Channels (WebSocket) Configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(os.getenv('REDIS_HOST', 'localhost'), int(os.getenv('REDIS_PORT', 6379)))],
        },
    },
}

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

# LDA Configuration
LDA_URL = os.getenv('LDA_URL', 'http://localhost:8001')
LDA_SECRET_KEY = os.getenv('LDA_SECRET_KEY', 'your-secret-key-here')  # Generate with: secrets.token_urlsafe(32)

# Security Settings (Production)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
```

#### Step 1.2.4: Create Custom User Model
Edit `backend/apps/users/models.py`:
```python
import uuid
from django.contrib.auth.models.AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom user model with UUID primary key.
    Extends Django's AbstractUser with additional fields.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)  # Override to make unique
    
    # Settings
    preferred_llm_model = models.CharField(
        max_length=50,
        choices=[('glm-7', 'GLM-7'), ('gemini-2.5-flash', 'Gemini 2.5 Flash')],
        default='gemini-2.5-flash'
    )
    
    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.username
```

#### Step 1.2.5: Create User Serializers
Create `backend/apps/users/serializers.py`:
```python
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'preferred_llm_model', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords must match"})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user
```

#### Step 1.2.6: Create Auth Views
Create `backend/apps/users/views.py`:
```python
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, UserRegistrationSerializer

class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
```

#### Step 1.2.7: Setup URLs
Create `backend/apps/users/urls.py`:
```python
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, CurrentUserView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
]
```

Edit `backend/config/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
]
```

#### Step 1.2.8: Initial Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser  # Follow prompts
python manage.py runserver
```

**Test:**
```bash
# Register new user
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "testpass123", "password_confirm": "testpass123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'

# Should receive access and refresh tokens
```

---

### 1.3 Frontend: React Foundation

#### Step 1.3.1: Initialize Vite Project
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

#### Step 1.3.2: Install Dependencies
```bash
# Core dependencies
npm install axios react-router-dom @tanstack/react-query zustand

# UI dependencies
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Additional libraries
npm install lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install xterm xterm-addon-fit
npm install react-diff-view diff
npm install sonner  # Toast notifications
npm install @headlessui/react @heroicons/react
```

#### Step 1.3.3: Configure Tailwind
Edit `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Agent role colors
        role: {
          pm: '#9333ea',        // purple
          frontend: '#3b82f6',  // blue
          backend: '#10b981',   // green
          qa: '#f59e0b',        // yellow
          devops: '#ef4444',    // red
        }
      }
    },
  },
  plugins: [],
}
```

Edit `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
  }
  
  .btn-secondary {
    @apply px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm p-6;
  }
}
```

#### Step 1.3.4: Configure TypeScript Path Aliases
Edit `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
```

Edit `frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### Step 1.3.5: Create API Client
Create `frontend/src/api/client.ts`:
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',  // Proxied by Vite
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/api/auth/token/refresh/', {
          refresh: refreshToken,
        });
        
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

Create `frontend/src/api/auth.ts`:
```typescript
import { apiClient } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  preferred_llm_model: 'glm-7' | 'gemini-2.5-flash';
  date_joined: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login/', data);
    return response.data;
  },
  
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register/', data);
    return response.data;
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};
```

#### Step 1.3.6: Create Auth Store (Zustand)
Create `frontend/src/stores/authStore.ts`:
```typescript
import { create } from 'zustand';
import { authApi, User } from '@/api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, password_confirm: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  login: async (username, password) => {
    const response = await authApi.login({ username, password });
    localStorage.setItem('access_token', response.tokens.access);
    localStorage.setItem('refresh_token', response.tokens.refresh);
    set({ user: response.user, isAuthenticated: true });
  },
  
  register: async (username, email, password, password_confirm) => {
    const response = await authApi.register({ username, email, password, password_confirm });
    localStorage.setItem('access_token', response.tokens.access);
    localStorage.setItem('refresh_token', response.tokens.refresh);
    set({ user: response.user, isAuthenticated: true });
  },
  
  logout: () => {
    authApi.logout();
    set({ user: null, isAuthenticated: false });
  },
  
  checkAuth: async () => {
    try {
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
```

#### Step 1.3.7: Create App Structure
Create `frontend/src/App.tsx`:
```typescript
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

// Components (to be created)
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/projects" />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
```

**Test:**
```bash
npm run dev
# Visit http://localhost:5173
# Should see routing working (redirect to /login)
```

---

### 1.4 Core Domain Models (Projects & Tasks)

#### Step 1.4.1: Create Project Model
Edit `backend/apps/projects/models.py`:
```python
import uuid
from django.db import models
from django.conf import settings

class Project(models.Model):
    """
    Represents a software project with associated git repository.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='projects'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    repo_path = models.CharField(max_length=1024)  # Absolute path to local repo
    
    # Project configuration
    config = models.JSONField(default=dict, blank=True)  # {install_cmd, test_cmd, lint_cmd, build_cmd}
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.owner.username})"
    
    @property
    def task_count(self):
        return self.tasks.count()
    
    @property
    def completion_percentage(self):
        total = self.tasks.count()
        if total == 0:
            return 0
        done = self.tasks.filter(status='DONE').count()
        return int((done / total) * 100)
```

#### Step 1.4.2: Create Task Model
Edit `backend/apps/tasks/models.py`:
```python
import uuid
from django.db import models

class Task(models.Model):
    """
    Represents a development task assigned to a specific agent role.
    """
    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('IN_REVIEW', 'In Review'),
        ('DONE', 'Done'),
    ]
    
    ROLE_CHOICES = [
        ('PM', 'Project Manager'),
        ('FRONTEND', 'Frontend Developer'),
        ('BACKEND', 'Backend Developer'),
        ('QA', 'QA Engineer'),
        ('DEVOPS', 'DevOps Engineer'),
    ]
    
    PRIORITY_CHOICES = [
        (1, 'Critical'),
        (2, 'High'),
        (3, 'Medium'),
        (4, 'Low'),
        (5, 'Optional'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project', 
        on_delete=models.CASCADE, 
        related_name='tasks'
    )
    
    # Task details
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    acceptance_criteria = models.JSONField(default=list, blank=True)  # List of strings
    
    # Assignment and status
    agent_role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='TODO')
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=3)
    
    # Dependencies
    dependencies = models.JSONField(default=list, blank=True)  # List of task UUIDs
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks'
        ordering = ['priority', '-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['project', 'agent_role']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} [{self.agent_role}]"
    
    @property
    def is_blocked(self):
        """Check if task is blocked by incomplete dependencies."""
        if not self.dependencies:
            return False
        dependent_tasks = Task.objects.filter(id__in=self.dependencies)
        return dependent_tasks.exclude(status='DONE').exists()
    
    @property
    def attempt_count(self):
        return self.attempts.count()
    
    @property
    def latest_attempt(self):
        return self.attempts.order_by('-created_at').first()
```

#### Step 1.4.3: Create Serializers
Create `backend/apps/projects/serializers.py`:
```python
from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.IntegerField(read_only=True)
    completion_percentage = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'repo_path', 'config',
            'task_count', 'completion_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['name', 'description', 'repo_path', 'config']
    
    def validate_repo_path(self, value):
        import os
        if not os.path.isabs(value):
            raise serializers.ValidationError("Repo path must be absolute")
        return value
```

Create `backend/apps/tasks/serializers.py`:
```python
from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    is_blocked = serializers.BooleanField(read_only=True)
    attempt_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'project', 'title', 'description', 'acceptance_criteria',
            'agent_role', 'status', 'priority', 'dependencies',
            'is_blocked', 'attempt_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_dependencies(self, value):
        """Validate that dependencies are valid task IDs in the same project."""
        if not value:
            return value
        
        project_id = self.initial_data.get('project') or self.instance.project_id
        valid_tasks = Task.objects.filter(
            id__in=value,
            project_id=project_id
        ).values_list('id', flat=True)
        
        invalid = set(value) - set(str(tid) for tid in valid_tasks)
        if invalid:
            raise serializers.ValidationError(f"Invalid task dependencies: {invalid}")
        
        return value

class TaskMoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.STATUS_CHOICES)
    priority = serializers.IntegerField(required=False, min_value=1, max_value=5)
```

#### Step 1.4.4: Create ViewSets
Create `backend/apps/projects/views.py`:
```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Project
from .serializers import ProjectSerializer, ProjectCreateSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectSerializer
    
    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get detailed project statistics."""
        project = self.get_object()
        tasks = project.tasks.all()
        
        stats = {
            'total_tasks': tasks.count(),
            'by_status': {},
            'by_role': {},
            'completion_percentage': project.completion_percentage,
        }
        
        for status_choice, _ in Task.STATUS_CHOICES:
            stats['by_status'][status_choice] = tasks.filter(status=status_choice).count()
        
        for role_choice, _ in Task.ROLE_CHOICES:
            stats['by_role'][role_choice] = tasks.filter(agent_role=role_choice).count()
        
        return Response(stats)
```

Create `backend/apps/tasks/views.py`:
```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Task
from .serializers import TaskSerializer, TaskMoveSerializer

class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskSerializer
    
    def get_queryset(self):
        queryset = Task.objects.filter(project__owner=self.request.user)
        
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(agent_role=role)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        return queryset.select_related('project')
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move task to different status/priority."""
        task = self.get_object()
        serializer = TaskMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        task.status = serializer.validated_data['status']
        if 'priority' in serializer.validated_data:
            task.priority = serializer.validated_data['priority']
        task.save()
        
        return Response(TaskSerializer(task).data)
    
    @action(detail=True, methods=['get'])
    def check_dependencies(self, request, pk=None):
        """Check if task dependencies are met."""
        task = self.get_object()
        
        if not task.dependencies:
            return Response({'can_start': True, 'blocked_by': []})
        
        blocked_tasks = Task.objects.filter(
            id__in=task.dependencies
        ).exclude(status='DONE').values('id', 'title', 'status')
        
        return Response({
            'can_start': not blocked_tasks.exists(),
            'blocked_by': list(blocked_tasks)
        })
```

#### Step 1.4.5: Setup URLs
Create `backend/apps/projects/urls.py`:
```python
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')

urlpatterns = router.urls
```

Create `backend/apps/tasks/urls.py`:
```python
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = router.urls
```

Update `backend/config/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/', include('apps.projects.urls')),
    path('api/', include('apps.tasks.urls')),
]
```

#### Step 1.4.6: Run Migrations
```bash
cd backend
python manage.py makemigrations projects tasks
python manage.py migrate
```

**Test:**
```bash
# Create project
curl -X POST http://localhost:8000/api/projects/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "A test project",
    "repo_path": "/Users/test/projects/test-repo",
    "config": {"test_cmd": "npm test"}
  }'

# Create task
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "PROJECT_UUID",
    "title": "Implement login form",
    "description": "Create LoginForm component with email/password inputs",
    "agent_role": "FRONTEND",
    "priority": 2
  }'

# List tasks for project
curl http://localhost:8000/api/tasks/?project=PROJECT_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 1.5 Frontend: Kanban Board

#### Step 1.5.1: Create API Types and Functions
Create `frontend/src/api/projects.ts`:
```typescript
import { apiClient } from './client';

export interface Project {
  id: string;
  name: string;
  description: string;
  repo_path: string;
  config: Record<string, any>;
  task_count: number;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  repo_path: string;
  config?: Record<string, any>;
}

export const projectsApi = {
  list: () => apiClient.get<Project[]>('/projects/'),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}/`),
  create: (data: ProjectCreate) => apiClient.post<Project>('/projects/', data),
  update: (id: string, data: Partial<ProjectCreate>) => 
    apiClient.patch<Project>(`/projects/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/projects/${id}/`),
  stats: (id: string) => apiClient.get(`/projects/${id}/stats/`),
};
```

Create `frontend/src/api/tasks.ts`:
```typescript
import { apiClient } from './client';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type AgentRole = 'PM' | 'FRONTEND' | 'BACKEND' | 'QA' | 'DEVOPS';

export interface Task {
  id: string;
  project: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  agent_role: AgentRole;
  status: TaskStatus;
  priority: number;
  dependencies: string[];
  is_blocked: boolean;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  project: string;
  title: string;
  description?: string;
  acceptance_criteria?: string[];
  agent_role: AgentRole;
  priority?: number;
  dependencies?: string[];
}

export const tasksApi = {
  list: (projectId?: string, role?: AgentRole, status?: TaskStatus) => {
    const params = new URLSearchParams();
    if (projectId) params.append('project', projectId);
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    return apiClient.get<Task[]>(`/tasks/?${params}`);
  },
  
  get: (id: string) => apiClient.get<Task>(`/tasks/${id}/`),
  
  create: (data: TaskCreate) => apiClient.post<Task>('/tasks/', data),
  
  update: (id: string, data: Partial<TaskCreate>) =>
    apiClient.patch<Task>(`/tasks/${id}/`, data),
  
  delete: (id: string) => apiClient.delete(`/tasks/${id}/`),
  
  move: (id: string, status: TaskStatus, priority?: number) =>
    apiClient.post<Task>(`/tasks/${id}/move/`, { status, priority }),
  
  checkDependencies: (id: string) =>
    apiClient.get(`/tasks/${id}/check_dependencies/`),
};
```

#### Step 1.5.2: Create React Query Hooks  
Create `frontend/src/hooks/useProjects.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, ProjectCreate } from '@/api/projects';
import { toast } from 'sonner';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsApi.list();
      return response.data;
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      if (!id) throw new Error('Project ID required');
      const response = await projectsApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ProjectCreate) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create project');
    },
  });
}
```

Create `frontend/src/hooks/useTasks.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, TaskCreate, TaskStatus, AgentRole } from '@/api/tasks';
import { toast } from 'sonner';

export function useTasks(projectId?: string, role?: AgentRole) {
  return useQuery({
    queryKey: ['tasks', projectId, role],
    queryFn: async () => {
      const response = await tasksApi.list(projectId, role);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      if (!id) throw new Error('Task ID required');
      const response = await tasksApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create task');
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, priority }: { 
      id: string; 
      status: TaskStatus; 
      priority?: number;
    }) => tasksApi.move(id, status, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to move task');
    },
  });
}
```

---

**[The plan continues with detailed implementations for Phases 2-5, following this same level of detail...]**

**Character limit reached - This comprehensive plan would continue for another ~3000 lines covering:**

## Phase 2: Real-Time Pipeline (Weeks 4-6) - Including:
- Detailed Django Channels configuration (routing.py, consumers.py, ASGI setup)
- Celery worker setup with beat scheduler
- WebSocket event protocol specification
- Frontend WebSocket connection manager with reconnection logic
- Real-time log streaming component implementation
- Attempt model with full state machine (QUEUED → RUNNING → SUCCESS/FAILED)

## Phase 3: Local Desktop Agent (weeks 7-9) - Including:
- LDA architecture decision (FastAPI vs Go - decision matrix)
- Filesystem permission manager with canonical path resolution
- Writable roots management UI
- Audit log ingestion endpoint and UI with filters/export
- Safe delete implementation (trash/quarantine folder)
- Git worktree creation and management
- LDA ↔ Backend authentication with signed tokens

## Phase 4: Multi-Agent Execution (Weeks 10-11) - Including:
- PM Agent service with GLM-7 and Gemini 2.5 Flash integration
- PM decomposition endpoint and frontend wizard
- Role-specific agent prompts for Frontend/Backend/QA/DevOps
- Dependency resolution algorithm
- Parallel execution coordinator
- Quality gates (tests + linting) implementation
- Diff generation and viewer component

## Phase 5: Review & Safety (Week 12) - Including:
- Approve/reject workflow with merge logic
- Conflict detection and resolution helpers
- Security testing checklist (path traversal, symlink escapes, etc.)
- End-to-end testing scenarios
- Performance optimization (query optimization, frontend code splitting)
- Documentation (user guide, API docs, developer setup guide)
- Launch readiness checklist

---

## Testing Strategy

### Unit Tests (Target: 80% coverage)
- Backend: pytest + pytest-django + factory_boy
- Frontend: Vitest + React Testing Library
- LDA: pytest (Python) or Go testing framework

### Integration Tests
- API endpoint tests with real database
- WebSocket connection tests
- LDA filesystem operations with temp directories

### End-to-End Tests
- Playwright for critical user flows
- PM Agent → Task Creation → Agent Execution → Approve → Merge

### Security Tests
- Path traversal exploits
- Symlink escape attempts
- Unauthorized file access
- SQL injection via Django ORM
- XSS via React
- CSRF token validation

### Performance Tests
- Load testing with Locust (100 concurrent users)
- WebSocket stress testing
- Database query optimization

---

## Deployment Plan

### Development Environment
- docker-compose.yml with all services
- Vite dev server with HMR
- Hot-reload for Django and Celery

### Production (Post-MVP)
- Docker containers for Backend, Celery, Channels
- Nginx reverse proxy
- PostgreSQL managed service (AWS RDS / Supabase)
- Redis managed service
- Frontend: Static hosting (Vercel / Netlify)
- LDA: Standalone installer (Electron or native)

---

## Next Steps

1. **Week 1 Kickoff:**
   - Clone this plan into GitHub Project board
   - Set
