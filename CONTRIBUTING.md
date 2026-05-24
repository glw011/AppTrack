# Contributing to AppTrackr

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| Bun | latest |
| Python | 3.11+ |
| PostgreSQL | 15+ (or Docker) |
| Docker + Docker Compose | optional, simplifies local DB setup |

## Repository Structure

```
apptrackr/
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
git clone https://github.com/<your-username>/apptrackr.git
cd apptrackr
bun install
```

### 2. Environment variables

Each service has its own `.env.example`. Copy and fill in values before starting:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Start the database

With Docker:
```bash
docker compose -f infra/docker-compose.dev.yml up -d postgres
```

Without Docker — create a local PostgreSQL database named `apptrackr` and set `DATABASE_URL` in `backend/.env`.

### 4. Run migrations

```bash
cd backend
bun run db:migrate
bun run db:seed   # optional — loads demo data
```

### 5. Start all services

From the repo root:
```bash
bun run dev
```

Or individually:
```bash
# Terminal 1 — backend
cd backend && bun run dev

# Terminal 2 — frontend
cd frontend && bun run dev

# Terminal 3 — python service
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
| `main` | Production-ready code only. Protected — no direct pushes. |
| `dev` | Integration branch. Merge feature branches here first. |
| `feature/<name>` | One branch per feature or task. |
| `fix/<name>` | Bug fixes. |

**Workflow:**
1. Branch from `dev`: `git checkout -b feature/my-feature dev`
2. Commit with clear messages (see below)
3. Open a PR targeting `dev`
4. CI must pass before merging
5. `dev` → `main` PRs are for releases only

## Commit Message Format

```
<type>: <short description>

<optional body>
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

- **TypeScript**: ESLint + Prettier — run `bun run lint` before committing
- **Python**: Ruff — run `ruff check .` before committing
- No `any` types in TypeScript without a comment explaining why
- No secrets or `.env` files committed — ever
