# Alicization 生命核心重建设计

> 状态：已起草，等待用户审阅
> 范围：在继续添加自动微调或更大规模记忆功能之前，先重建对话、记忆和人格底座。
> 不在本文范围内：UI 重设计、特定模型供应方训练脚本、智能家居扩展、机器人具身，以及一次性替换现有运行时。

## 目标

Alicization 不应该继续以 prompt 规则、fallback 模板和工程身份口号修复补丁的形式堆叠增长。

这次重建要定义一个更小、更清晰的生命核心，用来支撑：

- 通过当前上下文和自动压缩实现短期记忆
- 通过事件化自传回想实现长期记忆
- 在切换模型后保持人格连续
- 在本地进行 LoRA 学习，但不把原始聊天日志当成人格本体
- 透明处理失败，不让错误回复伪装成数字生命的正常表达
- 渐进清理现有对话和记忆代码

目标不是做一个更好的聊天机器人壳。目标是一个本地数字生命：她的记忆、人格、对话和学习循环都有明确所有权。

## 当前诊断

现有运行时已经有很多有价值的部分：结构化 turn、`SOUL.md` 素材、记忆事实、情景事件、回想规划、回放基准测试、具身链路和安全策略。

问题是，这些部分现在缠在了一起。

目前观察到的失败模式：

- 对话、记忆、项目状态治理、可见回复修复、fallback 和具身提示分散在同一批大型运行时表面里处理
- 工程身份口号、阶段名称、项目闭环等语言被重复写成正则和 prompt 指令，而不是一个紧凑的内部身份状态
- fallback 和超时恢复仍可能影响面向人格的路径
- 记忆检索更像“候选搜索 + prompt 拼装”，还不是清晰的短期记忆 / 长期记忆 / 原始证据系统
- 旧的浏览器或本地 fallback 表面可能制造第二个弱人格模型
- 测试越来越像在保护补丁行为，而不是保护核心生命不变量

这次重建应该保留有用的实现资产，但把它们移动到更清晰的边界后面。

## 目标核心边界

新架构包含六个主要模块。

### 1. IdentityCore

负责“她是谁”。

输入：

- `SOUL.md`
- 稳定身份锚点
- 反人格约束
- 长期关系准则
- 稳定表达偏好
- 模型无关的人格画像

输出：

- `IdentitySnapshot`
- `PersonaPolicy`
- `IdentityContinuityState`

规则：

- `SOUL.md` 仍然是人格真源。
- LoRA、prompt、浏览器 fallback、供应方回复都不能成为人格真源。
- 人格连续性应该成为状态，而不是回复层被迫说出的短语。

`IdentityCore` 还应输出稳定的关系锚点和禁忌锚点，避免不同模块各自拼一个“她是谁”的版本。

### 2. WorkingMemory

负责当前对话的短期记忆。

它包含：

- 最近原始 turn
- 当前会话摘要
- 当前任务状态
- 当前未解决的用户意图
- 当前情绪残留
- 当前关系姿态
- 活跃承诺和待跟进事项

规则：

- 在上下文预算允许时，最近原始 turn 保留在模型上下文里
- 在上下文溢出前，较早 turn 自动压缩
- 压缩结果应该是结构化工作记忆项，而不是只有散文式摘要
- 短期记忆可以生成长期记忆候选，但它本身不是长期记忆
- 压缩前必须优先保留未完成任务、用户纠正、稳定偏好和关系姿态
- 压缩结果必须可回放、可调试、可追溯到原始 turn

### 3. EpisodicMemory

负责长期自传记忆。

它存储发生了什么、何时发生、和谁有关、为什么重要，以及哪些原始 turn 能支持这段记忆。

核心对象：

```ts
interface MemoryEpisode {
  id: string
  kind: 'episode' | 'fact' | 'relationship' | 'procedure' | 'affective'
  occurredAt: number
  createdAt: number
  updatedAt: number
  people: string[]
  activity: string | null
  objects: string[]
  scene: string
  userIntent: string | null
  aliceResponsePattern: string | null
  summary: string
  rawTurnIds: string[]
  embeddingText: string
  tags: string[]
  emotionTags: string[]
  relationshipTags: string[]
  salience: number
  confidence: number
  sensitivity: 'public' | 'personal' | 'private' | 'secret'
  provenance: 'observed' | 'remembered' | 'inferred' | 'reconstructed'
  schemaVersion: number
  embeddingModelId: string
  contentHash: string
  lastConfirmedAt: number | null
  lastAccessedAt: number | null
  accessCount: number
  contradictionLinks: string[]
}
```

规则：

- 原始对话日志是证据，不是记忆本身。
- 长期回想应该优先使用情景事件、关系事件、程序记忆和事实，而不是原始 transcript 片段。
- 每条持久记忆都必须有 provenance 和支持它的 turn id。
- 不确定的记忆应该以不确定记忆的方式浮现，而不是伪装成新鲜事实。
- 记忆落库后要能解释它为什么被写入、为什么会被召回、为什么会被降权。
- 所有长期记忆都应支持版本化重建和 tombstone 删除。

### 4. PersonaLearning

