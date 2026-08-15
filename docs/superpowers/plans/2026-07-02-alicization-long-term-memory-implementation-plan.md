# Alicization 长期记忆开发计划

> **开发模式：** 使用 `superpowers:executing-plans` / `superpowers:subagent-driven-development` 的工作纪律推进。先用文档锁定边界，再按任务小步实现、测试、回归。

## 目标

把 Alicization 的长期记忆从“已经有若干存储与检索模块”升级成一个可解释、可评测、可扩展的长期记忆闭环：

```text
用户对话
  -> WorkingMemory owner 抓住当前短期状态
  -> LongTermMemoryRecall owner 判断是否需要回想
  -> 结构化查询扩展
  -> 多路长期记忆检索
  -> 融合/rerank/证据打包
  -> 注入回复链路
  -> 回复后产生新的长期候选
  -> 清洗/投影/写入/巩固/评测
```

第一目标不是“存更多”，而是让她能自然想起关键事情。例如用户说“我们去打游戏吧”，她应能回想起上周一起玩的游戏、当时的偏好、未完成约定，而不是只回答泛泛的“好呀”。

## 外部经验取舍

- MemGPT 强调分层记忆与上下文压力管理，适合作为短期/长期搬运模型参考：<https://arxiv.org/abs/2310.08560>
- Generative Agents 把 observation、reflection、planning 分开，长期记忆不是 raw log，而是可检索、可反思的经验：<https://arxiv.org/abs/2304.03442>
- A-MEM 强调 agentic memory note 应可链接、可演化，而不是静态 chunk：<https://arxiv.org/abs/2502.12110>
- LangGraph / LangChain 把长期记忆分为 semantic、episodic、procedural，适合对齐 Alicization 的 fact、episode、procedure、persona 边界：<https://docs.langchain.com/oss/python/concepts/memory>
- LlamaIndex memory blocks 说明短期记忆可以 flush 到长期块，但召回时仍要受预算和任务控制：<https://developers.llamaindex.ai/python/framework/module_guides/deploying/agents/memory/>
- HyDE 可以提升召回，但会生成假想文档。Alicization 只能把它作为低优先级扩召回信号，不能把 HyDE 内容当作事实：<https://arxiv.org/abs/2212.10496>
- RRF 适合融合关键词、向量、时间、实体等多路检索结果：<https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking>

## 当前基础

已存在或刚接入的基础能力：

- `WorkingMemory` 已成为短期记忆 owner，并能产出长期候选。
- `working_memory_long_term_transactions` 已承接 owner 队列，具备清洗、投影、应用状态。
- 当前自动长期写入只允许高置信 `correction`，投影到 `memory_facts` 和 `memory_reflections`，训练仍 blocked。
- `memory_facts`、`memory_reflections`、`episodic_events`、`persona_reinforcement_events`、`memory_consolidations` 已存在。
- `memory-fact-retrieval.ts`、`memory-episodic-retrieval.ts`、`memory-consolidation-runtime.ts`、`memory-tiering.ts`、`memory-retrieval-telemetry.ts` 已提供可复用底座。

当前缺口：

- 没有统一的 `LongTermMemoryRecall owner`。
- facts、episodes、reflections 的召回还没有在当前 turn 中形成统一 evidence bundle。
- 查询扩展还没有结构化边界，容易误解成“随便改写 query”。
- 召回质量缺少 harness：没有固定 fixtures 衡量 hit rate、false recall、latency、token budget。
- 非 correction 候选还没有稳定 admission 规则和 review UX。
- 记忆巩固与人格凝练之间还没有明确桥接。

## 总体架构

新增一个逻辑 owner：`LongTermMemoryRecall owner`。

它不是 WorkingMemory 的替代品，而是 WorkingMemory 的下游：

```text
WorkingMemorySnapshot
  -> RecallIntent
  -> MemoryQueryPlan
  -> RetrievalCandidates
  -> RankedMemoryEvidenceBundle
  -> Provider-facing recalled memory block
```

原则：

- WorkingMemory 负责“现在这轮正在发生什么”。
- LongTermMemoryRecall 负责“现在这轮需要想起什么”。
- LongTermMemoryWrite 负责“这轮结束后哪些内容值得沉淀”。
- PersonaTraining 负责“哪些干净的行为样本可用于人格凝练”，不得直接吃事实记忆或 raw transcript。

