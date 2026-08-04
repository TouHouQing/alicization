# Alicization Memory Quality User Trial Scale Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把短期记忆、长期召回、上下文压缩、Persona/LoRA 清洗和 Memory Workbench 质量面板做成真实用户可试用、可标注、可回归、可规模化的闭环。

**Architecture:** 不改变 owner 边界：WorkingMemory 继续拥有短期记忆，LongTermMemoryRecall 继续拥有长期回想，Persona/LoRA runtime 继续拥有训练数据治理，Memory Workbench 只做聚合入口。新增质量 runner、简化 gold label 映射、生产 DB 试用入口和 UI 报告面板，统一输出 JSON/trace/recommended actions。

**Tech Stack:** Electron main process, TypeScript, Vitest, SQLite facade, Eventa, Pinia, Vue 3, UnoCSS, pnpm workspace filters.

---

## 相关文档

- `AGENTS.md`
- `docs/superpowers/specs/2026-07-01-alicization-life-core-reset-design.md`
- `docs/superpowers/plans/2026-07-05-alicization-memory-quality-harness-implementation-plan.md`
- `docs/superpowers/plans/2026-08-03-alicization-memory-scale-governance-implementation-plan.md`
- `docs/superpowers/specs/2026-07-04-alicization-memory-workbench-productization-design.md`

## 用户标注简化方案

Workbench 面向小白用户只显示四个按钮：

1. `记得对`：她想起了该想起的记忆，用得合适。
2. `没想起来`：这次应该想起某段记忆，但她没有想起。
3. `记错了`：她提到了错误、过期或别的会话里的记忆。
4. `不该提`：这句话不需要回忆，或应该明确说不确定。

底层映射到评测维度：`information-extraction`、`multi-session-reasoning`、`temporal-reasoning`、`knowledge-update`、`abstention`。用户不需要看到这些术语；它们只用于月度回归集和质量门禁。

## Task 1: 生产试用 Runner 入口

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.test.ts`
- Modify later: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify later: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`

- [x] **Step 1: 写 runner 失败测试**

覆盖 `dialogueReplay -> WorkingMemory compression -> DB recall -> Persona dataset hygiene -> JSON report`。

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.test.ts
```

Expected first run: FAIL because `memory-production-trial-runner.ts` does not exist.

- [x] **Step 2: 实现最小 runner**

`runMemoryProductionTrialRunner()` 接收：

```ts
{
  id: string
  cardId: string
  createdAt: number
  dialogueReplay?: () => Promise<MemoryProductionTrialDialogueReplayResult>
  workingMemory?: WorkingMemoryQualityFixture[]
  longTerm?: DbBackedLongTermMemoryQualityInput[]
  userTrials?: MemoryUserTrialHarnessInput[]
  personaTraining?: PersonaTrainingDatasetQualityFixture[]
}
```

输出 `memory-production-trial-runner-v1`，包含 `stages`、`quality`、`recommendedNextActions` 和可 JSON 序列化函数。

- [ ] **Step 3: 接真实 DB facade**

在 `db.ts` 增加 `runMemoryWorkbenchProductionTrial({ cardId, replayPackId?, month? })`，从真实 DB 读取：

```ts
const report = await runMemoryProductionTrialRunner({
  id: `memory-production-trial:${cardId}:${now}`,
  cardId,
  createdAt: now,
  dialogueReplay: async () => runSelectedReplayPackAsTrialFixtures(...),
  longTerm: buildDbRecallFixturesFromGoldLabels(...),
  personaTraining: buildPersonaTrainingFixturesFromDatasetSnapshot(...),
})
```

- [ ] **Step 4: Eventa handler**

新增 `electronAlicizationMemoryWorkbenchRunQualityTrial`，payload：`{ cardId, month?: string, replayPackId?: string }`，result 为 report DTO。

- [ ] **Step 5: 验证并提交**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

Commit: `feat(alicization): add memory production trial runner`.

## Task 2: 小白用户 Gold Label 映射

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-os/simple-recall-gold-labels.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-os/simple-recall-gold-labels.test.ts`
- Modify later: `apps/stage-tamagotchi/src/main/services/alicization/memory-os/recall-feedback-runtime.ts`
- Modify later: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`

- [x] **Step 1: 写四按钮映射测试**

断言按钮顺序为：`记得对`、`没想起来`、`记错了`、`不该提`。

- [x] **Step 2: 实现映射模块**

`buildSimpleRecallGoldLabelOptions()` 返回用户可见按钮；`buildSimpleRecallGoldSample()` 生成底层 recall feedback sample；`buildSimpleRecallGoldMonthlyRegressionItem()` 生成月度回归条目。

- [ ] **Step 3: 持久化 gold label 样本**

在 DB 增加表：

```sql
CREATE TABLE memory_quality_gold_labels (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  month TEXT NOT NULL,
  label TEXT NOT NULL,
  evaluation_class TEXT NOT NULL,
  benchmark_dimensions_json TEXT NOT NULL,
  query TEXT NOT NULL,
  expected_memory_ids_json TEXT NOT NULL,
  surfaced_memory_ids_json TEXT NOT NULL,
  wrong_thread_ids_json TEXT NOT NULL,
  turn_id TEXT,
  decision_trace_id TEXT,
  note TEXT,
  created_at INTEGER NOT NULL
)
```

- [ ] **Step 4: 月度回归集导出**

新增 `listMemoryQualityGoldLabels({ cardId, month })` 和 `buildMonthlyGoldRegressionPack({ cardId, month })`。

- [ ] **Step 5: 验证并提交**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-os/simple-recall-gold-labels.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-os/recall-feedback-runtime.test.ts
```

