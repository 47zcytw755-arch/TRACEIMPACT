# System Architecture — TraceImpact Cloud

## 1. High-Level Architectural Diagram

```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|  - Next.js 16 App Router (React 19, TypeScript, Tailwind CSS v4)               |
|  - Dynamic Client Components: EChartsChart, File Dropzone, Chat Workspace       |
|  - Responsive Desktop Sidebar / Mobile Collapsible Drawer                       |
+----------------------------------------+----------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            EDGE / ROUTING LAYER (Vercel)                        |
|  - Static Generation & SSR optimization                                         |
|  - Route Grouping (/ & /app/*)                                                  |
|  - Future: Edge Middleware for Auth & Tenant Boundary Enforcement               |
+----------------------------------------+----------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                        APPLICATION & API SERVICES (Planned)                     |
|  +---------------------------+  +--------------------------+  +---------------+ |
|  |  Dataset Ingestion Svc   |  | Schema & Profiling Engine |  | AI SQL Proxy  | |
|  |  - Presigned R2 uploads   |  | - Type inference         |  | - Intent parser| |
|  |  - Chunk validation       |  | - Quality scorer         |  | - AST validator| |
|  +---------------------------+  +--------------------------+  +---------------+ |
+----------------------+--------------------+---------------------+---------------+
                       |                    |                     |
                       v                    v                     v
+---------------------------------------------------------------------------------+
|                              STORAGE & DATA TIER                                |
|  - Raw File Lake: Cloudflare R2 (Encrypted, S3-compatible, isolated prefixes)   |
|  - Metadata & Query DB: PostgreSQL / Neon (Tenant-isolated schemas, Read-Only)  |
+---------------------------------------------------------------------------------+
```

---

## 2. Component Layering
1. **Presentation Layer (`components/ui`, `components/layout`):** Reusable, accessible UI primitives styled with Tailwind CSS v4.
2. **Visualization Layer (`components/charts`):** Browser-safe ECharts wrapper managing canvas lifecycles and responsive observers.
3. **Route Handlers & Pages (`app/`):** Clean separation between public marketing views (`app/page.tsx`) and application workspaces (`app/app/*`).
4. **Configuration & Types (`config/site.ts`, `types/index.ts`):** Single sources of truth for metadata, routes, and domain contracts.
