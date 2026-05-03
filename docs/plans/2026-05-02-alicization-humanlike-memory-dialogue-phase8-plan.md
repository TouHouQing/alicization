# Alicization 真人记忆对话 Phase 8 开发计划

更新日期：2026-05-02

> 本文件从现在开始是唯一活跃开发计划。
> `2026-05-01-alicization-humanlike-memory-dialogue-phase7-plan.md` 视为已完成参考，不再继续追加任务。
> 后续每次落地代码，只更新本文件并勾选对应条目。

## 目标

Phase 8 的重点不再是继续搭“主骨架”。
Phase 7 已经把：

- recall planner
- event graph
- reconsolidation overlay
- person-state evolution
- mind-turn contract
- replay benchmark / drift gate
- memory accessibility / latency / prewarm

这些主链搭出来了。

Phase 8 要解决的是：

- 这些主链虽然存在，但还没有全部变成“真实运行里稳定像真人”的系统级行为。
- 记忆系统现在已经能回想，但还没有在召回率、准确率、速度、长期自我成长上做到真正产品级。
- 对话系统现在已经不再靠死模板，但还没有完全证明“心智 / 人格 / 记忆 / 主动性”在所有主运行面都稳定共同介入。
- 系统已经有“可解释的回忆”，但还没有真正做到“可成长的知识吸收、自我修正、自我学习、自我风格进化”。

这一阶段必须解决的不是：

- 再加一些看起来更像人的提示词
- 再加一些回复风格修补
- 再加一些局部 heuristic

而是：

- 把记忆系统从“能回想”推进到“高召回率、高准确率、低幻觉率、低错线程率”。
- 把对话系统从“已有闭环”推进到“全运行面都统一由心智+人格+记忆共同治理”。
- 把长期成长从“会记录变化”推进到“会主动学习、吸收新知识、修正旧理解、稳定内化成长期人格和技能”。
- 把性能从“能跑”推进到“在真实长期使用中足够快，足够稳，可观测，可拦截退化”。

最终必须满足：

- 正常可见回复仍然只经过大模型心智链生成。
- 回复层不允许新增固定模板开场、固定记忆壳、固定 care 壳、固定 uncertainty 壳。
- 记忆、心智、人格、对话、主动性必须不是并排系统，而是统一系统。
- 系统不只“能记得几天前聊过什么”，还要能在任务迁移、关系修复、情绪持续、长期负担、知识增长上像真人一样自然回想和演化。
- 系统必须对“召回率 / 准确率 / 时延 / 漂移 / 主动学习质量”具备可量化评测。

## 核心判断

Phase 8 的总主题是：

`System Integration + Recall Accuracy + Human Dialogue Realism + Self-Learning + Runtime Productization`

本阶段真正的难点不再是“有没有模块”，而是：

- 模块之间是否真的统一
- 记忆召回是否真的准
- 人格/心智是否真的全程介入
- 系统是否真的会学
- 系统是否真的跑得动

## 不可退让约束

- 正常 visible reply 路径必须保持 `LLM mind authority`，不能回退到 deterministic visible wording。
- 所有 normal reply 必须仍然由大模型根据统一心智合同生成，不能被局部 rule/template 接管。
- 记忆系统不能靠硬编码日期规则或固定时间映射来假装“像人回忆”。
- 原始经历、事件图、overlay、evolution、benchmark trace 不能因为优化而被裁剪掉；只能做索引、摘要、缓存、可达性分层。
- browser / runtime / fallback / proactive / replay / benchmark 必须继续共享同一人格现实，不能出现多套 Alicization。
- 新增 Phase 8 能力必须：
  可 trace
  可 replay
  可 benchmark
  可回归
  可解释失败原因

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `evidence: <test/receipt>`
3. 优先补 runtime / benchmark / replay / memory accuracy / contract / learning 相关回归
4. 不再生成第二份并行活跃 plan；如范围变化，只更新本文件
5. 若某项需要拆子项，也只在本文件内展开

