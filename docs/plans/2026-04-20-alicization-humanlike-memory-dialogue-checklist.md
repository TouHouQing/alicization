# Alicization 真人记忆对话开发清单

更新日期：2026-04-20

## 目标

实现真正接近真人的记忆对话闭环：

- 不是固定规则模板回复
- 不是只会记最近几轮
- 不是只会检索碎片
- 不是“有记忆模块”但回复仍然像无记忆助手

最终目标必须满足：

- 记忆进入方式像真人：
  先形成“是否想起”“想起什么”“为什么想起”的内在过程
- 回忆内容像真人：
  先想起一段时期、一次经历、一个关系节点或一种做法，再展开细节
- 回复方式像真人：
  remembered / approximate / fragmentary / procedural 的表达必须由大模型心智决定
- 系统结构闭环：
  memory -> mind -> dialogue -> outcome -> memory

## 硬约束

- 用户可见回复不允许依赖固定规则模板作为正常路径。
- 正常路径下，用户可见回复必须经过大模型心智生成。
- deterministic/local-only 只能作为基础设施故障兜底，不能承担正常内容回复。
- 记忆候选生成可以有规则层，但规则层不是最终 authority。
- 最终“想起什么、说不说、怎么说、把握度多少”必须由心智层决定。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `commit: <hash>` 或 `evidence: <test/receipt>`
3. 如任务范围变化，更新本文件，不另外造第二份 checklist

## 当前已完成基础

- [x] Episodic event graph 已落库：`episodic_events` 支持 when / where / with whom / what happened / felt / changed / provenance / confidence / derivedFrom
- [x] Provenance/source monitoring 已接入 recall surface：`observed / remembered / dreamt / inferred / reconstructed`
- [x] Dialogue / execution / proactive / dream 已统一写入 autobiographical episode
- [x] Recollection intent / recollected windows / recollection narratives / procedural memories 已接入 organic memory prompt
- [x] Memory consolidations 已落库：`daily / weekly / procedural`
- [x] Recollection planner 已接入：有候选记忆时由 LLM 选择 foreground memory
- [x] Recollection-heavy turn 已强制回到 LLM-authored 路径，避免正常路径走 deterministic/local-only 回复
- [x] Dream 已开始对 consolidation 做生成式 refinement，并生成 `autobiographical` summaries
- [x] Autobiographical summaries 已开始反哺 autobiographical self

## P0 必做：把“真人回忆闭环”变成唯一正常路径

- [x] 让 recollection planner 成为唯一前景选择 authority
说明：
当前 `memory-recollection-intent / windows / consolidations / procedural abstractions` 仍然有较强 heuristic 骨架。
目标是把这些都降为 candidate providers，由 recollection planner 最终决定 foreground memory。
evidence: `runtime-organic-memory-prompt.test.ts` / `runtime-organic-memory-prompt.ts` / `runtime.ts`

- [x] 让 Provider 根据召回证据自然表达确定度
说明：
召回 evidence 必须携带来源、置信度、时间与关系信息，由 Provider 根据这些事实决定表达确定度；本地代码不生成回忆台词。
evidence: `runtime-organic-memory-prompt.test.ts` / `response-surface-contract.test.ts` / `main-chat-session-runtime.test.ts`

- [x] 删除正常路径里的 deterministic/local-only 用户可见回复
说明：
Greeting / identity / repair / memory follow-up / execution follow-up 等正常内容都由 Provider 生成；失败使用类型化透明失败面。
evidence: `main-chat-single-dialogue-mainline-audit.test.ts` / `main-chat-provider-fact-filter.test.ts`

- [x] 做 memory mention gating
说明：
像真人一样，不是“想起来了就一定说出来”。
需要由心智决定：
什么时候记忆只作为内部背景
什么时候应该显式说出来
什么时候应该只说 gist 不说细节
evidence: `runtime-organic-memory-prompt.test.ts` / `main-chat-session-runtime.test.ts`

- [x] 把 recollection confidence / provenance 写入 Provider facts
说明：
记忆的不确定性必须以可追溯 evidence 进入 Provider 请求，本地代码不决定可见措辞。
evidence: `main-chat-memory-context.test.ts` / `long-term-memory-recall.test.ts`

## P0 必做：把长期记忆从“摘要存储”推进成“自传性记忆”

- [x] 做 dream-generated autobiographical summaries 的独立记忆面
说明：
现在 dream 已经能写 `autobiographical` consolidation，但还更像 period summary。
下一步要让它写成更像人的自传片段：
`那几天我一直被什么牵着`
`那段关系为什么会转向`
`我那时形成了什么新的理解`
evidence: `runtime.ts` / `runtime-dream.ts` / `db.test.ts`

- [x] 让 autobiographical summaries 深度回灌 `autobiographical self / motive engine / habit policy / relationship doctrine`
说明：
当前已经开始回灌 self。
还需要让这些长时摘要真正改变：
长期动机
关系原则
默认应对方式
主动性节律
evidence: `autobiographical-self.ts` / `motive-engine.ts` / `habit-policy.ts` / `motive-engine.test.ts` / `habit-policy.test.ts`

