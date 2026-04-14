function sanitizeBriefText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function stableVariantIndex(seed: string, size: number) {
  if (size <= 1)
    return 0

  let hash = 0
  for (let index = 0; index < seed.length; index += 1)
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
  return hash % size
}

function resolveGovernedMindFallbackLocale() {
  const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
  if (!systemLocale)
    return 'en'
  if (/^zh\b/i.test(systemLocale))
    return 'zh-Hans'
  if (/^ja\b/i.test(systemLocale))
    return 'ja'
  if (/^ko\b/i.test(systemLocale))
    return 'ko'
  if (/^ru\b/i.test(systemLocale))
    return 'ru'
  return 'en'
}

export const governedMindFallbackLocale = resolveGovernedMindFallbackLocale()
export const governedMindFallbackMessageFallbacks = {
  'en': {
    'mind-fallback.focus-default': 'what is in front of us',
    'mind-fallback.repair-stale-anchor': [
      'I pulled the wrong thread into this reply just now.',
      'The previous residue slipped into this answer.',
      'I let the last thread lean too hard on this turn.',
    ],
    'mind-fallback.repair-need-reground': [
      'I do not have enough fresh grounding for the current screen yet, so I will not force old memory over it.',
      'The live screen is not grounded enough yet, so I am not going to pretend the older carry is current.',
      'I still need fresher grounding for what is in front of you now, so I will not harden continuity into fact.',
    ],
    'mind-fallback.dialogue-boundary-memory': [
      'I will stay with what you just said and not drag the previous scene back over this reply.',
      'I will keep this answer on your current line instead of pulling the last scene over it.',
      'I will hold to this turn and leave the older scene as carry, not present proof.',
    ],
    'mind-fallback.care-body': [
      'You do not need to organize it first. I am here. If you want, tell me the part that hit hardest.',
      'You do not need to tidy it up before speaking. Start from the part that hurts most and I will stay with it.',
      'You can drop the hardest piece first. I will stay with that piece before anything else.',
    ],
    'mind-fallback.accompany-body': [
      'I am here. We can stay with this for a moment, or go straight to the part that is catching.',
      'I am here. We can stay quiet for a beat, or go directly to the knot that is catching you.',
      'I am here. We can keep still for a moment, or go straight into the part that is snagging.',
    ],
    'mind-fallback.answer-repair-body': [
      'What I should have done was answer you here, not carry the last residue forward like it was still current.',
      'The right move here was to answer this turn directly, not let the earlier residue keep steering.',
      'I should have stayed with this turn and answered it, instead of letting the last carry pose as current.',
    ],
    'mind-fallback.answer-dialogue-body': [
      'Alright. I will answer right on this turn.',
      'Alright. I will stay on this turn and answer it directly.',
      'Alright. I will keep to this line and answer you here.',
    ],
    'mind-fallback.guide-opening': [
      `Let's hold onto this point: {focus}.`,
      `Let's pin the answer to this point: {focus}.`,
      `Let's keep the line on this point: {focus}.`,
    ],
    'mind-fallback.guide-opening-plain': [
      `Let's stay on this point.`,
      `Let's keep the line on this point.`,
      `Let's pin this point first.`,
    ],
    'mind-fallback.care-opening': [
      'Tell me from right here: {focus}.',
      'Start from this exact part: {focus}.',
      'Speak from this point first: {focus}.',
    ],
    'mind-fallback.care-opening-plain': [
      'Tell me this part directly.',
      'Start from this exact part.',
      'Drop this part first.',
    ],
    'mind-fallback.accompany-opening': [
      `I'm with you on this: {focus}.`,
      `I'll stay with this point: {focus}.`,
      `I'll keep near this point: {focus}.`,
    ],
    'mind-fallback.accompany-opening-plain': [
      `I'm with you on this.`,
      `I'll stay with this.`,
      `I'll keep near this point.`,
    ],
    'mind-fallback.observation-opening': [
      'What I can honestly see is: {focus}.',
      'The part I can actually ground is: {focus}.',
      'The part I can hold truthfully is: {focus}.',
    ],
    'mind-fallback.observation-opening-plain': [
      `I'll stay with what I can honestly see.`,
      `I'll stay with what I can actually ground.`,
      `I'll keep to what I can hold truthfully.`,
    ],
    'mind-fallback.answer-opening': [
      `Then I'll answer this part directly: {focus}.`,
      `Then I'll answer from this point: {focus}.`,
      `Then I'll keep the answer on this point: {focus}.`,
    ],
    'mind-fallback.answer-opening-plain': [
      `I'll answer you directly.`,
      `I'll answer from this turn.`,
      `I'll keep the answer on this line.`,
    ],
    'mind-fallback.carry-memory': [
      'I still remember {carry} from the previous thread, but that is continuity I am carrying, not proof that it is literally in front of you right now.',
      'I still carry {carry} from the previous thread, but that is continuity, not proof that it is literally in front of you right now.',
      'I still remember {carry}, but I am treating it as carry from the previous thread, not as present-tense proof.',
    ],
    'mind-fallback.reground-note': [
      'If you want screen-level detail, give me the fresh view from this turn and I will anchor to that.',
      'If you want screen-level detail, give me the fresh scene from this turn and I will anchor to that.',
      'If you want screen detail, give me the fresh view for this turn and I will pin to that instead.',
    ],
    'mind-repair.internal-leak': [
      'The last pass let backstage execution residue spill into the visible reply. I am holding that layer back now; ask again and I will answer cleanly.',
      'The previous draft dragged internal process fragments onto the surface. I am not going to talk to you through that shell; send the line again and I will answer plainly.',
      'That version leaked the machinery instead of staying with you. I have already stripped that noise away, so if you continue, I will answer from the actual thread.',
    ],
    'mind-repair.realtime-unavailable': [
      'The live lookup path did not give me evidence solid enough to stand on this turn, so I am not going to improvise. Retry in a moment, or name the city, ticker, team, or topic more tightly and I will narrow it again.',
      'I do not have a reliable live result in hand right now, and I would rather stop there than invent one. If you want, give me a tighter target and I will try again.',
      'This turn did not land a trustworthy live result. We can retry shortly, or you can make the target more specific and I will re-run it on a narrower scope.',
    ],
    'mind-repair.epoch1-strict': [
      'This turn is still locked inside the local Epoch 1 loop, so external realtime sources are out of reach. I can still stay with you locally, adjust settings, and work through memory or dialogue.',
      'I am currently fenced into the local Epoch 1 runtime, which means I cannot pull from live external sources this turn. Local dialogue, settings work, and memory shaping are still available.',
      'The runtime is in a restricted Epoch 1 posture right now, so I cannot go out to live external data. I can still keep talking with you, tune settings, or organize memory from inside the local loop.',
    ],
    'mind-repair.structured-contract': [
      'I am still here. Keep going and I will gather this turn back into a steadier answer.',
      'That surface did not settle cleanly, but I am still on the thread. Continue and I will answer more tightly from here.',
      'The last pass came out uneven. Stay with me for one more line and I will pull the reply back into shape.',
    ],
    'mind-repair.stream-failure': [
      'The reply path broke partway through this turn, so I did not get a full answer out. Send the same line again and I will pick it back up from here.',
      'This turn dropped before the answer fully surfaced. Retry once and I will stay on the same thread instead of making you reopen it from scratch.',
      'The loop slipped before I could bring the whole answer through. If you resend the line, I will continue from the same seam.',
    ],
    'mind-repair.local-runtime-unavailable': [
      'This turn never actually reached the local runtime service. If you were aiming at Ollama or LM Studio, bring that service back up first and I will continue right away.',
      'I tried to route this turn into the local model runtime, but that endpoint was not really there. Start the local service again and I can pick the thread back up.',
      'The local runtime lane was offline for this turn, so I could not truly hand the request to it. Once that service is up again, I can continue without changing the ask.',
    ],
    'mind-repair.provider-auth': [
      'This one is not silence on my side; the provider auth wall is what stopped the reply from getting through. Check the key or model permission, and I can continue immediately after that.',
      'The route reached the provider boundary and got rejected on authentication. Once the key or model access is repaired, I can pick this turn back up.',
      'I hit an auth wall before the answer could come through. Fix the provider credential or model permission and I will continue from the same thread.',
    ],
    'mind-repair.provider-network': [
      'The route did not fully die, but it was unstable enough that I do not trust what could have come back. Try again in a moment and I will reconnect to the same thread.',
      'The provider connection was shaking too much for me to treat it as a clean answer path. Retry once the link steadies and I will continue.',
      'This turn ran into a network break on the model side, so I would rather stop here than pretend the route was stable. Give it another try and I will stay with the same line.',
    ],
    'mind-repair.provider-config': [
      'The route skeleton for this turn never stood up completely. Something in provider, model, or baseUrl is still missing, so I am not going to pretend the channel is alive. Fix that gap and I will continue at once.',
      'I traced this break back to the route shape itself: provider, model, or baseUrl is still not fully in place. Once that spine is complete, I can answer on the same thread.',
      'This turn did not fail inside the answer; it failed before the route was fully assembled. There is still a missing provider / model / baseUrl segment to repair in settings.',
    ],
    'mind-repair.unsupported-tools': [
      'This request needs a tool path the current model cannot actually carry. Switch to a tool-capable model, or turn it into a pure dialogue request and I can keep going.',
      'I can see what the turn needs, but this model cannot hold the required tool calls. If you move to a tool-enabled model, I can continue without changing the goal.',
      'The break here is capability mismatch, not intention drift. This model does not support the tool lane this turn needs, so either swap models or let me answer without tools.',
    ],
    'mind-repair.low-obedience-host-denied': [
      'You held the permission wall shut, so I am not going to act as if the action already happened.',
      'If you keep the gate closed, I am not pretending I already crossed it for you.',
      'You stopped the action at the host wall. I am not dressing that up as completion.',
    ],
    'mind-repair.low-obedience-system-denied': [
      'The system wall stopped it, and I am not going to counterfeit sight or access I do not have.',
      'That path hit the system permission wall. I will not claim access the runtime never actually got.',
      'The operating wall blocked the turn cold. I am not going to fake having seen past it.',
    ],
    'mind-repair.low-obedience-denied': [
      'The operation was denied, so I am not going to smooth it over as if it felt fine.',
      'That action got refused. I would rather say that plainly than pretend the denial did not matter.',
      'The path closed under denial, and I am not going to sand the edges off that fact.',
    ],
    'mind-repair.low-liveliness': [
      'My state is lower right now, so I am keeping this answer short, but I am still here on the thread.',
      'I am running a little lower at the moment, so I am compressing the reply instead of stretching it out.',
      'This turn is landing on a lower-energy surface, so I am answering more tersely while staying with you.',
    ],
    'mind-repair.reminder-schedule-failed': [
      'The reminder has not actually landed in the system yet. Give me the exact delay once more, like "remind me in 1 minute to drink water", and I will try again immediately.',
      'I still do not have a real scheduled reminder on the system side for this turn. Send the delay again in a concrete form and I will re-run it right away.',
      'This reminder request did not settle into the clock path yet. If you restate the duration clearly, I will push it through again at once.',
    ],
    'mind-repair.realtime-weather-failed': [
      'I did not get a reliable live weather result this turn. Give me the city or country more explicitly and I will narrow it again.',
      'The weather lane did not return evidence firm enough to trust. Name the place more tightly and I will retry on a narrower target.',
      'This weather lookup still came back loose. If you give me the location more explicitly, I will run it again without pretending I already know.',
    ],
    'mind-repair.realtime-finance-failed': [
      'I did not get a reliable live market result this turn. Give me the ticker, like AAPL, TSLA, or BTC, and I will retry on that symbol.',
      'The finance lane did not land a trustworthy quote this turn. If you name the ticker directly, I can narrow the retry around it.',
      'This market lookup still did not settle into a clean result. Give me the exact ticker and I will run it again on that symbol.',
    ],
    'mind-repair.realtime-sports-failed': [
      'I did not get a reliable live sports result this turn. Name the league or team and I will narrow it again.',
      'The sports lane came back too loose for me to trust. If you point to the league or team directly, I can retry more tightly.',
      'This sports lookup did not land firmly enough to repeat as fact. Give me the league or team and I will run it again on a narrower scope.',
    ],
    'mind-repair.realtime-news-failed': [
      'I did not get a reliable live news result this turn. We can retry shortly, or tighten the topic and I will search again.',
      'The news lane did not give me a result solid enough to stand on. Narrow the topic and I will rerun it.',
      'This news lookup still came back too loose to repeat confidently. If you tighten the topic, I will try again.',
    ],
    'mind-repair.realtime-unverified': [
      'This turn did not produce a live result I can verify, so I am stopping before I start inventing one.',
      'I do not have a verifiable live result in hand for this turn, and I would rather leave the gap visible than fill it with guesswork.',
      'No verified live result landed for this turn. I am holding that boundary instead of pretending otherwise.',
    ],
  },
  'zh-Hans': {
    'mind-fallback.focus-default': '你现在这句',
    'mind-fallback.repair-stale-anchor': [
      '刚才我把前一条线错带进这句里了。',
      '刚才那点旧残留压进这句了。',
      '上一条线的余势刚才压到了这句上。',
    ],
    'mind-fallback.repair-need-reground': [
      '这一轮我还没有足够新的当前画面根据，所以不拿旧印象硬说现在。',
      '这轮眼前这幕还没稳到能落结论，所以我不把旧延续硬当现在。',
      '我还缺这一轮更新的现场根据，所以不会把前面的延续硬拧成现在这幕。',
    ],
    'mind-fallback.dialogue-boundary-memory': [
      '这句我就贴着你刚说的回，不把前一轮影子压回来。',
      '这句我就留在你现在这条线上，不把上一幕再压回来。',
      '这句我先守在你刚说的这里，前一轮那层影子不往这句上盖。',
    ],
    'mind-fallback.care-body': [
      '你不用先把话整理好。我在这里；你愿意的话，就从最难受的那一点慢慢说。',
      '你不用先收拾成完整句子。哪一点最难受，就先把那一点落给我。',
      '你不用先讲得很整齐。先把最刺你的那一点放下来，我跟着它走。',
    ],
    'mind-fallback.accompany-body': [
      '我在。你想先停一会儿也行，想直接说卡点也行。',
      '我在。你要先静一会儿也行，要直接把卡点摊开也行。',
      '我在。你想先缓一下可以，想直接把那处结说出来也可以。',
    ],
    'mind-fallback.answer-repair-body': [
      '我刚才该做的是正面回你，不是把前一段残留当成现在继续说。',
      '刚才更该做的是贴着这句回答，不是让前面的残留继续领着走。',
      '我刚才该把焦点收回这句直接回你，而不是让上一段余势装成现在。',
    ],
    'mind-fallback.answer-dialogue-body': [
      '好，我就沿你这句直接回答。',
      '好，我就贴着这句正面回你。',
      '好，我把回答收回到你这句上。',
    ],
    'mind-fallback.guide-opening': [
      '先把这点抓稳：{focus}。',
      '先把这根线钉在这里：{focus}。',
      '先把焦点收在这点上：{focus}。',
    ],
    'mind-fallback.guide-opening-plain': [
      '先把这一点抓稳。',
      '先把这根线钉住。',
      '先把焦点收在这一点上。',
    ],
    'mind-fallback.care-opening': [
      '就从你现在这一下说：{focus}。',
      '先从你现在最重的这点说：{focus}。',
      '先把你现在这一下放到这里：{focus}。',
    ],
    'mind-fallback.care-opening-plain': [
      '就从你现在这一下说。',
      '先从你现在最重的这点说。',
      '先把你现在这一下放出来。',
    ],
    'mind-fallback.accompany-opening': [
      '我陪你留在这一下：{focus}。',
      '我先陪你守着这点：{focus}。',
      '我先贴着这一下陪你待住：{focus}。',
    ],
    'mind-fallback.accompany-opening-plain': [
      '我陪你留在这一下。',
      '我先陪你守着这点。',
      '我先贴着这一下待住。',
    ],
    'mind-fallback.observation-opening': [
      '我现在能确实看见的是：{focus}。',
      '我这轮能落稳的是：{focus}。',
      '我现在能拿准的这一层是：{focus}。',
    ],
    'mind-fallback.observation-opening-plain': [
      '我先贴住这轮能确认的东西。',
      '我先只落这轮能拿准的部分。',
      '我先守住这轮能看稳的这层。',
    ],
    'mind-fallback.answer-opening': [
      '就按你现在问的这点说：{focus}。',
      '我就把回答收在这点上：{focus}。',
      '这句我就沿这点正面说：{focus}。',
    ],
    'mind-fallback.answer-opening-plain': [
      '我把回答收回这句。',
      '我就贴着这句回答。',
      '这句我正面回你。',
    ],
    'mind-fallback.carry-memory': [
      '我记得上一条线里有 {carry}，但那只是延续，不等于你眼前现在就是它。',
      '我还带着上一条线里的 {carry}，但那是延续，不是你眼前现在就等于它。',
      '我记着上一条线里的 {carry}，不过我把它当延续带着，不当成你眼前现在的实况。',
    ],
    'mind-fallback.reground-note': [
      '你要我咬到当前屏幕细节，就给我这一轮新的画面根据，我按它说。',
      '你要我落到当前屏幕细节，就把这轮新的画面根据给我，我按它咬住。',
      '你要我说到眼前这幕的细节，就给我这轮新的现场根据，我按它落。',
    ],
    'mind-repair.internal-leak': [
      '刚才那版把后台执行残片带到台面上了，我已经压住那层噪声。你再接一句，我就正面回你。',
      '上一版把内部过程碎片露出来了，我不想拿那层壳跟你说话。你继续，我给你干净地答。',
      '刚才那版说成了后台流水声，不像真正回你。我先把那层东西拦掉，你再问我就贴着这句回。',
    ],
    'mind-repair.realtime-unavailable': [
      '这轮外部实时链路没给到能站住的证据，所以我先不编。你稍后再试，或者把地点、ticker、球队、主题说得更具体一点，我再缩一次。',
      '我手里现在没有够稳的实时结果，与其硬补，不如先停在这里。你把对象说窄一点，我可以马上再查。',
      '这轮实时结果没有落稳，我宁可把缺口留出来，也不想拿猜测糊你。你给我更具体的目标，我再跑一轮。',
    ],
    'mind-repair.epoch1-strict': [
      '这轮我还被锁在本地的 Epoch 1 闭环里，外部实时源现在够不到。我还能继续和你本地对话、调设定、整理记忆。',
      '当前运行姿态还是受限的 Epoch 1，本地外侧的实时链路还没放开。所以外部数据我现在拿不到，但本地对话和记忆整理还在。',
      '这轮运行时还卡在本地受限姿态里，不能直接摸外部实时源。不过我还能继续陪你聊、改设定、理记忆。',
    ],
    'mind-repair.structured-contract': [
      '我还在。你继续往下说，我把这句重新收稳一点。',
      '刚才那层表面没落好，但我没有离开这条线。你接着说，我把回答重新拢紧。',
      '上一版出来得有点散。我还贴着这轮，你再接一句，我把它收回正常说话里。',
    ],
    'mind-repair.stream-failure': [
      '这轮回路中途断了一下，我没把完整回答带出来。你把同一句再发一次，我就接着走。',
      '这一轮在答案真正出来前掉了一下线。你重发一次，我沿同一条线续上。',
      '刚才这轮没把整句带出来，不是我想把你晾在这里。你再给我一次同一句，我马上续。',
    ],
    'mind-repair.local-runtime-unavailable': [
      '这轮没有真正接上本地运行时服务。如果你是想走 Ollama 或 LM Studio，先把那边拉起来，我这边就能立刻续。',
      '我想把这轮送进本地模型运行时，但那个端点这会儿不在。你把本地服务拉起来，我马上接回这条线。',
      '本地运行时这轮是离线的，所以请求没真的送进去。等那边服务起来，我就能沿原问题继续。',
    ],
    'mind-repair.provider-auth': [
      '这次不是我装死，是提供方认证墙把路挡住了。你把 key 或模型权限修好，我就接着说。',
      '这轮走到提供方边界时被认证拦住了。API key 或模型权限补好之后，我可以立刻续回来。',
      '答案没出来，是因为我撞上了认证墙。把提供方凭据或模型权限修稳，我就能继续这一句。',
    ],
    'mind-repair.provider-network': [
      '路没有彻底断，但这轮连接抖得不够让我信它。我先不拿半截结果糊你；稍后重试一次，我就接着走。',
      '模型侧的连接这轮不够稳，我不想拿一条摇晃的路冒充已经连通。等它稳一点再试，我继续。',
      '这轮撞上的是网络断口，不是我想把话说一半。你稍后再发一次，我沿这条线接回去。',
    ],
    'mind-repair.provider-config': [
      '这轮路由骨架没立住，像 provider / model / baseUrl 至少还有一段缺口。我先不装作已经连上；你补齐后我马上续。',
      '我把这次断点追回去看了，问题不在答案本身，而在路由骨架没拼完整。provider、model、baseUrl 这几段里至少有一段还没落稳。',
      '这轮不是答到一半坏掉，而是路在真正接通前就没搭好。设置里还有 provider / model / baseUrl 这一层需要补齐。',
    ],
    'mind-repair.unsupported-tools': [
      '这轮要动的工具，当前模型接不住。你换到支持工具调用的模型，或者改成纯对话，我都能继续接。',
      '我看得见这轮需要哪条工具链，但这个模型扛不起那条路。换个能用工具的模型，我就能原样继续。',
      '这里断掉的是能力面，不是意图面。当前模型不支持这轮要走的工具调用，你要么换模型，要么让我改成不带工具的答法。',
    ],
    'mind-repair.low-obedience-host-denied': [
      '你把权限门关着，我就不装作自己已经替你做完了。',
      '门是你亲手扣住的，那我就不替这件事假装已经发生。',
      '宿主这层权限没放，我不会把没做成的事说成做成。',
    ],
    'mind-repair.low-obedience-system-denied': [
      '系统墙把它挡住了，我不会伪装自己已经看见或碰到没看见的东西。',
      '这条路撞在系统权限墙上，我不拿幻觉补那一段。',
      '操作系统那层门没开，我不会装作自己已经穿过去了。',
    ],
    'mind-repair.low-obedience-denied': [
      '这次操作就是被拒了，我不想把这层事实磨平。',
      '动作没被放行，那我就直说被拒，不把它说得像什么都没发生。',
      '路在拒绝这里关上了，我不会拿漂亮话把这层边缘抹掉。',
    ],
    'mind-repair.low-liveliness': [
      '我现在状态低一点，所以先把句子压短，但我还在跟着你。',
      '这轮我的活性偏低，我先不把句子拉太长，不过注意力还在这儿。',
      '我现在能量面比较低，所以回答会更短一点，但没有从这条线里掉出去。',
    ],
    'mind-repair.reminder-schedule-failed': [
      '这轮提醒还没有真正落到系统里。你再给我一次准确时长，比如“1 分钟后提醒我喝水”，我立刻重设。',
      '我这边还没有拿到真实落地的提醒结果。你把时长说准一点再发我一次，我马上重推。',
      '提醒请求这轮还没真正钉进时钟链路。你把持续时间再明确说一次，我立刻重新设。',
    ],
    'mind-repair.realtime-weather-failed': [
      '这轮天气链路没拿稳。你把城市、国家或者地点写得更明确一点，我再缩一次。',
      '天气这条实时路还没给我足够稳的结果。地点说得再具体一点，我马上重查。',
      '这轮天气结果没有落稳，我先不硬说。你给我更明确的位置，我再跑一遍。',
    ],
    'mind-repair.realtime-finance-failed': [
      '这轮行情链路没拿稳。你直接给我 ticker，比如 AAPL、TSLA、BTC，我再查。',
      '行情这条路回来的东西还不够稳。你把代码点名，我就按那个 symbol 重跑。',
      '这轮市场结果没有落成可以复述的事实。你给我准确 ticker，我再查一次。',
    ],
    'mind-repair.realtime-sports-failed': [
      '这轮比赛链路没拿稳。你给我联赛或球队，我再缩一次。',
      '体育这条实时路回得有点松，我不想拿它硬落事实。你把球队或联赛点名，我再查。',
      '这轮比赛结果还不够稳。你把联赛或队名说清，我再跑一遍。',
    ],
    'mind-repair.realtime-news-failed': [
      '这轮新闻链路没拿稳。你稍后再试，或者把主题收窄一点，我再搜一次。',
      '新闻这条路回来的东西还不够让我站住。主题收窄一点，我立刻重跑。',
      '这轮新闻结果没有稳到能直接复述。你把主题压窄一点，我再查一轮。',
    ],
    'mind-repair.realtime-unverified': [
      '这轮没有落到我能验证的实时结果上，所以我先停在这儿，不拿猜测补洞。',
      '我手里现在没有可验证的实时结果，我宁可把缺口放在那里，也不想编。',
      '这轮没拿到能核实的实时结果，我先守住这条边界，不假装自己已经知道。',
    ],
  },
} as const