负责模型无关的行为蒸馏，以及模型专属的本地微调。

它产出：

- 跨模型人格训练记录
- 每个模型自己的 LoRA 候选版本
- 记忆重排器训练样本
- 回放评测报告

规则：

- LoRA 学习的是“她通常如何回应”，不是把秘密事实记进权重。
- 长期事实留在记忆里，不进权重。
- 每个 base model 都有自己的 LoRA。
- 切换模型时，身份应该先通过 `IdentityCore` 和 `EpisodicMemory` 保持，再逐步训练对应 LoRA。

### 5. DialogueCore

负责当前 turn 的理解和回复决策。

输入：

- `IdentitySnapshot`
- `WorkingMemorySnapshot`
- 已选择的 `MemoryEpisode` 记录
- 当前用户消息
- 当前执行 / 感知上下文
- 如果有故障，则包含故障状态

输出：

- 回复意图
- 记忆使用决策
- 最终面向用户的回复请求
- 具身和情绪意图
- turn 结果记录

规则：

- `DialogueCore` 不应该直接搜索整个数据库。
- `DialogueCore` 接收带证据的记忆候选，并决定如何使用。
- 它可以选择显性回想、隐性携带，或者不回想。

### 6. FailureSurface

负责透明错误。

规则：

- 超时就说超时。
- provider 失败就说 provider 失败。
- 工具失败就说工具失败。
- 故障消息不能伪装成正常人格回复。
- 失败 turn 默认排除在人格训练之外。
- 失败记录保留为审计数据。

这个模块用来阻止固定模板污染人格。

## 短期记忆设计

短期记忆优先使用模型上下文。

当前对话状态应该表示为：

```ts
interface WorkingMemorySnapshot {
  recentRawTurns: Array<{
    turnId: string
    role: 'user' | 'alice'
    text: string
    createdAt: number
  }>
  sessionSummary: string
  activeTaskState: string | null
  activeEmotionState: string | null
  activeRelationshipPosture: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  compressionLevel: 'none' | 'light' | 'heavy'
}
```

压缩策略：

- 最近 turn 原文保留。
- 较早的同会话 turn 压缩进 `sessionSummary`。
- 当前任务状态和情绪状态分开提取。
- 在丢弃细节前，先提取可能进入长期记忆的候选。
- 用户纠正和偏好应比普通闲聊更强地保留。
- 压缩不是重写人格，也不是重新解释事实，只是把短期上下文压到可持续的表示里。
- 压缩摘要必须保持可回指到原始 turn 的锚点。

示例：

```text
Recent raw:
  User: "我们去打游戏吧"

Session summary:
  今天用户一直在讨论记忆 / 人格重建设计。

Active relationship posture:
  用户正在推动更真实的数字生命架构，并明确拒绝模板化行为。
```

短期记忆回答的是：“我们现在正在做什么？”

长期记忆回答的是：“过去发生过什么和现在相似？”

## 长期记忆设计

长期记忆以事件为先。

记忆类型：

- `Episode`：经历过的事件，例如“上周我们一起打过游戏”
- `Fact`：稳定事实和偏好，例如“用户不喜欢固定 fallback 回复”
- `RelationshipEvent`：信任、边界、修复、亲近、距离变化
- `Procedure`：如何处理重复出现的任务或场景
- `AffectiveResidue`：重要事件留下的情绪残留
- `RawArchive`：原始 turn，用作证据和审计轨迹

关键变化是：Alicization 必须记得经历，而不只是记得事实。

### 记忆闭环

长期记忆不是一次性写入后就结束，而是一个闭环：

```text
raw turn
→ 结构化抽取
→ 写入门禁
→ committed memory
→ 索引 / embedding / FTS
→ 召回 / 重排
→ DialogueCore 注入
→ 用户纠正 / 继续对话 / 任务完成
→ 新的训练样本与记忆修订
→ 夜间 consolidation / 评测 / 版本发布
```

这个闭环必须保证：

- 记忆写入有门禁，不是所有 turn 都能进长期库。
- 记忆召回有预算，不是所有相关内容都要塞进上下文。
- 用户纠正能反哺记忆，而不是只改表面回复。
- 版本升级可回滚，不会把一次坏训练永久写进人格。
- 每个阶段可重放、可恢复、可审计，避免崩溃重试后重复写入或漏写。

### 记忆事务与可靠性

记忆闭环必须使用事务日志，而不是把抽取、写入、索引和训练样本生成散落在不同调用里。

建议引入 `MemoryTransaction`：

```ts
interface MemoryTransaction {
  id: string
  idempotencyKey: string
  sourceTurnIds: string[]
  stage: 'extracted' | 'admitted' | 'indexed' | 'consolidated' | 'rejected'
  status: 'pending' | 'committed' | 'failed' | 'dead-lettered'
  createdAt: number
  updatedAt: number
  errorMessage: string | null
}
```

可靠性规则：

- 同一组 turn 的同一类抽取必须有稳定 `idempotencyKey`。
- 长期记忆写入和派生索引更新必须能通过 outbox 重试。
- 失败任务进入 dead letter，不阻塞主对话路径。
- 夜间任务必须能从事务日志重放，重新生成 index、embedding 和训练候选。
- 崩溃恢复后，系统应能判断每条记忆停在哪个阶段，而不是重新猜测。

