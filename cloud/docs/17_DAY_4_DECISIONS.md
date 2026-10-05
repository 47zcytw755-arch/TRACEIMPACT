# Day 4 — Architectural Decisions & ADRs

## ADR-016: Structured Query Intent as Intermediate Representation
- **Context**: Allowing an LLM to generate raw SQL text directly can lead to SQL syntax hallucinations, dialect incompatibilities, and injection risks.
- **Decision**: All natural language questions must first be parsed into a strongly-typed `StructuredQueryIntent` object before parameterized SQL generation.
- **Consequences**: Guaranteed schema alignment, strict parameterization, and simple deterministic validation.

## ADR-017: Whitelist-Only SQL Security Validator
- **Context**: Blacklisting keywords alone is insufficient to prevent sophisticated SQL injections or subqueries.
- **Decision**: Implemented `validateSQLQuery` which enforces that queries must strictly begin with `SELECT`, contain no comments, have no statement separators, target only authorized tables, and include a `LIMIT` clause.
- **Consequences**: Complete protection against destructive DDL/DML, system snooping, and query runaway.

## ADR-018: Strict Evidence Grounding for AI Explanations
- **Context**: LLMs tend to invent hypothetical reasons or unverified background context when describing data.
- **Decision**: Answer generation is strictly constrained to returned query rows, computed metrics, and schema column definitions.
- **Consequences**: Zero factual hallucinations; transparent and auditable responses.
