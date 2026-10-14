# N00–N17 实现与验证记录

最新记录（2026-10-05）：[Phase 1 工程实现与最终发布验收](C:/Users/Administrator/Desktop/git/alicization/docs/research/2026-10-05-digital-life-release-acceptance.md)。18 节点生产接线已经实施，最新全量桌面 5,454 项通过、零失败，表达管线 107 项通过；全工作区类型检查、真实配置模型成长对照、真实 Codex CLI 与十万条记忆专项已通过。最终发布状态以该记录及 release provenance 为准。

以下内容保留为历次实施历史，其中失败数量和“仍需完成”表示当时状态，不能作为最新待办表。

目标：Phase 1，同一个人格持续生活，陪伴与执行共享可追溯的记忆、状态与身体表达。基线为 main 的 7880afc29ab33a4cf4de89f7a6610664278494c3；已重新 fetch 官方远端，开发开始时远端没有更新。此记录不把建表、增加接口或局部测试当作整个节点的验收。

## 生产接线

- 原 per-card SQLite writer 使用 FULL。`life-state-store` 提供原子多 owner 提交、operation key、CAS、owner hash、版本回执与只读事务视图；旧 mind heads 写入也进入同一协议，普通元数据写入不能绕过 SOUL 或成长协议。
- schema v4 迁移前用 SQLite `VACUUM INTO` 保存包含 WAL 内容的一致备份；未知版本在任何通用迁移和 PRAGMA 写入前拒绝打开，真实文件字节保持不变。旧提醒导入为待投递核验，旧无来源成长保留为待重审候选。当前原始用户输入与受理、用户侧对话归档同事务保存；旧输入迁移只取最后一条用户消息，未完成输入重启后持有。
- MainChat Turn OS 使用 durable ingress、生命视图、实际 provider request 采用记录、工具派发 fence、观察与结算。工具改变采用的记忆、人格、习惯或关系时，下一步重新准备上下文；回复落盘时再次核验 read set。
- runtime event、生命提交与由原 reducer 得到的 checkpoint 同事务保存；原事件尾部恢复仍保留。opaque transaction handle 绑定 async context，commit observer 在真实 COMMIT 后调用。
- 清洁事实入库与双时间版本同事务；显式主机实体和未知名称分开，多值兴趣不互相覆盖。召回做来源/生命周期/时间过滤、RRF 和保守 UTF-8 byte budget，不声称已经精确分词。
- 记忆纠错与遗忘建立可恢复依赖清理任务，阻止旧计划、撤销旧 appraisal 与成长候选；情绪 carry 也建立依赖。清理从启动和后台 tick 继续执行。
- TaskThread 与责任投影同事务。执行完成只进入 verifying；预先固定的文件/设置 proof 会独立核验，用户自述使用独立标签，不能当作独立物理证明。开始执行后不能降低 proof。
- 提醒建立 generation；取消与改期 fencing、重试/失败结算、归档和责任生成校验同事务，发布前再次检查当前代次。文字渲染或整段音频完成才履约。
- 后台认知按事件新颖性、前台优先、暂停、资源压力、全屏和每小时认知周期预算仲裁。普通主动发送另有持久限额：默认每日 3 次、间隔 120 分钟、22–08 时安静；已发送的相同来源不重复，明确提醒独立处理。
- 真实个人活动通过原 TaskThread/CLI adapter 整理有引用的兴趣札记，创建不可覆盖文件，独立读取核验；默认每天最多一次，前台工作和暂停优先。札记明确区分整理经历与外部阅读。
- 成长保存加入 CAS、重复提案保护、来源版本和 replay/production gold 激活门槛；记录实际 provider context 消费，支持来源撤销和用户回滚。读取失败不会伪装成空成长记录。
- 音频 driver → manager → pipeline → body 使用 completed/interrupted/failed 和真实播放时长；等待 autoplay 授权也能取消并有超时。utterance tracker 等所有段与生成封口，单段结束不代表整段完成。
- 舞台真实 DOM 呈现后发送文字回执；语音按 started/progress/terminal 发送整段回执。主进程核验发布 turn、card、surface、sequence/epoch。登记的 surface 持久保存，重启可补交原 outbox 回执。
- `/settings/life` 接入责任、改期、取消、独立核验、自述确认、记忆治理入口、主动节奏、成长来源/采用/回滚、身体与表达诊断。渲染 mounted/canvas present 与实际可见像素分开报告。

