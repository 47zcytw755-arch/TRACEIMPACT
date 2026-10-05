# Architectural & Engineering Decisions — Day 1

## 1. Key Technical Decisions

### Decision 1: Next.js App Router Structure with Nested `/app` Shell
- **Context:** TraceImpact Cloud requires a public marketing surface (`/`) and an authenticated workspace shell (`/app/*`).
- **Choice:** Utilized Next.js App Router folder structure where `app/page.tsx` renders the marketing landing page and `app/app/layout.tsx` encapsulates the persistent workspace shell with sidebar and header.
- **Rationale:** Keeps routes organized, prevents public pages from loading authenticated shell assets, and allows clean future expansion for workspace sub-routing.

### Decision 2: Pure Client-Safe ECharts Architecture
- **Context:** Apache ECharts accesses browser `canvas` and `window` objects which break during Next.js Server-Side Rendering (SSR) if imported naively.
- **Choice:** Encapsulated ECharts inside a dedicated `'use client'` component (`components/charts/EChartsChart.tsx`) utilizing `useEffect`, `useRef`, and `ResizeObserver` with explicit `dispose()` cleanup on unmount.
- **Rationale:** Ensures zero hydration mismatches, zero memory leaks on page transitions, and automatic chart responsiveness.

### Decision 3: Single Source of Truth for Design Tokens & Constants
- **Context:** Avoiding repetitive ad-hoc colors and route strings across pages.
- **Choice:** Created `config/site.ts` for route definitions, supported formats, and metadata; paired with Tailwind CSS v4 CSS variables and reusable UI components in `components/ui/`.
- **Rationale:** Simplifies maintenance, ensures consistent typography/spacing, and prepares the platform for theming.

### Decision 4: Transparent UI Placeholders without Fabricated Functionality
- **Context:** Backend ingestion, cloud storage, authentication, and SQL AI engines are scheduled for Days 2–5.
- **Choice:** Implemented interactive frontend states for file inspection, but explicitly marked backend actions as disabled with descriptive milestone badges.
- **Rationale:** Maintains engineering integrity, eliminates confusion, and prevents security debt.