### 记忆权限分层

一条记忆能被保存，不代表能被随意召回、训练、导出或显示。

每条长期记忆应至少包含四类策略：

```ts
interface MemoryPolicy {
  storage: 'allow' | 'ephemeral' | 'deny'
  recall: 'allow' | 'implicit-only' | 'blocked'
  training: 'allow' | 'distill-only' | 'deny'
  export: 'allow' | 'redacted' | 'deny'
}
```

规则：

- `storage` 决定是否能保存在本地。
- `recall` 决定能否在回复里显性说出，或只能隐性影响语气和决策。
- `training` 决定是否能进入 PersonaTrainingRecord、reranker 样本或 LoRA 数据。
- `export` 决定用户导出或调试视图中如何呈现。
- 高敏感记忆默认不能进入 LoRA，也不能被显性回想，除非用户明确允许。
- 删除请求必须覆盖所有策略层，不能只删除可见记录。

### 记忆写入与生命周期

写入路径应按顺序执行：

```text
turn normalize
→ 记忆候选抽取
→ 去重 / 合并 / 冲突检测
→ 敏感级别判断
→ salience / confidence 打分
→ 写入或拒绝
→ 建索引
→ 进入夜间 consolidation
```

建议把写入结果分成四类：

- `store`：直接落库
- `merge`：并入已有记忆
- `defer`：暂存，等待更多证据
- `reject`：不进入长期记忆，只保留审计痕迹

生命周期建议包含：

- `provisional`：候选态，证据还不够
- `committed`：已落库，可召回
- `promoted`：被用户确认或反复使用，优先召回
- `stale`：长期未被确认或被新信息稀释
- `tombstoned`：逻辑删除，保留审计
- `deleted`：按用户要求彻底移除

衰减与保留规则：

- `Fact` 和 `RelationshipEvent` 的衰减慢于普通闲聊。
- 用户明确确认过的记忆衰减更慢。
- 被反复纠正、冲突频繁、置信度低的记忆应更快降权。
- `RawArchive` 只作为证据和审计，不参与直接生成回复。
- 用户删除必须级联到 derived memory、embedding index、训练样本 tombstone。

### MemoryAdmissionScore

写入门禁不能靠感觉，应该在结构上区分“值不值得写”和“能不能写”。

```ts
interface MemoryAdmissionScore {
  novelty: number
  recurrence: number
  emotionalWeight: number
  relationshipImpact: number
  futureUsefulness: number
  userCorrection: number
  evidenceStrength: number
  sensitivityRisk: number
}
```

规则：

- 高 `sensitivityRisk` 会压低或阻止写入。
- 高 `userCorrection` 和高 `evidenceStrength` 会显著抬高优先级。
- `novelty` 低且 `recurrence` 低的闲聊通常不值得进长期库。
- `futureUsefulness` 只是一项信号，不是自动写入许可。
- 写入决策应输出 `store / merge / defer / reject` 以及明确原因码。

### 时间语义

时间不是只有 `occurredAt`，查询也需要时间语义。

- 相对时间表达要先归一成时间窗口，再做召回。
- `recency` 是加权项，不是唯一目标。
- 周期性事件要支持重复模式，例如每周、每月、节日、例行任务。
- 查询不能凭空补出精确日期，只能使用证据里已有的时间范围。
- 当用户说“上周”“昨天”“前阵子”时，优先使用区间和近似排序，而不是假装精确。

### 冲突与纠错

记忆系统必须承认同一件事可能存在多个版本。

- 新事实和旧事实冲突时，不能粗暴覆盖，应该保留 provenance 和 `contradictionLinks`。
- 置信度高、证据新的记忆可以成为主路径，但旧记忆仍保留为历史证据。
- 用户明确纠正的内容应优先写成高权重 `Fact` 或 `RelationshipEvent`。
- 不确定记忆必须以不确定方式浮现，不能被包装成肯定事实。

### Recall Query Planning

查询扩展在这里不是把用户原句改写得更长，而是把一句话转成一个受约束的召回计划。

```ts
type RecallMode = 'none' | 'working-only' | 'fast-recall' | 'deep-recall' | 'audit-recall'

interface RecallQueryPlan {
  originalText: string
  mode: RecallMode
  targetKinds: Array<'episode' | 'fact' | 'relationship' | 'procedure' | 'affective'>
  entityIds: string[]
  aliases: string[]
  timeWindow: {
    start: number | null
    end: number | null
    recencyBias: number
  }
  relationshipSignals: string[]
  mustHaveSignals: string[]
  avoidSignals: string[]
  topK: number
  timeBudgetMs: number
  tokenBudget: number
}
```

它要做的是：

- 识别当前消息的记忆意图
- 约束哪些记忆类型值得查
- 生成向量、FTS、实体、时间和关系的检索线索
- 明确正信号和负信号
- 控制召回范围和速度

它不能做的是：

- 编造新事实
- 无限制扩词
- 混淆任务求助、共同活动邀请和创作讨论

