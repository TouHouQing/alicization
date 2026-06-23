# Alicization AGENTS Charter Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the root `AGENTS.md` into a project-charter document that expresses Alicization's long-term identity, four-phase roadmap, current development focus, and durable engineering rules while preserving only the practical repo guidance that still belongs in a top-level collaboration document.

**Architecture:** The rewrite replaces the old milestone-driven root structure with a charter spine: purpose, roadmap, first principles, current focus, architecture rules, and an operational appendix. The implementation is intentionally narrow: one planning document and one root markdown rewrite, with validation focused on structure, ambiguity, and preservation of still-valid repo conventions.

**Tech Stack:** Markdown, git, existing monorepo conventions in `AGENTS.md`, `README.md`, and `docs/superpowers/specs/2026-05-20-alicization-agents-charter-design.md`

---

## Task 1: Create The Rewrite Plan Artifact

**Files:**
- Create: `docs/superpowers/plans/2026-05-20-alicization-agents-charter-rewrite-plan.md`
- Reference: `docs/superpowers/specs/2026-05-20-alicization-agents-charter-design.md`

- [ ] **Step 1: Write the plan file with the approved rewrite scope**

```md
# Alicization AGENTS Charter Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the root `AGENTS.md` into a project-charter document that expresses Alicization's long-term identity, four-phase roadmap, current development focus, and durable engineering rules while preserving only the practical repo guidance that still belongs in a top-level collaboration document.
```

- [ ] **Step 2: Verify the plan file exists with the expected header**

Run: `sed -n '1,40p' docs/superpowers/plans/2026-05-20-alicization-agents-charter-rewrite-plan.md`
Expected: The file starts with `# Alicization AGENTS Charter Rewrite Implementation Plan` and includes the required worker note.

- [ ] **Step 3: Commit the plan artifact**

```bash
git add docs/superpowers/plans/2026-05-20-alicization-agents-charter-rewrite-plan.md
git commit -m "docs: add AGENTS charter rewrite plan"
```

### Task 2: Replace The Root AGENTS.md Structure

**Files:**
- Modify: `AGENTS.md`
- Reference: `docs/superpowers/specs/2026-05-20-alicization-agents-charter-design.md`
- Reference: `README.md`

- [ ] **Step 1: Write the new charter spine into `AGENTS.md`**

```md
# Project Alicization Charter

This file is the highest-priority collaboration and direction document for the `TouHouQing/alicization` monorepo.

It defines:

- what Alicization is trying to become
- how humans and coding agents should make tradeoffs
- which phase the repository is currently optimizing for
- which engineering rules are durable enough to sit above local implementation convenience
```

- [ ] **Step 2: Replace the old P0-P4 backbone with the approved five-part charter**

```md
## Four-Stage Roadmap
## First Principles And Non-Goals
## Current Phase Focus
## Engineering Architecture And Collaboration Rules
## Repository Structure And Practical Development Conventions
```

- [ ] **Step 3: Preserve only still-valid operational guidance in the appendix**

```md
- monorepo structure overview
- `pnpm` workspace command patterns
- Vue / UnoCSS / Eventa / injeca / Valibot conventions
- testing and comment conventions
- "improve code when you touch it" expectations
```

- [ ] **Step 4: Verify the rewritten document no longer uses the old milestone backbone**

Run: `rg -n "^## Alicization P[0-9]" AGENTS.md`
Expected: No matches.

- [ ] **Step 5: Verify the new major sections are present**

Run: `rg -n "^## (Four-Stage Roadmap|First Principles And Non-Goals|Current Phase Focus|Engineering Architecture And Collaboration Rules|Repository Structure And Practical Development Conventions)$" AGENTS.md`
Expected: One match for each major section.

- [ ] **Step 6: Commit the root document rewrite**

```bash
git add AGENTS.md
git commit -m "docs: rewrite AGENTS as Alicization charter"
```

### Task 3: Review For Ambiguity And Practical Drift

**Files:**
- Modify: `AGENTS.md`
- Reference: `docs/superpowers/specs/2026-05-20-alicization-agents-charter-design.md`

- [ ] **Step 1: Scan for placeholders or weak wording**

Run: `rg -n "TBD|TODO|placeholder|etc\\.|and so on|maybe|probably" AGENTS.md`
Expected: No matches, or only intentional comment-marker examples.

- [ ] **Step 2: Confirm the execution model matches the approved policy**

Run: `rg -n "trust|unlock action permissions|default.*execute|danger.*risk" AGENTS.md`
Expected: The document states that ordinary execution is available by default and that dangerous actions are governed by risk policy, confirmation, auditability, interruptibility, and optional user-configured bypass rules.

- [ ] **Step 3: Confirm the current phase remains explicitly desktop-first**

Run: `rg -n "Phase 1: Local Digital Life|apps/stage-tamagotchi|desktop" AGENTS.md`
Expected: Matches show that the present repository focus is the desktop life loop.

- [ ] **Step 4: Run markdown lint/formatting through the repo's staged-file hooks**

Run: `git add AGENTS.md && git diff --cached -- AGENTS.md`
Expected: The staged diff shows only the intended charter rewrite.

- [ ] **Step 5: Commit the review pass if it produced changes**

```bash
git add AGENTS.md
git commit -m "docs: refine Alicization charter wording"
```
