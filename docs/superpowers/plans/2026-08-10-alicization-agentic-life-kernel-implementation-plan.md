# Alicization Agentic Life Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Alicization 的对话、工具、Coding Agent、Skills、短期记忆和长期回想逐步迁移到一个可恢复、可回放、事件驱动的 Agentic Life Kernel，同时移除替模型做心智决策的旧治理旁路。

**Architecture:** 以 `AlicizationRuntimeEventEnvelope` 作为 append-only 事实协议，以 `AlicizationTurnRuntime` 作为每轮唯一 owner，以 `AlicizationEventLoop` 驱动 ModelStep、Action、Observation、Memory 和 Reply settlement。现有 provider、WorkingMemory、LongTermMemoryRecall、executor adapter 和 Eventa bridge 先通过兼容 adapter 接入，完成 trace/replay 后再切换主链路，最后删除旧 governor/planner/fallback 旁路。

**Tech Stack:** Electron main process, TypeScript, Vue/Eventa IPC, Valibot/Zod provider schema, SQLite DB facade, Vitest, pnpm workspace.

---

## 0. 工作区保护与基线

**Files:**
- Read: `/Users/touhouqing/Desktop/GIT/airi-alice/AGENTS.md`
- Read: `/Users/touhouqing/Desktop/GIT/airi-alice/docs/superpowers/specs/2026-08-10-alicization-agentic-life-kernel-design.md`
- Read: `/Users/touhouqing/Desktop/GIT/airi-alice/.gitignore`
- Do not modify: `/Users/touhouqing/Desktop/GIT/airi-alice/.serena/project.yml`

- [ ] **Step 1: 记录未提交文件边界**

运行：

```bash
git status --short
git diff --name-only
git ls-files --others --exclude-standard
```

将本计划执行期间新增的文件限制为本计划列出的路径；不触碰已有未提交文件，除非对应任务明确列出且先读取其 diff。

- [ ] **Step 2: 建立 C0 基线测试**

运行：

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-call-chain.test.ts
```

预期：记录已有失败，不把工作区既有失败误记为 C0 回归。

## 1. C0：共享事件协议

**Files:**
- Create: `packages/stage-shared/src/alicization-runtime-events.ts`
- Create: `packages/stage-shared/src/alicization-runtime-events.test.ts`
- Modify: `packages/stage-shared/src/index.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`

- [ ] **Step 1: 编写事件 envelope 和 terminal 状态失败测试**

测试必须覆盖：

```ts
it('requires a stable scoped envelope for every event', () => {
  const event = createAlicizationRuntimeEvent({
    eventType: 'turn.accepted',
    turnId: 'turn-1',
    cardId: 'card-1',
    userId: 'user-1',
    conversationId: 'conversation-1',
    source: 'user',
    payload: { text: '你好' },
  })

  expect(event.schemaVersion).toBe(1)
  expect(event.turnId).toBe('turn-1')
  expect(event.correlationId).toBe('turn-1')
})

