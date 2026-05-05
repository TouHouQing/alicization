# 2026-04-13 Dialogue Surface Mind Closure Refactor

## Background

The current Alicization chat surface is still breaking digital-life continuity in two visible ways:

1. `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts` still answers greeting / identity / capability turns with fixed deterministic templates such as "我是 Alicization" or "我能直接回答，也能执行命令", which collapses different turns into the same shell.
2. `packages/stage-ui/src/stores/chat.ts` still allows structured JSON-shaped model output to leak into the visible chat bubble before or during final structured repair, which is exactly how `mind-turn-v1` payloads can show up raw in the UI.

This means the chain is still not closed:

- mind/governance exists, but visible dialogue still falls back to canned shells,
- structured transport exists, but streaming display can still show transport payload instead of lived reply,
- continuity exists in state, but it does not consistently pay off in visible human dialogue.

## Goal

Refactor the dialogue surface so the visible reply chain becomes mind-first and transport-safe:

- active-dialogue local lanes must generate dynamic, current-turn-aware replies instead of repeating template shells,
- structured stream payloads must never surface raw JSON in the user-visible bubble,
- the final visible reply must close over dialogue, context, continuity, tools, and mind without exposing runtime internals,
- every assistant-visible reply must pass through a single governed mind surface instead of being emitted by lane-local text factories.

## Scope

1. Replace greeting / identity / capability fast-path shells with dynamic mind-surface generation.
2. Rework structured streaming prelude detection so JSON-shaped payloads are buffered instead of streamed into the visible bubble.
3. Harden final structured fallback ordering so unresolved structured payloads never fall back to raw JSON text.
4. Keep execution follow-up and inspection continuity intact while removing canned "system shell" language.
5. Remove lane-local visible reply authority from active dialogue and execution payoff paths; those lanes may only emit semantic payloads, mind/governance cues, or factual result digests.
6. Introduce a unified mind-surface renderer that owns visible reply shaping for active dialogue, execution payoff, and follow-up payoff.
7. Add regression coverage for:
   - dynamic greeting / identity / capability payoff,
   - raw structured JSON never entering visible chat content,
   - final fallback preferring lived reply over shell opener on ordinary dialogue,
   - architectural proof that local lanes no longer own final visible speech.

## Acceptance Criteria

1. Greetings such as `下午好呀`, identity asks such as `你是谁`, and capability asks such as `你能帮我做什么` must no longer collapse into a fixed canned sentence family.
2. A streamed or finalized `mind-turn-v1` JSON object must never appear raw in the chat bubble.
3. Ordinary dialogue fallback must prefer the current living reply surface over shell openers like `我直接说。`.
4. Execution-bound turns, dialogue-first turns, and current-screen inspection turns must still preserve their respective truth and continuity rules after the refactor.
5. Greeting / identity / capability / execution payoff replies must no longer be authored by local `build*Reply`-style string factories.
6. Active dialogue, execution payoff, and execution follow-up visible replies must all originate from a shared mind-surface rendering path that receives governance plus semantic facts.
