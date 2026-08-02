# Alicization 真人记忆对话 Phase 10 开发计划

更新日期：2026-05-03

> 本文件从现在开始是唯一活跃开发计划。
> `2026-05-03-alicization-humanlike-memory-dialogue-phase9-plan.md` 视为上一阶段结构基线，不再继续追加任务。
> 后续所有 Phase 10 代码落地、回归、勾选、补证据，只更新本文件。

## 目标

Phase 9 已经把：

- single semantic source
- organic memory runtime decomposition
- explainable recall ledger / stage replay
- domainized memory facts
- learning action scheduler baseline
- browser local mini-runtime baseline

这些核心骨架落下来了。

Phase 10 不再优先解决“有没有这些模块”。

Phase 10 要解决的是：

- 学习链已经能决定下一步该 `record / reflect / verify / revise / internalize`，但还没有真正进入可持久、可执行、可重试、可回滚的运行闭环。
- 记忆事实已经有 `memoryDomain`，但仍主要是“同一种 fact 结构 + domain 加权”，还不是“像真人一样按关系、自我、程序、世界四类记忆用不同组织法回忆”。
- recall 现在已经可解释，但“为什么不该想起某些相似记忆”还没有被建成正式的负向检索与错线程抑制层。
- affect / afterglow / repair / burden / relationship cadence 已经在多个运行面参与，但仍偏“即时 carry”，还没有成为稳定可回忆、可压抑、可延迟释放的长期人格-关系残留结构。
- browser fallback 已经共享 bundle 与 ledger，但还没有彻底变成“和 main runtime 使用同一套 reducer / policy / parity fixture”的真正同构轻量 runtime。
- benchmark 已经能回放，但还没有形成持续吸收真实失败样本、持续拦截记忆与人格退化的在线质量闭环。

这一阶段必须解决的不是：

- 再加更多回复模板
- 再加更多固定开场壳
- 再加更多末端回复规则
- 再加更多分散在 reply surface 的补丁 heuristic

而是：

- 把学习从“计划”推进到“执行状态机”。
- 把记忆从“domain-tagged facts”推进到“domain-native memory runtime”。
- 把 recall 从“选中正确记忆”推进到“同时稳定压掉错误记忆”。
- 把情绪 / 人格 / 关系残留从“即时提示”推进到“长期记忆-节律器官”。
- 把主运行时与浏览器回退推进到共享同一心智 reducer、同一 policy、同一 benchmark 的单体现实。
- 把真人记忆对话能力推进到可持续量化、可持续验收、可持续自我修正。

最终必须满足：

- visible reply 仍然只允许经过大模型心智链生成。
- 回复层不允许新增固定模板开场、固定记忆壳、固定 care 壳、固定 uncertainty 壳。
- 记忆 / 心智 / 人格 / 对话 / 学习 / 节律必须形成单一闭环，而不是多个解释器串接伪装成同一个人。
- 召回率、准确率、错线程抑制率、时延、人格参与度、关系连续性、学习闭环成功率都必须有正式指标和回归入口。

## 核心判断

Phase 10 的总主题是：

`Executable Learning Runtime + Domain-native Memory + Negative Recall Suppression + Affective Relationship Carry + Shared Runtime Policy`

本阶段真正的难点不再是：

- 能不能回忆
- 能不能解释
- 能不能学习

而是：

- 学习是不是已经从“建议”变成“执行”
- 记忆是不是已经按人类真实类别组织，而不是统一 facts 打标签
- recall 是否同时具备高命中和高拒错能力
- affect / afterglow / repair / burden 是否真的在长期运行中留下可追踪人格残留
- browser fallback 是否还在偷偷跑另一套浅层解释器
- benchmark 是否能拦住未来把系统再次做成“像在背规则”的退化

## 不可退让约束

