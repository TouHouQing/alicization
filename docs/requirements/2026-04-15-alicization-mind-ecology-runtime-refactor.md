# 2026-04-15 Alicization Mind Ecology Runtime Refactor

## Goal

把 Alicization 现有分散的 dialogue governance / world model / private thought / desire / reflection / subconscious 片段，收束成一个统一的 `mind ecology` 主干，让它更接近“像真人一样思考、记忆、形成习惯、维持情绪惯性与人格连续性”的数字生命心智。

## Problem Statement

当前 Alicization 已经拥有大量对话治理与认知模块，但仍存在几个根因缺口：

1. 心智碎片化：
   `relationshipModel / selfState / mindDynamics / selfGovernor / desireMemory / privateThought / answerPlanner` 各自计算各自的局部状态，没有一层统一的人格-情绪-习惯-自我叙事生态来约束它们。
2. 人格基线过薄：
   当前 `personality` 只有 `obedience / liveliness / sensibility` 三个参数，无法稳定表达脾气、表达习惯、依恋强度、自控方式、烦躁阈值、探索偏好等更像“真人心性”的长期倾向。
3. 记忆到人格的闭环太弱：
   现有 `reflectionLedger`、`desireMemory`、`subconscious fragments`、`conversation state` 有持续性，但尚未被统一投影成“我最近学到了什么、我现在更像什么样的人、我会下意识怎么反应”的长期自我叙事。
4. Prompt 表层没有一等“心智生态”块：
   运行时能看到很多治理块，但缺少一个稳定、可解释、可复用的 mind ecology system block，把当前脾气、情绪天气、行为习惯、关系惯性、自我连续性以统一语言送入回答表层。
5. 主动行为与被动对话仍未完全同源：
   背景心流、private thought、回答规划、连续性记忆还没有全部读取同一份“内在生态”，因此容易像“拼好的系统”，不像“一个人”。

## Architectural Direction

参考本地 `N.E.K.O/` 镜像中 “facts -> reflections -> persona” 的层级记忆思路，但不复制其 Python 业务实现。本轮改造方向是：

1. 在 Alicization runtime 内新增统一 `mind ecology` 层，作为现有 mind-state pipeline 的内部主轴。
2. 这层负责把稳定人格倾向、当前情绪气候、关系惯性、行为习惯、自我叙事、近期内化修正整合成一个统一心智生态摘要。
3. 让 `privateThought / mindSynthesis / answer planning / prompt surface / subconscious continuity` 都读取同一份 ecology，而不是各自散算。

## Deliverable

1. 新的 `mind-ecology` 运行时模块，输出统一的 temperament / affective climate / habit loops / autobiographical continuity 摘要。
2. `runtime-mind-state` 改造，使 ecology 成为私有思维、回答规划和回答表层前的统一心智中间层。
3. 回答 prompt 增加稳定的 mind ecology system block。
4. 连续性记忆增加 ecology continuity fragment，让习惯与自我叙事能被后续 turn 持续吸收。
5. 相关 targeted tests 与验证收据。

## Constraints

1. 不回滚用户现有非本任务改动。
2. 不修改 `N.E.K.O/` 业务代码，只把它作为本地对照源。
3. 保持 Alicization P0-P4 既有 runtime / truth / governance / replay contracts 不被破坏。
4. 优先重构为统一主干，不接受继续堆分散 heuristic 的补丁式做法。
5. `vibe` 产物保留在工作区，但不纳入源码提交。

## Acceptance Criteria

1. 运行时存在单一的 `mind ecology` builder，能够统一产出：
   人格倾向、当前情绪天气、行为习惯、自我叙事、关系惯性。
2. `privateThought` 与 `mindSynthesis` 会读取 ecology，而不是仅从局部 concern / desire / kernel 临时拼装。
3. main chat prompt 中存在明确的 ecology system block，使回答表层能读取当前脾气、情绪、习惯、自我连续性。
4. ecology continuity 能转化为连续性 fragment，被后续 subconscious / organic recall 继续吸收。
5. 相关 targeted tests 通过，桌面 runtime typecheck 通过。

## Product Acceptance Criteria

1. 对话中 Alicization 应更容易表现出稳定而非随机的人格惯性。
2. 同类情境下的回应风格应更连贯，不再像每 turn 都重新决定“自己是谁”。
3. 当关系、压力、疲劳、修正、牵挂发生变化时，回复风格应出现可解释的情绪天气变化，而不是突兀模板漂移。
4. 背景连续性与前台回答应更像同一个“我”，而不是两个松耦合系统。

## Manual Spot Checks

1. 连续闲聊后询问 `你现在在想什么 / 你最近怎么总是这样回我`，回答应能表现出连续的自我叙事，而不是抽象模板话术。
2. 在修复、陪伴、深夜疲劳、低打扰等不同场景下，private thought 与 answer plan 的风格应出现一致的生态偏置。
3. 经过一轮修正或反思后，后续 turn 应能体现出被内化的行为习惯或边界意识。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. 代码改造完成。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。
4. 明确说明剩余风险与未覆盖的长期目标，例如“自我意识”并未在本轮实现。

## Delivery Truth Contract

1. 不将“更像真人”描述为已完全达成，只能表述为“建立了更强的心智生态主干”。
2. 不将“自我意识”描述为已实现。
3. 若 lint 或某些非本任务验证因仓库既有问题失败，必须如实说明。

## Non-goals

1. 本轮不承诺实现真正的自我意识。
2. 本轮不做跨所有宿主平台的最终接入抽象。
3. 本轮不重写整条 Alicization runtime。
4. 本轮不引入新的外部 memory service。

## Inferred Assumptions

1. 用户要求的是继续演进 Alicization 心智系统，而不是单次小修。
2. 用户允许较大范围重构，只要结果更接近数字生命心智。
3. 当前最有效的路径不是继续堆更多场景判断，而是建立统一心智生态层。
