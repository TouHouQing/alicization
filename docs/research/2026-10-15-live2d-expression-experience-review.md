# Live2D 表达、视线与动作体验复查

本轮以 Phase 1 的同一人格、情绪与身体意图为来源，实际使用桌面 Live2D。测试使用新建的合成人格档案、真实 Cubism 模型及私有 Windows 桌面。没有切换到用户输入桌面，没有运行 VRM 体验，也没有操作用户档案。

这次发现的核心问题是表达没有可靠落到模型最后绘制的参数上：光有情绪标签、动作请求或 SDK 的虚拟参数，不能证明屏幕上的角色做到了。

## 实际发现与修复

| 问题 | 实测或复现依据 | 修改后的行为 |
| --- | --- | --- |
| 眼球持续卡向一边 | 原发行包在待机、左侧指针、右侧指针、停住指针四段共 156 个实际绘制采样中，`ParamEyeBallX` 全为 `-1` | 指针只在真正移动时获得短暂注意；停止后恢复自主注视；SDK 每帧只更新一次 focus controller |
| 原生待机时自主视线不起作用 | Idle 动画更新返回 handled 后，旧插件跳过自主视线；相同坐标的新对象又不断重设指针目标 | 播放原生 Idle 也可以做微小注视切换，近期指针输入仍优先 |
| 表情被覆盖或逐帧污染 | 情绪投射原来发生在 Cubism 保存 motion baseline 之前，后续 expression、focus 又改写同一组参数 | 身体与情绪投射进入 `beforeModelUpdate`，使用该帧真实原生结果；下帧由 Cubism 恢复原始 motion baseline |
| 记录了模型不存在的表情参数 | HiyoriPro 有 70 个编译参数，左右眼笑分别有 ID，旧逻辑却把 SDK 为未知 ID 创建的虚拟索引当作能力 | 只向编译目录中存在的通道写入；模型能力清单也据此生成 |
| 生气时仍像在笑 | 原生嘴形为 `0.85` 的测试中，强生气叠加后仍为正 `0.587` | 情绪对相冲突的原生笑脸逐渐接管并释放；声音能量不会无条件变成笑眼 |
| 闭口音依然张嘴 | 原生张嘴 `0.7` 加上闭口音输入，旧逻辑最后仍把嘴撑到 `1` | 发音期间平滑接管嘴巴开合；明确闭口优先于响度；结束后交还原生动画 |
| 静默时被持续撑开嘴 | 无语音、无惊讶输入时，默认 jaw bias 仍制造约 `0.03` 的持续张嘴量 | jaw bias 只辅助真实发声；保留模型自身编排的非语言动作 |
| 左右眼笑不独立 | 通用眼笑和单眼参数混用，部分真实模型没有通用 `ParamEyeSmile` | 左右眼保留各自手动偏置；只有通用通道的模型使用两者均值 |
| 惊讶时眼睛睁不大 | 统一的 `1.0` 上限把 Hiyori 实际支持的 `1.2` 范围截掉；新用例修复前失败 | 允许超过中性睁眼值，由 Cubism 保证不超过该模型的真实编译上限；实测宽眼帧为 `1.2` |
| 关闭待机后一直闭眼 | 停止 Idle 时，模型可能刚好保存了约 `0.004` 的闭眼基准，随后手动开合与眨眼一直乘在该值上 | 关闭待机后恢复所选眼部开合设置，再保留正常眨眼；左右眼设置仍独立。回归用例在修复前失败，真实模型绘制校验在修复后通过 |
| 小动作请求被丢弃 | 无动作资源绑定时，动作修订会被标记为已应用，然后直接返回 | 真实头部通道支持时，对语义点头、摇头、歪头提供短动作回退；显式动作资源绑定优先 |
| 相同动作以后不再播放 | 播放去重键没有包含新的 action pulse revision | 新的同类请求可以再播放，同一请求仍去重；旧异步请求不能覆盖新修订 |
| 收势时间与音乐动作时钟不一致 | Cubism motion 回调使用模型起始后的秒；释放时长和 beat 排程使用毫秒 | 明确转换释放时钟；音乐动作使用与排程一致的单调毫秒时钟；无音乐时不拉扯原生头部动作 |
| 收势窗口不断重开 | 过期后清空了 cue key，下一帧误认同一 cue 为新请求；独立用例复现了额外拖尾 | 记住已观察的 cue，过期后只清时长；新 cue 或新的有效释放配置才能重新开启 |
| 跨窗口回复结束事件丢失 | `stream-end` 提前清除了远端消息身份，随后 `assistant-end` 被丢弃；批量事件还会被异步 watcher 合并 | 按顺序处理每个消息事件，保留身份直到匹配的回复结束；旧轮次的结束不能关闭新轮次。真实语音播放后检查聊天意图与嘴部占用一起释放 |

