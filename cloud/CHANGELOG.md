# Changelog — TraceImpact Cloud

All notable changes to the TraceImpact Cloud SaaS project will be documented in this file.

## [Day 7] - 2026-09-30

### Added
- **Production Integration & E2E Verification:**
  - Added `tests/day7-test-suite.ts` with 65 end-to-end integration tests covering authentication lifecycle, workspace isolation, RBAC role matrix (OWNER, ADMIN, MEMBER, VIEWER), dataset persistence, AI SQL safety, adversarial attack protection, clean exports, team invitations, audit log sanitization, and health check diagnostics.
  - Updated `tests/run-all-tests.ts` to run all 270 platform tests across Days 2 to 7.
- **Application Polish & Live Telemetry:**
  - Polished `/app` overview to dynamically fetch and display real-time telemetry metrics: datasets count, total rows ingested, average data quality score, and active intelligence engine indicator.
- **Production Readiness & Security Hardening:**
  - Verified zero secret leakage in client-side bundles and safe structured error responses across all 29 Next.js routes.
  - Added `docs/DAY_7_COMPLETE.md` canonical master documentation.

---

## [Day 6] - 2026-09-30

### Added
- **Durable Database Persistence (`lib/db/`):**
  - Added `lib/db/persistent-store.ts` implementing a unified multi-tenant persistence layer that survives server restarts and multi-instance test suites.
  - Connected `AuthService`, `WorkspaceService`, `InvitationService`, `AuditService`, and `DatasetRepository` to `persistentStore`.
- **Database Client & Health Check:**
  - Added `lib/db/db-client.ts` managing PostgreSQL / Supabase connection parsing, latency measurements, and health diagnostics.
  - Added `app/api/health/route.ts` implementing `GET /api/health` without exposing infrastructure secrets or credentials.
- **Production Migrations (`db/migrations/`):**
  - Added `db/migrations/003_day6_production_hardening.sql` with DDL for `sessions` table, user security extensions (`password_hash`, `salt`, `display_name`), and multi-tenant performance indexes.
- **Vercel & Environment Hardening:**
  - Added `vercel.json` with framework configuration, clean URLs, and enterprise HTTP security headers.
  - Updated `.env.example` with comprehensive documentation of server-only secrets vs client-safe public variables.
- **Automated Verification:**
  - Added `tests/day6-test-suite.ts` with 28 automated tests.
  - Updated `tests/run-all-tests.ts` running all 205 platform tests across Days 2 to 6.

---

## [Day 5] - 2026-09-30

