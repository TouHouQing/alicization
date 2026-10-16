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

Targeted Vitest suites cover pointer coordinates and transparency, import cleanup, resource ownership, motion priorities and expression continuity. Desktop product acceptance uses `LIFE_PRODUCT_RENDERER=live2d` with `apps/stage-tamagotchi/scripts/life-acceptance/life-product-regression.cjs` through the private Windows desktop runner. Its screenshots and Cubism parameter/pixel samples are observations of the actual runtime, not substituted model output. Physical mouse delivery on the user's input desktop and voice hardware are outside that background test scope.
