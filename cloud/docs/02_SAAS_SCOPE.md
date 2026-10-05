# SaaS Scope & Release Phasing — TraceImpact Cloud

## 1. High-Level Product Scope
TraceImpact Cloud delivers automated data intelligence for teams and individuals. The platform eliminates the barrier between raw files and actionable insights.

---

## 2. Release Milestones & Phasing

### Day 1: Foundation & Application Shell (`CURRENT`)
- **Focus:** Project architecture, design system, public landing page, responsive application shell, route establishment, UI state management, and documentation.
- **Implemented:**
  - Route tree: `/`, `/app`, `/app/datasets`, `/app/upload`, `/app/dashboard`, `/app/chat`.
  - Reusable component primitives (`Button`, `Card`, `Badge`, `EmptyState`).
  - Browser-safe ECharts integration.
  - Interactive file selection UI (CSV, XLSX, JSON, TXT).
  - 12 comprehensive architecture and specification documents.
- **Explicitly Deferred:** Database connections, cloud file storage, live data processing, authentication engine, LLM inference.

### Day 2: Ingestion, Storage & Schema Profiling (`PLANNED`)
- **Focus:** Storage integration, file chunking, parser workers, type discovery, and data quality scoring.
- **Deliverables:**
  - Cloudflare R2 presigned upload URLs.
  - Workers for parsing CSV/XLSX/JSON/TXT streams.
  - Schema discovery (types, nulls, unique values, min/max).
  - Data quality algorithm and report generator.

### Day 3: Automated Dashboards & Visualizations (`PLANNED`)
- **Focus:** Intelligent chart recommendations, KPI cards, and dashboard customization.
- **Deliverables:**
  - Dynamic ECharts dashboard generation based on inferred column types.
  - Distribution graphs, trend timelines, categorical breakdowns, correlation matrices.
  - Anomaly cards and data cleansing export (CSV/Parquet).

### Day 4: Controlled AI Data Chat & SQL Engine (`PLANNED`)
- **Focus:** Natural-language to SQL translation, validation sandbox, and execution safety.
- **Deliverables:**
  - Intent classification and schema-aware prompt engineering.
  - AST-level SQL validation rejecting prohibited commands (DROP, DELETE, UPDATE, etc.).
  - Read-only execution against isolated workspace schemas.
  - Plain-English result synthesis with chart visualization suggestions.

### Day 5+: Enterprise Auth, Collaboration & Billing (`PLANNED`)
- **Focus:** Multi-user workspaces, team invites, RBAC, usage metering, and Stripe billing.

---

## 3. Scope Boundaries & Anti-Goals
- **No Direct SQL Console in Frontend:** Users will never execute arbitrary SQL strings from the browser.
- **No Unrestricted LLM Tooling:** The AI engine will strictly run through an AST validation proxy.
- **No Hardcoded Production Metrics:** All metrics presented during Day 1 are clearly marked as placeholders or illustrative previews.
