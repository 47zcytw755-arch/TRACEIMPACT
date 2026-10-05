# Automatic Schema Inference Engine — TraceImpact Cloud Day 2

## 1. Supported Inferred Types
The schema inference engine classifies individual values and dominant column structures into 7 discrete types:

| Type | Definition | Detection Patterns & Heuristics |
|---|---|---|
| `null` | Missing / Empty | `null`, `undefined`, `""`, `"N/A"`, `"NaN"`, `"null"`, `"none"`, `"-"` |
| `boolean` | Logical True/False | Native `boolean`, `"true"`, `"false"`, `"yes"`, `"no"` |
| `integer` | Whole Numbers | `^-?\d+$` (within `Number.MAX_SAFE_INTEGER`) |
| `float` | Floating Point / Currency | `^-?\d+\.\d+([eE][+-]?\d+)?$`, `$1,250.50`, `99.9%` |
| `date` | Calendar Date | `YYYY-MM-DD`, `YYYY/MM/DD`, `MM/DD/YYYY`, `DD/MM/YYYY` |
| `datetime` | Timestamp with Time | ISO 8601 strings (`2026-09-29T22:15:00Z`), ISO timestamps |
| `string` | Freeform Text / Mixed | Fallback for arbitrary character sequences |

---

## 2. Dominant Type Resolution Algorithm
1. Every cell in a column is evaluated individually.
2. A `typeBreakdown` histogram is computed across all non-null values.
3. If non-null cells are $\ge 70\%$ numeric, the dominant type is assigned as `integer` (if no floats present) or `float`.
4. If non-null cells are $\ge 70\%$ boolean or date/datetime, the corresponding dominant type is assigned.
5. Mixed or ambiguous columns are classified as `string`, and non-matching entries are preserved in `typeBreakdown` for data quality flagging.
