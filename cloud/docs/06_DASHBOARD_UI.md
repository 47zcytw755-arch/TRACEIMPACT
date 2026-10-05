# Day 3 — Dashboard UI Implementation

## 1. Page Component Structure (`app/app/dashboard/page.tsx`)

The dashboard UI is structured into five distinct visual zones:

1. **Header Zone**:
   - Automated Intelligence badge and version tag.
   - Dataset switcher dropdown allowing seamless switching between uploaded datasets.
   - "+ Ingest New" shortcut button.

2. **Executive KPI Cards Grid**:
   - 4-column responsive grid showing Volume, Quality Health, Missing Rate, and Range metrics with optimal/attention indicators.

3. **Recommended Visualizations Grid**:
   - 2-column responsive layout rendering dynamic ECharts instances.
   - Individual card headers displaying title, type badge, description, and explainable selection reasons.

4. **Data Quality & Governance Diagnostics**:
   - Audit dimension penalty breakdown card.
   - Anomaly rule violation event log with severity badges (`critical`, `high`, `warning`, `neutral`).

5. **Inferred Schema Profile Table**:
   - Detailed column-by-column breakdown listing inferred data types, uniqueness counts, null percentages, and sample value distributions.
