# ADR-005: Storing agent workflow state

**Status:** Accepted (2026-08-30), migration `AddIssueAdvisoryAndMarketplaceTables`. Extended by the photo-diagnosis and audit-timestamp migrations.

**Context.** The specification requires durable storage of the workflow ID, objective, plan, completed steps, tool results, validation results, errors, approval status and final outcome. It must not store hidden reasoning, passwords, tokens or unnecessary personal data. Officers must be able to read the trace next to the advice, and the steps' shapes differ from agent to agent and change over time.

**ADR-005 options**

| Option | For | Against |
|---|---|---|
| One JSON document per workflow (a single jsonb column or a document database) | Flexible | Weak integrity; hard to query steps; a second store for a document database |
| Fully relational columns for every agent's output | Strong typing and queries | A migration for every change to an agent's output; many sparse columns |
| Event-sourcing store | Complete history | Heavy for our needs; more infrastructure |
| **Relational workflow and step tables with jsonb payloads** | Keys, FKs, statuses, timings and approval are relational and indexed; each step's input and output is flexible `jsonb` | Payload shapes are not enforced by the database (enforced by the C# records instead) |

**Decision.**

- **Tables.** `AIAdvisories` (the outcome and the approval) 1 → n `AgentWorkflows` (objective, status, current step, times, `RequiresHumanApproval`) 1 → n `AgentExecutions` (agent name, status, times, `InputData jsonb`, `OutputData jsonb`).
- **Payloads.** Stored with enums as names, so traces are readable. A failed step stores `{"error": …}`.
- **What is kept.** Only the plan and the Planner's short stated reasons are stored, never hidden reasoning. Keys and personal data are never put into payloads.

**Consequences.**

- (+) The officer's trace, the approval and the audit log live in one transactional database, with cascading deletes from advisory to workflow to steps.
- (+) Adding the Planner's language-model metadata needed no migration: it went into the jsonb output.
- (−) Queries inside payloads use PostgreSQL JSON operators. This was used for evidence (§10.6) but is not needed by the application.