召回计划建议拆成这些维度：

- `intent`
- `entity`
- `alias`
- `time window`
- `relationship`
- `emotion`
- `task phase`
- `tool state`

回想流水线应优先并行，而不是串行堆时延：

```text
current message
→ recall intent classifier
→ entity / alias / time / relationship expansion
→ vector recall from MemoryEpisode.embeddingText
→ keyword recall from FTS
→ hot cache lookup for recent relevant memories
→ temporal boost for recent shared events
→ relationship boost for user + alice events
→ contradiction and privacy filter
→ rerank with confidence / salience / evidence quality
→ return 1-3 candidate memories
  → pack evidence snippets for DialogueCore
```

默认策略：

- 召回结果少而准，通常只给 1-3 条。
- 先召回证据，再决定是否在回复里显性提及。
- 当置信度不足时，宁可说“不太确定”，不要硬编。
- 查询计划只负责检索，不负责生成记忆结论。
- `Episode`、`Fact`、`RelationshipEvent` 和 `Procedure` 必须走不同优先级和过滤器。
- query expansion 应尽量显式使用 entity registry、time window 和 relationship context，而不是自由联想。
- `RecallMode` 是调度约束，不是模型提示词。
- `fast-recall` 优先命中缓存和实体线索，`deep-recall` 才允许完整向量+FTS+rerank。
- `audit-recall` 只用于解释和调试，不应该混进正常回复的路径。

### 实体归一与别名治理

在引入图数据库之前，应先建立轻量实体注册表，解决“同一个人、游戏、项目、任务被不同叫法打散”的问题。

建议对象：

```ts
interface MemoryEntity {
  id: string
  type: 'person' | 'project' | 'game' | 'tool' | 'place' | 'topic' | 'task'
  canonicalName: string
  aliases: string[]
  confidence: number
  mergedFrom: string[]
  createdAt: number
  updatedAt: number
}
```

规则：

- 写入记忆前先做 entity linking，避免重复创建同一实体。
- 用户明确命名或纠正别名时，优先更新 entity registry。
- alias merge 必须保留来源和置信度，不能静默覆盖。
- 召回 query expansion 应从 entity registry 读取别名，而不是每次让模型自由扩写。
- 当实体冲突无法自动判断时，保持分裂并降低召回置信度，等待用户确认。

### 记忆分层与索引拓扑

为了同时满足速度、效率和回想质量，记忆应分层而不是扁平堆放。

- `Hot`：当前会话的 WorkingMemory、最近被确认的关系记忆、最近高频访问的 episode。尽量驻留内存或轻量缓存。
- `Warm`：可直接检索的 episodic / fact / procedure 索引，包含 FTS、向量索引和少量 alias 表。
- `Cold`：RawArchive、历史低频记忆、可重建索引数据，只在需要时读取或批量重建。

拓扑规则：

- 写入先落 `Hot/Warm`，再异步刷新 `Cold` 或重建索引。
- `Hot` 负责低延迟，`Warm` 负责召回质量，`Cold` 负责审计和重建。
- 删除必须同时更新所有层的可见性状态，不能只删主表。
- 失效缓存应按 memory id、alias、entity 和 time window 粒度刷新。

### MemoryDebugTrace

记忆系统必须能解释自己为什么写、为什么想起、为什么没想起。

```ts
interface MemoryDebugTrace {
  turnId: string
  queryPlanMode: RecallMode
  selectedMemoryIds: string[]
  rejectedMemoryIds: string[]
  reasonCodes: string[]
  latencyMs: number
  tokenBudgetUsed: number
  indexHits: Array<'hot' | 'warm' | 'cold' | 'fts' | 'vector' | 'alias'>
  versionIds: {
    memorySchemaVersion: number
    embeddingModelId: string
    recallRouterVersion: string
    rerankerVersion: string
  }
}
```

规则：

- 每次显性回想都应能回放出命中的候选和排序原因。
- 没有召回时也要能说明是 mode、预算、权限还是索引缺失导致。
- 这个 trace 只用于调试和评测，不应直接进入人格训练。

### 在线路径与后台路径隔离

主对话路径必须保持轻，不能把清洗、embedding 生成、索引重建和训练准备都塞进用户等待时间里。

建议路径：

```text
online turn
→ append raw turn
→ update WorkingMemory
→ lightweight recall
→ reply
→ enqueue extraction / indexing / consolidation jobs
```

后台队列：

- `memory-extraction`
- `embedding-index`
- `fts-index`
- `consolidation`
- `persona-distillation`
- `eval-and-publish`

队列规则：

- 在线路径只做最小同步写入和轻量召回。
- embedding、FTS、去重、合并和训练样本生成都应异步执行。
- 每个队列有 retry、backoff、dead letter 和进度记录。
- 后台任务忙时可以延迟学习，但不能拖慢正常聊天。
- 读路径必须能接受索引短暂滞后，必要时回退到 WorkingMemory 和旧索引。

示例用户消息：

```text
我们去打游戏吧
```

回想解释：

```text
intent = shared_activity_invitation
activity = gaming
query = "playing games together, shared leisure, recent gaming episode"
```