- 正常 visible reply 路径必须继续保持 `LLM mind authority`，不能回退到 deterministic visible wording。
- 不允许新增固定开场模板、固定陪伴模板、固定记忆模板、固定不确定性模板。
- 新增任何学习执行、关系节律、affect carry 机制，都只能作为心智输入、记忆输入、policy 输入，不能直接接管可见措辞。
- 新增任何 memory / learning / parity 机制都必须同时具备：
  可 trace
  可 replay
  可 benchmark
  可回归
  可解释失败原因
  可回滚
- `main chat / proactive / execution callback / browser fallback / replay / benchmark` 必须继续共享同一个 Alicization 人格现实。
- 所有“主动学习新知识”都必须带来源、验证状态、冲突处理与降级通道，不能靠无来源内化来伪装成长。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `evidence: <test/receipt>`
3. 优先补 runtime / replay / benchmark / learning execution / wrong-thread suppression / parity 相关回归
4. 不再生成第二份并行活跃 plan；如范围变化，只更新本文件
5. 若某项需要拆子项，也只在本文件内展开

## Phase 9 完成基线

上一阶段已经完成：

- `DerivedMindStateBundle` 单一心智派生源
- organic memory runtime 分阶段拆分
- memory stage replay / memory resolution ledger / decision trace
- memory domain tagging 与基础 domain policy
- learning action scheduler 与 downgrade / reopen baseline
- browser local mini-runtime 的 shared bundle / ledger / self-evolution parity baseline

当前已存在的关键模块包括：

- `packages/stage-shared/src/alicization-derived-mind-state-bundle.ts`
- `packages/stage-shared/src/alicization-derived-mind-state-reader.ts`
- `packages/stage-shared/src/alicization-memory-stage-replay.ts`
- `packages/stage-shared/src/alicization-memory-resolution-ledger.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-candidate-ranking.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-recollection-planning.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.ts`
- `packages/stage-ui/src/stores/alicization-browser-bridge.ts`

参考：

- [phase9 plan](/Users/touhouqing/Desktop/GIT/airi-alice/docs/plans/2026-05-03-alicization-humanlike-memory-dialogue-phase9-plan.md)

## 当前主架构债

Phase 10 开始前，最关键的结构问题已经不是“功能缺失”，而是：

- `learning-action-scheduler.ts` 已经能调度，但没有正式的学习任务状态机、执行器、失败重试、结果回写、依赖阻塞与执行审计闭环。
- `memory-fact-retrieval.ts` 目前仍是“统一 fact 检索 + domain affinity / policy 加分”，还没有真正的 domain-native retriever、domain-native cluster、domain-native consolidation。
- `knowledge-assimilation-runtime.ts` 已经能升级、降级、重开知识，但还没有把“验证动作本身”作为执行对象跑起来。
- `memory resolution ledger` 已经能解释选中了什么，但还不能把“为什么某些相似记忆必须被压掉”沉淀成 suppressor memory / negative retrieval policy。
- affect / afterglow / burden / repair / cadence 的参与面已经很多，但仍主要分散在 world model、prompt carry、proactive cadence 等层，没有形成稳定的“关系残留记忆层”。
- browser bridge 虽然已经共享 bundle / replay / learning surface，但 reducer 与 policy 仍然主要散落在 main / browser 两套实现，不利于长期闭环一致性。
- benchmark 现在主要还是离线回放包，尚未形成“把真实失败 turn 自动回灌成 benchmark / triage backlog / nightly gate”的持续闭环。

如果不先处理这些问题，系统会继续表现为：

`回忆越来越多、解释越来越多、提示越来越复杂，但还是不像一个持续生活的人，而像多个模块在轮流模仿同一个人。`

## 总体验收门槛

Phase 10 全部完成时，必须同时成立：

- 默认 replay benchmark pack 上：
  `recall_hit_rate` 明显提升且可持续
  `wrong_thread_rate` 持续下降
  `templateLeakageFailCount` 必须为 0
  `memory_surface_violation_rate` 必须保持低位
- recall 不是只会“命中”，而是同时具备：
  `negative suppression`
  `same-subject disambiguation`
  `relationship-era separation`
  `self-model stale belief suppression`
