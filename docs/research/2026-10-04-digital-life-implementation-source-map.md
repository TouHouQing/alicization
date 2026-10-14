# 数字生命实现：源码机制到 Alicization 改动的映射

日期：2026-10-04。补充上一轮 14 项目调研。本轮新增拉取 OpenHands Software Agent SDK、LangGraph.js、SillyTavern，继续深入已有四个实现仓库。闭源产品只能依据公开功能设计可验证的本地实现，本文不推测其未公开算法。所有外部检查为静态源码阅读，未安装或执行外部应用。

## 1. 外部实现的实际做法

### S1. LangGraph.js：保存节点写入，恢复时只执行缺失工作

固定版本：`1cee82d0c48fbaeb2d71433211b03113992cc114`。

- [SqliteSaver](https://github.com/langchain-ai/langgraphjs/blob/1cee82d0c48fbaeb2d71433211b03113992cc114/libs/checkpoint-sqlite/src/index.ts)：checkpoint 用线程、namespace、checkpoint ID 区分；节点写入再加入 task ID 与序号。`putWrites` 先序列化，再在一次事务中写一批；普通写入冲突采用忽略而非覆盖，特殊控制通道按协议替换。
- [runner](https://github.com/langchain-ai/langgraphjs/blob/1cee82d0c48fbaeb2d71433211b03113992cc114/libs/langgraph-core/src/pregel/runner.ts)：筛选没有完成写入的任务，组合外部取消与步骤超时，执行受并发和重试策略约束的任务。
- **落地**：沿用 Alicization Turn OS 的事件回放。增加身份级 owner 版本、节点产物 ID 和明确的 read set；复用已持久化的节点结果，副作用恢复只做结果核验。禁止把纯节点重算策略用于重新发送或重写外部资源。
- **边界**：其 saver 使用 `better-sqlite3`；本项目使用现有异步 `sqlite3` 和 DB 写入队列。采用事务与恢复协议，不直接导入第二个 SQLite writer。

### S2. OpenHands：追加事件前检查持久事实，状态另有保存边界

固定版本：`1b2b5c850b6a99d8b742bfe20d198d6167165ca2`。

- [EventLog](https://github.com/OpenHands/software-agent-sdk/blob/1b2b5c850b6a99d8b742bfe20d198d6167165ca2/openhands-sdk/openhands/sdk/conversation/event_store.py)：取得存储锁，必要时从磁盘同步，检查重复事件与父事件，再写文件并更新索引。
- [ConversationState](https://github.com/OpenHands/software-agent-sdk/blob/1b2b5c850b6a99d8b742bfe20d198d6167165ca2/openhands-sdk/openhands/sdk/conversation/state.py)：状态与事件分开，带 FIFO 锁、保存嵌套深度与脏标记；恢复时核对配置。秘密有独立序列化策略。
- **落地**：把工具 action／attempt 与 observation／verification 关联；同一行动产生一个目标核验结论；运行日志回放只读。SQLite 唯一 writer 负责身份状态提交，不能照搬文件锁并假设 Windows／线程语义相同。
- **边界**：这个事件存储并非跨所有外部工具的 exactly-once 保证。

### S3. Letta Code：后台记忆在隔离版本上工作，整合后刷新读者

固定版本：`bc4b97c3185302890cfb511c6d1e49f49fc5300c`。

- [memory-worker](https://github.com/letta-ai/letta-code/blob/bc4b97c3185302890cfb511c6d1e49f49fc5300c/src/agent/subagents/memory-worker.ts)：后台更新创建私有 worktree，在约束作用域中工作；取消则丢弃；完成后整合，冲突保留分支并报告，成功同步后通知读者和刷新提示。
- [memory-filesystem](https://github.com/letta-ai/letta-code/blob/bc4b97c3185302890cfb511c6d1e49f49fc5300c/src/agent/memory-filesystem.ts)、[memory-constraints](https://github.com/letta-ai/letta-code/blob/bc4b97c3185302890cfb511c6d1e49f49fc5300c/src/agent/memory-constraints.ts)：记忆布局、内容大小和运行配置都有专门边界。
- **落地**：反思读取固定 owner 版本并生成候选 patch；主 writer 检查 read set 后应用；冲突不猜测合并；取消候选不影响当前人格；提交后失效对应上下文缓存。现有 SQLite 与 self-evolution 保持权威，不新增一个 Git 人格中心。

### S4. Graphiti：先消歧／去重，再判定事实时间冲突

固定版本：`3c427640abf909f12f71f963fce15eb514a3c493`。

- [edges](https://github.com/getzep/graphiti/blob/3c427640abf909f12f71f963fce15eb514a3c493/graphiti_core/edges.py)：事实关系保存来源 episode 与时间属性。
- [edge_operations](https://github.com/getzep/graphiti/blob/3c427640abf909f12f71f963fce15eb514a3c493/graphiti_core/utils/maintenance/edge_operations.py)：同批关系先按实体对与文本去重，取得相关既有关系，联合检索形成冲突候选，再生成有限判定；旧事实时间区间不重叠时不直接冲突。
- **落地**：现有 `memory_facts` 保留当前投影；增加事实版本历史与证据引用。先按 predicate 的单值／多值语义和时间判断，再请求有限模型判定；写入时 CAS，所有来源撤销有下游传播。
- **边界**：模型产生的矛盾判定仍是候选，结构化不等于正确。图数据库暂不作为 Phase 1 必需部署。

### S5. Generative Agents：围绕关注点检索，再形成带证据的反思

固定版本：`fe05a71d3e4ed7d10bf68aa4eda6dd995ec070f4`。

- [retrieve](https://github.com/joonspk-research/generative_agents/blob/fe05a71d3e4ed7d10bf68aa4eda6dd995ec070f4/reverie/backend_server/persona/cognitive_modules/retrieve.py)：分别计算近时性、相关性、重要性并组合，选择节点后更新访问时间。
- [reflect](https://github.com/joonspk-research/generative_agents/blob/fe05a71d3e4ed7d10bf68aa4eda6dd995ec070f4/reverie/backend_server/persona/cognitive_modules/reflect.py)：产生关注问题，检索支持节点，生成观点与证据对应关系，写为 thought；累计重要性驱动触发。
- **落地**：保留现有 RRF 多通道检索，反思只覆盖新经历窗口，输出有限候选和支持／反对来源；“被召回”只改变访问统计，不增加事实可信度。反复思考同一经历不能自己证明自己。
- **边界**：原型的固定权重与直接写 thought 不作为 Alicization 人格成长的自动准入规则。

### S6. Open-LLM-VTuber：句段管线与实际听到内容分离

固定版本：`992309c0aa19845960228f880013d4685fde93b5`。

- [basic_memory_agent](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/src/open_llm_vtuber/agent/agents/basic_memory_agent.py)：模型输出经分句、动作提取、显示和 TTS 过滤组成管线；打断修改最后一段历史。
- [single_conversation](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/src/open_llm_vtuber/conversations/single_conversation.py)：生成文本、待完成合成任务和会话归档有分别处理步骤；后端合成完成不能推断客户端已经播完。
- [letta_agent](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/src/open_llm_vtuber/agent/agents/letta_agent.py)：对应打断方法为空，说明组件间契约比“已经集成”更关键。
- **落地**：保留生成全文，以表达回执记录各段显示与播放结果；不把归档全文替换成猜测的“已听到文本”。没有字／viseme 对齐时，部分播放只记未知范围，不假装精确到某个字。

### S7. SillyTavern：作用域、激活和 token 预算在同一个选择器中执行

固定版本：`06bde939fb1e9c4c8d8641d810f0a916b5bce127`。

- [world-info](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/scripts/world-info.js)：组装不同作用域的条目，建立扫描 buffer；检查关键词、激活组和 timed effects；计算内容 token 后决定是否加入，并以状态机控制递归与停止。
- **落地**：上下文编译器记录每项来源、成本、优先级和淘汰理由；身份、当前请求和已承诺责任先保留，证据按预算选择；有限关联扩展最多两跳并防循环。普通记忆不使用随机激活；不得给所有条目“忽略预算”。
- **边界**：其 AGPL 源码用于理解算法，本方案的本地契约与算法描述独立设计；任何直接代码复用另按许可和项目要求处理。

## 2. 商业与其他项目的实现落点

| 上一轮项目 | 可见功能转成的本地实现 | 明确的限制 |
| --- | --- | --- |
| Replika | 记忆编辑／忘记命令 → 来源撤销与版本变更 → 缓存／索引失效 → 下次对话验证 | 不知道它内部采用何种模型与提取协议 |
| Nomi | 身份核心对应 SOUL＋自我历史；关联概览对应带证据的 consolidation；主动消息对应候选仲裁与投递回执 | 内部“思考”算法与真实活动无法从公开资料核实 |
| Kindroid | 工作记忆、事件、当前关系概览分别保真；显示本轮证据来源和预算淘汰原因 | 不复刻其专有 Cascaded Memory 算法 |
| Character.AI | 角色背景与真实经历分来源；世界条目仅进入角色／知识上下文域 | 固定消息不替代长期义务 owner |
| AIRI | 使用现有身体、音频与桌面组件；由同一心智提交给各身体统一版本表达计划 | 本项目已有基础，无须为“吸收”另造同类组件 |
| Inworld | 对话／情绪／语音计划图 → 在本地统一状态与表达契约中组合 | 旧 Studio 已退役，不以旧端到端架构为现成依赖 |
| NVIDIA ACE | 分层调度、明确动作空间、模型／渲染资源仲裁 → 当前桌面 scheduler 与能力 registry | 不把身份绑定特定 GPU 或游戏引擎 |

## 3. 本地检查修正了上一版哪些判断

- 已有 Turn OS 事件和 checkpoint；事件在 checkpoint 之前落盘，并可回放尾部。这里的分步写入并不自动等于丢失事件。
- 已有 TaskThread 的 `attemptId`、更新时间 CAS 和不确定执行恢复。新方案扩展它，不再泛称“缺任务状态机”。
- 已有 scheduled task 的 claim／requeue／complete，长期提醒的基础存在；目前一条路径在对话归档后标任务 completed，需要明确这代表“生成／处理完成”还是“提醒投递满足条件”。
- 已有声音、动作和嘴型协调；底层音频 `Promise<void>` 在完成、取消和部分失败时共用结束结果，需要补类型与跨进程回执。
- 已有事实 triples、supersedes／conflicts、episode provenance、RRF 和 self-evolution 候选。落地重点是版本、时间和跨 owner 传播，不能把这些已有能力重复建设一遍。
- 当前 SQLite WAL 设置 `synchronous=NORMAL`。应用崩溃原子性与断电后已提交事务的持久性不同；生产核心建议 `FULL`，测量成本并减少无意义高频持久化。[SQLite 官方说明](https://www.sqlite.org/pragma.html#pragma_synchronous)

## 4. 证据与执行状态

检查文件及 commit 的追加记录保存在 `2026-10-04-digital-life-implementation-source-manifest.json`。这些事实支撑实现设计；不表示已完成生产改动、迁移或真实能力验收。
