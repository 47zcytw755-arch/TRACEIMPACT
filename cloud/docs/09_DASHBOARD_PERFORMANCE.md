# Day 3 — Dashboard Performance & Optimization

## 1. Computation Bounding
- **Preview Rows Consumption**: Dashboard visualizations operate on the deterministic normalized preview sample (up to 1,000 rows) already indexed during Day 2 ingestion, preventing repeated expensive full-table scans.
- **Category Truncation**: Categorical aggregations cap categories at 10 items, preventing DOM bloat and slow chart layout computations.
- **Scatter Sample Capping**: Bivariate correlation scatter plots are capped at 50 points.
- **Histogram Binning**: Binned into an optimal range of 4 to 8 bins via single-pass linear interpolation.

## 2. Rendering Efficiency
- Dynamic chart resizing uses `ResizeObserver` with debounced listener disposal on component unmount.
- Canvas renderer (`renderer: 'canvas'`) is configured by default in ECharts for maximum 60fps rendering performance.
