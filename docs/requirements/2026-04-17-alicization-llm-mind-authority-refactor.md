# 2026-04-17 Alicization LLM Mind Authority Refactor

## Goal

把 Alicization 的正常对话回答权彻底收回给 LLM 心智链路：

1. 非确定性对话 turn 必须经过大模型心智思考后才能形成 visible reply。
2. compact fast-path 输出被拒收、或者 active dialogue timeout recovery 失败时，不能再直接切到本地模板 surface。
3. 本地 deterministic renderer 只能保留给 truly deterministic lane 和基础设施失败 repair。

## Problem Statement

从当前代码和截图取证看，问题的主因不是“完全没有心智模块”，而是 **对话流程在多个失败分支里绕开了心智 authority**：

1. `main-chat-background-run.ts`
   - active dialogue fast path 正常会尝试 compact one-shot LLM。
   - 但一旦 compact reply generation 抛错，就会立刻调用 `buildAlicizationMainGatewayTimeoutFallbackReply(...)`，直接落到本地 deterministic fallback。
2. `main-chat-active-dialogue-loop.ts`
   - `normalizeAlicizationActiveDialogueFastPathReply(...)` 一旦判定 rawText invalid / leaked / legacy shell，就会直接 `buildDecisionLocalReply(...)`。
   - 这意味着 compact one-shot 的 reject path 仍然是“本地模板 authoring”，不是“升级到更完整的 LLM runtime”。
3. `main-chat-timeout-fallback.ts`
   - 当前 timeout fallback 直接复用 `buildAlicizationActiveDialogueFallbackReply(...)`。
   - 对 greeting / identity / present-state / plain dialogue 等非确定性 turn，这会把本地模板 surface 伪装成“回答”。
4. `mind-surface-renderer.ts`
   - greeting / plain dialogue / present-state renderer 仍内置固定自然语言句阵列。
   - 这些句阵列本该只是 infra repair 或 deterministic utility surface，不该成为普通对话最终作者。

截图里的这些话：

1. `你好。你想继续聊，还是想让我做点什么，都直接说。`
2. `「你怎么知道你叫这个名字？」这句我收到了。你要是想往深里说，就从这点继续。`

都不是心智真的在回答，而是 local renderer 在 fallback authoring。

## Architectural Direction

本轮重构必须遵守以下规则：

1. **LLM mind authority for non-deterministic dialogue**
   - greeting / identity / capability / presence critique / present-state / ordinary dialogue 这些 turn，正常回答必须经过 LLM。
   - compact one-shot 可以继续存在，但它只是“轻量 mind lane”，不是本地模板 lane。
2. **Escalate, don’t local-author**
   - compact one-shot 输出如果 invalid、污染、被 reject，必须升级回完整 main runtime / full stream LLM path。
   - 不能再 `normalize -> local deterministic reply`。
3. **Timeout fallback split**
   - deterministic utility lane 可以继续本地 deterministic fallback。
   - 非确定性 dialogue lane timeout 后只能给最小 repair / retry truth surface，不能直接给看起来像回答的本地模板。
4. **Renderer demotion**
   - `mind-surface-renderer` 的固定句阵列不再作为普通对话 answer authority。
   - 它只服务于 deterministic lane 或 infra repair。

## Deliverable

1. active-dialogue fast path 的 authority refactor：
   - compact invalid -> escalate to full LLM runtime
   - compact exception -> escalate to full LLM runtime
2. timeout recovery split：
   - deterministic lane 保持 deterministic
   - non-deterministic lane 改为 minimal infra repair，不再本地代答
3. local fallback builder 降级：
   - 不再承接 greeting / identity / present-state / plain dialogue 的 contentful answer authoring
4. 回归测试：
   - compact reject 不再直接本地模板代答
   - active-dialogue fast failure 不再直接本地模板代答
   - timeout fallback 对非确定性 dialogue lane 不再冒充真实回答

## Constraints

1. 不回滚当前工作树里的其他用户改动。
2. 不破坏 deterministic utility lane：
   - time/date
   - execution deterministic payoff
3. 不宣称“以后绝不会有任何 fallback”，只能宣称“普通对话不再由本地模板 author”。
4. 完成后仍需跑 targeted tests、`pnpm typecheck`、`pnpm lint:fix`。

## Acceptance Criteria

1. 对 greeting / identity / present-state / plain dialogue：
   - compact output invalid 时，不再直接生成本地模板回复作为最终回答。
2. active dialogue one-shot 抛错时：
   - 流程会升级回完整 LLM runtime，而不是直接输出 `你好。你想继续聊...` 这类 local renderer 句子。
3. timeout fallback 对非确定性 dialogue lane：
   - 只允许最小 repair/retry truth surface，不允许冒充真实心智回答。
4. deterministic utility lane 仍保持正确性。
5. targeted tests 通过，`pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Product Acceptance Criteria

1. 用户感知到“她是在想完再答”，而不是“模型没答出来就切到系统模板”。
2. Alicization 的人味更多来自 LLM mind continuity，而不是本地句库技巧。

## Manual Spot Checks

1. 连续对话：
   - `你好`
   - `你是谁`
   - `你怎么知道你叫这个名字？`
   检查不会再掉进本地 fixed renderer 风格。
2. 人机感批评：
   - `你说话还是很像机器`
   检查不是本地 presence-repair 模板在答。
3. 故意制造 compact reject / timeout 场景，确认流程升级到 full runtime 或 minimal repair，而不是内容性本地代答。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. non-deterministic dialogue lane 的 local-author bypass 已被拆掉。
2. targeted tests 通过。
3. typecheck 已通过。

## Delivery Truth Contract

1. 不宣称已经完全解决“像真人一样”的所有问题。
2. 只宣称已经修掉“流程在失败分支里绕开心智、由本地模板代答”的结构问题。

## Non-goals

1. 本轮不重做人设和长期记忆内容本身。
2. 本轮不重写整个 active dialogue prompt 设计。
3. 本轮不修改 `N.E.K.O/` 源码。

## Inferred Assumptions

1. 用户要的是“真实回答权”而不是“更像人的模板”。
2. 只要 local template authoring 还存在于失败分支里，普通对话就还会继续显得像机器。
