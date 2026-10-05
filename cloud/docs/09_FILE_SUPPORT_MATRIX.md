# File Support Matrix — TraceImpact Cloud V1

## 1. Supported Input File Formats

| Format | Extension | MIME Types | Max Size (Free/Pro) | Delimiters / Flavors Supported |
|---|---|---|---|---|
| **Comma-Separated Values** | `.csv` | `text/csv`, `application/csv`, `text/plain` | 50 MB / 500 MB | Standard comma, UTF-8/Latin-1 encodings |
| **Excel Workbooks** | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | 50 MB / 250 MB | OpenXML format (.xlsx), single and multi-sheet |
| **JSON Records** | `.json` | `application/json`, `text/json` | 50 MB / 250 MB | Array of JSON objects, JSON Lines (.jsonl) |
| **Delimited Text** | `.txt` | `text/plain` | 50 MB / 250 MB | Tab-separated (TSV), Pipe (`\|`), Semicolon (`;`) |

---

## 2. Ingestion & Validation Rules

1. **Client-Side Validation (Day 1 `IMPLEMENTED`):**
   - File extension detection (`.csv`, `.xlsx`, `.json`, `.txt`).
   - File size calculation and formatting.
   - Non-blocking error notices for unauthorized file types.

2. **Server-Side Validation (Day 2 `PLANNED`):**
   - File magic number / signature verification.
   - Header inspection and row delimiter detection.
   - Automatic character encoding resolution (UTF-8, ASCII, Windows-1252).
   - Empty file and single-cell guardrails.

---

## 3. Future Roadmap Formats (Post-V1)
- Parquet (`.parquet`)
- SQLite dumps (`.sqlite`, `.db`)
- Compressed archives (`.zip`, `.tar.gz`)
- Direct Database Connectors (PostgreSQL, MySQL, Snowflake)