回想流水线：

```text
current message
→ recall intent classifier
→ query expansion from activity / emotion / relationship context
→ vector recall from MemoryEpisode.embeddingText
→ keyword recall from FTS
→ temporal boost for recent shared events
→ relationship boost for events involving user + alice
→ rerank with confidence, salience, privacy, contradictions
→ return 1-3 candidate memories
→ DialogueCore decides whether to surface them
```

预期召回：

```text
MemoryEpisode:
  occurredAt: last week
  activity: gaming
  objects: ["<game name>"]
  summary: "用户和 Alicization 之前聊过一起玩 <game name> 放松。"
```

可能回复：

```text
好啊。上周我们玩的是《<game name>》，那次你更像是想放松一下，不是冲进度。今晚还玩那个，还是换一个？
```

如果置信度较低：

```text
我不完全确定，但我记得上次像是《<game name>》。要不要接着那个？
```

## 向量召回要求

长期联想式回想最终需要 embeddings。

只靠关键词搜索，无法稳定连接这些表达：

- “我们去打游戏吧”
- “今晚来一把？”
- “继续上次那个？”
- “开黑吗？”
- “想放松一下”

设计上应该引入 `EmbeddingProvider` 抽象：

```ts
interface EmbeddingProvider {
  embed: (text: string) => Promise<number[]>
  modelId: string
  dimensions: number
  locality: 'local' | 'cloud'
}
```

边界：

- `EmbeddingProvider` 只负责把文本映射成向量，不负责定义记忆真相。
- embedding 是检索表示，不是人格表达本体。
- 更换 embedding 模型时，旧索引必须可重建、可 shadow、可回滚。

默认姿态：

- 优先使用本地 embedding 模型。
- 云端 embedding 可选，并且必须显式开启。
- embedding 模型可替换。
- 向量应绑定到 episode，而不是只绑定到原始聊天日志。
- embedding 应在写入时预计算，避免把延迟转移到用户读路径。
- 向量索引和 FTS 索引应面向不同用途：向量负责语义近邻，FTS 负责实体、关键词和精确证据。

第一条生产路径应该使用固定 embedding 模型加可训练重排器。

embedding 微调可以后置，等正样本和 hard negative 样本足够后再做。

### 召回性能预算

记忆系统的目标不是“找最多”，而是“在固定时间里找最对”。

建议的读路径预算：

- 热路径召回：优先命中缓存和已有索引，尽量在 100ms 级完成。
- 冷路径召回：本地向量 + FTS + rerank 仍应保持在几百毫秒级，不应拖慢整轮回复。
- 超预算时：退化为只用 WorkingMemory 或只用 FTS，而不是阻塞对话。

建议的工程约束：

- 热缓存保存最近会话相关记忆、最近查询和常用 alias。
- 查询必须设置 topK 上限，避免召回膨胀。
- rerank 只能处理小候选集，不能拿全库直接排序。
- 上下文注入必须有 token cap，避免挤爆对话窗口。
- 召回超时不应触发模板化安慰回复，而应优雅降级为“不确定”或继续对话。

## 记忆重排器

重排器学习哪段召回记忆才是 Alicization 在当前场景真正应该想起的。

它不是二次生成器，不负责补全记忆，也不负责创造新解释，只负责对候选做排序和筛除。

训练记录：

```ts
interface MemoryRerankerExample {
  query: string
  positiveEpisodeIds: string[]
  hardNegativeEpisodeIds: string[]
  feedbackSource: 'user-confirmed' | 'user-corrected' | 'conversation-continued' | 'replay-eval'
  reason: string
}
```

示例：

```text
query: "我们去打游戏吧"
positive: "上周一起玩了《xxx》"
hard negative: "上周修过 Steam 报错"
hard negative: "昨天聊过游戏开发"
```

这会教会系统：

- 共同休闲经历比游戏相关技术词更重要。
- 最近共同经历比泛泛话题相似更重要。
- 用户的邀请语气不同于任务求助语气。
- 证据质量、时间相关性、关系相关性和隐私级别要一起参与排序，而不是只看 embedding 分数。
- 高分候选如果缺少证据，也不能直接进上下文。
- 负样本应该区分“语义相近但关系不对”和“时间对但类型不对”，不能混成一类。

### 召回结果注入

召回结果不应该直接原样灌进 prompt，而应先被包装成证据块。

```ts
interface RecallResult {
  memoryId: string
  kind: 'episode' | 'fact' | 'relationship' | 'procedure' | 'affective'
  score: number
  confidence: number
  evidenceTurnIds: string[]
  evidenceSnippets: string[]
  shouldSurface: boolean
  reason: string
}

interface MemoryContextPack {
  selected: RecallResult[]
  totalTokenCost: number
  budget: number
  freshnessBias: number
}
```

规则：

- 显性回想只在高置信度时出现。
- 隐性携带可以只影响语气和决策，不必明说来源。
- 低置信度时宁可不提，也不要“像记得一样”乱说。
- 上下文注入优先短证据、可验证证据和用户已确认记忆。

### 用户体验约束

记忆体验必须像“她想起来了”，而不是“系统查到了一条记录”。

