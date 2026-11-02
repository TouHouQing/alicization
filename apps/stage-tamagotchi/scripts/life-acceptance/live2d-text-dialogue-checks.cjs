/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify rendered dialogue, excluding hidden content. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function observeDialogueOrder(chat) {
  return chat.locator('[data-chat-message-role]').evaluateAll((nodes) => {
    const rows = nodes.map((node, index) => ({ index, role: node.dataset.chatMessageRole, id: node.dataset.chatMessageId ?? '' }))
    return rows.filter(row => row.role === 'user' && row.id.startsWith('chat:') && row.id.endsWith(':user')).map((prompt) => {
      const id = prompt.id.slice(0, -5)
      const replies = rows.filter(row => row.role === 'assistant' && row.id === id)
      return { id, promptIndex: prompt.index, replyIndexes: replies.map(row => row.index), promptCount: rows.filter(row => row.role === 'user' && row.id === prompt.id).length }
    })
  })
}

// All dialogue is sent through the actual chat UI. This helper only observes
// the resulting final Live2D draw frames; it never injects performance cues.
async function runLive2DTextDialogueChecks({ stage, chat, report, capture, check, redact }) {
  report.textDialogueTurns = []
  await chat.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const qa = window.__textCursorDomQa = { records: [], dispatch: [], longTasks: [] }
    const post = BroadcastChannel.prototype.postMessage
    qa.restorePost = () => {
      BroadcastChannel.prototype.postMessage = post
    }
    BroadcastChannel.prototype.postMessage = function (value) {
      const at = Date.now()
      const result = post.call(this, value)
      if (this.name === 'airi-chat-stream' && value?.type === 'text-presented' && qa.dispatch.length < 3000)
        qa.dispatch.push({ wallAt: at, returnedAt: Date.now(), sessionId: value.context?.sessionId ?? value.sessionId, messageId: value.context?.message?.id, offset: value.presentation?.offset, glyph: value.presentation?.grapheme, presentedAt: value.presentation?.presentedAt })
      return result
    }
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      qa.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (qa.longTasks.length < 1000)
            qa.longTasks.push({ wallAt: performance.timeOrigin + entry.startTime, durationMs: entry.duration })
        }
      })
      qa.longTaskObserver.observe({ type: 'longtask', buffered: true })
    }
    qa.observer = new MutationObserver(() => {
      const stream = pinia._s.get('chat-stream')?.streamingMessage
      if (!stream?.id || qa.records.length >= 3000)
        return
      const id = stream.id.replace(/:gw\d+(?=:user$|$)/u, '')
      const bubbles = [...document.querySelectorAll('[data-chat-message-role="assistant"]')].filter(node => node.dataset.chatMessageId === id)
      const rows = [...document.querySelectorAll('[data-chat-message-role]')]
      const prompts = rows.filter(node => node.dataset.chatMessageRole === 'user' && node.dataset.chatMessageId === `${id}:user`)
      const promptIndex = prompts.length === 1 ? rows.indexOf(prompts[0]) : -1
      const replyIndex = bubbles.length === 1 ? rows.indexOf(bubbles[0]) : -1
      const rendered = bubbles.map(node => node.innerText).join('\n')
      const previous = qa.records.at(-1)
      if (previous?.content !== stream.content || previous?.rendered !== rendered || previous?.bubbles !== bubbles.length || previous?.promptIndex !== promptIndex || previous?.replyIndex !== replyIndex)
        qa.records.push({ at: performance.now(), wallAt: Date.now(), id, content: stream.content, rendered, bubbles: bubbles.length, promptIndex, replyIndex })
    })
    qa.observer.observe(document.body, { childList: true, characterData: true, subtree: true })
  })
  const scenarios = [
    ['text-phoneme-alignment', '请只原样回复这些字，不加其它内容：啊衣乌哦啊衣乌哦啊衣乌哦啊衣乌哦啊衣乌哦啊衣乌哦妈爸怕。'],
    ['text-shared-joy', '今天画稿终于完成了，还得到了朋友的夸奖，我很开心，想和你分享一下。请用三句话陪我聊聊。'],
    ['text-quiet-comfort', '我现在有点低落，担心下次画不好。请安静地陪着我，轻轻鼓励一句就好。'],
    ['text-explicit-nod', '你能轻轻点一下头回应我吗？一句简短的话就好，不需要连续点头。'],
    ['text-long-reply', '请用六个短句描述一个安静的雨天画画的下午，不用分点，像平常聊天一样。'],
    ['text-natural-pacing', '请只原样回复，不添加其他内容：今天画画很开心，明天一起继续吧。'],
    ['text-queued-clock', '请只原样回复，不添加其他内容：今天窗外的雨声很轻，我们慢慢说话，一起看着安静的天空。'],
    ...(process.env.LIFE_PRODUCT_TRUE_STREAM_ASSERTIONS === '1' ? [['text-live-generation', `请用约一百五十个字描写安静雨天窗边的光线、画纸和雨声。只写景色，不列点，不写完成任务或记住事情的承诺。本轮场景编号为 ${Date.now().toString(36)}，编号不要复述。`]] : []),
    ['text-interrupted', '请写一篇八百字的雨天绘画散文，细致描述窗边的光、纸张、颜料和雨声。', true],
    ['text-after-interruption', '刚才那篇先停下吧。现在只轻轻点一次头，说一句“我在这里”就好。'],
  ]
  const diagnosticLimit = process.env.LIFE_PRODUCT_FAST_EXPRESSION === '1' && process.env.LIFE_PRODUCT_TEXT_DIAGNOSTIC_ONE_TURN === '1'
  const diagnosticCancel = process.env.LIFE_PRODUCT_FAST_EXPRESSION === '1' && process.env.LIFE_PRODUCT_TEXT_DIAGNOSTIC_CANCEL === '1'
  const pacingFocus = process.env.LIFE_PRODUCT_FAST_EXPRESSION === '1' && process.env.LIFE_PRODUCT_TEXT_PACING === '1'
  const selectedScenarios = pacingFocus ? scenarios.filter(([label]) => ['text-phoneme-alignment', 'text-natural-pacing', 'text-live-generation', 'text-interrupted', 'text-after-interruption'].includes(label)) : diagnosticLimit ? scenarios.slice(0, 1) : diagnosticCancel ? scenarios.slice(-2) : scenarios
  for (const [label, prompt, interrupted] of selectedScenarios) {
    await stage.evaluate((label) => {
      const qa = window.__live2dExpressionObservation
      qa.phase = label
      qa.phaseTimes[label] = performance.now()
    }, label)
    await chat.locator('textarea').fill(prompt)
    await chat.getByRole('button', { name: '发送消息', exact: true }).click()
    if (label === 'text-queued-clock') {
      await stage.waitForFunction(label => window.__live2dExpressionObservation.chatEvents.some(event => event.phase === label && event.type === 'text-presented'), label, { timeout: 180000 })
      // Fault injection stays inside this job's offscreen, nonfocusable stage.
      // It delays real BroadcastChannel packets without manufacturing a cue.
      report.ownedStageClockStall = await stage.evaluate(() => {
        const beganAt = Date.now()
        while (Date.now() - beganAt < 700) { /* Retain the real queued transport. */ }
        return { beganAt, endedAt: Date.now(), scope: 'owned-offscreen-stage-renderer-only' }
      })
    }
    if (label === 'text-phoneme-alignment') {
      await stage.waitForFunction(label => window.__live2dExpressionObservation.chatEvents.some(event => event.phase === label && event.type === 'text-presented'), label, { timeout: 180000 })
      report.textMouthVisualFrames = []
      for (let index = 0; index < 6; index++) {
        await capture(stage, `text-mouth-stream-${index}`)
        report.textMouthVisualFrames.push(await stage.evaluate(() => window.__live2dExpressionObservation.frames.at(-1)))
      }
    }
    if (interrupted) {
      await stage.waitForFunction(label => window.__live2dExpressionObservation.chatEvents.filter(event => event.phase === label && event.type === 'text-presented').length >= 5, label, { timeout: 180000 })
      await chat.getByRole('button', { name: '中断回复', exact: true }).click({ timeout: 30000 })
    }
    await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 180000 })
    if (interrupted) {
      await stage.waitForFunction(() => window.__live2dExpressionObservation.frames.at(-1)?.textArticulation === null, null, { timeout: 2000 })
      const before = await stage.evaluate(label => window.__live2dExpressionObservation.chatEvents.filter(event => event.phase === label && event.type === 'text-presented').length, label)
      await wait(400)
      const after = await stage.evaluate(label => window.__live2dExpressionObservation.chatEvents.filter(event => event.phase === label && event.type === 'text-presented').length, label)
      check('Interrupting visible text closes mouth input and drops the old cursor tail', before >= 5 && after === before, { before, after })
      const stopped = chat.locator('[data-chat-delivery-status="interrupted"]').last()
      await stopped.waitFor({ state: 'visible', timeout: 5000 })
      report.interruptedReply = await stopped.evaluate((node) => {
        const bubble = node.closest('[data-chat-message-role="assistant"]')
        return { id: bubble.dataset.chatMessageId, rendered: bubble.innerText }
      })
      check('Interrupted text remains in one bubble with an explicit status', report.interruptedReply.id && report.interruptedReply.rendered.includes('回复已停止'), report.interruptedReply)
    }
    report.textDialogueTurns.push({ label, prompt, interrupted: Boolean(interrupted), text: redact(await chat.locator('body').innerText()) })
    const order = await observeDialogueOrder(chat)
    report.chatCausalOrderSnapshots ??= []
    report.chatCausalOrderSnapshots.push({ label, pairs: order })
    check('Each actual settled dialogue keeps one prompt before its own reply', order.length >= report.textDialogueTurns.length && order.every(pair => pair.promptCount === 1 && pair.replyIndexes.length === 1 && pair.replyIndexes[0] > pair.promptIndex), { label, pairs: order })
    await capture(stage, label)
    // Include the whole post-turn lifecycle: no audio queue should keep a text
    // reply "speaking", and repeated actions must not continue after delivery.
    await wait(18000)
    // A context-owned presence pulse may start near the sampling boundary.
    // Observe its bounded recovery without treating that independent event as
    // a stuck chat turn or discarding its frames from the evidence.
    await stage.waitForFunction(() => {
      const frame = window.__live2dExpressionObservation.frames.at(-1)
      return frame?.performancePhase === 'idle' && frame.speech.active === false && frame.nativeMotionPriority === 0
    }, null, { timeout: 6000 })
    await capture(stage, `${label}-settled`)
  }
  report.textSourceTransport = await chat.evaluate(() => {
    const qa = window.__textCursorDomQa
    qa.restorePost()
    qa.longTaskObserver?.disconnect()
    return { dispatch: qa.dispatch, longTasks: qa.longTasks, source: 'observed-native-BroadcastChannel-post-and-longtask' }
  })
  report.textStreamDomObservations = await chat.evaluate(() => {
    window.__textCursorDomQa.observer.disconnect()
    return window.__textCursorDomQa.records
  })
  if (report.textDialogueTurns.some(turn => turn.label === 'text-phoneme-alignment'))
    check('Chat DOM displays the first glyph without exposing the unpresented reply tail', report.textStreamDomObservations.some(record => record.content === '啊' && record.rendered.includes('啊') && !record.rendered.includes('啊衣')), { records: report.textStreamDomObservations.length })
  report.textDialogueObservation = await stage.evaluate(() => {
    const qa = window.__live2dExpressionObservation
    return { stageLongTasks: qa.stageLongTasks, frames: qa.frames, semanticEvents: qa.semanticEvents, textInputs: qa.textInputs, phaseTimes: qa.phaseTimes, motions: qa.motions, motionRequests: qa.motionRequests, motionSelections: qa.motionSelections, audioEvents: qa.audioEvents, chatEvents: qa.chatEvents, selectionChanges: qa.selectionChanges }
  })
  const { frames, motions, audioEvents, chatEvents } = report.textDialogueObservation
  const deliveries = report.textDialogueObservation.textInputs
  const expired = deliveries.filter(input => input.receivedAt >= input.presentation.presentedAt + input.presentation.durationMs)
  check('Every real mouth delivery retains its source UI commit clock', deliveries.length > 20 && deliveries.every(input => Number.isSafeInteger(input.presentation.presentedAt) && (!input.frame || (input.frame.startedAt === input.presentation.presentedAt && input.frame.offset === input.presentation.offset))), { deliveries: deliveries.length })
  if (selectedScenarios.some(([label]) => label === 'text-queued-clock'))
    check('A real bounded renderer stall discards expired queued mouth units', report.ownedStageClockStall?.endedAt - report.ownedStageClockStall?.beganAt >= 700 && expired.some(input => input.phase === 'text-queued-clock') && expired.every(input => input.frame === null), { expired: expired.length, stalledExpired: expired.filter(input => input.phase === 'text-queued-clock').length })
  if (process.env.LIFE_PRODUCT_TRUE_STREAM_ASSERTIONS === '1') {
    const lines = (await fs.readFile(path.join(report.profile, 'alicizations/runtime-debug.log'), 'utf8')).trim().split('\n').map(line => JSON.parse(line))
    report.liveStreamTiming = []
    for (const label of ['text-phoneme-alignment', 'text-natural-pacing', 'text-live-generation']) {
      const input = report.textDialogueObservation.textInputs.find(input => input.phase === label && input.presentation.offset === 0)
      const event = chatEvents.find(event => event.phase === label && event.type === 'text-presented' && event.presentation.offset === 0)
      if (!event)
        continue
      const turnId = `chat:${event.sessionId}:${event.messageId}`.replace(/:gw\d+$/u, '')
      const source = lines.find(line => line.event === 'chat-provider-request.first-public-body' && line.turnId.replace(/:gw\d+$/u, '') === turnId)
      const finish = source && lines.find(line => line.event === 'chat-provider-request.output-finished' && line.turnId.replace(/:gw\d+$/u, '') === turnId && line.requestHash === source.requestHash && line.providerAttempt === source.providerAttempt)
      const dom = report.textStreamDomObservations.find(record => record.id === turnId && record.content && record.rendered.includes(record.content))
      const timing = { label, firstBodyAt: source?.observedAt, providerFinishedAt: finish?.observedAt, firstMouthInputAt: input?.wallAt, firstVisibleDomAt: dom?.wallAt, providerWindowMs: source && finish ? finish.observedAt - source.observedAt : null, beforeProviderFinish: Boolean(finish && dom && input && dom.wallAt < finish.observedAt && input.wallAt < finish.observedAt) }
      report.liveStreamTiming.push(timing)
      check(`Real Live2D text and mouth promptly consume admitted body for ${label}`, source && finish && dom && input && dom.wallAt - source.observedAt >= 0 && dom.wallAt - source.observedAt < 150 && input.wallAt - source.observedAt >= 0 && input.wallAt - source.observedAt < 150, timing)
      if (label === 'text-live-generation')
        check('A fresh sustained provider response reaches actual text and mouth before generation ends', timing.beforeProviderFinish && timing.providerWindowMs >= 150, timing)
    }
    check('Short and sustained real responses exercise public stream delivery', report.liveStreamTiming.length === 3)
  }
  check('Each active logical reply occupies one DOM bubble throughout presentation', report.textStreamDomObservations.length > 5 && report.textStreamDomObservations.every(record => record.bubbles <= 1), { records: report.textStreamDomObservations.length, duplicates: report.textStreamDomObservations.filter(record => record.bubbles > 1) })
  const visibleCursorRows = report.textStreamDomObservations.filter(record => record.bubbles === 1 && record.content.trim())
  check('The actual live cursor stays after its matching prompt throughout stream and replay handover', visibleCursorRows.length > 5 && visibleCursorRows.every(record => record.promptIndex >= 0 && record.replyIndex > record.promptIndex), { records: visibleCursorRows.length, violations: visibleCursorRows.filter(record => record.promptIndex < 0 || record.replyIndex <= record.promptIndex) })
  if (pacingFocus) {
    const pacing = chatEvents.filter(event => event.phase === 'text-natural-pacing' && event.type === 'text-presented')
    const intervals = pacing.slice(0, -1).map((event, i) => ({ script: event.presentation.script, glyph: event.presentation.grapheme, plannedMs: event.presentation.durationMs, actualMs: pacing[i + 1].wallAt - event.wallAt }))
    report.textPacingObservation = intervals
    const syllables = intervals.filter(interval => interval.script === 'pinyin')
    const rate = syllables.length / (syllables.reduce((sum, interval) => sum + interval.actualMs, 0) / 1000)
    check('Actual displayed Chinese speech progresses at a conversational four syllables per second', syllables.length >= 10 && rate >= 3 && rate <= 4.6 && syllables.every(interval => interval.actualMs >= 205), { rate, intervals })
    check('Actual displayed comma gets a silent breath gap', intervals.some(interval => interval.glyph === '，' && interval.actualMs >= 240), intervals)
    const reply = pacing.map(event => event.presentation.grapheme).join('')
    const dom = report.textStreamDomObservations.filter(record => record.id.endsWith(pacing[0]?.messageId?.replace(/:gw\d+$/u, '') ?? '-missing-'))
    check('Durable replay never exposes the complete reply ahead of its cursor', reply.length > 10 && dom.length > 5 && dom.every(record => record.content === reply || !record.rendered.includes(reply)), { reply, records: dom.length })
  }
  check('Text-only dialogue keeps the real speech provider disabled', frames.length > 0 && frames.every(frame => frame.actualAudio === null && !frame.speech.audioBound) && !audioEvents.some(event => event.kind === 'source-start'))
  check('Text-only dialogue completed through the real chat stream', chatEvents.filter(event => event.type === 'assistant-end').length >= report.textDialogueTurns.filter(turn => !turn.interrupted).length, chatEvents.map(event => event.type))
  report.textDialogueSummary = report.textDialogueTurns.map(({ label }) => {
    const samples = frames.filter(frame => frame.phase === label)
    const pulses = samples.filter((frame, i) => frame.actionRevision && frame.actionRevision !== samples[i - 1]?.actionRevision && frame.actionIssuedAt >= report.textDialogueObservation.phaseTimes[label]).map(frame => ({ revision: frame.actionRevision, cue: frame.actionCue, reason: frame.actionReason, segment: frame.actionSegment, at: frame.at }))
    const last = samples.at(-1)
    return { label, frames: samples.length, pulses, motions: motions.filter(motion => motion.phase === label), maxMouthOpen: Math.max(0, ...samples.map(frame => frame.values.ParamMouthOpenY ?? 0)), last: last && { phase: last.performancePhase, speechActive: last.speech.active, nativePriority: last.nativeMotionPriority, facialCue: last.facialCue, expressionIntensity: last.expressionIntensity } }
  })
  assert.ok(report.textDialogueSummary.every(turn => turn.frames > 5), 'Every text turn must have actual compiled Live2D draw frames')
  {
    const quietDraws = frames.filter(frame => frame.nativeMotionPriority <= 1)
    check('Text articulation never manufactures acoustic speech or energy', frames.every(frame => frame.speech.active === false && frame.speech.energy === 0) && quietDraws.length > 20, { quietFrames: quietDraws.length })
    const textDraws = frames.filter(frame => frame.textArticulation && frame.wallAt >= frame.textArticulation.startedAt && frame.wallAt < frame.textArticulation.startedAt + frame.textArticulation.durationMs)
    const semanticEvents = report.textDialogueObservation.semanticEvents
    report.textFacialOwnership = report.textDialogueTurns.filter(turn => !turn.interrupted).map(({ label }) => {
      const firstGlyph = chatEvents.find(event => event.phase === label && event.type === 'text-presented' && event.presentation.offset === 0)
      const header = firstGlyph && semanticEvents.findLast(event => event.turnId === `chat:${firstGlyph.sessionId}:${firstGlyph.messageId}` && event.wallAt <= firstGlyph.wallAt)
      check(`Accepted expression is available before the first visible glyph for ${label}`, Boolean(header), { firstGlyphAt: firstGlyph?.wallAt, expressionAt: header?.wallAt })
      const comparisons = textDraws.filter(frame => frame.phase === label).flatMap((frame) => {
        const expected = semanticEvents.findLast(event => event.turnId === frame.textArticulation.turnId && event.wallAt <= frame.wallAt)
        // Allow one Vue/draw handover; sustained resident overwrites remain failures.
        if (!expected || frame.wallAt - expected.wallAt < 150)
          return []
        return [{ at: frame.wallAt, expectedEmotion: expected.performance.baseEmotion, actualEmotion: frame.emotion, expectedFace: expected.performance.facialCue ?? null, actualFace: frame.facialCue }]
      })
      const violations = comparisons.filter(row => row.actualEmotion !== row.expectedEmotion || (row.expectedFace && row.actualFace !== row.expectedFace))
      check(`Visible text retains its accepted emotion and face throughout ${label}`, comparisons.length >= 2 && violations.length === 0, { frames: comparisons.length, violations: violations.slice(0, 20) })
      return { label, frames: comparisons.length, violations }
    })
    check('Actual text-only Live2D draws receive the visible grapheme clock', textDraws.length >= 10 && textDraws.every(frame => typeof frame.visibleText === 'string' && frame.visibleText.slice(frame.textArticulation.offset, frame.textArticulation.offset + frame.textArticulation.grapheme.length) === frame.textArticulation.grapheme), { frames: textDraws.length })
    const phonemeDraws = textDraws.filter(frame => frame.phase === 'text-phoneme-alignment')
    for (const [phoneme, predicate] of (report.textDialogueTurns.some(turn => turn.label === 'text-phoneme-alignment')
      ? [
          ['a', frame => frame.values.ParamMouthOpenY > 0.5],
          ['yi', frame => frame.values.ParamMouthForm > 0.5 && frame.values.ParamMouthOpenY < 0.4],
          ['wu', frame => frame.values.ParamMouthForm < -0.5 && frame.values.ParamMouthOpenY < 0.4],
        ]
      : [])) {
      const samples = phonemeDraws.filter(frame => frame.textArticulation.phoneme === phoneme && frame.wallAt - frame.textArticulation.startedAt < frame.textArticulation.durationMs * 0.8)
      check(`Compiled mouth matches the displayed Chinese phoneme ${phoneme}`, samples.some(predicate), { frames: samples.length, values: samples.map(frame => ({ open: frame.values.ParamMouthOpenY, form: frame.values.ParamMouthForm })) })
    }
    const firstCharacters = report.textDialogueObservation.textInputs.filter(input => input.presentation.offset === 0)
    check('First displayed characters already own committed mouth input', firstCharacters.length > 0 && firstCharacters.every(input => input.frame?.offset === 0 && input.frame.grapheme === input.presentation.grapheme && input.visibleText === input.presentation.grapheme), { inputs: firstCharacters.length, glyphs: firstCharacters.map(input => input.presentation.grapheme), scope: 'First-character committed body input; final-draw shape checks are separate from input and display timing.' })
    const revealed = chatEvents.filter(event => event.type === 'text-presented')
    check('UI receives incremental text events with strictly advancing cursors', revealed.length > 10 && revealed.every((event, index) => index === 0 || event.messageId !== revealed[index - 1].messageId || event.presentation.offset > revealed[index - 1].presentation.offset), { events: revealed.length })
    const unauthorizedMotions = report.textDialogueObservation.motionRequests.filter(request => !request.stack.includes('applyActionPulseRevision'))
    check('Text dialogue native motions have one semantic command owner', unauthorizedMotions.length === 0, unauthorizedMotions.map(({ group, index, priority }) => ({ group, index, priority })))
    check('A text turn does not play a burst of clause gestures', report.textDialogueSummary.every((turn) => {
      const dialoguePulses = turn.pulses.filter(pulse => pulse.reason !== 'presence-pulse')
      return dialoguePulses.length <= 1
    }), report.textDialogueSummary.map(({ label, pulses }) => ({ label, pulses })))
    if (process.env.LIFE_PRODUCT_TEXT_GESTURE_ASSERTIONS === '1') {
      for (const label of ['text-explicit-nod', 'text-after-interruption']) {
        if (!report.textDialogueTurns.some(turn => turn.label === label))
          continue
        const requestedRevisions = new Set(report.textDialogueSummary.find(turn => turn.label === label)?.pulses.filter(pulse => pulse.reason === 'dialogue').map(pulse => pulse.revision))
        const nods = frames.filter(frame => frame.phase === label && /nod/u.test(frame.diagnostics?.proceduralGesture?.cue ?? '') && requestedRevisions.has(frame.diagnostics.proceduralGesture.revision))
        check(`The requested nod reaches the actual compiled body for ${label}`, nods.length >= 2 && nods.some(frame => frame.diagnostics.proceduralGesture.offset < -0.2) && new Set(nods.map(frame => frame.diagnostics.proceduralGesture.revision)).size === 1, { frames: nods.length, gestures: [...new Set(nods.map(frame => frame.diagnostics.proceduralGesture.cue))], minOffset: Math.min(0, ...nods.map(frame => frame.diagnostics.proceduralGesture.offset)), angleYRange: nods.length ? Math.max(...nods.map(frame => frame.values.ParamAngleY)) - Math.min(...nods.map(frame => frame.values.ParamAngleY)) : 0 })
      }
    }
    check('Every text dialogue settles without queued speech or full asset loops', report.textDialogueSummary.every(turn => turn.last?.speechActive === false && turn.last?.nativePriority === 0 && turn.last?.phase === 'idle'), report.textDialogueSummary.map(({ label, last }) => ({ label, last })))
    const restingParts = report.expressionObservation.restingBodyParts
    check('One-shot dialogue gestures return the actual arm parts to their resting pose', Object.keys(restingParts).length > 0 && report.textDialogueSummary.every((turn) => {
      const last = frames.filter(frame => frame.phase === turn.label).at(-1)
      return Object.entries(restingParts).every(([id, opacity]) => Math.abs(last.bodyParts[id] - opacity) < 0.05)
    }), report.textDialogueSummary.map(turn => ({ label: turn.label, parts: frames.filter(frame => frame.phase === turn.label).at(-1)?.bodyParts })))
  }
  if (process.env.LIFE_PRODUCT_TRUE_STREAM_ASSERTIONS === '1' && report.interruptedReply) {
    await chat.reload()
    await chat.locator('textarea').waitFor({ state: 'visible', timeout: 30000 })
    const stopped = chat.locator('[data-chat-message-role="assistant"]').filter({ has: chat.locator('[data-chat-delivery-status="interrupted"]') })
    await stopped.last().waitFor({ state: 'visible', timeout: 30000 })
    const restored = await stopped.last().evaluate(node => ({ id: node.dataset.chatMessageId, rendered: node.innerText }))
    check('Reload preserves the interrupted prefix and does not reveal a hidden suffix', restored.id === report.interruptedReply.id && restored.rendered === report.interruptedReply.rendered, restored)
    const order = await observeDialogueOrder(chat)
    report.chatCausalOrderSnapshots.push({ label: 'after-real-history-reload', pairs: order })
    check('Real history reload preserves each prompt before its single corresponding reply', order.length >= report.textDialogueTurns.length && order.every(pair => pair.promptCount === 1 && pair.replyIndexes.length === 1 && pair.replyIndexes[0] > pair.promptIndex), order)
  }
}

module.exports = { runLive2DTextDialogueChecks }
