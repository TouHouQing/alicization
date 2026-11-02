# stage-ui-live2d

Live2D rendering and expression projection for Alicization. The desktop main process owns personhood, memory, emotion and initiative; this package renders its shared embodiment frames.

## Rendering and input

`Live2DScene` sizes its Pixi canvas from its own container. Client pointer positions are mapped through the actual canvas offset and renderer dimensions. Character input requires visible alpha at that rendered point, so transparent Cubism margins do not block the desktop. Frame capture uses the loaded canvas.

Asynchronous setup retains its original source, model ID and canvas owner. Navigation, model changes or canvas destruction invalidate a pending load and release its completed model. A failed ZIP setup cancels requests without calling the SDK's internal-model destructor before that internal model exists.

## Motion ownership

Manual idle preferences are stored under `settings/live2d/preferred-runtime-motions`, indexed by model ID and checked against that model's discovered motion files. Automatic mode leaves the desktop's adaptive idle selection in control. Foreground gestures retain their higher SDK playback priority; idle plugins classify actual playback priority rather than a group name.

SDK idle completion selects the resolved preference before random idle playback can reserve that priority. A rejected SDK start stays deferred instead of being recorded as started. Manual previews use fresh, scoped foreground commands over the existing UI broadcast channel; they do not become saved idle or emotional state. Disabling idle animation preserves foreground gesture playback and uses manual eye openness as the blink baseline, so stopping during a blink cannot leave the eyes permanently closed. Component teardown invalidates pending motion requests and scheduled idle restarts.

An explicit one-time migration moves the former global selector's file, group and index to its known active model, then removes its four old keys. The migration does not assign that preference to other models. Reset clears all manual preferences. This migration is limited to the existing desktop preference format; it does not infer compatibility for arbitrary model data.

## Expression, gaze and gesture projection

The pinned Cubism SDK passes elapsed seconds to its motion manager, but advances its focus controller with frame milliseconds. Only the SDK advances that controller. Pointer attention expires after movement stops; repeated unchanged global cursor coordinates do not keep renewing attention. Canvas pointer movement takes brief priority over external cursor samples, then the shared motor state and restrained autonomous fixation resume.

Renderer diagnostics expose the accepted gaze owner (`local`, `external`, or `autonomous`) and remaining attention time. A rejected external update cannot replace local ownership. Quiet-idle calibration can set `LIFE_EXPRESSION_ISOLATE_IDLE_POINTER=1` to suspend cursor following only during its measured idle interval, then restore it before the actual eye-direction and attention-release checks. This isolates autonomous movement from the user's ongoing desktop work; it does not establish physical input delivery.

Final emotional and speech overlays run on `beforeModelUpdate`, after native motion, expressions, focus and physics. They never pollute Cubism's saved motion baseline. Parameter support comes from the compiled model ID catalogue; querying Cubism's virtual fallback indices does not establish support. Runtime capabilities reflect the current rig and its named expressions.

Speech temporarily blends out native mouth openness so closed phonemes can actually close the mouth. Negative emotional expression suppresses conflicting native smiles without turning voice energy into smiling eyes. These ownership weights release smoothly to authored animation. Left and right eye smiles retain independent manual offsets. Widened eyes may exceed neutral openness, with Cubism enforcing the actual rig limit. Renderer release durations explicitly convert the SDK's seconds to milliseconds; a completed release window cannot rearm without a new cue.

Idle mouth-opening curves are neutralized after native motion and before Cubism applies named expressions. This prevents silent idle from resembling speech while retaining authored smiles, nonverbal expressions and foreground action assets. The SDK priority is checked again after motion update so a newly started foreground action keeps ownership. Manual mouth offsets and emotional openness remain in the final render layer.

When audio is bound, its measured energy gates vowel aperture, jaw bias and phonetic mouth shape. Text and prosody cannot hold the mouth open through a silent audio gap or after playback stops. Aperture still uses the existing attack/release smoothing, and explicit text-only playback retains its visual fallback. Resting mouth shape no longer receives a negative offset from nonexistent speech prosody. Companionship continuity can retain expression and gaze after speech without extending mouth articulation.

An explicit model action binding takes precedence. Without one, supported semantic nods, head shakes and head tilts have short procedural fallbacks using actual head parameters. Each action follows its existing action pulse revision, finishes at its original pose, and cancels on foreground SDK motion, pause, reload or teardown. A later identical semantic request can replay. These fallbacks do not manufacture SDK motion events or claim hand gestures absent from model assets.

## Import resources and cache

Bundled `file://` ZIPs use the SDK's cancellable ArrayBuffer transport and are decoded from an in-memory File. On the tested Windows runtime, repeated direct file Blob responses failed while paired ArrayBuffer reads returned all archive bytes. Blob uploads and HTTP sources keep their existing transports.

Thumbnail rendering uses a bounded 768 × 1024 buffer. The SDK receives a normalized lowercase `.zip` suffix while the catalogue retains the user's original filename. GPU construction, invalid archives and renderer teardown all release the offscreen DOM canvas.

Archives without a model settings JSON infer their single moc, textures and motion files through the existing ZIP adapter. Inferred motion files use the SDK's `Idle` group, so its default idle playback and the settings selector can use the same discovered motions.

