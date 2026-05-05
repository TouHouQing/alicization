# 2026-04-17 Alicization Self-Generated Autobiographical Cadence Closure Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` requirement / plan / runtime artifacts。
2. 扩 `goal-stack` 与必要的 `desire-memory`，生成 durable self-generated goals。
3. 新建 `autobiographical-episodes.ts`，把事件/情绪/动机/lesson 写成 episode fragment。
4. 扩 `recall-governor`、`mind-continuity` 与相关 continuity cue，增强 autobiographical retrieval。
5. 扩 `proactive-feedback`、`proactive-policy`、`runtime-subconscious-tick`，接入持续 cadence state。
6. 新建 `host-rhythm-model.ts` 并接入 relationship / habit 链。
7. 扩 `intention-stream`，让 autobiographical goal / motive agenda / desire 形成 simmering inner projects。
8. 把 identity / present-state fast path 接到新的 continuity cue。
9. 跑 targeted tests、typecheck，补 cleanup receipt 与 delivery acceptance report。

## Ownership Boundaries

1. Goal / desire chain:
   `apps/stage-tamagotchi/src/main/services/alicization/goal-stack.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/desire-memory.ts`
2. Autobiographical continuity / recall:
   `apps/stage-tamagotchi/src/main/services/alicization/autobiographical-episodes.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/recall-governor.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/mind-continuity.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`
3. Cadence / proactive runtime:
   `apps/stage-tamagotchi/src/main/services/alicization/proactive-feedback.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
4. Dialogue fast path:
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
5. Integration / build chain:
   `apps/stage-tamagotchi/src/main/services/alicization/host-rhythm-model.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/intention-stream.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autobiographical-episodes.test.ts apps/stage-tamagotchi/src/main/services/alicization/goal-stack.test.ts apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-continuity.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
3. `pnpm lint:fix`

## Implementation Rules

1. 不新增第二套人格/主动系统，只改造现有 digital-life reducers 和 runtime 闭环。
2. cadence state 必须是持续累积/衰减，而不是单次布尔开关。
3. autobiographical continuity 必须同时作用于 subconscious fragments 和当前 recall seed。
4. self-generated goals 必须在没有强当前线程时仍能存在，但不能粗暴压过真实当前 turn truth。
5. fast path 只能接 continuity cue，不能复制一套新的对话治理逻辑。

## Rollback Rules

1. 如果 cadence state 让 proactive 过于频繁，优先回调 threshold / decay，不撤掉整个统一状态。
2. 如果 autobiographical recall 污染 truth surface，优先收紧 recall governor，而不是删掉 autobiographical continuity 写入。

## Phase Cleanup Expectations

1. 写出 requirement / plan / stage lineage / cleanup receipt / delivery acceptance report。
2. 记录 `lint:fix` 是否仍被 repo-wide 外部噪音污染。
