# DeVoc OS

Enterprise-grade, multi-tenant Business Operating System for DeVoc.

DeVoc OS unifies People, Learning, Evaluation, Work, Projects, Finance, Permissions, Audit, and Analytics into an extensible platform designed for internal use first and future multi-organization SaaS.

## Engineering Source of Truth

GitHub is the permanent engineering memory of DeVoc OS.

- `AGENTS.md` — rules for AI coding agents
- `docs/Architecture-Index.md` — architecture navigation
- `docs/AI/Development-Workflow.md` — implementation and documentation workflow
- `docs/02_Domain/` — domain architecture
- `docs/10_ADR/` — architecture decision records
- Source code and tests — implemented behavior

## Working Model

**ChatGPT / architecture workshop → finalized GitHub documentation → AI coding agent → code + tests + documentation**

AI coding agents are expected to keep relevant engineering documentation synchronized with implementation. Humans review foundational architecture changes and approve new architectural decisions.

Notion is used for product management, not as the technical source of truth.

## Core Architecture

Person → Role → Assignment → Work → Outcome → Evaluation → Analytics

The V1 platform is designed as a modular monolith with PostgreSQL and a REST API under `/api/v1/`.

## Status

Architecture and domain foundation are being finalized before implementation milestones begin.
