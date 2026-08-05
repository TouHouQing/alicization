# Alicization 主模型工具意图实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **状态（2026-08-05）：** Tasks 1-8 已实施并通过最终审查与全链路验证；等待分步提交和推送。

**Goal:** 删除生产对话链路中基于自然语言正则的工具意图、路由强制和固定回复拦截，让同一个主模型在 IdentityCore、WorkingMemory、LongTermMemoryRecall、能力事实和真实工具 schema 上下文中自主决定回答、澄清或调用工具。

**Architecture:** renderer 只传输普通消息、结构化 UI 动作和 provider 配置；main runtime 只根据 provider capability 决定是否提供工具，并使用自动工具选择。工具 owner 继续负责 schema、card/user/session/turn scope、风险、确认、预算、取消、审计和透明失败；工具结果回到同一主模型 turn，不创建旁路人格。

**Tech Stack:** Electron、Vue、TypeScript、`@xsai/shared-chat`、`@xsai/tool`、Zod、Vitest、pnpm workspace。

---

## 文件边界

### 结构化能力与工具合同

- Create: `packages/stage-shared/src/alicization-execution-capabilities.ts`
  - 只放能力 channel、executor tool name、能力事实所需的结构化常量和类型。
  - 不放用户文本、正则、意图分数、reason code 推断或参数抽取。
- Create: `apps/stage-tamagotchi/src/main/services/alicization/local-known-websites.ts`
  - 从旧 intent 文件迁移已由工具 owner 使用的站点 alias 到 URL 规范化。
  - 只接受工具已经生成的 `site`/`url` 参数，不接管聊天意图。
- Modify: `packages/stage-shared/src/index.ts`
- Delete: `packages/stage-shared/src/alicization-execution-intent.ts`
- Delete: `packages/stage-shared/src/alicization-execution-intent.test.ts`
- Delete: `packages/stage-shared/src/alicization-execution-first-governance.ts`
- Delete: `packages/stage-shared/src/alicization-execution-first-governance.test.ts`

### renderer 聊天发送链路

- Modify: `packages/stage-ui/src/stores/chat.ts`
- Modify: `packages/stage-ui/src/stores/chat.test.ts`
- Preserve: `packages/stage-ui/src/stores/alicization-execution-engine.ts`
  - 继续负责结构化 tool event、执行状态和取消展示，不再接收文字路由结果。

### main prelude、工具 surface、session runtime

- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-context.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-turn-composition.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/local-browser-automation.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/local-desktop-inspection.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/task-execution-governor.ts`
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.ts`

### 回放、合同和旧治理测试

- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-turn-composition.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/task-execution-governor.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts`
- Modify/Delete: `apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/turn-graph.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/runtime.ts`
- Modify: `docs/superpowers/specs/2026-08-05-alicization-model-owned-tool-intent-design.md`
- Delete: old `docs/requirements/2026-04-10-*execution*` and `docs/plans/2026-04-10-*execution*` files only when a repository-wide reference scan confirms they are historical-only and no current canonical/test fixture imports or asserts their old authority.

## 实施任务

### Task 1: 建立结构化 capability/tool 合同

**Files:**
- Create: `packages/stage-shared/src/alicization-execution-capabilities.ts`
- Modify: `packages/stage-shared/src/index.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- Test: `packages/stage-shared/src/alicization-execution-capabilities.test.ts`

- [ ] **Step 1: 写失败测试，锁住合同只包含结构化能力**

```ts
import { describe, expect, it } from 'vitest'

import {
  alicizationExecutionCapabilityChannels,
  alicizationExecutorToolNames,
} from './alicization-execution-capabilities'

describe('structured execution capabilities', () => {
  it('exposes stable channels and tool names without text routing helpers', () => {
    expect(alicizationExecutionCapabilityChannels).toContain('codex')
    expect(alicizationExecutorToolNames).toContain('executor_run_codex')
  })
})
```

- [ ] **Step 2: 运行测试确认新合同尚不存在**

Run:

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-execution-capabilities.test.ts
```

Expected: FAIL because the new module and deleted-module assertion are not implemented.

- [ ] **Step 3: 实现只包含结构化常量的合同模块**

```ts
export const alicizationExecutionCapabilityChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
] as const

export type AlicizationExecutionCapabilityChannel
  = typeof alicizationExecutionCapabilityChannels[number]

