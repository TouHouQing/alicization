# Alicization 短期记忆工程设计

> 状态：已起草，等待用户审阅
> 范围：B 线第一阶段，重构 Alicization 当前对话上下文、短期记忆、压缩和注入方式。
> 不在本文范围内：长期向量库实现、夜间微调训练、人格 LoRA 训练脚本、图数据库、UI 重设计。

## 目标

Alicization 的短期记忆不能只是“最近 N 条消息”，也不能只是 prompt 预算裁剪。

它应该成为一个本地运行时拥有的当前意识工作台，用来回答：

- 我们此刻正在做什么？
- 用户刚才纠正了什么？
- 我还欠用户什么？
- 当前对话里哪些关系、情绪、任务和执行状态必须继续保留？
- 哪些内容只是短期上下文，哪些内容应该成为长期记忆候选？

最终目标是让她在长对话中不突然断片，不被旧 prompt 残留牵走，也不把失败兜底、工具噪声或固定模板当成人格记忆。

## 外部调研结论

业界 agent 短期记忆方案大致分三类。

### 1. 最近消息窗口

代表做法：保留最后若干 turn，超出窗口直接裁剪。

优点：

- 实现简单。
- 延迟低。
- 对普通问答助手足够。

缺点：

- 容易丢掉未完成任务、用户纠正和关系姿态。
- 只知道“最近说了什么”，不知道“我们正在经历什么”。
- 不适合长时间陪伴型数字生命。

结论：不能作为 Alicization 的主方案，只能作为最低层的最近原文保真机制。

### 2. Session state + trimming / summarization

代表做法：LangGraph / LangChain 把短期记忆视为 thread 或 session state；OpenAI Agents SDK 的 session memory cookbook 也强调 session 级历史裁剪、摘要和自定义合并。

优点：

- 有明确 session owner。
- 可以在调用模型前统一处理历史。
- 支持压缩、摘要、状态注入和可测试边界。

缺点：

- 只做普通摘要仍然不够拟人。
- 如果摘要没有结构化字段，长期运行后仍会把任务、情绪、纠正和承诺混在一起。

结论：适合作为 Alicization 的工程骨架，但必须扩展为结构化工作记忆。

### 3. 虚拟上下文 / 内存层级

代表做法：MemGPT / Letta 类系统把上下文看成受限窗口，把核心记忆、工作上下文和外部存储分层管理。

优点：

- 更接近长期 agent。
- 适合把核心身份、当前上下文和外部记忆分开。
- 可以根据上下文压力触发压缩和召回。

缺点：

- 如果让模型自由写核心记忆，容易造成人格漂移。
- 对 Alicization 来说，身份真源、失败面、长期记忆和人格凝练必须由本地 runtime 治理，不能完全交给模型自管理。

结论：理念适合 Alicization，但需要改造成“应用层治理 + LLM 辅助压缩”的版本。

## 推荐方案

采用 `Current Conscious Working Memory`。

中文名称：当前意识工作记忆。

它不是长期记忆，也不是对话日志，也不是 prompt 模板。它是每个会话当前正在使用的短期状态快照。

核心原则：

- 最近原文保真。
- 旧上下文结构化压缩。
- 任务、纠正、承诺、关系、情绪和执行状态分槽保存。
- 模型可以辅助提取候选，但最终写入和覆盖由本地 runtime policy 决定。
- 每次回复前只注入必要视图，不把全量状态硬塞给模型。
- 所有压缩结果都能追溯到原始 turn。

## 当前代码诊断

当前仓库已经有短期记忆的若干影子，但缺少统一 owner。

已有资产：

