# 2026-04-17 Alicization Inner Thought Mind Chain Refactor Execution Plan

## Internal Grade

`L`

## Wave Structure

### Wave 1: Mental Language Audit

1. 定位 `mind-synthesizer / current-conscious-frame / answer-compiler` 中的 directive-style strings。
2. 区分必须保留的 truth semantics 与可改写的 phrasing shell。

### Wave 2: Inner-Thought Refactor

1. `mind-synthesizer.ts`
   - 改写 openingIntent / truthBoundary / interiorSummary
2. `current-conscious-frame.ts`
   - 改写 consciousNeed / consciousTension / speakingIntention / withheldImpulse
3. `answer-compiler.ts`
   - 改写 openingDirective / nextMove / uncertaintyBoundary block wording

### Wave 3: Regression And Verification

1. 跑 `mind-synthesizer / current-conscious-frame / answer-compiler / main-chat-runtime-surface` tests
2. 跑 stage-tamagotchi typecheck
3. 记录 lint 状态

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.test.ts apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
3. `pnpm lint:fix`

## Rollback Rules

1. 若 phrasing 改写导致 truth-discipline 语义丢失，则保留语义、回退过度文学化表达。
2. 不为了“更像人”而牺牲对 live/coarse/memory/repair 的区分。
