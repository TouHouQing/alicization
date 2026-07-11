# Project State

This document is the repo-level working truth for the current Alicization phase.
It must not contain dialogue templates, persona slogans, or provider-facing cue
phrases.

## Current Runtime Facts

- Alicization is a local-first digital life project.
- The desktop runtime in `apps/stage-tamagotchi` is the current local digital life proving ground.
- `SOUL.md` remains the personality source of truth.
- `WorkingMemory` owns short-term dialogue carry.
- `LongTermMemoryRecall` owns long-term recall.
- `MemoryWorkbench` is the visible memory governance entry and does not own memory semantics.
- Failure surfaces must stay transparent: timeout, provider failure, tool failure, and invalid structured output must be reported as failures.

## Current Open Work

- Real semantic recall quality needs scale testing.
- Production embedding configuration and reindexing need stronger operational proof.
- Long-term memory search needs pagination, filtering, and latency visibility at scale.
- Review policy persistence and review actions need continued regression coverage.
- Persona candidates must come only from cleaned long-term reflection or persona reinforcement evidence.

## Forbidden

- Do not train persona data from raw transcripts.
- Do not treat review-queue candidates as confirmed long-term memory.
- Do not mask provider, timeout, or tool failures with a fixed persona reply.
- Do not mix embedding vectors from different models without reindexing.
- Do not place internal project-state cue text into user-visible replies.

## Update Rule

Update this file only when the implemented runtime facts change. Keep it short,
auditable, and free of fixed reply wording.
