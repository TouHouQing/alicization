# Alicization 生命核心重建设计

> 状态：已起草，等待用户审阅
> 范围：在继续添加自动微调或更大规模记忆功能之前，先重建对话、记忆和人格底座。
> 不在本文范围内：UI 重设计、特定模型供应方训练脚本、智能家居扩展、机器人具身，以及一次性替换现有运行时。

## 目标

Alicization 不应该继续以 prompt 规则、fallback 模板和 same-her 修复补丁的形式堆叠增长。

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
- `same-her`、`Phase 1`、项目闭环等语言被重复写成正则和 prompt 指令，而不是一个紧凑的内部身份状态
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
- `same-her` 应该成为状态，而不是回复层被迫说出的短语。

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

### 3. EpisodicMemory

负责长期自传记忆。

它存储发生了什么、何时发生、和谁有关、为什么重要，以及哪些原始 turn 能支持这段记忆。

核心对象：

```ts
interface MemoryEpisode {
  id: string
  occurredAt: number
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
  lastConfirmedAt: number | null
  contradictionLinks: string[]
}
```

规则：

- 原始对话日志是证据，不是记忆本身。
- 长期回想应该优先使用情景事件、关系事件、程序记忆和事实，而不是原始 transcript 片段。
- 每条持久记忆都必须有 provenance 和支持它的 turn id。
- 不确定的记忆应该以不确定记忆的方式浮现，而不是伪装成新鲜事实。

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
  embed(text: string): Promise<number[]>
  modelId: string
  dimensions: number
  locality: 'local' | 'cloud'
}
```

默认姿态：

- 优先使用本地 embedding 模型。
- 云端 embedding 可选，并且必须显式开启。
- embedding 模型可替换。
- 向量应绑定到 episode，而不是只绑定到原始聊天日志。

第一条生产路径应该使用固定 embedding 模型加可训练重排器。

embedding 微调可以后置，等正样本和 hard negative 样本足够后再做。

## 记忆重排器

重排器学习哪段召回记忆才是 Alicization 在当前场景真正应该想起的。

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

如果评测失败，候选版本保持 rejected，当前运行时不变。

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
- `visible-reply/semantic-judge.ts`：只做评测，不再作为正常回复塑形权威。
- `visible-reply/second-pass-rewrite.ts`：作为临时修复层，之后从 happy path 移除。
- `runtime-organic-memory-prompt.ts`：拆成记忆检索、记忆审议和 prompt 组装适配器。
- 浏览器 fallback stores：只做本地投影 / 缓存，绝不能成为独立人格权威。

### 替换为新模块

建议模块结构：

```text
apps/stage-tamagotchi/src/main/services/alicization/life-core/
  identity-core.ts
  working-memory.ts
  episodic-memory.ts
  recall-router.ts
  memory-reranker.ts
  persona-learning.ts
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
- 从 turn 中抽取 episode。
- 增加 FTS 和向量字段。
- 将 episode 关联到原始 turn id。
- 增加游戏、纠正、任务延续和关系修复等召回样例。

### Phase 3：建立 Recall Router

- 搜索前先分类回想意图。
- 对 episode、fact、procedure、relationship event 做混合召回。
- 重排候选。
- 只把被选中的候选传给 `DialogueCore`。

### Phase 4：建立 DialogueCore 边界

- 定义当前 turn contract。
- 将显性回想 / 隐性携带 / 不回想做成一等决策。
- 让 `FailureSurface` 绕过 `DialogueCore` 的人格输出。
- 把可见回复修复移出 happy path。

### Phase 5：建立 PersonaLearning

- 从蒸馏样本创建人格数据集记录。
- 按 base model 训练本地 LoRA 候选。
- 训练记忆重排器候选。
- 只评测并启用通过的候选。

### Phase 6：删除补丁路径

- 从正常对话中移除固定人格 fallback 模板。
- 从可见回复中移除项目状态短语强制。
- 从 happy path 中移除 same-her 正则修复。
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
