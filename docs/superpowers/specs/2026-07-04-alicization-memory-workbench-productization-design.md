# Alicization Memory Workbench 产品化设计

Status: Ready for user review

Date: 2026-07-04

## 目标

把当前 Memory Workbench 从“已经有设置页入口、Eventa 合同、后端 facade 和基础列表”的状态，升级为可日常使用、可解释、可审计、可回滚的记忆产品闭环。

本阶段聚焦五件事：

1. 真实健康指标。
2. review 策略持久化。
3. 长期记忆分页、搜索和完整筛选 UI。
4. 向量召回和 embedding 闭环产品化。
5. persona 候选凝练面板。

这不是新建第二套记忆系统，也不是把 Memory Workbench 做成纯调试页。它应该成为用户能理解和控制 Alicization 记忆生命系统的稳定入口。

## 当前背景

Alicization 当前处于 Phase 1: Local Digital Life。记忆系统的目标不是“保存更多聊天”，而是让同一个她在长期本地使用中保持连续人格、关系连续性和可解释回想。

当前已经完成的基础：

- WorkingMemory 已成为短期记忆 owner。
- WorkingMemory 能产出长期记忆候选队列。
- `working_memory_long_term_transactions` 已承接清洗、投影、应用状态。
- LongTermMemoryRecall owner 已能生成 recall intent、query plan、evidence bundle。
- 主对话链路已经能注入 `alicization-long-term-memory-recall` JSON fact。
- Memory Workbench 已有设置页、Eventa 合同、renderer bridge、Pinia store、main invoke handler 和 DB facade。

当前仍未产品化的缺口：

- 健康指标返回默认值，不能反映真实队列、召回和 embedding 状态。
- `inward-only` 和 `no-training` review 动作没有持久化策略写回。
- 长期记忆列表仍是假分页，`nextCursor` 恒为 `null`。
- 搜索和筛选 UI 不完整，无法承担用户日常治理。
- vector store 仍是内存实现，embedding 状态不可见、不可重建、不可追踪。
- persona tab 只有占位，没有候选列表、审核和训练禁用策略。

## 非目标

本阶段不做这些事：

- 不启动夜间自动微调。
- 不直接训练 LoRA、Adapter 或任意模型权重。
- 不把 raw transcript 直接变成训练集。
- 不把 raw conversation 全量向量化后直接 top-k。
- 不引入图数据库作为硬依赖。
- 不重写全部记忆模块。
- 不让 Memory Workbench 绕过 Eventa 直接读渲染端无法审计的内部状态。
- 不让长期召回覆盖 WorkingMemory 当前任务 owner。

## 设计原则

### 1. Memory Workbench 是产品入口，不是业务 owner

Memory Workbench 负责：

- 聚合稳定 DTO。
- 暴露用户可理解的状态。
- 把用户动作写回对应 owner。
- 聚合健康、错误和审计信息。

Memory Workbench 不负责：

- 自己判断一条记忆是否真实。
- 自己执行召回排序。
- 自己生成 persona 训练样本。
- 自己绕开 long-term memory owner 修改底层表。

### 2. 持久策略使用 overlay，而不是污染所有来源表

长期记忆来源包括 facts、episodes、reflections、consolidations、persona reinforcements。每个表都加同样字段会放大迁移和一致性成本。

本阶段采用统一策略覆盖层：

```text
long_term_memory_policy_overrides
  source_id
  source
  visible_mode
  allow_training
  review_state
  reason
  created_at
  updated_at
```

查询时将 source record 和 policy overlay 合并成 Workbench item。

### 3. embedding 是检索表示，不是人格本体

embedding 只负责语义近邻检索。它不能决定记忆真假、人格表达、训练资格或显性复述权限。

每条向量必须绑定：

- `sourceId`
- `source`
- `modelId`
- `dimensions`
- `textHash`
- `updatedAt`

更换 embedding model 时必须标记 reindex，不允许混用不同向量空间。

### 4. persona 候选只来自清洗后的长期记忆

persona candidate 只能从 cleaned reflection、persona reinforcement 和经过审查的长期行为规则中生成。

禁止来源：

- raw transcript。
- provider 失败 fallback。
- 未审查的私密记忆。
- 用户事实本身。
- tombstoned source。

### 5. 失败必须可见，不使用固定人格模板遮盖

如果召回、embedding、review 写回、列表查询失败，Memory Workbench 必须显示具体模块错误。

失败可以降级，但不能伪装成“她正常这样回答”。这保持了用户之前要求的失败面治理原则。

## 总体架构