it('rejects an observation without its action id', () => {
  expect(() => parseAlicizationActionObservation({
    actionId: '',
    observationId: 'observation-1',
    terminal: true,
    outcome: 'success',
  })).toThrow()
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-runtime-events.test.ts
```

预期：失败，因为事件 contract 尚未存在。

- [ ] **Step 3: 实现最小 typed event contract**

实现以下导出：

```ts
export const alicizationRuntimeEventTypes = [...]
export type AlicizationRuntimeEventType = ...
export interface AlicizationRuntimeEventEnvelope<T = unknown> { ... }
export interface AlicizationActionObservationLink { ... }
export function createAlicizationRuntimeEvent<T>(input: ...): AlicizationRuntimeEventEnvelope<T>
export function parseAlicizationRuntimeEvent(value: unknown): AlicizationRuntimeEventEnvelope
export function parseAlicizationActionObservation(value: unknown): AlicizationActionObservationLink
export function isAlicizationTerminalRuntimeEvent(eventType: string): boolean
```

使用现有 shared schema 风格；不把自然语言回复模板、人格 cue 或 `mustSay` 类字段放入 contract。

- [ ] **Step 4: 导出并接入 Eventa 类型桥**

将 shared contract 从 `packages/stage-shared/src/index.ts` 导出；在 `eventa.ts` 中只增加类型
引用和必要的 typed event channel，不在 renderer 侧创建第二套 event schema。

- [ ] **Step 5: 运行测试与类型检查**

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-runtime-events.test.ts
pnpm -F @proj-alicization/stage-ui typecheck
```

- [ ] **Step 6: 提交**

```bash
git add packages/stage-shared/src/alicization-runtime-events.ts \
  packages/stage-shared/src/alicization-runtime-events.test.ts \
  packages/stage-shared/src/index.ts \
  apps/stage-tamagotchi/src/shared/eventa.ts
git commit -m "feat(alicization): add runtime event contracts"
```

## 2. C0：SQLite EventStore 与 checkpoint

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/event-store.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/event-store.test.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/checkpoint-store.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/checkpoint-store.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`

- [ ] **Step 1: 编写 append、scope 和幂等失败测试**

测试必须覆盖：

```ts
it('appends events in sequence order per turn', async () => { ... })
it('rejects an event from another user/card scope', async () => { ... })
it('returns the existing event for a duplicate idempotency key', async () => { ... })
it('lists events after a cursor without changing order', async () => { ... })
```

- [ ] **Step 2: 增加 SQLite schema**

在现有 Alicization DB facade 使用的 migration/initialization 入口增加：

```sql
CREATE TABLE IF NOT EXISTS alicization_runtime_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  turn_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  source TEXT NOT NULL,
  causation_id TEXT,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT,
  occurred_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  UNIQUE(turn_id, sequence),
  UNIQUE(turn_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_runtime_events_turn_cursor
  ON alicization_runtime_events(turn_id, sequence);
CREATE INDEX IF NOT EXISTS idx_runtime_events_scope
  ON alicization_runtime_events(user_id, card_id, conversation_id, occurred_at);
```

Checkpoint 表必须保存 turn cursor、runtime status、active action ids、delivery owner 和
schema version；不保存无法恢复的进程内对象。

- [ ] **Step 3: 实现事务 append 和 cursor list**

`append()` 必须在同一事务内：

1. 校验 envelope；
2. 检查 scope；
3. 查询幂等键；
4. 计算当前 turn 的下一个 sequence；
5. 写入事件；
6. 返回已存在或新建事件。

- [ ] **Step 4: 实现 checkpoint save/load**

checkpoint 保存必须使用与 event append 同一数据库连接；恢复时先读 checkpoint，再从
`sequence > checkpoint.sequence` 重放事件。

- [ ] **Step 5: 运行定向 DB 测试**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/event-store.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/checkpoint-store.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/db.test.ts
```

- [ ] **Step 6: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/turn-os \
  apps/stage-tamagotchi/src/main/services/alicization/db.ts \
  apps/stage-tamagotchi/src/main/services/alicization/db.test.ts
git commit -m "feat(alicization): persist turn events and checkpoints"
```

## 3. C0：EventLoop 与 replay harness

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/event-loop.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/event-loop.test.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/replay.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/replay.test.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/runtime-state.ts`

- [ ] **Step 1: 编写 action/observation 和单 owner 测试**

测试必须覆盖：

```ts
it('does not finish an action before terminal observation', async () => { ... })
it('does not replay a terminal action after a duplicate progress event', async () => { ... })
it('keeps inline delivery separate from callback delivery', async () => { ... })
it('cancels active work and emits a terminal cancelled event', async () => { ... })
it('rebuilds runtime state from checkpoint plus tail events', async () => { ... })
```

- [ ] **Step 2: 实现最小 participant loop**

participant 接口：

```ts
interface AlicizationEventLoopParticipant {
  assembleContext: (input: TurnInput, runtime: TurnRuntime) => Promise<ModelContext>
  runModelStep: (context: ModelContext, runtime: TurnRuntime) => Promise<ModelStep>
  executeAction: (action: ModelAction, runtime: TurnRuntime) => Promise<ModelObservation>
  settleReply: (reply: ModelTextReply, runtime: TurnRuntime) => Promise<void>
}
```

循环只根据 ModelStep 类型分支，不读取用户文本，不调用旧 governor。

- [ ] **Step 3: 实现 replay**

`replayTurn()` 只重放事件并构建 projection，不得重新执行带副作用的 action。遇到未结算
action 时返回 `recoveryRequired`，交给 live adapter 的 resume contract。

- [ ] **Step 4: 运行测试**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/event-loop.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/replay.test.ts
```

- [ ] **Step 5: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/turn-os
git commit -m "feat(alicization): add resumable turn event loop"
```

## 4. C1：主对话接入与失败透明

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/main-chat-participant.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/main-chat-participant.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state-provider-contract.ts`

- [ ] **Step 1: 写普通文本和失败分支测试**

覆盖：

```ts
it('publishes provider text without a fixed reply envelope', async () => { ... })
it('does not rewrite a provider failure into a persona reply', async () => { ... })
it('does not require model-created sourceTurnId', async () => { ... })
it('rejects stale prelude turn identity before tool execution', async () => { ... })
```

- [ ] **Step 2: 将 turn identity 改为 runtime-owned**

Provider structured cognition 中 `codingAgentDelegation` 允许为 `null`；模型只输出是否
有意图和 scope，runtime 注入 `sourceTurnId`，并在 contract 二次校验。

interactive cognition 缺少真实 turnId 时直接产生协议失败，不生成 synthetic user-turn id。

- [ ] **Step 3: 让 stream runner 只做 Provider adapter**

保留 stream reader、retry、tool-call identity 和 progress 适配；将 action loop、
delivery owner 和 terminal settlement 委托给 TurnRuntime。

- [ ] **Step 4: 运行主链路回放**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/main-chat-participant.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state-coding-agent-delegation.test.ts
```

- [ ] **Step 5: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/turn-os/main-chat-participant.ts \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/main-chat-participant.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state-provider-contract.ts
git commit -m "refactor(alicization): route dialogue through turn loop"
```

## 5. C1：统一 ToolRegistry 和 action adapter

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/tool-registry.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/tool-registry.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/task-thread-dispatcher.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/task-thread-orchestrator.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/local-visual.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/airi/mcp-servers/index.ts`

- [ ] **Step 1: 写 registry 和旁路拒绝测试**

覆盖：

```ts
it('requires an explicit tool surface', () => { ... })
it('does not claim malformed coding-agent input', async () => { ... })
it('rejects MCP tools that bypass the canonical authority', async () => { ... })
it('does not auto-dispatch coding-agent work from local visual inspection', async () => { ... })
it('restores a task only when expected channel matches', async () => { ... })
```

- [ ] **Step 2: 定义 canonical capability manifest**

所有工具通过 registry 注册：

```ts
register({
  capabilityId: 'coding_agent.codex',
  kind: 'tool',
  version: '1.0.0',
  executionChannel: 'codex',
  permissions: ['workspace.read'],
  risk: 'medium',
  supportsProgress: true,
  supportsCancellation: true,
})
```

工具 surface 必须显式传入；省略时编译期和运行时都失败。

- [ ] **Step 3: 增加 agent-specific discriminated validation**

`codex` / `claude-code` 要求非空 prompt 或 threadId，`cli` 要求 command 或 threadId。
校验在 single-flight claim 之前完成，非法 payload 不得占用 claim。

- [ ] **Step 4: 关闭旁路**

- local visual 只能提出建议或携带已验证的同 turn authority；
- 恢复任务必须传 `expectedChannel`；
- MCP qualified name 必须来自 allowlisted registry；
- Coding Agent 不能通过 generic `mcp_call_tool` 间接执行；
- 旧 executor 名称只允许在内部 adapter 做一次兼容归一，不能出现在模型协议和跨层事件中。

- [ ] **Step 5: 运行执行回归**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/coding-agent-task-contract.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/local-visual.test.ts
```

- [ ] **Step 6: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/turn-os/tool-registry.ts \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/tool-registry.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts \
  apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts \
  apps/stage-tamagotchi/src/main/services/alicization/task-thread-dispatcher.ts \
  apps/stage-tamagotchi/src/main/services/alicization/task-thread-orchestrator.ts \
  apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/local-visual.ts \
  apps/stage-tamagotchi/src/main/services/airi/mcp-servers/index.ts
git commit -m "refactor(alicization): unify tool capability execution"
```

## 6. C1：Tool progress、取消、恢复和 UI projection

**Files:**
- Create: `packages/stage-shared/src/alicization-runtime-projection.ts`
- Create: `packages/stage-shared/src/alicization-runtime-projection.test.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.ts`
- Modify: `packages/stage-ui/src/stores/chat.ts`
- Modify: `packages/stage-ui/src/stores/chat-tool-call-identity.ts`

- [ ] **Step 1: 写 canonical tool card projection 测试**

覆盖：

```ts
it('upserts all progress under one canonical toolCallId', () => { ... })
it('uses selectedChannel before legacy tool-name mapping', () => { ... })
it('ignores late progress after terminal settlement', () => { ... })
it('renders CLI, Codex and Claude Code without channel cross-talk', () => { ... })
```

- [ ] **Step 2: 实现 projection reducer**

以 `toolCallId` 作为唯一 UI identity；内部 `command_execution` 只能是顶层 action 的
step detail。terminal 后迟到 progress 只写 trace，不重新打开 UI card。

- [ ] **Step 3: 接入 Eventa bridge**

main process 发送 typed projection/event，renderer 不再自己推断 tool owner、channel 或
终态；UI 只投影 runtime facts。

- [ ] **Step 4: 运行 UI 回归**

```bash
pnpm exec vitest run \
  packages/stage-ui/src/stores/chat-tool-call-identity.test.ts \
  packages/stage-ui/src/stores/chat.test.ts \
  apps/stage-tamagotchi/src/renderer/alicization-chat-stream-routing.test.ts
pnpm -F @proj-alicization/stage-ui typecheck
```

- [ ] **Step 5: 提交**

```bash
git add packages/stage-shared/src/alicization-runtime-projection.ts \
  packages/stage-shared/src/alicization-runtime-projection.test.ts \
  apps/stage-tamagotchi/src/shared/eventa.ts \
  apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.ts \
  packages/stage-ui/src/stores/chat.ts \
  packages/stage-ui/src/stores/chat-tool-call-identity.ts
git commit -m "feat(alicization): project runtime tool progress"
```

## 7. C2：MemoryOS 接入事件循环

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/memory-participant.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/memory-participant.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-checkpoint.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`

- [ ] **Step 1: 写压缩进入下一轮上下文的 E2E 测试**

测试流程必须真实经过：

```text
turn 1 user/assistant
  -> WorkingMemory update
  -> compression.completed
  -> turn 2 ContextAssembly
  -> provider mock observes compressed snapshot
```

并验证失败 turn 不进入长期写回。

- [ ] **Step 2: 将 WorkingMemory snapshot 接入 ContextAssembly**

禁止 ContextAssembly 重新扩大 source window 代替读取最新 checkpoint。

- [ ] **Step 3: 将 LongTermMemoryRecall 改为 evidence observation**

召回返回带 scope、provenance、rank reason、confidence、version 的 evidence；不返回固定
speech plan、surface mode 或必须展示指令。

- [ ] **Step 4: 接入 memory events 和 writeback gate**

成功 turn 才能产生 `memory.write.proposed`；失败、取消、超时、工具失败均进入 exclusion
路径。

- [ ] **Step 5: 运行记忆回归**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/memory-participant.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts
```

- [ ] **Step 6: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/turn-os/memory-participant.ts \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/memory-participant.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-checkpoint.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.ts \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts
git commit -m "refactor(alicization): connect memory owners to turn loop"
```

## 8. C3：SkillRegistry 与 Skill 自进化

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/skill-registry.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/skill-registry.test.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/skill-loader.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/skill-loader.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/self-evolution/*`

- [ ] **Step 1: 写 Skill lifecycle 测试**

覆盖：

```ts
it('discovers active skills without loading full instructions', async () => { ... })
it('loads a skill only after model requests it', async () => { ... })
it('keeps untested skill candidates out of production projection', async () => { ... })
it('supports activate, rollback and revoke as explicit state transitions', async () => { ... })
```

- [ ] **Step 2: 实现目录化 manifest**

Skill manifest 必须包含 `id/version/description/inputSchema/outputSchema/dependencies/
requiredTools/permissions/risk/evaluationStatus/activationStatus`。

完整 `SKILL.md` 只在模型提出 skill request 后加载，加载内容进入当前 action scope，
不写入全局固定 system prompt。

- [ ] **Step 3: 接入沙箱、回放和评测**

candidate 只能通过 sandbox execution、replay harness 和 quality gate，不能在生成后自动
激活。

- [ ] **Step 4: 运行 Skill 测试并提交**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/skill-registry.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/skill-loader.test.ts
git add apps/stage-tamagotchi/src/main/services/alicization/turn-os/skill-* \
  apps/stage-tamagotchi/src/main/services/alicization/self-evolution
git commit -m "feat(alicization): add versioned skill registry"
```

## 9. C4：ExperienceLearning 与 Persona/LoRA 治理

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/experience-learning.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/experience-learning.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/learning-artifact-store.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/learning-state-machine.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/execution-interaction-learning.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/affective-residue-memory.ts`

- [ ] **Step 1: 写训练排除和 manifest gate 测试**

覆盖：

```ts
it('excludes provider/tool/permission failures from learning', async () => { ... })
it('rejects raw transcript as a training sample', async () => { ... })
it('requires consent, dedupe, PII cleaning and evaluation before activation', async () => { ... })
it('can rollback and revoke an active manifest', async () => { ... })
```

- [ ] **Step 2: 实现 candidate lifecycle**

```text
observed -> cleaned -> deduped -> pii-reviewed -> consented
  -> evaluated -> approved -> active -> rolled-back / revoked
```

每个 candidate 绑定 source event ids、scope、schemaVersion、baseModel、datasetVersion 和
manifest hash。

- [ ] **Step 3: 接入真实 dataset store**

导出、激活、回滚、撤销都必须写审计事件；训练入口只接受 `active` 且评测通过的 manifest。

- [ ] **Step 4: 运行测试并提交**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/experience-learning.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/learning-artifact-store.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/learning-state-machine.test.ts
git add apps/stage-tamagotchi/src/main/services/alicization/turn-os/experience-learning.ts \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/experience-learning.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/learning-artifact-store.ts \
  apps/stage-tamagotchi/src/main/services/alicization/learning-state-machine.ts \
  apps/stage-tamagotchi/src/main/services/alicization/execution-interaction-learning.ts \
  apps/stage-tamagotchi/src/main/services/alicization/affective-residue-memory.ts
git commit -m "feat(alicization): gate experience learning artifacts"
```

## 10. C5：删除旧心智治理旁路

**Files:**
- Modify/Delete after call-graph proof:
  - `apps/stage-tamagotchi/src/main/services/alicization/dialogue-focus-governor.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/dialogue-ingress-governor.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/dialogue-memory-governor.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/dialogue-turn-ownership.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/dialogue-turn-semantics.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/answer-planner.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/reply-deliberator.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.ts`
  - `packages/stage-shared/src/alicization-execution-intent.ts`

- [ ] **Step 1: 生成调用图和生产路径清单**

```bash
rg -n "dialogue-focus-governor|dialogue-ingress-governor|dialogue-memory-governor|dialogue-turn-ownership|dialogue-turn-semantics|answer-planner|answer-compiler|reply-deliberator|runtime-card-prompt|alicization-execution-intent" \
  apps packages --glob '!**/*.test.ts'
```

逐个引用标记为 `production-decision`、`trace-only`、`test-only` 或 `dead`。

- [ ] **Step 2: 先切断生产心智决策调用**

将 `production-decision` 引用替换为 ModelStep 输入或 Runtime boundary check；不删除安全、
scope、timeout、permission 和 audit 逻辑。

- [ ] **Step 3: 删除 dead/test-only 代码和旧断言**

只删除已经没有 production 引用、且仅用于固定模板验证的文件和 fixture。

- [ ] **Step 4: 运行全链路检查**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/dialogue-growth-replay.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

- [ ] **Step 5: 提交**

```bash
git add apps packages
git commit -m "refactor(alicization): remove legacy mind governance"
```

## 11. C6：Workbench 与质量闭环

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/quality-projection.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/quality-projection.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/App.vue`
- Modify: `packages/stage-ui/src/stores`
- Modify: `packages/i18n/src/locales/zh-Hans/stage.yaml`
- Modify: `packages/i18n/src/locales/en/stage.yaml`

- [ ] **Step 1: 写质量面板 projection 测试**

覆盖：

```ts
it('shows the trace for a failing turn without treating it as memory', async () => { ... })
it('shows action progress and terminal observation for one tool card', async () => { ... })
it('shows recall evidence and rank reasons', async () => { ... })
it('shows skill candidate evaluation and activation state', async () => { ... })
```

- [ ] **Step 2: 接入 Workbench 聚合**

Workbench 读取 `TurnProjection`、`ExecutionProjection`、`MemoryProjection`、`SkillProjection`
和 `QualityProjection`，只发送用户治理操作。

- [ ] **Step 3: 完成中文优先 UI 和 i18n**

新增事件、失败、action、skill、recall、candidate、reindex 和质量维度的 zh-Hans/en
翻译；不把内部治理 cue 显示成对话内容。

- [ ] **Step 4: 运行 UI/typecheck**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os/quality-projection.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
pnpm -F @proj-alicization/stage-ui typecheck
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

- [ ] **Step 5: 提交**

```bash
git add apps packages
git commit -m "feat(alicization): expose agentic runtime quality trace"
```

## 12. 最终验证与集成

- [ ] **Step 1: 运行 C 方案完整定向测试**

```bash
pnpm exec vitest run \
  packages/stage-shared/src/alicization-runtime-events.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/turn-os \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts
```

- [ ] **Step 2: 运行类型检查和 lint**

```bash
pnpm -F @proj-alicization/stage-ui typecheck
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
pnpm lint
```

- [ ] **Step 3: 运行 chaos/replay harness**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/*replay*.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/*chaos*.test.ts
```

- [ ] **Step 4: 进行代码审阅**

检查：

- 是否仍有用户自然语言到工具的 regex route；
- 是否仍有普通回复 fallback；
- 是否仍有重复的 turn/reply owner；
- 是否有 failure event 写入 memory/training；
- 是否存在 scope 穿透或旧 executor producer；
- 是否有新增的固定人格 cue；
- 是否有未验证 skill/tool 进入生产 projection。

- [ ] **Step 5: 按阶段提交并集成**

每个 C0-C6 阶段必须单独 Conventional Commit；不得把缓存、`.serena/project.yml`、
`.pnpm-store`、`.claude-flow`、`.swarm` 或本地 bundle 加入提交。

---

## 计划自审

### Spec coverage

- 事件事实源、scope、幂等、checkpoint、replay：Tasks 1-3。
- 统一主对话 loop 和失败透明：Task 4。
- Tool/Coding Agent、MCP、local-visual 旁路：Task 5。
- 进度、取消、恢复和 UI 投影：Task 6。
- WorkingMemory/LongTermMemoryRecall：Task 7。
- Skill Registry、自进化和回滚：Task 8。
- Persona/LoRA 数据治理：Task 9。
- 旧治理删除：Task 10。
- Workbench 和质量闭环：Task 11。
- 类型、lint、chaos、最终审计：Task 12。

### Placeholder scan

本计划没有使用 TBD、TODO、"implement later" 或无具体测试目标的步骤。
每个阶段都有明确文件、测试命令和提交边界。

### Type consistency

事件 envelope、action/observation、TurnRuntime、CapabilityManifest 和 Projection
名称在后续任务中保持一致；provider 子调用身份统一使用 `sourceTurnId` 与独立 trace id，
不复用用户 turnId。