### Added
- **Authentication & Identity (`lib/auth/`):**
  - Added `lib/auth/auth-service.ts` for salted SHA-256 password hashing, user registration, login verification, session token management (`sess_*`), and demo seed user (`demo@traceimpact.com`).
  - Added `lib/auth/session-helper.ts` resolving sessions from cookies (`traceimpact_session`) or `Authorization: Bearer <token>`.
  - Added `lib/auth/rbac.ts` implementing a fine-grained role-based access control matrix across `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER`.
  - Added authentication routes: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`.
  - Added authentication pages: `app/login/page.tsx` and `app/signup/page.tsx` with `<Suspense>` boundary.
- **Persistent Workspaces & Team Collaboration (`lib/workspaces/`):**
  - Added `lib/workspaces/workspace-service.ts` managing multi-tenant workspace records and member role assignments.
  - Added `lib/workspaces/invitation-service.ts` managing the full invitation lifecycle (`PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`) with email verification.
  - Added workspace routes: `GET/POST /api/workspaces`, `GET/POST /api/workspaces/[id]/members`, `GET/POST /api/workspaces/[id]/invitations`, `POST /api/workspaces/invitations/[id]/accept`, `DELETE /api/workspaces/[id]/invitations/[invId]`.
  - Added Team & Access management page: `app/app/team/page.tsx`.
- **Clean Data Export (`lib/export/`):**
  - Added `lib/export/export-service.ts` exporting normalized tabular dataset data into CSV and JSON formats.
  - Added `GET /api/datasets/[id]/export` endpoint enforcing RBAC (`export_data` permission).
- **Audit Governance (`lib/audit/`):**
  - Added `lib/audit/audit-service.ts` recording security/governance events with automatic credential and sensitive token sanitization.
  - Added `GET /api/workspaces/[id]/audit` endpoint restricted to `OWNER` and `ADMIN` roles.
  - Added Audit Trail view: `app/app/audit/page.tsx`.
- **Day 4 AI Chat Hardening:**
  - Updated `POST /api/datasets/[id]/chat` to enforce workspace membership, verify query permissions, and log `AI_QUERY_EXECUTED` audit events.
- **PostgreSQL Migrations & RLS:**
  - Added `db/migrations/002_day5_governance.sql` with tables for workspaces, members, invitations, audit logs, and PostgreSQL Row Level Security (RLS) policies.
- **Automated Verification:**
  - Added `tests/day5-test-suite.ts` with 60 unit and integration tests.
  - Updated `tests/run-all-tests.ts` running all 177 platform tests (38 Day 2 + 33 Day 3 + 46 Day 4 + 60 Day 5).

---

## [Day 4] - 2026-09-29

### Added
- **Controlled AI Chat & Safe SQL Query Engine (`lib/ai/`):**
  - Added `lib/ai/ai-types.ts` defining data models for query intents, filters, measures, validation results, execution results, and chat payloads.
  - Added `lib/ai/ai-context.ts` building isolated, tenant-scoped dataset schema contexts.
  - Added `lib/ai/query-intent.ts` parsing questions into structured intents (count, sum, average, min, max, group_by, filter, sort, limit).
  - Added `lib/ai/sql-generator.ts` generating parameterized read-only `SELECT` SQL queries (`$1, $2, ...`).
  - Added `lib/ai/sql-validator.ts` enforcing a strict whitelist-only security policy (blocks DROP, DELETE, INSERT, UPDATE, ALTER, TRUNCATE, semicolons, comments, and catalog access).
  - Added `lib/ai/query-executor.ts` providing an in-memory read-only execution sandbox for scalar and grouped aggregations.
  - Added `lib/ai/answer-generator.ts` synthesizing explanations strictly grounded in returned row evidence and triggering dynamic visualizations (KPIs, Bar Charts, Tables).
  - Added `lib/ai/ai-provider.ts` offering multi-provider abstraction (`DeterministicRuleAIProvider`, `LLMAIProvider`, and factory `getAIProvider`).
- **Dataset Chat API Route:**
  - Added `POST /api/datasets/[id]/chat` for tenant-scoped, parameterized natural language dataset queries.
- **Interactive Conversational UI (`app/app/chat/page.tsx`):**
  - Upgraded placeholder to a functional dataset-aware chat interface featuring dataset selection, real-time message stream, dynamic KPI and ECharts rendering, and collapsible "View Executed SQL & Evidence" disclosure.
- **Automated Verification:**
  - Added `tests/day4-test-suite.ts` with 47 automated tests.
  - Updated `tests/run-all-tests.ts` to execute all 118 platform tests (38 Day 2 + 33 Day 3 + 47 Day 4).
- **Day 4 Documentation Suite:**
  - Added 5 specification documents (`docs/13_DAY_4_AI_ARCHITECTURE.md` through `docs/17_DAY_4_DECISIONS.md`) and consolidated `docs/DAY_4_COMPLETE.md`.

---

## [Day 3] - 2026-09-29

### Added
- **Dashboard Intelligence Engine (`lib/dashboard/`):**
  - Added `lib/dashboard/dashboard-types.ts` defining data models for KPIs, chart configs, quality summaries, and full dashboard payloads.
  - Added `lib/dashboard/dashboard-utils.ts` with math utilities for category frequency distribution, histogram range binning, chronological time-series points, bivariate scatter pairs extraction, and dark theme presets.
  - Added `lib/dashboard/kpi-generator.ts` computing deterministic volume, quality health, missingness, and range metrics.
  - Added `lib/dashboard/chart-recommender.ts` implementing deterministic rules for Bar (categorical), Histogram (numerical), Area/Line (temporal), Scatter (bivariate correlation), and Pie (schema composition) visualizations.
  - Added `lib/dashboard/dashboard-generator.ts` master assembler.
- **Dashboard API Route:**
  - Added `GET /api/datasets/[id]/dashboard` for workspace-scoped dataset dashboard configuration retrieval.
- **Dynamic Frontend Dashboard (`app/app/dashboard/page.tsx`):**
  - Upgraded from static preview into full dynamic interactive dashboard with dataset switcher, 4 KPI cards, responsive ECharts grid, DQ health diagnostics, and inferred schema breakdown.
- **Automated Verification:**
  - Added `tests/day3-test-suite.ts` with 33 unit and integration tests.
  - Added `tests/run-all-tests.ts` running all 71 tests (38 Day 2 + 33 Day 3).
- **Day 3 Documentation Suite:**
  - Added 12 Day 3 specification documents (`docs/01_DASHBOARD_GENERATION.md` through `docs/12_DAY_3_DECISIONS.md`) and consolidated `docs/DAY_3_COMPLETE.md`.

---

## [Day 2] - 2026-09-29

### Added
- **Modular Ingestion & Parsers (`lib/parsers/`):**
  - Added CSV parser with RFC 4180 multiline and quotes support via `papaparse`.
  - Added Excel workbook parser for single/multi-sheet `.xlsx` files via `xlsx`.
  - Added JSON parser supporting flat/nested arrays of objects and JSON Lines (`.jsonl`).
  - Added TXT parser with heuristic delimiter detection (Tab, Pipe, Semicolon, Comma).
- **Automatic Schema Inference (`lib/profiling/schema-inference.ts`):**
  - Added 7-type inference: `string`, `integer`, `float`, `boolean`, `date`, `datetime`, `null`.
  - Added dominant type resolution with anomaly tracking in `typeBreakdown`.
- **Statistical Data Profiler (`lib/profiling/profiler.ts`):**
  - Computes row counts, column counts, null ratios, cardinalities, sample values, and min/max statistics.
- **Deterministic Data Quality Engine (`lib/quality/`):**
  - Added anomaly detector for missing spikes, duplicate rows, non-conforming types, casing variants, un-trimmed whitespace, and duplicate primary keys.
  - Added deterministic Quality Score algorithm $[0, 100]$ with transparent penalty deductions.
- **Storage Tier (`lib/storage/`):**
  - Added `LocalStorageProvider` for zero-credential local development and testing.
  - Added `R2StorageProvider` for S3-compatible Cloudflare R2 object storage.
  - Added filename sanitization and tenant-isolated storage key generation.
- **Database & Multi-Tenancy (`lib/db/`, `db/migrations/`):**
  - Added `DatasetRepository` with workspace-scoped queries.
  - Added PostgreSQL DDL schema in `db/migrations/001_day2_schema.sql`.
- **API Routes (`app/api/datasets/`):**
  - `POST /api/datasets/upload`: File upload and end-to-end ingestion pipeline trigger.
  - `GET /api/datasets`: Workspace dataset catalog listing.
  - `GET /api/datasets/[id]`: Dataset details and profiling report.
  - `DELETE /api/datasets/[id]`: Dataset deletion.
- **UI Integrations:**
  - Connected `app/app/upload/page.tsx` with live ingestion progress, real telemetry cards, inferred schema tables, and data quality issue lists.
  - Updated `app/app/datasets/page.tsx` with live dataset catalog grid, loading skeletons, and empty state handling.
- **Automated Verification:**
  - Added `tests/day2-test-suite.ts` with 38 unit and integration tests (`npm test`).
- **Day 2 Documentation:**
  - Added 12 Day 2 specification documents in `docs/` and consolidated `docs/DAY_2_COMPLETE.md`.

---

## [Day 1] - 2026-09-29

### Added
- **Landing Page (`/`):** Full marketing landing page with Hero, 5-stage workflow cards, Feature grid, 4-step How It Works, Security/Trust overview, and Footer.
- **Application Shell (`/app/*`):** Persistent desktop sidebar, mobile collapsible navigation drawer, and top header with breadcrumb navigation.
- **Workspace Overview (`/app`):** Overview dashboard with welcome banner, 4 telemetry placeholder metric cards, and quick start cards.
- **Dataset List (`/app/datasets`):** Dataset catalog with accessible empty state and upload trigger.
- **Dataset Upload Interface (`/app/upload`):** Interactive file selector and drag-and-drop dropzone supporting `.csv`, `.xlsx`, `.json`, and `.txt` with client-side metadata calculation.
- **Dashboard Placeholder (`/app/dashboard`):** Analytics capability map and client-side Apache ECharts integration labeled as an "Illustrative preview".
- **AI Data Chat Placeholder (`/app/chat`):** Conversational chat interface with sample data questions and controlled SQL architecture disclaimer.
- **UI Component Library:**
  - `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Badge.tsx`, `components/ui/EmptyState.tsx`, `components/charts/EChartsChart.tsx`.
- **Documentation Suite:** 12 architecture/specification documents in `docs/` and `docs/DAY_1_COMPLETE.md`.
