# 2026-04-10 Dialogue Fallback Analysis

## Goal

基于 2026-04-10 的 Alicization 对话日志，定位为什么用户明明在请求执行工具，系统却持续触发兜底/修复式回复；给出可落地的修复方向，并先落一批最小改动，减少误判和假成功。

## Deliverable

- 一份基于真实日志与持久化数据的根因分析。
- 一份执行计划，说明哪些问题已经修，哪些需要后续继续推进。
- 最小代码修复：
  - 显式执行意图识别补齐中文口语触发词。
  - 当 turn 明确要求 executor 工具但模型没有实际调用工具时，运行时不再把自然语言输出当成功回复。

## Constraints

- 必须以 2026-04-10 的真实日志和数据库为依据，不能凭印象推断。
- 不覆盖用户已有脏工作区改动。
- 只做低风险、局部、可验证的修改，不在本轮重构整条执行通路。

## Acceptance Criteria

- 能清楚区分至少三类问题：
  - 网关/模型首事件超时。
  - 显式执行意图未被识别，导致感知与治理把 turn 拉成 screen/task guidance。
  - 明明已经把工具限制到 `executor_run_cli`，但 provider/model 仍直接返回自然语言，且运行时此前没有拦截。
- 给出对应代码落点与修复建议。
- 已实现的最小修复有针对性测试通过。

## Product Acceptance Criteria

- 用户说“用 cli 帮我找一下/查一下/列一下...”时，不应再轻易被判成“我现在看到的是某个窗口”。
- 如果模型没有真正调用被强制要求的 executor tool，这一轮不能再落成看似成功的普通回复。

## Manual Spot Checks

- 复查 2026-04-10 `runtime-debug.log` 的以下 turn：
  - `chat:MH0bmezMplsMql6zYyyQM:1Bw6DODc0mrjBsjEnLo7c:gw1`
  - `chat:MH0bmezMplsMql6zYyyQM:h67CGPqM0_Bi3Sy2BGYHw:gw1`
  - `chat:MH0bmezMplsMql6zYyyQM:mvvahtAL1t4Erq407xe6E:gw1`
  - `chat:MH0bmezMplsMql6zYyyQM:tzrnJsWG2SPb-rpCuCY1o:gw1`
  - `chat:MH0bmezMplsMql6zYyyQM:CxEhbZHFc-NWu1bLUHlPN:gw1`
  - `chat:MH0bmezMplsMql6zYyyQM:GqQb87cDxE9JRmCF_w2UX:gw1`
- 复查 `conversation_turns` 与 `mind_turn_events`：
  - 2026-04-10 `executor_events` 为 0。
  - `takeover-audit` / `governance-normalized` 能解释 reply 被改写成 screen/task fallback 的原因。

## Completion Language Policy

只有在日志证据、代码改动、测试验证三者都完成时，才允许宣称“已完成最小修复”。对尚未完成的执行链改造，必须明确标记为后续建议。

## Delivery Truth Contract

- 只陈述从日志、SQLite、代码里能证实的事实。
- 所有“改进建议”必须区分：
  - 已实现
  - 建议后续实现

## Non-goals

- 本轮不实现“模型无视 toolChoice 时，runtime 直接代替模型构造并执行 CLI 任务”的完整旁路执行链。
- 本轮不改 provider 选型策略，不替换 OpenRouter / Grok provider。
- 本轮不重写 dialogue/perception/governance 总体架构。

## Autonomy Mode

`interactive_governed`，但在缺少额外用户输入时按仓库现状与日志证据直接推进。

## Inferred Assumptions

- 2026-04-10 活跃数据目录为 `~/Library/Application Support/com.tohoqing.alicization/alicizations/`。
- 活跃 card 为 `default`。
- 日志中的“兜底策略”既包括 timeout/error fallback，也包括 governance hard override 生成的 repair/guide surface。
