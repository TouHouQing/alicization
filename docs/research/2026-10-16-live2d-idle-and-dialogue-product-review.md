# Live2D 待机、对话表情与口型产品复查

状态：修复、最终安装包验收和源码对应核对已完成。最终包使用包含引导及设置响应归属修复的 `4b30b0c…` 源码指纹，完整记录见本文末尾。

本轮继续以 Phase 1 的同一人格、情绪、记忆和身体意图为来源，从新建合成人格体验桌面产品。全部 GUI 位于独立 Windows desktop，未切换或操作用户的输入桌面；只运行 Live2D。对话使用已有模型配置，测试声音由有界本地 SAPI 服务生成并静音播放。

上一轮产品修复清单和参考项目分析见 [前一轮报告](2026-10-15-live2d-expression-experience-review.md)。本轮增加较长待机观察、真实音频时钟上的 PCM 采样，以及语音静音间隙和停止后的嘴部校验。

## 新发现与处理

| 问题 | 修复前的证据 | 本轮处理 |
| --- | --- | --- |
| 没有语音时，待机动画仍像在说话 | 旧发行包约 61.2 秒、428 个待机采样全部为 speech inactive；嘴部开合最大 1.0、均值 0.285，约 31.1% 的采样超过 0.12 | 原生待机更新后，先清除待机的嘴部开合曲线，再交给命名表情与最终情绪／语音层；保留前台动作和手动偏置 |
| 音频静音时，嘴巴仍跟着文字动 | 真实回复的 PCM 静音采样中，嘴部开合均值仍为 0.284；有实际 energy 为 0、文字 articulation 和 prosody 仍撑开嘴的帧。新增用例修复前失败 | 已绑定音频时，音量决定发音开合，文字辅助元音形状；沿用开合平滑，保留明确的无音频文字播放回退 |
| 中性待机被拉成噘嘴或不悦 | 两个用例分别以嘴形 0 和 0.4 起步，静默后均多了约 -0.184 的偏移 | 没有发声时不再应用语调的负偏移；情绪和手动嘴形仍独立存在 |
| 说完后，延续状态还在撑嘴 | 原测试要求 continuityHoldMs 越长、结束后的嘴越开；这会把陪伴延续误当成继续发音 | 停止播放后让嘴自然回落，保留情绪、注视及身体延续；更新了相应行为断言 |
| 新启动的前台动作可能被误判成待机 | 插件在原生 motion 更新前记录了优先级，原生更新可能在同一帧开始新动作 | 原生更新后重新核对 SDK 优先级，再决定待机插件能否接管；回归检查同一帧的 Idle→Tap 与 Tap→Idle |
| 打开字幕窗口后退出，可能留下进程 | 单独重建菜单、关于、小部件、内嵌窗口分别正常退出；只有字幕窗口单独就能复现超过 60 秒。关闭跟随也仍失败 | 字幕关闭会通知托盘更新，而托盘已在退出钩子中销毁。托盘现在先取消排队重建、释放窗口／字幕／语言订阅，再销毁；迟到通知也不能再读取原生窗口 |
| 字幕跟随在关闭后仍有排队任务 | 原跟随只移除 move／resize 监听并暂停动画，没有取消 throttle／debounce；延迟回调可再读取被销毁窗口 | 跟随任务有独立生命期，取消移动与收势、停止动画、执行前检查双方窗口；退出时暂停主进程 Anime.js 循环 |
| 引导最后“去配置动作映射”偶发无响应 | 先关闭自身会丢失后续请求；原设置 RPC 还绑在主舞台，能打开设置却把响应送回主舞台，无法完成引导自己的等待。实际 Vue 回归在旧代码中 2 项失败，单改顺序的原生检查也确实挂住 | 先打开并等待设置；设置导航使用唯一的不绑定固定窗口的 Eventa main context，将响应和错误发回实际请求者，再关闭引导。真实适配器测试覆盖双窗口并发、错误重试和释放；原生观察验证设置先创建、引导 renderer 后销毁 |

这些是同一身体的参数归属与播放生命周期修复，没有增加第二个人格或新的随机主动行为。

## 同类项目与官方实现的采用点

