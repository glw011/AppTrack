# Contributing to AppTrack

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| Bun | latest |
| Python | 3.11+ |
| PostgreSQL | 15+ (or Docker) |
| Docker + Docker Compose | optional (simplifies local setup) |

## Repository Structure

```
apptrack/
├── frontend/        # React + TypeScript SPA (Vite)
├── backend/         # Node.js/Express REST API
├── python-service/  # FastAPI keyword extraction microservice
├── infra/           # Docker Compose, AWS configs
├── docs/            # Architecture diagrams, API spec
└── package.json     # Monorepo root (Bun workspaces)
```

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/glw011/apptrack.git
cd apptrack
bun install
```

### 2. Environment variables

Each service has its own `.env.example` (copy and fill before starting):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Start database

With Docker:
```bash
docker compose -f infra/docker-compose.dev.yml up -d postgres
```

Without Docker: Create local PostgreSQL database named `apptrack` and set `DATABASE_URL` in `backend/.env`.

### 4. Run migrations

```bash
cd backend
bun run db:migrate
bun run db:seed   # optional (loads demo data)
```

### 5. Start services

All services (from repo root...): 
```bash
bun run dev
```

Individually:
```bash
# Terminal 1: backend
cd backend && bun run dev

# Terminal 2: frontend
cd frontend && bun run dev

# Terminal 3: python service
cd python-service
python -m uvicorn main:app --reload --port 8001
```

Services run at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Python service: http://localhost:8001
- API docs (Swagger): http://localhost:3000/api/docs

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production ready code only (PROTECTED) |
| `dev` | Integration branch (feature branches merged here first) |
| `feature/<name>` | One branch per feature/task |
| `fix/<name>` | Bug fixes |

**Workflow:**
1. Branch from `dev`: `git checkout -b feature/my-feature-or-task dev`
2. Commits with properly formatted/clear messages (see below)
3. Open PR targeting `dev`
4. CI must pass before merging
5. `dev` --> `main` PRs for releases

## Commit Message Format

```
<type>: <short description>

<optional body message>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`

Examples:
```
feat: add application status PATCH endpoint
fix: resolve JWT expiry not being checked on /me route
test: add supertest coverage for auth routes
docs: update local setup instructions
```

## Running Tests

```bash
# Backend
cd backend && bun run test

# Frontend
cd frontend && bun run test

# Python service
cd python-service && pytest
```

## Code Style

- **TypeScript**: ESLint + Prettier: run `bun run lint` before commit
- **Python**: Ruff: run `ruff check .` before commit
- No `any` types in TypeScript without explanation comment
- No secrets or `.env` files in commits