## 节点记录

| 节点 | 已接入的路径 | 仍需完成或专项验收 |
|---|---|---|
| N00 | user/tool/due/feedback、实际上下文与 body receipt 来源；超过100条窗口的重复 lookup、原始输入同事务保存与恢复 hold | 持有输入的产品恢复入口、完整 lease 分类 |
| N01 | 原子 owner/只读 view/SOUL hash/read set/回复提交 CAS/上下文重准备 | 实际打包多窗口并发和长模型调用验证 |
| N02 | Turn OS 取消、任务中断、前台优先、事件新颖性和预算 | 所有后台调用和个人活动抢占的完整故障注入 |
| N03 | 原 RRF/实际 request 证据、版本过滤、byte budget、每事实最新版本优先；真实历史召回、provider和MemoryParticipant消费同一历史版本 | 全上下文预算、复杂时间与缺失解释 |
| N04 | canonical fact/version、实体歧义、单值与多值、明确名称别名、范围与证据校验、纠错传播；纠正与遗忘分开，历史保留、未来查询不套用当前事实 | 真实生效时间解析、实体别名/冲突治理全场景 |
| N05 | appraisal 因果/version/去重/carry 依赖、来源撤销、无呈现不推断忽略或回复 | 多来源与关系状态的撤销重算、真实长期使用 |
| N06 | task/reminder obligation、generation、CAS、取消/改期、原子归档 | 复杂自然语言约定的绑定与全部 lease 恢复 |
| N07 | 认知与发送独立预算、quiet/hold、真实札记与虚构创作产物和独立核验；来源撤销治理、已完成文件重启核对；前台抢占/生成不可用时不写文件、不虚构经历 | 反思到兴趣/技能的发展、个人活动分享后的真实反馈闭环 |
| N08 | 已提交生命上下文、完整 reply artifact 后发布、真实记忆采用；所有主回复和自主归档语义审查、绑定责任与一次有限修订；步骤完成/目标完成/记忆已保存分别核验 | 独立真实模型评价、目标状态与动作归因完整性、记忆清洗完成后的表达流程 |
| N09 | 多 owner 原子提交、handle async scope、event/life/checkpoint 同事务 | 完整主运行时/故障回归及旧 writer 审计 |
| N10 | 唯一 adapter、dispatch/observation、重启 uncertain、已有风险策略；owned-note固定可信目录；模型explicit不能授权，危险恢复只接受固定任务版本的真实UI；实际shell/脚本风险预检 | 全 adapter 与 manifest 对账、权限票据完整性、Windows电脑操作验收 |
| N11 | 固定 proof、真实文件/settings/reminder 核验、任务结束自动核验 | verification 到 WorkingMemory/result surface 的全链路证据 |
| N12 | 统一 card/body/voice 状态、真实音频结果、身体健康报告；真实alpha像素见证，稀疏采样未发现或GPU读取失败保持unknown；主进程独立登记原生窗口可见性 | 实际 Live2D/VRM/音频设备与打包使用验收 |
| N13 | DOM/整段音频回执、sequence/epoch、surface/outbox 重启恢复；发行surface独立永久表，超过64次仍能查到；隐藏/离线DOM回执不履约，两条消息共享surface的文字序号正确 | 打包断线/部分播放/跨会话和提醒送达验收 |
| N14 | cleaning、版本索引、source dependency、可恢复级联撤销、清空体验状态；源恢复创建新版本且不复活派生行为；应用札记校验后隔离，回执丢失重启只读对账，修改文件持有 | 所有派生层、多来源保留与大图清理、隔离产物的人工恢复 |
| N15 | 并发/幂等/来源/read set/评价/消费/回滚；梦境提案绑定SOUL与清洗来源；真实对照生成、逐候选评价、确切人工审阅、文件saga采用/回滚、来源撤销回退及实际上下文消费记录；夜间回放只处理实际评价的候选 | 干净行为样本到兴趣/技能/人格候选的真实成长评价；打包真实模型与人工评价验收 |
| N16 | schema备份、reader关闭、SOUL激活saga、dispatch uncertain、checkpoint、clock/sleep；持有请求可查原始内容/复制全文/放弃待办，状态和hash双fence，外部页面拒绝；未知未来schema保持数据库字节不变 | 全主进程lease、原输入继续处理与未核验动作协调、备份恢复外部副作用对账 |
| N17 | 实际责任/节奏/成长/表达UI与治理RPC；真实SQLite只读ClosureRecord，18节点记录/采用/待办/失败/未调用/未核验分别显示，旧turn超过历史窗口仍可查；输入恢复治理、窗口/像素健康诊断 | 浏览器/打包使用验收、长期观察 |