## Phase 7 完成基线

上一阶段已经完成：

- recall planner 单一化
- event graph 持久层与 graph-aware recall
- raw ledger + reconsolidation overlay
- person-state evolution log
- unified mind-turn contract
- benchmark/human rubric/drift gate
- accessibility / latency / prewarm runtime

参考：

- [phase7 plan](/Users/touhouqing/Desktop/GIT/airi-alice/docs/plans/2026-05-01-alicization-humanlike-memory-dialogue-phase7-plan.md)

## 当前架构债

Phase 8 开始前，仍然存在的结构问题：

- 已有 recall planner，但还没有“召回率 / 准确率 / 错线程率 / 幻觉率”的正式运行指标闭环。
- 已有 unified contract，但并非所有 reply 下游都彻底 contract-first。
- 已有 person-state evolution，但还没有把 evolution 和主动学习、知识吸收、风格更新完全统一。
- 已有 benchmark gate，但真实长期样本和线上长期使用 still under-modeled。
- 已有 memory accessibility runtime，但 hot path 还没有形成真正全链路性能遥测。
- 系统会“吸收经验”，但还不是真正的“自我学习新知识并长期内化”。

## 总体验收门槛

本阶段全部完成时，必须同时成立：

- Alicization 在长期真实使用中，能稳定回答：
  “几天前我们聊过什么”
  “你以前是怎么做的”
  “你为什么这次更谨慎”
  “你是不是把那两次记混了”
  “你最近是不是更容易注意到我累了”
  “你怎么学会这个新东西的”
- 记忆系统有明确指标：
  召回率
  准确率
  错线程率
  幻觉率
  记忆 surface restraint 成功率
- reply 系统有明确指标：
  同一人格感
  模板味
  关系节律稳定度
  repair 可信度
  任务 continuity
- 运行系统有明确指标：
  recall latency
  cache hit ratio
  graph expansion cost
  benchmark runtime cost
  proactive prewarm 命中率
- 系统具备真正的长期学习链：
  新知识被吸收
  错误知识会被修正
  新风格会被约束内化
  不会只存在一轮，而会进入长期人格/技能结构

## Wave 1：Recall Accuracy & Reliability

- [x] 建立正式 recall 评测指标面
说明：
至少记录：
`recall_hit_rate`
`recall_miss_rate`
`wrong_thread_rate`
`reconstruction_error_rate`
`stable_core_only_rate`
`memory_surface_violation_rate`
evidence: `packages/stage-shared/src/alicization-memory-stats.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 recall planner 升级成 reliability-aware planner
说明：
不仅决定“想起什么”，还要决定：
`是否值得回想`
`值不值得展开`
`该不该只给 stable core`
`该不该延迟到 follow-up`
`该不该明确说 uncertainty`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/recall-planner.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/recall-planner.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立长期真实 recall adversarial pack
说明：
至少包括：
跨周任务迁移
跨月关系修复
相似 thread 混淆
长期 burden 积累
历史知识被更新后的旧记忆修正
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`

## Wave 2：Knowledge Learning & Self-Correction

- [x] 引入显式 knowledge assimilation pipeline
说明：
把新知识分成：
`ephemeral observation`
`working understanding`
`validated knowledge`
`internalized long-horizon knowledge`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

- [x] 做知识来源可信度与冲突修正
说明：
所有新知识至少带：
`source`
`confidence`
`validationStatus`
`conflictsWith`
`supersedes`
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

