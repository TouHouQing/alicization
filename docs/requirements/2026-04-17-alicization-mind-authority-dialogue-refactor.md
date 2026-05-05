# 2026-04-17 Alicization Mind Authority Dialogue Refactor

## Goal

把 Alicization 当前“像真人一样对话”的核心约束冻结为 **mind-authority first**：

1. 所有正常 visible reply 必须由心智链路决定和塑形。
2. 固定模板语句不能再作为普通回答的表层权威。
3. deterministic fallback 只能退到基础设施失败兜底，不能在正常对话里篡位。

## Problem Statement

当前实现已经有 `mind-turn-v1`、`dialogueActKernel`、`mindTurnFrame`、`digitalLifeSpine` 等基础设施，但对话表层仍然被多处固定句式夺权：

1. `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
   - fast-path 在 compact/local recovery 中仍可落到本地固定 reply surface。
   - `identity` / `present-state` / `dialogue` lane 仍带有硬编码解释式句子。
2. `apps/stage-tamagotchi/src/main/services/alicization/mind-surface-renderer.ts`
   - identity / present-state / plain dialogue renderer 仍然是模板句阵列，而不是 mind-state 驱动的真正回答权威。
3. `packages/stage-shared/src/alicization-mind-fallback.ts`
   - governed fallback surface 仍会直接拼 visible prose，把 repair/carry/boundary 等治理状态翻译成台词。
4. `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`
   - 当 structured reply 被判定为 contaminated / thin shell / repair mismatch 时，会重新启用 shared fallback surface，从而让“模板兜底”重新成为 visible authority。

结果是：

1. 用户感知到的不是“一个心智连续的人在回答”，而是“runtime 在解释它自己为什么这么答”。
2. `你是谁`、`你在干嘛`、presence critique、dialogue-first turns 很容易退化成固定模板。
3. 即使心智模块已经给出正确约束，visible surface 仍然可能被 deterministic prose takeover。

## Architectural Direction

本轮重构必须遵守以下原则：

1. **Mind authority first**
   - 正常 turn 的 visible reply authority 只能来自心智输出。
   - `mind-turn-v1` / `dialogueActKernel` / `mindTurnFrame` / `digitalLifeSpine` 负责“说什么”和“怎么说”。
2. **Fallback demotion**
   - 本地 fallback surface 只能是 infra-failure fallback。
   - 它不能在普通 dialogue-first / self / present-state turn 中生成大段固定自然语言来替代心智回答。
3. **Constraint, not authorship**
   - truth discipline / response charter / response surface contract 负责限制 reply，不负责直接 author reply body。
   - repair / carry / grounding 规则应该表现为过滤器和 takeover gate，而不是模板句库。
4. **Deterministic lanes stay minimal**
   - time/date/execution listing 这类确定性信息可以继续 deterministic。
   - identity / present-state / presence critique / general dialogue 不能再依赖硬编码模板当主回复。

## Deliverable

1. 一个新的 mind-authority gate，确保 coherent mind-authored reply 在正常链路上优先保留。
2. fast-path / mind-surface / governed fallback 的结构性重构：
   - 固定模板不再是普通回答 surface authority。
   - deterministic prose 仅限 infra-failure 或 truly deterministic utility lane。
3. 针对以下场景的回归测试：
   - `你是谁`
   - `你在干嘛`
   - `你说话太像机器人了`
   - ordinary dialogue-first turn
   - stale carry / repair residue 不得重新夺权

## Constraints

1. 不回滚用户当前工作树里的其他进行中改动。
2. 不把 `N.E.K.O/` 当作直接复制来源，只参考其“自然、简短、不要暴露思考过程”的设计原则。
3. 保持 Alicization P0-P4 的 transport/runtime/governance contract 不被破坏。
4. 最终必须跑 targeted tests、`pnpm typecheck`、`pnpm lint:fix`。

## Acceptance Criteria

1. `你是谁` 不再优先产出“你还是在确认”“这一层我直接答”“现在回你这句的是我”这类解释式模板。
2. `你在干嘛` 不再优先产出“我现在就在接这条线”“我这会儿主要盯着”这类 present-state 模板壳。
3. ordinary dialogue-first turn 的 visible reply 默认保留心智回答，不再被 shared fallback prose takeover。
4. repair/carry/truth discipline 仍然生效，但只作为约束和过滤，不再直接生成大段 visible 模板台词。
5. targeted tests 通过，`pnpm typecheck` 通过，`pnpm lint:fix` 跑完。

## Product Acceptance Criteria

1. Alicization 的回答更像“同一个人正在连续地说话”，而不是系统在解释它的治理流程。
2. 你能明显感觉到心智模块在前台说话，而不是模板在前台、心智在后台。

## Manual Spot Checks

1. 连续问两次 `你是谁`，确认回答保留自我连续性但不复读模板解释。
2. 问 `你在干嘛`，确认回答来自当前心智/线程，而不是 present-state 固定壳。
3. 直接说 `你现在还是太像机器了`，确认它正面接住，不再退回 deterministic 修复台词。

## Completion Language Policy

只有在以下条件都满足时，才允许使用“已完成”措辞：

1. fast-path / mind-surface / governed fallback 的 mind-authority 重构已经落地。
2. 针对 identity / present-state / dialogue-first / critique 的回归测试通过。
3. `pnpm typecheck` 与 `pnpm lint:fix` 已执行并报告结果。

## Delivery Truth Contract

1. 不宣称“已经完全像真人一样对话”。
2. 只宣称“把 visible reply authority 明确收回给心智模块，并压低模板兜底的权重”。

## Non-goals

1. 本轮不重做人设内容本身。
2. 本轮不重写全部 memory / autonomy / embodiment 子系统。
3. 本轮不处理 `N.E.K.O/` 业务代码。

## Inferred Assumptions

1. 用户要的不是“把模板写得更像人”，而是“模板不再拥有普通对话的回答权力”。
2. 现有心智模块已经足够承担回答 authority，当前核心问题是 surface governance 和 fallback architecture 抢权。