| 来源 | 读到的实现或约束 | 本项目的落地方式 |
| --- | --- | --- |
| [Live2DViewerEX 官方编辑器说明](https://live2d.pavostudio.com/doc/en-us/exstudio/live2d-editor/#lip-sync) | 口型由音量驱动，提供增益和平滑；动画关键帧可能使控制器失效 | 将待机嘴部曲线与最终发音层分开；以实际音频检验静音间隙，沿用当前攻击与释放平滑 |
| [VTube Studio 官方 API](https://github.com/DenchiSoft/VTubeStudio#controlling-one-parameter-with-multiple-plugins) | 参数 set 的独占归属与 add 的叠加语义不同 | 待机、命名表情、语音、前台动作有明确阶段；避免让所有来源都累加到嘴部开合 |
| [N.E.K.O. 固定提交的表情恢复实现](https://github.com/Project-N-E-K-O/N.E.K.O/blob/96dd26258003c74970e9d75e24f4e863012ba20d/static/live2d/live2d-emotion.js) | 表情恢复时单独保护嘴部振幅通道，并根据记录恢复参数 | 本轮只中和待机的开合，不粗暴重置整张脸；保留命名表情和原生前台动作 |
| [Cubism 官方口型文档](https://docs.live2d.com/en/cubism-sdk-manual/lipsync/)与[动画更新说明](https://docs.live2d.com/en/cubism-sdk-manual/motion/) | 口型通道和 motion／expression 的更新顺序须明确 | 在当前固定 SDK 的真实更新顺序上安排插件，并核对最终绘制值；不把别的 SDK 版本的调用顺序直接套用 |
| [Electron app.exit](https://www.electronjs.org/docs/latest/api/app#appexitexitcode) 与 [BrowserWindow.destroy](https://www.electronjs.org/docs/latest/api/browser-window#windestroy) | 最终退出和强制销毁窗口不会替应用完成 close／beforeunload 保存流程 | 先完成现有生命与窗口状态钩子和日志排空，再显式销毁本应用窗口；等待一轮事件循环后最终退出，任何步骤失败仍报告异常退出 |
| [Anime.js engine.pause](https://animejs.com/documentation/engine/engine-methods/pause/) 与 [animation.cancel](https://animejs.com/documentation/animation/animation-methods/cancel/) | 暂停全局时钟与取消单个动画是不同的生命期操作 | 关闭跟随时取消当前动画和队列；应用退出时再暂停唯一由字幕持有的主进程动画引擎，不影响渲染器 Live2D 时钟 |
| [Eventa](https://github.com/moeru-ai/eventa) 当前安装版本的 Electron main adapter | 绑定 window 时把响应发给该窗口；不绑定时使用原请求 `raw.ipcMainEvent.sender` | 设置导航保留现有共享事件契约，在桌面服务中使用一个不绑定窗口的 context；主窗口关闭时释放订阅，避免重复处理 |

本轮使用独立实现，没有复制第三方源码。商业产品只参考公开资料，没有运行其客户端或推断闭源内部实现。

## 代码与验证边界

- `mouth-drive.ts` 负责音频嘴部驱动与待机嘴部归属；`Model.vue` 只注册插件；`motion-manager.ts` 组合当前驱动和已有表情状态。
- `settings-navigation.ts` 拥有桌面设置导航的请求和响应归属，`onboarding.vue` 负责先完成后续操作再关闭自己的 renderer；不增加第二份引导或人格状态。Desktop Vitest 复用现有 Vue／YAML 依赖，直接验证实际 SFC 的事件处理。
- 真实音频的静音和元音提示可以同时存在；嘴部开合以音频为准，情绪仍可表达微笑、惊讶等非语言状态。
- 退出先保存生命与窗口状态，再停止服务、排空日志、释放窗口；异步清理完成后允许正常 Electron quit，保留 will-quit，window-all-closed 不在清理期间重复发起退出。测试工具以真实关闭按钮启动该流程，断开自己的 Node inspector，不注入终止或更改生命状态。
- 本轮没有更改人格、记忆、主动性和执行权限的定义。语义动作选择、真正安静陪伴的停顿、完整手部表演等前一轮已记录的缺口仍须单独处理。
- 私有桌面软件 GL 不证明用户主桌面物理鼠标、所有显卡、所有第三方模型及麦克风／扬声器品质。供应商配置入口可检查，未逐个连接付费供应商。

## 原始证据

- 较长待机基线：`output/live2d-idle-speech-baseline-20261016/report.json`。
- 真实语音与 PCM 基线：`output/live2d-idle-speech-dialogue-baseline-20261016/report.json`。
- 中性嘴形失败用例：`output/live2d-idle-speech-rest-form-before-20261016.log`。
- 静音间隙失败用例：`output/live2d-idle-speech-gap-before-20261016.log`。
- 全套回归首轮的两个跨窗口测试失败记录：`output/live2d-idle-speech-units-20261016.json`。测试 fixture 未在各用例结束后销毁接收队列，已补充 store dispose 和 Pinia 清理；后续另发现首次冷导入共用例外超时预算，改为 beforeAll 模块准备，行为用例仍保留原预算。失败轮次保留。
- 退出诊断中的失败记录也保留：`output/live2d-idle-speech-closure-exit-compiled-20261016/report.json`、`output/live2d-idle-speech-ordered-exit-compiled-20261016/report.json`。即使嘴部和其他功能检查通过，只要正常退出超时，该轮仍为失败；没有以清理标记或强制终止代替进程成功退出。
- 辅助窗口隔离：`output/live2d-idle-speech-exit-{menu,about,caption,widgets,inlay}-only-20261016/report.json`。菜单重建为 741 ms，关于为 1,085 ms，小部件为 764 ms，内嵌为 976 ms；字幕超过 60 秒。关闭跟随仍失败的记录为 `output/live2d-idle-speech-caption-no-follow-20261016/report.json`。单纯调整退出顺序、调试器断开时机或停止跟随动画都未消除问题，不能单独视作根因修复。
- 单次问候对话在静音中出现 0.147 的开合，记录为 `output/live2d-idle-speech-two-window-exit-20261016/report.json`，该轮没有当成通过。此帧伴随前台 Tap 动作，产品约束本就保留前台动作的参数归属。最终观察增加真实 SDK 动作优先级，分别记录 NONE／IDLE 与前台动作，不凭语义标签猜测是否在待机，也不抹掉前台结果。受控的真实模型校验仍检查有声、无声与停止后的嘴部；最终门槛与旧包对照如下。
- `output/live2d-idle-speech-final-product-compiled-20261016/report.json` 的全部界面与三轮语音已完成，正常退出 1,406 ms，但当时断言要求静音样本必须包含待机帧；实际 49 个样本都处于前台动作，故该轮仍保持失败。最终检查按真实参数归属同时校验：NONE／IDLE 开合低于 0.14，温和对话中的前台非语言表情低于 0.20；受控中性静音仍须低于 0.05。
- 使用同一最终检查重新跑旧发行包，连续 200 ms 全 PCM 静音中的 12 个帧仍张嘴，最大约 0.516，正确失败：`output/live2d-idle-speech-silence-baseline-recheck-20261016/report.json`。这项对照用于确认保留小表情的断言仍能拦住原来的无声发音问题；没有改写旧失败报告。
- 引导窗口的确定性旧代码失败：`output/live2d-idle-speech-onboarding-before-runtime-20261016.log`，2 项失败、2 项通过。先修顺序但未修响应归属时，原生等待引导关闭仍超时：`output/live2d-idle-speech-onboarding-preflight-20261016/report.json`。
- 引导交接的原生修复确认：`output/live2d-idle-speech-navigation-preflight-verified-20261016/report.json`，14 项通过、正常退出 1,074 ms。实际顺序为创建设置窗口 4 → 销毁引导 renderer 3 → 关闭引导窗口 3。第一次观察在 Page close 与 BrowserWindow closed 之间读取过早，记录为失败；随后等待原 renderer 销毁事件，没有放宽业务顺序要求。

## 本轮验证记录

- 最新源码的 41 个文件共 509 项针对性测试全部通过：`output/live2d-idle-speech-navigation-units-verified-20261016.json`。包含真实通道、语音间隙、情绪覆盖、动作优先级、表情恢复、跨窗口生命周期、窗口清理、字幕与托盘的迟到任务、实际引导 SFC、真实 Eventa 双窗口请求／错误回包，以及人格、记忆、执行和主动性约束的既有回归。
- 完整工作区 `pnpm typecheck` 通过，`pnpm lint:fix` 无错误；保留仓库既有的 725 条 ESLint 和 7 条 Oxc 警告。日志：`output/live2d-idle-speech-navigation-typecheck-verified-20261016.log`、`output/live2d-idle-speech-navigation-lint-final-20261016.log`。最后的测试适配器类型修正另通过目标 ESLint；QA 脚本通过 `output/live2d-idle-speech-navigation-qa-lint-20261016.log`。
- 最新源码编译通过，用时 38.28 秒：`output/live2d-idle-speech-navigation-build-verified-20261016.log`。
- 字幕单项的最终修复确认正常退出 1,060 ms、退出码 0：`output/live2d-idle-speech-tray-fixed-verified-20261016/report.json`。前一轮 `tray-fixed` 未打开设置页面，未到达字幕检查，保留为失败，不能用它的正常退出代替字幕修复证明。
- 最终源码的较长待机与受控表情／口型校验全部 15 项通过：`output/live2d-idle-speech-final-calibration-compiled-20261016/report.json`。其中默认待机记录 290 帧，嘴部开合最大值为 0；完整观察共 575 帧，正常退出 1,617 ms、退出码 0。早期嘴部修复候选中的约 61.4 秒、413 帧也全部闭口，且眼部笑意可达约 0.857，眼部开合覆盖正常眨眼；该记录只作嘴部修复的阶段对照。
- 上述静默待机来自新档案的默认状态；不意味着惊讶、命名表情或明确前台动作也必须闭嘴。基线和修复后为独立运行，原生动画存在随机性，不能用于比较帧率或量化整体美感。

最新冻结源码指纹为 `4b30b0cae3336cc1899ca30895561a79345a66e0c9df24519c3c205eed3642a3`，当前 main 与远端均为 `2691d994c48778635aff08123cddb7f82a6c6f14`，另包含本轮及此前本地修复。该远端提交仅更新 `nix/pnpm-deps-hash.txt`，已保留本地修改并快进同步；Windows 构建输入在同步前后指纹完全一致，随后引导及请求归属修复形成新的当前指纹。Git HTTPS 连接失败后，通过 GitHub Git Data API 取得 4 个缺失对象，逐个核对原始 Git SHA 后才写入对象库，再执行受保护的 fast-forward；没有改写远端提交。证明见 `output/live2d-idle-speech-navigation-main-proof-20261016.json`。

## 最终包验收与交付

| 验收 | 最终结果 | 证据 |
| --- | --- | --- |
| 从首次引导到聊天导入导出的完整体验 | 115 个界面状态，244 项检查全部通过；页面异常与未解析翻译键均为 0；正常退出 1,392 ms、退出码 0 | `output/live2d-idle-speech-navigation-product-packaged-20261016/report.json` |
| 真实对话与语音 | 初次问候及分享喜悦、低落陪伴、轻微回应三个场景；12 段 SAPI 语音经实际合成、解码和播放完成，无残留合成任务或聊天意图；声音静音 | 同上 |
| 实际语音静音间隙 | 43 个完整 200 ms PCM 静音窗口对应最终绘制帧，均处于前台动作；嘴部最大开合约 0.154，保留少量非语言表情 | 同上 `actualAudioSilence` |
| 引导窗口交接 | 实际创建设置窗口 4 后，才销毁引导 renderer 3 并关闭引导窗口 3；真实页面和窗口响应均完成 | 同上 `onboardingWindowOrder` |
| 待机、注视、表情与口型校准 | 15 项通过，576 个最终绘制帧；其中约一分钟默认待机采样 306 帧，嘴部开合最大为 0；正常退出 1,516 ms、退出码 0 | `output/live2d-idle-speech-navigation-calibration-packaged-20261016/report.json` |
| 从启动起无 Node inspector 的原生关闭 | 实际 Live2D 像素与静音 WebAudio 运行后，点击软件关闭按钮，正常退出 1,281 ms、退出码 0 | `output/live2d-idle-speech-navigation-native-exit-20261016/report.json` |
| 最终包与源码关系 | 2,996 个源码输入形成冻结指纹，包内 1,173 个编译文件逐个匹配；三次最终原生测试的 exe、ASAR 哈希与交付物一致 | 发行目录 `release-provenance.json` 与 `output/live2d-idle-speech-navigation-hygiene-20261016.json` |

完整体验覆盖人格引导和连接失败反馈、Live2D Pro／Free 切换、拖动缩放与重置、待机开关和保存、颜色与缓存、无效／大写／无配置 ZIP 导入、改名与重载、记忆页、节律和备份、供应商配置入口、离线语音错误态、托盘辅助窗口、真实对话及聊天数据导入导出。供应商连通性使用当前已配置的对话服务；配置页可用不等于所有付费账户或外设已验收。

交付目录为 `apps/stage-tamagotchi/dist/live2d-idle-speech-20261016/`。安装器：`Alicization-0.3.0-windows-x64-live2d-idle-speech-20261016.exe`，608,017,178 字节；SHA-256 为 `2519ac3d624da61768fd53cd45801b7d3197246df54482ada4b218450fdbdfe7`。免安装入口位于该目录的 `win-unpacked/alicization.exe`。源码、编译文件、原生资源、安装器与验收报告的对应关系由 `release-provenance.json` 保存。

38 个本轮合成 QA 档案复查未保留真实提供商 key；配置、Local Storage 和日志中共检查 127 个文件，未匹配到已配置真实 key 的 UTF-8／UTF-16LE 字节，也未保留 SAPI 临时文本或 WAV。最终三次原生运行的 Windows Job 已收束，输入桌面始终为 Default，未切换或操作用户主桌面。此前自动审批以 `blocked by policy` 拒绝了 QA 缓存和旧构建删除，本轮没有重试或换路删除；约 337.46 MiB 的测试缓存及此前被阻止删除的旧构建仍保留，生命数据和失败证据也保留。

这轮修复使实际参数、发声与静音、动作归属和关闭生命期更一致。语义手势选择、真正安静陪伴的时间节奏、完整手部表演、所有第三方 rig 的适配、音素级对齐和长期使用中的人格连续性仍不能由本轮短时验收宣告完成。
