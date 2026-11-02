const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function readRequestedNodEvidence(evidence) {
  const requested = evidence.frames.filter(frame => frame.actionIssuedAt >= evidence.sentAt && frame.actionReason === 'dialogue' && frame.actionRevision === frame.diagnostics?.proceduralGesture?.revision && /nod/u.test(frame.diagnostics.proceduralGesture.cue))
  const revisions = [...new Set(requested.map(frame => frame.actionRevision))]
  const minOffset = Math.min(0, ...requested.map(frame => frame.diagnostics.proceduralGesture.offset))
  return { passed: requested.length >= 2 && minOffset < -0.2 && revisions.length === 1, frames: requested.length, revisions, minOffset }
}

async function recordPlaybackClip(stage, root, label) {
  const directory = path.join(root, label)
  await fs.mkdir(directory, { recursive: true })
  const frames = []
  for (let index = 0; index < 10; index++) {
    const state = await stage.evaluate(() => {
      const frame = window.__live2dExpressionObservation.frames.at(-1)
      return { at: performance.now(), audio: frame?.actualAudio, speech: frame?.speech, cue: frame?.facialCue, action: frame?.actionCue }
    })
    const file = path.join(directory, `${String(index).padStart(2, '0')}.jpg`)
    await stage.screenshot({ path: file, type: 'jpeg', quality: 65 })
    frames.push({ ...state, file })
    await wait(100)
  }
  return { scope: 'Timed screenshots of actual private-desktop runtime pixels, without renderer injection.', frames }
}

async function runLive2DDialogueCoherenceChecks({ stage, chat, report, capture, check, redact, root }) {
  const phase = label => stage.evaluate((label) => {
    const qa = window.__live2dExpressionObservation
    qa.phase = label
    qa.phaseTimes[label] = performance.now()
  }, label)
  await phase('voice-before-interruption')
  await chat.locator('textarea').fill('请像平常聊天一样，用六个短句描述窗边画画的一个下午，每句十几个字就好。')
  await chat.getByRole('button', { name: '发送消息', exact: true }).click()
  await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 180000 })
  await stage.waitForFunction(() => {
    const frame = window.__live2dExpressionObservation.frames.at(-1)
    return frame?.speech.active && frame.actualAudio?.rms > 0.005
  }, null, { timeout: 60000 })
  const previous = await stage.evaluate(() => window.__live2dExpressionObservation.frames.at(-1))
  await capture(stage, 'voice-actually-playing-before-interruption')
  report.dialogueCoherenceClips = [await recordPlaybackClip(stage, root, 'voice-before-interruption-clip')]
  // Re-sample after recording so interruption starts during real playback.
  await stage.waitForFunction(() => window.__live2dExpressionObservation.frames.at(-1)?.actualAudio?.rms > 0.005, null, { timeout: 30000 })
  previous.actualAudio = await stage.evaluate(() => window.__live2dExpressionObservation.frames.at(-1).actualAudio)
  await phase('voice-interrupted-by-new-turn')
  await chat.locator('textarea').fill('先停下刚才的话。我在这里，你轻轻点一次头，只回复“嗯，我在”。')
  const sentAt = await stage.evaluate(() => performance.now())
  await chat.getByRole('button', { name: '发送消息', exact: true }).click()
  await stage.waitForFunction(oldId => window.__live2dExpressionObservation.audioSources.some(source => source.id === oldId && source.ended), previous.actualAudio.id, { timeout: 5000 })
  const stoppedAt = await stage.evaluate(() => performance.now())
  check('A new UI turn interrupts audio that was actually playing', stoppedAt - sentAt < 2000, { elapsedMs: stoppedAt - sentAt, previousAudioId: previous.actualAudio.id })
  await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 180000 })
  await stage.waitForFunction(() => {
    const qa = window.__live2dExpressionObservation
    return qa.frames.some(frame => frame.phase === 'voice-interrupted-by-new-turn' && frame.actualAudio && frame.speech.active)
  }, null, { timeout: 60000 })
  await capture(stage, 'voice-next-turn-playing')
  report.dialogueCoherenceClips.push(await recordPlaybackClip(stage, root, 'voice-next-turn-clip'))
  await wait(18000)
  report.dialogueCoherence = await stage.evaluate(({ sentAt, previousId }) => {
    const qa = window.__live2dExpressionObservation
    const frames = qa.frames.filter(frame => frame.phase === 'voice-interrupted-by-new-turn')
    return { scope: 'Actual configured LLM, UI sends and real muted SAPI audio; no renderer inputs injected.', sentAt, previousId, frames, audioEvents: qa.audioEvents, last: frames.at(-1) }
  }, { sentAt, previousId: previous.actualAudio.id })
  report.dialogueCoherence.text = redact(await chat.locator('body').textContent())
  const evidence = report.dialogueCoherence
  const requested = readRequestedNodEvidence(evidence)
  check('The next spoken acknowledgment performs the requested finite nod', requested.passed, requested)
  check('Old audio cannot resume or drive the next turn mouth after interruption', evidence.frames.filter(frame => frame.at > sentAt + 1000).every(frame => frame.actualAudio?.id !== previous.actualAudio.id))
  check('The interrupted conversation returns to a quiet mouth and a settled body', evidence.last?.speech.active === false && evidence.last?.actualAudio === null && evidence.last?.nativeMotionPriority === 0 && evidence.last?.performancePhase === 'idle' && evidence.last?.values.ParamMouthOpenY < 0.08, evidence.last)
  assert.ok(evidence.frames.length > 20, 'Dialogue interruption must include final draw evidence')
  const allFrames = await stage.evaluate(() => window.__live2dExpressionObservation.frames)
  const revisions = new Set()
  const slots = new Set()
  const utterances = new Map()
  const repeated = []
  for (const frame of allFrames) {
    if (!frame.actionCue || !frame.actionSegment || revisions.has(frame.actionRevision) || frame.actionReason === 'presence-pulse')
      continue
    revisions.add(frame.actionRevision)
    const boundary = frame.actionSegment.indexOf('|||')
    const ordinal = boundary >= 0 ? /:(\d+)$/u.exec(frame.actionSegment)?.[1] : undefined
    const segment = ordinal === undefined ? frame.actionSegment : `${frame.actionSegment.slice(0, boundary).replace(/:gw\d+$/u, '')}|||${ordinal}`
    if (ordinal !== undefined) {
      const utterance = frame.actionSegment.slice(0, boundary).replace(/:gw\d+$/u, '')
      const actions = utterances.get(utterance) ?? []
      actions.push({ revision: frame.actionRevision, reason: frame.actionReason, cue: frame.actionCue })
      utterances.set(utterance, actions)
    }
    const key = JSON.stringify([segment, frame.actionCue])
    if (slots.has(key))
      repeated.push({ revision: frame.actionRevision, reason: frame.actionReason, cue: frame.actionCue, segment })
    slots.add(key)
  }
  check('Speech preview, playback and cadence do not repeat an action for one semantic segment', repeated.length === 0, repeated)
  check('Sentence boundaries do not turn a spoken reply into a sequence of primary gestures', [...utterances.values()].every(actions => actions.length <= 1), [...utterances.values()])
  await capture(stage, 'voice-interruption-settled')
}

module.exports = { readRequestedNodEvidence, runLive2DDialogueCoherenceChecks }