- [x] 做多阶段生命线记忆
说明：
不是只有 daily/weekly，而是：
`phase memory`
`relationship era`
`task era`
这样“那段时间我们总是在修 runtime continuity”能成为一条阶段性记忆，而不是很多日记摘要。
evidence: `memory-consolidation.ts` / `db.ts` / `autobiographical-self.test.ts`

## P1 必做：把“以前怎么做”从回复能力变成行为能力

- [x] Procedural memory 接入 planning/execution
说明：
不能只在回复里说“我以前一般这样做”。
需要在 planning / execution proposal / callback delivery 中真实复用 remembered procedure。
evidence: `executor-runtime.ts` / `claw-fabric.ts` / `task-thread-governor.ts` / `claw-fabric.test.ts` / `task-thread-governor.test.ts` / `runtime.test.ts`

- [x] 做 remembered procedure 的 outcome learning
说明：
以前的方法有没有成功、为什么成功、在哪种宿主状态下不该复用，也要进入长期程序记忆。
evidence: `outcome-reinforcement.ts` / `outcome-reinforcement.test.ts` / `executor-runtime.ts`

- [x] 做 host-specific procedure preference
说明：
同样一件事，对不同宿主状态、不同关系阶段，应该回忆不同的做法，而不是只有一个 procedure。
evidence: `executor-runtime.ts` / `runtime.test.ts` / `task-thread-governor.ts`

## P1 必做：非删除式记忆竞争

- [x] 做非删除式 salience prioritization
说明：
不做主动失忆/删记忆。
所有记忆保留，但回忆时允许前景优先级、熟悉感、竞争强度动态变化。
evidence: `db.ts` / `runtime.ts` / `alicization-memory.ts` / `alicization-browser-bridge.ts` / `db.test.ts` / `alicization-browser-bridge.test.ts`

- [x] 做 interference-driven recall competition
说明：
相似事件会互相干扰，但不会被删除。
回忆时允许更强、更贴近当前语境的记忆压低其他相近记忆的前景权重。
evidence: `db.ts` / `humanlike-memory.ts` / `db.test.ts`

- [x] 做 contradiction-aware recall reconstruction
说明：
旧记忆和新记忆冲突时，不是删掉其中一条，而是让召回结果带冲突压力、降置信并进入 reconstructed 路径。
evidence: `db.ts` / `humanlike-memory.ts` / `db.test.ts`

- [x] 做 false-memory-safe expression
说明：
允许冲突或弱锚点回忆进入 reconstructed / approximate 路径，不把它们包装成高置信当前事实。
evidence: `db.ts` / `response-surface-contract.ts` / `db.test.ts`

## P1 必做：补齐 fallback 现实一致性

- [x] Browser fallback 的 consolidation / recollection planner / recollection speech generator 全量同构
说明：
不能让 web/fallback 和 main runtime 养出两套不同人格记忆现实。
evidence: `packages/stage-ui/src/stores/alicization-browser-bridge.ts` / `packages/stage-ui/src/stores/alicization-browser-bridge.test.ts` / `packages/stage-shared/src/alicization-transport-contracts.ts`

- [x] Session mirror / memory mirror 对 recollection foreground 同步
说明：
不只是同步 memorySummary，而要同步“当前前景记忆是什么、它的把握度和口吻是什么”。
evidence: `dialogue-session-manager.ts` / `main-chat-session-runtime.ts` / `dialogue-session-manager.test.ts` / `main-chat-session-runtime.test.ts`

## P2 提升：更像真人的回忆动力学

- [x] Mood-congruent recall
说明：
情绪状态会改变更容易想起哪类记忆。
evidence: `memory-recollection-intent.ts` / `memory-recollection-intent.test.ts` / `db.ts`

- [x] Relationship-triggered recall
说明：
宿主一句话的关系张力应该能自动唤起特定阶段的关系记忆。
evidence: `memory-recollection-intent.ts` / `memory-recollection-intent.test.ts` / `db.ts`

- [x] Place / scene attachment
说明：
特定 app / 文件 / 工作流 / 夜间状态，会带出特定时期的经历感。
evidence: `recall-governor.ts` / `memory-recollection-intent.ts` / `runtime-mind-state.ts` / `db.ts` / `recall-governor.test.ts` / `memory-recollection-intent.test.ts`

- [x] Silent recollection before speech
说明：
有些记忆应该先影响下一句的口气和立场，而不是显式说出来。
evidence: `main-chat-session-runtime.ts` / `main-chat-session-runtime.test.ts` / `response-surface-contract.ts`

## P2 必做：评测与验收

- [x] 建立真人记忆对话评测集
至少覆盖：
`几天前我们聊过什么`
`以前你是怎么帮我做这个的`
`我们之前关系为什么会变差`
`你为什么这次会这样回应我`
`你记得我对这类事的敏感点吗`
evidence: `memory-dialogue-regression.test.ts`

- [x] 建立失败模式回归集
至少覆盖：
只记最近几轮
拿旧记忆当当前事实
明明不确定却说得很肯定
明明该回忆却完全不回忆
明明只是内部想起却生硬地对用户念记忆
evidence: `memory-dialogue-regression.test.ts` / `main-chat-session-runtime.test.ts` / `response-surface-contract.ts`