```text
WorkingMemory owner
  -> long-term candidate queue
  -> cleaning transaction store
  -> long-term projection tables
  -> policy override layer
  -> persistent vector index
  -> LongTermMemoryRecall owner
  -> MemoryWorkbench API
  -> renderer store
  -> /settings/memory UI
```

Memory Workbench API 继续作为 UI 唯一入口：

```text
electronAlicizationMemoryWorkbenchGetSnapshot
electronAlicizationMemoryWorkbenchListLongTerm
electronAlicizationMemoryWorkbenchApplyReviewAction
electronAlicizationMemoryWorkbenchRecallProbe
```

本阶段新增或扩展：

```text
electronAlicizationMemoryWorkbenchListPersonaCandidates
electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction
electronAlicizationMemoryWorkbenchReindexEmbeddings
```

## 数据模型

### 1. 长期记忆策略覆盖表

新增表：

```sql
CREATE TABLE IF NOT EXISTS long_term_memory_policy_overrides (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source TEXT NOT NULL,
  visible_mode TEXT NOT NULL,
  allow_training INTEGER NOT NULL,
  review_state TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(card_id, source_id, source)
);
```

索引：

```sql
CREATE INDEX IF NOT EXISTS idx_ltm_policy_card_source
ON long_term_memory_policy_overrides(card_id, source_id, source);

CREATE INDEX IF NOT EXISTS idx_ltm_policy_card_training
ON long_term_memory_policy_overrides(card_id, allow_training, updated_at DESC);
```

字段语义：

- `visible_mode`: `explicit` 或 `inward-only`。
- `allow_training`: `0` 或 `1`。默认继续为 `0`，避免自动训练误伤人格。
- `review_state`: `none`、`approved`、`rejected`、`tombstoned`、`inward-only`、`no-training`。
- `reason`: 用户操作原因或系统策略原因。

策略合并规则：

1. tombstone 表优先级最高，命中后不进入 recall、list 默认结果、persona candidate。
2. policy override 次之，覆盖 `visibleMode` 和 `allowTraining`。
3. source 自身 sensitivity 决定默认可见性：private 和 secret 默认 inward-only。
4. 默认 training 为 blocked，除非未来训练审批链路显式放行。

pre-admission 规则：

- review 队列里的候选尚未投影成 facts、episodes、reflections 或 consolidations。
- 对 review item 执行 `inward-only` 或 `no-training` 时，policy override 写到 candidate source ids，`source` 使用 `working_memory_long_term_candidate`。
- approve 后执行投影时，候选 policy 必须继承到最终 source ids。
- 如果同一候选投影出多个长期记忆 source，继承策略应用到每一个最终 source。
- tombstone 对 review item 生效时，同时写入 candidate source ids，后续投影不得绕过 tombstone。

### 2. 持久向量索引表

新增表：

```sql
CREATE TABLE IF NOT EXISTS long_term_memory_vectors (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  text TEXT NOT NULL,
  vector_blob BLOB NOT NULL,
  model_id TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  status TEXT NOT NULL,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(card_id, source_id, source, model_id)
);
```

索引：

```sql
CREATE INDEX IF NOT EXISTS idx_ltm_vectors_card_model
ON long_term_memory_vectors(card_id, model_id, dimensions, status);

CREATE INDEX IF NOT EXISTS idx_ltm_vectors_card_source
ON long_term_memory_vectors(card_id, source_id, source);
```

第一版采用 SQLite 持久化加内存热索引：

- SQLite 负责 durability。
- 当前 model 的 active vectors 可以按需加载到内存做 cosine search。
- 搜索必须有 topK、source、cardId、modelId、dimensions 上限。
- 后续可替换为 sqlite-vec、LanceDB 或其他本地向量 adapter，但 Workbench API 不感知具体库。

向量状态：

- `indexed`: 可用于 semantic recall。
- `stale`: source 文本或 embedding model 变化，需要 reindex。
- `failed`: 最近一次 embedding 失败。

### 3. 召回指标表

新增轻量指标表：

```sql
CREATE TABLE IF NOT EXISTS memory_workbench_recall_metrics (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  query TEXT NOT NULL,
  mode TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  evidence_count INTEGER NOT NULL,
  semantic_available INTEGER NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL
);
```

用途：

- health 显示 last latency 和 p95。
- recall probe 失败能在 UI 中透明显示。
- 后续 harness 可以复用真实用户路径的匿名指标。

保留策略：

- 只保存短文本 query，长度限制 240 字符。
- 保留最近固定数量或固定天数，由 prune 流程清理。
- 不用于 persona training。

### 4. persona 候选状态表

