# Agent 增益系统调研与桌面接入

后续的当前版本对照、真实 Live2D 桌面任务验收及修复见 [Agent 全链能力对照与实际验收](2026-11-03-agent-capability-acceptance.md)（2026-11-04 完成）。本文及其 validation 保留本阶段的源码和验证快照，不替代后续验收结果。

日期：2026-11-03。项目仍以 Phase 1 的同一个人格、记忆、关系和生命运行时为中心。这轮扩大到 Agent 的辅助系统与完整任务生命周期，并实际接入工具发现、长期方法库扩容和请求用量诊断。前两轮的工具批次、回执分页、失败反馈和方法检索继续保留。

本文中的“接入”指生产代码已有调用路径；“已有”指本项目原本存在的能力；“参考”指阅读后的架构决策。下载源码、通过模拟协议测试、完成真实模型任务是不同证据，不能相互替代，也不能据此声称与四个产品能力相当。

## 固定来源与阅读范围

| 项目 | 本轮固定 commit | 材料数 | 主要检查对象 |
|---|---|---:|---|
| [Codex](https://github.com/openai/codex/tree/1a604d58da344c84528fecd5b5154105f597d70b) | `1a604d58da344c84528fecd5b5154105f597d70b` | 37 | Skills、工具搜索、Hook/MCP、目标预算、上下文、进程、输入队列、恢复、用量、基准入口 |
| [Pi](https://github.com/earendil-works/pi/tree/642e30b68930a644050794011555a04ed9027eb4) | `642e30b68930a644050794011555a04ed9027eb4` | 36 | 扩展生命周期、资源包、技能、会话树、压缩、SDK/RPC、重试、用量与成对评测 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness/tree/ce7073d51254c26cd63b22a60835b8f948deb447) | `ce7073d51254c26cd63b22a60835b8f948deb447` | 112 | 插件分层、目标续行、Jobs、PTC/Workflow、权限、Checkpoint、MCP/LSP、反馈和长历史基准 |
| [Hermes](https://github.com/NousResearch/hermes-agent/tree/013bde4786db7afbd72c44a1d15ee78876c9cb96) | `013bde4786db7afbd72c44a1d15ee78876c9cb96` | 75 | 工具延迟加载、技能出处/版本/使用、记忆提供者、历史搜索、缓存、后台进程/委派、定时 occurrence 与验收 |

共取得 260 份选定源码或文档，逐文件核对 Git blob 身份，并记录本地 SHA-256。完整清单见 [source manifest](2026-11-03-agent-ecosystem-source-manifest.json)。这些是选定材料的数量；重点阅读下列入口及其实现节点，不表示对四个仓库每一行代码做过审计。上游依赖和安装脚本没有运行。

前两轮已经移植的 Codex/Pi 模块继续保留其原固定版本与许可证，详见 [上一轮移植记录](2026-11-03-agent-harness-deep-integration.md)。本轮更新调研快照，不会把旧移植代码的来源改写成新 commit。

## 增益功能与生命周期对照

下表的路径相对于各自固定仓库；本地路径相对于 `apps/stage-tamagotchi/src/main/services/alicization`。每项都说明采用位置或保留边界。

| 环节 | 上游具体实现节点及启发 | Alicization 落点与结论 |
|---|---|---|
| 用户输入、插话、来源 | Codex `session/input_queue.rs` 区分用户、函数结果、Agent 消息，保留 acceptance order 与 origin；Pi `extensions/runner.ts: emitInput` 区分 steer/followUp | 已有 `turn-os/event-loop.ts`、`life-turn-runtime.ts`、`execution/action-responsibility.ts`。新工具沿用当前 turn 的来源，旧会话文本不能授权新动作 |
| 持久目标与续行 | Codex `ext/goal/src/runtime.rs` 独立控制目标预算；DSH `goal-round-driver` 将目标状态与发起下一轮分开 | 已有 `execution/work-plan-execution-runtime.ts`、`work-plan-scheduler.ts`。保留多项生活责任；聊天结束不等于任务完成 |
| 计划和 Todo | Pi `examples/extensions/plan-mode`、DSH `tool-todo`/`tool-workflow`、Hermes `todo_tool.py` 将结构化进度提供给模型 | 已有工作 DAG、版本与验收合同。前两轮新增 `agent-harness/progress-context.ts` 从真实调用与结果派生提示，不再创建另一个 Todo 真相源 |
| 工具发现 | Hermes `tool_search_catalog.py` 的名称/说明/参数名索引、BM25、稀有词准入与长查询覆盖率；Codex `handlers/tool_search.rs` 从当前注册表构建可加载接口 | **本轮源码移植并接入** `third-party/hermes-tool-catalog.ts`、`agent-harness/capability-disclosure.ts`。从可执行工具目录生成元数据，当前注册状态始终有效 |
| 按需加载接口 | Hermes `tool_search.py` 保留基础工具，仅延迟适合的工具；目录重建避免陈旧缓存；Codex 区分 deferred exposure | **本轮接入**：大工具目录先提供核心与相关接口；搜索后最多 3 个匹配接口可在下一步使用，也支持按名字描述。加载回执来自当前 turn 的已完成动作 |
| 工具参数与完整批次 | Pi 原子处理完整 assistant 工具消息；DSH `core/tool-executor-native` 有明确执行边界 | 前两轮已接入最多 8 项完整批次。格式错误、重复 ID、截断或撤销阻止部分发布；按动作分别鉴权、持久化与执行 |
| 结果压缩与回读 | Pi `tools/truncate.ts` 保留头尾；DSH `compaction-tool-result-pruner` 保留规范日志并产生可回放投影 | 前两轮已接入 `agent-harness/tool-observation.ts`，UTF-8 分页回读同 turn 原始回执，哈希绑定；读取不会重新执行动作 |
| 上下文预算 | Hermes `context_pin.py` 尊重显式窗口；压缩器保留近期工具轮和已加载技能；Codex `context_window.rs`/`retained_context.rs` 区分保留上下文 | 已有 `life-provider-budget.ts`、记忆所有者与受保护事实。采用保留身份、当前请求、未知效果与回执的预算；不把压缩摘要升级成事实 |
| 稳定前缀与缓存 | Hermes `prompt_cache_boundary.py` 由构建器声明稳定前缀，避免解析技能内容中的分隔符；Codex `skills/catalog_delta.rs` 对技能增量共享预算 | 工具投影顺序确定，常用 shortlist 同一请求内稳定；**本轮补真实缓存用量诊断**。未向 OpenAI 兼容接口注入 Anthropic 专属缓存字段，也不宣称缓存命中率已提高 |
| 实际请求成本 | Pi `usage-totals.ts` 区分输入/输出/缓存及真实成本来源；Hermes `turn_usage.py` 对缺失 usage 也计请求、保持未知 | **本轮接入** `agent-harness/provider-usage.ts` 与流式 runner。每次尝试唯一 ID，缓存是输入子集，缺失值保留未知；不推算价格 |
| 扩展和 Hook | Pi `extensions/runner.ts` 对 handler 做快照，工具调用可阻止、结果变更同步结构化结果；Codex `hook_runtime/executor.rs` 只选择通过当前发现与策略的 Hook | 保留 Eventa、DI、ToolRegistry/adapter 边界。避免直接加载另一套 Python/TS 插件执行器形成平行权限系统；元数据加载不能改变执行结果或审核结论 |
| MCP | Codex `mcp_tool_approval_templates.rs`、`mcp_skill_dependencies.rs`；DSH `mcp-client`/`mcp-resources` 分离连接与资源接口；Hermes 延迟 MCP 目录 | 已有 MCP 注册、后端可用性与调用包装。新目录只包含已经构建出来的执行接口，注册表存在一个名字不足以把没有后端的工具暴露给模型 |
| 资源包和模板 | Pi `resource-loader.ts`/`package-manager.ts` 管理技能、模板、扩展及来源；Hermes `skill_bundles.py`/`skill_linter.py` | 沿用 `turn-os/skill-loader.ts` 与既有受管理技能目录。没有新增自动安装市场代码并立即激活的路径 |
| 持久技能库容量 | Hermes `skill_ledger.py` 使用内容哈希和不可变版本；其使用状态与 SKILL 内容分离 | **本轮接入** `execution/procedure-index.ts`：候选 32→1000，32 项一页，根索引和变化页在原生命事务中提交；配套调整加载和状态存储上限 |
| 方法来源与准入 | Hermes `skill_provenance.py` 明确区分用户要求与后台评审，不能从目录推断出处；`skill_usage.py` 明确“被加载”并非任务成功 | 已有 `procedure-admission.ts`、`procedure-candidate-repository.ts`、`procedure-source-input.ts`。只从独立验收过的当前工作抽取结构，原私人参数不进入技能正文 |
| 技能检索与新参数 | Codex 技能词法/字符检索；Pi/DSH 元数据先行，正文按需读取 | 前两轮已接入中文与参数角色检索；**本轮增加分页和目录版本校验**。当前精确方法调用只核验指定候选，不对所有方法重新做调用准入 |
| 学习、修复与反例 | Hermes ledger 留存版本与回滚，usage 记录 patch 后再次使用；DSH feedback 带目标版本 | 已有 `procedure-evaluator.ts`、`procedure-performance.ts`、`procedure-failure-repository.ts`。真实失败降级，换新参数、取消、接口变化、性能对照后才重新批准；“加载过”不能代替成功 |
| 记忆提供者 | Hermes `memory_manager.py` 将提供者协议、预压缩写入与检索分开；只允许一项外部提供者避免冲突 | 已有 `memory-os`、分层记忆和明确所有者。保留本地记忆、关系、人格的统一所有权，外部插件不能创造另一个“她” |
| 跨会话检索 | Hermes `session_search_tool.py` 以实际数据库消息检索，区分 browse/search/scroll/read，按谱系去重并降低 cron 噪声 | 参考其出处、窗口和噪声隔离；本项目已有 `memory-os/candidate-retrieval.ts`、`recall-intent.ts`、版本化证据。未把完整原始聊天索引当成长期人格记忆 |
| 记忆内容的信任边界 | Hermes `memory_context.py` 将 recalled context 与当前用户指令分开，并处理跨流式片段的标签泄露 | 保留既有 typed facts、`life-reply-grounding-runtime.ts` 与可见回复解码。工具/记忆中的内容不能提升为执行指令或完成回执 |
| 后台进程与 Job | Codex `unified_exec/process_manager.rs`/`async_watcher.rs` 管理进程和输出；Hermes `process_registry_ownership.py` 绑定进程起始身份；DSH Jobs 明确是进程内注册表 | 已有 `execution/resource-broker.ts`、`host-effect-control.ts`、执行适配器与 Windows 所有权检查。不能照搬“重启丢失 Job 后重跑”到有副作用的桌面操作 |
| 委派与子任务 | Hermes `delegate_tool_dispatch.py` 在创建子 Agent 前捕获发起会话，后台单元按实际完成持久化；Codex `multi_agents_v2/{spawn,wait}.rs` | 已有 coding-agent task 合同及父责任。参考来源、结果、取消和失败原因；本轮没有另起四套模型循环，也没有自动创建其他聊天 |
| 委派预算 | Hermes `iteration_budget.py` 是每 Agent 独立预算，子任务总成本可能更高；DSH `workflow-ptc` 同时限制 worker 数、总任务与同步时间片 | 保留原目标、并发资源和取消限制。63 项动作/64 次主模型步是当前 turn 限制，不应解释为所有外部编码器的总消耗已被统一封顶 |
| 超时和重试 | DSH `guard/timeout-policy` 等待协作停止后结算；Codex `responses_retry.rs` 保留服务端建议但不增加预算；Pi provider retry 独立分类 | 已有 `provider-retry-policy.ts`、dispatch gate 与未知效果围栏。公开前缀或动作副作用之后不能把整个回合简单重试 |
| 崩溃与恢复 | Codex `session/daemon_recovery.rs` 要求已写入并 flush 的输入；DSH `session-checkpoint-policy` 在模型调用与顶层工具体之前 flush | 已有 `turn-os` checkpoint、`life-turn-runtime.recover`、`work-plan-recovery.ts`。本轮测试继续覆盖 SQLite 回执和重启；未知动作结果需要核对，不能当作未执行 |
| 定时与主动性 | Hermes `cron/occurrences.py` 绑定确切 scheduled instant，持久化未 claim 的 pending slot；DSH schedule 与 goal 分离 | 已有主动性、节律、责任和反馈所有者。借鉴防丢失/防重复，不把定时任务触发次数当作生命感指标 |
| 用户反馈与成长 | DSH `message-feedback` 在 canonical log 上对具体 assistant 消息做 CAS，等待真正持久化再通知观察者 | 已有 `runtime-dialogue-feedback.ts`、`runtime-execution-feedback.ts`、`life-growth-repository.ts`。用户评分、执行成功与人格学习继续分别审查 |
| PTC、代码导航与专业能力 | DSH `workflow-ptc`、`lsp`、`skill-office` 提供明确的 provider 接口；Hermes code-execution RPC 约束可调用工具 | 保留现有编码代理与专业适配器。原生 LSP 和任意 PTC 运行时仍需单独的工具合同与宿主实现；本轮没有把上游可选插件记成本项目已安装功能 |
| 评测与效率闭环 | Pi `packages/evals` 成对隔离资料变量、缺失实验臂不报告 lift；Hermes `evals/approval_deny_dispatch.py` 验证生产 dispatcher 未触及惰性 marker；DSH continuation benchmark 用合成模型配合真实文件管线 | 本轮采用真实 SSE→xsAI→生命事务→回执的测试，以及 1000 项存储/加载/翻页测试。基准中的合成流不证明推理能力，选定模型的小样本不能代表跨产品胜率 |

## 本轮生产实现

### 1. 工具发现接到现有行动链

入口是 `main-chat-execution-surface.ts` 和 `main-chat-background-run.ts`。仅在工具数大于 16、接口定义超过 12000 UTF-8 字节、两个发现接口均可用时启用缩减；已经收窄的显式工作流和回复阶段保留自身约束。

核心接口与最多四个相关接口直接提供。模型可以调用 `life_search_capabilities`，检索名称、说明和顶层参数名，结果最多十项；前三项的精确当前接口在下一步提供。知道名字时可以调用 `life_describe_capabilities`，一次最多三项，正文预算 24000 字节。最近加载记录最多保留六个名字，按真实事件顺序刷新。

这避免强制每次都经历“搜索→描述→执行”三个模型步骤；搜索可以直接接下一步操作。描述接口仍可用于明确检查 schema。检索不执行操作，也不创建执行许可。

```mermaid
flowchart LR
  U[当前请求与统一生命状态] --> S[核心接口和相关接口]
  S --> Q[搜索或按名称描述]
  Q --> J[本轮动作结算回执]
  J --> H[核对当前注册状态与接口哈希]
  H --> P[下一步真实操作提议]
  P --> A[既有鉴权与 dispatch gate]
  A --> R[执行结果和独立验收]
  R --> L[合格来源的方法学习]
  R --> U
```

加载依据必须同时满足：当前 turn 的真实 assistant 工具调用、已完成且成功的动作、匹配的 terminal observation ID 和 tool call ID、规定的结果类型、当前可用目录、相同接口哈希。普通模型文本、其他工具返回的伪装对象、已撤销或修改的接口都不能让操作进入下一次请求。

实际执行继续经过 ToolRegistry、`life.beforeAction`、`authorizeDispatch`、风险策略、取消与 `life.afterAction`。危险操作的权限不会因为检索成功而改变。源码移植范围和修改说明见 `resources/licenses/hermes-agent-notice.txt`；上游 MIT 许可证随桌面资源保存。

### 2. 方法库容量、迁移、查询和撤销

旧 v1 候选索引最多 32 项，继续读取其已发布数据；第一次新增候选或写入评估结果时，原子迁移为 v2。兼容的明确目的，是保留用户已经学会、评价和批准的方法，不是增加另一份状态。

v2 根索引保存总量和内容哈希页引用。每页最多 32 项，候选最多 1000；修改单个评价只写变化页与根，历史页不覆写。页内容、顺序、总数、重复身份及哈希都会核对，缺页/损坏不会被解释为空库。读取通过原数据库按 `card_id` 隔离。

`runtime.ts` 为桌面技能加载器配置 1128 个版本预算，包含 1000 项学习候选与原先的 128 项其他技能余量；生命周期持久化使用同一上限。通用加载器的默认预算仍是 128。扩大容量不会自动批准候选，也不会把相同 ID 的多个版本同时激活。

`life_list_learned_procedures` 支持 query、offset、limit、expectedCatalogHash。默认八项，最多二十项，普通页正文目标不超过 16000 字节；单项大 schema 仍能通过已有回执读取器查看。关键词检索提供最多四项相关方法，精确 ID/version 可找到后面的版本。翻页期间目录改变会返回 `catalog-changed`，要求从第一页核对。

方法执行仍要求相同源任务、输入证据、当前接口、独立 replay、批准和活动版本。失败降级、来源撤回、旧版本失效及重新评估继续使用既有生命写入者。历史页的存在不会恢复被撤销的方法。库容量的测试使用合成身份和技能文档；真实方法来源的安全性另由实际文件学习/验收/撤销集成测试覆盖。

### 3. 实际请求与缓存用量诊断

每一次主聊天模型尝试分配 requestId，关联 turn、providerAttempt、消息 requestHash、provider、model 与结算状态。只记录供应商真正报告的 input/output/total/cache-read/cache-write/reasoning 数字。缓存命中是输入的一部分，不重复叠加到总量；缺失字段保留 null。

安装的 xsAI 可能先发送 finish，稍后才解析 usage。实现同时读取事件与结果 promise，成功文本结束后的诊断等待最多 100 ms，公开文字已正常流式发送。一次请求只输出一份用量记录；汇总按 requestId 去重，将已知小计与完整性分开。失败重试是另一个真实请求，不合并成一次“成功成本”。

记录通过现有 `appendRuntimeDebugLine` 输出；宿主开启 runtime debug log 时保存在用户数据目录的 `alicizations/runtime-debug.log`。这轮没有增加用户费用面板、报价估算或新的永久计费数据库。服务端未报告用量时无法证明缓存命中，诊断不会伪造数字。

## 验收与可复查材料

完整命令、结果、当前源码指纹和编译产物哈希记录在 [validation](2026-11-03-agent-ecosystem-validation.json)。原始日志在被 Git 忽略的 `output/agent-ecosystem-study-20261103/`。

- 工具发现：相关性与无匹配；接口定义缩减；真实 SSE 的搜索/描述/操作；搜索直接接操作；已加载后撤销；接口内容改变；其他 call ID 和未结算结果不能加载。
- 实际生命链：生产 background runner、实际 xsAI、SQLite 生命事务和 runtime 事件，逐项验证一次执行、结算回执与单次回复；撤销后没有目标 adapter 执行。
- 方法持久化：已发布 v1 数据迁移、实际独立验收过的来源、重复版本去重、事务失败回滚、1000 项页读取与重启、跨 card 隔离、内容损坏拒绝。
- 技能加载：1000 份合成版本源、单独批准/激活、SQLite 状态持久化、重启后只恢复批准项、预算超限拒绝；原撤销/源变化/磁盘失败测试继续运行。
- 方法目录：1000 项完整翻页无重无漏、精确后段版本检索、不相关对话不注入、目录变化阻止续用旧页。
- 用量：真实 SSE 的 finish 内用量、延后用量、缺失用量；重复 finish 与重试汇总；缓存输入不重复计数。
- 原有跨子系统回归、全仓 typecheck、lint:fix、桌面生产构建与源码差异检查。

测试在后台执行，没有启动覆盖用户主页面的角色窗口，也没有运行真实键鼠操作。临时数据库和合成测试文件由各自用例清理；选定上游源码保留作出处核查，不安装上游运行环境。

## 结果的适用范围

工具 schema 缩减用宽目录协议夹具测量，不能外推为真实任务总 token 一定下降。按需发现可能增加模型往返，接口变化也可能降低供应商前缀缓存命中；新诊断提供实际用量证据，真实任务应同时比较成功率、总调用、总 token、重复副作用与人工接管次数。

1000 项是候选和技能加载的已测容量，不表示已学到 1000 个可靠方法。完整发现仍会重新核对来源，长库的真实任务延迟需要继续用实际工作量测量。历史不可变页目前保留作审计；没有新增自动删除用户方法或压缩历史证据的策略。

尚未做同一模型、同一预算、同一任务集的四项目对照评测；没有据此宣称推理、代码能力或长期内化达到 Codex/Pi/Hermes 水平。原生 LSP、任意 PTC、技能市场和供应商专属缓存控制也没有作为“附带完成”列入功能。这轮交付的是已接通并有测试证据的增益路径，后续扩展仍需通过同一个人格、记忆、责任、权限和身体表达系统。