Commit: `feat(alicization): simplify memory gold labels`.

## Task 3: 压缩后行为 E2E

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/working-memory-compression-behavior-harness.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/working-memory-compression-behavior-harness.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.ts`

- [ ] **Step 1: 写失败测试**

构造原始 WorkingMemory，压缩后进入下一轮 recall query hints，断言下一轮 DB recall 能命中“用户纠正 / 失败透明 / 当前任务”。

- [ ] **Step 2: 实现 behavior harness**

输出：`compressionChangedRecall: boolean`、`lostCommitments`、`lostCorrections`、`recallDelta`。

- [ ] **Step 3: 接入 production trial runner**

Runner 新增 stage `compressed-context-behavior`，失败时输出 recommended action。

- [ ] **Step 4: 验证并提交**

Run targeted tests and commit `feat(alicization): evaluate compressed memory behavior`.

## Task 4: 时间与更新冲突评测

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-temporal-conflict-harness.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-temporal-conflict-harness.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.ts`

- [ ] **Step 1: 覆盖 later correction**

旧记忆：用户喜欢 A。新记忆：用户后来改成 B。查询“你还记得我现在喜欢什么吗？”必须返回 B，A 只能低置信或 tombstone。

- [ ] **Step 2: 覆盖 yesterday / last week / recently / long ago**

每个 fixture 包含明确 `occurredAt` 和 query temporal hint，断言召回顺序符合时间意图。

- [ ] **Step 3: 覆盖 tombstone 后不再高置信召回**

用 `blockedPolicy: observe` 证明旧 tombstone 即使 semantic score 更高也会被标为 leak。

- [ ] **Step 4: 验证并提交**

Run targeted tests and commit `feat(alicization): add temporal memory conflict gates`.

## Task 5: 语义召回规模化 Soak

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-soak-harness.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-soak-harness.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.ts`

- [ ] **Step 1: 10k fake vector smoke test**

用 deterministic embedding provider 生成 10k records，断言 p95/p99、recallAtK、falseRecallRate、indexMode、coverageRatio。

- [ ] **Step 2: provider failure/degrade test**

Provider 抛错时 lexical fallback 可用，但 report 明确包含 provider error。

- [ ] **Step 3: model switch/reindex test**

切换 modelId/dimensions 后必须 `reindexRequired=true`，不能混用旧 vectorSpace。

- [ ] **Step 4: cancel/retry/dead-letter/crash recovery test**

复用 durable reindex job runtime，runner 汇总 dead-letter 和 retry action。

- [ ] **Step 5: 验证并提交**

Commit `test(alicization): add semantic recall scale soak gates`.

## Task 6: LoRA 治理接真实 runtime

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-quality-harness.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-runtime.test.ts`

- [ ] **Step 1: 从真实 snapshot 构建 quality fixture**

新增 helper：`buildPersonaDatasetQualityFixtureFromRuntimeSnapshot(snapshot)`。

- [ ] **Step 2: export/activate 前质量门禁**

导出 manifest 前跑 quality fixture；存在 critical finding 时不允许 activate。

- [ ] **Step 3: rollback/revoke 后再评测**

撤回来源后重新 export 应为 0 eligible 或删除对应 sample。

- [ ] **Step 4: 验证并提交**

Commit `feat(alicization): gate persona datasets with quality harness`.

## Task 7: Memory Workbench 质量面板

**Files:**
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`
- Modify: `packages/i18n/src/locales/zh-Hans/settings.yaml`
- Modify: `packages/i18n/src/locales/en/settings.yaml`

- [ ] **Step 1: Eventa DTO**

增加 `AlicizationMemoryQualityTrialReport`、`AlicizationSimpleRecallGoldLabelOption`、`AlicizationMemoryQualityGoldLabelPayload`。

- [ ] **Step 2: Store actions**

新增 `runQualityTrial()`、`applyGoldLabel()`、`loadMonthlyGoldLabels()`。

- [ ] **Step 3: UI 面板**

增加“质量试用”区域：运行试用、查看失败项、推荐动作、trace、四个反馈按钮。

- [ ] **Step 4: 小白文案**

按钮文案只显示：`记得对`、`没想起来`、`记错了`、`不该提`。

- [ ] **Step 5: 验证并提交**

Run store/page/i18n tests and commit `feat(alicization): surface memory quality trials in workbench`.

## Task 8: Scope fuzz 与体验评测

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-card-scope-fuzz.test.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-experience-quality-harness.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-experience-quality-harness.test.ts`

- [ ] **Step 1: card/user scope fuzz**

随机生成 card/user/sourceId，对 facts、consolidations、vectors、review、persona dataset 进行跨 card 查询，断言无泄漏。

- [ ] **Step 2: 体验质量 harness**

评测 `不打扰`、`不炫耀记忆`、`不把记忆当模板`、`不确定时说不确定`。

- [ ] **Step 3: Agent 经验记忆 fixture**

新增 workflow/gotcha/affordance 类 fixture：例如“SiliconFlow baseUrl 只填 host，系统补 /v1/embeddings”。

- [ ] **Step 4: 验证并提交**

Commit `test(alicization): add memory scope fuzz and experience gates`.

## Final Verification

Run:

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-user-trial-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-quality-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-os/simple-recall-gold-labels.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
pnpm -F @proj-alicization/stage-ui typecheck
git diff --check
```

Do not stage `.serena/project.yml`, `tsconfig.node.tsbuildinfo`, `.claude-flow/`, `.swarm/`, `.pnpm-store/`, or the two pre-existing untracked long-term memory plan docs unless the user explicitly asks.
