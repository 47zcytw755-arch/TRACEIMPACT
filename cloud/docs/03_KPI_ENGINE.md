# Day 3 — KPI Generation Engine

## 1. Overview
The KPI generation engine (`lib/dashboard/kpi-generator.ts`) deterministically computes high-level executive cards displayed at the top of each dataset dashboard.

## 2. Standard KPI Rules

1. **Total Records (`kpi_total_rows`)**:
   - Title: `Total Records`
   - Value: `dataset.rowCount.toLocaleString()`
   - Subtitle: `${dataset.columnCount} attributes indexed`
   - Calculation Type: `count`

2. **Data Quality Score (`kpi_quality_score`)**:
   - Title: `Data Quality Score`
   - Value: `${qualityScore}%`
   - Trend Indicator: Optimal ($\ge 80$), Neutral ($50-79$), Negative ($< 50$)
   - Calculation Type: `score`

3. **Missing Data Rate (`kpi_missing_rate`)**:
   - Title: `Missing Data Rate`
   - Value: `${missingCellPercentage}%`
   - Subtitle: Count of total null/missing cells or "Zero null values"
   - Calculation Type: `percentage`

4. **Domain-Specific Fourth Metric**:
   - Priority 1 (Numeric Range): If numeric columns exist with min/max, displays `${minValue} - ${maxValue}` for the primary numeric column.
   - Priority 2 (Timeline Span): If date columns exist, displays `${minDate} to ${maxDate}`.
   - Priority 3 (Duplicate Rate): Otherwise, displays duplicate row percentage.
