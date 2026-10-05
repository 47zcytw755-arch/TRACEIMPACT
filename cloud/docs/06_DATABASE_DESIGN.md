# Logical Database Design — TraceImpact Cloud

> **Note on Day 1 Status:** This document establishes the formal logical data model for future PostgreSQL implementation (Day 2+). No live database connections or fabricated database records are instantiated during Day 1.

---

## 1. Entity-Relationship Overview

```
+---------------+        1:N         +-------------------+
|     users     | -----------------> | workspace_members |
+---------------+                    +-------------------+
        |                                      |
        | 1:N                                  | N:1
        v                                      v
+--------------------------------------------------------+
|                      workspaces                        |
+--------------------------------------------------------+
        |
        | 1:N
        v
+--------------------------------------------------------+
|                       datasets                         |
+--------------------------------------------------------+
   |          |                     |                  |
   | 1:1      | 1:N                 | 1:N              | 1:N
   v          v                     v                  v
+----------+ +-----------------+  +-----------------+ +-------------------+
|  files   | | dataset_columns |  |  dataset_runs   | | dashboard_configs |
+----------+ +-----------------+  +-----------------+ +-------------------+
                                           |
                                           | 1:N
                                           v
                                  +---------------------+
                                  | data_quality_issues |
                                  +---------------------+

+--------------------------------------------------------+
|                     chat_sessions                      |
|         (belongs to workspace and dataset)             |
+--------------------------------------------------------+
        |
        | 1:N
        v
+--------------------------------------------------------+
|                     chat_messages                      |
+--------------------------------------------------------+
        |
        | 1:1 (optional)
        v
+--------------------------------------------------------+
|                      ai_queries                        |
+--------------------------------------------------------+
```

---

## 2. Detailed Schema Definitions

### 1. `users`
*Represents authenticated accounts within the platform.*
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255), Unique, Not Null)
- `name` (VARCHAR(255))
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 2. `workspaces`
*The primary tenant isolation boundary. All datasets, queries, and configs belong to a single workspace.*
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255), Not Null)
- `slug` (VARCHAR(100), Unique, Not Null)
- `owner_id` (UUID, References `users(id)`)
- `tier` (VARCHAR(50), Default 'free') — 'free' | 'pro' | 'enterprise'
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 3. `workspace_members`
*Manages role-based access control (RBAC) per workspace.*
- `id` (UUID, Primary Key)
- `workspace_id` (UUID, References `workspaces(id)`, Cascade Delete)
- `user_id` (UUID, References `users(id)`, Cascade Delete)
- `role` (VARCHAR(50), Not Null) — 'owner' | 'admin' | 'member' | 'viewer'
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 4. `datasets`
*Represents an ingested dataset catalog item within a workspace.*
- `id` (UUID, Primary Key)
- `workspace_id` (UUID, References `workspaces(id)`, Cascade Delete)
- `name` (VARCHAR(255), Not Null)
- `description` (TEXT)
- `row_count` (BIGINT, Default 0)
- `column_count` (INT, Default 0)
- `quality_score` (NUMERIC(5,2)) — Range 0.00 to 100.00
- `status` (VARCHAR(50), Default 'pending') — 'pending' | 'processing' | 'ready' | 'failed'
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 5. `dataset_files`
*Stores metadata and object-storage pointers for the uploaded raw source file.*
- `id` (UUID, Primary Key)
- `dataset_id` (UUID, References `datasets(id)`, Cascade Delete)
- `storage_provider` (VARCHAR(50), Default 'cloudflare_r2')
- `storage_key` (VARCHAR(512), Not Null) — Object storage URI/key
- `original_filename` (VARCHAR(255), Not Null)
- `file_extension` (VARCHAR(10), Not Null) — 'csv' | 'xlsx' | 'json' | 'txt'
- `file_size_bytes` (BIGINT, Not Null)
- `checksum_sha256` (VARCHAR(64))
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 6. `dataset_columns`
*Maintains inferred schema, data types, and column-level statistics.*
- `id` (UUID, Primary Key)
- `dataset_id` (UUID, References `datasets(id)`, Cascade Delete)
- `column_name` (VARCHAR(255), Not Null)
- `inferred_type` (VARCHAR(50), Not Null) — 'integer' | 'numeric' | 'text' | 'date' | 'boolean' | 'json'
- `is_nullable` (BOOLEAN, Default true)
- `null_count` (BIGINT, Default 0)
- `unique_count` (BIGINT, Default 0)
- `sample_values` (JSONB)
- `min_value` (TEXT)
- `max_value` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 7. `dataset_runs`
*Tracks execution history of profiling jobs, transformations, and cleaning passes.*
- `id` (UUID, Primary Key)
- `dataset_id` (UUID, References `datasets(id)`, Cascade Delete)
- `run_type` (VARCHAR(50), Not Null) — 'profiling' | 'cleansing' | 'reindex'
- `status` (VARCHAR(50), Not Null) — 'queued' | 'running' | 'completed' | 'failed'
- `duration_ms` (INT)
- `error_message` (TEXT)
- `started_at` (TIMESTAMP WITH TIME ZONE)
- `completed_at` (TIMESTAMP WITH TIME ZONE)

