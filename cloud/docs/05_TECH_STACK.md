# Technology Stack Specification — TraceImpact Cloud

## 1. Verified Core Stack (Day 1)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js | `16.3.7` | App Router, Server/Client components, Static & Dynamic routing |
| **UI Library** | React & React-DOM | `19.2.8` | Component rendering, state hooks, React 19 architecture |
| **Language** | TypeScript | `^5.0.0` | Strict static typing, type safety across components |
| **Styling** | Tailwind CSS | `^4.0.0` | Utility-first CSS via `@tailwindcss/postcss` and `@theme inline` |
| **Visualizations**| Apache ECharts | `^6.1.0` | High-performance canvas data visualization |
| **Linting** | ESLint | `^9.0.0` | Code quality enforcement via `eslint-config-next` |
| **Deployment** | Vercel | Production | Cloud hosting, edge edge distribution, CI/CD pipeline |
| **Version Control**| Git / GitHub | v2.x | Source control management |

---

## 2. Planned Backend & Data Stack (Day 2+)

| Subsystem | Technology | Purpose |
|---|---|---|
| **Relational & Analytical DB** | PostgreSQL (Neon / Supabase) | Workspace metadata, schema definitions, tabular storage |
| **Object Storage** | Cloudflare R2 | S3-compatible raw file storage with zero egress fees |
| **AI LLM Engine** | OpenAI / Anthropic / Gemini | Natural-language query translation |
| **SQL Parser & AST Validator** | node-sql-parser / pg-query | AST extraction, read-only verification, statement sanitization |
