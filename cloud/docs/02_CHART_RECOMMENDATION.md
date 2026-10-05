# Day 3 — Chart Recommendation Rules

## 1. Recommendation Rules Matrix

| Dimension / Type | Column Characteristics | Recommended Chart | Transformation / Guardrail |
|---|---|---|---|
| **Categorical** | String column, $2 \le \text{uniqueCount} \le 30$, not ID/UUID | **Bar Chart** | Frequency counts, top 10 categories capped |
| **Numerical** | Integer/Float column, $\ge 2$ distinct values | **Histogram** | Equal-width continuous range binning (4-8 bins) |
| **Temporal** | Inferred `date` or `datetime` column + optional numeric measure | **Area / Line Chart** | Chronological sorting, period aggregation, smooth spline |
| **Correlation** | $\ge 2$ continuous numerical columns, $\ge 3$ records | **Scatter Plot** | Bivariate $[x, y]$ coordinate mapping, 50 sample points max |
| **Fallback** | Fewer than 2 charts recommended from dataset shape | **Doughnut Pie Chart** | Inferred column schema composition breakdown |

## 2. High-Cardinality & Identifier Guardrails
- Columns matching regex `/(^id$|_id$|uuid|hash|url|key)/i` or with uniqueness $\ge 90\%$ when rows $> 20$ are disqualified from categorical bar visualizations to avoid rendering unreadable dense bars.
- Categorical columns with $> 10$ unique values are capped at the top 10 most frequent categories, with an explicit `categoryLimitApplied: true` badge rendered in the UI.