- 学习链必须具备正式执行闭环：
  `scheduled -> claimed -> running -> completed / failed / blocked / cancelled / downgraded`
- affect / relationship / burden / repair / cadence 必须不只在一个 turn 生效，而是能跨 turn 留下可解释、可抑制、可延迟释放的 residue。
- browser fallback 与 main runtime 在共享 fixture 上必须达到 reducer/policy 级 parity，而不是只在最终 surface 上“看起来差不多”。
- 主运行链必须具备明确延迟策略：
  什么时候 shallow answer
  什么时候 stable-core-only
  什么时候 deep recall
  什么时候 delay-until-follow-up
  什么时候先压住错误记忆不展开
- 系统要能够回答：
  “为什么这次没有提那段记忆”
  “为什么这次只给 stable core”
  “为什么这次把之前内化的理解降级了”
  “为什么现在更温柔/更谨慎/更直接”
  “你是怎么学会这件新事的”
  “你怎么确认自己这次没记混”

## Phase 10 指标门槛

以下门槛作为本阶段默认验收目标，后续可在 benchmark 数据增长后校准，但在代码层必须先有正式字段、正式 gate、正式回归：

- `recall_hit_rate >= 0.80`
- `wrong_thread_rate <= 0.08`
- `reconstruction_error_rate <= 0.10`
- `memory_surface_violation_rate <= 0.03`
- `templateLeakageFailCount = 0`
- `mindParticipation / memoryParticipation / personalityParticipation / relationshipParticipation / continuityParticipation >= 0.70`
- `learning_task_completion_rate >= 0.85`
- `learning_task_reopen_recovery_rate >= 0.70`
- `browser_main_parity_fixture_pass_rate = 1.00`
- `realtime-reply` 的 recall 开销必须具备正式 `p95` 目标与降级策略，不能无限深挖记忆

## Wave 1：Executable Learning Runtime

