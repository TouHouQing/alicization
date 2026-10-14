# 同一意图如何进入对话与身体

本轮沿用 Phase 1 的一个人格、记忆与情绪中心。目标是补齐「当前心智为什么要回应 → 语言生成 → 身体表达 → 实际播放与释放」这条链路。新增的是交互意图和可中断的身体实现，并不证明主观意识或已经完成长期陪伴质量验收。

## 源码研究与采用范围

此前已固定版本分析 11 个项目。本轮新拉取 TalkingHead 与 Motion Engine，重新深入 Generative Agents 与 Open-LLM-VTuber，并阅读 SmartBody 的官方架构说明。累计开源项目为 13 个；SmartBody 文档阅读不计为源码分析。

| 项目与固定版本 | 实际检查位置 | 本轮吸收与边界 |
|---|---|---|
| [TalkingHead](https://github.com/met4citizen/TalkingHead/tree/b3e277b3b46f88e557bf28a2c5612a5b04e075c3) | `modules/talkinghead.mjs` 中 `sigmoidFactory`、`gestureTemplates`、`playGesture`，完整 MIT LICENSE | 实际适配 sigmoid 数值内核，加入有限输入、smoothstep、精确端点。吸收姿态与手势覆盖、取消旧计时及淡入淡出。没有复制 Mixamo 绝对骨骼旋转、第三方模型或资源。 |
| [Motion Engine](https://github.com/lhupyn/motion-engine/tree/bd780a19e10d1cc5736a77946b04e08d658d5bf8) | `src/MotionEngine.js` 的动作轨、打断与等待清理；`src/utils.js` 的基线；MIT LICENSE | 吸收姿态、情绪、动作分轨与明确的取消生命周期。使用本项目已有身份、回合和播放权威；未复制它的执行器或随机动作逻辑。没有开启 FaceMirror 或摄像头。 |
| [Generative Agents](https://github.com/joonspk-research/generative_agents/tree/fe05a71d3e4ed7d10bf68aa4eda6dd995ec070f4) | `reflect.py` 的重要性触发与来源证据；`plan.py` 的交谈、等待与反应抑制 | 意图引用已有 conscious frame、answer planner 和 deliberation。保持来源与时间，不把随机活动当成思考或记忆。未复制代码。 |
| [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/tree/992309c0aa19845960228f880013d4685fde93b5) | `conversations/tts_manager.py` 的合成任务、静音载荷和有序发送 | 准备与真实播放分开：身体保持、收尾使用实际 playback 生命周期，不把生成结束当成已经说完。保留本项目已有声音回执和 owner 打断机制；未复制代码。 |
| [SmartBody 官方说明](https://smartbody.ict.usc.edu/)与[官方 FAQ](https://smartbody.ict.usc.edu/faq) | 同步行为、眼／头／躯干协调、姿态重定向 | 采用「眼先于头，头先于躯干」和准备／展开／收尾的设计。没有复制引擎或使用受商业条件约束的工具包。 |

完整 TalkingHead MIT 许可证在 `apps/stage-tamagotchi/resources/licenses/talkinghead-license.txt`，SHA-256 为 `8a8de7f52f650e7260067f96017c83c22f596c63babc62d0052d1b7be1b1b7a9`。适配源文件 `packages/stage-shared/src/interaction-transition.ts` 标明作者、版本与改动；发行校验要求 ASAR 中的许可证逐字节一致。

## 实际链路与所有权

1. Desktop `interaction-intent.ts` 从准备好的 conscious frame、当前 answer planner、deliberation 和 governance 派生 purpose、attention、focus、reason 与 sourceRefs。拒绝超过两分钟的状态、未来状态和缺少来源的意图。人格、情绪与任务状态仍归原生命核心所有。
2. `main-chat-runtime-surface.ts` 将同一意图加入实际 provider facts，并明确它是当前回合的系统理解。白名单允许该 fact 通过既有 provider 边界。没有另建系统人格提示或生成一套独立的「内心」。
3. `main-chat-background-run.ts` → `main-chat-stream-meta.ts` 将已准备的意图交给流式身体协调器。`runtime.ts` 在既有按回合缓存中携带原始意图，最终回复使用同一份准备结果，避免从已经变化的最新全局状态重算旧回合。缓存保留现有上限与结算清理。
4. `runtime-embodiment-seed.ts` 与 `interaction-performance.ts` 生成同一身体权威。支持的 VRM 身体按引导、安慰／修复、思考／澄清、延后分别选择四种动作；低置信度、缺少骨骼能力时安静退化。明确编写的动作或已有完整身体脚本保留优先权。动作仅落在第一语句，并使用回合固定 token，避免流式每次刷新重复挥手。
5. `AlicizationInteractionIntent` 是稳定渲染契约，位于 shared；策略仍位于 desktop。Script normalizer 拒绝把其他回合意图塞入当前脚本。Renderer `use-stage-interaction-intent.ts` 检查角色、过期、旧回合、暂停及任务接管；计时器只在有效意图存续时运行，并随组件释放。
6. `stage-interaction-performance.ts` 在实际 armed／speaking／cooldown 阶段投影有界 gaze、head、body 偏移。转向时眼、头、躯干依次进入；收尾归零。没有覆盖 emotion、facial、voice、lip sync 或执行结果。新主人输入、角色／模型切换、暂停、Kill Switch、任务接管清除旧计划。
7. VRM 新增 `open_palm`、`thoughtful_pause`、`reassuring_nod`、`gentle_boundary`。真实 humanoid bones 使用 additive AnimationClip；准备、保持、释放均有连续曲线。缺少 required bones 时能力清单不声明该动作。原有八种动作保留，合计十二种。
8. 原有实际动作、声音和执行回执继续进入生命闭环。新增意图代表计划，不代表已执行、已说完、已被理解，也不写入虚构的成功记忆。启动后恢复旧已提交回复时缺少这份准备记录会省略新意图；不会把重启时的新意图套到旧话上。

原生验收实际抓到了动作清单与舞台绑定断开的问题：新动作虽然被 capability 声明，却没有进入默认动作注册。现在默认绑定补齐四项，回归逐个检查每个 procedural key 是否能由实际 Stage binding selector 选中。意图动作同时更新 timeline、script、envelope 和 digital-life 的 motion aliases，防止旧待机提示覆盖已经选择的动作。

同一验收还发现原渲染管线先同步骨骼再施加 posture，导致下帧 mixer 可能先覆盖偏移，无法将姿态传到最终骨架。现在顺序为 mixer／既有 frame hook → posture → humanoid 同步 → gaze／脸／口型。原生倾听场景读取实际 raw rendered head，避免将未同步的 normalized bone 当作最终呈现。意图的有效期使用 epoch 时间；准备、保持、释放使用原播放 runtime 的单调时钟，二者分别测试。

声音合成等待时的短暂 idle 不等于实际播放结束；本轮保留准备意图，真正的 speaking／cooldown 结束才释放。不同回合进入同一 dispatcher 时先替换旧的未播放身体预览，任务接管也清理这类预览。音频源、实际播放状态和原始语音 metadata 不被取消或改写；实际播放仍从自己的 metadata 恢复。这条交接专门测试，防止旧对话的姿势或情绪遮盖实际执行状态。

连续原生场景还复现了另一层优先级错误：任务 pulse 已是 `steady_focus`，动作选择器却先采纳旧语句留下的 `gentle_boundary` alias。现在已确认的 presence action 优先于旧对话 alias，普通对话仍保留显式 alias 顺序。任务 pulse 不继承旧语音 segmentId；直接动作 API 的显式 null 同样不再被回退为旧语句。这避免将正在工作的身体动作归入上一轮说话经历。关系修复要求保持距离、或主核心标记需要休息时，新 care 意图也保留原有收敛姿态。

新对话动作也显式携带其身体脚本首语段 ID。当残留 alias 属于另一个语段时，选择新回合的动作，并丢弃旧 cue snapshot；来自当前语段的明确 alias 仍优先。这里比较实际语段身份，避免通过表情词或随机 token 猜测动作所有者。

原生多轮还定位到首轮后漏播的根因：idle reset 把 action pulse 计数归零，模型保留的 last-applied revision 将下一轮的编号再次视为重复。现在 settlement 保留最后发出的命令与单调计数，下一条命令继续递增；动作是否仍在执行由 phase 和真实模型回执描述。模型只接纳最近一秒内的新命令，防止换身体时重放过期动作。

最后一段是 shared dispatcher：原逻辑因为脸部 cue 未填而重新路由整份 performance，却未把身体脚本的能力契约传给 resolver，导致已规划的动作被通用动作替换。现在先构造脚本能力契约，再补齐 sparse 表现，保留主进程已规划的手势。新增跨模块用例依次将四种主进程意图交给真实 dispatcher，检查每一种动作都保持原意。

最后一次包内验收还发现公开动作接口的转发遗漏：内部已经支持独立动作的显式 `motionSegmentId: null`，组件暴露的单参数包装却丢弃了第二参数。现在直接暴露同一播放函数，保留它的参数和所有权语义；十二动作的原生验收逐个断言独立动作不再归入上一句语音。任务接管的真实主路径已在此前包内验收中保持独立，新增检查覆盖直接动作入口。

## 本轮验收设计

- 主进程场景检查实际 provider context、流式／最终脚本一致、提供方无法改写已准备意图、显式动作优先、身体能力降级、时间／角色／回合约束和来源引用。
- Renderer 场景检查眼先于头、关照与延后姿态差异、情绪权威保留、实际播放回合隔离、释放归零，以及暂停／任务／角色切换后不会补演。
- 真实 Three AnimationMixer 检查十二种动作的骨骼移动、单位四元数、取消与原姿态恢复。
- 原生场景通过独立 Windows desktop 测试实际初始化、中文托盘、跨窗口 SOUL、SQLite、十二动作、执行证明，以及四种由生产主进程函数生成的合成意图是否到达实际 dispatcher、Stage 和 VRM 骨骼。

合成意图场景明确标注 `synthetic: true`、`configuredModel: false`。它证明生产接线和实际身体动作，无法替代真实 LLM 对话、真实扬声器、用户主桌面合成器或多日陪伴质量评价。后台 GL 验证使用 QA 专用 SwiftShader 参数；生产启动参数保持项目原有配置。

## 最终验证与交付

115 个互不重叠的测试文件共 **1,575 项通过、0 失败、0 跳过**。范围是本轮涉及的主进程生命链、共享表达、舞台、VRM、平台诊断与执行网关，没有将此前其他版本的全量测试算进当前计数。

| 证据 | 本轮结果 |
|---|---|
| `output/life-intent-regression-scoped-20261006.json` | 107 文件、1,293 项通过 |
| `output/life-intent-platform-diagnostics-20261006.json` | 2 文件、50 项通过 |
| `output/life-intent-platform-retry-20261006.json` | 5 文件、198 项通过；此前并发运行超时的范围单独重跑，失败日志保留 |
| `output/life-intent-gateway-20261006.json` | 1 文件、34 项通过 |
| `output/life-intent-typecheck-20261006.log` | 修复最后一个公开动作接口后，完整工作区 `pnpm typecheck` 通过 |
| `output/life-intent-build-20261006.log` | 最终桌面构建通过 |
| `output/life-intent-lint-fix-20261006.log` 与动作接口专项 lint | 触及文件 ESLint fix 零错误；原 runtime.ts 的 11 项既有警告保留，最后接口专项无警告 |
| `output/life-acceptance/intent-persona-scene.json` | 最终包：四步人格初始化、确认保存、进入配置、中文原生托盘，无 renderer error |
| `output/life-acceptance/intent-action-scene.json` | 最终包：跨窗口人格同步、真实输入引起的倾听骨骼变化、恢复安静、隐藏释放；四种主进程意图到达实际骨骼；十二动作均移动骨骼，独立动作均无语音 segment；实际 CLI 和文件证明产生 fulfilled／blocked 两类结果 |
| `output/life-acceptance/intent-packaged-background.json` | 最终 Electron 40.8.0 二进制加载原生 SQLite 与 sqlite-vec 0.1.6，实际内存数据库读写，创建窗口数为零 |

三次最终原生测试各自运行在 `AlicizationQA_*` Windows desktop，控制器检查输入桌面前后均为 `Default`，未切换输入桌面，子进程 job 均已关闭。它们没有对主人主桌面注入输入或截图。原生动作数据来自合成 QA 身份和主进程生产函数；本轮没有调用真实语言模型、音频设备、摄像头或安装／卸载生产安装器。

远端 `main` 于 2026-10-06 04:44 UTC 通过 GitHub commits API 再次核验，为 `7880afc29ab33a4cf4de89f7a6610664278494c3`，与 HEAD／origin/main 一致。本地既有改动与本轮改动均被包含，因此这是该基线上的开发构建。

发行目录：`apps/stage-tamagotchi/dist/life-intent-20261006`。

- 安装器：`Alicization-0.3.0-windows-x64-intent-20261006.exe`，606,905,928 字节，SHA-256 `4532a88f92ff82368d7ba7ac82aa057b7828ce7e222fc1cb404764b4629c6c24`。
- 免安装入口：`win-unpacked/alicization.exe`，运行时保留整个 `win-unpacked` 目录。
- 最终源码：2,842 个输入，指纹 `321f834c70d9d012a11cdf0b784d2aba4d9a733084f74ce83a39eef46e0912ca`，构建前后相同。
- ASAR：`b5254a7ffe176cbcb1e3ded9569a83186a4955c029a0e43cf3184997573fd0db`。1,168 个编译文件逐一与包内比对通过；四份复用许可证逐字节比对通过；人格与动作报告同时绑定此 ASAR 和此发行 exe。
- `release-provenance.json` 记录基线、本地输入、安装包与原生依赖哈希、编译比对和全部验证文件哈希。生成命令和结果在 `output/life-intent-release-provenance-20261006.log`。

## 仍需长期体验验证的内容

本轮解决了语义与身体接线的一处断点；短程序曲线仍不足以替代高质量人物动画库。未新增自发兴趣学习、主观意识证明或完整自然思绪生成。真正的 Phase 1 验收仍需要多日真实模型使用：人格与关系连续、自然记忆、克制主动性、可靠执行，以及同一情感意图在文字、声音和身体中的一致表达。后续优化应根据这类真实经历的失败样本，修正原生命核心和动作质量。