## 已通过的验证证据

- 真实 SQLite 多 owner 回滚、重复/旧版本/跨 card/重开；相同文字不同 turn 不误去重；旧 dispatch 不重复。
- 提醒改期 generation、取消后的旧归档拒绝、旧重试不复活、实际呈现才履约；显式清空对话消除悬空 FK 和体验 owner。
- 真实文件错误内容检测；预先固定的任务 proof 在执行中不能降低；执行 completed 与目标 blocked 可以诚实共存。
- 真实 journal 的咖啡→茶当前/历史版本、多值兴趣、稳定值幂等；纠错同时撤销情绪/旧计划，身份保留，重启恢复。
- 成长重复并发提案、来源版本、激活门槛、实际 provider 消费、纠错回滚/重启/损坏读取失败。
- 真实兴趣札记通过现有 adapter 创建和独立核验、前台 hold、重启预算；Windows 短路径不会被误判为符号链接。
- 普通主动的 quiet/cooldown/日限额/重复来源与原子发布回滚；音频 start/read/empty/resume/unavailable/abort/部分播放/旧播放结束 fence。
- 已登记 surface 的离线回执在重启后补交，未知 surface 拒绝；身体健康保持未知像素语义。
- runtime event/checkpoint 同次提交；旧 memory read set 的回复拒绝时 event/checkpoint/life revision 全部不前进；重启一致。
- 最新针对 Turn OS checkpoint、life state、proactive feedback 的 46 条回归通过。之前通过的聊天 58 条和 DB 120 条仍需在最终变更集重新整体验证。

整轮桌面回归已运行：5386项，5299通过、82失败、5跳过（output/life-desktop-current.json）。失败包含Windows的POSIX进程/路径测试夹具、数据库故障注入边界和向量库关闭问题，仍需逐项修复。最新七个原生数据库/时间证据/回复/展示测试文件56项通过（output/life-claim-presentation-loop.log）。执行权限与实际CLI预检158项通过；主进程与渲染类型检查通过，仍需在最终变更后重新检查。SQLite 集成测试有内部5秒轮询，使用有界外部测试期限。最终发布和长期观察未完成，禁止据此宣称N00–N17全部验收或已经证明意识。

## 当前追加闭环证据