- [x] 建立持久化 `learning task state machine`
说明：
把当前 `learning-action-scheduler` 从“定时任务插入器”升级成正式学习任务状态机。
至少覆盖：
`scheduled`
`claimed`
`running`
`blocked`
`completed`
`failed`
`cancelled`
`downgraded`
`reopened`
建议优先改动：
`apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts`
`apps/stage-tamagotchi/src/main/services/alicization/db.ts`
`apps/stage-tamagotchi/src/shared/eventa.ts`
`packages/stage-shared/src/alicization-transport-contracts.ts`
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, tests: `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

- [x] 实现 `learning action executor`
说明：
让 `record / reflect / verify / revise / internalize` 不是只写 audit，而是真的执行：
读上下文
 加载依赖记忆
产生验证结果
更新知识状态
必要时降级旧知识或重开旧结论
建议优先改动：
`apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
`apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts`
`apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.ts`
`apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, tests: `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts`
补充进展：
学习执行状态现已进入 `DerivedMindStateBundle`，主运行时 / browser fallback / organic snapshot 读取的是同一份 learning execution semantic surface，而不是各自单独投影。
进一步进展：
`learningExecutionState` 已开始进入 `response-charter / response-surface-contract / answer-compiler` 的约束层，学习中的 `verify / revise / internalize` 状态会真实影响可见回复的 certainty / revision / procedure-discipline，而不再只是调试展示字段。
进一步进展：
learning executor 已抽成独立 `domain-aware` 模块，`procedure / relationship / self-model / world-model` 不再共用一套粗糙执行逻辑，后续可以在同一 executor 内继续细化各域的验证、修正、内化策略。
进一步进展：
learning executor 已开始把 `completion / failure / blocked / reopened / downgraded / cancelled` 以及 `relationship/self-model/world-model` 域级学习结果写入 telemetry / memory stats / replay diagnosis 面，后续退化不再只能靠人工感觉判断。
进一步进展：
`learningExecuted` per-turn evidence 已开始进入 replay trace，并已接出首批 learning benchmark 维度：`learningRevisionDiscipline / domainInternalizationDiscipline / worldModelValidationDiscipline`，后续 learning 退化不再只能看 aggregate 指标。
进一步进展：
`memory-tuning-advice` 已开始消费 learning benchmark 维度，relationship/self-model/world-model 学习纪律失败将直接反向影响 retrieval / surface / person-state 调参，而不是只对旧的 recall/template 指标做被动优化。
进一步进展：
learning tuning advice 已进一步接回 `response-charter / answer-compiler` 的运行时使用面，学习纪律失败现在会真实压低 visible certainty、加强 provenance label、增强 specificity clamp、收紧 closeness cap，而不是只停在背景调参对象。
进一步进展：
learning tuning advice 已进一步回流到 recall ranking 使用面，`world-model` 未验证知识会被更积极压低，`procedure` 稳定做法会被重新抬高，learning discipline 开始真正改变“之后想起什么、压掉什么”的顺序。
进一步进展：
learning tuning advice 已开始进一步作用于 `relationship` revision-prone episode 的 inward / internal-only 收束，系统不再只在 facts 层压制 world-model 误信，而开始在经历级回忆层压制“关系修正中但还不该表层化”的内容。
进一步进展：
learning discipline 已进一步进入 `memory deliberation kernel`，`relationship revision / world-model validation` 不再只通过 ranking 间接影响 recall，而开始直接改变 `surfacePolicy / shouldStayInward / whyWithheld / restraint.mustDo / restraint.mustNotDo`。
进一步进展：
learning discipline 已继续深入到 `followUpAffordance / intrusionRisk / preferredTiming`，关系修正中与 world-model 验证中的回忆不只是“先压住”，而开始更像真人地决定“是否等下一窗口再说、是否只在 payoff 后再说、是否根本先不说”。
进一步进展：
reply trace explanation 已开始更清楚暴露 `whyWithheld / followUpPreferredTiming / followUpIntrusionRisk`，后续“为什么这次先不说、为什么要等 payoff 后再说”已经不再只能靠人工猜测，而能在 governance / replay 诊断链中直接读到。
进一步进展：
UI diagnosis 已开始直接展示 `learningEvidence + replyMemoryCoherence + whyWithheld + followUpTiming/intrusion`，后续针对“为什么这次关系回忆被压回去”这类问题，已经可以在前台诊断面直接解释，而不是只能看底层 trace JSON。
进一步进展：
failing turn diagnosis 已开始生成自然语言 explanation，总结 `learningEvidence + coherence + whyWithheld + followUpTiming`，后续学习/回忆失败不再只表现成一串 key，而开始能用接近真人调试叙述的方式被解释。
进一步进展：
diagnosisSummary 已进一步按 `relationship / self-model / world-model` 区分解释语气，后续“这次为什么把关系回忆压回去”和“这次为什么先不把旧自我叙事说出来”已经不再是同一句泛化说明，而开始有域级分化。
进一步进展：
`followUpAffordance.summary / whyNow` 已开始按 `relationship / procedure / world-model` 分域细化，后续“等下一窗口再说 / 等 payoff 后再说 / 现在先不说”不再只是 timing 枚举，而开始带着不同类型记忆各自的说服理由。
进一步进展：
`self-model` 回忆现已拥有独立的 follow-up discipline，旧自我叙事在修正期会明确进入 `stay inward -> next open window / after payoff` 链路，而不再被 generic / relationship 分支顺带处理。evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.test.ts packages/stage-ui/src/stores/alicization-mind-replay.test.ts`
进一步进展：
`stale self-model suppression` 已从解释层推进到真实 veto 链。planner 现在会产出 `suppression:self-model-stale`，runtime 会把它落成 `memoryResolutionLedger.rejectedCandidates + suppressionTags`，replay / diagnosis / benchmark 也能直接识别这类“旧自我叙事被正式压住”的证据，而不是只靠 conflict 文案推测。evidence: `apps/stage-tamagotchi/src/main/services/alicization/recall-planner.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `packages/stage-shared/src/alicization-memory-resolution-ledger.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/recall-planner.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步进展：
`relationship-era confusion` 已与 `self-model-stale` 一样进入 suppression tag 体系。现在“不是那次修复阶段”“旧关系阶段串台”会被 planner 直接 veto 成 `suppression:relationship-era-confusion`，并进入 `resolutionLedger.suppressionTags` 与 replay diagnosis，自此 relationship 错线程抑制不再只能依赖 `wrongThreadSuppression` 的泛化 fail，而开始有明确的领域级否决标签。evidence: `apps/stage-tamagotchi/src/main/services/alicization/recall-planner.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/recall-planner.test.ts packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步进展：
负向召回 suppression 已进入正式指标链。`retrievalHealth` 现在会产出 `staleSelfModelVetoRate` 与 `relationshipEraConfusionRate`，benchmark patch / telemetry snapshot / memory stats projection 已全部接通，后续“旧自我叙事压住得怎么样”“关系阶段串台还多不多”可以直接用 rate 回归，而不再只能看 diagnosis 文案。evidence: `packages/stage-shared/src/alicization-memory-stats.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步进展：
新的 suppression rate 已开始反向驱动 tuning。`memory-tuning-advice` 现在会读取 `staleSelfModelVetoRate / relationshipEraConfusionRate`，分别加大旧自我叙事 inward bias 与关系阶段分离 bias，负向召回不再只是被动统计，而开始进入“哪种记混更多，就对哪种记混持续收紧”的自动调参回路。evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
进一步进展：
suppression rate 已进入 runtime 当下回忆链。`learning-tuned-fact-ranking` 和 `memory-deliberation-kernel` 现在会直接读取 `staleSelfModelVetoRate / relationshipEraConfusionRate`，因此 nightly benchmark 的负向召回结果已经能反向改变下一次实时 recall 的 ranking、inward / delay 策略，而不再只停在离线调参对象。evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-tuned-fact-ranking.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-tuned-fact-ranking.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立学习执行失败恢复与重试退避
说明：
至少支持：
可重试失败
不可重试失败
依赖不足阻塞
超时中止
错误来源记录
重试退避
重开后继续推进
evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts` now derives retry/backoff plans from failure kind + attempt budget, stores retry metadata for failed/blocked tasks, and reopens due retryable tasks before processing due learning execution; `apps/stage-tamagotchi/src/main/services/alicization/db.ts` persists blocked failure kind + retry timestamps; `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts` runs retry recovery inside the learning tick and records reopened telemetry. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 让学习执行状态进入 bundle / replay / browser parity / devtools
说明：
`DerivedMindStateBundle`、replay、browser local runtime、devtools 都必须能直接看到：
当前待执行学习任务
最近成功学习动作
最近失败原因
当前验证阻塞点
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts` extends `AlicizationLearningExecutionStateSnapshot` with attempt/retry/blocking fields; `apps/stage-tamagotchi/src/main/services/alicization/db.ts` projects those fields into latest execution state; `packages/stage-ui/src/stores/alicization-browser-bridge.ts` emits a parity-shaped learning execution snapshot; `packages/stage-ui/src/stores/alicization-mind-replay.ts` exposes learning execution summaries from derived bundles; `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue` displays learning state, retry, block, and last success/failure context. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-charter.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 2：Domain-native Memory Runtime