The pinned SDK uses the same `zip://0` resource index for repeated ZIP instances. A middleware assigns each loaded instance its own resource namespace before FileLoader creates URLs, preventing preview teardown from revoking another instance's assets. Clearing model cache removes only catalogue-owned Live2D directories and propagates storage errors to the caller.

## Verification

Structured dialogue has one motion owner: semantic action pulses. Emotion projection does not issue a second native animation. `currentMotion` is transient actor state; saved preferences and explicit previews use separate channels. The stock `Idle:0` asset is not advertised as a short nod; compiled head parameters provide the bounded procedural nod. Text has semantic expression without a synthetic speech clock, while actual audio owns lip sync. Native one-shot expressions may open the mouth; quiet text frames have no acoustic mouth drive.

Pose recovery also restores the SDK's virtual part selectors after a one-shot motion. It preserves the currently drawn part opacities so Cubism's own pose fade blends back to rest, including alternate arm drawings outside the compiled parameter array. Foreground actions and reservations keep ownership until completion; explicit background animation is not reset.

An accepted foreground procedural gesture takes motion ownership from an older native action and revokes its pending asset reservation. Unsupported requests and background presence pulses cannot preempt foreground work. The renderer invalidates old async request bookkeeping, keeps the finite gesture alive through SDK completion callbacks, and resumes an explicitly enabled idle loop after the gesture ends. Pose recovery continues through the normal SDK fade.

Quiet presence is the default for every model. `idle-presence.ts` rejects SDK background motion restarts, settles completed motion parameters toward their compiled defaults before expressions run, and replaces the sample SDK's large periodic head rotations with light breathing and sparse posture shifts. It does not create emotional cues or dialogue intentions. Foreground actions, named expressions, runtime emotion, pointer attention and speech retain their existing owners. Resume does not replay missed movements; dialogue suspends ambient posture shifts and leaves a recovery pause.

The model settings offer an explicit per-model animation loop option. Choosing an asset in quiet mode previews it once, including repeated selections of the same asset; saving that choice or reopening settings does not start another performance. Disabling loops releases an active idle without interrupting a foreground action.

Targeted Vitest suites cover pointer coordinates and transparency, import cleanup, resource ownership, motion priorities and expression continuity. Desktop product acceptance uses `LIFE_PRODUCT_RENDERER=live2d` with `apps/stage-tamagotchi/scripts/life-acceptance/life-product-regression.cjs` through the private Windows desktop runner. Its screenshots and Cubism parameter/pixel samples are observations of the actual runtime, not substituted model output. Physical mouse delivery on the user's input desktop and voice hardware are outside that background test scope.


### Live provider text and mouth presentation (2026-10-18)

The desktop extracts the root public `reply` while the provider stream is still
open. A small whitelisted emotion header can prepare the face; private fields,
JSON framing and tool arguments never enter the body channel. Concrete execution,
stored-memory, promise and attributed-history claims retain the grounding gate.
Admitted body packets carry sequence numbers and UTF-16 offsets; completion confirms
the same body and never replays it. Early packets cannot enter memory or training.

One cancellable presentation cursor consumes arriving body packets independently
of network reception, preserving the existing natural text/mouth pacing. Its first
glyph starts without waiting for provider completion or private-state settlement.
`text-presented` carries the same visible position to the body, caption and remote
chat; `token-literal` supplies admitted text to the actual speech pipeline.
Published text cannot be silently revised or retried. Failures and cancellation
retain the visible prefix with an explicit interruption status and disable learning.
Final personality, memory and tool-result admission still require full settlement.
Chinese runs use contextual `pinyin-pro` readings, including bilabial closure,
vowel spreading/rounding and punctuation pauses. Digits use Mandarin readings;
Latin spelling is an approximation, not a phonetic dictionary. Emoji and symbols
stay silent. Cancellation/generation replacement discard the remaining cursor.
The Live2D draw plugin writes only compiled mouth parameters, yields to actual
audio, and never creates PCM energy or re-arms semantic gesture budgets.
Hiyori exposes open/form controls, so full five-vowel geometry requires a rig with
corresponding bindings. Character-scale timing is a text presentation clock, not
measured speech alignment.

During actual audio silence the draw layer now uses the current nonverbal mouth
target immediately. A background frame's capped smoothing delta must not hold a
previous voiced vowel open or blend a native asset jaw back into silent PCM.

### Natural text pacing and one visible reply (2026-10-18)

The visible cursor advances at 230 ms per Mandarin syllable, lengthening the last
syllable of a phrase to 290 ms. Commas pause for 260 ms; sentence endings pause
for 440 ms. Connected syllables retain mouth aperture and compound finals glide;
adjacent mouth forms transition over 70 ms of wall time. Punctuation, cancellation
and actual audio retain immediate mouth authority. This is a text presentation
estimate; measured audio continues to own voice lip sync.

An active logical turn renders one bubble. Gateway retry IDs share a canonical
identity across durable replay and the live cursor. While presentation is active,
its prefix masks an already persisted full reply; completion upserts the same
row once. Durable content and its audit metadata are retained.
