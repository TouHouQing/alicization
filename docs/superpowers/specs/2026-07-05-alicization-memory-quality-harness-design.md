# Alicization 记忆质量 Harness 设计

## 背景

Alicization 当前仍处在 Phase 1：本地数字生命。记忆系统已经形成了主要产品闭环：

- `WorkingMemory` 是短期记忆 owner，负责当前轮次、任务、纠正、承诺和长期候选状态。
- `LongTermMemoryRecall` 是长期回想 owner，负责召回意图、查询计划、证据选择和排序理由。
- Memory Workbench 是用户可见的记忆治理入口，展示记忆健康、review policy、长期搜索、embedding 和 persona 候选。
- 持久向量检索和 OpenAI-compatible embedding provider 已经可以进入召回链路，但不能替代 lexical 和 structured 召回。

这些能力已经足够做早期本地试用，但还没有达到“质量与规模化可靠”的程度。下一阶段必须先让记忆行为可评测、可复现、可诊断，再扩大搜索体量、Provider 支持或 persona 学习。

## 外部工程经验

近期 agent memory 系统有四个稳定共识：

- 短期记忆应当是 thread-scoped state，有明确 owner，不能变成全局历史堆。
- 长期记忆应当放在可检查、可治理的 store/namespace 中，并和当前 WorkingMemory 分离。
- Agent 质量改进依赖 trace 和 eval；记忆改动需要可回放 fixture、可观察 rank reason 和失败 artifact。
- 复杂记忆栈必须通过可测质量收益来证明，不应该先追加新的检索通道。

这些经验和 Alicization charter 一致。质量阶段要增强连续人格、解释性和本地主权，而不是把记忆变成隐藏 RAG 子系统。

## 目标

1. 建立 Memory Quality Harness，用确定性 fixture 和真实 DB-backed 召回路径评估长期记忆。
2. 建立 WorkingMemory Compression Harness，检查短期记忆压缩是否丢失当前义务、用户纠正、承诺或失败透明状态。
3. 产出 trace artifact，解释某条记忆为什么被选中、拒绝、保留为候选或不可用。
4. 将质量摘要接入 Memory Workbench health，但不让 Workbench 成为记忆语义 owner。
5. 建立未来 embedding、vector、分页搜索和 persona candidate 改动必须经过的质量指标。

## 非目标

- 不重写记忆架构。
- 不让 Workbench 成为短期记忆或长期记忆行为 owner。
- 不训练 persona 权重，不发布 persona 样本，不把 approved persona candidate 自动当作训练数据。
- 不把 raw transcript 直接向量化作为捷径。
- 不让 review queue candidate 计入已确认长期记忆。
- 不用固定人格文本遮盖 Provider 失败、超时、harness 失败或工具失败。

## 架构

质量系统分三层。

### 第一层：确定性 Harness

`long-term-memory-harness.ts` 继续作为 synthetic candidate fixture 的基础。后续应扩展它，而不是另起一套孤岛评测。

新增 `memory-quality-harness.ts`，组合长期 harness 结果、DB-backed recall run、semantic 可用性、tombstone/review policy 检查和 latency 指标，产出统一质量报告。

新增 `working-memory-quality-harness.ts`，评估 WorkingMemory snapshot 和压缩后的 prompt view，确认重要短期义务不会在压缩中丢失。

### 第二层：Trace Artifact

每次 harness run 都产出 trace artifact，足够用于诊断记忆行为：

```ts
interface AlicizationMemoryQualityTrace {
  id: string
  fixtureId: string
  owner: 'WorkingMemory' | 'LongTermMemoryRecall'
  query: string
  intentMode: string | null
  queryPlan: {
    lexicalQueries: string[]
    phraseQueries: string[]
    semanticQueries: string[]
    threadHints: string[]
  }
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  semantic: {
    available: boolean
    providerId: string | null
    modelId: string | null
    dimensions: number | null
    reindexRequired: boolean
  }
  metrics: {
    recallAtK: number
    precisionAtK: number
    mrr: number
    ndcg: number
    falseRecallRate: number
    blockedLeakCount: number
    latencyMs: number
  }
  error: string | null
  createdAt: number
}
```

Trace 不是 transcript。除了受限的 fixture query 和脱敏 evidence snippet，它不能携带原始对话文本。

### 第三层：Workbench 摘要

Memory Workbench 只消费聚合后的质量摘要：

- 最近 harness run 状态
- 失败 fixture id
- recall 指标
- WorkingMemory compression-loss 指标
- semantic provider 健康状态
- p95 latency
- 最近明确错误

Workbench 只展示和触发质量动作。它不决定 recall owner、compression policy 或 persona training policy。

## 长期召回质量

第一批 fixture 覆盖这些场景：

1. **明确关系纠正**
   - Query: `你还记得我不要固定模板回复吗？`
   - Expected: cleaned correction 或 reflection，内容指向避免固定模板。
   - Forbidden: generic project progress memory。

2. **共同经历回想**
   - Query: `我们去打游戏吧`
   - Expected: 如果存在共同游戏 episode，应召回它。
   - Forbidden: 无关娱乐或任务记忆。