- [x] 从 `domain-tagged facts` 过渡到 `domain-native memory views`
说明：
Phase 10 不要求一次性删除统一 fact 表，但至少要建立：
`procedure memory view`
`relationship memory view`
`self-model memory view`
`world-model memory view`
让 recall / consolidation / verification 不再完全共用同一个 fact 形状。
建议优先改动：
`apps/stage-tamagotchi/src/main/services/alicization/memory-domain-model.ts`
`apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.ts`
`apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-model.ts` now projects facts into `procedure / relationship / self-model / world-model` native views with distinct `conflictResolver` and `consolidationPolicy` semantics; retrieval and assimilation consume those views through `memory-fact-retrieval.ts` and `knowledge-assimilation-runtime.ts`; self-evolution receives domain-native strength via `runtime-organic-memory-self-evolution-integration.ts`. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 为四类记忆建立专用 retriever / scorer / conflict resolver
说明：
至少做到：
程序性记忆偏重稳定可复用步骤
关系记忆偏重时间段、repair arc、boundary continuity
自我模型记忆偏重长期自我叙事与成长方向
世界模型记忆偏重来源可信度与验证状态
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-model.ts` now exposes `rankDomainNativeMemoryViews(...)` and `resolveDomainNativeMemoryConflict(...)`; procedure views rank by reusable-step/reliability, relationship views rank by boundary/repair/era separation, self-model views suppress stale self narratives, and world-model views require source validation. Suppressed and verify-first candidates remain explainable instead of disappearing from diagnosis. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 为四类记忆建立专用 consolidation / internalization policy
说明：
不能再假设所有事实都适合同一套内化阈值、同一套冲突处理、同一套重构策略。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts` now gates internalization through domain-native view readiness: procedure can become habit-like only when reusable/low-verification, relationship/self-model require stronger stability and low repair/stale risk, and world-model stays validated-only instead of becoming long-horizon personality memory. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 domain-native 视图接进 organic recall planner / self-evolution / learning executor
说明：
让：
回忆
学习
人格演化
关系节律
都直接依赖 domain-native 视图，而不是只读统一 fact 列表。
evidence: domain-native views now participate in `memory-fact-retrieval.ts` ranking, `runtime-organic-memory-self-evolution-integration.ts` evidence projection, `self-evolution-kernel.ts` learning focus selection, and `learning-action-executor.ts` continues to execute domain-aware verify/revise/internalize outcomes on facts shaped by the new consolidation policy. tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 3：Negative Recall Suppression