export const alicizationExecutorToolNames = [
  'executor_run_cli',
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_local_visual',
  'executor_run_openclaw',
  'browser_open_url',
  'browser_search_web',
  'browser_read_page',
  'browser_click_element',
  'browser_type_text',
  'browser_navigate',
  'browser_scroll',
  'browser_wait',
  'desktop_inspect_scene',
  'desktop_list_interactables',
  'desktop_click_element',
  'desktop_type_text',
  'desktop_press_keys',
  'desktop_open_application',
  'desktop_wait',
] as const

export type AlicizationExecutorToolName = typeof alicizationExecutorToolNames[number]
```

- [ ] **Step 4: 把 capability 常量和工具 schema 改为从新模块导入**

保留 `buildExecutionCapabilitySystemBlocks(capabilities, executionCapabilityChannels)`，但删除其 `inquiry` 参数和 `focusedChannels` 计算；每次需要能力上下文时直接发送完整结构化 channel manifest：

```ts
return [buildAlicizationProviderFactBlock('alicization-execution-capabilities', {
  channels: executionCapabilityChannels.map((channel) => {
    const capability = capabilityMap.get(channel)
    return {
      channel,
      available: capability?.available !== false,
      enabled: capability?.enabled !== false,
      ready: capability?.ready !== false,
      reason: capability?.reason ?? null,
    }
  }),
})]
```

- [ ] **Step 5: 运行合同和工具 surface 测试**

Run:

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-execution-capabilities.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts
```

Expected: capability manifest tests pass; old text-routing tests remain failing and are handled in Task 4.

- [ ] **Step 6: 提交**

```bash
git add packages/stage-shared/src/alicization-execution-capabilities.ts packages/stage-shared/src/alicization-execution-capabilities.test.ts packages/stage-shared/src/index.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts
git commit -m "refactor(alicization): isolate structured execution capabilities"
```

### Task 2: 让 renderer 始终走普通主模型工具链

**Files:**
- Modify: `packages/stage-ui/src/stores/chat.ts:579-627,1723-1770,1892-2036,2489-2662`
- Modify: `packages/stage-ui/src/stores/chat.test.ts`

- [ ] **Step 1: 写失败回归测试**

新增断言覆盖：

```ts
it('does not derive tooling policy from user text', () => {
  const policy = resolveMainGatewayToolingPolicy()
  expect(policy).toEqual({
    toolingRequired: false,
    supportsTools: true,
    waitForTools: true,
  })
})
```

并在聊天发送测试中验证“你可以使用 Codex 吗”和“Codex 最近怎么样”都不会产生 `requiredExecutionToolNames`、不会触发预期工具缺失拦截；模型返回普通 text 时仍可完成 turn。

- [ ] **Step 2: 运行测试确认旧规则仍会失败**

```bash
pnpm exec vitest run packages/stage-ui/src/stores/chat.test.ts
```

Expected: 新回归断言 FAIL，旧固定路由断言仍 PASS。

- [ ] **Step 3: 删除 renderer 文字意图**

删除 `fileSystemOperationVerbPattern`、`fileSystemOperationTargetPattern`、reminder 文字模式、`detectFileSystemToolIntent`、`detectReminderToolIntent`、`detectExecutionToolRoutingIntent` 以及对应 shared import。将 tooling policy 改成不读取 `sendingMessage`：

```ts
function resolveMainGatewayToolingPolicy() {
  return {
    toolingRequired: false,
    supportsTools: true,
    waitForTools: true,
  }
}
```

发送 turn 只传工具开关和 provider 配置，不生成 `requiredExecutionToolNames`。

- [ ] **Step 4: 删除预期工具和 payout 拦截**

保留 `TurnToolEvidence` 记录实际 `tool-call`、`tool-result`、拒绝和失败；删除 `missingRequiredTool`、`missingExecutionPayoff` 以及“模型没有调用预期工具”的 failure surface。普通模型 text、澄清和 abstain 都必须正常结束。

- [ ] **Step 5: 保持 Provider 不兼容的透明恢复**

`shouldRetryStreamWithoutTools` 只在“无进度且 Provider 明确不支持 tools”时进行一次无工具重试，不再检查 `toolingRequired`；有进度、工具已执行或用户取消时不重放。