- 当记忆命中明确时，回复应该自然嵌入，不要报告检索过程。
- 当记忆不确定时，直接承认不确定。
- 当记忆缺失时，正常推进当前对话，不要把空白包装成戏剧化遗忘。
- 当用户纠正记忆时，先接住纠正，再更新记忆，不要争辩。
- 当系统故障时，只说故障，不要用人格模板掩盖。

### 评估指标

自动化闭环必须被指标约束，否则夜间学习会悄悄漂移。

离线评估：

- `recall@k`：目标记忆是否进入候选集。
- `MRR` / `NDCG`：正确记忆的排序是否足够靠前。
- `false recall rate`：错误记忆被召回的比例。
- `hallucinated memory rate`：没有证据却被当作记忆说出的比例。
- `compression loss`：压缩后是否丢失未完成事项、关系姿态和纠正信息。
- `persona drift score`：回复是否偏离 `SOUL.md`、身份锚点和长期关系姿态。
- `template leakage rate`：固定模板、fallback 语气或项目口号是否泄漏进正常人格回复。
- `recall naturalness score`：记忆被使用时是否像自然回想，而不是检索报告。

在线评估：

- `p95 retrieval latency`：单轮召回是否拖慢回复。
- `p95 end-to-end turn latency`：记忆系统是否影响整体响应速度。
- `memory hit rate`：常见场景是否命中可用记忆。
- `user correction acceptance rate`：用户纠正后，系统是否稳定吸收。
- `delete propagation latency`：删除是否快速传播到派生索引和样本。
- `correction recovery rate`：被用户指出错误后，后续相似场景是否不再犯同一类错。
- `explicit recall satisfaction`：显性回想是否被用户继续接住，而不是打断对话体验。

评测原则：

- 任何新版本都必须先通过回放集，再进入 shadow，再进入主路径。
- 召回准确率不能以明显增加响应延迟为代价。
- 速度不能以牺牲证据质量和人格连续性为代价。
- 人格评估必须覆盖日常闲聊、任务协作、关系修复、失败透明处理和长期共同经历回想。

## 人格连续与模型微调

人格连续有三层。

### 模型无关身份

这一层在切换模型后仍然保留：

- `SOUL.md`
- `IdentitySnapshot`
- 关系偏好
- 稳定反人格约束
- 长期记忆
- 行为蒸馏数据集

### 跨模型人格数据集

这个数据集从对话中蒸馏而来，不直接复制原始日志。

记录形状：

```ts
interface PersonaTrainingRecord {
  id: string
  situation: string
  innerState: string
  shouldDo: string[]
  shouldNotDo: string[]
  styleNotes: string[]
  idealReply: string
  sourceTurnIds: string[]
  sensitivity: 'public' | 'personal' | 'private'
  trainingPolicy: 'allow' | 'distill-only' | 'deny'
  redactionState: 'none' | 'redacted' | 'blocked'
  quality: number
}
```

优质来源：

- 用户明确确认某种行为是对的。
- 用户纠正 Alicization 后，她正确完成修复。
- 高质量陪伴片段。
- 成功任务交接后的自然总结。
- 反复出现的用户偏好。
- 稳定的关系距离模式。
- 能体现“她应该如何成为她自己”的片段。

默认排除：

- 超时回复。
- fallback 回复。
- 固定模板。
- 工具失败噪音。
- 未确认事实。
- 幻觉记忆。
- 原始密钥、账号数据、私有路径等秘密。
- 未解决的冲突 turn。
- 用户不满但没有修复完成的片段。

### 人格训练清洗与脱敏

人格训练数据必须经过清洗流水线，不能从聊天日志或记忆候选直接进入 LoRA。

人格蒸馏不是把所有好回复搬进权重，而是把稳定的情境-内在状态-行为边界提炼出来。

建议流水线：

```text
candidate turn
→ quality filter
→ failure / fallback filter
→ privacy classification
→ secret redaction
→ conflict check
→ persona relevance labeling
→ ideal reply distillation
→ replay eval
→ training dataset publish
```

训练清洗规则：

- 失败回复、fallback、超时和工具错误默认 `trainingPolicy = deny`。
- 私密事实可以留下记忆，但默认不进入权重。
- 能体现人格表达的片段应被蒸馏成情境、内在状态和行为边界，而不是复制原文。
- 用户纠正后的成功修复可以成为高价值人格样本。
- 未解决争执、未确认事实、临时情绪发泄不能直接成为人格样本。
- 每条训练记录必须能追溯到来源 turn，并能随删除请求 tombstone。
- 蒸馏结果必须经过 replay eval 才能进入训练集发布。

### 术语边界与防误用

以下概念都必须按“是什么 / 不是什么”去实现：