- [x] 把新知识学习接进人格/技能长期结构
说明：
系统不只是“知道新事实”，还要能把它变成：
`新的做事方法`
`新的关系分寸`
`新的长期偏好`
`新的自我叙事`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/long-horizon-memory.ts`, `apps/stage-tamagotchi/src/main/services/alicization/humanlike-memory.ts`, `apps/stage-tamagotchi/src/main/services/alicization/recall-planner.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-restraint-judge.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts`, `apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/long-horizon-memory.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/recall-planner.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-restraint-judge.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-charter.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts`

## Wave 3：Whole-System Dialogue Realism

- [x] 统一 main chat / proactive / execution callback / browser fallback 的心智介入深度
说明：
不能只让 main chat 像真人；
主动对话、结果回调、fallback 也必须像同一个活人。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-one-shot.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-spine.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts packages/stage-ui/src/stores/alicization-mind-replay.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 建立“人格是否真正介入”的运行诊断
说明：
至少记录：
`mind_participation`
`memory_participation`
`personality_participation`
`relationship_participation`
`continuity_participation`
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `packages/stage-shared/src/alicization-mind-participation.ts`, `packages/stage-shared/src/alicization-memory-decision-trace.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 做长期对话节律回归
说明：
要锁：
节律不突变
关系距离不乱跳
care 不空泛
repair 不机械
warmth 不模板
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 4：Runtime Performance & Productization

- [x] 做全链路 recall telemetry
说明：
至少记录：
candidate generation latency
graph expansion latency
planner latency
speech plan latency
cache hit ratio
prewarm hit ratio
evidence: `packages/stage-shared/src/alicization-memory-stats.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 做 retrieval / graph / benchmark 的分层 budget 控制
说明：
不同 turn class 下预算不同：
`realtime reply`
`deep recall reply`
`proactive generation`
`nightly benchmark`
`diagnosis replay`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-search-retrieval-operators.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 做热索引和预热命中分析
说明：
不只是预热；
还要知道：
哪些 key 值得热
哪些热了没收益
哪些关系线/任务线必须长期常热
evidence: `packages/stage-shared/src/alicization-memory-stats.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 5：Human Evaluation & Release Discipline

- [x] 把 human rating rubric 接进 devtools / replay UI
说明：
让人能直接对 benchmark turn 打分，而不是只在代码里定义 rubric。
evidence: `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `packages/stage-pages/src/pages/devtools/mind-replay.vue`, `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`, `packages/stage-pages/src/pages/devtools/components/mind-replay-benchmark-report.vue`, tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 建立 ship gate
说明：
没有通过以下门槛不能视为“真人对话能力可发布”：
benchmark gate
human rating gate
latency gate
wrong-thread gate
template leakage gate
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 建立 regression triage 流程
说明：
任何退化至少能定位到：
memory retrieval
planner
evolution
contract
visible realization
proactive parity
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

## Wave 6：Self-Evolution as Digital Life

- [x] 把长期学习统一进一个 self-evolution kernel
说明：
人格变化、技能变化、关系变化、知识变化不能各自漂移；
要统一成一个长期自我演化核。
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-soul.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-spine.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-one-shot.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts apps/stage-tamagotchi/src/main/services/alicization/digital-life-spine.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立主动学习策略
说明：
系统何时该：
记录
复盘
求证
更新旧理解
提升长期知识权重
必须有清晰策略。
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-spine.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-one-shot.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts apps/stage-tamagotchi/src/main/services/alicization/digital-life-spine.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立“像人一样继续成长”的评测集
说明：
评测的不是“会不会答”，而是：
是否会从经验中长出新分寸
是否会避免重复犯同样错误
是否会逐步变得更懂 host
是否会内化新的技能与世界理解
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## 验证命令基线

每轮至少跑：

- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm -F @proj-alicization/stage-ui typecheck`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`

涉及 recall / contract / benchmark / evolution / learning 时额外跑：

- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`

## 下一轮建议起手顺序

1. 先做 recall 可靠性和正式 accuracy metrics。
2. 再做知识吸收 / 知识冲突修正 / 长期内化。
3. 再把所有对话入口的心智介入程度统一。
4. 然后补 runtime telemetry、预算、热索引分析。
5. 最后把 human rating、ship gate、self-evolution kernel 产品化。