- [ ] **Step 6: 运行 renderer 回归**

```bash
pnpm exec vitest run packages/stage-ui/src/stores/chat.test.ts packages/stage-ui/src/stores/alicization-execution-engine.test.ts
```

Expected: 普通对话、模型自动 tool event、Provider tools 不兼容重试和真实工具失败测试通过。

- [ ] **Step 7: 提交**

```bash
git add packages/stage-ui/src/stores/chat.ts packages/stage-ui/src/stores/chat.test.ts
git commit -m "refactor(alicization): remove renderer text tool routing"
```

### Task 3: 移除 main prelude 的自然语言执行 authority

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-context.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts`

- [ ] **Step 1: 用结构化 runtime surface 写失败测试**

把 capability inquiry、explicit routing、pending affirmation 的测试改成以下不变量：

```ts
it('does not classify a capability question before the provider turn', async () => {
  const prelude = await runtime.prepareMainChatPrelude(payloadFor('你可以使用 Codex 吗'), gateway)
  expect(prelude).not.toHaveProperty('executionRoutingIntent')
  expect(prelude.actionObligation).not.toHaveProperty('routingIntent')
  expect(prelude.perceptionAugmentation.messages).not.toContainEqual(
    expect.objectContaining({ content: expect.stringContaining('alicization-execution-routing') }),
  )
})
```

测试同时要求 `buildMainChatPendingAffirmationThread` 不再被调用来判断“可以/继续/好”等短句；待续线程作为 execution callback/ledger 的结构化事实交给模型。

- [ ] **Step 2: 重塑 prelude 合同**

从 `AlicizationPreparedMainChatPrelude` 删除 `executionCapabilityInquiry` 和 `executionRoutingIntent`。`prepareMainChatPrelude` 只负责：

1. 解析当前消息；
2. 读取 WorkingMemory、LongTermMemoryRecall、execution callback/ledger；
3. 运行已有 perception owner；
4. 生成不含执行路由的 action obligation。

`skipInspectionGrounding` 只由已有结构化 perception 权限/scene state 决定，不由用户文字决定。

- [ ] **Step 3: 将 action obligation 降级为结构化诊断**

删除 `main-chat-action-obligation.ts` 中的 channel map、continuation regex、affirmation regex、semantic signal 分支和所有 `routingIntent` 构造。保留 `answer`、`clarify`、`inspect` 三种由 runtime surface 的结构化字段推导出的诊断；删除 `execute`、`continue-task` 的文字 authority、pending thread resume 字段。

新的最小接口：

```ts
export interface AlicizationMainChatActionObligation {
  confidence: number
  kind: 'answer' | 'clarify' | 'inspect'
  reasonCodes: string[]
  source: 'dialogue-governance'
  summary: string
}
```

- [ ] **Step 4: 更新 replay 输入/输出**

`main-chat-session-replay-harness.ts` 的默认 prelude 不再填充 capability inquiry、routing intent 或 pending affirmation 字段；兼容解析也不再读取这些字段。保留工具实际 event、tool result、execution ledger 和 memory trace。

- [ ] **Step 5: 运行 main prelude 测试**

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts
```

Expected: 能力询问、工具名闲聊和短句续接都只进入同一模型主链路，不生成路由 intent。

- [ ] **Step 6: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-context.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts
git commit -m "refactor(alicization): remove main prelude text execution authority"
```

### Task 4: 取消 main runtime 的强制 toolChoice、工具过滤和 routing block

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-turn-composition.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/turn-graph.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/runtime-turn-composition.test.ts`

- [ ] **Step 1: 写模型自动选择失败测试**

在 runtime 测试中准备同一个 payload，分别让 mock Provider 返回普通 text 和 `tool-call`，断言两者都不被 runtime 预先改写：

```ts
expect(result.toolChoice).toBeUndefined()
expect(result.tools?.map(tool => tool.function?.name)).toContain('executor_run_codex')
expect(textTurn.runtimeSurface.tooling.toolsOffered).toBe(true)
expect(toolTurn.runtimeSurface.tooling.toolsOffered).toBe(true)
```

- [ ] **Step 2: 改为 capability 驱动的工具提供**

删除 `effectiveExecutionRoutingIntent`、`routingRequired`、`buildMainGatewayExecutionRoutingToolChoice`、`filterMainGatewayToolsForRoutingIntent` 和 `buildExecutionRoutingEnforcementSystemBlock` 的生产调用。使用：