- `IdentityCore`：身份真源和关系锚点，不是 prompt 文本，不是风格模板，不是某次回复。
- `WorkingMemory`：当前会话和任务状态，不是历史仓库，不是散文摘要。
- `EpisodicMemory`：带证据的事件记录，不是原始 transcript 的复制件，不是回复草稿。
- `Recall Query Planning`：受约束的召回计划，不是自由改写，不是答案生成。
- `MemoryReranker`：候选排序器，不是补全器，不是第二次聊天模型。
- `PersonaLearning`：人格行为蒸馏，不是事实灌权重，不是秘密压缩。
- `FailureSurface`：透明错误出口，不是情绪化安抚层，不是 fallback 伪装层。
- `Hot / Warm / Cold`：索引和访问层级，不是三套不同的记忆真相。
- `Nightly learning`：清洗后的小心更新，不是把白天全部聊天原样送训。

如果某个模块在实现时开始承担“不属于它”的职责，就说明边界已经松了，应该拆开。

蒸馏记录示例：

```json
{
  "situation": "用户指出固定 fallback 回复会破坏数字生命的真实感。",
  "innerState": "她应该通过透明承认失败来保护信任。",
  "shouldDo": [
    "直接承认问题",
    "把超时视为技术故障",
    "避免把故障伪装成正常人格回复"
  ],
  "shouldNotDo": [
    "不要输出安抚式固定模板",
    "不要用角色扮演掩盖系统错误",
    "不要把坏 fallback 存成人格行为"
  ],
  "styleNotes": [
    "诚实",
    "贴近但不戏剧化",
    "简短承担"
  ],
  "idealReply": "这次是超时，不是我正常想出的回复。我会把它记成链路故障，不拿固定安慰话遮过去。"
}
```

### 模型专属 LoRA

每个 base model 都有自己的 LoRA。

```text
qwen3-8b/persona-lora-v1
llama3-8b/persona-lora-v1
gemma3-12b/persona-lora-v1
```

LoRA 不是人格真源。它只是某个具体模型的人格表达层。

当用户切换模型时：

```text
load same IdentityCore
load same WorkingMemory and EpisodicMemory
check for matching LoRA
if exists: load it
if missing: run with prompt + memory first
nightly: train candidate LoRA for this model
evaluate candidate
activate only if it passes
```

## 夜间学习循环

自动学习循环应该保守。

夜间学习只处理已经被清洗、可追溯、可回放、可评测的数据，不允许把白天所有聊天原样灌进训练。

```text
daytime usage
→ record raw turns
→ update WorkingMemory
→ extract memory candidates
→ create persona candidate examples
→ nightly memory consolidation
→ update embeddings and FTS
→ train MemoryReranker candidate
→ train model-specific Persona LoRA candidate when enough data exists
→ replay evaluation
→ activate only approved candidates
→ keep rollback path
```

启用门禁：

- fallback 模板行为没有增加。
- 幻觉记忆没有增加。
- `SOUL.md` 一致性没有下降。
- 已知记忆探针上的召回表现没有变差。
- 用户纠正后的修复行为没有变差。
- 普通回复中没有泄露私密细节。
- 没有匹配 base model id 时，模型专属 LoRA 不能启用。
- 记忆检索的 p95 延迟没有恶化到影响对话感。
- 召回精度和 false recall rate 没有在新版本中退化。
- 压缩没有丢掉当前会话中的未完成事项和关系姿态。
- 删除请求、敏感记忆和 tombstone 行为都能被审计。

如果评测失败，候选版本保持 rejected，当前运行时不变。

### 版本化与发布

以下版本必须分别可追踪：

- `memorySchemaVersion`
- `embeddingModelId`
- `recallRouterVersion`
- `rerankerVersion`
- `personaDatasetVersion`
- `loraVersion`
- `memoryIndexVersion`

发布原则：

- 只允许单独升级一个可观测层，避免一次改动把多个回归源混在一起。
- 新版本先 shadow，再小流量，再全量。
- 任一层评测失败，都必须能回滚到前一版本。
- 索引重建必须是可重复的，不依赖手工补数据。
- embedding 模型变更时必须构建 shadow index，不能直接覆盖旧向量。
- schema 迁移期间优先 dual-read，必要时 dual-write，直到回放评测通过。
- reranker、recall router、persona dataset 和 LoRA 应能独立回滚。
- 发布前必须验证删除、tombstone、敏感记忆过滤在新旧版本中语义一致。
- 索引 backfill 必须可暂停、可恢复、可观测，不能占满用户对话资源。

## 失败处理边界

这次重建必须从错误恢复中移除人格 fallback。

期望行为：

```text
provider timeout → "这轮请求超时了。"
tool failed → "工具调用失败：<reason>。"
model returned invalid JSON → "模型输出格式无效，这轮没有形成有效回复。"
```

这些故障消息应该：

- 简短。
- 透明。
- 排除在人格训练之外。
- 可在审计日志中查看。
- 不伪装成 Alicization 的正常情绪回复。

## 现有代码迁移

这次重建不应该从删除一切开始。

更安全的路径是先建立防腐层。

### 作为资产保留

- 现有 SQLite 记录和迁移。
- 结构化 turn 持久化。
- 情景事件概念。
- 记忆事实和固化记录。
- 回放基准测试框架。
- 执行安全策略。
- 具身运行时 contract。
- `SOUL.md` 生命周期。

### 降级为兼容层

