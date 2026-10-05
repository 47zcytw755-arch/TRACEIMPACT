# Security Architecture & Controlled SQL Model — TraceImpact Cloud

## 1. Core Security Tenet
TraceImpact Cloud treats data isolation and query sandboxing as primary system invariants. Users cannot execute arbitrary SQL from the browser, and the AI engine is never granted direct, unvalidated database connection privileges.

---

## 2. Multi-Tenant Authorization Hierarchy

```
[ Authenticated User ]
         |
         v
[ Workspace Boundary ] (Primary Tenant Barrier)
         |
         v
[ Dataset Catalog ]
         |
         v
[ Dataset Access Policy ] (Read-only execution against isolated tenant tables)
```

Every database operation, metadata query, and file access is scoped to the `workspace_id` resolved from session credentials.

---

## 3. Controlled AI SQL Execution Pipeline

```
[ 1. User Natural-Language Question ]
                  |
                  v
[ 2. AI Intent & SQL Translation ]
  (Supplied ONLY with sanitized column schema & data types)
                  |
                  v
[ 3. Server-Side AST & Lexical SQL Validator ]
  (Parses query into AST tree; enforces strict whitelist)
                  |
        +---------+---------+
        |                   |
    [ PASSED ]          [ FAILED / REJECTED ]
        |                   |
        v                   v
[ 4. Scoped Read-Only ]  [ Immediate Error Response ]
  (Execute against       ("Query contains prohibited
   isolated schema)        syntax or unauthorized tables")
        |
        v
[ 5. Tabular Result Set ]
        |
        v
[ 6. AI Natural Explanation + Chart Spec ]
        |
        v
[ 7. Secure Client Display ]
```

---

## 4. Strict SQL Prohibition Policy

The AST validation engine rejects any statement that contains:

### Prohibited Mutation Operations
- `DROP`
- `DELETE`
- `UPDATE`
- `INSERT`
- `ALTER`
- `TRUNCATE`
- `CREATE`
- `REPLACE`
- `MERGE`
- `UPSERT`

### Prohibited Administrative & Privilege Commands
- `GRANT`
- `REVOKE`
- `EXECUTE` / `CALL`
- `SET` / `RESET`
- `SHOW` / `DESCRIBE` (bypassed in favor of app catalog)
- `COPY` / `IMPORT` / `EXPORT`

### Prohibited Bypass & Injection Vectors
- **Multi-statement queries:** Semicolons (`;`) delimiting multiple statements are strictly rejected.
- **SQL Comment Bypasses:** Inline comments (`--`, `/* ... */`, `/*! ... */`) are stripped or treated as invalid tokens.
- **Unknown Tables & Columns:** AST matches table identifiers against only the user's active dataset tables in the current workspace.
- **System Catalogs:** Access to `pg_*`, `information_schema`, `sqlite_master`, or administrative views is blocked.
- **Cross-Workspace Traversal:** Queries cannot reference multiple workspace prefixes.

---

## 5. Defense-in-Depth Measures
1. **Dedicated Read-Only DB Role:** SQL queries execute under a PostgreSQL role possessing only `SELECT` privileges on specific tenant tables.
2. **Strict Statement Timeouts:** Analytical queries are terminated after 5,000ms to prevent resource exhaustion / DoS.
3. **Audit Logging:** Every user question, generated SQL, validation outcome, and execution duration is permanently recorded in `ai_queries`.
