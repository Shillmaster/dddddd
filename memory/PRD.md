# Fractal Research Terminal — PRD

## Original Problem Statement
Production-grade Fractal module setup with Telegram alerts, Module Isolation, and Contract Lock v2.1.1

## Architecture
```
/app
├── backend (FastAPI proxy → Fastify TypeScript)
│   ├── server.py              # Python proxy (port 8001)
│   └── src/
│       ├── app.fractal.ts     # Isolated Fractal entrypoint (port 8002)
│       ├── modules/fractal/   # Fractal business logic
│       │   ├── MODULE_BOUNDARY.md  # Isolation spec
│       │   ├── alerts/        # BLOCK 67-68: Alert System
│       │   └── isolation/     # BLOCK B: HostDeps, Guards
│       └── scripts/fractal_import_guard.ts
└── frontend (React + Craco)
    └── src/pages/FractalAdminPage.js
```

## What's Been Implemented

### 2026-02-18 — Full Stack Deployment
- ✅ Cloned GitHub repository ccccw44
- ✅ MongoDB running: `fractal_dev` database
- ✅ TypeScript backend (Fastify on port 8002)
- ✅ Frontend (React + Craco)

### 2026-02-18 — BLOCK 67-68: Alert System
- ✅ Alert Engine Core (BTC-only)
- ✅ Rate limiting: 3 INFO/HIGH per 24h
- ✅ Dedup + Cooldown (6h INFO/HIGH, 1h CRITICAL)
- ✅ MongoDB logging (fractal_alerts_log)
- ✅ Telegram adapter with FRACTAL_ALERTS_ENABLED guard
- ✅ Admin UI: Alerts tab

### 2026-02-18 — Telegram Activation (Шаг 1)
- ✅ Added env: TG_BOT_TOKEN, TG_ADMIN_CHAT_ID, FRACTAL_ALERTS_ENABLED
- ✅ Alert adapter checks FRACTAL_ALERTS_ENABLED=true before sending
- ✅ Logs to MongoDB regardless of send status
- ✅ Guard: `if (blockedBy !== 'NONE') return`

### 2026-02-18 — Daily Cron Order (Шаг 2)
- ✅ Order: WRITE → RESOLVE → REBUILD → ALERTS_RUN → AUDIT
- ✅ Daily report includes: `Alerts: sent X | blocked Y | quota Z/3`

### 2026-02-18 — Contract Lock v2.1.1 (Шаг 3)
- ✅ Version bumped: v2.1.0 → v2.1.1
- ✅ Frozen alert policy table in contract schema
- ✅ Frozen: quota, cooldown, severity mapping

### 2026-02-18 — BLOCK B: Module Isolation
- ✅ MODULE_BOUNDARY.md created
- ✅ fractal_import_guard.ts script (247 files scanned, PASS)
- ✅ HostDeps contract in place
- ✅ Forbidden imports registry

## API Endpoints

### Alert System
- `GET /api/fractal/v2.1/admin/alerts` — List alerts
- `GET /api/fractal/v2.1/admin/alerts/quota` — Quota status (0/3)
- `GET /api/fractal/v2.1/admin/alerts/stats` — Statistics
- `POST /api/fractal/v2.1/admin/alerts/check` — Dry run
- `POST /api/fractal/v2.1/admin/alerts/run` — Production run
- `POST /api/fractal/v2.1/admin/alerts/test` — Test alert

## Configuration

### Backend .env
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
TG_BOT_TOKEN=          # Required for Telegram alerts
TG_ADMIN_CHAT_ID=      # Required for Telegram alerts
FRACTAL_ALERTS_ENABLED=false  # Set true for production
PUBLIC_ADMIN_URL=https://tradeanalyzer-8.preview.emergentagent.com
```

## Contract v2.1.1 Frozen Parameters
- Alert types: REGIME_SHIFT, CRISIS_ENTER, CRISIS_EXIT, HEALTH_DROP, TAIL_SPIKE
- Alert levels: INFO, HIGH, CRITICAL
- Quota: 3 per 24h (INFO/HIGH), CRITICAL unlimited
- Cooldown: 6h (INFO/HIGH), 1h (CRITICAL)

## Access URLs
- **Main:** https://tradeanalyzer-8.preview.emergentagent.com
- **Admin:** /admin/fractal
- **Alerts:** /admin/fractal?tab=alerts

### 2026-02-18 — BLOCK 70.2: Real Horizon Binding (STEP 1)
- ✅ New endpoint: `/api/fractal/v2.1/focus-pack`
- ✅ Each horizon returns DIFFERENT data:
  - 7d → 7 points, 15 matches
  - 14d → 14 points, 12 matches
  - 30d → 30 points, 10 matches
  - 90d → 90 points, 8 matches
  - 180d → 120 points, 6 matches
  - 365d → 180 points, 5 matches
- ✅ Distribution series length = aftermathDays
- ✅ Validation endpoint: `/api/fractal/v2.1/focus-pack/validate`
- Files: `focus.types.ts`, `focus-pack.builder.ts`, `focus.routes.ts`

## Prioritized Backlog

### P0 (Done)
- [x] Telegram Activation
- [x] Daily Cron Order (ALERTS_RUN)
- [x] Contract Lock v2.1.1
- [x] BLOCK B: Module Isolation
- [x] BLOCK 70.2 STEP 1: FocusPack Backend

### P1 (Next)
- [ ] BLOCK 70.2 STEP 2: Frontend wiring (HorizonSelector → refetch)
- [ ] BLOCK 71: Interactive Fractal Explorer
- [ ] BLOCK 72: Multi-Layer Market Map

### P2 (Future)
- [ ] BLOCK C: MetaBrain Integration Contract
- [ ] BLOCK D: Full Documentation Pack
- [ ] BLOCK F: Production Packaging (Docker)

## Last Updated
2026-02-18 — BLOCK 70.2 STEP 1 Complete (Real Horizon Binding)
