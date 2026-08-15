# Alicization 长期记忆第二阶段开发计划

> **承接文档：** `2026-07-02-alicization-long-term-memory-implementation-plan.md`
>
> **当前状态：** 已完成最小长期召回主干：`LongTermMemoryRecall owner -> DB unified evidence -> [ALICIZATION_RECALLED_MEMORY] block -> main chat runtime`。第二阶段目标是把这条主干做准、做稳、做可评测，再扩大写入与人格凝练桥接。

## 总目标

让 Alicization 的长期记忆从“能召回”升级为“召回得准、召回得快、召回得有边界、能持续变好”。

第二阶段必须解决六件事：

1. 建立长期记忆评测 harness。
2. 优化中文查询、查询扩展和召回意图。
3. 引入 hybrid retrieval：关键词、结构化字段、向量、时间、salience、confidence 融合。
4. 扩大长期写入 admission：`preference`、`episode`、`procedure`、`relationship`。
5. 做 review / privacy / tombstone 的用户可控链路。
6. 建立 persona training candidate 桥接，但继续禁止自动微调。

## 非目标

- 不在本阶段自动夜间微调。
- 不直接把 raw transcript 全量向量化后 top-k。
- 不用 HyDE 生成文本作为事实。
- 不把 review 队列内容当作已确认长期记忆。
- 不引入图数据库作为硬依赖。
- 不让长期召回覆盖 WorkingMemory 当前任务 owner。

## Phase 2A: 长期记忆评测 Harness

优先级最高。没有 harness，不继续优化召回。

### 文件建议

- `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-fixtures.test.ts`

### 核心指标

- `recallHitRate`: 应该被想起的 memory 是否进入 top-k。
- `precisionAtK`: top-k 有多少相关。
- `mrr`: 目标 memory 排名是否靠前。
- `falseRecallRate`: 错误记忆率。
- `wrongThreadRate`: 高词面相似但错误线程的误召回率。
- `sourceTraceRate`: 召回结果是否有 source id。
- `sensitivityViolationCount`: private / secret 是否被显性输出。
- `p95LatencyMs`: 召回耗时。
- `tokenBudgetUsed`: recalled block 是否超预算。

### 最小 Fixtures

1. 游戏回忆
   用户说“我们去打游戏吧”，目标召回上周一起玩过的游戏。

2. 人格纠正
   用户说“别忘了我不要固定模板”，目标召回 correction fact/reflection。

3. 任务连续性
   用户说“继续上次那个开发任务”，目标召回相关 task / procedure / consolidation。

4. 偏好记忆
   用户说“按我喜欢的方式来”，目标召回 preference fact。

5. Wrong-thread suppression
   一个候选词面更像但线程错误，另一个词面弱但同线程，要求后者胜出。

6. 低置信保护
   召回结果不确定时只能 `tentative`，不能强说。

### 验收

- harness 可独立跑，不依赖完整 main chat。
- 每个 fixture 都能声明 expected ids、forbidden ids、top-k 要求。
- 后续任何召回算法改动必须跑 harness。

## Phase 2B: 中文查询与 Query Expansion

当前最明显的问题：中文连续短语 lexical tokenizer 脆弱，例如“你还记得我不要固定模板回复吗”不一定打中“不要固定模板回复”。

### 文件建议

- `long-term-memory-query-expansion.ts`
- `long-term-memory-query-expansion.test.ts`
- 修改 `long-term-memory-recall.ts`

### 设计

`MemoryQueryPlan` 应增加：

- `charGramQueries`: 中文 2-4 gram。
- `phraseQueries`: 从中文句子抽出的关键短语。
- `negativeCues`: “不是催进度”“不是固定模板”等否定语义。
- `threadHints`: 来自 WorkingMemory 当前 thread / active task。
- `confidencePolicy`: 高置信、低置信、只内在约束。

### 禁止

- 不引入新事实。
- 不把 query expansion 内容写入记忆。
- 不让模型自由发挥生成“可能的记忆”。

### 验收

- “你还记得我不要固定模板回复吗”能召回 `不要固定模板回复`。
- “不是催进度，是看她是不是同一个她”能召回人格连续性纠正，而不是泛化为项目进度。
- 普通寒暄不会生成宽召回 query。

## Phase 2C: Hybrid Retrieval And RRF

### 文件建议

- `long-term-memory-hybrid-retrieval.ts`
- `long-term-memory-rrf.ts`
- `long-term-memory-hybrid-retrieval.test.ts`

### 检索通道

- lexical: 当前 query / phrase / char-gram。
- structured: kind、domain、thread、time、sensitivity。
- semantic: 后续接 embedding。
- episodic: 时间、场景、共同经历。
- consolidation: 长周期总结。

### 融合策略

先实现 RRF，不急着做复杂学习排序：

```text
score = rrf(lexicalRank, semanticRank, episodicRank, structuredRank)
      + confidenceBoost
      + salienceBoost
      + temporalFit
      - sensitivityPenalty
      - wrongThreadPenalty
      - contradictionPenalty
```

### 验收

- 单一路径不能垄断结果。
- 旧但高 salience 的记忆不会被时间衰减抹掉。
- wrong-thread 高词面相似候选会被压下去。
- RRF 输出必须保留各通道 rank reason。

