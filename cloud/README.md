# TraceImpact Cloud — Traceable Data Intelligence & Impact Reporting Platform

> **Turn messy data into clear, trustworthy answers.**

TraceImpact Cloud is a production-hardened SaaS web platform for multi-tenant tabular data intelligence. Users upload raw datasets (CSV, Excel `.xlsx`, JSON, delimited text), automatically profile statistical distributions, audit data quality health scores, generate automated dynamic dashboards with Apache ECharts, and ask natural language questions answered through strictly validated, read-only SQL with evidence grounding.

---

## 🌟 Key Capabilities

1. **Multiformat Ingestion & Parsing:** High-performance stream parsing for CSV (RFC 4180), XLSX, JSON, and TXT files with 7-type automatic schema inference (`string`, `integer`, `float`, `boolean`, `date`, `datetime`, `null`).
2. **Deterministic Data Quality Scoring:** Quantitative health scores $[0, 100]$ based on missing value rates, type contradictions, casing anomalies, duplicate primary keys, and trailing whitespace.
3. **Automated Dynamic Dashboards:** Instant generation of executive KPI cards and theme-matched Apache ECharts (Bar, Histogram, Area/Line, Scatter, Pie).
4. **Controlled AI Chat & Safe SQL Intelligence:** Natural language to structured query intent, validated against a strict read-only SQL AST whitelist, parameterized (`$1, $2`), executed in an isolated sandbox, and explained strictly using returned row evidence.
5. **Multi-Tenant Workspaces & RBAC:** Complete isolation across workspaces with 4 distinct roles: `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER`.
6. **Clean Data Export:** Standardized CSV and JSON exports for authorized roles (with `VIEWER` strictly denied).
7. **Immutable Audit Governance:** Automated security audit logging with automatic scrubbing of sensitive tokens, passwords, and API credentials.

---

## 🏗️ Architecture & Security Model

```
                    ┌────────────────────────────────────────────────┐
                    │               User / Web Browser               │
                    └───────────────────────┬────────────────────────┘
                                            │ HTTP / Secure Cookie
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │       Next.js 16 (App Router / Vercel)         │
                    │  - Auth Middleware & Session Helper            │
                    │  - RBAC Permission Assertions                  │
                    └───────┬───────────────────────────────┬────────┘
                            │                               │
            ┌───────────────┴───────────────┐               │
            ▼                               ▼               ▼
┌───────────────────────┐       ┌───────────────────────┐ ┌──────────────────────┐
│  Ingestion & Quality  │       │  Controlled AI Layer  │ │  Dual-Mode Storage   │
├───────────────────────┤       ├───────────────────────┤ ├──────────────────────┤
│ - PapaParse / XLSX    │       │ - Intent Parser       │ │ Local / Dev: JSON    │
│ - Schema Inference    │       │ - AST SQL Generator   │ │ (.data/store.json)   │
│ - Anomaly Detector    │       │ - Whitelist Validator │ │                      │
│ - DQ Score Algorithm  │       │ - Read-Only Sandbox   │ │ Cloud: PostgreSQL    │
│ - Dynamic Dashboards  │       │ - Evidence Grounding  │ │ (Supabase + RLS)     │
└───────────────────────┘       └───────────────────────┘ └──────────────────────┘
```

