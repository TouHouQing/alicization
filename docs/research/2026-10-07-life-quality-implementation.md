# 桌面生命感缺口实现与验收

本轮从实际体验的十类缺口出发，补的是同一个人格的生活、表达与执行连接。基线为 `7880afc29ab33a4cf4de89f7a6610664278494c3`，包含此前本地开发和本轮修复，不是原样上游构建。Git fetch 曾超时；最终另用 GitHub REST 核对远端 main 与本地 HEAD 相同，见 `output/life-quality-final-remote-head-20261007.json`。

## 同类项目如何转成实现

复用了[先前十七项目的逐项源码与公开接口分析](2026-10-07-digital-life-gap-assessment.md#同类项目实际比较)，保留十三份源码检出及其版本/文件哈希，不重复下载制造磁盘垃圾。重点重新联网核对以下实现来源；商业项目依据公开资料，没有声称实测其客户端或了解闭源内部实现。

| 来源 | 吸收的实现方法 | 本项目落点与边界 |
| --- | --- | --- |
| [N.E.K.O](https://github.com/Project-N-E-K-O/N.E.K.O) | 姿态、短动作、恢复与主动投递分别调度 | 倾听、放松、伸展与实际关节校准；不将私有美术一并复制 |
| [VPet](https://github.com/LorisYounger/VPet) | 状态需求驱动日常活动 | 有起止、可被打断的休息/伸展；未观察到的时段不能补算休息 |
| [TalkingHead](https://github.com/met4citizen/TalkingHead) | 视线与语音动作时序、缓动 | 延续已有缓动与对话身体投射，修复静默 viseme 的归属释放 |
| [Motion Engine](https://github.com/lhupyn/motion-engine) | pose/mood/action 分轨及恢复 | 校准基础姿态上的附加手势，保留原动画所有者与取消恢复 |
| [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber) | 对话、排队合成、播放与显示分开 | 每条语音请求携带自己的速度、音高与取消信号 |
| [Generative Agents](https://github.com/joonspk-research/generative_agents) | 活动阶段、反思来源、事件改计划 | 从真实个人作品和反馈形成实践复盘；不把虚构内容当真实经历 |
| [Graphiti](https://github.com/getzep/graphiti) | 事件引用与时间有效性 | 保留事实版本、作者证据、来源纠正与遗忘传播 |
| [Letta Code](https://github.com/letta-ai/letta-code) | 记忆维护与冲突恢复 | 自己的兴趣和宿主偏好分别持有；不得由当天情绪直接改人格 |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | 会话持久化、经验与技能复用 | 已验证实践和失败教训进入下一次真实对话上下文，不按次数宣布掌握 |
| [Pi](https://github.com/earendil-works/pi) | 事件队列、转向、中断、工具结算 | 沿用已二开的 MIT 队列/流；未知副作用即使换调用 ID 也不得重放 |
| [OpenHands SDK](https://github.com/OpenHands/software-agent-sdk) | 执行事件身份、顺序与持久化 | Windows 界面步骤写入同一执行账本，失败不会被记成成功 |
| [LangGraph JS](https://github.com/langchain-ai/langgraphjs) | 检查点与中断恢复 | 利用既有责任/事务所有者，增加真实界面独立后置核验 |
| [SillyTavern](https://docs.sillytavern.app/extensions/expressions/) | 可用表情资源与状态检查 | 分开验证表情权重、身体运动和真实情境选择 |
| [Inworld](https://docs.inworld.ai/realtime/overview) | 轮次、打断、响应节奏 | 请求元数据随排队语音走，结束/中断释放旧嘴型；声线质量仍取决于提供方 |
| [Convai](https://docs.convai.com/api-docs/convai-playground/character-customization/narrative-design) | 目标、条件、事件驱动推进 | 前置定义期望文本/字段，二次读取结果，避免看到任意状态就判成功 |
| [Replika](https://help.replika.com/hc/en-us/articles/37208679176077-How-does-Replika-s-memory-work) | 可见、可纠正的关系记忆 | 长期人格、临时心情、用户偏好和自身经历拥有明确来源 |
| [Character.ai](https://blog.character.ai/memory/) | 主体区分、持久记忆与保护 | 重启回忆从原身份事实读取，不靠在问题中再次提供答案 |

本轮新写的是适配现有架构的实现，没有新增整段第三方代码复制。已有二开模块的许可证继续随包发布，发布脚本核对许可证实际字节。

## 十类缺口的实际连接

| 缺口 | 实现与所有者 | 证明方法 |
| --- | --- | --- |
| 动作/肢体语言 | `procedural-gestures.ts` 校准挥手、掌心、庆祝、边界；新增倾听、休息与伸展，默认清单同步 | 真实 rig 指定关节与手肩高度，15 动作；情绪情境选择另用真实模型测 |
| 表情/嘴型 | `lip-sync.ts` 在语音退出时清空残留能量、平滑值和片段归属 | 静默帧 aa/oh 回落，取消恢复，真实开心/难过场景 |
| 主动生活 | `life-daily-activity-runtime.ts` 使用 initiative 原所有者，需求桶变化唤起有限内部选择 | 实际时间、宿主新输入/任务/暂停抢占；未观察区间不能伪造完成 |
| 独立兴趣 | `life-personal-continuity.ts` 从已独立核验的本人作品形成倾向 | 三天 SQLite 重放、重启、相反宿主偏好、来源纠正/遗忘，不声称永久爱好 |
| 自然对话 | `life-turn-runtime.ts` 注入同源实际兴趣、节律、经历与失败教训；表达约束减少审计术语和惯例反问 | 真实模型疲惫、庆祝、悲伤、自己的选择、闲置回忆与重启回忆 |
| 语音节奏 | `speech-synthesis-style.ts` 按请求解释风格；普通 xsAI speech 路径也传速度和 abortSignal | 真实请求序列化、排队归属与取消；静音 SAPI 适配协议和播放证据 |
| Windows 执行 | `life-windows-browser-runtime.ts` 的专属沙盒浏览器；`life-windows-desktop-runtime.ts` + UIA worker 的指定窗口 | 真实模型填写网页、保存、读取，再操作自有 WPF 窗口并核对实际文件 |
| 关系/人格连续性 | 主进程继续拥有 SOUL；移除聊天情绪三轴漂移和忙碌抑制扣服从度的旧路径 | 情绪聊天前后人格相同；忙碌仲裁回归；重启之前的事实在新输入前已存在 |
| 成长与失败迁移 | 作者证据与实践复盘；宿主拒绝、策略限制、旧观察、未知副作用、目标不满足分别进入教训 | 下一次上下文读到具体来源和限制；不得绕过拒绝或把练习次数当技能掌握 |
| 验收可信度 | 前置期望值、独立第二次读取、失败规范化、按包字节和源指纹固定证据 | 实際未满足结果不能动画庆祝；正式 EXE、安装器 payload 与被测 ASAR 一致 |

人格成长仍走已存在的有证据提案、配对评估、人工审查与回退；本轮未把人格冻结，也没有另造一个自我中心。内部活动与对外打扰分别受预算约束，不通过定时刷消息制造主动性。

## Windows 执行与核验的范围

网页操作只控制当前角色的专属浏览器，使用独立 cookie partition、沙盒、禁止弹窗和未授权麦克风/摄像头权限。输入/点击要求刚读取过的唯一目标；标签、字段值、表单目的地、遮挡或角色发生变化时重读，不猜坐标。

原生操作只读同一 Windows desktop 上指定 PID/HWND 的有界控件树。支持已观察的 Value、Invoke、Toggle 等控件模式；常见 Windows Forms 控件有受同一根窗口约束的原生消息通路。密码不读取既有值。任意画布、所有第三方应用、全局鼠标坐标和通用快捷键不属于这条已验收通路。

删除、付款/发布/发送、外发表单、密码和指定程序/参数启动走现有风险确认 UI；确认绑定角色、当前目标和窗口。批准后仍检查目标。拒绝、缺少确认、超时、中断和可能已产生副作用不能混为一个“失败后再试”。普通本地操作继续可用。

`interface-state` 证明只说明核验时观察到的表面符合提前指定的条件。文件证明核对真实字节；一次点击不证明云端持久化或后续状态。工具成功、任务完成、语音说出的结果分别检查，不让本地模块各自创造成功结论。

## 真实体验发现并修复的问题

- 嘴型在静默后保留旧语音能量：释放分析器、平滑值和已结束片段，实际静默 aa/oh 回落到 0。
- Windows UTF-8/BOM 与 UIA 控件读取阻塞：输入改为有界 JSON、进程超时并随取消结束；标准窗口控件消息仅限同一已授权窗口，不使用全局鼠标键盘。
- 网页/WPF 已保存文件但完成回复被拦截：工具保留实际 UTF-8 内容、规范路径和字节哈希；目标期望来自此前同一窗口的真实输入，独立读回后才结算。
- 审查模型复制长证据 ID 时遗漏字符：当前审查只引用短编号，入域前恢复原始所有者与版本；错误类型、版本、未知编号继续拒绝。
- 空闲回忆把旧作品误说成刚才创作：区间从实际上一轮结算建立，实际活动时间约束审查；未在该区间发生的活动必须明确标为之前。
- 忙碌仲裁仍修改人格服从度：移除该旧路径，普通情绪和忙碌只改变当下状态，不改持久人格。
- 偏好末尾“记住”指令污染偏好值：仅剥离明确指令，保留来源；用户偏好与自己的创作愿望分别归属。
- Vue 深层代理改变 Three.js 动作身份：mixer/action 使用浅层引用，完成事件能准确释放原动作。动画单帧推进上限 100 ms，软件渲染卡顿不能跳过整个短动作；生命事件仍使用实际时钟。
- 庆祝“你的项目终于完成了”被当成她的执行成果，“我在这里”被当成工具动作：有界识别当前用户的明确完成报告与即时对话行为；名字来自同一活动 SOUL 哈希。无证据的本人完成、第三方事实、永久存储、未来承诺仍拒绝。审计保留当前输入哈希和排除原因。

- 数据库临时锁使启动失败：模式版本预检发生在 busy_timeout 设置之前。版本只读预检和 WAL 初始化分别使用 5 秒有界锁等待，单次忙等待 100 ms，异步让出后重试；只重试 SQLITE_BUSY，检查实际 WAL 模式，随后恢复正常 2 秒忙等待。未知未来模式仍在任何迁移前拒绝，持续占锁仍失败。参考 [SQLite busy handler](https://www.sqlite.org/c3ref/busy_handler.html) 对锁升级可能跳过 busy handler 的说明。

## 最终验收

五阶段验收全部使用同一正式 ASAR `9d2f7e7225c5131ba9a5c0391c990a5daa3c577c865db0b34a25cb3b6ce4e342`。构建源码指纹为 `54592b4ebdd8b5d8a0b52043d5f86d74302ece886bec74bae8f9d622cea1a1a0`；发布凭证确认包内所有编译文件与当前 out 字节一致。

| 验证项 | 最终结果与证据 |
| --- | --- |
| 全仓与失败文件复查 | 7,535 项通过、12 项跳过；809 个文件有执行用例，3 个文件整体跳过。[合并报告](../../output/life-quality-release-verified-regression-20261007.json)保留全仓与 128 项完整复查的来源哈希；不是声称一次全绿运行 |
| N0–N17 | 十八节点均有实际通过的对应测试，[节点映射](../../output/life-quality-final-nodes-20261007.json)绑定当前回归报告哈希 |
| 类型与 lint | 全工作区顺序类型检查、最终桌面主进程/渲染端类型检查通过；全仓 lint 0 错误、652 警告，最终采样脚本 lint 通过 |
| 首次初始化 | 最终 EXE 的中文托盘、人格确认、保存与进入下一步通过，[报告](../../output/life-acceptance/life-quality-final-persona-20261007.json) |
| 实际身体 | 十五动作各采集 32 帧、检查指定渲染关节；四种主进程意图、常驻倾听、暂停/隐藏恢复、双向 SOUL 同步通过。挥手与伸展的手高于肩分别为 0.1951、0.1798 模型单位，[报告](../../output/life-acceptance/life-quality-final-action-20261007.json) |
| 执行结果与身体 | 正确文件独立核验后显示完成；错误内容显示阻止，不演成功。采样等待实际终态被记录，原先 16 ms 采样竞态的失败日志保留 |
| 首次真实模型体验 | 八场全部接纳、无 fallback；人格前后相同，实际保存了自己的创作练习，文件哈希匹配。静默 205 秒、6 次观察、0 新聊天；54 个静默帧 aa/oh 峰值均为 0，[报告](../../output/life-quality-release-20261007/829be2cd-5db2-4a76-a9c8-61ae157cef5f/experience.json) |
| 同身份重启 | 四场通过；新输入前偏好已经存在，无提示找回雨后钢琴偏好，区分自己的已有创作与未完成活动。静默 30 秒、0 新聊天，54 个静默帧 aa/oh 为 0，[报告](../../output/life-quality-release-20261007/9b98996a-fd56-44c1-a1fb-0ec23798bc73/experience.json) |
| 实际网页到原生窗口 | 真实模型操作专属网页和自有 WPF 窗口，分别保存并独立读回“雨声陪伴”；回复均被接纳并有归属明确的语音，[报告](../../output/life-quality-execution-20261007/e92de0f6-55ab-4b5d-b58c-a71d4495067f/experience.json) |
| 发声时的一致性 | 十四场景内 25 个实际发声渲染样本，语音、情绪、动作无跨轮归属冲突；独立任务动作不伪称语音片段，[观察报告](../../output/life-quality-final-voice-body-owners-20261007.json) |
| 安装器和依赖 | 安装器 ASAR、EXE、SQLite、vec0 和图像模块与解包版逐字节一致；26,212 个第三方依赖条目保持一致，工作区仅三个已记录的身体源文件变化 |
| 隔离与清理 | 五次原生任务均关闭所属进程，没有切换、输入或捕获 Default 桌面；三个模型体验配置的凭据条目均为 0。清理八个淘汰试验包和最终缓存约 17.9 GB；保留正式/回退包、依赖对照基线、数据库与失败证据 |

正式产物：

- [解包版 EXE](../../apps/stage-tamagotchi/dist/life-quality-20261007/win-unpacked/alicization.exe)
- [安装器](../../apps/stage-tamagotchi/dist/life-quality-20261007/Alicization-0.3.0-windows-x64-life-quality-20261007.exe)，SHA-256 `941ea5fb392cf40e70386e78df4709b792e6cd860896878842427fa57abf77fc`
- [发布凭证](../../apps/stage-tamagotchi/dist/life-quality-20261007/release-provenance.json)，连接源码、编译文件、最终包体、测试与原生观察。

## 验证边界

这轮覆盖了 Phase 1 的工程连接与可重放验收，不能据此声称意识、数周关系稳定性或所有应用都可操作。桌面测试使用独立 Windows 桌面、合成身份、软件 GL 和静音语音；没有切换、输入或捕获用户正在使用的主屏幕。硬件音色、主屏显卡合成和透传体验仍需在实际日常使用中观察。商业项目只分析公开资料，未声称取得其闭源代码或实测客户端。
