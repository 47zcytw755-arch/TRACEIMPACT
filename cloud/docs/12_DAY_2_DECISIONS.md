# Architectural & Engineering Decisions — Day 2

## 1. Key Engineering Decisions

### Decision 1: Pure TypeScript Deterministic Profiling without LLMs
- **Context:** Profiling tabular data and auditing data quality could theoretically be delegated to an LLM or Python microservice.
- **Choice:** Built a 100% deterministic, high-performance TypeScript profiling engine in `lib/profiling/`.
- **Rationale:** Guarantees sub-50ms execution speed, zero token costs, complete reproducibility, and zero hallucination risk for statistical metrics.

### Decision 2: Dual Storage Provider Pattern (`LocalStorageProvider` + `R2StorageProvider`)
- **Context:** Cloudflare R2 requires cloud credentials that may not be present in local developer setups or CI.
- **Choice:** Created a shared `IStorageProvider` interface with automatic fallback to `LocalStorageProvider` when R2 credentials are not detected.
- **Rationale:** Allows complete local offline development and automated testing without sacrificing production cloud readiness.

### Decision 3: Standardized Ingestion Pipeline with Preview Rows
- **Context:** Day 3 dashboard generation requires column schemas, statistical bounds, quality issues, and sample rows.
- **Choice:** `ingestDatasetFile` packages column profiles, quality score breakdown, and the top 20 rows into the dataset record.
- **Rationale:** Pre-structures the exact payload needed for instant Day 3 dynamic dashboard chart generation.
