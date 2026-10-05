# Day 3 — ECharts Integration & Rendering Architecture

## 1. Client-Side Rendering Strategy
To prevent React hydration mismatches and ensure compatibility with Next.js SSR/App Router:
- The `EChartsChart` component (`components/charts/EChartsChart.tsx`) is marked with `'use client'`.
- Chart initialization occurs within a `useEffect` hook using the native HTML `<div>` container ref.
- A `ResizeObserver` automatically triggers `chartInstance.resize()` on viewport and container dimensional changes.

## 2. Palette & Styling Conventions
- **Background**: Transparent canvas (`backgroundColor: 'transparent'`) blending into dark card containers.
- **Theme Palette**: Curated dark-mode hex colors:
  - Primary Indigo: `#6366f1` / `#4338ca`
  - Emerald Green: `#10b981` / `#047857`
  - Cyan: `#06b6d4`
  - Amber: `#f59e0b`
  - Rose: `#f43f5e`
  - Violet: `#8b5cf6`
- **Tooltips**: Dark glassmorphic styling (`#0f172a`, border `#334155`, text `#f8fafc`).