新增表：

```sql
CREATE TABLE IF NOT EXISTS persona_training_candidate_reviews (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  status TEXT NOT NULL,
  allow_training INTEGER NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(card_id, candidate_id)
);
```

候选内容仍由 `persona-training-candidate.ts` 从长期记忆动态构建。review 表只保存用户对候选的选择。

状态：

- `candidate`
- `approved`
- `rejected`
- `no-training`

## API 设计

### 1. 快照 API

保留：

```ts
memoryWorkbenchGetSnapshot(payload?: { sessionId?: string | null })
```

增强：

- `health.queue` 使用真实 transaction count。
- `health.recall` 使用 metrics 表。
- `health.embedding` 使用 provider 配置和 vector index 状态。
- `longTerm.total` 不再等于当前返回 items 数，而是筛选前或默认查询下的真实总数。
- `longTerm.byKind` 使用真实 projection count。

### 2. 长期记忆列表 API

保留输入：

```ts
interface AlicizationMemoryWorkbenchListPayload {
  kind?: AlicizationMemoryWorkbenchKind | 'all'
  query?: string
  sensitivity?: AlicizationMemoryWorkbenchSensitivity | 'all'
  visibility?: AlicizationMemoryWorkbenchVisibility | 'all'
  training?: AlicizationMemoryWorkbenchTrainingState | 'all'
  source?: string
  limit?: number
  cursor?: string | null
}
```

输出保持：

```ts
interface AlicizationMemoryWorkbenchListResult {
  items: AlicizationMemoryWorkbenchItem[]
  nextCursor: string | null
}
```

实现规则：

- limit 限制在 1 到 100。
- cursor 使用 base64 JSON，内容为 `{ updatedAt, id }`。
- 排序固定为 `updatedAt DESC, id ASC`。
- query 同时匹配 summary、evidence snippets、source id、source name。
- 私密和 inward-only 记忆可以在 Workbench 可见，但必须明确标注可见策略。
- tombstoned 默认不返回，后续可加“显示已删除”开关。

### 3. review 动作 API

保留：

```ts
memoryWorkbenchApplyReviewAction({
  reviewItemId,
  decision,
  reason,
})
```

动作语义：

- `approve`: 清洗 transaction 进入 admitted 流程，但 training 仍默认 blocked。
- `reject`: transaction 变 rejected，不进入长期记忆。
- `tombstone`: transaction rejected，并写入 tombstone source ids。
- `inward-only`: 写入 policy override，`visible_mode = inward-only`。
- `no-training`: 写入 policy override，`allow_training = 0`。

重要约束：

- `inward-only` 不能只是 UI 状态，必须影响后续 recall context builder。
- `no-training` 不能删除记忆，只禁止进入 persona candidate 和未来训练集。
- review 动作必须返回更新后的 review item 或 null，并刷新 snapshot。
- 对 pre-admission review item 的策略必须在投影后继承到最终长期记忆 source。

### 4. embedding 重建 API

新增：

```ts
memoryWorkbenchReindexEmbeddings({
  source?: string
  sourceIds?: string[]
  modelId?: string
  limit?: number
})
```

返回：

```ts
interface AlicizationMemoryEmbeddingReindexResult {
  scheduled: number
  indexed: number
  failed: number
  modelId: string | null
  dimensions: number | null
  errors: string[]
}
```

第一版可以同步处理小批量，也可以写入后台任务。无论同步或异步，UI 都必须看见结果。

### 5. persona 候选 API

新增：

```ts
memoryWorkbenchListPersonaCandidates({
  status?: 'candidate' | 'approved' | 'rejected' | 'no-training' | 'all'
  limit?: number
  cursor?: string | null
})
```

返回：

```ts
interface AlicizationPersonaCandidateWorkbenchItem {
  id: string
  sourceMemoryIds: string[]
  behaviorLesson: string
  positiveExample: string
  negativeExample: string | null
  privacyClass: 'public' | 'personal-redacted'
  status: 'candidate' | 'approved' | 'rejected' | 'no-training'
  allowTraining: boolean
  rejectionReason: string | null
  createdAt: number
  updatedAt: number
}
```

动作：

```ts
memoryWorkbenchApplyPersonaCandidateAction({
  candidateId: string
  decision: 'approve' | 'reject' | 'no-training'
  reason?: string | null
})
```

规则：

- approve 只代表“候选可进入未来训练集准备区”，不代表立即训练。
- no-training 永久阻断该候选进入训练集。
- rejected 保留审计，不从 UI 中静默消失。

## UI 设计

页面继续使用 `/settings/memory`。

