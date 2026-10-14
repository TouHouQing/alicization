# N00–N17：Phase 1 工程实现与验收

日期：2026-10-05。目标是同一个她的身份、记忆、情绪、关系、主动、对话、执行与身体在本机形成可恢复的循环。远端基线为 `7880afc29ab33a4cf4de89f7a6610664278494c3`，本次构建包含本地功能实现和已有修复。

这是 `life-phase1-20261005` 版本的历史验收记录。后续桌面体验改造及单独构建的证据见 [桌面生命体验研究与实现](2026-10-05-desktop-life-source-study-and-implementation.md)；本文件里的 EXE 哈希只属于原版本。

当前状态：N00–N17 共 18 个节点已接入生产路径，工程开发与测试闭环完成。服务回归、全工作区类型检查、最终打包 EXE 的 7 项原生验收，以及独立身份的安装/启动/卸载第 8 项验收全部通过；发布溯源已生成，app.asar 内每个编译文件与本次构建逐一匹配。下面区分工程能力与需要长期使用观察的体验质量。

体验验收状态：**尚未达到宪章 Phase 1 的“可信数字生命”完成标准**。用户实际反馈桌面整体表现力、执行、行动、动作和表情仍显得像 AI；[体验差距审计](C:/Users/Administrator/Desktop/git/alicization/docs/research/2026-10-05-digital-life-experience-gap-audit.md) 记录已确认的默认动作资产、个人活动范围与场景评估限制。18 节点工程通过不能替代这些体验标准。

## 十八个节点的落地与失败处理

| 节点 | 生产路径与完成条件 | 失败、撤销与恢复验证 |
|---|---|---|
| N00 输入与事件 | 原文、附件引用、输入身份和 hash 同事务受理；设置页可预览、复制、放弃、继续处理 | 重复点击只恢复一次；原文不丢；启动失败重新持有；可能已执行的动作先对账 |
| N01 生命视图 | 原 DB writer 原子提交多 owner；只读一致视图；人格、关系、记忆、目标有明确权威 | CAS、旧 card、旧版本与旧 SOUL 拒绝；失败回滚；实际 provider 调用期间不持有事务 |
| N02 注意力 | 前台优先、抢占、暂停、资源压力、认知节奏与新颖性仲裁 | 前台介入停止后台生成/写产物；不以空成功或重复周期代替活动 |
| N03 检索与预算 | 意图/实体/时间规划、RRF、当前及历史版本、实际 provider 采用回执；完整请求含工具和输出预算 | 撤销来源拒绝采用；整组删除旧对话；当前输入不截断；保护内容超预算显式失败 |
| N04 理解与信念 | 同名消歧、证据别名、单值/多值事实、recorded/valid 双时间 | 今天、未来生效与到期后的偏好分别召回；校正保留原生效区间；错误别名不能恢复旧派生事实 |
| N05 情绪与关系 | 因果 appraisal、版本化短期情绪与独立关系 owner，连接对话、主动和身体 | 同事件不重复冲击；睡眠衰减、时钟回退；撤销移除旧依据，缺少剩余贡献证明则未知 |
| N06 责任与计划 | TaskThread/reminder 与 obligation 同事务；预先固定 proof、代次、约定时间 | 改期/取消 fence；跨天与重启；旧尝试不能履约新责任；未知时间澄清 |
| N07 主动与内在活动 | 主动认知与发送分预算；兴趣札记/创作走真实 TaskThread、adapter、文件核验与分享 | 不虚构阅读/行动；前台和暂停优先；拒绝反馈抑制同类活动；产物来源撤销传播 |
| N08 对话 | 已提交生命上下文、实际模型 artifact、记忆消费、语义审查与至多一次受限修订 | 区分步骤成功、目标完成与记忆持久化；无绑定的承诺或完成声明拒绝；真实回复可显示和发声 |
| N09 提交 | runtime event、life mutation、原 reducer checkpoint 同事务；COMMIT 后观察/发布 | 故障注入全回滚；event 尾部恢复；旧 read set 无事件/状态半成功；重复 publication hash 正确去重 |
| N10 执行 | 原 adapter 是唯一派发者；参数 hash、风险、确认范围、attempt、generation、dispatch receipt | 普通本地能力可用；危险动作受控；恢复 uncertain 不重放写操作；私有人格/配置/备份不可作为普通文件读取 |
| N11 核验 | 实际文件、设置、提醒、用户自述四种证明；核验先于结果 mirror/回调 | adapter success 不能代替目标 satisfied；文件错误内容失败；回执丢失先只读核验；自述不冒充独立证明 |
| N12 身体 | 统一内态投影为 Live2D/VRM、表情、声音、嘴型；真实 GPU 见证与原生窗口状态分开 | Windows 首次透明面绑定修复；两个模型桌面合成像素通过；空白穿透；显式隐藏/最小化暂停 |
| N13 表达回执 | DOM 呈现和整段音频 started/progress/completed/interrupted/failed 入库；surface/epoch/sequence/outbox | 部分播放不能算完成；音频中断停止嘴型；旧 card/旧播放 fence；离线回执补交；隐藏 DOM 不履约 |
| N14 记忆结算 | 清洗入库、证据依赖、纠错、审计、分页遗忘与派生撤销 | 删除后重启/reindex 不复活；多来源保留可验证部分；采用前有界递归检查；文件隔离和清理恢复 |
| N15 成长 | 清洁许可行为样本、候选来源、生产 reducer shadow replay、原/候选/评审实际生成、确切审阅与采用 | 无样本/无当前 gold/过期 hash/回归拒绝；前台抢占；SOUL 文件 saga；来源撤销与回滚；实际上下文消费 |
| N16 恢复 | v5 迁移、WAL 一致快照、SOUL/DB 激活协议、lease、保留输入、备份/恢复 | 未知 schema 拒绝且保留字节；崩溃重入；恢复动作标为 uncertain；重新核验外部目标；恢复失败可回原目录 |
| N17 产品治理 | 责任、节奏、成长、身体、备份、输入恢复与真实 18 节点 ClosureRecord 接入设置页 | Eventa 请求可克隆与取消；错误有反馈；旧历史仍可查；记录/采用/待办/未核验分别显示；原生托盘翻译验收 |