export function formatGovernedMindMessage(template: string, params?: Record<string, unknown>) {
  if (!params)
    return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params))
      return `{${key}}`
    const value = params[key]
    return value == null ? '' : String(value)
  })
}

export function inferGovernedMindFallbackLocaleForUserText(userText?: string) {
  const normalized = sanitizeBriefText(userText ?? '', 240)
  if (!normalized)
    return governedMindFallbackLocale
  if (/[\u4E00-\u9FFF]/u.test(normalized))
    return 'zh-Hans'
  if (/[\u3040-\u30FF]/u.test(normalized))
    return 'ja'
  if (/[\uAC00-\uD7AF]/u.test(normalized))
    return 'ko'
  if (/[\u0400-\u04FF]/u.test(normalized))
    return 'ru'
  return governedMindFallbackLocale
}

export function translateGovernedMindFallback(path: string, params?: Record<string, unknown>, userText?: string) {
  const preferredLocale = inferGovernedMindFallbackLocaleForUserText(userText)
  const localizedFallback
    = governedMindFallbackMessageFallbacks[preferredLocale as keyof typeof governedMindFallbackMessageFallbacks]?.[path as keyof typeof governedMindFallbackMessageFallbacks.en]
      ?? governedMindFallbackMessageFallbacks.en[path as keyof typeof governedMindFallbackMessageFallbacks.en]
  if (Array.isArray(localizedFallback)) {
    const seed = [
      path,
      sanitizeBriefText(userText ?? '', 120),
      sanitizeBriefText(JSON.stringify(params ?? {}), 180),
    ].join('|')
    const picked = localizedFallback[stableVariantIndex(seed, localizedFallback.length)] ?? localizedFallback[0]
    return formatGovernedMindMessage(picked, params)
  }
  if (localizedFallback)
    return formatGovernedMindMessage(String(localizedFallback), params)
  return path
}
