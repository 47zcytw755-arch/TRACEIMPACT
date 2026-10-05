# Data Normalization & Cleaning Foundation — TraceImpact Cloud Day 2

## 1. Normalization Strategy
Before profiling and subsequent Day 3 dashboard generation, tabular data passes through a lightweight normalization layer:
1. **Header Sanitization:** Trims whitespace, replaces null or empty header names with `Column_{index}`, and strips non-printable control characters.
2. **Missing Literal Unification:** Treats empty strings, whitespace, `"N/A"`, `"null"`, `"none"`, and `"-"` as canonical `null`.
3. **Numeric Stripping:** Cleans common currency symbols (`$`, `€`, `£`, `¥`) and thousands commas (`,`) during numeric inference while preserving original strings in raw records.
4. **Row Truncation & Preview Slicing:** Extracts the top 20 rows into `previewRows` for instant client inspection.
