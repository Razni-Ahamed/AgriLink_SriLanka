# ADR-007: Human-in-the-loop approval for all AI advice

**Status:** Accepted (2026-09-06); in place since PR #21 and enforced for photo advice in PRs #44–#47.

**Context.** The advisory may influence how a farmer treats a crop. Several things can make it unreliable: the photo models are much weaker on field photos than on lab photos, the knowledge base is rule-based, and weather data can be missing. Wrong advice can cost a harvest, so uncertain or unsupported results must not reach a farmer as final advice.

**ADR-007 options**

| Option | For | Against |
|---|---|---|
| Fully automatic AI advice | Fast; no officer workload | High risk when a prediction is uncertain, unsupported or wrong |
| A single ML classifier | Simple | Cannot combine symptoms, weather and business rules; no reasoning trace |
| **Agentic workflow with mandatory officer review** | Several recorded analysis steps, deterministic validation, escalation reasons and expert sign-off | Needs officer time; slower final advice; review screens to build |

**Decision.** Every advisory is saved as Draft (or Preliminary when photo triage allows early release) with `RequiresApproval = true`. It becomes final only when an officer or admin approves or rejects it. Escalation reasons, the trace and the photo are shown to the reviewer. The agents can never take the release decision themselves.

**Consequences.**

- (+) Human oversight of every piece of advice, and a full audit trail.
- (+) Uncertainty is handled explicitly through escalation reasons and confidence.
- (+) Several independent signals are combined.
- (−) Officer involvement is required, and final advice takes longer.
- (−) Review and trace screens had to be built on both clients.

**Review condition.** Relax the approval requirement only after field validation of the AI workflow, with governance agreed with the Department of Agriculture.
