# Data Quality Engine & Scoring Model — TraceImpact Cloud Day 2

## 1. Deterministic Anomaly Detection Rules

The Day 2 Data Quality Engine evaluates 5 key categories of dataset defects:

### 1. Missing Values & Null Spikes
- **High Severity:** $\ge 50\%$ of rows in a column are missing.
- **Medium Severity:** $\ge 15\%$ and $< 50\%$ of rows in a column are missing.

### 2. Duplicate Rows
- **High Severity:** $> 20\%$ of dataset consists of exact duplicate rows.
- **Medium Severity:** $> 5\%$ and $\le 20\%$ duplicate rows.
- **Low Severity:** $> 0\%$ and $\le 5\%$ duplicate rows.

### 3. Type Mismatches
- Flags string values (e.g. `"N/A"`, `"TBD"`) present inside predominantly numeric or date columns.

### 4. Inconsistent Categorical Casing & Whitespace
- Detects casing variants (e.g., `["Active", "active", "ACTIVE"]`) in low-cardinality string columns.
- Detects un-trimmed leading/trailing whitespace padding.

### 5. Identifier Duplicate Anomalies
- Flags duplicate non-null entries in columns matching identifier regex patterns (`id`, `uuid`, `code`, `account_no`, `key`).

---

## 2. Quality Score Formula

The **Data Quality Score** is a deterministic value from `0` to `100`:

$$\text{Quality Score} = \max(0, \min(100, 100 - (\text{P}_{\text{missing}} + \text{P}_{\text{duplicate}} + \text{P}_{\text{type}} + \text{P}_{\text{consistency}})))$$

### Penalty Deductions Breakdown
- **Missing Value Penalty ($\text{P}_{\text{missing}}$):** Up to 30 points, scaled as $(\text{Missing Ratio} \times 60)$.
- **Duplicate Penalty ($\text{P}_{\text{duplicate}}$):** Up to 25 points, scaled as $(\text{Duplicate Ratio} \times 50)$.
- **Type Mismatch Penalty ($\text{P}_{\text{type}}$):** Up to 25 points based on severity of non-conforming types.
- **Consistency Penalty ($\text{P}_{\text{consistency}}$):** Up to 20 points based on casing variants and duplicate IDs.