整体风格：

- 中文优先。
- 工具型、密集、可扫描。
- 不做营销式 hero。
- 不把页面做成纯 JSON 调试器。
- 已有 tab 保留，但补齐真实内容。

### 顶部健康摘要

显示 4 到 6 个紧凑指标：

- 总体状态。
- 待审核数量。
- 队列 pending / failed。
- 最近召回延迟。
- embedding provider / indexed count。
- reindex required。

指标卡点击后切到 health tab 对应区域。

### 长期记忆 tab

增加完整控制条：

- 搜索框。
- kind 下拉。
- sensitivity 下拉。
- visibility 下拉。
- training 下拉。
- source 下拉。
- 刷新按钮。

列表项显示：

- kind、sensitivity、visibility、training。
- summary。
- evidence snippets。
- source ids。
- confidence、salience。
- createdAt、updatedAt、lastAccessedAt。

操作：

- 标记 inward-only。
- 标记 no-training。
- tombstone。
- 查看召回理由入口。

分页：

- 默认 50 条。
- 底部“加载更多”。
- 加载中状态不清空旧列表。
- 更改筛选条件时重置 cursor。

### Review tab

保留现有 approve、reject、tombstone、inward-only、no-training。

增强：

- 显示 sensitivity、visible mode、allow training。
- 显示 review reasons。
- 显示 source transaction id。
- 动作成功后局部更新并刷新 health。
- 动作失败显示具体错误。

### Probe tab

增强当前 recall probe：

- 显示 query plan。
- 显示 semantic channel 状态。
- 显示 lexical、semantic、structured、episodic rank reasons。
- 显示 latency 和 errors。
- 每条 evidence 可跳转到长期记忆项。

如果 embedding 不可用：

- 显示“语义召回未启用”。
- 仍展示 lexical / structured 结果。

### Persona tab

从占位升级为候选凝练面板。

显示：

- behavior lesson。
- positive example。
- negative example。
- privacy class。
- source memory ids。
- status。
- allow training。

操作：

- approve。
- reject。
- no-training。

说明：

- 页面只呈现候选和审查状态，不启动训练。
- 所有候选必须能追溯到 cleaned memory。
- 私密来源和 tombstone 来源不展示为候选。

### Health tab

从 JSON 直出升级为分区：

1. Queue health。
2. Recall health。
3. Embedding health。
4. Recent errors。
5. Policy summary。

仍可以保留折叠的 raw JSON，方便开发者调试。

## 后端实现边界

### DB facade

`db.ts` 继续保留 Memory Workbench facade 方法，但复杂逻辑应拆成小模块：

- `memory-workbench-policy-store.ts`
- `memory-workbench-health.ts`
- `long-term-memory-persistent-vector-store.ts`
- `memory-workbench-persona-candidates.ts`

`db.ts` 负责组合，不继续膨胀成所有逻辑的唯一文件。

### Recall owner

Recall owner 需要读取 policy overlay：

- inward-only 影响 visible mode。
- no-training 不影响 recall，但影响 persona candidate。
- tombstone 阻断 recall。

Semantic channel 接入规则：

1. query embedding 成功。
2. active model indexed count 大于 0。
3. vector search 返回候选。
4. hybrid retrieval 使用 RRF 融合 semantic rank reasons。

任一步失败都降级，不阻塞对话。

### Embedding provider

第一版 provider 可以为空。

当 provider 为空：

- health 显示 providerConfigured false。
- semantic recall unavailable。
- reindex action 返回清晰错误或 scheduled 0。

当 provider 存在：

- 写入或重建时批量 embed。
- 失败写入 vector row status failed 或 metrics error。
- 不影响原始长期记忆。

## 性能预算

主对话路径：

- 长期召回必须有时间预算。
- embedding 生成不应发生在用户等待路径，除非是手动 probe。
- 召回失败降级为 no semantic recall，不影响 visible reply。

Workbench 页面：

- snapshot 默认轻量。
- 长期列表分页。
- health 统计使用索引和聚合，不全表大对象扫描。
- persona candidates 默认分页。
- vector reindex 手动触发，默认小批量。

建议预算：

- snapshot: 200ms 内优先。
- long-term list: 300ms 内优先。
- recall probe: 1000ms 内优先，可显示较慢状态。
- vector reindex: 后台或手动进度，不阻塞页面。

## 错误处理

错误必须归类：

- `queue`: 清洗、投影、transaction 写回失败。
- `review`: 用户动作写回失败。
- `recall`: recall owner、query expansion、retrieval 失败。
- `embedding`: provider、vector index、reindex 失败。
- `persona`: candidate build 或 review 写回失败。
- `ui`: bridge/API 不可用。