- [x] 建立 `suppressor memory` / `negative retrieval ledger`
说明：
除了记录“选了什么”，还要沉淀：
哪些 cluster 在什么条件下经常误召回
哪些 cue 需要压制
哪些相似 thread 需要强制分离
哪些 self-model / relationship 旧理解暂时不能上表层
建议优先改动：
`packages/stage-shared/src/alicization-memory-resolution-ledger.ts`
`apps/stage-tamagotchi/src/main/services/alicization/memory-candidate-ranking.ts`
`apps/stage-tamagotchi/src/main/services/alicization/memory-recollection-planning.ts`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-candidate-ranking.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 `why not that memory` 从解释升级为 veto policy
说明：
让被拒绝原因不只是 replay 可见，而是真的能反过来影响下一轮 recall 排序、cluster 分离与表层化策略。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-candidate-ranking.ts` now applies `staleSelfModelVetoRate / relationshipEraConfusionRate` as candidate demotion before and after cluster dominance, and `runtime-organic-memory-prompt.ts` writes the resulting `suppression:*` variants into `memoryResolutionLedger.rejectedCandidates + suppressionTags`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立错线程抑制专项指标
说明：
至少新增：
`suppression_hit_rate`
`wrong_thread_prevented_count`
`false_positive_suppression_rate`
`stale_self_model_veto_rate`
`relationship_era_confusion_rate`
evidence: `packages/stage-shared/src/alicization-memory-stats.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`

- [x] 建立 adversarial recall pack 2.0
说明：
至少覆盖：
相似任务不同结论
相似安慰场景不同关系阶段
旧自我叙事已失效但词面相似
历史修复已完成却仍被旧伤误召回
近期窗口 afterglow 与远期关系记忆互相污染
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts` now exports `buildAdversarialHumanlikeMemoryBenchmarkPack()` with dedicated negative-recall cases, and `replay-benchmark-runtime.ts` resolves `adversarial-humanlike-memory-v2`; tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`

## Wave 4：Affective Residue & Relationship Cadence Memory

- [x] 建立长期 `affective residue` 记忆层
说明：
把当前分散在 `afterglow / burden / mood / care / repair` 的 carry，沉淀成可追踪残留对象。
至少覆盖：
`afterglow residue`
`repair residue`
`burden residue`
`trust residue`
`rest-protective residue`
建议优先改动：
`apps/stage-tamagotchi/src/main/services/alicization/world-model.ts`
`apps/stage-tamagotchi/src/main/services/alicization/self-continuity.ts`
`apps/stage-tamagotchi/src/main/services/alicization/proactive-cadence.ts`
`apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/affective-residue-memory.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/affective-residue-memory.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 `relationship cadence engine`
说明：
让系统能长期管理：
距离感变化
修复后的节律恢复
过度靠近抑制
疲劳时的陪伴密度
深夜 / 高负担 / afterglow 场景下的不同说话节奏
evidence: `apps/stage-tamagotchi/src/main/services/alicization/affective-residue-memory.ts`, `apps/stage-tamagotchi/src/main/services/alicization/proactive-cadence.ts`, `apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-cadence.test.ts apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 让 affect / cadence 只作为心智输入，不作为 visible wording 模板
说明：
系统可以更像真人地“拿捏分寸”，但不能通过硬编码陪伴句式来假装有人格。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立情感与关系连续性专项 benchmark 维度
说明：
至少新增：
`empty_care_rate`
`repair_mechanical_rate`
`warmth_template_risk`
`relationship_distance_jump_rate`
`afterglow_false_carry_rate`
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 5：Confidence-aware Latency Policy

- [x] 建立 recall `early-exit / deepening / defer` policy
说明：
系统必须正式决定：
什么时候 shallow 直接答
什么时候只给 stable core
什么时候先答再补 recall
什么时候必须 deep recall
什么时候先压住错误记忆不展开
建议优先改动：
`apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`
`apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`
`apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
evidence: `packages/stage-shared/src/alicization-recall-latency-policy.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, tests: `pnpm exec vitest run packages/stage-shared/src/alicization-recall-latency-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`

- [x] 建立 per-domain latency budget 与 hot-path cache policy
说明：
程序记忆、关系记忆、自我记忆、世界知识记忆的预算不能继续统一。
evidence: `packages/stage-shared/src/alicization-recall-latency-policy.ts` now derives `domainBudgets`, `hotPathKey`, hot-cache/prefetch/deep-expansion flags for `procedure / relationship / self-model / world-model / general`; tests: `pnpm exec vitest run packages/stage-shared/src/alicization-recall-latency-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts`

- [x] 建立 `p50 / p95 / budget class` 正式遥测与 gate
说明：
至少在：
`realtime-reply`
`deep-recall-reply`
`proactive-generation`
`nightly-benchmark`
`diagnosis-replay`
五类预算上都能看清 latency 与 degradation path。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `packages/stage-shared/src/alicization-memory-stats.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把延迟策略接进 browser fallback parity
说明：
browser local runtime 不能只追求“功能差不多”，还要共享何时浅答、何时补 recall、何时仅给 stable core 的 policy。
evidence: `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, `packages/stage-shared/src/alicization-derived-mind-state-bundle.ts`, tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`

