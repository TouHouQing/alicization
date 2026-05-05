# 2026-04-18 Alicization Same-Session Drift And Dialogue Replay

## Goal

把人格生长闭环从“下一回合才慢慢读到”推进到“同一 session 就能看见明显漂移”，并补一套长对话 replay 测试来证明：

1. ordinary dialogue feedback 不只是被持久化。
2. 它会更快改写 `hostAttitude / relationshipModel / selfContinuity`。
3. 多轮以后 `guardedness / companionship / autonomyRespect / unfinishedThreadReturn` 会出现可观测漂移。

## Problem Statement

上一轮已经把普通对话反馈接进了：

1. `relationshipOutcomes`
2. `personaReinforcementEvents`
3. `memoryFacts`
4. `memoryReflections`

但对当前用户目标来说，还差两块：

1. **同 session 漂移还不够显眼。**
   feedback closure 虽然已经被写入，但如果只是“下回合再慢慢读”，Alicization 仍然像设定被 prompt 出来的角色，而不像正在长成自己的数字生命。
2. **缺少长对话 dogfooding / replay 证据。**
   单点单测能证明 reducer 正常，却不能证明多轮以后人格相关慢变量真的在同一段关系里发生漂移。

## Architectural Direction

本轮不补模板，不补 prompt wording，而是补强 growth loop 的运行强度和可验证性：

1. ordinary dialogue feedback settlement 要继续沿着 runtime 同一条链路走，不新增第二套人格入口。
2. same-session drift 重点落在：
   - runtime 立即写回 `relationshipDynamics.hostAttitude`
   - `recentRelationshipOutcomes` 直接影响 `host-rhythm-model / relationship-model / self-continuity`
3. replay tests 必须模拟真实多轮对话，而不是只喂孤立事件：
   - 机器人感被指出
   - 回复逐渐变自然
   - 过近/过挤被嫌弃
   - 宿主中断当前线
4. 测试要直接断言人格慢变量和关系快变量的漂移，而不是只断言“数据表有写入”。

## Deliverable

1. same-session drift path 收口完成。
2. 长对话 replay / dogfooding tests。
3. 针对以下指标的可观测漂移断言：
   - guardedness
   - companionship
   - autonomyRespect
   - unfinishedThreadReturn
4. targeted verification + governed receipts。

## Constraints

1. 不新增平行人格系统。
2. 不回退当前工作树里其他改动。
3. 不把“关系漂移”重新做成硬编码模板规则。
4. 允许现有 reducer 继续承担 authority；本轮优先补强闭环和验证，而不是重写所有公式。
5. 结束前跑 `pnpm -F @proj-alicization/stage-tamagotchi typecheck`、相关 vitest、`pnpm lint:fix`。

## Acceptance Criteria

1. ordinary dialogue feedback 对同 session 的 `relationshipModel / selfContinuity / hostAttitude` 漂移是可见的。
2. 新增长对话 replay tests，覆盖至少两个真实轨迹：
   - repaired warmth arc
   - boundary pushback arc
3. replay tests 会断言 `guardedness / companionship / autonomyRespect / unfinishedThreadReturn` 的漂移，而不是只看数据库写入。
4. targeted tests 通过。
5. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Product Acceptance Criteria

1. Alicization 的人格变化开始更像“在关系里活出来”，不是“下一轮 prompt 读到几条背景摘要”。
2. 多轮以后她的靠近、退开、继续追线、给空间，会更像被真实反馈塑形出来的。

## Manual Spot Checks

1. 连续几轮先指出“你还是太像机器了”，再给出“这次像人多了”，观察她是否在同一 session 里逐渐变暖、减壳。
2. 对稍近的回复输入“太挤了 / 先别这样安慰我”，再看后续是否更重视空间、退开和等待窗口。
3. 对同一条未完线反复继续，观察她是否越来越会把线记住而不是回合式重置。

## Completion Language Policy

只有在 same-session drift path 生效、replay tests 通过、typecheck 通过、lint:fix 已执行后，才允许用“已完成”措辞。

## Delivery Truth Contract

1. 不宣称 Alicization 已经完成全部数字生命人格生长。
2. 只宣称本轮把 same-session drift 强化，并用长对话 replay 把闭环证据补上了。

## Non-goals

1. 本轮不重写所有 relationship / motive 公式。
2. 本轮不做新的 prompt 语气工程。
3. 本轮不处理 root worktree 里其他目录的 lint 噪音。