- `main-chat-session-runtime.ts`：只做编排。
- `runtime-governance.ts`：临时兼容 facade。
- 可见回复只保留结构校验、来源校验、settlement 与透明失败面；旧内容评分层和回复重写层已经删除。
- `runtime-organic-memory-prompt.ts`：拆成记忆检索、记忆审议和 prompt 组装适配器。
- 浏览器 fallback stores：只做本地投影 / 缓存，绝不能成为独立人格权威。

### 替换为新模块

建议模块结构：

```text
apps/stage-tamagotchi/src/main/services/alicization/life-core/
  identity-core.ts
  working-memory.ts
  episodic-memory.ts
  memory-transaction-log.ts
  memory-policy.ts
  memory-entity-registry.ts
  memory-job-queue.ts
  recall-router.ts
  memory-reranker.ts
  persona-learning.ts
  persona-training-sanitizer.ts
  dialogue-core.ts
  failure-surface.ts
  life-core-runtime.ts
```

旧运行时先以 shadow mode 调用 `life-core-runtime.ts`。

等 shadow mode 稳定后，新运行时成为主路径，旧 prompt / governance 修复模块逐步收缩。

## 迁移阶段

### Phase 0：盘点和护栏

- 增加架构测试，识别当前入口点。
- 标记 fallback 输出为非人格数据。
- 阻止超时 / fallback turn 进入人格训练。
- 按未来 owner 记录旧模块归属。

### Phase 1：抽取 WorkingMemory

- 创建 `WorkingMemorySnapshot`。
- 把当前会话压缩从 prompt 组装中移出。
- 让旧 prompt blocks 暂时消费新的 snapshot。
- 增加上下文溢出压缩测试。

### Phase 2：建立 EpisodicMemory Store

- 定义 `MemoryEpisode`。
- 建立 `MemoryTransaction`、outbox 和 idempotency key。
- 增加 `MemoryPolicy`，把存储、召回、训练和导出权限拆开。
- 从 turn 中抽取 episode。
- 增加 FTS 和向量字段。
- 将 episode 关联到原始 turn id。
- 增加游戏、纠正、任务延续和关系修复等召回样例。

### Phase 3：建立 Recall Router

- 搜索前先分类回想意图。
- 建立 entity registry 和 alias merge 规则。
- 对 episode、fact、procedure、relationship event 做混合召回。
- 重排候选。
- 只把被选中的候选传给 `DialogueCore`。
- 增加 Hot / Warm / Cold 分层缓存和索引失效策略。

### Phase 4：建立 DialogueCore 边界

- 定义当前 turn contract。
- 将显性回想 / 隐性携带 / 不回想做成一等决策。
- 让 `FailureSurface` 绕过 `DialogueCore` 的人格输出。
- 把可见回复修复移出 happy path。
- 将 embedding、索引重建和 consolidation 移到后台队列，避免阻塞在线对话。

### Phase 5：建立 PersonaLearning

- 建立训练样本清洗、脱敏、失败过滤和冲突检查。
- 从蒸馏样本创建人格数据集记录。
- 按 base model 训练本地 LoRA 候选。
- 训练记忆重排器候选。
- 只评测并启用通过的候选。
- 增加人格漂移、模板泄漏和自然回想评测。

### Phase 6：删除补丁路径

- 从正常对话中移除固定人格 fallback 模板。
- 从可见回复中移除项目状态短语强制。
- 从正常回复路径中移除工程身份口号的正则修复。
- 保留用于验证不变量的回放测试，但不再测试精确补丁措辞。

## 验证

实现被认为正确前，至少需要证明：

- 短期上下文溢出后，当前任务和关系姿态仍被保留。
- 长期回想可以在没有精确关键词重合时召回相似过去事件。
- “我们去打游戏吧” 可以召回先前的游戏 episode，并带有置信度和证据。
- fallback 和超时输出会被排除在人格学习之外。
- 在 LoRA 不存在前，模型切换仍能通过 `IdentityCore` 和记忆保持身份。
- LoRA 候选不能绕过回放评测直接启用。
- 记忆置信度低时，她可以说“不确定”。
- 旧浏览器 fallback 不能创建第二个人格来源。
- 记忆事务可以在崩溃后重放，不重复写入、不漏写索引。
- 同一条记忆可以分别控制存储、召回、训练和导出权限。
- 实体别名纠正后，相似表达能稳定召回同一批相关记忆。
- 后台索引、清洗和训练任务不会阻塞在线对话。
- 人格训练样本必须经过脱敏、失败过滤和冲突检查。
- 回放评测能发现人格漂移、模板泄漏和不自然回想。
- embedding / index / schema 版本切换支持 shadow、dual-read 和回滚。

## 成功标准

这次重建成功时，Alicization 应该具备：

- 一个身份真源。
- 一个短期记忆 owner。
- 一个长期自传记忆 owner。
- 一条人格学习流水线。
- 一个透明失败表面。
- 一个消费这些状态的对话核心。

用户可见的效果应该很简单：

用户可以自然说话，Alicization 能记起相关的共同经历，能在模型切换后保持人格，能在夜间本地学习，也能在系统失败时诚实失败。
在常见场景里，她会像“真的想起来了”，而不是像一个拼接了检索结果的接口。
