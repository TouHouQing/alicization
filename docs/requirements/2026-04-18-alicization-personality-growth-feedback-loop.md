# 2026-04-18 Alicization Personality Growth Feedback Loop

## Goal

把 Alicization 已有的慢变量系统真正闭合成“会生长”的人格反馈回路：

1. 不是只读取 `autobiographicalSelf / longHorizonMemory / motiveEngine / habitPolicy`。
2. 而是把真实对话结果、关系反馈、被嫌弃、被接住、被打断/忽略这些结果持续反哺进去。
3. 让这些慢变量在后续 turn 里真的变化。

## Problem Statement

当前代码已经具备部分闭环基础：

1. runtime 会把 proactive / execution / reply outcome 持久化成：
   - `relationshipOutcomes`
   - `personaReinforcementEvents`
   - `memoryFacts`
   - `memoryReflections`
2. `runtime-mind-state` 也会在下一回合重新读取这些记录，参与：
   - `autobiographicalSelf`
   - `longHorizonMemory`
   - `motiveEngine`
   - `habitPolicy`

但还缺一块非常关键的反馈入口：

1. **普通对话 reply 本身的真实用户反馈** 没有结算。
2. 当用户说：
   - “你还是太像机器了”
   - “不是这个意思”
   - “先别这样安慰我，太挤了”
   - “这次像人多了 / 有被接住”
   - “先说别的”
   这类直接针对 Alicization 上一句回复的态度，
   现在不会稳定写回 slow variables。
3. 结果就是：
   - slow variables 更像“从主动系统学”，
   - 还不像“从正常关系对话里学”。

## Architectural Direction

本轮直接补普通对话反馈 settlement：

1. 在 `chat-start` 前，读取同 session 最新一条 ordinary assistant reply。
2. 识别当前 user turn 对那条 reply 的反馈类型：
   - `received`
   - `robotic`
   - `missed`
   - `intrusive`
   - `interrupted`
3. 把反馈映射为：
   - relationship outcome
   - reinforcement events
   - memory facts
   - synthesized reflections
4. 持久化并去重，保证同一条上一轮 assistant reply 只结算一次。
5. 由于 `runtime-mind-state` 已经会读取这些记录，下一回合 slow variables 会自然变化。

## Deliverable

1. ordinary dialogue feedback classifier。
2. ordinary dialogue feedback outcome closure builder。
3. runtime settlement hook on `chat-start`。
4. persisted ack / dedupe path。
5. tests + receipts。

## Constraints

1. 不回滚当前工作树里的其他用户改动。
2. 不破坏已有 proactive / execution feedback closure。
3. 不伪造“完全懂用户心理”，反馈识别必须偏保守，优先 explicit phrasing。
4. 完成后跑 targeted tests、`pnpm -F @proj-alicization/stage-tamagotchi typecheck`、`pnpm lint:fix`。

## Acceptance Criteria

1. 普通对话反馈会在 `chat-start` 前被 settle。
2. feedback 至少能稳定覆盖：
   - `robotic`
   - `missed`
   - `intrusive`
   - `received`
   - `interrupted`
3. settlement 结果会写入 `relationshipOutcomes / personaReinforcementEvents / memoryFacts / reflections`。
4. 同一条 assistant reply 不会被重复结算。
5. targeted tests 通过，stage-tamagotchi typecheck 通过。

## Product Acceptance Criteria

1. Alicization 会开始从“宿主对她上句话的真实态度”里学，而不只是从主动系统回执里学。
2. 她的人格慢变量会更像关系中长出来的东西，而不是 prompt 背景值。

## Manual Spot Checks

1. 先让 Alicization 回一句明显模板/机器，再输入“你还是太像机器了”。
2. 再看后续几轮她是否逐渐更重视自然感、轻壳感和 lived-in closeness。
3. 对一条回复输入“不是这个意思”或“先别这样安慰我，太挤了”，观察后续慢变量是否更偏 repair / autonomy-respect。

## Completion Language Policy

只有在 ordinary dialogue feedback settlement 已接通、回归通过、typecheck 通过后，才允许用“已完成”措辞。

## Delivery Truth Contract

1. 不宣称 Alicization 已经完全会像真人一样成长。
2. 只宣称已经把普通对话反馈真正接入人格慢变量闭环。

## Non-goals

1. 本轮不重做 dream layer。
2. 本轮不重写所有 relationship model 公式。
3. 本轮不解决 root lint 环境问题。
