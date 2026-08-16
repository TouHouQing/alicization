# Alicization Production Life Loop Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成真实 Provider 记忆试用、全部质量阶段接线、会话选择、持久化规模压测、本地 Persona/LoRA executor、DTO parity 和 macOS 验收。

**Architecture:** 使用 focused runtime 承载 Provider trial、scale worker 和 trainer process；`db.ts` 继续作为 SQLite facade，desktop runtime 注入 Provider/训练执行器，Eventa/Bridge/Workbench 只聚合稳定 DTO。所有试用与压测默认隔离生产写入。

**Tech Stack:** TypeScript, Electron, Vue 3, Eventa, SQLite/sqlite-vec, xsAI, Vitest, Node child process, electron-builder

---

## Task 1: Live Provider Trial Runtime

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-live-provider-trial.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-live-provider-trial.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-db-dialogue-replay-harness.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-gateway-contract.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`

- [x] **Step 1: 写失败测试**

覆盖真实 provider adapter 收到 `alicization-turn-memory-context`、Provider 失败透明、取消、最大轮数，以及 trial 前后生产 checkpoint/Persona 不变。

- [x] **Step 2: 运行失败测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-live-provider-trial.test.ts
```

Expected: FAIL，因为 runtime 和 provider dependency 尚不存在。

- [x] **Step 3: 实现隔离 trial**

新增 `AlicizationMemoryTrialProvider`：

```ts
export interface AlicizationMemoryTrialProvider {
  generate: (input: {
    cardId: string
    sessionId: string
    turnId: string
    messages: MemoryDialogueReplayProviderMessage[]
    timeoutMs: number
    signal: AbortSignal
  }) => Promise<{
    text: string
    providerId: string
    modelId: string
    finishReason: string | null
    retryCount: number
    latencyMs: number
  }>
}
```

Provider trial 使用内存 checkpoint，并禁止 Persona writeback。

- [x] **Step 4: 注入真实 main gateway Provider**

注册 `memory-quality-trial` source；runtime 通过当前 active provider/model 构建 adapter。缺少配置、超时和请求错误保留原错误。

- [x] **Step 5: 验证并提交**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/memory-live-provider-trial.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-db-dialogue-replay-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-gateway-contract.test.ts
git commit -m "feat(memory-quality): add isolated live provider trial"
```

## Task 2: 完整生产质量阶段

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-quality-workbench-db.test.ts`

- [x] **Step 1: 写失败测试**

断言 DB Workbench report 不再让 `temporalConflictFixtureCount`、`scopeFuzzCaseCount` 和已有 scale report 恒为零。

- [x] **Step 2: 运行失败测试**

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-quality-workbench-db.test.ts
```

- [x] **Step 3: 构建真实输入**

从 `expired` gold labels、tombstone/supersedes 数据构建 temporal fixtures；scope fuzz 直接查询真实 card/user/source scoped repository；scale stage 使用最近完成报告。没有样本时返回明确 not-run finding。

- [x] **Step 4: 验证并提交**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-quality-workbench-db.test.ts
git commit -m "feat(memory-quality): wire production quality stages"
```

## Task 3: Replay 会话选择器

**Files:**
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`
- Modify: `packages/i18n/src/locales/zh-Hans/settings.yaml`
- Modify: `packages/i18n/src/locales/en/settings.yaml`

- [x] **Step 1: 写 Eventa/store/UI 失败测试**

要求分页会话摘要、当前选择和 trial payload 的 `sessionId`。

- [x] **Step 2: 实现 DB keyset 会话摘要**

查询 conversation turns 与 WorkingMemory checkpoint，返回标题、轮数和时间，不跨 card scope。

- [x] **Step 3: 实现中文下拉选择**

质量面板显示会话标题、最近时间和轮数；删除手工 `replayPackId` 文案。

- [x] **Step 4: 验证并提交**

```bash
pnpm exec vitest run \
  packages/stage-ui/src/stores/alicization-memory-workbench.test.ts \
  apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
git commit -m "feat(memory-workbench): add replay session picker"
```

## Task 4: 持久化 Semantic Scale Job

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-job-runtime.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-job-runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`

- [x] **Step 1: 写状态机失败测试**

覆盖 queued/running/completed、取消、失败重试、重启恢复和单 worker lease。

