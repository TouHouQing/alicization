/* eslint-disable style/max-statements-per-line */
// Read final Cubism draw values alongside their real semantic/speech source.
// This observer never changes personhood, speech, performance, or SDK parameters.
async function observeLive2DExpression(stage) {
  return stage.evaluate(() => {
    const seen = new Set(); let actor; let stageComponent
    const visit = (node) => {
      if (!node || typeof node !== 'object' || seen.has(node))
        return
      seen.add(node)
      if (node.exposed?.characterFrame && node.props?.app?.stage)
        actor ||= node
      if (node.exposed?.speechActivity)
        stageComponent ||= node
      visit(node.component); visit(node.subTree); visit(node.suspense?.activeBranch); visit(node.ssContent)
      if (Array.isArray(node.children))
        node.children.forEach(visit)
    }
    const app = document.querySelector('#app').__vue_app__; visit(app._instance ?? app._container._vnode.component)
    const sdk = actor?.props.app.stage.children.find(child => child.internalModel?.coreModel)
    if (!sdk)
      throw new Error('Actual Live2D actor is unavailable')
    const core = sdk.internalModel.coreModel
    const ids = core.getModel().parameters.ids
    const partIds = core.getModel().parts.ids
    const bodyPartIds = partIds.filter(id => /arm|hand|shoulder/iu.test(id))
    const readBodyParts = () => Object.fromEntries(bodyPartIds.map(id => [id, core.getPartOpacityByIndex(partIds.indexOf(id))]))
    const selected = ids.filter(id => /^(?:ParamAngle[XYZ]|ParamEye(?:Ball[XY]|[LR](?:Open|Smile))|ParamMouth(?:OpenY|Form)|ParamCheek|ParamBrow(?:[LR]Y|[LR]Angle)|ParamBodyAngle[XYZ])$/u.test(id))
    const qa = window.__live2dExpressionObservation = { phase: 'dialogue', phaseTimes: { dialogue: performance.now() }, frames: [], lastAt: -1, audioEvents: [], audioSources: [], chatEvents: [], selectionChanges: [], motions: [], motionRequests: [] }
    const manager = sdk.internalModel.motionManager; const startMotion = manager.startMotion
    manager.startMotion = function (group, index, priority) {
      if (qa.motionRequests.length < 500)
        qa.motionRequests.push({ at: performance.now(), phase: qa.phase, group, index, priority, stack: new Error('motion-request').stack, cue: actor.props.performanceState?.activeCue, actionPulse: actor.props.performanceState?.actionPulse })
      return startMotion.call(this, group, index, priority)
    }
    manager.on('motionStart', (group, index) => qa.motions.push({ at: performance.now(), phase: qa.phase, group, index, priority: manager.state.currentPriority }))
    qa.channel = new BroadcastChannel('airi-chat-stream')
    qa.channel.onmessage = ({ data }) => qa.chatEvents.push({ phase: qa.phase, at: performance.now(), wallAt: Date.now(), presentation: data.presentation, type: data.type, reason: data.reason, sessionId: data.sessionId, messageId: data.context?.message?.id })
    const pinia = app.config.globalProperties.$pinia
    qa.hookEvents = []; qa.generationReads = []; qa.providerCalls = []
    const orchestrator = pinia._s.get('chat-orchestrator')
    qa.semanticEvents = []
    qa.stopSemanticObserver = orchestrator.onEmbodimentMeta(async (meta, context) => {
      if (meta.embodiment?.performance)
        qa.semanticEvents.push({ phase: qa.phase, wallAt: Date.now(), turnId: `chat:${context.sessionId}:${context.message.id}`, performance: { ...meta.embodiment.performance } })
    })
    qa.stageLongTasks = []
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      qa.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (qa.stageLongTasks.length < 1000)
            qa.stageLongTasks.push({ wallAt: performance.timeOrigin + entry.startTime, durationMs: entry.duration, phase: qa.phase })
        }
      })
      qa.longTaskObserver.observe({ type: 'longtask', buffered: true })
    }
    qa.textInputs = []
    const presentText = orchestrator.emitTextPresentedHooks
    orchestrator.emitTextPresentedHooks = async function (...args) {
      const receivedAt = Date.now()
      const result = await presentText.apply(this, args)
      // Observe committed Vue input, independently of software-GL draw cadence.
      qa.textInputs.push({ at: performance.now(), wallAt: Date.now(), receivedAt, presentation: args[0], frame: actor.props.textArticulation ? { ...actor.props.textArticulation } : null, visibleText: pinia._s.get('chat-stream')?.streamingMessage?.content ?? null, phase: qa.phase })
      return result
    }
    for (const name of ['emitBeforeMessageComposedHooks', 'emitBeforeSendHooks', 'emitTokenLiteralHooks', 'emitStreamEndHooks', 'emitAssistantResponseEndHooks']) {
      const original = orchestrator[name]
      orchestrator[name] = function (...args) { qa.hookEvents.push({ name, messageId: args.at(-1)?.message?.id }); return original.apply(this, args) }
    }
    const sessions = pinia._s.get('chat-session'); const generation = sessions.getSessionGenerationValue
    sessions.getSessionGenerationValue = function (...args) {
      const value = generation.apply(this, args); if (qa.generationReads.length < 100)
        qa.generationReads.push({ sessionId: args[0], active: this.activeSessionId, value }); return value
    }
    qa.motionSelections = []
    let previousMotionSelection = ''
    pinia._s.get('live2d').$subscribe((_mutation, state) => {
      const key = JSON.stringify(state.currentMotion)
      if (key === previousMotionSelection)
        return
      previousMotionSelection = key
      if (qa.motionSelections.length < 500)
        qa.motionSelections.push({ at: performance.now(), phase: qa.phase, selection: state.currentMotion, stack: new Error('motion-selection').stack })
    }, { flush: 'sync' })
    const providers = pinia._s.get('providers'); const provider = providers.getProviderInstance
    providers.getProviderInstance = function (...args) {
      if (args[0] === 'openai-compatible-audio-speech')
        qa.providerCalls.push({ provider: args[0], configuredModel: this.getProviderConfig(args[0])?.model, localEndpoint: String(this.getProviderConfig(args[0])?.baseUrl).startsWith('http://127.0.0.1:') }); return provider.apply(this, args)
    }
    const decode = AudioContext.prototype.decodeAudioData
    AudioContext.prototype.decodeAudioData = function (...args) {
      qa.audioEvents.push({ kind: 'decode-start', input: Object.prototype.toString.call(args[0]), bytes: args[0]?.byteLength, contextState: this.state })
      let result
      try { result = decode.apply(this, args) }
      catch (error) { qa.audioEvents.push({ kind: 'decode-threw', error: error.message }); throw error }
      result.then(buffer => qa.audioEvents.push({ kind: 'decoded', duration: buffer.duration, contextState: this.state }), error => qa.audioEvents.push({ kind: 'decode-failed', error: error.message, contextState: this.state }))
      return result
    }
    const read = Response.prototype.arrayBuffer
    Response.prototype.arrayBuffer = function (...args) {
      const result = read.apply(this, args)
      if (this.url.includes('/audio/speech'))
        result.then(buffer => qa.audioEvents.push({ kind: 'speech-response-bytes', bytes: buffer.byteLength, status: this.status }), error => qa.audioEvents.push({ kind: 'speech-response-failed', error: error.message }))
      return result
    }
    const create = AudioContext.prototype.createBufferSource
    AudioContext.prototype.createBufferSource = function (...args) {
      const source = create.apply(this, args); const start = source.start; const context = this
      source.start = function (...args) {
        qa.audioEvents.push({ kind: 'source-start', contextState: context.state, duration: this.buffer?.duration })
        const result = start.apply(this, args)
        if (this.buffer) {
          qa.audioSources.push({ id: qa.audioEvents.length, source, context, buffer: this.buffer, startAt: Math.max(context.currentTime, args[0] ?? 0), offset: args[1] ?? 0, duration: args[2] ?? this.buffer.duration - (args[1] ?? 0), ended: false })
          if (qa.audioSources.length > 100)
            qa.audioSources.shift()
        }
        return result
      }
      source.addEventListener('ended', () => {
        const audio = qa.audioSources.find(audio => audio.source === source)
        if (audio)
          audio.ended = true
        qa.audioEvents.push({ kind: 'source-ended' })
      })
      return source
    }
    sdk.internalModel.on('beforeModelUpdate', () => {
      const now = performance.now()
      if (now - qa.lastAt < 45 || qa.frames.length >= 10000)
        return
      qa.lastAt = now
      const speechStore = pinia._s.get('speech'); const audioStore = pinia._s.get('audio-context')
      const selection = { provider: speechStore?.activeSpeechProvider, model: speechStore?.activeSpeechModel, voice: speechStore?.activeSpeechVoiceId, contextState: audioStore?.audioContext?.state }
      if (JSON.stringify(selection) !== JSON.stringify(qa.selectionChanges.at(-1)))
        qa.selectionChanges.push(selection)
      const state = actor.props.performanceState; const speech = actor.props.speechRenderState
      let actualAudio = null
      for (const audio of qa.audioSources) {
        const elapsed = (audio.context.currentTime - audio.startAt) * audio.source.playbackRate.value
        if (audio.ended || elapsed < 0 || elapsed >= audio.duration || audio.context.state !== 'running')
          continue
        const end = Math.min(audio.buffer.length, Math.floor((audio.offset + elapsed) * audio.buffer.sampleRate))
        const begin = Math.max(0, end - Math.ceil(audio.buffer.sampleRate * 0.025))
        const quietBegin = Math.max(0, end - Math.ceil(audio.buffer.sampleRate * 0.2))
        let rms = 0; let quietWindowRms = 0
        for (let channel = 0; channel < audio.buffer.numberOfChannels; channel++) {
          const pcm = audio.buffer.getChannelData(channel); let sum = 0; let count = 0
          for (let index = begin; index < end; index += 8) { sum += pcm[index] * pcm[index]; count++ }
          rms = Math.max(rms, count ? Math.sqrt(sum / count) : 0)
          let quietSum = 0
          for (let index = quietBegin; index < end; index++) quietSum += pcm[index] * pcm[index]
          quietWindowRms = Math.max(quietWindowRms, end > quietBegin ? Math.sqrt(quietSum / (end - quietBegin)) : 0)
        }
        actualAudio = { id: audio.id, rms, quietWindowRms, quietWindowSeconds: (end - quietBegin) / audio.buffer.sampleRate, elapsed, duration: audio.duration }
      }
      qa.frames.push({ at: now, phase: qa.phase, nativeMotionPriority: sdk.internalModel.motionManager.state.currentPriority, values: Object.fromEntries(selected.map(id => [id, core.getParameterValueById(id)])), bodyParts: readBodyParts(), performancePhase: state?.phase, variationToken: state?.variationToken, emotion: state?.performance?.baseEmotion, expressionIntensity: state?.expressionIntensity, facialCue: state?.activeFacialCue, actionCue: state?.actionPulse?.cue, actionRevision: state?.actionPulse?.revision, actionReason: state?.actionPulse?.reason, actionIssuedAt: state?.actionPulse?.issuedAt, actionSegment: state?.actionPulse?.segmentId, source: state?.activeCueSource, visibleText: pinia._s.get('chat-stream')?.streamingMessage?.content ?? null, textArticulation: actor.props.textArticulation ? { ...actor.props.textArticulation } : null, wallAt: Date.now(), speechActivity: stageComponent?.exposed.speechActivity?.value, speech: { active: speech?.active, phase: speech?.phase, playbackPhase: speech?.playbackPhase, audioBound: speech?.audioBound, energy: speech?.dynamics?.speechEnergy, prosody: speech?.dynamics?.prosodyIntensity, closure: speech?.articulation?.lipClosure, articulationOpen: speech?.articulation?.openness, openness: speech?.mouthOpenRatio, segmentId: speech?.item?.digitalLifeFrame?.id ?? speech?.item?.segmentId }, actualAudio, diagnostics: actor.exposed.executionDiagnostics() })
    })
    return { compiledParameterIds: ids, compiledPartIds: partIds, restingBodyParts: readBodyParts(), modelId: actor.props.modelId, scope: 'Read-only final draw observation; no life or rendering state is injected.' }
  })
}

async function readLive2DExpression(stage) {
  return stage.evaluate(() => window.__live2dExpressionObservation?.frames ?? [])
}

async function sampleLive2DSpeech(stage) {
  return stage.evaluate(() => {
    const frames = window.__live2dExpressionObservation?.frames ?? []
    return { hasSpoken: frames.some(frame => frame.speech.active), latestActive: frames.at(-1)?.speech.active, frames: frames.length }
  })
}

module.exports = { observeLive2DExpression, readLive2DExpression, sampleLive2DSpeech }