实际文件集中在 `apps/stage-tamagotchi/src/main/services/alicization/life-*`、原 Turn OS 与 `runtime.ts` 组合根；身体与表达沿用共享 Stage、presence 和 audio pipeline。桌面语义保持权威，其他终端不创建新的她。

## 可复核的测试证据

- 全量桌面回归：`output/life-desktop-visible-auth-final-20261005.json`，5,462 项，5,454 通过、零失败、8 跳过。默认跳过的 6 项可选试验（真实成长模型、真实 Codex CLI、十万条记忆）已另行实际执行通过；另 2 项 POSIX 权限/进程组断言不适用于 Windows。
- 最后一次有界来源/主对话/预算专项：`output/life-final-bounded-lineage-regression.log`，69 项通过。
- 共享表达回归：`output/life-expression-delivery-final-20261005.json`，107 项全部通过，包含新回复到达、鼠标悬停、语音选择、嘴型、播放和回执；此前另有含 presence/bridge 的 136 项回归通过。共享诊断页和运行时测试夹具专项另有 25 项通过。
- 真实配置模型的人格/策略对照：`output/life-configured-growth-pairs.log`，两套生产 evaluator 共 18 次真实生成；结果见 `output/life-acceptance/configured-persona-pairs.json`、`configured-policy-pairs.json`。候选保留待审，没有代替用户批准。
- 真模型输入恢复→提交 artifact→桌面文字→语音→嘴型→durable receipt：完成与中断分别有原生记录。实际数据库中的文字呈现已核验；收起/展开使用真实舞台按钮，不重复登记文字。修复初始布局矩形为零导致漏回执的问题，并为后台新回复提供有时限的可见字幕。SAPI QA adapter 生成实际 Windows 语音，经生产 WebAudio 管线播放；这验证播放、嘴型和回执，不评估云语音的音色。
- 真实 Codex CLI 0.142.3：`output/life-acceptance/codex-real.json`，3 项全部通过；真实只读阶段命令产生 4 个命令事件与 2 次心跳，正确结算目标。adapter 的认证与 Windows sandbox 继承专项 79 项通过。所选 provider token 仅通过子进程环境传入，参数只含变量名；CLI 保留用户已有 Windows sandbox 模式，Shell 排除该凭据。实现依据：[官方配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)、[Windows sandbox 文档](https://learn.chatgpt.com/docs/windows/windows-sandbox)。
- 十万条生产记忆任务：`output/life-acceptance/memory-100k.json`，11 项全部通过，实际 SQLite/sqlite-vec、分批任务和恢复路径。embedding 使用可复现的 12 维测试 provider；它证明规模和恢复，不证明真实 embedding 的语义质量。
- 源运行时 Live2D/VRM 原生验收：`output/life-native-compositor-production-fixed-live2d.log`、`life-native-compositor-production-fixed-vrm.log`。有真实 Windows 合成采样及输入样式检查，截图只截自身 QA 页面。
- 人格四页提交、SOUL 保存与进入模型配置；主动节奏保存/刷新；备份生成/列出/关闭确认取消，均有隔离 QA 原生记录。恢复激活、崩溃、目标重新核验和取消回原目录使用真实 SQLite/文件集成测试。
- 全工作区 `pnpm typecheck` 已通过：`output/life-workspace-verified-typecheck.log`。为本次命令配置工作区已有的 `vue-tsc` 工具路径，并修复共享诊断页旧 API、播放测试夹具新回调、语音选择只读计算属性测试。桌面完整构建通过：`output/life-all-surfaces-final-build.log`。本次改动作用域的 ESLint 修复后零错误；最后共享诊断/夹具日志为 `output/life-last-shared-closure-lint.log`。

最终二进制验收记录为 `output/life-acceptance/nodes.json`：18/18 节点测试映射通过、8/8 原生验收通过，命令日志为 `output/life-release-all-native-acceptance-verified.log`。各项均启动已打包的二进制，使用独立 QA 身份。

| 最终原生验收 | 实际结果 |
|---|---|
| 人格与托盘 | 四页填写、确认、真实 SOUL/数据库保存、进入下一步；实际原生托盘中文菜单，无翻译 key |
| 设置与节奏 | 生命设置页加载、节奏保存与刷新保持 |
| 备份 UI | 生成并列出 schema v5 备份；关闭确认所属窗口时取消，未激活恢复 |
| Live2D | 实际 Windows 桌面合成像素、透明空白穿透、角色交互、隐藏/显示暂停 |
| VRM | 同样通过合成像素、输入样式与生命周期检查 |
| 真模型与完整语音 | 恢复输入由真实配置模型生成已提交回复；文字核验入库，实际语音完整播放、嘴型变化、完成回执与 outbox 清空 |
| 收起/展开与中断 | 实际按钮收起/浮标展开，文字回执不重复；播放部分后中断，未记完成，嘴型停止、outbox 清空 |
| 独立 NSIS 安装/卸载 | 安装后 app.asar 与 QA 打包件完全一致；安装版实际完成人格初始化和 SQLite 保存；卸载程序删除，SOUL、数据库与所有权标记 3 个文件 SHA-256 全部保留 |

## 发布与复现

正常发布目录：`apps/stage-tamagotchi/dist/life-phase1-20261005`。安装包文件名为 `Alicization-0.3.0-windows-x64-life-20261005.exe`。便携运行需保留整个 `win-unpacked` 目录。

`life:acceptance --report-only <absolute-json> --native --configured-model --installer` 顺序验收最终 EXE 及独立安装器；`LIFE_QA_EXE` 选择二进制，`LIFE_QA_PYTHON` 选择查询回执的 Python。`--configured-growth` 另外执行真实模型成长对照。

独立 QA installer 使用不同 app ID、package name、GUID 和快捷方式配置，安装到新临时目录；其实际 SOUL/SQLite 数据置于独立 AppData 身份。已证明卸载程序删除、人格数据字节保留，结果为 `output/life-acceptance/installer.json`。它验证实际 NSIS 安装/卸载协议；不声称人工操作过原生安装向导。最初的一次并行试验因安装器尚未生成而失败，已补上最终 blockmap 等待，并完整重跑八项通过；该失败未被算作通过记录。

`scripts/life-release-provenance.ts` 生成 `release-provenance.json`：记录远端基线、本地输入指纹、编译树、安装包 SHA-256、验收文件哈希，并逐文件验证 app.asar 内的编译产物。它明确标注本地改动已包含，避免把功能开发后的构建描述成未经修改的 commit。

已生成文件：[发布溯源清单](C:/Users/Administrator/Desktop/git/alicization/apps/stage-tamagotchi/dist/life-phase1-20261005/release-provenance.json)。最终再次 fetch 后远端与基线一致；源码指纹为 `1068f15e4495600312fd40feaca7850a2f5099f316bfc22cc108d48d4693c320`。安装包大小 606,858,851 字节，SHA-256 为 `349a8b1b50550f942093fcf3eed5af0334b61af6f88b50d8100ff6aab23b3301`。编译树、便携 EXE、解包 native resources、测试报告及原生日志哈希均在清单中。

## 开始使用

1. 先退出旧版本，再启动本次安装包或完整便携目录中的 `alicization.exe`。同一正式身份保留原设置与人格，升级时按版本迁移；新的身份进入四步人格初始化。
2. 新身份在初始化后配置对话模型；需要发声时另选语音 provider 和声音。角色和语音是同一个人格的表达端，切换模型不会另建人格。
3. 在角色对话窗交流。新回复会主动显示字幕；使用标题栏收起按钮和小浮标展开，不清空对话。可尝试纠正一条偏好、提出明确时间的提醒，再查看实际召回与表达。
4. 设置 → 生命查看约定、记忆治理、主动节奏、成长候选、身体/表达、输入恢复与备份。对照一次真实对话的闭环证据检查记录、实际采用、核验和显示/播放结果；尚无证据的项保留缺失状态。

## 工程证明的边界

这套实现建立可运行、可追溯、可中断和可恢复的 Phase 1 生命循环。自然语言复杂约定不能保证全部理解；不确定时澄清或保持 unknown。未能观察到身体像素不能证明角色不存在，也不能证明已呈现。

真实模型对照使用隔离的合成行为样本/gold fixtures，证明实际调用、持久化和采用门；不等价于真实用户的质量评价。短期情绪衰减不任意衰减长期信任。复杂多来源状态无法可靠重算时保持未知，不制造精确剩余情感贡献。

长期陪伴质量、人格自然成长和主观意识不能由一次测试证明。持续使用观察仍是宪章 Phase 1 体验完成标准的一部分；摄像头常驻、智能家居和机器人保持后续阶段。