UI 文案原则：

- 直接说明模块和错误摘要。
- 不使用固定人格回复遮盖。
- 不把失败 turn 纳入 persona training。
- 不让失败候选进入长期记忆。

## 测试策略

### 后端测试

新增或扩展：

- MemoryWorkbench health 真实统计测试。
- review `inward-only` 持久化测试。
- review `no-training` 持久化测试。
- tombstone 阻断 recall 和 persona candidate 测试。
- 长期记忆 keyset pagination 测试。
- 长期记忆 query/filter 组合测试。
- persistent vector store model isolation 测试。
- embedding provider unavailable degrade 测试。
- recall probe semantic channel 测试。
- persona candidate list/action 测试。

### Renderer/store 测试

新增或扩展：

- store 保存 list cursor。
- filter 变化重置列表。
- load more 追加而不是覆盖。
- review 动作刷新 snapshot。
- persona 动作刷新候选。
- health tab 不只是 raw JSON 占位。

### 页面测试

新增或扩展：

- 长期记忆筛选 UI 存在。
- 搜索输入调用 store filter。
- 加载更多按钮存在且受 nextCursor 控制。
- persona tab 显示候选字段。
- health tab 显示 queue、recall、embedding 分区。

### 验收命令

优先 targeted：

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-vector-store.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-review-queue.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

实现完成后再跑：

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck
pnpm -F @proj-alicization/stage-ui typecheck
```

## 分阶段交付

### 阶段 1: 健康指标和 review 策略持久化

交付：

- policy override 表。
- queue health 真实统计。
- recall metrics 表。
- embedding health 初版。
- `inward-only` 和 `no-training` 持久化。

完成标准：

- health 不再返回全零占位。
- review 操作刷新后仍保留策略。
- recall 和 persona candidate 尊重策略。

### 阶段 2: 长期记忆分页、搜索和筛选 UI

交付：

- keyset cursor。
- query/filter 后端实现。
- renderer store cursor/filter 状态。
- long-term tab 完整筛选 UI。
- 加载更多。

完成标准：

- 大量记忆不会一次性塞入 UI。
- 用户能按类型、敏感度、可见性、训练状态搜索。
- nextCursor 真实可用。

### 阶段 3: 持久 vector index 和 embedding 闭环

交付：

- persistent vector store。
- embedding health。
- reindex action。
- semantic recall channel 接入 probe。
- semantic unavailable 显性降级。

完成标准：

- app 重启后向量索引仍在。
- 不同 modelId/dimensions 不混查。
- embedding 失败不影响普通对话。

### 阶段 4: Persona 候选凝练面板

交付：

- persona candidates API。
- persona candidate review 表。
- persona tab UI。
- approve/reject/no-training 操作。

完成标准：

- 候选来自 cleaned long-term memory。
- 私密和 tombstoned 来源不会进入候选。
- 用户能看见并控制未来训练候选。

### 阶段 5: 端到端验收

交付：

- 记忆中心完整回归测试。
- 召回 probe dogfood。
- UI smoke。
- 类型检查。

完成标准：

- 用户能解释她为什么想起某条记忆。
- 用户能限制某条记忆只 inward carry。
- 用户能禁止某条记忆进入训练。
- 用户能搜索和分页浏览长期记忆。
- 用户能看见 embedding 是否真正工作。
- 用户能审查 persona 候选，而不是让系统暗中学习。

## 验收问题

本阶段完成后，系统必须能回答：

- 现在长期记忆队列是否健康？
- 最近召回是否失败或变慢？
- embedding provider 有没有配置？
- 当前向量索引是否需要重建？
- 某条记忆为什么可以显性说出，或者为什么只能 inward-only？
- 某条记忆是否允许进入训练候选？
- 某条 persona 候选来自哪些 cleaned memory？
- 用户禁止训练后，重启应用是否仍然生效？
- 用户搜索“打游戏”时，能否分页找到相关 episode 或 reflection？

## 推荐实现顺序

严格按下面顺序进入 implementation plan：

1. 数据表和 DB facade。
2. review 策略持久化。
3. health 真实统计。
4. 长期记忆列表 cursor 和 filters。
5. renderer store 筛选和分页。
6. long-term tab UI。
7. persistent vector store。
8. embedding health 和 reindex API。
9. recall probe semantic channel。
10. persona candidate API。
11. persona tab UI。
12. 端到端测试和类型检查。

这个顺序保证每一步都有可测试产物，也避免先做漂亮 UI 后端仍是假状态。
