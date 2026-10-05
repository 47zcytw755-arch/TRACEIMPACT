# Data Ingestion Architecture — TraceImpact Cloud Day 2

## 1. Overview
The Data Ingestion Engine is the entry point for all datasets in TraceImpact Cloud. It accepts raw files in supported formats (CSV, XLSX, JSON, TXT), validates metadata, isolates storage by workspace and dataset, and orchestrates downstream parsing, schema inference, and data profiling.

---

## 2. Ingestion Pipeline Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as POST /api/datasets/upload
    participant Storage as Storage Provider (R2 / Local)
    participant Parser as Modular Parser (CSV/XLSX/JSON/TXT)
    participant Profiler as Schema & Quality Profiler
    participant DB as Dataset Repository (PostgreSQL Ready)

    User->>API: Multipart upload (file, workspaceId, name)
    API->>API: 1. Validate file extension, size (<=50MB), MIME
    API->>Storage: 2. Upload file buffer (isolated storage key)
    Storage-->>API: 3. Return storageKey & SHA-256 checksum
    API->>DB: 4. Create dataset record (status: 'processing')
    API->>Parser: 5. Parse buffer into normalized tabular rows
    Parser-->>API: 6. Return headers & row objects
    API->>Profiler: 7. Run schema inference & DQ detection
    Profiler-->>API: 8. Return ColumnProfile[] & QualityScore
    API->>DB: 9. Update dataset record (status: 'ready')
    API-->>User: 10. Return JSON payload (dataset, metrics, score)
```

---

## 3. Ingestion Validation Rules
1. **Extension Check:** Strict whitelist matching (`csv`, `xlsx`, `json`, `txt`).
2. **File Size Enforcement:** Free tier maximum capped at 50 MB (52,428,800 bytes).
3. **MIME Verification:** Sanity checking MIME against known file signatures.
4. **Filename Sanitization:** Path traversal tokens (`..`, `/`, `\`) and null bytes (`\0`) are stripped before storage key generation.
5. **Multi-Tenant Scoping:** Ingested datasets require a valid `workspaceId` (defaults to `default-workspace` during development).