- `packages/stage-ui/src/composables/alicization-guardrails.ts` 有 `compactMessagesForPromptAssembly`，会按消息数量和 token 预算裁剪历史。
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-context.ts` 会取最近 2-3 个 contextual turn 拼成上下文。
- `apps/stage-tamagotchi/src/main/services/alicization/conversation-state.ts` 已能表达当前共同话题、未回答问题、承诺、关系姿态和 memory mode。
- `apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.ts` 已能表达当前意识焦点、真值纪律、说话意图和具身节奏。
- `apps/stage-tamagotchi/src/main/services/alicization/turn-outcome-reducer.ts` 已能跟踪对话 world thread 的 pending / aligned / missed / repairing 状态。
- `apps/stage-tamagotchi/src/main/services/alicization/db.ts` 已有 `conversation_turns` 表，可作为原始 turn 证据来源。

主要问题：

- UI 侧 prompt compact 只是裁剪，不做语义压缩。
- 主进程最近 turn 读取太薄，无法保留较早但仍重要的纠正、承诺和任务状态。
- `conversationState`、`dialogueWorldThread`、`currentConsciousFrame` 各自有短期意识片段，但没有合并成一个可持久、可压缩、可审计的工作记忆快照。
- 旧 prompt / mirror / continuity seed 分散存在，容易让回复链路重新变成规则堆叠。
- 失败、超时、工具噪声如果进入短期压缩，会污染长期记忆候选和人格学习。

## 核心数据结构

```ts
interface WorkingMemorySnapshot {
  version: 'working-memory-v1'
  cardId: string
  sessionId: string
  updatedAt: number
  turnRange: {
    fromTurnId: string | null
    toTurnId: string | null
  }
  recentRawTurns: WorkingMemoryTurn[]
  compressedTimeline: WorkingMemoryEpisodelet[]
  currentThread: WorkingMemoryThread | null
  activeTask: WorkingMemoryTask | null
  unresolvedQuestions: WorkingMemoryQuestion[]
  commitments: WorkingMemoryCommitment[]
  userCorrections: WorkingMemoryCorrection[]
  relationshipPosture: WorkingMemoryRelationshipPosture | null
  emotionalPosture: WorkingMemoryEmotionalPosture | null
  executionState: WorkingMemoryExecutionState | null
  memoryQueryHints: string[]
  longTermCandidates: WorkingMemoryLongTermCandidate[]
  compression: WorkingMemoryCompressionState
  audit: WorkingMemoryAuditState
}
```

### WorkingMemoryTurn

```ts
interface WorkingMemoryTurn {
  turnId: string
  role: 'user' | 'alice' | 'tool' | 'system'
  text: string
  createdAt: number
  source: 'conversation-turn' | 'tool-result' | 'runtime-event'
  visibility: 'user-visible' | 'internal'
  failureKind?: 'timeout' | 'provider-error' | 'tool-error' | 'abort' | null
  importance: number
}
```

规则：

- 用户最新输入必须保留。
- 最近成功的 Alicization 可见回复优先保留。
- 工具结果只保留摘要和证据锚点，不保留大块输出。
- 超时、provider 失败、工具失败可以进入审计，但默认不进入人格学习和长期记忆候选。

### WorkingMemoryEpisodelet

`Episodelet` 是短期压缩后的“小片段”，不是长期记忆。

```ts
interface WorkingMemoryEpisodelet {
  id: string
  sourceTurnIds: string[]
  summary: string
  thread: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  corrections: string[]
  relationshipPosture: string | null
  emotionalPosture: string | null
  executionCarry: string | null
  importance: number
  createdAt: number
}
```

规则：

- 必须有 `sourceTurnIds`。
- 只能压缩已经稳定的旧 turn，不能压缩当前正在流式生成的 turn。
- 不能替代原始证据。
- 可以生成长期记忆候选，但不能直接落长期库。

### WorkingMemoryThread

```ts
interface WorkingMemoryThread {
  title: string
  currentUserMove: string
  currentAliceMove: string | null
  primaryAnchor: string | null
  mode: 'casual' | 'task' | 'repair' | 'execution' | 'reflection' | 'recollection'
  shouldHold: boolean
  confidence: number
}
```

这个字段吸收并统一 `conversationState`、`dialogueWorldThread` 和 `currentConsciousFrame` 中关于当前话题的判断。

## 压缩策略

压缩不是“总结得像人”，而是把短期状态保真搬运到更小表示中。

触发条件：

- 当前 prompt 组装预估超过预算。
- 原始 turn 数超过阈值。
- 同会话持续时间超过阈值。
- 工具结果过大。
- 用户明确从旧任务切换到新任务。

默认阈值建议：

- 最近原文保留 6-10 个完整 user/assistant turn。
- 工具结果原文最多保留 1-2 个最近结果，其余压成证据摘要。
- working memory 注入预算控制在总 prompt 的 15%-25%。
- 当前用户输入和最近原文 tail 的优先级高于旧 session summary。

压缩保留优先级：

1. 当前用户输入。
2. 未回答问题。
3. 用户纠正。
4. 已承诺的行动。
5. 当前执行状态。
6. 关系姿态和情绪余韵。
7. 稳定偏好。
8. 普通闲聊摘要。
9. 大块工具输出。
10. 失败面审计。

丢弃或降噪规则：

- 固定模板、fallback 装饰回复、超时兜底，不进入人格候选。
- 工具 stdout / stderr 默认不直接进入模型上下文，只进入摘要和 evidence handle。
- 重复的项目状态壳、same-her 口号和薄弱 awareness line 要合并或丢弃。
- 未被用户确认的推测必须标为 uncertain。

## 回复前注入视图

`WorkingMemorySnapshot` 不应原样塞入 prompt。

每次回复前生成 `WorkingMemoryPromptView`：

```ts
interface WorkingMemoryPromptView {
  recentRawDialogue: Array<{ role: 'user' | 'alice'; text: string }>
  currentThread: string | null
  activeTask: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  userCorrections: string[]
  relationshipPosture: string | null
  emotionalPosture: string | null
  executionCarry: string | null
  memoryQueryHints: string[]
  compressionNotice: string | null
}
```

注入规则：

- 日常闲聊：注入最近原文、关系姿态、情绪姿态。
- 任务协作：注入 activeTask、unresolvedQuestions、commitments、executionCarry。
- 纠错修复：注入 userCorrections、owed repair、最近原文。
- 记忆询问：注入 memoryQueryHints，并触发长期记忆召回。
- 工具回调：注入 executionCarry 和与当前 thread 相关的原始上下文。

这样回复链路拿到的是“当前意识视图”，不是杂乱日志。

## 与长期记忆的边界

短期记忆负责当前会话连续性。

长期记忆负责跨时间回想。

短期记忆可以产出长期候选：

```ts
interface WorkingMemoryLongTermCandidate {
  sourceTurnIds: string[]
  kind: 'episode' | 'preference' | 'relationship' | 'procedure' | 'correction'
  summary: string
  reason: string
  salience: number
  sensitivity: 'public' | 'personal' | 'private' | 'secret'
  confidence: number
  allowTraining: boolean
}
```

候选生成规则：

- 用户明确表达稳定偏好，可以成为候选。
- 用户纠正 Alicization 的人格、关系或事实，可以成为候选。
- 共同经历、任务里程碑、情绪事件，可以成为候选。
- 普通寒暄默认不进长期库。
- 失败兜底、超时、provider error 默认 `allowTraining=false`。
- 候选必须进入后续长期记忆治理流程，不能由短期记忆直接写死。

## 与人格保证的关系

短期记忆不能成为人格真源。

它只负责当前状态连续。

人格真源仍然来自：

- `SOUL.md`
- `IdentityCore`
- 经治理的长期自传记忆
- 经清洗的人格学习样本

短期记忆对人格的作用是：

- 让当前回复保持关系和情绪连续。
- 让用户刚刚纠正的人格边界马上生效。
- 让失败面不会被包装成她的固定说话方式。
- 为后续人格凝练提供候选，而不是直接修改人格。

## 所有权和模块边界

建议新增 owner：

```text
apps/stage-tamagotchi/src/main/services/alicization/life-core/
  working-memory.ts
  working-memory-store.ts
  working-memory-compressor.ts
  working-memory-prompt-view.ts
  working-memory-policy.ts