### Controlled AI / SQL Threat Model
- **No Unrestricted Database Access:** The LLM never receives direct connection strings or raw query execution privileges against PostgreSQL.
- **Whitelist SQL Grammar:** Only read-only `SELECT` queries with explicit `LIMIT` and valid table references are permitted.
- **Adversarial Defenses:** Systematically blocks all DDL and data modification statements (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`), multi-statement semicolons, SQL comments (`--`, `/* */`), and system catalog access (`information_schema`, `pg_catalog`).
- **Grounded Evidence:** AI explanations must directly cite numbers and categories present in the returned query rows.

---

## 🔐 Role-Based Access Control (RBAC)

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
|---|:---:|:---:|:---:|:---:|
| **Manage Workspace Settings** | ✅ | ❌ | ❌ | ❌ |
| **Manage Members & Invitations** | ✅ | ✅ | ❌ | ❌ |
| **Upload & Mutate Datasets** | ✅ | ✅ | ✅ | ❌ |
| **View Datasets & Dashboards** | ✅ | ✅ | ✅ | ✅ |
| **Execute AI Chat Queries** | ✅ | ✅ | ✅ | ✅ |
| **Export Cleaned Data (CSV/JSON)** | ✅ | ✅ | ✅ | ❌ |
| **Inspect Audit Governance Logs** | ✅ | ✅ | ❌ | ❌ |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16.3.7 (App Router & Turbopack)
- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **Charts:** Apache ECharts 6
- **Parsers:** PapaParse (CSV), XLSX (Excel), native JSON
- **Database & Storage:** PostgreSQL / Supabase with Row Level Security (RLS) & local persistent fallback
- **Authentication:** Salted SHA-256 password hashing with secure cookie session tokens

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20+
- npm / yarn / pnpm

### 2. Installation
```bash
git clone https://github.com/shashwat/traceimpact-cloud.git
cd traceimpact-cloud
npm install
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env.local
```
*(All variables are pre-configured with safe local defaults.)*

### 4. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the landing page and application.

---

## 📦 Direct Object-Storage & Multi-File Ingestion (200MB+ Supported)

TraceImpact Cloud features a high-throughput, multi-file batch upload pipeline engineered to bypass Vercel serverless request limits via direct-to-storage architecture:

- **Supported Formats:** `.csv`, `.xlsx`, `.xls`, `.json`, `.txt`, `.tsv`.
- **Multi-File Batch Selection:** Select multiple mixed-format files simultaneously via `<input type="file" multiple />` or drag-and-drop.
- **Minimum 200 MB Supported Per File:** Production-safe upload architecture configured with a **250 MB** maximum file ceiling (`MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024`).
- **Direct-to-Storage Upload Pipeline:**
  1. Browser requests signed upload authorization via `/api/datasets/upload/sign`.
  2. Browser uploads file binary **directly** to durable object storage (Supabase Storage / Cloudflare R2 / S3 bucket) using presigned `PUT` URLs with live XHR byte progress ($0\% \to 100\%$). Large payloads never traverse Vercel serverless function request bodies!
  3. Browser notifies `/api/datasets/upload/complete` to trigger server-side parsing, 7-type schema inference, deterministic DQ scoring, and database record persistence.
- **Isolated Per-File Lifecycle:** Each queued file manages independent state (`pending` → `authorizing` → `uploading` → `processing` → `success` / `failed`), per-file retry triggers, and clean queue management. A failure in one file never cancels other valid files.

---

## 🧪 Comprehensive Verification Suite

Run all automated test suites across Days 2–8 + Direct Object-Storage Architecture (365 total tests):
```bash
npm test
```

Run static analysis and production build:
```bash
npm run lint
npm run build
```

---

## 📚 Master Documentation

- [Day 1 Complete Documentation](docs/DAY_1_COMPLETE.md)
- [Day 2 Complete Documentation](docs/DAY_2_COMPLETE.md)
- [Day 3 Complete Documentation](docs/DAY_3_COMPLETE.md)
- [Day 4 Complete Documentation](docs/DAY_4_COMPLETE.md)
- [Day 5 Complete Documentation](docs/DAY_5_COMPLETE.md)
- [Day 6 Complete Documentation](docs/DAY_6_COMPLETE.md)
- [Day 7 Complete Documentation](docs/DAY_7_COMPLETE.md)
- [Day 8 Complete Documentation](docs/DAY_8_COMPLETE.md)
- [Portfolio Summary](docs/PORTFOLIO_SUMMARY.md)
- [Documentation Index](docs/DOCUMENTATION_INDEX.md)
- [Project Status](PROJECT_STATUS.md)
- [Changelog](CHANGELOG.md)
