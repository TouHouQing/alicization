import posthog from 'posthog-js'

import { DEFAULT_POSTHOG_CONFIG, POSTHOG_PROJECT_KEY_DESKTOP } from '../../../../../posthog.config'

const shouldEnablePosthog
  = !import.meta.env.DEV
    && import.meta.env.VITE_ENABLE_POSTHOG === 'true'
    && import.meta.env.VITE_DISABLE_POSTHOG !== 'true'

if (shouldEnablePosthog) {
  posthog.init(POSTHOG_PROJECT_KEY_DESKTOP, {
    ...DEFAULT_POSTHOG_CONFIG,
    // Project-specific config...
  })
}