- 人格候选使用现有清洗与许可的行为样本，逐项生成原人格/候选回答并校验身份、真实性、陪伴和行动；确切评价的人工审阅与采用分离，旧hash、无来源、伪造审阅、越界人格跃迁均拒绝。真实SQLite/文件测试覆盖采用、撤销、遗忘后回退、前台抢占、人工编辑保护和N15实际消费证据。
- 同一窗口只持有一个当前角色的surface。旧角色回执保留未核验观察，不证明新窗口展示了旧角色；文字会话可在新surface再次核验。原生窗口透明、最小化、屏幕之外与API读取失败不证明送达。
- Windows模型服务恢复使用CIM启动时间、实际命令行和argv0实例nonce，拒绝身份不匹配的PID；真实模型模拟服务和SQLite重启路由40项专项通过。
- 全量桌面最新5407项：5400通过、1失败、6跳过。唯一失败为Windows并发恢复日志隔离的重复审计；已增加共享目录恢复队列，并用10轮真实SQLite/文件并发初始化验证。最终变更需重新全量回归。
- 实体别名解析、范围/同名歧义、失效来源和派生事实撤销，通过真实入库专项验证；原始同名文字不自动合并。实体注册会前移memory owner，旧对话视图不得继续使用。
- 增加了Windows可运行的Node进程夹具，仍验证真实子进程、HTTP、文件、终止和恢复。仅POSIX文件mode专属断言在Windows跳过，不把Windows chmod视为POSIX权限证明。

## 后续生产路径验证

- 原生设置页已完成保存交流节奏与刷新持久化验证。根因为Vue Proxy不能经Electron IPC克隆且Eventa发送异常不结束invoke；请求现为普通对象，通用invoke预检不可克隆数据并传递取消信号。真实Eventa main/renderer适配器与真实SQLite集成覆盖正常保存、旧版本拒绝、克隆失败和取消。
- 原生人格初始化走完四页、实际保存SOUL并进入模型配置，无页面错误；截图为`output/playwright/life-current-persona-review.png`。原生角色已验证Live2D可见、透明区穿透、角色可交互、隐藏/恢复与窗口节流；VRM、音频和最终安装器仍需验收。
- 个人活动产物经过独立文件核验后进入实际主动对话候选。发布时只接受语义审阅确切绑定的完成陈述，真实呈现后才接受已持久化用户反馈。同类活动尊重拒绝，重复创作需要该产物正面反馈和至少七天间隔。真实SQLite/文件/呈现/反馈测试已通过；自动改写技能结论仍不被允许。
- 情绪与关系状态同事务提交，使用同一个因果appraisal链。来源撤销移除受影响关系与身体投影；其余原始证据保留，新的独立appraisal可重新采用。混合来源撤销19项专项通过。复杂状态缺少重算证据时保留未知，不能伪造剩余贡献。
- 执行后独立核验先于session mirror与回调候选，适配器完成与目标核验分开进入上下文；核验ID、代次、版本和独立性进入会话证据。单个音频段结束不再被ClosureRecord算作整个utterance完成。
- “继续处理”在同一个SQLite事务保留原文/附件、建立新请求、关闭旧待办并保存恢复关联；重复点击只启动一次。已有操作可能执行的请求必须先独立对账，不能重放。启动失败的新请求恢复为持有；9项恢复与RPC专项通过。
- 隔离文档恢复的回执丢失，通过真实数据库关闭/重开与只读核验恢复，禁止复制第二次或覆盖人为修改；174项相关根运行时回归通过。
- schema v5明确新增策略采用证明要求。迁移先做包含WAL的备份；没有实际对照证据的旧active策略保留来源并退回shadow，SOUL文件保持相同字节。新策略需要三条清洁许可样本、三条确切人工gold案例、实际原/候选/评审调用与当前来源；采用和消费重新核验。只填passed字段不能激活。当前测试使用模型协议夹具，不把它当成真实模型质量或意识证明。
- 最新全量5433项：5424通过、3失败、6跳过。失败分别为旧执行结果断言、向量删除与索引补偿竞争、大规模索引等待；已增加新的目标证据并把补偿限定为本任务真正变化的条目。149项专项只剩新增manifest字段的旧断言，现已更新；需重新最终全量回归。