- [x] **Step 2: 实现 job 表和 worker**

worker 在临时目录创建 SQLite，调用 `runMemorySemanticScaleVectorAdapterSoak()`；进度和最终 JSON report 持久化到主 DB。

- [x] **Step 3: 接 Eventa 和 UI**

提供 10k/100k、开始、取消、重试、轮询状态和历史报告。

- [x] **Step 4: 验证并提交**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-job-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-soak-runtime.test.ts
git commit -m "feat(memory-quality): add durable semantic scale jobs"
```

## Task 5: 本地 Persona/LoRA Executor

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-process-executor.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-process-executor.test.ts`
- Create: `apps/stage-tamagotchi/resources/persona-training/README.md`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`
- Modify: `apps/stage-tamagotchi/electron-builder.config.ts`

- [x] **Step 1: 写 executor 失败测试**

使用临时 fake executable 验证 JSONL 输入、manifest、stdout progress、取消、超时、非零退出码、artifact hash 和 source revoke。

- [x] **Step 2: 实现安全进程协议**

使用 `spawn` 参数数组，不通过 shell；只允许配置的 executable；输出目录位于 card scope；artifact manifest 必须通过 schema 和文件存在性校验。

- [x] **Step 3: 注入 pipeline gate**

runtime 从用户配置构建 executor。未配置时保持透明失败。训练完成后记录 artifact compatibility；不支持加载的 Provider 不得显示已激活。

- [x] **Step 4: UI 与打包**

Persona 面板增加训练器状态、命令路径、base model、测试连通和产物兼容性。把资源说明打包，但不静默安装第三方训练依赖。

- [x] **Step 5: 验证并提交**

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/persona-training-process-executor.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/persona-training-pipeline-gate.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-db.test.ts
git commit -m "feat(persona): connect local training executor"
```

## Task 6: Eventa/Bridge DTO Parity

**Files:**
- Create: `apps/stage-tamagotchi/src/shared/alicization-memory-workbench-parity.type-spec.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.type-spec.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`

- [x] **Step 1: 写双向可赋值 type spec**

使用 `satisfies` 和泛型 `Assert<Equal<...>>` 检查 trial、session、scale job、training artifact。

- [x] **Step 2: 修复所有漂移**

Eventa 类型为传输合同来源，bridge 必须保持字段和 union 一致。

- [x] **Step 3: 验证并提交**

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
pnpm -F @proj-alicization/stage-ui typecheck
git commit -m "test(alicization): enforce memory workbench dto parity"
```

## Task 7: 文档校准和最终验收

**Files:**
- Modify: `docs/superpowers/plans/2026-08-03-alicization-memory-scale-governance-implementation-plan.md`
- Modify: `docs/superpowers/plans/2026-07-04-alicization-memory-workbench-productization-implementation-plan.md`
- Modify: `docs/superpowers/plans/2026-08-15-alicization-production-life-loop-closure-implementation-plan.md`

- [x] **Step 1: 逐项按代码和测试校准勾选状态**

不以文件存在代替验收；只有实际生产接线和测试都存在才能勾选。

- [ ] **Step 2: 运行最终门禁**

```bash
pnpm test:alicization-final-gate
pnpm -F @proj-alicization/stage-tamagotchi typecheck
pnpm -F @proj-alicization/stage-ui typecheck
pnpm lint
git diff --check
```

- [ ] **Step 3: 构建并安装本地 macOS App**

```bash
pnpm -F @proj-alicization/stage-tamagotchi build:mac:local
```

验证：

- App 可见并可交互
- Memory Workbench 可打开
- sqlite3/sqlite-vec 可加载
- 10k scale job 可启动并取消
- 未配置 trainer 时显示真实配置错误
- Live Provider Trial 可运行或明确显示 Provider 配置错误

- [x] **Step 4: 最终提交**

```bash
git commit -m "docs(alicization): close production life loop plan"
```

> 当前证据：final gate、两个 typecheck、定向 ESLint 和 unpacked macOS `.app` 构建已通过；根级 `pnpm lint` 仍受 `.agents`/既有文档扫描噪声影响，`build:mac:local` 的最后安装步骤受本机 keychain 授权失败影响。因此 Step 2/3/4 保持未完成，不能把打包成功等同于安装验收完成。