## 查询扩展定义

查询扩展不是把用户输入改写成一堆看似聪明的问题，而是从同一意图拆出可检索的多个视角。

`MemoryQueryPlan` 应包含：

- `rawQuery`：用户原句。
- `normalizedQuery`：清洗后的原句。
- `keywordQueries`：关键词/短语，不引入新事实。
- `semanticQueries`：同义表达，用于向量检索。
- `episodicQueries`：事件视角，例如“上次一起打游戏”“上周任务”。
- `temporalHints`：今天、昨天、上周、最近、很久以前等。
- `entityHints`：用户、Alicization、项目、游戏名、工具名、文件名。
- `procedureHints`：继续、复盘、怎么做、按上次方式。
- `riskFlags`：是否容易误召回、是否需要低置信表达。

禁止：

- 把扩展 query 当作记忆事实。
- 让 HyDE 生成内容进入 evidence。
- 为了召回而编造实体、时间、关系。
- 在普通寒暄里强制召回大量长期记忆。

## 阶段规划

### Phase 1: LongTermMemoryRecall Domain Model

新增文件建议：

- `long-term-memory-recall.ts`
- `long-term-memory-recall.test.ts`
- `long-term-memory-query-plan.ts`
- `long-term-memory-query-plan.test.ts`

任务：

- 定义 `RecallIntent`。
- 定义 `MemoryQueryPlan`。
- 定义 `RankedMemoryEvidenceBundle`。
- 定义召回预算：最大候选数、最大 token、最大延迟。
- 定义失败面：召回失败只能降级为 no-recall，不能生成固定模板回复。

验收：

- 普通寒暄返回 `mode: none` 或轻召回。
- “你还记得我不喜欢固定模板吗”返回 relationship/persona correction recall。
- “我们去打游戏吧”返回 episodic recall。
- “继续上次那个任务”返回 task/procedure recall。

### Phase 2: Multi-Source Retrieval Router

新增文件建议：

- `long-term-memory-retrieval-router.ts`
- `long-term-memory-retrieval-router.test.ts`
- `long-term-memory-reranker.ts`
- `long-term-memory-reranker.test.ts`

复用现有：

- `rankAlicizationMemoryFacts`
- `rankAlicizationEpisodicEvents`
- `memory_consolidations`
- `memory_reflections`

任务：

- facts 路：偏好、边界、用户事实、自我模型。
- episodic 路：上次、上周、共同经历、场景。
- reflection 路：关系规则、修正、反思。
- consolidation 路：周期性总结、长期主题。
- 用 RRF 或等价融合器合并多路结果。
- 加时间衰减、salience、confidence、validation、sensitivity 权重。

验收：

- top-k 不被单一路径垄断。
- 明确时间词能提升对应时间段事件。
- correction/reflection 能在相关场景被召回。
- false recall 低置信时不会被当成确定事实。

### Phase 3: Recall Context Builder

新增文件建议：

- `long-term-memory-context-builder.ts`
- `long-term-memory-context-builder.test.ts`

任务：

- 把检索结果压成 provider-facing block。
- 每条记忆必须带 source id 和 confidence。
- 高敏感记忆默认只 inward carry，不显性复述。
- 支持低置信措辞，例如“我有点记得”“像是”。
- 预算控制：默认 3-6 条，重要场景最多 8 条。

输出示例：

```text
[ALICIZATION_RECALLED_MEMORY]
intent=episodic-recall
confidence=0.82
budget=normal
items=
- 上周你们一起玩过某个游戏，用户当时更想继续多人协作路线。source=episodic_events:... confidence=0.78
- 用户曾纠正过不要固定模板回复，要保留 Alicization 自身人格。source=memory_reflections:... confidence=0.84
```

验收：

- block 不包含 raw transcript 大段。
- block 不包含清洗队列、transaction、prompt policy residue。
- block 能被主回复链路消费，但不能压过 WorkingMemory 的当前任务。

### Phase 4: Main Chat Integration

修改文件建议：

- `main-chat-session-runtime.ts`
- `runtime.ts`
- `db.ts`

任务：