## Phase 2D: Embedding / Vector Adapter

向量模型是必要的，但必须通过 adapter 接入，不绑定单一模型。

### 文件建议

- `long-term-memory-embedding-provider.ts`
- `long-term-memory-vector-store.ts`
- `long-term-memory-vector-store.test.ts`

### Adapter 接口

```ts
interface LongTermMemoryEmbeddingProvider {
  embedTexts: (texts: string[]) => Promise<Array<{ text: string, vector: number[] }>>
  modelId: string
  dimensions: number
}
```

### 本地优先策略

- 默认支持本地 embedding provider。
- 云端 embedding 只能作为可选配置。
- 每条 embedding 记录必须保存 `modelId` 和 `dimensions`。
- 更换 embedding model 时必须支持 reindex，不可混用向量空间。

### 存储策略

第一版可以先抽象接口，不强依赖具体库：

- `upsertVectors(records)`
- `searchVectors(queryVector, filters)`
- `deleteVectorsBySource(sourceIds)`
- `reindexByModel(modelId)`

### 验收

- 没有 embedding provider 时系统仍可 lexical/hybrid 召回。
- embedding 失败不影响回复。
- 不同 embedding model 的向量不能混查。

## Phase 2E: Long-Term Write Expansion

在召回 harness 稳定后，再扩大写入类型。

### admission 顺序

1. `preference`
2. `episode`
3. `procedure`
4. `relationship`

### 文件建议

- 修改 `working-memory-policy.ts`
- 修改 `working-memory-long-term-cleaner.ts`
- 修改 `working-memory-long-term-projection.ts`
- 新增对应 tests

### 每类写入规则

`preference`:

- 用户明确表达稳定偏好。
- 不能从一次玩笑直接推断。
- 默认写 `memory_facts`，高敏感进 review。

`episode`:

- 共同经历、关键任务节点、强情绪节点。
- 默认写 `episodic_events`。
- 必须有时间或 thread anchor。

`procedure`:

- 用户认可的可复用做事方式。
- 默认写 `memory_facts(memoryDomain=procedure)` 或 consolidation。
- 必须能被后续“按上次方式”召回。

`relationship`:

- 边界、修复、亲密度、表达偏好。
- 默认写 reflection，重要项可投 persona reinforcement。
- 高敏感必须 review。

### 验收

- 所有非 correction 写入都有 review 或 clear admission rule。
- 写入后可被 Phase 2A harness 召回。
- `allowTraining` 继续不自动放行。

## Phase 2F: Review / Privacy / Tombstone

### 文件建议

- `long-term-memory-review-queue.ts`
- `long-term-memory-review-queue.test.ts`
- renderer/devtools 后续接 UI 面板

### 状态

- `needs-user-review`
- `approved`
- `rejected`
- `tombstoned`
- `superseded`

### 用户能力

- 查看将要记住什么。
- 批准/拒绝/删除记忆。
- 标记“不要用于训练”。
- 标记“只作为内在约束，不要说出来”。
- 查看为什么召回了某条记忆。

### 验收

- review 结果能回写 transaction。
- tombstone 后召回与训练候选都不可再使用。
- private/secret 默认不显性输出。

## Phase 2G: Persona Training Candidate Bridge

这不是训练，只是生成候选。

### 文件建议

- `persona-training-candidate.ts`
- `persona-training-candidate.test.ts`

### 规则

- 事实不进权重。
- 私密内容不进权重。
- correction/reflection 可生成“行为样本候选”，但必须脱敏。
- 训练候选必须通过 replay eval。
- 训练候选必须可 rollback。

### 输出

```ts
interface PersonaTrainingCandidate {
  id: string
  sourceMemoryIds: string[]
  behaviorLesson: string
  positiveExample: string
  negativeExample?: string
  privacyClass: 'public' | 'personal-redacted'
  status: 'candidate' | 'approved' | 'rejected'
}
```

### 验收

- 不从 raw transcript 直接产训练样本。
- 不把用户事实当人格权重。
- 所有候选都能追溯到 cleaned reflection / memory。

## 推荐开发顺序

严格按这个顺序：

1. Phase 2A harness。
2. Phase 2B 中文 query expansion。
3. Phase 2C hybrid retrieval / RRF。
4. Phase 2D embedding adapter。
5. Phase 2E write expansion。
6. Phase 2F review / privacy / tombstone。
7. Phase 2G persona training candidate bridge。

不要先写向量库，不要先写微调，不要先做 UI。先把 recall 质量测出来。

## 第一轮开发任务

第一轮只做 2A + 2B：

- 新增 `long-term-memory-harness.ts`
- 新增 harness tests
- 新增 `long-term-memory-query-expansion.ts`
- 把 char-gram / phrase query 接入 `MemoryQueryPlan`
- 补 DB regression：中文短语能召回 `不要固定模板回复`
- 补 wrong-thread fixture

## 第一轮完成标准

- “你还记得我不要固定模板回复吗”能命中 correction。
- “我们去打游戏吧”能命中游戏 episode。
- “不是催进度，是看她是不是同一个她”能压过 generic progress memory。
- 普通寒暄不触发宽召回。
- focused tests + node typecheck 通过。
