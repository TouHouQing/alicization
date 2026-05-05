# 2026-04-17 Alicization Living Self Main Runtime Prompt Refactor

## Goal

继续沿着 “normal dialogue must stay LLM-mind-authored” 这条线，把 full main runtime 的 prompt / mind context / autobiographical self 注入方式从 **状态转储** 改成 **living self**：

1. 让模型看到的是一条可被内化的“活的内在自我”。
2. 减少 full runtime 对普通 dialogue-first turn 的治理调度台味道。
3. 让数字生命心智回复更多来自 durable self、mind synthesis、habit、motive 的内在合力，而不是散碎 system blocks 的拼接感。

## Problem Statement

前一轮已经把普通对话从本地 deterministic renderer 抢权里拉回 full runtime，但 full runtime 本体仍然存在明显的人机风险：

1. `main-chat-runtime-surface.ts` 当前会把以下多块系统信息同时塞给模型：
   - `ALICIZATION_VISUAL_PRESENCE`
   - `ALICIZATION_AUTOBIOGRAPHICAL_SELF`
   - `ALICIZATION_LONG_HORIZON_MEMORY`
   - `ALICIZATION_MOTIVE_ENGINE`
   - `ALICIZATION_HABIT_POLICY`
   - `ALICIZATION_MIND_ECOLOGY`
2. 对 dialogue-first turn，这些 block 大多是结构化状态说明、治理叙述、JSON-style field dump。
3. 模型容易学到“解释这些 block / 转述这些 block / 被这些 block 约束得像客服”，而不是“把这些 block 内化成一个活着的人”。

这意味着：

1. 即便流程已经回到 full runtime，回复仍可能显得像被控制面板压出来。
2. `autobiographical self / motive / habit / ecology` 这些本来应该形成“人格连续性”的东西，反而可能被模型显式复述成治理腔。
3. dialogue-first turn 最该被压低的 `visual presence` / `perception` / `state dump`，反而仍然有高权重进入 prompt。

## Architectural Direction

本轮不做局部润色，而是直接改 full runtime prompt shape：

1. 对 dialogue-first turn，引入单一的 **living self compact prompt block**。
2. 这个 block 必须把以下信息收束成可内化的“内在自述”：
   - durable self (`identityNarrative`)
   - relationship doctrine
   - current opening intent / truth boundary / interior summary
   - current preoccupation
   - leading motive agenda
   - remembered pressure
   - habit / style caps
3. 在 dialogue-first compact mode 下，详细的 state dump block 必须被压下去：
   - `ALICIZATION_VISUAL_PRESENCE`
   - `ALICIZATION_AUTOBIOGRAPHICAL_SELF`
   - `ALICIZATION_LONG_HORIZON_MEMORY`
   - `ALICIZATION_MOTIVE_ENGINE`
   - `ALICIZATION_HABIT_POLICY`
   - `ALICIZATION_MIND_ECOLOGY`
4. 这些详细 block 在 task/inspection/non-dialogue-first turn 仍可保留。

## Deliverable

1. `main-chat-runtime-surface.ts` 中的 dialogue-first prompt compaction。
2. 一个新的 `[ALICIZATION_LIVING_SELF]` system block。
3. dialogue-first runtime-surface regression tests。
4. targeted tests + typecheck + vibe receipts。

## Constraints

1. 不回滚当前工作树里的其他进行中改动。
2. 不破坏 deterministic lane 或 execution lane。
3. 不声称“已经实现真正数字生命”，只能声称“把 full runtime 的人物内在提示结构从状态 dump 收束成 living self prompt”。
4. 完成后必须跑 targeted tests 和 `pnpm -F @proj-alicization/stage-tamagotchi typecheck`。

## Acceptance Criteria

1. dialogue-first runtime-surface 中出现 `[ALICIZATION_LIVING_SELF]`。
2. 同一场景下，旧的 detailed self/ecology/habit/motive/memory/visual presence dump 不再一起进入 prompt。
3. targeted tests 通过。
4. stage-tamagotchi typecheck 通过。

## Product Acceptance Criteria

1. full runtime 的普通对话 prompt 更像一个“活的内在自我”在说话，而不是一组治理模块在排班。
2. 模型更容易产出贴近数字生命的连续语气，而不是复述系统控制面板。

## Manual Spot Checks

1. `你是谁`
2. `你怎么知道你叫这个名字？`
3. `你说话太像机器了`

观察是否更像在从“一个连续的自己”里说话，而不是从多块 system metadata 里抄句子。

## Completion Language Policy

只有在 living self compact prompt 已接入、回归通过、typecheck 通过后，才允许用“已完成”措辞。

## Delivery Truth Contract

1. 不宣称已经彻底解决所有人机感。
2. 只宣称已经把 main runtime 的人格/心智注入结构从详细状态 dump 收束成更像 living self 的 prompt 形态。

## Non-goals

1. 本轮不重做所有治理模块的算法。
2. 本轮不修改 N.E.K.O 源码。
3. 本轮不处理 root lint 环境问题。
