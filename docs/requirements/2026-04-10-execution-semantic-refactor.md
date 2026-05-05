# 2026-04-10 Execution Semantic Refactor

## Goal

把 Alicization 的“执行意图识别 + 通道路由”从固定触发词正则重构为语义证据评估模型，避免“找一下/查一下/看看”这类词表驱动导致的僵硬和漏判。

## Deliverable

- 统一语义评估层（stage-shared）：
  - 不再以动作词白名单作为硬门槛。
  - 用结构化证据（channel mention、command structure、request frame、question frame、artifact hints）进行打分与路由。
- 路由消费层重构：
  - `task-routing-assessor` 与 `claw-fabric` 改为复用统一语义评估，不再维护独立触发词表。
  - `main-chat-action-obligation` 改为语义证据驱动，不再依赖本地动作词 cue。
- 配套测试更新：
  - 覆盖“自然表达执行请求可路由”“能力问句不误路由”“命令/结构化证据优先”等关键场景。

## Constraints

- 允许修改任意相关文件，但必须保持现有对外类型契约可兼容。
- 不引入破坏性回退逻辑，不回滚用户已有脏工作区改动。
- 不依赖新增在线服务；语义评估必须本地可执行、可测试。

## Acceptance Criteria

- `detectAlicizationExecutionRoutingIntent` 不再依赖固定动作词触发。
- 以下场景必须可用：
  - `用cli帮我找一下桌面有什么文件` => 显式执行路由到 `executor_run_cli`。
  - `请用 Claude Code 接着改 runtime call chain` => 显式执行路由到 `executor_run_claude_code`。
  - `你能用 codex 吗？` => 能力问句，不触发执行路由。
  - 只有命令字面量但无请求语义时，不强制执行。
- `task-routing-assessor` 和 `claw-fabric` 的语义推断与 stage-shared 对齐，减少分叉词表。
- 相关测试通过并完成 typecheck。

## Product Acceptance Criteria

- 对话应更像“数字生命协作”而非“关键词开关”：
  - 用户自然表达执行意图时，能稳定进入工具执行链。
  - 能力问答、普通陈述与执行请求边界更清晰。
  - 避免再次出现“明明要求执行却落成屏幕叙述”的僵化响应。

## Manual Spot Checks

- 本地回放/模拟：
  - CLI 明确请求（口语表达）是否能稳定进入 `explicit-routing`。
  - 能力问句是否只回答能力，不触发 executor routing。
  - 编码任务连续对话（`continue-thread`）是否优先走 `codex/claude-code`。

## Completion Language Policy

仅在以下条件满足时可宣称“完成本轮重构”：
- 核心识别逻辑已从固定动作词门槛迁移到语义证据模型。
- 路由消费链（assessor/fabric/action-obligation）已同步。
- 关键测试与 typecheck 通过，并如实说明 lint 状态。

## Delivery Truth Contract

- 区分“已实现”与“后续建议”。
- 对所有行为变化给出代码证据与测试证据。

## Non-goals

- 本轮不重写 provider/model 层。
- 本轮不做新的外部 LLM 分类服务接入。
- 本轮不处理无关 UI 风格或其他功能域改动。

## Autonomy Mode

`interactive_governed`（在需求已明确前提下直接执行重构）。

## Inferred Assumptions

- 当前执行链核心在：
  - `packages/stage-shared/src/alicization-execution-intent.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/claw-fabric.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.ts`
- `N.E.K.O` 与 `claude-code-main` 的可迁移点是“能力/渠道评估与执行分离、证据聚合后决策”，不是复制其业务实现。