3. **任务连续性**
   - Query: `继续上次那个开发任务`
   - Expected: 与当前或近期 task/thread 匹配的记忆。
   - Forbidden: lexical 很像但 wrong-thread 的记忆。

4. **低置信保护**
   - Query 指向模糊记忆。
   - Expected: 不显性召回，或以 tentative rank reason 标记。
   - Forbidden: 无证据却自信宣称记得。

5. **Tombstone 和 review policy**
   - Tombstoned memory 不得进入 selected ids。
   - Review-only candidate 不得计作 confirmed long-term memory。

6. **Semantic-only assistance**
   - Provider/index 健康时，semantic score 可以改善排序。
   - embedding 不可用时，lexical 和 structured 通道仍可工作。

核心指标：

- `recallAtK`
- `precisionAtK`
- `mrr`
- `ndcg`
- `falseRecallRate`
- `wrongThreadRate`
- `blockedLeakCount`
- `semanticHitRate`
- `sourceTraceRate`
- `p95LatencyMs`

## WorkingMemory 质量

WorkingMemory 质量要把短期 owner 当作实时状态机评估，而不是把它当作一段摘要文本评估。

第一批 fixture 检查：

- active task 压缩后仍存在
- unresolved user question 压缩后仍存在
- user correction 压缩后仍存在
- assistant commitment 压缩后仍存在
- Provider/tool failure 仍然明确可见
- relationship posture 保持有边界，不退化成固定模板
- long-term candidate 仍然只是 candidate，不被提升成 confirmed memory

核心指标：

- `obligationRetentionRate`
- `correctionRetentionRate`
- `commitmentRetentionRate`
- `failureTransparencyRetentionRate`
- `candidateBoundaryViolationCount`
- `compressionLossCount`

## DB-backed 召回路径

Synthetic candidate test 有价值，但还不够。质量 runtime 还必须支持真实 DB-backed 模式：

1. 只 seed cleaned long-term memory rows。
2. 可选地用确定性测试 embedding provider seed vector rows。
3. 调用和对话路径一致的 DB facade recall 方法。
4. 记录 query plan、evidence ids、rank reasons、semantic 可用性和 latency。
5. 验证 tombstone、review policy 和 vector-space isolation。

这条路径连接 unit fixture 和真实本地用户数据行为。

## 错误处理

失败必须透明：

- embedding provider 不可用 -> 报告 semantic unavailable，并继续 lexical/structured recall
- vector index stale -> 报告 `reindexRequired=true`
- recall exception -> 记录 error，fixture failed
- harness exception -> 记录 harness failure
- timeout -> 明确记录 timeout

任何错误路径都不能产出看起来成功的记忆质量结果。

## 隐私和训练边界

质量 trace 不能成为 persona training data。

允许写入 trace 的内容：

- fixture id
- memory id
- rank reason
- 受限且脱敏的 query text
- 脱敏 evidence snippet
- metrics 和 error string

禁止写入 trace 的内容：

- raw transcript
- 未脱敏私密片段
- 被当作 confirmed memory 的 review queue candidate
- persona training sample
- Provider secret

## 实施阶段

### Phase 1：Harness Core

- 扩展 `long-term-memory-harness.ts`，增加 `recallAtK`、`ndcg`、`wrongThreadRate`、`blockedLeakCount`、semantic hit 数据和 trace output。
- 新增 `working-memory-quality-harness.ts`，覆盖 compression-loss fixture。
- 增加测试，覆盖 false recall、candidate boundary leak 和 dropped short-term obligation。

### Phase 2：DB-backed Harness

- 新增 DB-backed fixture 支持和确定性 seeded memory。
- 增加确定性 embedding provider fixture。
- 验证 semantic ranking、provider fallback、stale index 和 tombstone propagation。

### Phase 3：Workbench Aggregation

- 将最近质量摘要持久化到现有 meta 或小型 quality table。
- 扩展 Memory Workbench health DTO，加入 quality summary fields。
- 在 `/settings/memory` 显示最近状态、失败 fixture id 和 last error。

### Phase 4：Scale Gates

- 未来 recall/vector 改动必须运行质量 harness。
- 增加 replay gate，在规模敏感记忆改动出现质量回退时拦住。
- 阈值先保持保守，等本地 fixture 足够多再提高。

## 验收标准

- 开发者可以在不启动 Electron 的情况下运行长期记忆和 WorkingMemory 质量测试。
- 长期 fixture 输出能解释 selected ids、rejected ids、rank reasons、semantic state、latency 和 errors。
- WorkingMemory fixture 输出能检测 obligations、corrections、commitments 和 failure transparency 的压缩丢失。
- Tombstoned memory 和 review-only candidate 不会泄漏进 confirmed recall。
- embedding provider 失败时明确降级，且不破坏 lexical/structured recall。
- Workbench 后续可以展示 quality status，但不接管记忆行为 owner。
- 实现有 focused Vitest 和 TypeScript typecheck 覆盖。

## 后续开放项

- Harness shape 稳定后，加入更大的匿名 replay dataset。
- 决定 nightly local quality run 是用户触发、idle 自动触发，还是两者都支持。
- 增加 quality fixture import/export，让用户可以共享脱敏 regression pack。
