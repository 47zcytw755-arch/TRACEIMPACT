# TraceImpact Cloud — Portfolio Project Summary

**Project Title:** TraceImpact Cloud — Traceable Data Intelligence & Impact Reporting Platform  
**Live URL:** `http://localhost:3000` (Pre-configured for Vercel deployment)  
**Repository:** `/Users/shashwat/Desktop/traceimpact-cloud`  
**Stack:** Next.js 16 (App Router & Turbopack), React 19, TypeScript, Tailwind CSS, Apache ECharts, PostgreSQL / Supabase, PapaParse, XLSX.

---

## 1. Problem Statement
Organizations routinely ingest disparate tabular datasets (CSV, Excel, JSON, delimited text) containing missing values, data type drift, anomalies, and schema irregularities. Traditional Business Intelligence tools demand complex pipeline setup, and modern generative AI assistants risk hallucinations, schema injection attacks, and multi-tenant data leakage.

## 2. Technical Solution
TraceImpact Cloud is a full-stack SaaS platform that provides:
- **Instant Multiformat Ingestion:** Real-time stream parsing and deterministic statistical profiling across CSV, XLSX, JSON, and TXT files.
- **Explainable Data Quality Scoring:** Algorithmic DQ health evaluation $[0, 100]$ with transparent penalty deductions for missing rates, type anomalies, and duplicates.
- **Automated Dynamic Dashboards:** Deterministic KPI calculations and theme-harmonized Apache ECharts visualizations (Bar, Histogram, Area/Line, Scatter, Pie).
- **Controlled AI Chat & Safe SQL:** Natural language query understanding parsed into structured AST intents, validated against strict read-only SQL whitelists, and answered strictly using verified row evidence.
- **Multi-Tenant Governance & RBAC:** Multi-tenant workspace boundaries, role delegation (OWNER, ADMIN, MEMBER, VIEWER), clean data export, and immutable audit logs with automated credential sanitization.

---

## 3. Architecture & Security Highlights
- **AST Parameterized SQL:** Queries execute safely without direct or unrestricted LLM access to PostgreSQL tables.
- **Adversarial Defenses:** Systematically prevents DDL modifications, data mutations (`DROP`, `DELETE`, `UPDATE`, `INSERT`), comment injections (`--`), and system catalog lookups.
- **Dual-Mode Persistence:** Durable local multi-tenant JSON persistence with zero setup alongside full relational PostgreSQL / Supabase schemas and Row-Level Security (RLS) migrations.
- **Verified Codebase:** 342/342 platform automated tests passing (100%), 0 ESLint warnings, clean Next.js production build across all 29 routes.