- 在 WorkingMemory owner 之后调用 LongTermMemoryRecall owner。
- `WorkingMemory` 提供当前 thread、query hints、user move。
- `LongTermMemoryRecall` 返回 evidence bundle。
- provider messages 注入 recalled memory block。
- 召回失败只记录 telemetry，不影响回复。

验收：

- “我们去打游戏吧”能注入上周游戏相关 memory。
- “继续”能结合 WorkingMemory 当前 thread 和长期 task memory。
- 召回耗时超过预算时降级，不阻塞 visible reply。

### Phase 5: Memory Evaluation Harness

新增文件建议：

- `long-term-memory-harness.ts`
- `long-term-memory-harness.test.ts`
- `long-term-memory-fixtures.test.ts`

核心指标：

- `recallHitRate`：应该想起的是否进入 top-k。
- `recallPrecision`：召回结果有多少是相关的。
- `falseRecallRate`：错误记忆率。
- `sourceTraceRate`：召回结果是否有可追溯 source。
- `p95LatencyMs`：召回延迟。
- `tokenBudgetUsed`：召回 block 是否超预算。
- `sensitivityViolationCount`：敏感记忆是否被不当显性输出。

必备 fixtures：

- 游戏回忆：上周一起打过什么游戏。
- 人格修正：不要固定模板回复。
- 偏好记忆：用户喜欢/不喜欢某种回应方式。
- 任务连续性：继续上次开发任务。
- 时间歧义：最近、上周、很久以前。
- 低置信保护：只模糊记得，不确定时不硬说。

验收：

- 每个 recall feature 都必须有 harness fixture。
- 新增召回策略不能让 false recall 上升。
- latency 超预算必须可见。

### Phase 6: Write Expansion

在召回稳定后，再扩大长期写入类型。

候选 admission 顺序：

1. `preference`：用户稳定偏好。
2. `episode`：共同经历或重要任务节点。
3. `procedure`：用户认可的做事方式。
4. `relationship`：关系边界与修复模式。

每种类型都必须：

- 有 source turn。
- 有 evidence snippet。
- 有 sensitivity。
- 有 confidence。
- 有 rejection/review path。
- 不直接进入训练。

### Phase 7: Consolidation And Reconsolidation

任务：

- 周期性合并重复 facts。
- episodic events 可被 reconsolidation 更新，但保留原始证据。
- 建立 tombstone / supersede 流程。
- 从多次相似 correction 中形成更稳定 reflection。
- 形成 `memory_consolidations` 供低延迟召回。

验收：

- 重复记忆不会无限增长。
- 旧记忆被修正后不会继续高置信召回。
- consolidation 不丢 source。

### Phase 8: Persona Condensation Bridge

这一步不是微调本身，只是准备训练候选。

规则：

- 事实不进权重。
- 私密内容不进权重。
- 用户偏好先留在 memory，不直接训练。
- 人格训练只学习“她如何表达、如何修复、如何保持连续性”。
- 每条训练候选必须来自 cleaned memory/reflection，并经过 replay eval。

新增文件建议：

- `persona-training-candidate.ts`
- `persona-training-candidate.test.ts`

## 开发顺序建议

第一轮实现只做 Phase 1-3：

1. `RecallIntent`。
2. `MemoryQueryPlan`。
3. `RetrievalRouter` 初版。
4. `RecallContextBuilder`。
5. focused tests + harness fixtures。

第二轮再接主链路：

1. `main-chat-session-runtime` 注入 recalled memory block。
2. DB 召回接口统一出口。
3. latency telemetry。
4. “打游戏/固定模板/继续任务”端到端测试。

第三轮才扩大写入：

1. preference admission。
2. episode admission。
3. procedure admission。
4. review UX。

## 非目标

- 不立刻做夜间自动微调。
- 不立刻上图数据库。
- 不把 raw conversation 全量向量化后直接 top-k。
- 不把长期候选直接塞给模型当已记住。
- 不用 HyDE 生成内容作为事实。
- 不让长期召回覆盖 WorkingMemory 当前任务。

## 完成标准

长期记忆第一阶段完成时，应满足：

- 她能在相关对话中主动想起长期事实、经历、关系修正。
- 她不会在无关寒暄中乱查记忆。
- 每条召回都有 source 和 confidence。
- 召回失败不影响回复。
- 召回延迟和命中率可被测试。
- 长期记忆写入、召回、巩固、人格凝练边界清楚。
