# Day 3 — Automated Dynamic Dashboard Generation Architecture

## 1. Overview
The Dashboard Generation subsystem (`lib/dashboard/dashboard-generator.ts`) transforms raw dataset schema inference, column statistics, and data-quality outputs produced by Day 2 into a structured, fully populated `DashboardConfig` object without requiring manual dashboard configuration or relying on an LLM.

## 2. Ingestion to Visualization Pipeline
```
Dataset Record (Day 2)
  │
  ├── File metadata (rows, columns, format, size)
  ├── Profiling Summary (null percentages, unique counts, min/max values)
  └── Data Quality Issues (missing penalty, casing inconsistency, duplicates)
        │
        ▼
  Dashboard Intelligence Engine
        ├── KPI Generator (lib/dashboard/kpi-generator.ts)
        ├── Chart Recommender (lib/dashboard/chart-recommender.ts)
        └── Quality Summary Packager (lib/dashboard/dashboard-generator.ts)
        │
        ▼
  DashboardConfig (JSON Data Contract)
        │
        ▼
  ECharts Canvas Rendering & Dashboard UI (app/app/dashboard/page.tsx)
```

## 3. Key Principles
1. **Deterministic & Explainable**: Every chart and KPI selected carries a human-readable `reason` and `description` explaining why it was chosen.
2. **Zero LLM Dependency**: Chart recommendation relies solely on rigorous mathematical and column type heuristics (cardinality, range, chronological ordering).
3. **Bounded Complexity**: Capped at 4 top KPI cards and 4 analytical charts per dataset to ensure optimal visual readability and rendering performance.
4. **Resilient Fallbacks**: If datasets lack temporal or continuous numerical metrics, safe fallbacks such as categorical distributions and inferred schema doughnut charts are generated automatically.
