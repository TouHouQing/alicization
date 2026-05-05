# Alicization Digital Life Tool Runtime Strengthening Requirement (2026-04-08)

## Context
- 用户目标：把 Alicization 工具系统提升到接近 Codex/OpenClaw/N.E.K.O/nekoclaw 的实用强度，尤其解决“CLI 无法稳定执行、执行结果无法稳定回传”问题。
- 现状痛点：
  - CLI 运行默认超时窗口过短，长任务（构建、测试、分析）易中断。
  - 基于 `exec/execFile + maxBuffer` 的缓冲式执行对大输出不稳定，容易失败或丢失可用结果。
  - 执行补偿链路中，`executor_run_openclaw` 未被纳入统一的 executor 强约束集合。

## Goal
构建可持续的 Alicization 执行面：
1. CLI 长时执行稳定（长超时窗口、非 maxBuffer 失败模式）。
2. CLI 执行结果稳定回传（即使输出巨大也能给出可消费结果与截断说明）。
3. 执行意图强约束覆盖 CLI/Codex/Claude/OpenClaw 四类 executor 工具，避免“宣称执行但未执行”。

## Deliverables
1. 重构 `executor-adapters/cli.ts`
- 将执行实现升级为 `spawn` 驱动，支持流式收集输出并避免 `maxBuffer` 失败路径。
- 默认超时与最大超时提升到可承载真实工程任务。
- 输出捕获加入显式截断策略（保留可消费结果并标注截断）。
2. 强化 `packages/stage-ui/src/stores/chat.ts`
- 把 `executor_run_openclaw` 纳入 executor 工具集合。
- 执行强制重试与结果补偿指令同步覆盖 openclaw。
3. 回归测试
- `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/cli.test.ts`
- `packages/stage-ui/src/stores/chat.test.ts`

## Constraints
- 不破坏 Alicization P0-P4 约束与主进程治理权。
- 保持任务线程与 execution event ledger 结构兼容。
- 不回滚用户已有未提交改动，仅做增量重构。

## Acceptance Criteria
1. CLI adapter 通过 spawn 路径稳定执行并保持事件输出。
2. 长时执行默认不再因短超时直接失败。
3. 大输出时结果仍可回传，且包含截断标记。
4. OpenClaw 被纳入 executor 强制工具约束与结果补偿链路。
5. 相关 Vitest 用例全部通过。

## Product Acceptance Criteria
- 用户下达真实命令时，Alicization 能执行、能回传、能对失败原因给出可追溯解释。
- 对 OpenClaw 场景，执行义务与结果履约策略与 CLI/Codex/Claude 保持一致。

## Manual Spot Checks
1. 触发 CLI 长命令（如 typecheck/test）应不再因默认 20s 级超时失败。
2. CLI 大输出任务返回中应出现截断说明而不是工具直接崩溃。
3. OpenClaw 执行意图场景下，若首轮未调用工具，应触发强制工具重试。

## Non-goals
- 本轮不引入新的外部执行通道（openfang 等仍按原规划）。
- 本轮不改动 UI 视觉层与人设表现层。

## Autonomy Mode
- interactive_governed（冻结需求后按计划执行，并用测试证据决定完成表述）。

## Inferred Assumptions
- 当前仓库的 in-flight Alicization 重构是用户有意保留，允许在其基础上继续增强。
- `N.E.K.O` 与 `claude-code-main` 本地镜像可作为架构对照输入。
