# AI usage declaration

> Part of the AgriLink Sri Lanka project documentation ([index](../README.md)). Section numbers follow the team's SE3090 Assignment 1 report, so "§" references point to its sections.

# 14. Consolidated group AI usage declaration

This project was completed under **AI Use Level 4 (Full AI)**, as permitted by specification §18.

**Tools used during development.**

- **Claude Code** (Anthropic) with the Claude Sonnet 5, Claude Opus 5 and Claude Opus 5.5 models, in 21 recorded sessions between 22 August and 29 September 2026. It was used for planning work packages, generating and refactoring code, debugging, writing tests, deployment scripts, and drafting documentation, including this report's structure and text.
- **Graphify** was used to build a knowledge graph of the repository as context for those sessions.
- Each member's other tools are listed in their individual AI usage log in Part B.

**Qwen is part of the product.** It is the Planner agent's optional language model, running at run time. It is not a development tool.

**How AI output was controlled.**

- Every AI-generated change was reviewed by the member who owns that area.
- Changes were merged only through pull requests. The final ones passed three CI workflows with 1,473 automated tests.
- Changes were checked by running the application.
- The work-package prompts given to members (`01`–`04_*_AGENT_PROMPT.md`, `frontend-agent-prompts/`, the mobile `PHASE_*.md` files) required small, reviewable commits on each member's own branch.
- Test results, performance figures and evaluation results in this report come from real runs, and each is dated with its evidence linked.

**What was not done with AI.**

- No AI tool was given production credentials, API keys or personal data.
- The demonstration and viva will be done without any external AI assistant. The only AI that runs is the application's own Agentic AI subsystem, as the specification requires.

**Declaration.** We confirm that all use of AI tools in this assignment has been disclosed in this declaration and in each member's AI usage log. We confirm that each of us can explain, test and modify the work submitted under our name, and that the individual reflections are our own writing.

Each member's individual AI usage log and reflection are part of the submitted report.
