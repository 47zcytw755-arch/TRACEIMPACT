# Multi-Tenancy & Authorization Model — TraceImpact Cloud Day 2

## 1. Tenant Boundary Invariants
1. **Workspace Scoping:** Every dataset, file, column, run, and issue belongs strictly to a single `workspace_id`.
2. **Access Control Enforcement:** The `DatasetRepository` filters and validates all read, update, and delete queries using both `id` and `workspaceId`. Cross-tenant queries return `null` or `404 Not Found`.
3. **Storage Boundary:** Object storage keys incorporate `{workspaceId}` in their path prefix, preventing cross-tenant file collisions.
4. **Environment Fallback:** In development mode, unauthenticated requests are scoped safely to `default-workspace`.
