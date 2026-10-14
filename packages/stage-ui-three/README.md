# `@proj-alicization/stage-ui-three`

Three.js runtime components, stores, composables, and diagnostics used by Alicization stage surfaces.

Procedural gestures include close listening, settling into rest and stretching. Rig checks assert the joints associated with each action and an actual raised hand for waving/stretching, separately from contextual action selection. A speech-inactive lip-sync driver releases analyser energy, smoothed visemes and prior segment cues, avoiding a stale open mouth during quiet life. Cancellation restores the additive pose and preserves the base animation owner.

## What It Does

Animation playback keeps native Three.js mixers and actions in shallow Vue references. Completion events therefore release the exact owned action. A bounded frame step preserves short gesture poses after a renderer stall; life events retain their independent wall-clock timing.

- Hosts the shared Three scene root used by stage pages.
- Loads, mounts, reuses, and disposes VRM models.
- Exposes a package-local model store for camera, light, environment, and model view state.
- Provides Three-specific hit testing, render-target helpers, and VRM preview generation.
- Exposes a local `trace` submodule for Three/VRM runtime diagnostics.

## Exports

- `ThreeScene`: the main Three-backed stage component.
- `useModelStore`: Pinia store for Three scene and model configuration.
- `@proj-alicization/stage-ui-three/trace`: local Eventa trace bus and snapshot helpers.
- `@proj-alicization/stage-ui-three/composables/vrm`: VRM loading and animation helpers.
- `@proj-alicization/stage-ui-three/utils/vrm-preview`: one-off VRM preview rendering.
- `composables/hit-test` and `composables/render-target`: renderer readback helpers.

## Persistent Daily Postures

The default stand, sit, lie, sleep and work tracks use five VRM humanoid animations from N.E.K.O., pinned to commit `f2fea6de7149ef333422e61bafa4102d44f2cf2c`. Each upstream asset is marked Apache-2.0 and originated from VSWQH. The decoded files remain unmodified; exact hashes, source paths, LICENSE and NOTICE are under `src/assets/vrm/neko-motion`. The desktop also ships these license and source records.

A persistent base posture and a short additive gesture have distinct owners. Asynchronous loading is fenced by model and generation; cancellation restores the prior base and releases the exact mixer action. A procedural fallback supports low poses when an asset cannot load, respecting the rig and world support plane. Actual frame diagnostics distinguish the active motion owner from a finished action, so daily-life completion is based on rendered movement instead of elapsed wall time.

Low postures and leg gestures frame the actual rendered skeleton through the scene camera, including the head, hands and feet. Framing eases between poses and returns to the saved standing view without persisting automatic camera changes. A real user camera gesture takes ownership until the low-pose framing session ends. Native calibration checks actual camera projections as well as motion geometry and screenshots on two bundled rigs.

The renderer also publishes actual skeleton bounds and a protected head region at a bounded rate. Dialogue placement follows low poses and camera movement instead of a cached standing mesh box. Default dialogue protects the face and minimizes body overlap; manually dragged offsets remain relative to the current anchor. Side selection retains a small center tolerance to avoid switching sides during breathing.

Completed gestures hold their final pose while fading into the persistent base. Their clip release is queued until the next render step before `AnimationMixer.update`, because Three.js emits `finished` while iterating its active action array. Removing an earlier action from that callback can invalidate a later working posture. Teardown flushes queued releases even when rendering has stopped.

## VRM Lifecycle

Default bindings include eighteen bounded procedural gestures in addition to the base animation. The four interaction gestures (`open_palm`, `thoughtful_pause`, `reassuring_nod`, `gentle_boundary`) use preparation, hold and release phases. Their easing adapts TalkingHead's MIT sigmoid implementation; the desktop ships its complete license. Gestures animate actual normalized humanoid bones using additive clips, preserving the existing pose and idle timing. Missing required bones remove the corresponding runtime capability. Pause/cancellation clears transient gestures; ordinary idle preference refresh does not truncate them. Real `AnimationMixer` tests verify movement, cancellation and pose restoration in `composables/vrm/procedural-gestures.test.ts`.

VRM runtime management is explicit in this package.

- `VRMModel.vue` drives load, commit, and cleanup separately instead of relying on component remounts as the primary lifecycle.
- Detached VRM instances are cached through `components/Model/vrm-instance-cache.ts` as `ManagedVrmInstance` values.
- Cache entries are scoped by `scopeKey` and matched by `modelSrc` before reuse.
- Component unmount may stash the current instance for reuse.
- Model switch clears the active instance and any detached cache for the current scope.
- Fresh loads prepare the next VRM off-screen, then commit it into the active scene once ready.

This keeps ordinary remounts and HMR from immediately forcing deep VRM disposal, while still making model switches deterministic.

## Scene Lifecycle

`ThreeScene` coordinates two independent async readiness signals before the scene becomes interactive:

- **VRM load**: `VRMModel` emits `sceneBootstrap` (geometry data) then `loaded` once the model is committed into the scene.
- **Controls init**: `OrbitControls` emits `orbitControlsReady` once it has obtained the camera and renderer references.

These two signals are coordinated through a binding transaction tracked in `useModelStore`:

- `scenePhase`: the current phase of the scene — `pending` → `loading` → `binding` → `mounted` (or `error` / `no-model`).
- `sceneTransactionDepth`: incremented at the start of a load or rebind cycle, decremented when binding completes. The scene is considered mid-flight whenever depth > 0.
- `sceneMutationLocked`: computed from `scenePhase` and `sceneTransactionDepth`. True whenever the scene is not yet mounted or a transaction is in progress. Used to gate user interactions like orbit controls.

When either signal arrives, `ThreeScene` calls `completeSceneBinding()`. That function:

1. Sets `scenePhase` to `'binding'` immediately to block premature `mounted` resolution.
2. Applies the pending `SceneBootstrap` payload (camera position, model origin, eye height, etc.) if one exists.
3. Calls `controlsRef.update()` after a `nextTick` so OrbitControls reads the updated camera state.
4. Resolves `scenePhase` to its final value based on current `modelPhase` and `canvasReady`.

Whichever signal arrives second completes the binding. The first signal to arrive finds the other not yet ready and resolves back to `'loading'`.

### Camera Preservation on Model Switch

`SceneBootstrap` carries a `cacheHit` flag. `ThreeScene.applySceneBootstrap` uses the transaction reason to decide how to apply bootstrap data:

- `initial-load` / `unknown`: camera position and target are reset to the model's computed defaults.
- `model-switch`: the user's existing camera offset and look-at angle relative to the previous model origin are preserved and projected onto the new model origin.

### Subtree Watch

`ThreeScene` watches `modelRef` and `controlsRef` with `flush: 'sync'` to detect immediate detach events within the same tick. When `controlsRef` goes null (e.g. TresJS internal remount), `controlsReady` resets and a new binding transaction opens. When `modelRef` goes null, `scenePhase` reverts to `loading` without opening a new transaction, since the next `loadStart` event from `VRMModel` will open one.

## Continuous gaze and posture

Speech adds a separate bounded layer driven by the actual audio-bound segment and its energy, cadence and prosody. Head, neck, chest, spine, wrists and supported fingers move together. This layer removes its previous bone offsets before the animation mixer runs; unbound, cancelled and waiting audio produces no speech motion. Capability lookup skips unbound expression aliases before resolving supported standard expressions. A post-update observer can inspect actual rendered bones without replacing the existing animation hook.

VRM gaze targets use an adaptive One Euro filter to approach a new focus continuously. The numerical core is adapted from N.E.K.O.; source attribution is in `src/composables/vrm/one-euro-filter.ts`, and its Apache-2.0 license ships with the desktop resources. Model switches and explicit instant positioning reset the filter.

The posture layer tracks only its own additive bone offset. It removes that offset before applying the next frame, preserves animation-mixer changes, and releases smoothly. Its bounds remain stable when an idle animation does not contain head or neck tracks. Hidden-stage timing is bounded rather than replaying missed time.

Audio-bound speech also owns transient gesture cancellation. Before the mixer updates, `speech-motion-ownership` stops an action owned by an earlier utterance and clears its retiring fade. It never rewrites a stale action's segment ID. Asynchronous clip loads recheck speech ownership before activation, and short-term gesture deduplication includes the owner so the same cue can play for a new utterance. Real Three.js tests check bone restoration and preservation of the current gesture and independent base.

## `trace` Submodule

`@proj-alicization/stage-ui-three/trace` provides:

- A local Eventa context for Three/VRM runtime trace events.
- Ref-counted enable/disable controls so hot paths can short-circuit when tracing is off.
- Shared event definitions for:
  - Three render info
  - Three hit-test readback
  - VRM update frame breakdown
  - VRM load start / end / error
  - VRM dispose start / end
- Resource snapshot helpers for renderer memory and VRM scene summaries.

The trace bus is intentionally local to `stage-ui-three`. Desktop apps can bridge it across renderer windows when needed, but the source of truth stays in this package.

## When To Use It

- Use it when a stage surface needs a Three-backed renderer.
- Use `useModelStore` when the page needs to control camera, lighting, model transforms, or renderer-facing state.
- Use `@proj-alicization/stage-ui-three/trace` when you need Three/VRM runtime telemetry without routing through Vue parent chains.
- Use `utils/vrm-preview` for isolated preview rendering that should not participate in the main stage lifecycle.

## When Not To Use It

- Do not use it as a global business event bus.
- Do not use the `trace` submodule for Live2D or non-Three runtime telemetry.
- Do not route renderer-to-main control flow through the `trace` submodule; keep control IPC in app-level contracts.
- Do not use the VRM instance cache as a general shared asset cache across apps or windows.