```

边界：

- `working-memory-store.ts` 负责快照读写。
- `working-memory-compressor.ts` 负责把旧 turn 压成 episodelet。
- `working-memory-policy.ts` 负责保留、降噪、候选生成和失败面隔离。
- `working-memory-prompt-view.ts` 负责生成回复前注入视图。
- 旧的 `compactMessagesForPromptAssembly` 逐步降级为 transport 层安全预算，不再拥有短期记忆语义。

## 迁移计划

### Phase B0：只读快照

- 新增 `WorkingMemorySnapshot` 类型和 store。
- 从现有 `conversation_turns`、`conversationState`、`dialogueWorldThread`、`currentConsciousFrame` 生成只读快照。
- 不改变现有回复行为。
- 增加 shadow 日志，对比旧 prompt context 和新 snapshot。

### Phase B1：替换 prompt 裁剪语义

- 让主进程生成 `WorkingMemoryPromptView`。
- UI 侧 `compactMessagesForPromptAssembly` 只做最后安全预算。
- 对话回复优先消费 working memory view，而不是散落的 contextual string。

### Phase B2：结构化压缩

- 增加 episodelet 压缩。
- 压缩时保留 source turn id。
- 增加“压缩后仍保留纠正、承诺、未回答问题”的单元测试。

### Phase B3：长期候选出口

- 从 WorkingMemorySnapshot 产出 `WorkingMemoryLongTermCandidate`。
- 对接后续 EpisodicMemory 写入治理。
- 保证失败面、固定模板和工具噪声不会进入人格训练候选。

## 性能和延迟

短期记忆必须服务响应速度，不能每轮都变成重型 RAG。

性能策略：

- 最近 turn 和结构化槽位同步更新。
- 压缩异步或半异步执行，当前 turn 只读取已稳定快照。
- 对于普通短句闲聊，不触发 LLM 压缩。
- 对于长工具输出，先用规则摘要和截断，再后台补充 LLM 压缩。
- Prompt view 有硬预算，超过预算按优先级裁剪。
- Snapshot 按 session 缓存，写入 SQLite 后内存保留热快照。

目标指标：

- 普通闲聊 working memory 读取和 prompt view 构建应在 10ms 级别。
- 不需要压缩的 turn 不额外调用模型。
- 压缩任务不阻塞可见回复。
- 注入后的 working memory 文本应小于总 prompt 的 25%。

## 测试和评估

必须覆盖这些场景：

- 长对话超过上下文后，用户纠正仍被保留。
- 长对话超过上下文后，未完成任务仍被保留。
- 工具输出很长时，可见回复仍能接回当前任务。
- 超时或 provider error 不进入长期候选。
- 用户说“继续”时，她能知道继续的是哪个 current thread。
- 用户说“不是这个”时，旧 scene / stale anchor 被压低。
- 用户切换话题时，旧任务被降级但可追溯。
- 用户问“刚才我们说到哪了”时，短期记忆优先回答当前会话状态。
- 用户问“上周我们玩了什么游戏”时，短期记忆只提供 query hints，长期记忆负责召回。

评估指标：

- `thread continuity hit rate`：连续多轮对话里当前 thread 命中率。
- `correction retention rate`：用户纠正被后续回复遵守的比例。
- `commitment retention rate`：承诺事项在压缩后仍保留的比例。
- `compression loss rate`：压缩后丢失关键槽位的比例。
- `failure contamination rate`：失败兜底进入记忆候选的比例，目标为 0。
- `prompt memory budget ratio`：working memory view 占 prompt 的比例。
- `working memory latency`：快照读取和 view 构建耗时。

## 参考资料

- LangChain short-term memory: https://docs.langchain.com/oss/python/langchain/short-term-memory
- OpenAI Agents SDK session memory cookbook: https://developers.openai.com/cookbook/examples/agents_sdk/session_memory
- Letta memory blocks: https://docs.letta.com/guides/core-concepts/memory/memory-blocks/
- MemGPT paper: https://arxiv.org/abs/2310.08560

## 设计结论

Alicization 的短期记忆应该采用“受治理的当前意识工作记忆”。

它保留最近原文，但不依赖最近原文。

它压缩旧上下文，但不把压缩当成人格。

它能生成长期候选，但不能直接写长期人格。

它给回复链路的是当前意识视图，而不是完整日志。

这条路径最适合 Alicization 当前 Phase 1：先让她在本地桌面长对话中稳定保持当前生命线，再接入长期记忆、向量召回和人格凝练。