### 8. `data_quality_issues`
*Structured anomalies detected during automated profiling.*
- `id` (UUID, Primary Key)
- `run_id` (UUID, References `dataset_runs(id)`, Cascade Delete)
- `column_id` (UUID, References `dataset_columns(id)`, Set Null)
- `severity` (VARCHAR(20), Not Null) — 'low' | 'medium' | 'high' | 'critical'
- `issue_type` (VARCHAR(100), Not Null) — 'null_spike' | 'type_mismatch' | 'outlier' | 'duplicate_row'
- `description` (TEXT, Not Null)
- `affected_rows_count` (BIGINT, Default 0)
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 9. `dashboard_configs`
*Stores personalized widget configurations, layout positions, and chart specs per dataset.*
- `id` (UUID, Primary Key)
- `dataset_id` (UUID, References `datasets(id)`, Cascade Delete)
- `title` (VARCHAR(255), Not Null)
- `layout_schema` (JSONB, Not Null) — Grid layout dimensions
- `widget_configs` (JSONB, Not Null) — Chart types (bar/line/scatter), dimensions, aggregates
- `updated_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 10. `chat_sessions`
*Maintains user conversation context per workspace and target dataset.*
- `id` (UUID, Primary Key)
- `workspace_id` (UUID, References `workspaces(id)`, Cascade Delete)
- `dataset_id` (UUID, References `datasets(id)`, Cascade Delete)
- `user_id` (UUID, References `users(id)`, Set Null)
- `title` (VARCHAR(255), Default 'New Data Conversation')
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 11. `chat_messages`
*Individual prompts, assistant replies, and explanations.*
- `id` (UUID, Primary Key)
- `session_id` (UUID, References `chat_sessions(id)`, Cascade Delete)
- `sender` (VARCHAR(20), Not Null) — 'user' | 'assistant' | 'system'
- `content` (TEXT, Not Null)
- `created_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

### 12. `ai_queries`
*Audit log for generated SQL statements, AST validation status, and execution metrics.*
- `id` (UUID, Primary Key)
- `message_id` (UUID, References `chat_messages(id)`, Cascade Delete)
- `generated_sql` (TEXT, Not Null)
- `validation_passed` (BOOLEAN, Not Null)
- `execution_duration_ms` (INT)
- `rows_returned` (INT)
- `error_reason` (TEXT)
- `executed_at` (TIMESTAMP WITH TIME ZONE, Default NOW())

---

## 3. Security & Isolation Constraints
1. **Tenant Isolation:** Every dataset, session, and query MUST have a non-nullable foreign key referencing `workspace_id`.
2. **Row-Level Security (RLS):** Policies will ensure queries cannot traverse workspace boundaries.
3. **Auditability:** All AI-generated queries are stored permanently in `ai_queries` for traceability and security review.