```ts
const allowTools = payload.supportsTools !== false
const waitForTools = allowTools
const toolChoice = undefined
```

工具 registry 在 `allowTools` 为 true 时完整构造，不按工具名称过滤。provider capability 不支持 tools 时走现有一次无工具 retry；不可用 capability 仍通过结构化 manifest告知模型，不能伪装执行成功。

- [ ] **Step 3: 改造能力事实**

`buildExecutionCapabilitySystemBlocks` 只接收 provider capability 和 capability channel；不再读取用户文字，也不输出 capability question/focused channels。每轮提供的能力事实只描述 `available/enabled/ready/reason`。

- [ ] **Step 4: 清理 runtime surface 与 turn graph 字段**

从 `AlicizationMainChatToolingSurface` 和 `AlicizationMainChatActionSurface` 删除 `routingRequired`、`enforcedToolNames`；从 turn graph/runtime 删除 `routingRequired`，改用 `toolsOffered: boolean` 记录结构化事实。不得保留始终为 false 的兼容字段。

- [ ] **Step 5: 运行 session/runtime 回归**

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-turn-composition.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts
```

Expected: provider 可直接回答、模型自主产生工具调用、工具结果续轮、Provider 不支持 tools 的透明降级全部通过；旧“按自然语言强制工具/等待/选择”的断言被删除。

- [ ] **Step 6: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-turn-composition.ts apps/stage-tamagotchi/src/main/services/alicization/turn-os/turn-graph.ts apps/stage-tamagotchi/src/main/services/alicization/turn-os/runtime.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-turn-composition.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts
git commit -m "refactor(alicization): let provider choose tools automatically"
```

### Task 5: 删除 execution-first 文字治理与 lexical task routing

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/task-execution-governor.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.ts`
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.test.ts`
- Delete: `packages/stage-shared/src/alicization-execution-first-governance.ts`
- Delete: `packages/stage-shared/src/alicization-execution-first-governance.test.ts`

- [ ] **Step 1: 写失败不变量**

```ts
it('does not select an executor from a free-form task goal', async () => {
  const result = await runTaskGovernor({
    task: { kind: 'unknown', goal: '帮我看看当前页面', requestedChannel: null },
  })
  expect(result.stage).toBe('plan')
  expect(result.plan.proposedChannel).toBeNull()
  expect(result.errorCode).toBe('TASK_CHANNEL_REQUIRED')
})
```

- [ ] **Step 2: 删除 runtime governance 的文字归一化**

从 `runtime-governance.ts` 删除 `normalizeExecutionFirstGovernance` import/call、`executionFirstGovernance` 派生和 `execution_*` lexical audit fields。保留已有 anchor coherence、truth discipline、risk and failure governance；`runtime-governance` 不再读取用户 text 判断执行。

- [ ] **Step 3: 删除 task routing assessor fallback**

删除 `deriveGoalRoutingCandidate`、`deriveVisualGroundingRoutingCandidate`、channel preference regex 和 `assessAlicizationTaskRouting` wiring。`task-execution-governor` 只接受 tool/schema 已确定的 `requestedChannel`；缺失时返回结构化 validation result，交给主模型澄清或重新选择 executor tool。

- [ ] **Step 4: 运行 execution governor 与 governance 测试**

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/task-execution-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts
```

Expected: 安全、确认、预算、取消、审计仍通过；所有基于 goal 文本选 channel 的断言被删除。

- [ ] **Step 5: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts apps/stage-tamagotchi/src/main/services/alicization/task-execution-governor.ts apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.ts apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.ts apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.test.ts packages/stage-shared/src/alicization-execution-first-governance.ts packages/stage-shared/src/alicization-execution-first-governance.test.ts packages/stage-shared/src/index.ts
git commit -m "refactor(alicization): remove lexical execution governance"
```