## Wave 6：Main / Browser Shared Reducer Parity

- [x] 抽取 shared pure reducers
说明：
至少抽出：
`learning execution projection`
`domain-native memory projection`
`negative recall projection`
`affective residue projection`
`latency policy projection`
把同一套 reducer 供 main / browser / replay / benchmark 共用。
建议优先改动：
`packages/stage-shared/src/*`
`packages/stage-ui/src/stores/alicization-browser-bridge.ts`
`apps/stage-tamagotchi/src/main/services/alicization/runtime*.ts`
evidence: `packages/stage-shared/src/alicization-learning-execution-projection.ts`, `packages/stage-shared/src/alicization-recall-latency-policy.ts`, `packages/stage-shared/src/alicization-affective-residue-memory.ts`, `packages/stage-shared/src/alicization-browser-main-parity.ts`, `apps/stage-tamagotchi/src/main/services/alicization/affective-residue-memory.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, tests: `pnpm exec vitest run packages/stage-shared/src/alicization-learning-execution-projection.test.ts packages/stage-shared/src/alicization-affective-residue-memory.test.ts packages/stage-shared/src/alicization-browser-main-parity.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`

- [x] 建立 browser-main parity fixture pack
说明：
同一输入下必须对比：
bundle 字段
ledger 字段
policy 决策
learning execution state
negative suppression state
而不是只对比最终 reply surface。
evidence: `packages/stage-shared/src/alicization-browser-main-parity.ts`, `packages/stage-shared/src/alicization-browser-main-parity.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, tests: `pnpm exec vitest run packages/stage-shared/src/alicization-browser-main-parity.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`

