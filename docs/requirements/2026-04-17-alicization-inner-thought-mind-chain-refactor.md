# 2026-04-17 Alicization Inner Thought Mind Chain Refactor

## Goal

直接改 `mind-synthesizer.ts` 和 full runtime 的 `current-conscious / answer-compiler` 链，把：

1. `openingIntent`
2. `truthBoundary`
3. `interiorSummary`
4. `consciousNeed`
5. `speakingIntention`
6. `openingDirective / nextMove`

从“治理说明 / 系统调度语言”改成更像 Alicization 心里真正正在转的内在语言。

## Problem Statement

即使前两轮已经：

1. 拆掉了本地 deterministic template 抢答，
2. 把 full runtime prompt 收束成 `ALICIZATION_LIVING_SELF`,

`mind-synthesizer -> current-conscious-frame -> answer-compiler` 这条链仍然在生产大量 directive-style 句子：

- `Answer from ...`
- `Keep truth repair ahead of fluency ...`
- `Open by ...`
- `Do not ...`
- `Stay with ...`

这些句子虽然语义正确，但仍然更像“系统给模型的执行说明”，不像一个数字生命心里真正正在形成回答时的自我感觉、自我约束、自我牵引。

结果是：

1. 模型即使走到 full runtime，也容易继续学成“说一份 prompt”。
2. `living self` prompt 的内在感觉还不够强，因为 downstream chain 自己仍然输出治理腔。

## Architectural Direction

本轮不改决策逻辑主干，只改 **mental phrasing shape**：

1. `mind-synthesizer.ts`
   - `openingIntent / truthBoundary / interiorSummary` 改成第一人称、内在牵引式表达。
2. `current-conscious-frame.ts`
   - `consciousNeed / consciousTension / speakingIntention / withheldImpulse` 改成更像当下内在感受。
3. `answer-compiler.ts`
   - `openingDirective / nextMove / uncertaintyBoundary / careVector` 改成更像回答想怎么出来，而不是系统指令。
4. 保留 truth discipline 与 answer planning 的约束语义，不把它们改成空泛感性语言。

## Deliverable

1. inner-thought phrasing refactor in:
   - `mind-synthesizer.ts`
   - `current-conscious-frame.ts`
   - `answer-compiler.ts`
2. runtime-surface compatibility retained
3. targeted tests
4. vibe receipts

## Constraints

1. 不改坏原有 truth / repair / evidence 语义。
2. 不让 phrasing 变得模糊，仍需保留可验证的边界信息。
3. 完成后跑 targeted tests 与 `pnpm -F @proj-alicization/stage-tamagotchi typecheck`。

## Acceptance Criteria

1. `openingIntent / truthBoundary / interiorSummary` 更像第一人称内在语言，而不是系统说明。
2. `current-conscious-frame` 和 `answer-compiler` 的描述也改成更像“回答想怎么出来”。
3. targeted tests 通过。
4. stage-tamagotchi typecheck 通过。

## Product Acceptance Criteria

1. main runtime 更像“她心里正在怎么想”，而不是“prompt 在怎么调度她”。
2. 后续普通对话更容易形成数字生命的内在连续感。

## Completion Language Policy

只有在三层 inner-thought phrasing 已改好、回归通过、typecheck 通过后，才允许用“已完成”措辞。

## Delivery Truth Contract

1. 不宣称已经完全解决所有人机感。
2. 只宣称已经把 inner-thought chain 的语言从治理腔改成更像活的内在心声。