### Task 6: 迁移工具 owner 的站点参数规范化

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/local-known-websites.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/local-browser-automation.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/local-desktop-inspection.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/local-browser-automation.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/local-desktop-inspection.test.ts`

- [ ] **Step 1: 迁移纯参数规范化测试**

将 `resolveAlicizationKnownWebsiteBySite` 的 alias -> URL 行为迁移到新 owner 测试；明确它只处理结构化 tool 参数和 inspection 的已确定目标，不接受聊天消息作为路由输入。

- [ ] **Step 2: 迁移实现并改 imports**

把站点 catalog、`resolveKnownWebsiteBySite` 和必要的 URL normalization 放到 `local-known-websites.ts`；删除 `resolveAlicizationKnownWebsiteInText` 的生产调用。对于 inspection question 只保留已有结构化 `site`/`url` 字段，不能从自然语言 question 重新猜目标。

- [ ] **Step 3: 运行工具 owner 测试**

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/local-browser-automation.test.ts apps/stage-tamagotchi/src/main/services/alicization/local-desktop-inspection.test.ts
```

Expected: URL/站点规范化通过，聊天自然语言不再触发隐藏工具选择。

- [ ] **Step 4: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/local-known-websites.ts apps/stage-tamagotchi/src/main/services/alicization/local-browser-automation.ts apps/stage-tamagotchi/src/main/services/alicization/local-desktop-inspection.ts apps/stage-tamagotchi/src/main/services/alicization/local-browser-automation.test.ts apps/stage-tamagotchi/src/main/services/alicization/local-desktop-inspection.test.ts
git commit -m "refactor(alicization): keep website normalization inside tool owners"
```

### Task 7: 删除旧测试 fixture、canonical 和 replay 路由残留

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- Modify: `docs/superpowers/specs/2026-08-05-alicization-model-owned-tool-intent-design.md`

- [ ] **Step 1: 删除旧断言**

删除所有要求以下内容的测试：

```ts
expect(intent?.requiredToolNames).toEqual(...)
expect(result.toolChoice).toEqual(...)
expect(result.runtimeSurface.tooling.toolsOffered).toBe(true)
expect(findAlicizationProviderFact(result.messages, 'alicization-execution-routing')).toBeDefined()
```

保留或新增以下测试：

```ts
expect(result.toolChoice).toBeUndefined()
expect(result.tools).toEqual(expect.arrayContaining([
  expect.objectContaining({ function: expect.objectContaining({ name: 'executor_run_codex' }) }),
]))
expect(findAlicizationProviderFact(result.messages, 'alicization-execution-capabilities')).toMatchObject({
  data: { channels: expect.any(Array) },
})
```

- [ ] **Step 2: 添加统一 replay fixtures**

在 `main-chat-session-replay-harness.test.ts` 增加 11 个 replay：

1. 能力问句；
2. 工具名闲聊；
3. 明确执行请求；
4. 浏览器打开请求；
5. 提醒能力问答；
6. 创建提醒请求；
7. 文件语义讨论；
8. 删除文件请求；
9. Provider 不支持 tools 的普通对话；
10. 工具 schema validation failure；
11. 工具 timeout/provider failure。

fixture 只能模拟 Provider 返回的 text/tool-call/tool-result，不得提前写 `routingIntent`、`requiredToolNames` 或“预期缺失工具”字段。

- [ ] **Step 3: 删除历史文档中的当前 authority**

扫描并处理 `docs/canonical`、`docs/requirements`、`docs/plans`、`docs/superpowers`。历史方案可以保留为历史记录，但必须明确标注为 retired；任何被当前测试、canonical 或 runtime 读取的旧 routing contract 要删除或改写成模型自动工具选择。

- [ ] **Step 4: 运行旧治理残留扫描**

```bash
rg -n --hidden --glob '!node_modules' --glob '!.git' --glob '!*.map' \
  'detectExecutionToolRoutingIntent|detectFileSystemToolIntent|detectReminderToolIntent|requiresExecutionToolCall|requiresImmediateFileToolCall|requiresReminderToolCall|requiredExecutionToolNames|routingRequired|executionCapabilityInquiry|explicitExecutionRoutingIntent|buildExecutionRoutingEnforcementSystemBlock|buildMainGatewayExecutionRoutingToolChoice|filterMainGatewayToolsForRoutingIntent|execution-first-governance|default-cli-from-command-structure' \
  apps packages docs/canonical docs/requirements docs/plans docs/superpowers
```

Expected: only the approved retired-design documentation reference remains, and it is not imported or executed by production code.

- [ ] **Step 5: 提交**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization docs/superpowers/specs/2026-08-05-alicization-model-owned-tool-intent-design.md
git commit -m "test(alicization): replay model-owned tool selection"
```

