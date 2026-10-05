# Automated Data Profiling — TraceImpact Cloud Day 2

## 1. Overview
The Data Profiling engine computes comprehensive summary statistics across entire datasets and individual columns without relying on external or non-deterministic LLMs.

---

## 2. Dataset-Level Metrics
- `rowCount`: Total count of parsed tabular rows.
- `columnCount`: Total number of detected columns.
- `totalMissingCells`: Sum of null/empty cells across all columns.
- `missingCellPercentage`: Ratio of missing cells to total matrix volume.
- `duplicateRowCount`: Number of identical row instances.
- `duplicateRowPercentage`: Ratio of duplicate rows to total row count.

---

## 3. Column-Level Metrics (`ColumnProfile`)
For each column, the profiler calculates:
- `name`: Sanitized column header.
- `inferredType`: Dominant schema type.
- `isNullable`: Boolean indicating presence of missing values.
- `nullCount` and `nullPercentage`: Precise frequency of missing values.
- `uniqueCount` and `uniquenessPercentage`: Cardinality and uniqueness ratio.
- `sampleValues`: First 5 distinct representative values.
- `minValue` and `maxValue`: Extracted minimum and maximum bounds for numeric and chronological columns.
- `typeBreakdown`: Distribution histogram of all detected data types within the column.
