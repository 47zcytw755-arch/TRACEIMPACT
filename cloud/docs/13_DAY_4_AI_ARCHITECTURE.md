# Day 4 — Controlled AI Architecture & Natural Language to SQL Pipeline

## 1. Architectural Philosophy: Controlled Query Execution
TraceImpact Cloud enforces strict separation between user natural language queries and database execution. Under no circumstances is an LLM granted direct or unrestricted access to PostgreSQL or raw database connection strings.

```
User Question ("What is the average revenue by category?")
  │
  ▼
Dataset Context Scoper (`lib/ai/ai-context.ts`)
  ├── Scoped strictly to (workspace_id, dataset_id)
  └── Ingests column profiles, inferred data types, sample values
  │
  ▼
Structured Query Intent Engine (`lib/ai/query-intent.ts`)
  ├── Extracts operations: count, sum, average, min, max, group_by, filter, sort
  └── Validates dimensions and measures against known dataset schema
  │
  ▼
Parameterized SQL Query Builder (`lib/ai/sql-generator.ts`)
  ├── Builds deterministic SELECT statements targeting "dataset"
  └── Isolates filter values into positional parameters ($1, $2, ...)
  │
  ▼
SQL Security Validator (`lib/ai/sql-validator.ts`)
  ├── Enforces read-only SELECT whitelist
  └── Blocks DDL, DML, multi-statement injection, comments, and catalog snooping
  │
  ▼
Read-Only Execution Sandbox (`lib/ai/query-executor.ts`)
  ├── Executes query against normalized dataset records
  └── Captures row results, execution time, and column signatures
  │
  ▼
Evidence-Grounded Answer Generator (`lib/ai/answer-generator.ts`)
  ├── Synthesizes explanation strictly from returned result rows (zero hallucinations)
  └── Suggests deterministic visualization (KPI Card, Bar Chart, or Data Table)
  │
  ▼
Chat UI (`app/app/chat/page.tsx`) & API (`POST /api/datasets/[id]/chat`)
```

## 2. Multi-Provider AI Abstraction (`lib/ai/ai-provider.ts`)
- **`DeterministicRuleAIProvider`**: Built-in default provider operating without external API keys. Translates questions using deterministic semantic pattern matching with 0ms external latency and 100% predictable accuracy.
- **`LLMAIProvider`**: Pluggable provider for Google Gemini or OpenAI when `AI_API_KEY` is configured in `.env.local`.
- **`getAIProvider()`**: Factory resolver defaulting safely to the deterministic provider if environment keys are missing or invalid.