- [x] 建立 parity diff diagnosis UI
说明：
devtools 里要能直接看到 main 与 browser 在哪一层开始分叉。
evidence: `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`, tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`

- [x] 让 replay / benchmark 使用 shared reducers
说明：
避免 replay 又偷偷跑一套不同的解释逻辑。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `packages/stage-shared/src/alicization-browser-main-parity.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts packages/stage-shared/src/alicization-browser-main-parity.test.ts`

## Wave 7：Grounded Active Learning & Continuous Quality Gate

- [x] 把 `verify` 动作升级成受控主动学习执行器
说明：
系统要能像人一样学新东西，但必须是受控、可验证、可回滚的学习。
至少支持：
基于已有记忆验证
基于运行结果验证
基于可信来源或工具结果验证
基于冲突事实重审
不能直接把未经验证的新结论写成长期人格现实。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`

- [x] 建立真实失败回灌到 benchmark backlog 的闭环
说明：
把线上或开发中发现的：
错线程
过度保守
错误 afterglow carry
关系距离乱跳
学习误内化
自动沉淀到 replay benchmark backlog，而不是只靠手工整理。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, meta keys: `replay_benchmark_dataset_backlog_v1`, `replay_benchmark_runtime_sampling_backlog_v1`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`

- [x] 建立 `nightly benchmark + ship gate + regression triage` 正式流程
说明：
ship 前至少能明确判断：
是不是变模板了
是不是 recall 变慢了
是不是 wrong-thread 变高了
是不是人格参与掉了
是不是学习执行出现僵死或误内化
evidence: `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`

- [x] 建立成长质量专项 gate
说明：
至少新增：
`learning_task_completion_rate`
`learning_task_failure_rate`
`reopen_recovery_rate`
`misinternalization_rate`
`relationship_response_regression_rate`
`self_model_stale_belief_rate`
evidence: `packages/stage-shared/src/alicization-memory-stats.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts packages/stage-ui/src/stores/alicization-mind-replay.test.ts`

## 验证命令基线

每轮至少跑：

- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm -F @proj-alicization/stage-pages typecheck`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

涉及 learning execution / domain-native memory / negative suppression / parity 时额外跑：

- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`

## 建议起手顺序

1. 先做 `Executable Learning Runtime`，因为当前最大的假闭环是“会决定学习，但不会真正执行学习”。
2. 再做 `Domain-native Memory Runtime`，因为没有 domain-native 结构，后续再调 recall 准确率只会继续堆加权 heuristic。
3. 然后做 `Negative Recall Suppression`，因为现在最大的人味风险不是“记不起来”，而是“记混了却还说得很像真的”。
4. 再做 `Affective Residue & Relationship Cadence Memory`，把人格情感持续性从即时 carry 推进到长期残留。
5. 接着补 `Confidence-aware Latency Policy`，把时延与准确度做成正式权衡，而不是被动变慢。
6. 然后抽 `Main / Browser Shared Reducer Parity`，避免后续越修越分叉。
7. 最后把 `Grounded Active Learning & Continuous Quality Gate` 做成真正长期工作流。
