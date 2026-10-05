# Day 3 — Architectural & Engineering Decisions

## 1. Decision Log

### ADR-013: Rule-Based Deterministic Visual Intelligence vs LLM Prompting
- **Decision**: Implemented a pure mathematical heuristic recommendation engine (`chart-recommender.ts`) without calling external LLM APIs.
- **Rationale**: Eliminates non-deterministic hallucinations, guarantees sub-millisecond response times, reduces cloud operating costs to zero, and ensures 100% predictable chart selections.

### ADR-014: Standardized Dark Theme Palette for ECharts
- **Decision**: Standardized ECharts options to use transparent backgrounds and high-contrast dark-mode hex palettes (`#6366f1`, `#10b981`, `#06b6d4`, `#f59e0b`).
- **Rationale**: Aligns with Tailwind CSS dark UI aesthetic and maintains consistent visual hierarchy across diverse dataset shapes.

### ADR-015: Suspense Boundary Encapsulation for Next.js 16 App Router
- **Decision**: Encapsulated dynamic search parameter parsing (`useSearchParams`) inside `<Suspense>` on `/app/dashboard`.
- **Rationale**: Enables Next.js static prerendering during production builds without de-opting into full client bailout errors.