### Task 8: 全链路验证并审计 memory/persona 边界

**Files:**
- Modify only when a failing invariant identifies a real regression: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-failure-evidence.ts`

- [x] **Step 1: 运行 targeted tests**

```bash
pnpm exec vitest run \
  packages/stage-shared/src/alicization-execution-capabilities.test.ts \
  packages/stage-ui/src/stores/chat.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-quality-harness.test.ts
```

Expected: model text、model tool call、tool result continuation、Provider unsupported retry、真实 timeout/provider/tool failure 都通过；失败 surface 仍明确标记阶段，不生成人格模板。

- [x] **Step 2: 运行 typecheck**

```bash
pnpm -F @proj-alicization/stage-shared typecheck
pnpm -F @proj-alicization/stage-ui typecheck
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

- [x] **Step 3: 运行仓库扫描和 lint**

```bash
pnpm lint
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts
```

`pnpm lint:fix` 只允许修改本轮触碰的源码，不得把 `.serena/project.yml`、`tsbuildinfo`、`.claude-flow`、`.pnpm-store`、`.swarm` 或未跟踪长期记忆计划混入提交。

- [x] **Step 4: 验证 memory/LoRA 不污染**

对 replay 结果断言：

```ts
expect(failureTurn.personaTrainingCandidates).toHaveLength(0)
expect(failureTurn.longTermMemoryCandidates).not.toContainEqual(
  expect.objectContaining({ source: 'provider-error' }),
)
expect(toolResultTurn.workingMemory).toEqual(expect.objectContaining({
  currentTask: expect.anything(),
}))
```

工具结果只进入 WorkingMemory 当前任务证据；只有清洗后的成功经验才允许进入长期 procedure/gotcha，原始工具输出、失败面和 Provider error 禁止进入 persona/LoRA。

- [x] **Step 5: 提交验证结果**

```bash
git status --short --branch
git diff --check
git log --oneline -12
```

如果所有 targeted tests、typecheck、lint 和残留扫描通过，再使用 `superpowers:verification-before-completion` 做最终核验，并按 Conventional Commit 分小步提交；不提交工作区噪声。

### 最终验证记录

- 独立规格审查：`PASS`。
- 独立代码质量审查发现的 4 个 Important 已修复：
  - Provider tools 错误只保留稳定错误码，不持久化或回传原始错误文本。
  - `supported=false` 负观测 24 小时后自动失效并重新探测。
  - `blocked` 作为终态不再进入活跃 execution ledger。
  - WorkingMemory 只在 15 分钟窗口内延续结构化 `active` execution state，终态不会泄漏到后续普通对话。
- 本轮相关测试：changed-source targeted `168/168`；runtime 工具主链定向 `5/5`；replay/persona/single-mainline `51/51`；`test:alicization-final-gate` `209/209`。
- 类型检查：`stage-ui` 和 `stage-tamagotchi typecheck:node` 通过。
- `stage-shared typecheck` 仍被既有 `alicization-embodiment-script.test.ts` 的 `continuityRestraint` 类型错误阻塞，与本轮 diff 无关。
- 旧治理生产残留扫描为零。
- 全仓 `pnpm lint` 的快速规则阶段为 0 error/0 warning；后续 ESLint 被 `.agents/skills` 示例与既有计划文档历史错误阻塞。本轮修改源码 scoped ESLint 为 0 error、15 条既有正则 warning。

## 完成判定

以下条件必须全部成立：

1. renderer 没有自然语言工具检测、预期工具集合或缺失工具拦截。
2. main prelude 不生成 execution capability inquiry 或 routing intent。
3. main runtime 不使用 `routingRequired`、强制 `toolChoice`、工具过滤或 routing enforcement system block。
4. Provider 支持 tools 时，完整工具定义进入同一人格和记忆主链路，模型可以直接回答或自主调用。
5. Provider 不支持 tools 时，普通对话成功；明确执行请求不伪装成功，并显示真实能力限制。
6. 参数 schema、风险、确认、scope、预算、取消、审计和失败面继续有效。
7. WorkingMemory、LongTermMemoryRecall、persona/LoRA hygiene 的 owner 和数据排除规则没有被旁路。
8. 生产代码和当前 replay fixture 不再依赖旧固定文字模板。
