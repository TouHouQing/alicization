# Alicization Coding-Agent Tool Loop Implementation Plan

> **2026-08-09 superseded note:** 本计划 Task 1 的自然语言显式通道识别已经撤销。
> 当前权威方案是
> `2026-08-09-alicization-provider-retry-agentic-delegation-implementation-plan.md`：
> 主模型基于完整工具 registry 自主选择 executor，runtime 不解析用户文字来强制通道。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Alicization coding-agent 的通道归属、稳定工具调用身份、实时进度和失败终态结算。

**Architecture:** 主进程 identity registry 是唯一调用身份 owner，renderer 只做幂等投影。
executor 通道由主模型产生的结构化工具调用决定，不再建立自然语言 execution request
envelope。失败任务不再进入 Provider callback 重试，成功 callback 的失败也只产生透明
Provider continuation failure。

**Tech Stack:** Electron main process、Vue/Pinia、TypeScript、Vitest、xsAI、Codex JSONL adapter、SQLite execution ledger。

---

### Task 1: 显式执行通道约束（已撤销）

**Files:**
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/execution-channel-request.ts`
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/execution-channel-request.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`

- [x] 删除显式产品名 regex、execution request envelope 和强制 `toolChoice`。
- [x] 主模型始终看到完整可用 executor registry，能力问句不会由 runtime 自动 dispatch。
- [x] executor owner 只执行模型已经产生的结构化工具调用。
- [x] 运行 session runtime、execution surface 和能力问句 replay 定向测试。

### Task 2: 工具调用身份和 UI 终态幂等

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-tool-call-identity.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-tool-call-identity.test.ts`
- Modify: `packages/stage-ui/src/stores/chat.ts`
- Modify: `packages/stage-ui/src/stores/chat.test.ts`

- [x] 写 RED：streaming-start 带 ID A、call 带 ID B、executor 带 ID C，但工具名和参数唯一时必须得到同一 canonical ID。
- [x] 写 RED：terminal 后迟到 liveness 不得把 execution-status 卡恢复成 running。
- [x] 放宽唯一未结算记录的 alias 合并条件；多个并发候选仍返回新 ID。
- [x] 为 execution-status reducer 增加 terminal 状态集合和迟到事件过滤。
- [x] 运行 identity 与 stage-ui 定向测试。

### Task 3: Codex 活动步骤实时反馈和 watchdog

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/codex.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/codex.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`

- [x] 写 RED：活动 command item 长时间没有新 JSONL 时，adapter 仍发带当前 command 的 liveness snapshot，并且不会触发 idle timeout。
- [x] 增加活动 item heartbeat 事件；只作为 UI liveness，不伪造 semantic progress。
- [x] idle timer callback 在检测到 active work 时重新安排 active-step deadline。
- [x] 保持 active-step 和 total timeout 的透明错误码。
- [x] 运行 Codex adapter 与 execution surface 定向测试。

### Task 4: 后台失败不再伪装 Provider 输出格式异常

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.test.ts`

- [x] 写 RED：failed/blocked/cancelled/timeout delivery 不调用 Provider callback generator，并直接保留 tool-execution failure surface。
- [x] 从 execution event 提取 errorCode/errorMessage 保存到 pending delivery entry。
- [x] 对失败状态首次处理即 mark delivered；不进入三次 Provider settlement retry。
- [x] 对成功状态保留现有 retry，但最终改成 `provider-continuation-incomplete`，不再写 `provider-output-invalid`。
- [x] 运行 delivery 定向测试。

### Task 5: 端到端回放

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

- [x] 加入显式 Codex replay、ID alias replay、Codex liveness replay、tool failure replay 和 callback failure replay。
- [x] 断言每个回放最多一个 terminal settlement。
- [x] 断言失败学习策略全部关闭。
- [x] 运行 replay、main chat stream、delivery 和 renderer 测试。

### Task 6: 全量验证

- [x] 定向执行通道、身份、Codex、主链路、renderer 和 chat 回归：265 项通过。
- [x] `pnpm -F @proj-alicization/stage-ui typecheck`
- [x] `pnpm -F @proj-alicization/stage-tamagotchi typecheck:node`
- [x] `pnpm -F @proj-alicization/stage-tamagotchi build:mac:local`
- [x] 检查 `git diff --check`，不提交 `.serena/project.yml`、缓存、临时 bundle 和旧长期记忆计划。
- [x] 真实 Codex CLI：无工具回合和只读 `command_execution` 回合均完成，工具进度事件和终态可见。
- [x] 本地安装器按最新 `app.asar` 选择候选，并拒绝早于当前 `out/main/index.js` 的旧包。

## 2026-08-09 真实协议复核

本轮在 `codex-cli 0.142.0` 上完成了两组真实对照：

1. 直接运行 `codex exec --json` 的只读命令会发出完整的
   `item.started -> item.completed -> agent_message -> turn.completed`，但继承宿主配置时，
   无关 MCP 的初始化和关闭仍可能各等待约 30 秒。任务终态不能继续依赖进程自然退出。
2. Alicization adapter 使用隔离配置运行同一只读命令，多次复核在 18 至 38 秒内完成并
   拿到 `turn.completed`。adapter 以协议终态结算，再独立回收进程组；进程回收失败不会
   覆盖已经收到的成功终态。

因此当前根修复继续采用 `codex exec --json` 的协议终态作为任务事实，不在本轮切换到
App Server。App Server 保留为后续需要审批请求、用户输入请求、可恢复线程和长期驻留
coding-agent session 时的独立产品化迁移，不与本轮超时修复混做。

### Task 7: Provider continuation 全阶段 watchdog

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`

- [x] 写 RED：tool result 后收到首个 `text-delta`，随后 fullStream 永久挂起，必须在
  continuation idle budget 后返回 `chat-provider-continuation-timeout`。
- [x] 将 continuation 从布尔值改成 `none / awaiting-progress / streaming` 状态机。
- [x] semantic progress 重置 deadline；terminal finish 才清除状态。
- [x] continuation 中再次进入工具执行时暂停 Provider deadline，工具结果返回后重启。
- [x] 运行 stream runner 回归。

### Task 8: 前台 inline 与后台 callback 单一 owner

**Files:**
- Modify: `packages/stage-shared/src/alicization-transport-contracts.ts`
- Modify: `packages/stage-shared/src/alicization-execution-runtime-context.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/task-thread-orchestrator.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`

- [x] 写 RED：同步 Provider-owned dispatch 必须标为 `inline`，background dispatch 必须标为
  `callback`。
- [x] 把 delivery mode 写入 dispatch invocation 和 execution runtime context。
- [x] inline terminal 只写 ledger/mirror/audit，并 durable mark 为 surfaced。
- [x] restore/reconcile 不再把 inline 结果重新加入 callback queue。
- [x] background task 保留 callback delivery。

### Task 9: 根修复回归

- [x] 新增和修改测试 RED 后确认失败原因与真实日志一致。
- [x] continuation、executor runtime、execution delivery、runtime context 共 106 项通过。
- [x] replay、lifecycle、delivery、execution surface、renderer、chat store 共 180 项通过。
- [x] `pnpm -F @proj-alicization/stage-ui typecheck`
- [x] `pnpm -F @proj-alicization/stage-tamagotchi typecheck:node`
- [ ] 重编并安装 macOS App。
- [ ] 用安装包执行真实 Codex 会话，确认一张卡、一次 terminal、一次 continuation、
  零次 execution callback 竞争、零次 `provider-output-invalid`。