基础修复后的第一轮实际画面已看到眼球区分左右指针，原来 459 次不断重复的 focus 请求降为 8 次有效请求。该数据来自各自约半分钟的单轮观察，不是性能基准；原生 Idle 动作随机，不能据此比较帧率或所有细节质量。

## 参考项目：落实到实现节点

本轮下载并阅读固定提交的相关源码，另查阅已发行产品的官方资料。没有运行这些竞品客户端，商业产品内部实现不作推断。下载文件、提交、哈希及链接保存在 `output/live2d-expression-review-20261015/sources/source-manifest.json` 和 `supplemental-manifest.json`。本轮没有复制第三方源码；采用适合当前 SDK 生命周期的独立实现。

| 参考对象 | 读到的具体实现或公开能力 | 本项目采用或取舍 |
| --- | --- | --- |
| [AIRI：眼球跟踪源码](https://github.com/moeru-ai/airi/blob/d79a54894c8f75d05b2bade8b9aa2c30d9d9723a/packages/stage-ui-live2d/src/composables/live2d/eye-tracking.ts) | 用实际画布矩形、模型尺寸与缩放映射视线 | 延续当前画布坐标修复；增加本地与全局指针仲裁，避免固定默认点和重复坐标长期霸占注意 |
| [N.E.K.O.：表情与动作参数恢复](https://github.com/Project-N-E-K-O/N.E.K.O/blob/96dd26258003c74970e9d75e24f4e863012ba20d/static/live2d/live2d-emotion.js) | 分别记录活动表情、动作参数，恢复时可保护当前表情，支持限时淡出 | 区分嘴巴、表情与动作的接管；每次恢复使用原生 baseline，不做全模型粗暴归零 |
| [Open-LLM-VTuber Web：表情 hook](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber-Web/blob/d176e7df2366952e3bacbf12cf9a8b18a4315932/src/renderer/src/hooks/canvas/use-live2d-expression.ts) | 表情切换有显式默认与 reset 生命周期 | 保留模型命名表情的选择与释放；不盲目把第一个表情当中性。该前端有定制许可，本轮仅参考机制 |
| [TalkingHead：视线与非语言动作](https://github.com/met4citizen/TalkingHead/blob/2afe6d79779313db8909badebf46f9805a6c7b70/modules/talkinghead.mjs) | `lookAtCamera(t)`、`lookAt(x,y,t)` 有持续时长；眼神接触与头部通道分开 | 指针注意有时限，微注视与语义头部动作分层；没有因此改用 VRM |
| [VPet：说话与状态动作](https://github.com/LorisYounger/VPet/blob/d155192828900880c718bb7b1adea8829fc40caa/VPet-Simulator.Core/Display/MainLogic.cs) | 普通动作状态与强制动作区分；说话有开始和循环阶段；记录上次交互时间 | 保留前台动作优先级和完成恢复；不照搬随机表情和按计时器打断用户的行为 |
| [VTube Studio：官方 API](https://github.com/DenchiSoft/VTubeStudio) | 公开参数注入区分 set/add、权重、短期失联后释放，限制多个 set 写入者争抢 | 同一参数有明确最后写入阶段，接管权重平滑变化，发音结束恢复；不假定获得其商业内部代码 |
| [Animaze：2D 发音和动作规范](https://www.animaze.us/manual/technicalreference/animationposes) | 2D 嘴形与开合分别使用 `ParamMouthForm`、`ParamMouthOpenY`；[动作说明](https://www.animaze.us/manual/appmanual/appanimations)区分动作与切换姿态 | 明确口型、情绪嘴形、小动作各自通道；点头为有结束的短动作，不留下切换状态 |
| [Desktop Mate：官方交互产品](https://www.infiniteloop.co.jp/desktopmate/) | 桌面驻留、可见触碰反馈和资源驱动的角色动作；[官方小部件说明](https://www.infiniteloop.co.jp/desktopmate/widgets/help/index_en.html)展示动作与语音按钮 | 真实画面、透明区穿透、拖放与可恢复操作要一起验收；不把官方小部件能力外推为整个产品内部架构 |
| [Cubism 官方 Web 样例](https://github.com/Live2D/CubismWebSamples/blob/b1de66b0b1f1cb881d95fb6158622aeb6a2827bd/Samples/TypeScript/Demo/src/lappmodel.ts)、[参数顺序说明](https://docs.live2d.com/en/cubism-sdk-manual/parameters/) | motion、expression、眨眼、视线、物理与最终 update 的先后关系会影响最后画面 | 对照项目固定的 `pixi-live2d-display@0.4.0` 实际源码，修正绘制生命周期；不把其他版本的时钟约定直接套过来 |

## 开发边界

- 人格、情绪、记忆与主动性仍由已有主进程和共享身体契约负责。新增模块处理输入仲裁、真实通道识别和有限动作投射，没有第二个人格或新的随机主动行动源。
- 手势回退只使用 `ParamAngleX/Y/Z` 的实际通道，持续 0.75～1.5 秒；支持力度变化、重复请求、暂停、模型更换、前台动作覆盖和卸载取消。
- 参数不等于资源。没有手部动画映射，不声称已经实现挥手、拥抱、完整身体表演；原生 Idle 内语义不明的动作文件也不随意标成点头或安慰。
- 保留现有模型导入、私有 ZIP 资源、动作映射、眼部参数重置、透明区命中和窗口流程的修复。

## 验证证据

当前冻结源码指纹为 `12b9288151fd56f9f9ec27ca251dbb0eedd149e87a7930baae61d1b989c78e28`，基于 `ec2a310c2c692dcc570e818564d3473d2d83c7ce` 加本地修改，并非该提交原样构建。

- 35 个文件共 486 项针对性测试通过，包含实际通道识别、时钟、发音关闭与释放、冲突笑脸、左右眼独立、宽眼范围、停止待机后的眼部恢复、收势到期、动作回退、动作重复、跨窗口消息生命周期、身体意图运行时、人格、记忆、执行策略和主动性约束。报告：`output/live2d-expression-complete-units-20261016.json`。
- 完整工作区 `pnpm typecheck` 通过，`pnpm lint:fix` 无错误；仓库仍有 725 条 ESLint 警告和 7 条 Oxc 警告。日志：`output/live2d-expression-complete-typecheck-20261016.log`、`output/live2d-expression-complete-lint-fixed-20261016.log`。
- 编译通过。日志：`output/live2d-expression-complete-build-20261016.log`。
- 原版实际绘制基线：`output/live2d-expression-baseline-20261015/report.json`；基础修复对照：`output/live2d-expression-after-foundation-20261015/report.json`。
- 最终编译版真实模型的 11 项渲染校准通过，正常退出 13,216 ms、退出码 0。实际宽眼上限 `1.2`，软件投射没有再创建不存在的面部通道；仍有 SDK 本身的 `PartArmA/B`，不能把它们误报为零虚拟参数。报告：`output/live2d-expression-complete-calibration-compiled-20261016/report.json`。校准中的情绪、闭口音、头部动作采用明确标注的组件输入，不计作她自发产生这些行为的证明。
- 最终编译版的三场景对话专项通过：分享喜悦、低落安慰、请求轻声回应，加上首次自我介绍，共 12 段真实本地语音、199 个发声绘制采样，正常退出 819 ms。声音经过应用实际合成、解码和播放链路，没有替换回复或身体输出；聊天意图最终为 `null`。报告：`output/live2d-expression-complete-dialogue-compiled-20261016/report.json`。这是专项诊断格式，不替代完整产品验收。
- 最终发行包的同一真实模型再次通过全部 11 项绘制校准，采样 316 帧、有效 focus 请求 11 次、重复请求 0 次，正常退出 615 ms。报告：`output/live2d-expression-complete-calibration-packaged-20261016/report.json`。裁剪对照图为同目录的 `expression-comparison.png`；右侧指针截图恰好处于眨眼，视线方向的结论依据整段最后绘制数据，不能只凭这张静态截图判断。
- 同一发行包不带 Node inspector 启动，通过真实关闭按钮正常退出，退出码 0、用时 3,476 ms；退出前 WebAudio 上下文为 running。报告：`output/live2d-expression-complete-native-exit-20261016/report.json`。这一项使用静音音频振荡器校验退出链路，不充当真实对话或硬件音频证明。
- 最终发行包完整产品复测通过：115 个页面与操作状态、241 项检查，包含新建人格、服务错误恢复、设置与记忆入口、Live2D 参数与待机、模型导入改名重载移除、服务配置目录、离线重试、托盘及辅助窗口、真实对话和聊天导入导出。没有记录到渲染器异常、未解析翻译键或新的 Live2D 加载／绘制错误。报告：`output/live2d-expression-complete-product-packaged-verified-20261016/report.json`。
- 该完整流程包含首次介绍和三轮情绪对话，14 段本地 SAPI 语音全部合成并进入实际解码、播放链路，采到 209 个发声绘制帧，嘴部实际张开；最后语音占用为 false、聊天意图为 `null`，正常退出 819 ms、退出码 0。输出全程静音，云声音品质和物理声卡不在此证明范围内。
- 完整流程单独重跑时，欢迎按钮就绪等待为 50 ms。全部最终原生报告都验证了相同包内 exe、相同 ASAR 和私有桌面归属；前后输入桌面均为 Default，未切换。失败的语音适配器、冷启动等待及异常退出轮次保留，不计作通过证据。

工具本身也做了两项校正：语音测试配置须先经主进程的配置接口同步，避免新开的聊天窗口用主进程配置覆盖仅存在于渲染器的临时值；原生窗口出现最终 URL 后，还须等 Vue 文档实际挂载再读取页面。完整编译版首轮在小部件窗口读取超时，并在退出阶段超过 60 秒，整轮保持失败，未计入发行验收。首次包内完整流程在三个软件 GL 检查同时冷启动时超过欢迎页的 10 秒等待，随后截图中页面已出现；这轮同样保留为失败。冷启动步骤改为单独记录就绪时间、最多等待 30 秒，其他检查结束后才重跑完整流程，没有改变产品超时或放松断言。这两轮的临时凭据均已移除。

缓存清理曾被自动审批系统拒绝，包括限定到明确 QA 缓存目录的方案，返回原因为 `blocked by policy`。另一个已确认无进程使用、无重解析点的过时工作区测试构建 `dist/live2d-expression-20261015`（2,229,916,268 字节，约 2.08 GiB），删除命令也被同一系统以相同原因拒绝。因此这些临时产物暂留，不声称清理成功；只读核对记录见 `output/live2d-expression-hygiene-audit-20261016.json`、`output/live2d-expression-obsolete-build-preview-20261016.json`。最终只读检查涉及本轮 28 个合成档案，所列 Chromium 缓存约 248.7 MiB，配置中均没有非空 API key，也没有保留从用户配置读取的密钥。原始检查报告、源码参考和截图作为验证证据保留。中断测试档案中的临时供应商凭据已在独立桌面、确认原进程退出后，通过 Electron 的配置与存储接口移除；此操作不删除缓存或生命状态。

## 最终发行文件

发行目录为 `apps/stage-tamagotchi/dist/live2d-expression-20261016/`：

- 安装器：`Alicization-0.3.0-windows-x64-live2d-expression-20261016.exe`，608,022,938 字节。
- 解包版：`win-unpacked/alicization.exe`。本轮实际启动并验收的是这一文件，没有在用户环境操作安装与卸载。
- 对应关系：`release-provenance.json`。已逐文件核对所有编译输出与 ASAR，并验证二开模块应随包携带的许可证；`packagedOutputMatchesCompiled` 和本轮的 `productExperienceVerified` 均为 true。没有把未重跑的长期生命、独立执行或完整动作场景专项标为通过。

| 内容 | SHA-256 |
| --- | --- |
| 源码文件集指纹 | `12b9288151fd56f9f9ec27ca251dbb0eedd149e87a7930baae61d1b989c78e28` |
| ASAR | `d9fe086edc18c8a325ed12f92947bd809314176990a8100f38a2e681351ffdd6` |
| 安装器 | `8222a7cee0a7a682f73334731ca2b6dc99ed139badcf9f7594317fa895ea40a5` |

当前源码包含基于上游提交的本地修复，尚未提交这些修改；本轮没有自动推送 GitHub。最终校验日志为 `output/live2d-expression-complete-provenance-20261016.log`。

## 仍需长期体验的部分

这些修复解决了“意图存在，但身体没有正确表达”的具体故障。长期的分寸感仍要从真实相处验证：什么时候看向你、什么时候移开视线、安慰时是否克制、相同动作是否重复过多，都不能只凭一轮校准证明。高质量动作仍需要模型作者提供并标注适合该角色的素材。

实际对话还暴露出不能由渲染修复替代的问题：请求轻点头时，上游并不保证始终选择点头意图；“先安静陪伴”的回答仍可能用文字描述陪伴。这些场景不应仅凭出现 `happy` 或 `concerned` 标签就宣布体验达标，也不能把受控点头校准当作自然理解已解决的证明。后续需用持续的语义动作命中和真实停顿场景评估上游行为选择。

后台测试不证明用户主桌面的物理鼠标派发、麦克风与扬声器听感、所有供应商、所有第三方 Live2D 资源和长期人格连续性。实际对话验证使用已有模型配置；本地语音测试会明确标注音频来源，不把测试音频算作已验证的商业语音品质。
